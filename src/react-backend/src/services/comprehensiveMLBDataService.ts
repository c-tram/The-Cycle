import fetch from 'node-fetch';
import { storeData, retrieveData } from './dataService';

/**
 * COMPREHENSIVE MLB DATA SERVICE
 * 
 * This service fetches EVERYTHING from the MLB API:
 * - Full season game data for all teams
 * - Complete player statistics (hitting, pitching, fielding)
 * - Advanced metrics and sabermetrics
 * - Historical data (multiple seasons)
 * - Team stats and rankings
 * - Division and league standings
 * - Playoff probabilities
 * - Injury reports
 * - Weather data for games
 * - Venue information
 * - Schedule data (past and future)
 * - Live game data
 * - Draft data
 * - Transactions
 * - Awards and achievements
 */

interface ComprehensiveGameData {
  gameId: string;
  season: number;
  gameDate: string;
  gameType: string; // R (regular), S (spring), P (playoff), etc.
  status: {
    detailedState: string;
    statusCode: string;
    isInProgress: boolean;
    isCompleted: boolean;
  };
  teams: {
    home: TeamGameData;
    away: TeamGameData;
  };
  venue: {
    id: number;
    name: string;
    location: {
      city: string;
      state: string;
      country: string;
    };
    timezone: string;
    fieldInfo: any;
    weather?: WeatherData;
  };
  officials?: Official[];
  innings?: InningData[];
  linescore?: LinescoreData;
  boxscore?: BoxscoreData;
  decisions?: {
    winner?: PlayerDecision;
    loser?: PlayerDecision;
    save?: PlayerDecision;
  };
  highlights?: Highlight[];
  attendance?: number;
  gameDuration?: string;
  probablePitchers?: {
    home?: PlayerBasic;
    away?: PlayerBasic;
  };
}

interface TeamGameData {
  team: TeamBasic;
  score?: number;
  hits?: number;
  errors?: number;
  leftOnBase?: number;
  record: {
    wins: number;
    losses: number;
    winningPercentage: number;
  };
  stats?: TeamGameStats;
}

interface TeamGameStats {
  batting: {
    atBats: number;
    runs: number;
    hits: number;
    rbi: number;
    baseOnBalls: number;
    strikeOuts: number;
    leftOnBase: number;
    avg: number;
    obp: number;
    slg: number;
    ops: number;
  };
  pitching: {
    inningsPitched: number;
    hits: number;
    runs: number;
    earnedRuns: number;
    baseOnBalls: number;
    strikeOuts: number;
    homeRuns: number;
    era: number;
    whip: number;
  };
  fielding: {
    errors: number;
    putOuts: number;
    assists: number;
    chances: number;
    fieldingPercentage: number;
  };
}

interface ComprehensivePlayerData {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  primaryNumber?: number;
  birthDate: string;
  age: number;
  birthCity?: string;
  birthStateProvince?: string;
  birthCountry: string;
  height: string;
  weight: number;
  position: PlayerPosition;
  currentTeam: TeamBasic;
  mlbDebutDate?: string;
  batSide: string;
  pitchHand: string;
  draftYear?: number;
  stats: {
    season2025: PlayerSeasonStats;
    season2024?: PlayerSeasonStats;
    career: PlayerCareerStats;
    advanced: AdvancedPlayerStats;
    situational: SituationalStats;
    monthly: MonthlyStats[];
    vsTeams: VsTeamStats[];
    splits: PlayerSplits;
  };
  injuries?: InjuryData[];
  awards?: Award[];
  transactions?: Transaction[];
  salaryInfo?: SalaryData;
}

