/**
 * Game Discovery Service - Automated game discovery and bulk scraping
 * 
 * This service handles:
 * 1. Daily discovery of MLB games
 * 2. Bulk scraping operations
 * 3. Incremental updates
 * 4. Scheduling and automation
 */

import schedule from 'node-schedule';
import boxScoreService from './boxScoreService';
import gameDataManager from './gameDataManager';
import { cacheData, getCachedData } from './dataService';

interface ScrapeJob {
  id: string;
  startDate: string;
  endDate: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  startTime?: string;
  endTime?: string;
  error?: string;
}

class GameDiscoveryService {
  private readonly JOBS_CACHE_PREFIX = 'scrape_job:';
  private activeJobs: Map<string, ScrapeJob> = new Map();
  private isAutoDiscoveryEnabled = true;

  constructor() {
    this.initializeScheduledJobs();
  }

  /**
   * Initialize scheduled jobs for automatic game discovery
   */
  private initializeScheduledJobs(): void {
    // Daily job to discover and scrape new games
    // Run at 6 AM EST every day during baseball season
    schedule.scheduleJob('0 6 * * *', async () => {
      if (this.isAutoDiscoveryEnabled) {
        console.log('Starting daily game discovery job...');
        await this.discoverAndScrapeToday();
      }
    });

    // Weekly job to backfill any missing games
    // Run every Sunday at 2 AM EST
    schedule.scheduleJob('0 2 * * 0', async () => {
      if (this.isAutoDiscoveryEnabled) {
        console.log('Starting weekly backfill job...');
        await this.backfillMissingGames();
      }
    });

    console.log('Game discovery scheduler initialized');
  }

  /**
   * Discover and scrape games for today
   */
  async discoverAndScrapeToday(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.bulkScrapeGames(today, today);
  }

