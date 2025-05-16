import { useEffect, useState } from 'react';
import './App.css';

const ALL_TEAMS = Object.entries({
  ari: 'Arizona Diamondbacks', atl: 'Atlanta Braves', bal: 'Baltimore Orioles', bos: 'Boston Red Sox', chc: 'Chicago Cubs', cin: 'Cincinnati Reds', cle: 'Cleveland Guardians', col: 'Colorado Rockies', det: 'Detroit Tigers', hou: 'Houston Astros', kc: 'Kansas City Royals', ana: 'Los Angeles Angels', laa: 'Los Angeles Angels', lad: 'Los Angeles Dodgers', mia: 'Miami Marlins', mil: 'Milwaukee Brewers', min: 'Minnesota Twins', nym: 'New York Mets', nyy: 'New York Yankees', oak: 'Oakland Athletics', phi: 'Philadelphia Phillies', pit: 'Pittsburgh Pirates', sd: 'San Diego Padres', sea: 'Seattle Mariners', sf: 'San Francisco Giants', stl: 'St. Louis Cardinals', tb: 'Tampa Bay Rays', tex: 'Texas Rangers', tor: 'Toronto Blue Jays', was: 'Washington Nationals', wsh: 'Washington Nationals'
}).map(([code, name]) => ({ code, name }));

const TEAM_LOGOS: Record<string, string> = {
  ari: 'https://upload.wikimedia.org/wikipedia/en/8/89/Arizona_Diamondbacks_logo.svg',
  atl: 'https://upload.wikimedia.org/wikipedia/en/6/6e/Atlanta_Braves.svg',
  bal: 'https://upload.wikimedia.org/wikipedia/en/7/75/Baltimore_Orioles_cap.svg',
  bos: 'https://upload.wikimedia.org/wikipedia/en/6/6d/RedSoxPrimary_HangingSocks.svg',
  chc: 'https://upload.wikimedia.org/wikipedia/commons/8/80/Chicago_Cubs_logo.svg',
  cin: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Cincinnati_Reds_Logo.svg',
  cle: 'https://upload.wikimedia.org/wikipedia/en/4/4f/Cleveland_Guardians_logo.svg',
  col: 'https://upload.wikimedia.org/wikipedia/en/4/45/Colorado_Rockies_logo.svg',
  det: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Detroit_Tigers_logo.svg',
  hou: 'https://upload.wikimedia.org/wikipedia/en/6/6b/Houston_Astros_logo.svg',
  kc: 'https://upload.wikimedia.org/wikipedia/en/7/7b/Kansas_City_Royals.svg',
  ana: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Los_Angeles_Angels_logo.svg',
  laa: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Los_Angeles_Angels_logo.svg',
  lad: 'https://upload.wikimedia.org/wikipedia/en/0/0e/Los_Angeles_Dodgers_logo.svg',
  mia: 'https://upload.wikimedia.org/wikipedia/en/f/fd/Miami_Marlins_logo.svg',
  mil: 'https://upload.wikimedia.org/wikipedia/en/1/11/Milwaukee_Brewers_logo.svg',
  min: 'https://upload.wikimedia.org/wikipedia/en/3/36/Minnesota_Twins_logo.svg',
  nym: 'https://upload.wikimedia.org/wikipedia/en/7/7b/New_York_Mets.svg',
  nyy: 'https://upload.wikimedia.org/wikipedia/commons/2/25/New_York_Yankees_Primary_Logo.svg',
  oak: 'https://upload.wikimedia.org/wikipedia/en/6/6d/Oakland_A%27s_logo.svg',
  phi: 'https://upload.wikimedia.org/wikipedia/en/6/6d/Philadelphia_Phillies_%282019%29_logo.svg',
  pit: 'https://upload.wikimedia.org/wikipedia/en/6/6d/Pittsburgh_Pirates_logo.svg',
  sd: 'https://upload.wikimedia.org/wikipedia/en/8/81/San_Diego_Padres_logo.svg',
  sea: 'https://upload.wikimedia.org/wikipedia/en/8/8d/Seattle_Mariners_logo.svg',
  sf: 'https://upload.wikimedia.org/wikipedia/en/5/58/San_Francisco_Giants_Logo.svg',
  stl: 'https://upload.wikimedia.org/wikipedia/en/6/6d/St._Louis_Cardinals_logo.svg',
  tb: 'https://upload.wikimedia.org/wikipedia/en/f/f5/Tampa_Bay_Rays.svg',
  tex: 'https://upload.wikimedia.org/wikipedia/en/4/41/Texas_Rangers.svg',
  tor: 'https://upload.wikimedia.org/wikipedia/en/6/6e/Toronto_Blue_Jays_logo.svg',
  was: 'https://upload.wikimedia.org/wikipedia/en/9/9c/Washington_Nationals_logo.svg',
  wsh: 'https://upload.wikimedia.org/wikipedia/en/9/9c/Washington_Nationals_logo.svg',
};

function App() {
  const [team, setTeam] = useState('nyy');
  const [players, setPlayers] = useState<any[]>([]);
  const [statHeaders, setStatHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filteredTeams, setFilteredTeams] = useState(ALL_TEAMS);

  useEffect(() => {
    setFilteredTeams(
      ALL_TEAMS.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/roster?team=${team}`)
      .then((res) => {
        if (!res.ok) throw new Error('API error');
        return res.json();
      })
      .then((data) => {
        setPlayers(data.players || []);
        setStatHeaders(data.statHeaders || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch roster.');
        setLoading(false);
      });
  }, [team]);

  // Show all stat columns, no filtering
  return (
    <div className="App">
      <h1>MLB Team Roster & Stats</h1>
      <label>
        Search Team:
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Type team name or code..."
          style={{ marginLeft: 8 }}
        />
      </label>
      <div style={{ margin: '10px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
        {filteredTeams.map(t => (
          <button
            key={t.code}
            onClick={() => setTeam(t.code)}
            style={{
              margin: 2,
              background: t.code === team ? '#1976d2' : '#222',
              color: t.code === team ? '#00ff00' : '#00ff00',
              border: '1px solid #444',
              borderRadius: 4,
              padding: '4px 10px',
              cursor: 'pointer',
              fontWeight: t.code === team ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <img src={TEAM_LOGOS[t.code]} alt={t.name + ' logo'} style={{ width: 24, height: 24, background: '#fff', borderRadius: 4, marginRight: 4 }} />
            {t.name}
          </button>
        ))}
      </div>
      {loading && <p>Loading...</p>}
      {error && <p style={{color: 'red'}}>{error}</p>}
      <table style={{ width: '100%', background: '#111', color: '#00ff00', borderCollapse: 'collapse', fontFamily: 'monospace' }}>
        <thead>
          <tr>
            <th style={{ background: '#222', color: '#00ff00', border: '1px solid #333' }}>Name</th>
            <th style={{ background: '#222', color: '#00ff00', border: '1px solid #333' }}>Season</th>
            {statHeaders.map((header, i) => (
              <th key={i} style={{ background: '#222', color: '#00ff00', border: '1px solid #333' }}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#181818' : '#222' }}>
              <td style={{ border: '1px solid #333', color: '#00ff00' }}>{p.name}</td>
              <td style={{ border: '1px solid #333', color: '#00ff00' }}>{p.season}</td>
              {p.stats && p.stats.map((stat: string, j: number) => (
                <td key={j} style={{ border: '1px solid #333', color: '#00ff00' }}>{stat}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
