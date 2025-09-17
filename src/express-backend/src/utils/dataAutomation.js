const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

// Background automation for MLB data collection
class DataCollectionAutomator {
  constructor() {
    this.isRunning = false;
    this.lastUpdate = null;
    this.scriptsPath = path.join(__dirname, '../scripts');
  }

  // Run a script and return a promise
  runScript(scriptName, args = []) {
    return new Promise((resolve, reject) => {
      console.log(`🚀 Starting automated script: ${scriptName}`);
      
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
          console.log(`✅ Script ${scriptName} completed successfully`);
          resolve({ success: true, output, code });
        } else {
          console.error(`❌ Script ${scriptName} failed with code ${code}`);
          console.error('Error output:', errorOutput);
          reject({ success: false, output, errorOutput, code });
        }
      });

      scriptProcess.on('error', (error) => {
        console.error(`❌ Failed to start script ${scriptName}:`, error);
        reject({ success: false, error: error.message });
      });
    });
  }

  // Update today's games (lightweight, fast)
  async updateTodaysGames() {
    try {
      if (this.isRunning) {
        console.log('⏳ Data collection already in progress, skipping...');
        return;
      }

      this.isRunning = true;
      const today = new Date().toISOString().split('T')[0];
      
      console.log(`📅 Updating today's games for ${today}`);
      
      // Run the boxscore script for today only (much faster than full season)
      await this.runScript('pullBoxscoreRedis.cjs', [
        '--date', today,
        '--limit', '50',
        '--quick'  // Add a quick mode flag
      ]);

      this.lastUpdate = new Date();
      console.log(`✅ Today's games updated successfully at ${this.lastUpdate.toLocaleString()}`);
      
    } catch (error) {
      console.error('❌ Failed to update today\'s games:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Full data refresh (runs less frequently)
  async fullDataRefresh() {
    try {
      if (this.isRunning) {
        console.log('⏳ Data collection already in progress, skipping full refresh...');
        return;
      }

      this.isRunning = true;
      console.log('🔄 Starting full data refresh...');
      
      // Run full boxscore update for the last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      await this.runScript('pullBoxscoreRedis.cjs', [
        '--startDate', startDate.toISOString().split('T')[0],
        '--endDate', endDate.toISOString().split('T')[0]
      ]);

      this.lastUpdate = new Date();
      console.log(`✅ Full data refresh completed at ${this.lastUpdate.toLocaleString()}`);
      
    } catch (error) {
      console.error('❌ Failed to complete full data refresh:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Start the automation
  start() {
    console.log('🤖 Starting MLB Data Collection Automator...');

    // Update today's games every 10 minutes during game hours (12 PM - 12 AM ET)
    cron.schedule('*/10 12-23 * * *', () => {
      console.log('⚾ Scheduled update: Today\'s games');
      this.updateTodaysGames();
    });

    // Full data refresh every 2 hours during off-peak (2 AM, 4 AM, 6 AM, 8 AM, 10 AM)
    cron.schedule('0 2,4,6,8,10 * * *', () => {
      console.log('🔄 Scheduled update: Full data refresh');
      this.fullDataRefresh();
    });

    // Initial update on startup
    setTimeout(() => {
      console.log('🚀 Initial data update on startup');
      this.updateTodaysGames();
    }, 5000);

    console.log('✅ Automation schedules set:');
    console.log('   - Today\'s games: Every 10 minutes (12 PM - 11 PM ET)');
    console.log('   - Full refresh: Every 2 hours (off-peak)');
    console.log('   - Initial update: 5 seconds after startup');
  }

  // Stop the automation
  stop() {
    console.log('🛑 Stopping MLB Data Collection Automator...');
    // Note: node-cron doesn't provide a direct way to stop all tasks
    // In a production environment, you'd want to keep track of task references
  }

  // Get automation status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastUpdate: this.lastUpdate,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}

// Create and export the automator instance
const automator = new DataCollectionAutomator();

// Auto-start if this file is run directly
if (require.main === module) {
  automator.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    automator.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    automator.stop();
    process.exit(0);
  });
}

module.exports = automator;