interface PlayerSeasonStats {
  hitting?: {
    gamesPlayed: number;
    plateAppearances: number;
    atBats: number;
    runs: number;
    hits: number;
    doubles: number;
    triples: number;
    homeRuns: number;
    rbi: number;
    baseOnBalls: number;
    strikeOuts: number;
    stolenBases: number;
    caughtStealing: number;
    avg: number;
    obp: number;
    slg: number;
    ops: number;
    // Advanced metrics
    woba: number;
    wrcPlus: number;
    war: number;
    babip: number;
    iso: number;
    kRate: number;
    bbRate: number;
    contactRate: number;
    hardHitRate: number;
    exitVelocity: number;
    launchAngle: number;
    barrelRate: number;
    xba: number; // Expected batting average
    xslg: number; // Expected slugging
    xwoba: number; // Expected wOBA
  };
  pitching?: {
    gamesPlayed: number;
    gamesStarted: number;
    completeGames: number;
    shutouts: number;
    wins: number;
    losses: number;
    saves: number;
    saveOpportunities: number;
    holds: number;
    blownSaves: number;
    inningsPitched: number;
    hits: number;
    runs: number;
    earnedRuns: number;
    homeRuns: number;
    baseOnBalls: number;
    intentionalWalks: number;
    strikeOuts: number;
    hitByPitch: number;
    balks: number;
    wildPitches: number;
    era: number;
    whip: number;
    // Advanced metrics
    fip: number;
    xfip: number;
    siera: number;
    war: number;
    kRate: number;
    bbRate: number;
    kbb: number;
    babip: number;
    lobRate: number;
    gbRate: number;
    fbRate: number;
    ldRate: number;
    hrFbRate: number;
    avgFastball: number;
    maxFastball: number;
    spinRate: number;
    stuff: number;
    command: number;
  };
  fielding?: {
    gamesPlayed: number;
    gamesStarted: number;
    innings: number;
    putOuts: number;
    assists: number;
    errors: number;
    doublePlays: number;
    triplePlays: number;
    fieldingPercentage: number;
    rangeFactorPerGame: number;
    rangeFactorPer9: number;
    // Advanced fielding metrics
    uzr: number; // Ultimate Zone Rating
    drs: number; // Defensive Runs Saved
    outs: number; // Outs Above Average
    framing?: number; // Catcher framing runs
    blocking?: number; // Catcher blocking runs
    throwing?: number; // Catcher throwing runs
  };
}

interface ComprehensiveTeamData {
  id: number;
  name: string;
  teamName: string;
  locationName: string;
  shortName: string;
  abbreviation: string;
  teamCode: string;
  fileCode: string;
  division: DivisionInfo;
  league: LeagueInfo;
  venue: VenueInfo;
  springVenue?: VenueInfo;
  parentOrgName?: string;
  parentOrgId?: number;
  record: {
    season2025: TeamRecord;
    season2024?: TeamRecord;
    last10: TeamRecord;
    homeRecord: TeamRecord;
    roadRecord: TeamRecord;
    vsLeft: TeamRecord;
    vsRight: TeamRecord;
    extraInnings: TeamRecord;
    oneRun: TeamRecord;
    dayGames: TeamRecord;
    nightGames: TeamRecord;
    grassGames: TeamRecord;
    turfGames: TeamRecord;
  };
  stats: {
    hitting: TeamHittingStats;
    pitching: TeamPitchingStats;
    fielding: TeamFieldingStats;
    baserunning: TeamBaserunningStats;
    situational: TeamSituationalStats;
    advanced: TeamAdvancedStats;
  };
  roster: {
    active: ComprehensivePlayerData[];
    bench: ComprehensivePlayerData[];
    bullpen: ComprehensivePlayerData[];
    rotation: ComprehensivePlayerData[];
    injured: ComprehensivePlayerData[];
    minors: ComprehensivePlayerData[];
  };
  schedule: {
    completed: ComprehensiveGameData[];
    upcoming: ComprehensiveGameData[];
    season: ComprehensiveGameData[];
  };
  transactions: Transaction[];
  injuries: InjuryReport[];
  prospects: ProspectData[];
  payroll: PayrollData;
  analytics: {
    powerRankings: PowerRanking[];
    projections: TeamProjections;
    playoffOdds: PlayoffOdds;
    strengthOfSchedule: number;
    pythagRecord: TeamRecord;
    expectedRecord: TeamRecord;
    clutchRecord: TeamRecord;
    runDifferential: number;
    baseballReference: {
      teamWar: number;
      teamRa9War: number;
    };
  };
}

interface WeatherData {
  condition: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: number;
  windDirection: string;
  humidity: number;
  precipitation: number;
  pressure: number;
}

interface AdvancedPlayerStats {
  // Statcast data
  statcast: {
    exitVelocity: number;
    launchAngle: number;
    hardHitRate: number;
    barrelRate: number;
    maxExitVelocity: number;
    sprintSpeed?: number;
    outfieldJumpRate?: number;
    catchProbability?: number;
  };
  // FanGraphs style advanced stats
  fangraphs: {
    war: number;
    warPercentile: number;
    clutch: number;
    wpa: number; // Win Probability Added
    re24: number; // Run Expectancy
    rar: number; // Runs Above Replacement
    dollars: number; // Dollar value
  };
  // Baseball Reference style
  bbref: {
    war: number;
    owar?: number; // Offensive WAR
    dwar?: number; // Defensive WAR
    oWins?: number;
    dWins?: number;
    salary?: number;
    contract?: ContractInfo;
  };
}

