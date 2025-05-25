import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/Teams.css';
import Loading from '../components/Loading';
import ErrorMessage from '../components/Error';

interface Player {
  name: string;
  position: string;
  batting_avg?: string;
  hr?: string;
  rbi?: string;
}

const TEAMS = [
  { code: 'nyy', name: 'New York Yankees', division: 'AL East' },
  { code: 'bos', name: 'Boston Red Sox', division: 'AL East' },
  { code: 'tor', name: 'Toronto Blue Jays', division: 'AL East' },
  { code: 'bal', name: 'Baltimore Orioles', division: 'AL East' },
  { code: 'tb', name: 'Tampa Bay Rays', division: 'AL East' },
  { code: 'cle', name: 'Cleveland Guardians', division: 'AL Central' },
  { code: 'min', name: 'Minnesota Twins', division: 'AL Central' },
  { code: 'kc', name: 'Kansas City Royals', division: 'AL Central' },
  { code: 'det', name: 'Detroit Tigers', division: 'AL Central' },
  { code: 'cws', name: 'Chicago White Sox', division: 'AL Central' },
  { code: 'hou', name: 'Houston Astros', division: 'AL West' },
  { code: 'sea', name: 'Seattle Mariners', division: 'AL West' },
  { code: 'tex', name: 'Texas Rangers', division: 'AL West' },
  { code: 'la', name: 'Los Angeles Angels', division: 'AL West' },
  { code: 'oak', name: 'Oakland Athletics', division: 'AL West' },
  { code: 'atl', name: 'Atlanta Braves', division: 'NL East' },
  { code: 'phi', name: 'Philadelphia Phillies', division: 'NL East' },
  { code: 'nym', name: 'New York Mets', division: 'NL East' },
  { code: 'mia', name: 'Miami Marlins', division: 'NL East' },
  { code: 'wsh', name: 'Washington Nationals', division: 'NL East' },
  { code: 'mil', name: 'Milwaukee Brewers', division: 'NL Central' },
  { code: 'chc', name: 'Chicago Cubs', division: 'NL Central' },
  { code: 'stl', name: 'St. Louis Cardinals', division: 'NL Central' },
  { code: 'cin', name: 'Cincinnati Reds', division: 'NL Central' },
  { code: 'pit', name: 'Pittsburgh Pirates', division: 'NL Central' },
  { code: 'lad', name: 'Los Angeles Dodgers', division: 'NL West' },
  { code: 'sd', name: 'San Diego Padres', division: 'NL West' },
  { code: 'sf', name: 'San Francisco Giants', division: 'NL West' },
  { code: 'ari', name: 'Arizona Diamondbacks', division: 'NL West' },
  { code: 'col', name: 'Colorado Rockies', division: 'NL West' }
];

const Teams = () => {
  const [team, setTeam] = useState('nyy');
  const [players, setPlayers] = useState([] as Player[]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`http://localhost:3000/api/roster?team=${team}`)
      .then((res) => res.json())
      .then((data) => {
        setPlayers(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch roster.');
        setLoading(false);
      });
  }, [team]);

  // Group teams by division
  const teamsByDivision: Record<string, typeof TEAMS> = {};
  TEAMS.forEach(team => {
    if (!teamsByDivision[team.division]) {
      teamsByDivision[team.division] = [];
    }
    teamsByDivision[team.division].push(team);
  });

  return (
    <div className="page-content">
      <Helmet>
        <title>MLB Statcast | Teams</title>
      </Helmet>
      <h1>MLB Teams</h1>
      
      <div className="team-selector">
        <label>
          Select Team:
          <select value={team} onChange={e => setTeam(e.target.value)}>
            {TEAMS.map(t => (
              <option key={t.code} value={t.code}>{t.name}</option>
            ))}
          </select>
        </label>
      </div>
      
      <div className="team-content">
        {loading && <Loading message="Loading team data..." />}
        {error && <ErrorMessage message={error} onRetry={() => setTeam(team)} />}
        
        {!loading && !error && (
          <div className="team-roster">
            <h2>Team Roster</h2>
            <div className="table-responsive">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Position</th>
                    <th>Batting Avg</th>
                    <th>HR</th>
                    <th>RBI</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p: Player, i: number) => (
                    <tr key={i}>
                      <td>{p.name}</td>
                      <td>{p.position}</td>
                      <td>{p.batting_avg || '.000'}</td>
                      <td>{p.hr || '0'}</td>
                      <td>{p.rbi || '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="team-divisions">
          <h2>MLB Divisions</h2>
          
          {Object.entries(teamsByDivision).map(([division, teams]) => (
            <div key={division} className="division-section">
              <h3>{division}</h3>
              <ul className="team-list">
                {teams.map(t => (
                  <li key={t.code} onClick={() => setTeam(t.code)} className={team === t.code ? 'active' : ''}>
                    {t.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Teams;
