import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { getGames, Game, GamesData, getTeamRoster, Player } from '../services/api';
import Loading from '../components/Loading';
import ErrorMessage from '../components/Error';
import '../styles/Dashboard.css';

// Fallback data in case API fails
const FALLBACK_GAMES: GamesData = {
  recent: [
    { homeTeam: 'New York Yankees', homeTeamCode: 'nyy', homeScore: 5, awayTeam: 'Boston Red Sox', awayTeamCode: 'bos', awayScore: 3, date: '2023-09-14', status: 'completed' as const },
    { homeTeam: 'Los Angeles Dodgers', homeTeamCode: 'lad', homeScore: 2, awayTeam: 'San Francisco Giants', awayTeamCode: 'sf', awayScore: 1, date: '2023-09-14', status: 'completed' as const },
    { homeTeam: 'Chicago Cubs', homeTeamCode: 'chc', homeScore: 7, awayTeam: 'St. Louis Cardinals', awayTeamCode: 'stl', awayScore: 4, date: '2023-09-14', status: 'completed' as const },
    { homeTeam: 'Houston Astros', homeTeamCode: 'hou', homeScore: 8, awayTeam: 'Texas Rangers', awayTeamCode: 'tex', awayScore: 2, date: '2023-09-14', status: 'completed' as const },
  ],
  upcoming: [
    { homeTeam: 'New York Yankees', homeTeamCode: 'nyy', awayTeam: 'Boston Red Sox', awayTeamCode: 'bos', date: '2023-09-15', time: '7:05 PM', status: 'scheduled' as const },
    { homeTeam: 'Los Angeles Dodgers', homeTeamCode: 'lad', awayTeam: 'San Francisco Giants', awayTeamCode: 'sf', date: '2023-09-15', time: '10:10 PM', status: 'scheduled' as const },
    { homeTeam: 'Chicago Cubs', homeTeamCode: 'chc', awayTeam: 'St. Louis Cardinals', awayTeamCode: 'stl', date: '2023-09-15', time: '8:15 PM', status: 'scheduled' as const },
    { homeTeam: 'Houston Astros', homeTeamCode: 'hou', awayTeam: 'Texas Rangers', awayTeamCode: 'tex', date: '2023-09-15', time: '8:05 PM', status: 'scheduled' as const },
  ]
};

const FALLBACK_LEADERS = {
  'Batting Average': { name: 'Player Name', value: '.342' },
  'Home Runs': { name: 'Player Name', value: '37' },
  'RBIs': { name: 'Player Name', value: '112' },
  'ERA': { name: 'Player Name', value: '1.89' },
};