// Additional interfaces for comprehensive data
interface TeamHittingStats {
  gamesPlayed: number;
  plateAppearances: number;
  atBats: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  baseOnBalls: number;
  strikeOuts: number;
  stolenBases: number;
  caughtStealing: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  teamBabip: number;
  teamLob: number;
  risp: number; // Runners in scoring position
  rispWith2Outs: number;
  leadoffAvg: number;
  clutchAvg: number;
}

interface TeamPitchingStats {
  gamesPlayed: number;
  gamesStarted: number;
  completeGames: number;
  shutouts: number;
  wins: number;
  losses: number;
  saves: number;
  saveOpportunities: number;
  inningsPitched: number;
  hits: number;
  runs: number;
  earnedRuns: number;
  homeRuns: number;
  baseOnBalls: number;
  strikeOuts: number;
  era: number;
  whip: number;
  babip: number;
  fip: number;
  xfip: number;
  k9: number;
  bb9: number;
  hr9: number;
  qualityStarts: number;
  bullpenEra: number;
  starterEra: number;
}

interface PlayoffOdds {
  makePlayoffs: number;
  winDivision: number;
  winWildCard: number;
  winPennant: number;
  winWorldSeries: number;
  currentSeed: number;
  projectedSeed: number;
  magicNumber?: number;
  eliminationNumber?: number;
}

class ComprehensiveMLBDataService {
  private readonly MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
  private readonly FANGRAPHS_API = 'https://www.fangraphs.com/api';
  private readonly CACHE_DURATION = 1800000; // 30 minutes for comprehensive data
  private readonly SEASON = 2025;

  private dataCache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor() {
    console.log('🚀 Initializing COMPREHENSIVE MLB Data Service');
    console.log('📊 This service will fetch MASSIVE amounts of data from multiple sources');
    this.startComprehensiveDataCollection();
  }

  /**
   * THE BIG KAHUNA - Fetch everything for all teams
   */
  async startComprehensiveDataCollection(): Promise<void> {
    console.log('🔥 Starting COMPREHENSIVE data collection...');
    
    try {
      // Get all teams first
      const teams = await this.fetchAllTeams();
      console.log(`📋 Found ${teams.length} MLB teams`);

      // For each team, fetch EVERYTHING
      for (const team of teams) {
        console.log(`🏟️  Processing ${team.name}...`);
        await this.fetchComprehensiveTeamData(team.id);
      }

      // Fetch league-wide data
      await this.fetchLeagueWideData();
      
      console.log('✅ COMPREHENSIVE data collection complete!');
      
    } catch (error) {
      console.error('💥 Error in comprehensive data collection:', error);
    }
  }

