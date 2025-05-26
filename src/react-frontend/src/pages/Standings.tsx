// filepath: /Users/coletrammell/Documents/GitHub/The Cycle/src/react-frontend/src/pages/Standings.tsx
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { getStandings, Division, TeamStanding } from '../services/api';
import Loading from '../components/Loading';
import ErrorMessage from '../components/Error';
import '../styles/Standings.css';

// Fallback data in case API fails
const FALLBACK_STANDINGS: Division[] = [
  {
    division: 'AL East',
    teams: [
      { team: 'New York Yankees', wins: 92, losses: 70, pct: '.568', gb: '-' },
      { team: 'Baltimore Orioles', wins: 89, losses: 73, pct: '.549', gb: '3.0' },
      { team: 'Boston Red Sox', wins: 87, losses: 75, pct: '.537', gb: '5.0' },
      { team: 'Toronto Blue Jays', wins: 85, losses: 77, pct: '.525', gb: '7.0' },
      { team: 'Tampa Bay Rays', wins: 80, losses: 82, pct: '.494', gb: '12.0' }
    ]
  },
  {
    division: 'AL Central',
    teams: [
      { team: 'Cleveland Guardians', wins: 95, losses: 67, pct: '.586', gb: '-' },
      { team: 'Minnesota Twins', wins: 87, losses: 75, pct: '.537', gb: '8.0' },
      { team: 'Kansas City Royals', wins: 76, losses: 86, pct: '.469', gb: '19.0' },
      { team: 'Detroit Tigers', wins: 75, losses: 87, pct: '.463', gb: '20.0' },
      { team: 'Chicago White Sox', wins: 65, losses: 97, pct: '.401', gb: '30.0' }
    ]
  },
  {
    division: 'AL West',
    teams: [
      { team: 'Houston Astros', wins: 90, losses: 72, pct: '.556', gb: '-' },
      { team: 'Seattle Mariners', wins: 88, losses: 74, pct: '.543', gb: '2.0' },
      { team: 'Texas Rangers', wins: 86, losses: 76, pct: '.531', gb: '4.0' },
      { team: 'Los Angeles Angels', wins: 73, losses: 89, pct: '.451', gb: '17.0' },
      { team: 'Oakland Athletics', wins: 66, losses: 96, pct: '.407', gb: '24.0' }
    ]
  },
  {
    division: 'NL East',
    teams: [
      { team: 'Atlanta Braves', wins: 96, losses: 66, pct: '.593', gb: '-' },
      { team: 'Philadelphia Phillies', wins: 90, losses: 72, pct: '.556', gb: '6.0' },
      { team: 'New York Mets', wins: 84, losses: 78, pct: '.519', gb: '12.0' },
      { team: 'Miami Marlins', wins: 71, losses: 91, pct: '.438', gb: '25.0' },
      { team: 'Washington Nationals', wins: 65, losses: 97, pct: '.401', gb: '31.0' }
    ]
  },
  {
    division: 'NL Central',
    teams: [
      { team: 'Milwaukee Brewers', wins: 93, losses: 69, pct: '.574', gb: '-' },
      { team: 'Chicago Cubs', wins: 83, losses: 79, pct: '.512', gb: '10.0' },
      { team: 'St. Louis Cardinals', wins: 81, losses: 81, pct: '.500', gb: '12.0' },
      { team: 'Cincinnati Reds', wins: 78, losses: 84, pct: '.481', gb: '15.0' },
      { team: 'Pittsburgh Pirates', wins: 74, losses: 88, pct: '.457', gb: '19.0' }
    ]
  },
  {
    division: 'NL West',
    teams: [
      { team: 'Los Angeles Dodgers', wins: 98, losses: 64, pct: '.605', gb: '-' },
      { team: 'San Diego Padres', wins: 89, losses: 73, pct: '.549', gb: '9.0' },
      { team: 'Arizona Diamondbacks', wins: 84, losses: 78, pct: '.519', gb: '14.0' },
      { team: 'San Francisco Giants', wins: 79, losses: 83, pct: '.488', gb: '19.0' },
      { team: 'Colorado Rockies', wins: 65, losses: 97, pct: '.401', gb: '33.0' }
    ]
  }
];

const Standings = () => {
  const [standings, setStandings] = useState([] as Division[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeLeague, setActiveLeague] = useState('all');

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true);
        const data = await getStandings();
        if (data && data.length > 0) {
          setStandings(data);
        } else {
          // Fall back to mock data if API returns empty
          console.warn('API returned empty standings data, using fallback');
          setStandings(FALLBACK_STANDINGS);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching standings:', err);
        setError('Failed to load standings data. Using fallback data.');
        setStandings(FALLBACK_STANDINGS);
        setLoading(false);
      }
    };

    fetchStandings();
  }, []);

  const filteredStandings = activeLeague === 'all' 
    ? standings
    : standings.filter((division: Division) => division.division.startsWith(activeLeague));

  return (
    <div className="page-content">
      <Helmet>
        <title>MLB Statcast | Standings</title>
      </Helmet>
      <h1>MLB Standings</h1>
      
      <div className="standings-controls">
        <button 
          className={activeLeague === 'all' ? 'active' : ''} 
          onClick={() => setActiveLeague('all')}>
          All
        </button>
        <button 
          className={activeLeague === 'AL' ? 'active' : ''} 
          onClick={() => setActiveLeague('AL')}>
          American League
        </button>
        <button 
          className={activeLeague === 'NL' ? 'active' : ''} 
          onClick={() => setActiveLeague('NL')}>
          National League
        </button>
      </div>
      
      {loading && <Loading message="Loading standings..." />}
      {error && <ErrorMessage message={error} onRetry={() => setError('')} />}
      
      {!loading && filteredStandings.map((division: Division, idx: number) => (
        <div className="standings-division animate-fade-in" 
          key={division.division}
          style={{animationDelay: `${idx * 0.1}s`}}
        >
          <h2>{division.division}</h2>
          <div className="table-responsive">
            <table className="standings-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>W</th>
                  <th>L</th>
                  <th>PCT</th>
                  <th>GB</th>
                  {division.teams[0].last10 && <th>L10</th>}
                  {division.teams[0].streak && <th>Streak</th>}
                </tr>
              </thead>
              <tbody>
                {division.teams.map((team: TeamStanding) => (
                  <tr key={team.team}>
                    <td className="team-name">{team.team}</td>
                    <td>{team.wins}</td>
                    <td>{team.losses}</td>
                    <td>{team.pct}</td>
                    <td>{team.gb}</td>
                    {team.last10 && <td>{team.last10}</td>}
                    {team.streak && <td>{team.streak}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Standings;
