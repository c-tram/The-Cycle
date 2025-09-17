const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');
const { getKeysByPattern, getMultipleKeys, setKey } = require('./redis');

// Smart event-driven automation for MLB data collection
class SmartDataAutomator {
  constructor() {
    this.isRunning = false;
    this.gameStates = new Map(); // Track game states: gameId -> { status, lastUpdate }
    this.scriptsPath = path.join(__dirname, '../scripts');
    this.monitoringInterval = null;
    this.lastScheduleCheck = null;
  }

  // Run a script and return a promise
  async runScript(scriptName, args = []) {
    return new Promise((resolve, reject) => {
      console.log(`🚀 Smart automation running: ${scriptName}`);
      
      const scriptProcess = spawn('node', [path.join(this.scriptsPath, scriptName), ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.scriptsPath
      });

      let output = '';
      let errorOutput = '';

      scriptProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      scriptProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      scriptProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Smart automation completed: ${scriptName}`);
          resolve({ success: true, output, code });
        } else {
          console.error(`❌ Smart automation failed: ${scriptName} (code ${code})`);
          console.error('Error output:', errorOutput);
          reject({ success: false, output, errorOutput, code });
        }
      });

      scriptProcess.on('error', (error) => {
        console.error(`❌ Failed to start ${scriptName}:`, error);
        reject({ success: false, error: error.message });
      });
    });
  }

  // Get today's games from MLB API
  async getTodaysGames() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=game(content(summary,media(epg))),linescore,team,review`);
      const data = await response.json();
      
      return data.dates?.[0]?.games || [];
    } catch (error) {
      console.error('❌ Failed to fetch today\'s games:', error);
      return [];
    }
  }