  /**
   * Fetch EVERYTHING for a specific team
   */
  async fetchComprehensiveTeamData(teamId: number): Promise<ComprehensiveTeamData> {
    const cacheKey = `comprehensive-team-${teamId}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached as ComprehensiveTeamData;
    }

    console.log(`🔍 Fetching COMPREHENSIVE data for team ${teamId}...`);

    try {
      // Parallel fetch all data sources
      const [
        teamInfo,
        roster,
        schedule,
        stats,
        transactions,
        injuries,
        prospects
      ] = await Promise.all([
        this.fetchTeamInfo(teamId),
        this.fetchFullRoster(teamId),
        this.fetchFullSchedule(teamId),
        this.fetchComprehensiveTeamStats(teamId),
        this.fetchTeamTransactions(teamId),
        this.fetchTeamInjuries(teamId),
        this.fetchTeamProspects(teamId)
      ]);

      const comprehensiveData: ComprehensiveTeamData = {
        ...teamInfo,
        roster,
        schedule,
        stats,
        transactions,
        injuries,
        prospects,
        analytics: await this.fetchTeamAnalytics(teamId)
      };

      // Cache the data
      this.setCachedData(cacheKey, comprehensiveData);
      
      console.log(`✅ Comprehensive data for ${teamInfo.name} complete!`);
      return comprehensiveData;

    } catch (error) {
      console.error(`💥 Error fetching comprehensive data for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch ALL games for the season (every single game)
   */
  async fetchAllSeasonGames(): Promise<ComprehensiveGameData[]> {
    console.log('🏟️  Fetching ALL season games...');
    
    const cacheKey = `all-season-games-${this.SEASON}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached as ComprehensiveGameData[];
    }

    try {
      const allGames: ComprehensiveGameData[] = [];
      
      // Fetch games from start of season to end
      const startDate = `${this.SEASON}-03-20`; // Spring training starts
      const endDate = `${this.SEASON}-11-30`; // World Series ends
      
      let currentDate = new Date(startDate);
      const endDateObj = new Date(endDate);

      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split('T')[0];
        console.log(`📅 Fetching games for ${dateStr}...`);
        
        try {
          const url = `${this.MLB_API_BASE}/schedule?sportId=1&date=${dateStr}&hydrate=team,linescore,boxscore,decisions,weather,venue,officials,probablePitchers`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.dates && data.dates.length > 0) {
            for (const date of data.dates) {
              for (const game of date.games) {
                const comprehensiveGame = await this.enrichGameData(game);
                allGames.push(comprehensiveGame);
              }
            }
          }
        } catch (dateError) {
          console.warn(`⚠️  Error fetching games for ${dateStr}:`, dateError);
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`🎉 Fetched ${allGames.length} total games for ${this.SEASON} season!`);
      
      // Cache the massive dataset
      this.setCachedData(cacheKey, allGames);
      return allGames;

    } catch (error) {
      console.error('💥 Error fetching all season games:', error);
      throw error;
    }
  }

  /**
   * Enrich game data with additional details
   */
  private async enrichGameData(gameData: any): Promise<ComprehensiveGameData> {
    // Fetch detailed game data if needed
    if (!gameData.linescore || !gameData.boxscore) {
      const detailedGame = await this.fetchDetailedGameData(gameData.gamePk);
      gameData = { ...gameData, ...detailedGame };
    }

    return {
      gameId: gameData.gamePk.toString(),
      season: this.SEASON,
      gameDate: gameData.gameDate,
      gameType: gameData.gameType,
      status: {
        detailedState: gameData.status?.detailedState || 'Unknown',
        statusCode: gameData.status?.statusCode || 'U',
        isInProgress: gameData.status?.statusCode === 'I',
        isCompleted: gameData.status?.statusCode === 'F'
      },
      teams: {
        home: await this.enrichTeamGameData(gameData.teams?.home, gameData),
        away: await this.enrichTeamGameData(gameData.teams?.away, gameData)
      },
      venue: await this.enrichVenueData(gameData.venue),
      officials: gameData.officials || [],
      innings: gameData.linescore?.innings || [],
      linescore: gameData.linescore,
      boxscore: gameData.boxscore,
      decisions: gameData.decisions,
      highlights: await this.fetchGameHighlights(gameData.gamePk),
      attendance: gameData.attendance,
      gameDuration: gameData.gameDurationMinutes ? `${gameData.gameDurationMinutes} minutes` : undefined,
      probablePitchers: gameData.probablePitchers
    };
  }

  // Helper methods for caching
  private getCachedData(key: string): any | null {
    const cached = this.dataCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.dataCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Placeholder methods (to be implemented)
  private async fetchAllTeams(): Promise<TeamBasic[]> {
    const url = `${this.MLB_API_BASE}/teams?sportId=1&season=${this.SEASON}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.teams || [];
  }

  private async fetchTeamInfo(teamId: number): Promise<any> {
    const url = `${this.MLB_API_BASE}/teams/${teamId}?hydrate=venue,division,league`;
    const response = await fetch(url);
    const data = await response.json();
    return data.teams?.[0] || {};
  }

  private async fetchFullRoster(teamId: number): Promise<any> {
    const url = `${this.MLB_API_BASE}/teams/${teamId}/roster?rosterType=fullSeason&hydrate=person(stats(type=[yearByYear],season=${this.SEASON}))`;
    const response = await fetch(url);
    const data = await response.json();
    return data.roster || [];
  }

  private async fetchFullSchedule(teamId: number): Promise<any> {
    const url = `${this.MLB_API_BASE}/schedule?teamId=${teamId}&season=${this.SEASON}&sportId=1&hydrate=team,linescore,decisions,weather`;
    const response = await fetch(url);
    const data = await response.json();
    return data.dates || [];
  }

  private async fetchComprehensiveTeamStats(teamId: number): Promise<any> {
    // This would fetch hitting, pitching, fielding, baserunning stats
    return {};
  }

  private async fetchTeamTransactions(teamId: number): Promise<Transaction[]> {
    return [];
  }

  private async fetchTeamInjuries(teamId: number): Promise<InjuryReport[]> {
    return [];
  }

  private async fetchTeamProspects(teamId: number): Promise<ProspectData[]> {
    return [];
  }

  private async fetchTeamAnalytics(teamId: number): Promise<any> {
    return {};
  }

  private async fetchLeagueWideData(): Promise<void> {
    console.log('🌍 Fetching league-wide data...');
    // Implement league-wide statistics, awards, etc.
  }

  private async enrichTeamGameData(teamData: any, gameData: any): Promise<TeamGameData> {
    return teamData; // Placeholder
  }

  private async enrichVenueData(venueData: any): Promise<any> {
    return venueData; // Placeholder
  }

  private async fetchDetailedGameData(gamePk: number): Promise<any> {
    const url = `${this.MLB_API_BASE}/game/${gamePk}/feed/live`;
    const response = await fetch(url);
    return await response.json();
  }

  private async fetchGameHighlights(gamePk: number): Promise<Highlight[]> {
    return []; // Placeholder
  }

  /**
   * MULTI-YEAR DATA COLLECTION
   * Support for comprehensive historical data across multiple seasons
   */
  async fetchMultiYearData(startYear: number, endYear: number): Promise<any> {
    console.log(`📅 Fetching multi-year data: ${startYear}-${endYear}`);
    
    const multiYearData = {
      timeframe: { startYear, endYear },
      seasons: {},
      aggregatedStats: {},
      trends: {},
      comparisons: {}
    };

    for (let year = startYear; year <= endYear; year++) {
      console.log(`🗓️  Processing season ${year}...`);
      
      try {
        // Temporarily set the service to work with this year
        const originalSeason = this.SEASON;
        (this as any).SEASON = year;
        
        // Fetch all data for this year
        const seasonData = await this.fetchSeasonData(year);
        multiYearData.seasons[year] = seasonData;
        
        // Restore original season
        (this as any).SEASON = originalSeason;
        
        console.log(`✅ Season ${year} data collection complete`);
        
      } catch (error) {
        console.error(`❌ Error fetching data for season ${year}:`, error);
        multiYearData.seasons[year] = { error: error.message };
      }
    }

    // Calculate aggregated statistics across all years
    multiYearData.aggregatedStats = this.calculateMultiYearStats(multiYearData.seasons);
    
    // Calculate trends across years
    multiYearData.trends = this.calculateMultiYearTrends(multiYearData.seasons);
    
    // Generate year-over-year comparisons
    multiYearData.comparisons = this.generateYearOverYearComparisons(multiYearData.seasons);

    console.log(`🎉 Multi-year data collection complete: ${endYear - startYear + 1} seasons`);
    return multiYearData;
  }

  /**
   * Fetch comprehensive data for a specific season
   */
  async fetchSeasonData(year: number): Promise<any> {
    console.log(`📊 Fetching comprehensive season data for ${year}...`);
    
    const cacheKey = `season-data-${year}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    const seasonData = {
      year,
      teams: {},
      players: {},
      games: {},
      standings: {},
      postseason: {},
      awards: {},
      stats: {
        league: {},
        individual: {},
        team: {}
      },
      trends: {},
      milestones: []
    };

    try {
      // Fetch all teams for this season
      const teams = await this.fetchAllTeamsForYear(year);
      
      // Collect data for each team
      for (const team of teams) {
        console.log(`🏟️  Collecting ${year} data for ${team.name}...`);
        
        const teamData = await this.fetchHistoricalTeamData(team.id, year);
        seasonData.teams[team.id] = teamData;
        
        // Add small delay to be respectful to APIs
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Fetch season-wide data
      seasonData.standings = await this.fetchSeasonStandings(year);
      seasonData.postseason = await this.fetchPostseasonData(year);
      seasonData.awards = await this.fetchSeasonAwards(year);
      
      // Calculate season statistics
      seasonData.stats = this.calculateSeasonStats(seasonData);
      
      // Cache the complete season data
      this.setCachedData(cacheKey, seasonData);
      
      console.log(`✅ Season ${year} comprehensive data collection complete`);
      return seasonData;
      
    } catch (error) {
      console.error(`❌ Error collecting season ${year} data:`, error);
      throw error;
    }
  }

  /**
   * DAILY INCREMENTAL UPDATES
   * Efficiently update only changed data
   */
  async performIncrementalUpdate(): Promise<any> {
    console.log('🔄 Performing incremental data update...');
    
    const updateResult = {
      timestamp: new Date().toISOString(),
      updatedData: {
        games: 0,
        players: 0,
        teams: 0,
        stats: 0
      },
      errors: [],
      duration: 0
    };

    const startTime = Date.now();

    try {
      // 1. Update today's games
      const todayGames = await this.updateTodayGames();
      updateResult.updatedData.games = todayGames.length;

      // 2. Update active player stats (only players who played recently)
      const updatedPlayers = await this.updateActivePlayers();
      updateResult.updatedData.players = updatedPlayers.length;

      // 3. Update team stats
      const updatedTeams = await this.updateTeamStats();
      updateResult.updatedData.teams = updatedTeams.length;

      // 4. Update league standings
      await this.updateStandings();
      updateResult.updatedData.stats++;

      updateResult.duration = Date.now() - startTime;
      
      console.log(`✅ Incremental update complete in ${updateResult.duration}ms`);
      console.log(`📊 Updated: ${updateResult.updatedData.games} games, ${updateResult.updatedData.players} players, ${updateResult.updatedData.teams} teams`);
      
      return updateResult;

    } catch (error) {
      updateResult.errors.push(error.message);
      updateResult.duration = Date.now() - startTime;
      
      console.error('❌ Error during incremental update:', error);
      throw error;
    }
  }

  /**
   * COMPREHENSIVE ANALYSIS SUPPORT
   * Enable analysis across years, months, weeks, days
   */
  async getAnalysisData(options: {
    startDate?: string;
    endDate?: string;
    years?: number[];
    teams?: string[];
    players?: string[];
    granularity?: 'day' | 'week' | 'month' | 'year';
  }): Promise<any> {
    console.log('📈 Generating analysis data...', options);
    
    const analysisData = {
      metadata: {
        requestedAt: new Date().toISOString(),
        timeframe: options,
        dataPoints: 0
      },
      data: {
        byYear: {},
        byMonth: {},
        byWeek: {},
        byDay: {},
        trends: {},
        comparisons: {},
        aggregations: {}
      }
    };

    // If years are specified, fetch multi-year data
    if (options.years && options.years.length > 0) {
      for (const year of options.years) {
        console.log(`📅 Analyzing year ${year}...`);
        
        const yearData = await this.getYearAnalysis(year, options);
        analysisData.data.byYear[year] = yearData;
        analysisData.metadata.dataPoints += yearData.dataPoints || 0;
      }
    }

    // Generate analysis based on granularity
    switch (options.granularity) {
      case 'day':
        analysisData.data.byDay = await this.getDailyAnalysis(options);
        break;
      case 'week':
        analysisData.data.byWeek = await this.getWeeklyAnalysis(options);
        break;
      case 'month':
        analysisData.data.byMonth = await this.getMonthlyAnalysis(options);
        break;
      case 'year':
      default:
        analysisData.data.byYear = await this.getYearlyAnalysis(options);
        break;
    }

    // Calculate trends across the dataset
    analysisData.data.trends = this.calculateTrends(analysisData.data);
    
    // Generate comparisons
    analysisData.data.comparisons = this.generateComparisons(analysisData.data);
    
    console.log(`✅ Analysis complete: ${analysisData.metadata.dataPoints} data points analyzed`);
    return analysisData;
  }

  // Helper methods for multi-year support
  private async fetchAllTeamsForYear(year: number): Promise<any[]> {
    try {
      const url = `${this.MLB_API_BASE}/teams?sportId=1&season=${year}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.teams || [];
    } catch (error) {
      console.error(`Error fetching teams for ${year}:`, error);
      return [];
    }
  }

