import { useEffect, useState } from 'react';
import './App.css';

const TEAMS = [
  { code: 'nyy', name: 'New York Yankees' },
  { code: 'bos', name: 'Boston Red Sox' },
  { code: 'hou', name: 'Houston Astros' },
  { code: 'la', name: 'Los Angeles Angels' },
  { code: 'chc', name: 'Chicago Cubs' },
  { code: 'lad', name: 'Los Angeles Dodgers' },
  // ...add more teams as needed
];

function App() {
  const [team, setTeam] = useState('nyy');
  const [players, setPlayers] = useState<any[]>([]);
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

  return (
    <div className="App">
      <h1>MLB Team Roster & Stats</h1>
      <label>
        Select Team:
        <select value={team} onChange={e => setTeam(e.target.value)}>
          {TEAMS.map(t => (
            <option key={t.code} value={t.code}>{t.name}</option>
          ))}
        </select>
      </label>
      {loading && <p>Loading...</p>}
      {error && <p style={{color: 'red'}}>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Position</th>
            <th>Stats</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={i}>
              <td>{p.name}</td>
              <td>{p.position}</td>
              <td>{p.stats && p.stats.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
