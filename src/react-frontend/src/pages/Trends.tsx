import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Loading from '../components/Loading';
import ErrorMessage from '../components/Error';
import { getTrends, getPlayerTrendAnalysis, searchPlayers, PlayerMetadata } from '../services/api';
import '../styles/Trends.css';

const STAT_CATEGORIES = [
  'Batting Average',
  'Home Runs',
  'RBIs',
  'OPS',
  'ERA',
  'Strikeouts',
  'WHIP',
  'Exit Velocity',
  'Launch Angle',
  'Sprint Speed',
] as const;
type StatCategory = typeof STAT_CATEGORIES[number];

const TIME_PERIODS = ['7 days', '30 days', 'Season'] as const;
type TimePeriod = typeof TIME_PERIODS[number];

// Team list for comparison
const MLB_TEAMS = [
  'All Teams',
  'Arizona Diamondbacks', 'Atlanta Braves', 'Baltimore Orioles', 'Boston Red Sox',
  'Chicago Cubs', 'Chicago White Sox', 'Cincinnati Reds', 'Cleveland Guardians',
  'Colorado Rockies', 'Detroit Tigers', 'Houston Astros', 'Kansas City Royals',
  'Los Angeles Angels', 'Los Angeles Dodgers', 'Miami Marlins', 'Milwaukee Brewers',
  'Minnesota Twins', 'New York Mets', 'New York Yankees', 'Oakland Athletics',
  'Philadelphia Phillies', 'Pittsburgh Pirates', 'San Diego Padres', 'San Francisco Giants',
  'Seattle Mariners', 'St. Louis Cardinals', 'Tampa Bay Rays', 'Texas Rangers',
  'Toronto Blue Jays', 'Washington Nationals'
] as const;

// Fallback data in case API fails
const FALLBACK_TREND_DATA: Record<StatCategory, number[]> = {
  'Batting Average': [.267, .265, .264, .268, .271, .270, .266],
  'Home Runs': [1.18, 1.21, 1.25, 1.31, 1.27, 1.22, 1.19],
  'RBIs': [4.12, 4.21, 4.35, 4.41, 4.32, 4.22, 4.18],
  'OPS': [.728, .735, .741, .752, .748, .739, .731],
  'ERA': [4.05, 3.97, 3.95, 4.01, 4.08, 4.11, 4.07],
  'Strikeouts': [8.7, 8.8, 8.9, 9.1, 9.3, 9.2, 9.0],
  'WHIP': [1.28, 1.26, 1.25, 1.23, 1.24, 1.27, 1.29],
  'Exit Velocity': [88.5, 88.7, 89.1, 89.3, 89.0, 88.8, 88.6],
  'Launch Angle': [12.1, 12.3, 12.6, 12.8, 12.5, 12.4, 12.2],
  'Sprint Speed': [27.1, 27.0, 26.9, 26.8, 26.9, 27.0, 27.2]
};

const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October'];

