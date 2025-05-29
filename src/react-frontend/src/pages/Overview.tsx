import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { getGames, Game, GamesData, getTrends } from '../services/api';
import Loading from '../components/Loading';
import ErrorMessage from '../components/Error';
import WidgetCustomizer from '../components/WidgetCustomizer';
import '../styles/Dashboard.css';

// League leaders data with zeros instead of mock data
const LEAGUE_LEADERS = {
  AL: {
    battingAvg: { name: 'No Data', team: '---', value: '.000' },
    homeRuns: { name: 'No Data', team: '---', value: '0' },
    rbi: { name: 'No Data', team: '---', value: '0' },
    era: { name: 'No Data', team: '---', value: '0.00' },
    strikeouts: { name: 'No Data', team: '---', value: '0' },
    steals: { name: 'No Data', team: '---', value: '0' }
  },
  NL: {
    battingAvg: { name: 'No Data', team: '---', value: '.000' },
    homeRuns: { name: 'No Data', team: '---', value: '0' },
    rbi: { name: 'No Data', team: '---', value: '0' },
    era: { name: 'No Data', team: '---', value: '0.00' },
    strikeouts: { name: 'No Data', team: '---', value: '0' },
    steals: { name: 'No Data', team: '---', value: '0' }
  }
};

// Widget configuration for future customization
interface WidgetConfig {
  id: string;
  title: string;
  type: 'games' | 'leaders' | 'trends' | 'standings' | 'news';
  size: 'small' | 'medium' | 'large';
  position: number;
  enabled: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'recent-games', title: 'Recent Games', type: 'games', size: 'medium', position: 1, enabled: true },
  { id: 'upcoming-games', title: 'Upcoming Games', type: 'games', size: 'medium', position: 2, enabled: true },
  { id: 'league-leaders', title: 'League Leaders', type: 'leaders', size: 'medium', position: 3, enabled: true },
  { id: 'trending-stats', title: 'League Trends', type: 'trends', size: 'large', position: 4, enabled: true },
  { id: 'hot-teams', title: 'Hot Teams', type: 'standings', size: 'small', position: 5, enabled: true }
];

// Define the proper type for trends
interface TrendsState {
  battingAverage?: number[];
  era?: number[];
}