  /**
   * Backfill missing games from the last 7 days
   */
  async backfillMissingGames(): Promise<void> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`Backfilling games from ${startDateStr} to ${endDateStr}`);
    await this.bulkScrapeGames(startDateStr, endDateStr, false);
  }

  /**
   * Bulk scrape games for a date range
   */
  async bulkScrapeGames(
    startDate: string, 
    endDate: string, 
    forceRefresh: boolean = false
  ): Promise<string> {
    const jobId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: ScrapeJob = {
      id: jobId,
      startDate,
      endDate,
      status: 'queued',
      progress: {
        total: 0,
        completed: 0,
        failed: 0
      },
      startTime: new Date().toISOString()
    };

    this.activeJobs.set(jobId, job);
    await cacheData(`${this.JOBS_CACHE_PREFIX}${jobId}`, job, 10080); // 7 days

    // Start the scraping process asynchronously
    this.executeBulkScrape(jobId, startDate, endDate, forceRefresh)
      .catch(error => {
        console.error(`Bulk scrape job ${jobId} failed:`, error);
        job.status = 'failed';
        job.error = error.message;
        job.endTime = new Date().toISOString();
        this.updateJob(jobId, job);
      });

    return jobId;
  }

  /**
   * Execute the bulk scraping operation
   */
  private async executeBulkScrape(
    jobId: string,
    startDate: string,
    endDate: string,
    forceRefresh: boolean
  ): Promise<void> {
    const job = this.activeJobs.get(jobId)!;
    job.status = 'running';
    this.updateJob(jobId, job);

    try {
      console.log(`Starting bulk scrape job ${jobId}: ${startDate} to ${endDate}`);
      
      // Generate all dates in the range
      const dates = this.generateDateRange(startDate, endDate);
      const allGames: string[] = [];

      // First, discover all games
      for (const date of dates) {
        try {
          const games = await boxScoreService.discoverGames(date);
          allGames.push(...games.map(g => g.gameId));
          console.log(`Discovered ${games.length} games for ${date}`);
        } catch (error) {
          console.error(`Error discovering games for ${date}:`, error);
        }
      }

      job.progress.total = allGames.length;
      this.updateJob(jobId, job);

      // Filter out already scraped games unless force refresh
      let gamesToScrape = allGames;
      if (!forceRefresh) {
        gamesToScrape = await this.filterUnscrapedGames(allGames);
        console.log(`Filtered to ${gamesToScrape.length} unscraped games (${allGames.length - gamesToScrape.length} already cached)`);
      }

      // Scrape games in batches of 5 to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < gamesToScrape.length; i += batchSize) {
        const batch = gamesToScrape.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (gameId) => {
          try {
            const boxScore = await boxScoreService.scrapeBoxScore(gameId);
            if (boxScore) {
              await gameDataManager.storeBoxScore(boxScore);
              job.progress.completed++;
              console.log(`✅ Scraped game ${gameId} (${job.progress.completed}/${job.progress.total})`);
            } else {
              job.progress.failed++;
              console.log(`❌ Failed to scrape game ${gameId}`);
            }
          } catch (error) {
            job.progress.failed++;
            console.error(`Error scraping game ${gameId}:`, error);
          }
          
          this.updateJob(jobId, job);
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches to be respectful
        if (i + batchSize < gamesToScrape.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      job.status = 'completed';
      job.endTime = new Date().toISOString();
      this.updateJob(jobId, job);

      console.log(`✅ Bulk scrape job ${jobId} completed: ${job.progress.completed} successful, ${job.progress.failed} failed`);
      
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = new Date().toISOString();
      this.updateJob(jobId, job);
      throw error;
    }
  }

  /**
   * Filter out games that have already been scraped
   */
  private async filterUnscrapedGames(gameIds: string[]): Promise<string[]> {
    const unscrapedGames: string[] = [];
    
    for (const gameId of gameIds) {
      const cached = await getCachedData(`boxscore:${gameId}`);
      if (!cached) {
        unscrapedGames.push(gameId);
      }
    }
    
    return unscrapedGames;
  }

  /**
   * Generate array of dates between start and end date
   */
  private generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  /**
   * Update job status and cache
   */
  private async updateJob(jobId: string, job: ScrapeJob): Promise<void> {
    this.activeJobs.set(jobId, job);
    await cacheData(`${this.JOBS_CACHE_PREFIX}${jobId}`, job, 10080);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<ScrapeJob | null> {
    // Check memory first
    if (this.activeJobs.has(jobId)) {
      return this.activeJobs.get(jobId)!;
    }
    
    // Check cache
    const cachedJob = await getCachedData(`${this.JOBS_CACHE_PREFIX}${jobId}`);
    if (cachedJob) {
      // Ensure cachedJob is typed as ScrapeJob
      this.activeJobs.set(jobId, cachedJob as ScrapeJob);
      return cachedJob as ScrapeJob;
    }
    
    return null;
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): ScrapeJob[] {
    return Array.from(this.activeJobs.values())
      .filter(job => job.status === 'running' || job.status === 'queued');
  }

  /**
   * Get recent job history
   */
  async getJobHistory(limit: number = 10): Promise<ScrapeJob[]> {
    const jobs = Array.from(this.activeJobs.values())
      .sort((a, b) => new Date(b.startTime || '').getTime() - new Date(a.startTime || '').getTime())
      .slice(0, limit);
    
    return jobs;
  }

  /**
   * Enable/disable automatic discovery
   */
  setAutoDiscovery(enabled: boolean): void {
    this.isAutoDiscoveryEnabled = enabled;
    console.log(`Auto discovery ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<any> {
    // Get the active jobs data
    const activeJobs = this.getActiveJobs();
    
    // Get recent job history
    const recentJobs = await this.getJobHistory(5);
    
    // Calculate job success rate
    const completedJobs = recentJobs.filter(job => job.status === 'completed');
    const successRate = recentJobs.length > 0 
      ? Math.round((completedJobs.length / recentJobs.length) * 100)
      : 100;
    
    // Get data coverage info from the game data manager
    const dataInfo = await gameDataManager.getDataInfo();
    
    return {
      service: {
        autoDiscoveryEnabled: this.isAutoDiscoveryEnabled,
        nextScheduledRun: this.getNextScheduledRun(),
        status: activeJobs.length > 0 ? 'active' : 'idle'
      },
      jobs: {
        active: activeJobs.length,
        queued: activeJobs.filter(job => job.status === 'queued').length,
        running: activeJobs.filter(job => job.status === 'running').length,
        totalJobsInMemory: this.activeJobs.size,
        recentSuccessRate: `${successRate}%`,
        recentJobs: recentJobs.map(job => ({
          id: job.id,
          status: job.status,
          dateRange: `${job.startDate} to ${job.endDate}`,
          completedGames: job.progress.completed,
          totalGames: job.progress.total
        }))
      },
      data: {
        totalGames: dataInfo.totalGames,
        totalPlayers: dataInfo.totalPlayers,
        totalTeams: dataInfo.totalTeams,
        mostRecentGameDate: dataInfo.mostRecentGameDate,
        lastUpdated: dataInfo.lastUpdated
      }
    };
  }

  /**
   * Get next scheduled run time
   */
  private getNextScheduledRun(): string {
    // Calculate next 6 AM EST
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(6, 0, 0, 0);
    
    return tomorrow.toISOString();
  }

  /**
   * Scrape a specific season's worth of games
   */
  async scrapeSeason(year: number): Promise<string> {
    // MLB season typically runs from late March to late September
    const startDate = `${year}-03-28`; // Opening Day is usually around this time
    const endDate = `${year}-09-30`;   // Regular season ends around here
    
    console.log(`Initiating full season scrape for ${year}`);
    return this.bulkScrapeGames(startDate, endDate, false);
  }

  /**
   * Get comprehensive stats about scraped data
   */
  async getDataCoverage(): Promise<any> {
    const dataInfo = gameDataManager.getDataInfo();
    
    // Calculate coverage by month
    const coverage = {
      totalGames: dataInfo.totalGames,
      totalPlayers: dataInfo.totalPlayers,
      lastUpdated: dataInfo.lastUpdated,
      mostRecentGame: dataInfo.mostRecentGameDate,
      coverage: {
        // This would analyze game coverage by month/team
        // Implementation depends on gameDataManager structure
      }
    };
    
    return coverage;
  }
}

export default new GameDiscoveryService();