const Trends = () => {
  const [selectedStat, setSelectedStat] = useState('Batting Average' as StatCategory);
  const [selectedTeam, setSelectedTeam] = useState('All Teams');
  const [selectedPeriod, setSelectedPeriod] = useState('7 days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendData, setTrendData] = useState(FALLBACK_TREND_DATA);
  const [comparisonMode, setComparisonMode] = useState(false);
  
  // New state for player-specific trend analysis
  const [playerQuery, setPlayerQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerMetadata[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerMetadata | null>(null);
  const [playerTrendAnalysis, setPlayerTrendAnalysis] = useState<any>(null);
  const [playerTrendLoading, setPlayerTrendLoading] = useState(false);
  const [playerTrendError, setPlayerTrendError] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Load trend data from API when the selected stat changes
    const loadTrendData = async () => {
      try {
        setLoading(true);
        setError(''); // Clear any previous errors
        
        // Get data from API
        const apiData = await getTrends(selectedStat);
        
        // Check if API returned data for the selected stat
        if (apiData && apiData[selectedStat] && apiData[selectedStat].length > 0) {
          // Create a new object with the updated data
          setTrendData((prevData: Record<StatCategory, number[]>) => {
            const newData = { ...prevData };
            const statKey = selectedStat as StatCategory;
            newData[statKey] = apiData[selectedStat] as number[];
            return newData;
          });
        } else {
          // If API didn't return usable data, fall back to mock data
          console.warn('API returned empty data, using fallback');
          setTrendData((prevData: Record<StatCategory, number[]>) => {
            const newData = { ...prevData };
            const statKey = selectedStat as StatCategory;
            newData[statKey] = FALLBACK_TREND_DATA[statKey];
            return newData;
          });
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading trend data:', err);
        setError('Failed to load trend data from API. Using fallback data.');
        // Use fallback data if API fails
        setTrendData((prevData: Record<StatCategory, number[]>) => {
          const newData = { ...prevData };
          const statKey = selectedStat as StatCategory;
          newData[statKey] = FALLBACK_TREND_DATA[statKey];
          return newData;
        });
        setLoading(false);
      }
    };
    
    loadTrendData();
  }, [selectedStat]);

  // Player search debounced effect
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!playerQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      try {
        setSearchLoading(true);
        const results = await searchPlayers(playerQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Error searching players:', err);
      } finally {
        setSearchLoading(false);
      }
    };

    const timeout = setTimeout(performSearch, 300);
    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [playerQuery]);

  // Load player trend analysis when a player is selected
  useEffect(() => {
    if (!selectedPlayer) return;
    
    const loadPlayerTrendAnalysis = async () => {
      try {
        setPlayerTrendLoading(true);
        setPlayerTrendError('');
        
        const analysis = await getPlayerTrendAnalysis(selectedPlayer.id);
        
        if (!analysis) {
          throw new Error('No analysis data returned');
        }
        
        setPlayerTrendAnalysis(analysis);
      } catch (err: any) {
        console.error('Error loading player trend analysis:', err);
        setPlayerTrendError(
          err.message && err.message !== 'Failed to fetch' 
            ? `Error: ${err.message}` 
            : 'Failed to load player trend analysis. Please try again later.'
        );
        setPlayerTrendAnalysis(null);
      } finally {
        setPlayerTrendLoading(false);
      }
    };
    
    loadPlayerTrendAnalysis();
  }, [selectedPlayer]);

  // Select a player from search results
  const selectPlayer = (player: PlayerMetadata) => {
    setSelectedPlayer(player);
    setPlayerQuery(''); // Clear search box
    setSearchResults([]); // Clear results
  };

  const renderTrendChart = () => {
    const data = trendData[selectedStat];
    const max = Math.max(...data) * 1.1;
    
    return (
      <div className="trend-chart">
        <div className="chart-title">{selectedStat} Trend (League Average)</div>
        <div className="chart-container">
          {data.map((value: number, index: number) => {
            const height = (value / max) * 100;
            return (
              <div className="chart-bar-container" key={index}>
                <div 
                  className="chart-bar" 
                  style={{ height: `${height}%` }}
                  title={`${MONTHS[index]}: ${value}`}
                ></div>
                <div className="chart-label">{MONTHS[index].substring(0, 3)}</div>
              </div>
            );
          })}
        </div>
        <div className="chart-values">
          <div className="max-value">{max.toFixed(2)}</div>
          <div className="mid-value">{(max/2).toFixed(2)}</div>
          <div className="min-value">0</div>
        </div>
      </div>
    );
  };
  
  const renderPlayerSearch = () => {
    return (
      <div className="player-search-container">
        <h3>Player Specific Trends</h3>
        <p className="search-description">
          Search for a player to view their performance trends, hot zones, and matchup statistics
        </p>
        <div className="player-search">
          <input
            type="text"
            placeholder="Search for a player (e.g., Mike Trout, Aaron Judge)..."
            value={playerQuery}
            onChange={(e) => setPlayerQuery(e.target.value)}
            className="player-search-input"
            aria-label="Search for a player"
          />
          {searchLoading && <span className="search-loading">Searching...</span>}
          
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((player) => (
                <div 
                  key={player.id} 
                  className="search-result-item"
                  onClick={() => selectPlayer(player)}
                >
                  <span className="player-name">{player.name}</span>
                  <span className="player-info">
                    <span className="player-position">{player.position}</span>
                    <span className="player-team">{player.team}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {playerQuery && !searchLoading && searchResults.length === 0 && (
            <div className="no-results">No players found. Try a different search term.</div>
          )}
        </div>
      </div>
    );
  };

  const renderPlayerTrendAnalysis = () => {
    if (!selectedPlayer) {
      return <div className="player-trend-placeholder">Search for a player above to see their performance trends</div>;
    }

    if (playerTrendLoading) {
      return <Loading message={`Loading trend analysis for ${selectedPlayer.name}...`} />;
    }

    if (playerTrendError) {
      return <ErrorMessage message={playerTrendError} />;
    }

    if (!playerTrendAnalysis) {
      return <div className="player-trend-placeholder">No trend data available for this player</div>;
    }

    return (
      <div className="player-trend-analysis">
        <div className="player-header">
          <h3>{selectedPlayer.name}</h3>
          <span className="player-team">{selectedPlayer.team || playerTrendAnalysis.team}</span>
          <button 
            className="clear-player" 
            onClick={() => {
              setSelectedPlayer(null);
              setPlayerTrendAnalysis(null);
            }}
          >
            Clear
          </button>
        </div>
        
        <div className="trend-data-container">
          <div className="trend-section">
            <h4>Recent Form</h4>
            <div className="trend-timeframes">
              {playerTrendAnalysis.recentForm && (
                <>
                  <div className="timeframe">
                    <h5>Last 7 Days</h5>
                    {playerTrendAnalysis.recentForm.last7?.battingTrends && (
                      <div className="stat-row">
                        <div className="stat-item">AVG: <span>{playerTrendAnalysis.recentForm.last7.battingTrends.avg.toFixed(3)}</span></div>
                        <div className="stat-item">HR: <span>{playerTrendAnalysis.recentForm.last7.battingTrends.homeRuns}</span></div>
                        <div className="stat-item">OPS: <span>{playerTrendAnalysis.recentForm.last7.battingTrends.ops.toFixed(3)}</span></div>
                      </div>
                    )}
                    {playerTrendAnalysis.recentForm.last7?.pitchingTrends && (
                      <div className="stat-row">
                        <div className="stat-item">ERA: <span>{playerTrendAnalysis.recentForm.last7.pitchingTrends.era.toFixed(2)}</span></div>
                        <div className="stat-item">WHIP: <span>{playerTrendAnalysis.recentForm.last7.pitchingTrends.whip.toFixed(2)}</span></div>
                        <div className="stat-item">K: <span>{playerTrendAnalysis.recentForm.last7.pitchingTrends.strikeouts}</span></div>
                      </div>
                    )}
                  </div>
                  
                  <div className="timeframe">
                    <h5>Last 30 Days</h5>
                    {playerTrendAnalysis.recentForm.last30?.battingTrends && (
                      <div className="stat-row">
                        <div className="stat-item">AVG: <span>{playerTrendAnalysis.recentForm.last30.battingTrends.avg.toFixed(3)}</span></div>
                        <div className="stat-item">HR: <span>{playerTrendAnalysis.recentForm.last30.battingTrends.homeRuns}</span></div>
                        <div className="stat-item">OPS: <span>{playerTrendAnalysis.recentForm.last30.battingTrends.ops.toFixed(3)}</span></div>
                      </div>
                    )}
                    {playerTrendAnalysis.recentForm.last30?.pitchingTrends && (
                      <div className="stat-row">
                        <div className="stat-item">ERA: <span>{playerTrendAnalysis.recentForm.last30.pitchingTrends.era.toFixed(2)}</span></div>
                        <div className="stat-item">WHIP: <span>{playerTrendAnalysis.recentForm.last30.pitchingTrends.whip.toFixed(2)}</span></div>
                        <div className="stat-item">K: <span>{playerTrendAnalysis.recentForm.last30.pitchingTrends.strikeouts}</span></div>
                      </div>
                    )}
                  </div>
                  
                  <div className="timeframe">
                    <h5>Season</h5>
                    {playerTrendAnalysis.recentForm.season?.battingTrends && (
                      <div className="stat-row">
                        <div className="stat-item">AVG: <span>{playerTrendAnalysis.recentForm.season.battingTrends.avg.toFixed(3)}</span></div>
                        <div className="stat-item">HR: <span>{playerTrendAnalysis.recentForm.season.battingTrends.homeRuns}</span></div>
                        <div className="stat-item">OPS: <span>{playerTrendAnalysis.recentForm.season.battingTrends.ops.toFixed(3)}</span></div>
                      </div>
                    )}
                    {playerTrendAnalysis.recentForm.season?.pitchingTrends && (
                      <div className="stat-row">
                        <div className="stat-item">ERA: <span>{playerTrendAnalysis.recentForm.season.pitchingTrends.era.toFixed(2)}</span></div>
                        <div className="stat-item">WHIP: <span>{playerTrendAnalysis.recentForm.season.pitchingTrends.whip.toFixed(2)}</span></div>
                        <div className="stat-item">K: <span>{playerTrendAnalysis.recentForm.season.pitchingTrends.strikeouts}</span></div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="trend-section">
            <h4>Performance Trends</h4>
            {playerTrendAnalysis.trends?.batting && (
              <div className="trend-performance">
                <h5>Batting</h5>
                <div className="trend-metrics">
                  {Object.entries(playerTrendAnalysis.trends.batting).map(([metric, data]: [string, any]) => (
                    <div key={metric} className="trend-metric">
                      <div className="metric-name">{metric}</div>
                      <div className={`trend-indicator ${data.trend}`}>
                        {data.trend === 'up' ? '▲' : data.trend === 'down' ? '▼' : '►'}
                      </div>
                      <div className="metric-value">{typeof data.recent === 'number' ? data.recent.toFixed(3) : data.recent}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {playerTrendAnalysis.trends?.pitching && (
              <div className="trend-performance">
                <h5>Pitching</h5>
                <div className="trend-metrics">
                  {Object.entries(playerTrendAnalysis.trends.pitching).map(([metric, data]: [string, any]) => (
                    <div key={metric} className="trend-metric">
                      <div className="metric-name">{metric}</div>
                      <div className={`trend-indicator ${data.trend}`}>
                        {/* For ERA and WHIP, down is good */}
                        {metric === 'era' || metric === 'whip'
                          ? (data.trend === 'down' ? '▲' : data.trend === 'up' ? '▼' : '►')
                          : (data.trend === 'up' ? '▲' : data.trend === 'down' ? '▼' : '►')}
                      </div>
                      <div className="metric-value">{typeof data.recent === 'number' ? data.recent.toFixed(2) : data.recent}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {playerTrendAnalysis.hotZones && (
            <div className="trend-section">
              <h4>Hot Zones</h4>
              <div className="hot-zone-grid">
                {playerTrendAnalysis.hotZones.zones.map((row: number[], i: number) => (
                  <div key={`row-${i}`} className="zone-row">
                    {row.map((value: number, j: number) => (
                      <div 
                        key={`zone-${i}-${j}`}
                        className="zone-cell"
                        style={{
                          backgroundColor: `rgba(255, 0, 0, ${value})`
                        }}
                        title={`Batting average: ${value.toFixed(3)}`}
                      ></div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="zone-info">
                <div className="zone-highlight">Strongest: {playerTrendAnalysis.hotZones.strongestZone}</div>
                <div className="zone-highlight">Weakest: {playerTrendAnalysis.hotZones.weakestZone}</div>
              </div>
            </div>
          )}
          
          <div className="trend-update-time">
            Last updated: {new Date(playerTrendAnalysis.lastUpdated).toLocaleString()}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="page-content">
      <Helmet>
        <title>MLB Statcast | Trends</title>
      </Helmet>
      <h1>MLB Trends</h1>
      
      {loading && <Loading message="Loading trend data..." />}
      {error && <ErrorMessage message={error} onRetry={() => setSelectedStat(selectedStat)} />}
      
      {!loading && !error && (
        <div className="trends-container animate-fade-in">
          <div className="trend-controls">
            <div className="trend-selector">
              <h3>Select Statistic:</h3>
              <div className="stat-buttons">
                {STAT_CATEGORIES.map((stat) => (
                  <button 
                    key={stat} 
                    className={selectedStat === stat ? 'active' : ''}
                    onClick={() => setSelectedStat(stat)}
                    style={{animationDelay: `${STAT_CATEGORIES.indexOf(stat) * 0.05}s`}}
                  >
                    {stat}
                  </button>
                ))}
              </div>
            </div>

            <div className="team-selector">
              <h3>Compare Teams:</h3>
              <div className="selector-controls">
                <select 
                  value={selectedTeam} 
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="team-dropdown"
                >
                  {MLB_TEAMS.map((team) => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
                <button 
                  className={`comparison-toggle ${comparisonMode ? 'active' : ''}`}
                  onClick={() => setComparisonMode(!comparisonMode)}
                  title="Toggle comparison mode"
                >
                  {comparisonMode ? '📊 Compare' : '📈 Single'}
                </button>
              </div>
            </div>

            <div className="period-selector">
              <h3>Time Period:</h3>
              <div className="period-buttons">
                {TIME_PERIODS.map((period) => (
                  <button 
                    key={period} 
                    className={selectedPeriod === period ? 'active' : ''}
                    onClick={() => setSelectedPeriod(period)}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>
        
        <div className="trend-visualization">
          {renderTrendChart()}
          
          <div className="trend-analysis">
            <h3>Analysis: {selectedStat}</h3>
            <div className="analysis-content">
              <p>
                {selectedTeam === 'All Teams' 
                  ? `League-wide trends for ${selectedStat} over the last ${selectedPeriod.toLowerCase()}.`
                  : `${selectedTeam} trends for ${selectedStat} compared to league average.`
                }
              </p>
              {comparisonMode && (
                <div className="comparison-insights">
                  <h4>Team vs League Comparison</h4>
                  <p>Compare how {selectedTeam} performs relative to the league average in {selectedStat}.</p>
                </div>
              )}
              <div className="trend-insights">
                <p>
                  {selectedStat === 'Batting Average' && 'Batting averages tend to improve during warmer months, peaking in mid-summer.'}
                  {selectedStat === 'Home Runs' && 'Home run rates typically increase with temperature and decrease as seasons progress.'}
                  {selectedStat === 'ERA' && 'Pitcher performance often improves as the season progresses and conditions stabilize.'}
                  {selectedStat === 'Exit Velocity' && 'Exit velocity correlates with offensive performance and weather conditions.'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="player-trend-section">
          {renderPlayerSearch()}
          
          {selectedPlayer && !playerTrendLoading && !playerTrendError && playerTrendAnalysis && (
            <div className="player-analysis-content">
              {renderPlayerTrendAnalysis()}
            </div>
          )}
          
          {playerTrendLoading && <Loading message={`Loading trend analysis for ${selectedPlayer?.name}...`} />}
          {playerTrendError && <ErrorMessage message={playerTrendError} />}
          
          {!selectedPlayer && (
            <div className="player-trend-placeholder">
              Search for a player above to see their detailed performance analysis
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default Trends;