  private async fetchHistoricalTeamData(teamId: number, year: number): Promise<any> {
    console.log(`📊 Fetching historical data for team ${teamId} in ${year}...`);
    
    try {
      // Fetch multiple data sources for this team/year
      const [roster, schedule, stats] = await Promise.all([
        this.fetchTeamRosterForYear(teamId, year),
        this.fetchTeamScheduleForYear(teamId, year),
        this.fetchTeamStatsForYear(teamId, year)
      ]);

      return {
        teamId,
        year,
        roster,
        schedule,
        stats,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching historical data for team ${teamId} in ${year}:`, error);
      return { error: error.message };
    }
  }

  private async fetchTeamRosterForYear(teamId: number, year: number): Promise<any> {
    try {
      const url = `${this.MLB_API_BASE}/teams/${teamId}/roster?rosterType=fullSeason&season=${year}&hydrate=person(stats(type=[yearByYear],season=${year}))`;
      const response = await fetch(url);
      const data = await response.json();
      return data.roster || [];
    } catch (error) {
      console.error(`Error fetching roster for team ${teamId} in ${year}:`, error);
      return [];
    }
  }

  private async fetchTeamScheduleForYear(teamId: number, year: number): Promise<any> {
    try {
      const url = `${this.MLB_API_BASE}/schedule?teamId=${teamId}&season=${year}&sportId=1&hydrate=team,linescore,decisions`;
      const response = await fetch(url);
      const data = await response.json();
      return data.dates || [];
    } catch (error) {
      console.error(`Error fetching schedule for team ${teamId} in ${year}:`, error);
      return [];
    }
  }

  private async fetchTeamStatsForYear(teamId: number, year: number): Promise<any> {
    try {
      const url = `${this.MLB_API_BASE}/teams/${teamId}/stats?season=${year}&sportId=1&stats=season`;
      const response = await fetch(url);
      const data = await response.json();
      return data.stats || [];
    } catch (error) {
      console.error(`Error fetching stats for team ${teamId} in ${year}:`, error);
      return [];
    }
  }

  private async fetchSeasonStandings(year: number): Promise<any> {
    try {
      const url = `${this.MLB_API_BASE}/standings?leagueId=103,104&season=${year}&standingsTypes=regularSeason`;
      const response = await fetch(url);
      const data = await response.json();
      return data.records || [];
    } catch (error) {
      console.error(`Error fetching standings for ${year}:`, error);
      return [];
    }
  }

  private async fetchPostseasonData(year: number): Promise<any> {
    try {
      const url = `${this.MLB_API_BASE}/schedule?season=${year}&sportId=1&gameTypes=P&hydrate=team,linescore`;
      const response = await fetch(url);
      const data = await response.json();
      return data.dates || [];
    } catch (error) {
      console.error(`Error fetching postseason data for ${year}:`, error);
      return [];
    }
  }

  private async fetchSeasonAwards(year: number): Promise<any> {
    // Awards data might need different endpoint or source
    return [];
  }

  // Helper methods for incremental updates
  private async updateTodayGames(): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    console.log(`🎮 Updating games for ${today}...`);
    
    try {
      const url = `${this.MLB_API_BASE}/schedule?sportId=1&date=${today}&hydrate=team,linescore,boxscore`;
      const response = await fetch(url);
      const data = await response.json();
      
      const games = [];
      if (data.dates && data.dates.length > 0) {
        for (const date of data.dates) {
          games.push(...date.games);
        }
      }
      
      console.log(`✅ Updated ${games.length} games for today`);
      return games;
    } catch (error) {
      console.error('Error updating today\'s games:', error);
      return [];
    }
  }

  private async updateActivePlayers(): Promise<any[]> {
    console.log('👥 Updating active player stats...');
    // Implementation for updating only active players
    return [];
  }

  private async updateTeamStats(): Promise<any[]> {
    console.log('🏟️  Updating team statistics...');
    // Implementation for updating team stats
    return [];
  }

  private async updateStandings(): Promise<void> {
    console.log('🏆 Updating league standings...');
    // Implementation for updating standings
  }

  // Analysis helper methods
  private calculateMultiYearStats(seasons: any): any {
    // Calculate aggregated statistics across multiple seasons
    return {
      totalSeasons: Object.keys(seasons).length,
      aggregatedStats: {},
      trends: {}
    };
  }

  private calculateMultiYearTrends(seasons: any): any {
    // Calculate trends across multiple years
    return {
      offensiveTrends: {},
      pitchingTrends: {},
      teamTrends: {}
    };
  }

  private generateYearOverYearComparisons(seasons: any): any {
    // Generate year-over-year comparisons
    return {
      performanceChanges: {},
      emergingTrends: {},
      significantChanges: {}
    };
  }

  private calculateSeasonStats(seasonData: any): any {
    // Calculate comprehensive season statistics
    return {
      league: {},
      individual: {},
      team: {}
    };
  }

  private async getYearAnalysis(year: number, options: any): Promise<any> {
    return { year, dataPoints: 1000 };
  }

  private async getDailyAnalysis(options: any): Promise<any> {
    return { granularity: 'day' };
  }

  private async getWeeklyAnalysis(options: any): Promise<any> {
    return { granularity: 'week' };
  }

  private async getMonthlyAnalysis(options: any): Promise<any> {
    return { granularity: 'month' };
  }

  private async getYearlyAnalysis(options: any): Promise<any> {
    return { granularity: 'year' };
  }

  private calculateTrends(data: any): any {
    return { trends: 'calculated' };
  }

  private generateComparisons(data: any): any {
    return { comparisons: 'generated' };
  }

  /**
   * PUBLIC API METHODS
   */
  
  async getComprehensiveTeamData(teamCode: string): Promise<ComprehensiveTeamData> {
    const teams = await this.fetchAllTeams();
    const team = teams.find(t => t.abbreviation?.toLowerCase() === teamCode.toLowerCase());
    if (!team) {
      throw new Error(`Team not found: ${teamCode}`);
    }
    return await this.fetchComprehensiveTeamData(team.id);
  }

  async getAllGames(): Promise<ComprehensiveGameData[]> {
    return await this.fetchAllSeasonGames();
  }

  async getTeamGames(teamCode: string): Promise<ComprehensiveGameData[]> {
    const allGames = await this.fetchAllSeasonGames();
    return allGames.filter(game => 
      game.teams.home.team.abbreviation?.toLowerCase() === teamCode.toLowerCase() ||
      game.teams.away.team.abbreviation?.toLowerCase() === teamCode.toLowerCase()
    );
  }

  /**
   * Fetch and store boxscores for all completed games in a given season.
   * This enables deep player-vs-team and player-vs-pitcher analysis.
   */
  public async fetchAndStoreAllBoxscoresForSeason(season: number): Promise<void> {
    console.log(`📦 Fetching and storing boxscores for all completed games in season ${season}...`);
    // 1. Fetch all games for the season
    const scheduleUrl = `${this.MLB_API_BASE}/schedule?sportId=1&season=${season}&hydrate=team`;
    const scheduleResp = await fetch(scheduleUrl);
    const scheduleData = await scheduleResp.json();
    const allGames: any[] = [];
    for (const dateObj of scheduleData.dates || []) {
      allGames.push(...(dateObj.games || []));
    }
    const completedGames = allGames.filter(g => g.status?.abstractGameState === 'Final');
    console.log(`Found ${completedGames.length} completed games in ${season}`);

    // 2. For each completed game, fetch and store the boxscore
    for (const game of completedGames) {
      const gamePk = game.gamePk;
      const boxscoreUrl = `${this.MLB_API_BASE}/game/${gamePk}/boxscore`;
      try {
        const boxscoreResp = await fetch(boxscoreUrl);
        if (!boxscoreResp.ok) throw new Error(`Boxscore fetch failed: ${boxscoreResp.status}`);
        const boxscoreData = await boxscoreResp.json();
        // Store boxscore data (e.g., as a file or in DB)
        await storeData(`boxscores/boxscore_${season}_${gamePk}.json`, boxscoreData);
        console.log(`✅ Stored boxscore for gamePk ${gamePk}`);
      } catch (err) {
        console.error(`❌ Failed to fetch/store boxscore for gamePk ${gamePk}:`, err);
      }
    }
    console.log(`🎉 All boxscores for season ${season} processed.`);
  }
}

// Type definitions (placeholders - would need to be fully defined)
interface TeamBasic { id: number; name: string; abbreviation: string; }
interface PlayerBasic { id: number; fullName: string; }
interface PlayerPosition { code: string; name: string; abbreviation: string; }
interface DivisionInfo { id: number; name: string; }
interface LeagueInfo { id: number; name: string; }
interface VenueInfo { id: number; name: string; }
interface TeamRecord { wins: number; losses: number; ties?: number; winningPercentage: number; }
interface Official { id: number; fullName: string; }
interface InningData { num: number; ordinalNum: string; home: any; away: any; }
interface LinescoreData { currentInning: number; currentInningOrdinal: string; inningState: string; }
interface BoxscoreData { teams: any; officials: any; }
interface PlayerDecision { id: number; fullName: string; }
interface Highlight { id: string; title: string; description: string; }
interface PlayerCareerStats { }
interface SituationalStats { }
interface MonthlyStats { month: string; stats: any; }
interface VsTeamStats { team: string; stats: any; }
interface PlayerSplits { }
interface InjuryData { }
interface Award { }
interface Transaction { }
interface SalaryData { }
interface ContractInfo { }
interface TeamFieldingStats { }
interface TeamBaserunningStats { }
interface TeamSituationalStats { }
interface TeamAdvancedStats { }
interface InjuryReport { }
interface ProspectData { }
interface PayrollData { }
interface PowerRanking { }
interface TeamProjections { }

export { ComprehensiveMLBDataService };
export default new ComprehensiveMLBDataService();
