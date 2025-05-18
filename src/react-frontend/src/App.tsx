import { useEffect, useState } from 'react';
import './App.css';

const ALL_TEAMS = Object.entries({
  ari: 'Arizona Diamondbacks', atl: 'Atlanta Braves', bal: 'Baltimore Orioles', bos: 'Boston Red Sox', chc: 'Chicago Cubs', cin: 'Cincinnati Reds', cle: 'Cleveland Guardians', col: 'Colorado Rockies', det: 'Detroit Tigers', hou: 'Houston Astros', kc: 'Kansas City Royals', ana: 'Los Angeles Angels', laa: 'Los Angeles Angels', lad: 'Los Angeles Dodgers', mia: 'Miami Marlins', mil: 'Milwaukee Brewers', min: 'Minnesota Twins', nym: 'New York Mets', nyy: 'New York Yankees', oak: 'Oakland Athletics', phi: 'Philadelphia Phillies', pit: 'Pittsburgh Pirates', sd: 'San Diego Padres', sea: 'Seattle Mariners', sf: 'San Francisco Giants', stl: 'St. Louis Cardinals', tb: 'Tampa Bay Rays', tex: 'Texas Rangers', tor: 'Toronto Blue Jays', was: 'Washington Nationals', wsh: 'Washington Nationals'
}).map(([code, name]) => ({ code, name }));

type Player = {
  name: string;
  imgUrl?: string;
  [key: string]: string | number | undefined;
};

function App() {
  const [sport, setSport] = useState('mlb');
  const [team, setTeam] = useState('nyy');
  const [statType, setStatType] = useState<'hitting' | 'pitching'>('hitting');
  const [season, setSeason] = useState('2025');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' });
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/roster?team=${team}&type=${statType}&season=${season}`)
      .then((res) => {
        if (!res.ok) throw new Error('API error');
        return res.json();
      })
      .then((data) => {
        setPlayers(data.players || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch roster.');
        setLoading(false);
      });
  }, [team, statType, season]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  // Define stat columns for hitting and pitching
  const HITTING_COLS = [
    'PA','AB','H','2B','3B','HR','BB','SO','BA','OBP','SLG'
  ];
  const PITCHING_COLS = [
    'PA','AB','H','2B','3B','HR','BB','SO','BA','OBP','SLG','WOBA','WOBACON','Pitches','Batted Balls','Barrels','Barrel %','Hard Hit %','Exit Velocity','Launch Angle','XBA','XSLG','XWOBA','XWOBACON'
  ];

  const getSortedPlayers = () => {
    if (!sortColumn) return players;
    const isStatColumn = sortColumn !== 'name' && sortColumn !== 'season';
    const statCols = statType === 'hitting' ? HITTING_COLS : PITCHING_COLS;
    const statIdx = statCols.indexOf(sortColumn);
    return [...players].sort((a, b) => {
      let aVal, bVal;
      if (isStatColumn && statIdx !== -1) {
        // Get stat value from stats array
        const aStats = Array.isArray(a.stats) ? a.stats : typeof a.stats === 'string' ? a.stats.split(',') : [];
        const bStats = Array.isArray(b.stats) ? b.stats : typeof b.stats === 'string' ? b.stats.split(',') : [];
        aVal = aStats[statIdx];
        bVal = bStats[statIdx];
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }
        return 0;
      } else {
        // Name/Season: string compare
        aVal = a[sortColumn];
        bVal = b[sortColumn];
        if (aVal && bVal) {
          return sortDirection === 'asc'
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
        }
        return 0;
      }
    });
  };

  return (
    <div className="main-layout">
      <header className="header">
        <div className="header-center">
          <h1 className="app-title">The Cycle - Statcast Web App</h1>
        </div>
        <div className="header-right">
          <form className="login-form" onSubmit={e => { e.preventDefault(); }}>
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
              className="login-input"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
              className="login-input"
            />
            <button type="submit" className="login-btn">Login</button>
            <button type="button" className="register-btn" onClick={() => setShowRegister(true)}>Register</button>
          </form>
        </div>
      </header>
      <div className="content-col">
        {/* Only keep the dropdowns in the body, not above the header */}
        <div className="dropdown-row">
          <select
            className="sport-dropdown"
            value={sport}
            onChange={e => setSport(e.target.value)}
          >
            <option value="mlb">MLB</option>
            <option value="nfl">NFL</option>
          </select>
          <select
            className="team-dropdown"
            value={team}
            onChange={e => setTeam(e.target.value)}
          >
            {ALL_TEAMS.map(t => (
              <option key={t.code} value={t.code}>{t.name}</option>
            ))}
          </select>
          <select
            className="stat-type-dropdown"
            value={statType}
            onChange={e => setStatType(e.target.value as 'hitting' | 'pitching')}
            style={{ marginLeft: 12 }}
          >
            <option value="hitting">Hitting</option>
            <option value="pitching">Pitching</option>
          </select>
          <select
            className="season-dropdown"
            value={season}
            onChange={e => setSeason(e.target.value)}
            style={{ marginLeft: 12 }}
          >
            {['2025','2024','2023','2022','2021','2020'].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {players.length > 0 && (
          <div className="table-responsive">
            <table className="stats-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} style={{cursor:'pointer'}}>
                    Name{sortColumn === 'name' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                  <th onClick={() => handleSort('season')} style={{cursor:'pointer'}}>
                    Season{sortColumn === 'season' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                  {(statType === 'hitting' ? HITTING_COLS : PITCHING_COLS).map(col => (
                    <th key={col} onClick={() => handleSort(col)} style={{cursor:'pointer'}}>
                      {col}{sortColumn === col ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getSortedPlayers().map((player, idx) => {
                  let statValues: string[];
                  if (Array.isArray(player.stats)) {
                    statValues = player.stats as string[];
                  } else if (typeof player.stats === 'string') {
                    statValues = player.stats.split(',');
                  } else {
                    statValues = [];
                  }
                  const statCols = statType === 'hitting' ? HITTING_COLS : PITCHING_COLS;
                  return (
                    <tr key={idx}>
                      <td>{player.name}</td>
                      <td>{player.season}</td>
                      {statCols.map((_, i) => (
                        <td key={i}>{statValues[i]}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showRegister && (
        <div className="modal-overlay" onClick={() => setShowRegister(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowRegister(false)}>×</button>
            <h2>Register</h2>
            <form className="register-form" onSubmit={e => { e.preventDefault(); }}>
              <input
                type="text"
                placeholder="Username"
                value={registerForm.username}
                onChange={e => setRegisterForm(f => ({ ...f, username: e.target.value }))}
                className="register-input"
              />
              <input
                type="email"
                placeholder="Email"
                value={registerForm.email}
                onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                className="register-input"
              />
              <input
                type="password"
                placeholder="Password"
                value={registerForm.password}
                onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                className="register-input"
              />
              <button type="submit" className="register-btn">Register</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