  // Monitor game state changes
  async monitorGameStates() {
    if (this.isRunning) {
      console.log('⏳ Game state monitoring already in progress, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      const games = await this.getTodaysGames();
      
      if (games.length === 0) {
        console.log('📅 No games scheduled for today');
        return;
      }

      console.log(`🔍 Monitoring ${games.length} games for state changes...`);
      
      for (const game of games) {
        const gameId = game.gamePk.toString();
        const currentStatus = game.status?.detailedState || 'Unknown';
        const isLive = game.status?.abstractGameState === 'Live';
        const isFinal = game.status?.abstractGameState === 'Final';
        
        const previousState = this.gameStates.get(gameId);
        
        // If this is a new game or state changed
        if (!previousState || previousState.status !== currentStatus) {
          console.log(`🎯 Game ${gameId} state change: ${previousState?.status || 'NEW'} → ${currentStatus}`);
          
          // Handle different state transitions
          if (isFinal && (!previousState || !previousState.isFinal)) {
            console.log(`🏁 Game ${gameId} finished! Pulling complete boxscore data...`);
            await this.handleGameCompletion(gameId);
          } else if (isLive && (!previousState || !previousState.isLive)) {
            console.log(`▶️ Game ${gameId} started! Beginning live monitoring...`);
            await this.handleGameStart(gameId);
          } else if (isLive && previousState?.isLive) {
            // Game is still live, periodic update
            console.log(`🔄 Game ${gameId} live update...`);
            await this.handleLiveGameUpdate(gameId);
          }
          
          // Update our state tracking
          this.gameStates.set(gameId, {
            status: currentStatus,
            isLive,
            isFinal,
            lastUpdate: new Date(),
            gameData: {
              awayTeam: game.teams?.away?.team?.abbreviation,
              homeTeam: game.teams?.home?.team?.abbreviation,
              awayScore: game.teams?.away?.score || 0,
              homeScore: game.teams?.home?.score || 0
            }
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error monitoring game states:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Handle when a game completes
  async handleGameCompletion(gameId) {
    try {
      console.log(`📊 Processing final stats for game ${gameId}...`);
      
      // Run the v2 boxscore script for this specific game
      await this.runScript('pullBoxscoresToRedis_v2.cjs', ['--gameId', gameId]);
      
      // Store completion timestamp in Redis
      await setKey(`game:${gameId}:completed`, new Date().toISOString());
      
      console.log(`✅ Game ${gameId} final stats processed and cached`);
      
    } catch (error) {
      console.error(`❌ Failed to process completion for game ${gameId}:`, error);
    }
  }

  // Handle when a game starts
  async handleGameStart(gameId) {
    try {
      console.log(`🚀 Game ${gameId} started, initializing live tracking...`);
      
      // Pull initial game data
      await this.runScript('pullBoxscoresToRedis_v2.cjs', ['--gameId', gameId]);
      
      // Store start timestamp
      await setKey(`game:${gameId}:started`, new Date().toISOString());
      
      console.log(`✅ Game ${gameId} live tracking initialized`);
      
    } catch (error) {
      console.error(`❌ Failed to initialize tracking for game ${gameId}:`, error);
    }
  }

  // Handle live game updates (periodic during live games)
  async handleLiveGameUpdate(gameId) {
    try {
      // Only update every 5 minutes for live games to avoid overwhelming the API
      const state = this.gameStates.get(gameId);
      const now = new Date();
      const timeSinceLastUpdate = now - state.lastUpdate;
      
      if (timeSinceLastUpdate < 5 * 60 * 1000) { // 5 minutes
        return; // Skip if updated recently
      }
      
      console.log(`📡 Live update for game ${gameId}...`);
      await this.runScript('pullBoxscoresToRedis_v2.cjs', ['--gameId', gameId]);
      
    } catch (error) {
      console.error(`❌ Failed live update for game ${gameId}:`, error);
    }
  }

  // Clean up old game states (remove games from previous days)
  cleanupOldStates() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    for (const [gameId, state] of this.gameStates.entries()) {
      if (state.lastUpdate < yesterday) {
        console.log(`🧹 Cleaning up old game state: ${gameId}`);
        this.gameStates.delete(gameId);
      }
    }
  }

  // Start the smart automation
  start() {
    console.log('🧠 Starting Smart Event-Driven MLB Data Automator...');

    // Monitor game states every 2 minutes during game hours (10 AM - 1 AM ET)
    cron.schedule('*/2 10-23,0 * * *', () => {
      this.monitorGameStates();
    });

    // Clean up old states daily at 6 AM
    cron.schedule('0 6 * * *', () => {
      console.log('🧹 Daily cleanup of old game states...');
      this.cleanupOldStates();
    });

    // Initial state check on startup
    setTimeout(() => {
      console.log('🚀 Initial game state check on startup...');
      this.monitorGameStates();
    }, 3000);

    console.log('✅ Smart automation schedules set:');
    console.log('   - Game state monitoring: Every 2 minutes (10 AM - 1 AM ET)');
    console.log('   - State cleanup: Daily at 6 AM');
    console.log('   - Event-driven updates: Real-time based on game status changes');
    console.log('   - Live game updates: Every 5 minutes during active games');
  }

  // Stop the automation
  stop() {
    console.log('🛑 Stopping Smart Data Automator...');
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  // Get detailed automation status
  getStatus() {
    const activeGames = Array.from(this.gameStates.entries())
      .filter(([_, state]) => state.isLive)
      .map(([gameId, state]) => ({
        gameId,
        status: state.status,
        teams: `${state.gameData.awayTeam} @ ${state.gameData.homeTeam}`,
        score: `${state.gameData.awayScore}-${state.gameData.homeScore}`,
        lastUpdate: state.lastUpdate
      }));

    const completedGames = Array.from(this.gameStates.entries())
      .filter(([_, state]) => state.isFinal)
      .map(([gameId, state]) => ({
        gameId,
        teams: `${state.gameData.awayTeam} @ ${state.gameData.homeTeam}`,
        finalScore: `${state.gameData.awayScore}-${state.gameData.homeScore}`,
        completedAt: state.lastUpdate
      }));

    return {
      isMonitoring: this.isRunning,
      totalGamesTracked: this.gameStates.size,
      activeGames: activeGames.length,
      completedGames: completedGames.length,
      gameDetails: {
        active: activeGames,
        completed: completedGames
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }

  // Manual trigger for testing
  async triggerManualCheck() {
    console.log('🔧 Manual game state check triggered...');
    await this.monitorGameStates();
  }
}

// Create and export the smart automator instance
const smartAutomator = new SmartDataAutomator();

// Auto-start if this file is run directly
if (require.main === module) {
  smartAutomator.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down Smart Automator...');
    smartAutomator.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down Smart Automator...');
    smartAutomator.stop();
    process.exit(0);
  });
}

module.exports = smartAutomator;