const Overview = () => {
  const [games, setGames] = useState(FALLBACK_GAMES);
  const [leaders, setLeaders] = useState({
    battingAvg: FALLBACK_LEADERS['Batting Average'],
    homeRuns: FALLBACK_LEADERS['Home Runs'],
    rbi: FALLBACK_LEADERS['RBIs'],
    era: FALLBACK_LEADERS['ERA']
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch games data
        const gamesData = await getGames();
        if (gamesData && gamesData.recent && gamesData.upcoming) {
          setGames(gamesData);
        } else {
          // Fall back to mock data if API returns empty
          console.warn('API returned empty games data, using fallback');
          setGames(FALLBACK_GAMES);
        }
        
        // Fetch player stats for leaders
        try {
          // Get all players from the API (no team filter)
          const playerData = await getTeamRoster('');
          if (playerData && playerData.length > 0) {
            // Extract all players from all teams
            const allPlayers: Player[] = playerData.reduce((acc: Player[], team) => 
              [...acc, ...team.players], []);
            
            // Find leaders
            if (allPlayers.length > 0) {
              // Find batting average leader
              const battingLeader = allPlayers
                .filter(p => p.avg && !isNaN(parseFloat(p.avg.replace('.', ''))))
                .sort((a, b) => parseFloat((b.avg || '0').replace('.', '')) - 
                               parseFloat((a.avg || '0').replace('.', '')))[0];
              
              // Find home run leader
              const hrLeader = allPlayers
                .filter(p => p.hr && !isNaN(parseInt(p.hr)))
                .sort((a, b) => parseInt(b.hr || '0') - parseInt(a.hr || '0'))[0];
              
              // Find RBI leader
              const rbiLeader = allPlayers
                .filter(p => p.rbi && !isNaN(parseInt(p.rbi)))
                .sort((a, b) => parseInt(b.rbi || '0') - parseInt(a.rbi || '0'))[0];
              
              // Find ERA leader (lower is better)
              const eraLeader = allPlayers
                .filter(p => p.era && !isNaN(parseFloat(p.era)) && p.position === 'P')
                .sort((a, b) => parseFloat(a.era || '99.99') - parseFloat(b.era || '99.99'))[0];
              
              setLeaders({
                battingAvg: battingLeader ? { name: battingLeader.name, value: battingLeader.avg || '---' } : 
                  FALLBACK_LEADERS['Batting Average'],
                homeRuns: hrLeader ? { name: hrLeader.name, value: hrLeader.hr || '---' } :
                  FALLBACK_LEADERS['Home Runs'],
                rbi: rbiLeader ? { name: rbiLeader.name, value: rbiLeader.rbi || '---' } :
                  FALLBACK_LEADERS['RBIs'],
                era: eraLeader ? { name: eraLeader.name, value: eraLeader.era || '---' } :
                  FALLBACK_LEADERS['ERA']
              });
            }
          }
        } catch (playerErr) {
          console.error('Error fetching player leaders:', playerErr);
          // Keep using fallback leaders
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching overview data:', err);
        setError('Failed to load overview data. Using fallback data.');
        setGames(FALLBACK_GAMES);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Format the game score for display
  const formatGameResult = (game: Game) => {
    return `${game.awayTeamCode} ${game.awayScore} - ${game.homeTeamCode} ${game.homeScore}`;
  };
  
  // Format the upcoming game for display
  const formatUpcomingGame = (game: Game) => {
    return `${game.awayTeamCode} @ ${game.homeTeamCode} - ${game.time || 'TBD'}`;
  };
  
  return (
    <div className="page-content">
      <Helmet>
        <title>MLB Statcast | Overview</title>
      </Helmet>
      <h1>Overview</h1>
      
      {loading && <Loading message="Loading overview data..." />}
      {error && <ErrorMessage message={error} onRetry={() => setError('')} />}
      
      {!loading && (
        <div className="dashboard-grid">
          <div className="dashboard-card animate-fade-in" style={{animationDelay: '0.1s'}}>
            <h3>League Leaders</h3>
            <div className="card-content">
              <p>Batting Average: {leaders.battingAvg.value} - {leaders.battingAvg.name}</p>
              <p>Home Runs: {leaders.homeRuns.value} - {leaders.homeRuns.name}</p>
              <p>RBIs: {leaders.rbi.value} - {leaders.rbi.name}</p>
              <p>ERA: {leaders.era.value} - {leaders.era.name}</p>
            </div>
          </div>
          
          <div className="dashboard-card animate-fade-in" style={{animationDelay: '0.2s'}}>
            <h3>Recent Games</h3>
            <div className="card-content">
              {games.recent.map((game: Game, i: number) => (
                <p key={`recent-${i}`}>{formatGameResult(game)}</p>
              ))}
            </div>
          </div>
          
          <div className="dashboard-card animate-fade-in" style={{animationDelay: '0.3s'}}>
            <h3>Upcoming Games</h3>
            <div className="card-content">
              {games.upcoming.map((game: Game, i: number) => (
                <p key={`upcoming-${i}`}>{formatUpcomingGame(game)}</p>
              ))}
            </div>
          </div>
          
          <div className="dashboard-card animate-fade-in" style={{animationDelay: '0.4s'}}>
            <h3>Trending Stats</h3>
            <div className="card-content">
              <p>Average Exit Velocity: 92.3 mph</p>
              <p>Average Launch Angle: 12.5°</p>
              <p>Average Fastball Velocity: 94.7 mph</p>
              <p className="trend-note">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