const Overview = () => {
  const [games, setGames] = useState({ recent: [], upcoming: [] });
  const [trends, setTrends] = useState<TrendsState>({});
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeLeague, setActiveLeague] = useState<'AL' | 'NL'>('AL');
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch games data
        const [gamesData, battingTrends, eraTrends] = await Promise.all([
          getGames(),
          getTrends('Batting Average'),
          getTrends('ERA')
        ]);
        
        if (gamesData?.recent && gamesData?.upcoming) {
          setGames(gamesData);
        }
        
        setTrends({
          battingAverage: battingTrends?.['Batting Average'] || [],
          era: eraTrends?.['ERA'] || []
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching overview data:', err);
        setError('Failed to load some data. Some widgets may show cached information.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const toggleWidgetSize = (widgetId: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, size: widget.size === 'medium' ? 'large' : 'medium' as 'medium' | 'large' }
        : widget
    ));
  };

  const renderGameWidget = (widgetId: string, title: string) => {
    const isRecent = widgetId.includes('recent');
    const gamesList = isRecent ? games.recent : games.upcoming;
    const maxGames = editMode ? 8 : 4; // Show more games in edit mode
    
    return (
      <div className={`widget-card medium ${editMode ? 'edit-mode' : ''}`}>
        <div className="widget-header">
          <h3>{title}</h3>
          <span className="widget-count">{gamesList.length}</span>
          {editMode && (
            <div className="widget-resize-controls">
              <button 
                className="resize-btn"
                onClick={() => toggleWidgetSize(widgetId)}
                title="Resize widget"
              >
                ⤢
              </button>
            </div>
          )}
        </div>
        <div className="widget-content">
          {gamesList.length > 0 ? (
            gamesList.slice(0, maxGames).map((game: Game, i: number) => (
              <div key={`${widgetId}-${i}`} className="game-item">
                <div className="game-teams">
                  <span className="away-team">{game.awayTeamCode.toUpperCase()}</span>
                  <span className="vs">@</span>
                  <span className="home-team">{game.homeTeamCode.toUpperCase()}</span>
                </div>
                <div className="game-details">
                  {isRecent ? (
                    <span className="score">{game.awayScore}-{game.homeScore}</span>
                  ) : (
                    <span className="time">{game.time || 'TBD'}</span>
                  )}
                  <span className={`status ${game.status}`}>{game.status}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">No games available</div>
          )}
        </div>
      </div>
    );
  };

  const renderLeadersWidget = (league: 'AL' | 'NL') => {
    const leaders = LEAGUE_LEADERS[league];
    const isActiveLeague = league === activeLeague;
    
    return (
      <div className="widget-card medium">
        <div className="widget-header">
          <h3>League Leaders</h3>
          <div className="league-toggle">
            <button 
              className={activeLeague === 'AL' ? 'active' : ''}
              onClick={() => setActiveLeague('AL')}
            >
              AL
            </button>
            <button 
              className={activeLeague === 'NL' ? 'active' : ''}
              onClick={() => setActiveLeague('NL')}
            >
              NL
            </button>
          </div>
        </div>
        {isActiveLeague && (
          <div className="widget-content">
            <div className="leader-stat">
              <span className="stat-label">AVG</span>
              <span className="stat-value">{leaders.battingAvg.value}</span>
              <div className="player-info">
                <span className="player-name">{leaders.battingAvg.name}</span>
                <span className="team-code">{leaders.battingAvg.team}</span>
              </div>
            </div>
            <div className="leader-stat">
              <span className="stat-label">HR</span>
              <span className="stat-value">{leaders.homeRuns.value}</span>
              <div className="player-info">
                <span className="player-name">{leaders.homeRuns.name}</span>
                <span className="team-code">{leaders.homeRuns.team}</span>
              </div>
            </div>
            <div className="leader-stat">
              <span className="stat-label">RBI</span>
              <span className="stat-value">{leaders.rbi.value}</span>
              <div className="player-info">
                <span className="player-name">{leaders.rbi.name}</span>
                <span className="team-code">{leaders.rbi.team}</span>
              </div>
            </div>
            <div className="leader-stat">
              <span className="stat-label">ERA</span>
              <span className="stat-value">{leaders.era.value}</span>
              <div className="player-info">
                <span className="player-name">{leaders.era.name}</span>
                <span className="team-code">{leaders.era.team}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTrendsWidget = () => {
    return (
      <div className="widget-card large">
        <div className="widget-header">
          <h3>League Trends</h3>
          <span className="trend-period">Last 7 days</span>
        </div>
        <div className="widget-content">
          <div className="trends-grid">
            <div className="trend-item">
              <h4>League Batting Average</h4>
              <div className="trend-value">.264</div>
              <div className="trend-change positive">↑ 0.003</div>
              <div className="mini-chart">
                {trends.battingAverage?.slice(-7).map((value: number, i: number) => (
                  <div key={i} className="chart-bar" style={{height: `${value * 300}%`}}></div>
                )) || Array(7).fill(0).map((_, i) => (
                  <div key={i} className="chart-bar" style={{height: '20%'}}></div>
                ))}
              </div>
            </div>
            <div className="trend-item">
              <h4>League ERA</h4>
              <div className="trend-value">4.12</div>
              <div className="trend-change negative">↓ 0.08</div>
              <div className="mini-chart">
                {trends.era?.slice(-7).map((value: number, i: number) => (
                  <div key={i} className="chart-bar" style={{height: `${(6-value) * 20}%`}}></div>
                )) || Array(7).fill(0).map((_, i) => (
                  <div key={i} className="chart-bar" style={{height: '20%'}}></div>
                ))}
              </div>
            </div>
            <div className="trend-item">
              <h4>Home Runs/Game</h4>
              <div className="trend-value">2.31</div>
              <div className="trend-change positive">↑ 0.12</div>
            </div>
            <div className="trend-item">
              <h4>Strikeouts/Game</h4>
              <div className="trend-value">8.94</div>
              <div className="trend-change negative">↓ 0.24</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHotTeamsWidget = () => {
    // Mock hot teams data until standings API is implemented
    const hotTeams = [
      { name: 'LAD', record: '84-54', streak: 'W7', trend: '+12' },
      { name: 'BAL', record: '82-56', streak: 'W5', trend: '+9' },
      { name: 'HOU', record: '81-57', streak: 'W3', trend: '+7' },
      { name: 'ATL', record: '80-58', streak: 'W4', trend: '+6' },
      { name: 'NYY', record: '79-59', streak: 'L2', trend: '+5' }
    ];

    return (
      <div className="widget-card small">
        <div className="widget-header">
          <h3>Hot Teams</h3>
          <span className="trend-period">Last 10 games</span>
        </div>
        <div className="widget-content">
          {hotTeams.map((team, i) => (
            <div key={team.name} className="hot-team-item">
              <div className="team-rank">#{i + 1}</div>
              <div className="team-details">
                <span className="team-name">{team.name}</span>
                <span className="team-record">{team.record}</span>
              </div>
              <div className="team-stats">
                <span className={`streak ${team.streak.startsWith('W') ? 'win' : 'loss'}`}>
                  {team.streak}
                </span>
                <span className="trend-indicator">{team.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const enabledWidgets = widgets.filter((w: WidgetConfig) => w.enabled).sort((a: WidgetConfig, b: WidgetConfig) => a.position - b.position);

  const handleWidgetSave = (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    // Save to localStorage for persistence
    localStorage.setItem('dashboardWidgets', JSON.stringify(newWidgets));
  };

  // Load saved widget configuration on mount
  useEffect(() => {
    const savedWidgets = localStorage.getItem('dashboardWidgets');
    if (savedWidgets) {
      try {
        const parsedWidgets = JSON.parse(savedWidgets);
        setWidgets(parsedWidgets);
      } catch (err) {
        console.error('Failed to parse saved widgets:', err);
      }
    }
  }, []);

  return (
    <div className="page-content">
      <Helmet>
        <title>MLB Statcast | Overview</title>
      </Helmet>
      
      <div className="page-header">
        <h1>Overview</h1>
        <div className="header-actions">
          <button 
            className={`customize-btn ${editMode ? 'active' : ''}`}
            title="Toggle Edit Mode"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? '✓ Save' : '✏️ Edit'}
          </button>
          <button 
            className="customize-btn" 
            title="Customize Dashboard"
            onClick={() => setShowCustomizer(true)}
          >
            ⚙️ Customize
          </button>
          <span className="last-updated">
            Updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
      
      {loading && <Loading message="Loading dashboard..." />}
      {error && <ErrorMessage message={error} onRetry={() => setError('')} />}
      
      {!loading && (
        <div className="dashboard-container">              {enabledWidgets.map((widget: WidgetConfig, index: number) => {
                const animationDelay = (index * 0.1).toFixed(1);
                
                return (
                  <div 
                    key={widget.id} 
                    className="widget-wrapper animate-fade-in"
                    style={{animationDelay: `${animationDelay}s`}}
                  >
                    {widget.type === 'games' && renderGameWidget(widget.id, widget.title)}
                    {widget.type === 'leaders' && renderLeadersWidget(activeLeague)}
                    {widget.type === 'trends' && renderTrendsWidget()}
                    {widget.type === 'standings' && renderHotTeamsWidget()}
                  </div>
                );
              })}
        </div>
      )}
      
      {showCustomizer && (
        <WidgetCustomizer
          widgets={widgets}
          onSave={handleWidgetSave}
          onClose={() => setShowCustomizer(false)}
        />
      )}
    </div>
  );
};

export default Overview;
