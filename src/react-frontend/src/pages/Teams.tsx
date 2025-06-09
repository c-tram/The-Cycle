import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { getTeamRoster, Player } from '../services/api';
import '../styles/Teams.css';
import Loading from '../components/Loading';
import ErrorMessage from '../components/Error';

type TimePeriod = '1day' | '7day' | '30day' | 'season';
type ViewMode = 'individual-hitting' | 'individual-pitching' | 'averages-hitting' | 'averages-pitching';

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
  { code: 'laa', name: 'Los Angeles Angels', division: 'AL West' },
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
  const [timePeriod, setTimePeriod] = useState('season' as TimePeriod);
  const [viewMode, setViewMode] = useState('individual-hitting' as ViewMode);
  const [players, setPlayers] = useState([] as Player[]);
  const [allTeamsData, setAllTeamsData] = useState({} as {[key: string]: Player[]});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch individual team data
  useEffect(() => {
    const fetchTeamRoster = async () => {
      if (viewMode.startsWith('individual')) {
        try {
          setLoading(true);
          setError('');
          const statType = viewMode.includes('pitching') ? 'pitching' : 'hitting';
          const teamData = await getTeamRoster(team, timePeriod, statType);
          if (teamData && teamData.length > 0 && teamData[0].players) {
            setPlayers(teamData[0].players);
          } else {
            setPlayers([]);
          }
          setLoading(false);
        } catch (err) {
          console.error('Error fetching team roster:', err);
          setError('Data not available for the selected team and time period. Please try a different selection.');
          setPlayers([]);
          setLoading(false);
        }
      }
    };
    
    fetchTeamRoster();
  }, [team, timePeriod, viewMode]);

  // Fetch all teams data when in averages mode
  useEffect(() => {
    const fetchAllTeamsData = async () => {
      if (viewMode.startsWith('averages')) {
        try {
          setLoading(true);
          setError('');
          
          const allData: {[key: string]: Player[]} = {};
          const statType = viewMode.includes('pitching') ? 'pitching' : 'hitting';
          
          // Handle all teams in batches of 5
          const batchSize = 5;
          for (let i = 0; i < TEAMS.length; i += batchSize) {
            const batch = TEAMS.slice(i, i + batchSize);
            const batchPromises = batch.map(async (teamInfo) => {
              try {
                const teamData = await getTeamRoster(teamInfo.code, timePeriod, statType);
                if (teamData && teamData.length > 0 && teamData[0].players) {
                  allData[teamInfo.code] = teamData[0].players;
                } else {
                  allData[teamInfo.code] = [];
                }
              } catch (err) {
                console.error(`Error fetching data for ${teamInfo.name}:`, err);
                allData[teamInfo.code] = [];
              }
            });
            
            await Promise.all(batchPromises);
            
            // Add a small delay between batches to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          setAllTeamsData(allData);
          setLoading(false);
        } catch (err) {
          console.error('Error fetching all teams data:', err);
          setError('Failed to fetch teams data.');
          setLoading(false);
        }
      }
    };
    
    fetchAllTeamsData();
  }, [team, timePeriod, viewMode]);

  // Group teams by division
  const teamsByDivision: Record<string, typeof TEAMS> = {};
  TEAMS.forEach(team => {
    if (!teamsByDivision[team.division]) {
      teamsByDivision[team.division] = [];
    }
    teamsByDivision[team.division].push(team);
  });

  const getTimePeriodLabel = (period: TimePeriod): string => {
    switch (period) {
      case '1day': return 'Last 1 Day';
      case '7day': return 'Last 7 Days';
      case '30day': return 'Last 30 Days';
      case 'season': return 'Full Season';
      default: return 'Full Season';
    }
  };

  const calculateTeamAverages = (players: Player[], statType: 'hitting' | 'pitching'): Player => {
    if (players.length === 0) {
      if (statType === 'pitching') {
        return {
          name: 'Team Average',
          position: 'ALL',
          era: '0.00',
          whip: '0.00',
          wins: '0',
          so: '0'
        };
      } else {
        return {
          name: 'Team Average',
          position: 'ALL',
          avg: '.000',
          hr: '0',
          rbi: '0',
          runs: '0',
          sb: '0',
          obp: '.000',
          slg: '.000',
          ops: '.000'
        };
      }
    }

    if (statType === 'pitching') {
      const totals = players.reduce((acc, player) => {
        const era = parseFloat(player.era || '0');
        const whip = parseFloat(player.whip || '0');
        const wins = parseInt(player.wins || '0');
        const so = parseInt(player.so || '0');
        
        return {
          era: acc.era + era,
          whip: acc.whip + whip,
          wins: acc.wins + wins,
          so: acc.so + so
        };
      }, { era: 0, whip: 0, wins: 0, so: 0 });

      return {
        name: 'Team Average',
        position: 'ALL',
        era: (totals.era / players.length).toFixed(2),
        whip: (totals.whip / players.length).toFixed(2),
        wins: Math.round(totals.wins / players.length).toString(),
        so: Math.round(totals.so / players.length).toString()
      };
    } else {
      const totals = players.reduce((acc, player) => {
        const avg = parseFloat(player.avg?.replace('.', '0.') || '0');
        const hr = parseInt(player.hr || '0');
        const rbi = parseInt(player.rbi || '0');
        const runs = parseInt(player.runs || '0');
        const sb = parseInt(player.sb || '0');
        const obp = parseFloat(player.obp?.replace('.', '0.') || '0');
        const slg = parseFloat(player.slg?.replace('.', '0.') || '0');
        const ops = parseFloat(player.ops?.replace('.', '0.') || '0');
        
        return {
          avg: acc.avg + avg,
          hr: acc.hr + hr,
          rbi: acc.rbi + rbi,
          runs: acc.runs + runs,
          sb: acc.sb + sb,
          obp: acc.obp + obp,
          slg: acc.slg + slg,
          ops: acc.ops + ops
        };
      }, { avg: 0, hr: 0, rbi: 0, runs: 0, sb: 0, obp: 0, slg: 0, ops: 0 });

      return {
        name: 'Team Average',
        position: 'ALL',
        avg: (totals.avg / players.length).toFixed(3),
        hr: Math.round(totals.hr / players.length).toString(),
        rbi: Math.round(totals.rbi / players.length).toString(),
        runs: Math.round(totals.runs / players.length).toString(),
        sb: Math.round(totals.sb / players.length).toString(),
        obp: (totals.obp / players.length).toFixed(3),
        slg: (totals.slg / players.length).toFixed(3),
        ops: (totals.ops / players.length).toFixed(3)
      };
    }
  };

  return (
    <div className="page-content">
      <Helmet>
        <title>MLB Statcast | Teams</title>
      </Helmet>
      <h1>MLB Teams</h1>
      
      <div className="team-controls">
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
        
        <div className="time-period-selector">
          <label>
            Time Period:
            <div className="time-period-buttons">
              {(['1day', '7day', '30day', 'season'] as TimePeriod[]).map(period => (
                <button
                  key={period}
                  className={`time-period-btn ${timePeriod === period ? 'active' : ''}`}
                  onClick={() => setTimePeriod(period)}
                >
                  {getTimePeriodLabel(period)}
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="view-mode-selector">
          <label>
            View Mode:
            <div className="view-mode-buttons">
              <button
                className={`view-mode-btn ${viewMode === 'individual-hitting' ? 'active' : ''}`}
                onClick={() => setViewMode('individual-hitting')}
              >
                Individual Hitting
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'averages-hitting' ? 'active' : ''}`}
                onClick={() => setViewMode('averages-hitting')}
              >
                Team Hitting Averages
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'individual-pitching' ? 'active' : ''}`}
                onClick={() => setViewMode('individual-pitching')}
              >
                Individual Pitching
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'averages-pitching' ? 'active' : ''}`}
                onClick={() => setViewMode('averages-pitching')}
              >
                Team Pitching Averages
              </button>
            </div>
          </label>
        </div>
      </div>
      
      <div className="team-content">
        {loading && <Loading message="Loading team data..." />}
        {error && <ErrorMessage message={error} onRetry={() => setTeam(team)} />}
        
        {!loading && !error && (
          <div className="team-roster">
            <h2>
              {TEAMS.find(t => t.code === team)?.name || 'Team'}: 
              {viewMode.startsWith('individual') ? ' Roster' : ' Averages'} - 
              {viewMode.includes('pitching') ? ' Pitching' : ' Hitting'} - 
              {getTimePeriodLabel(timePeriod)}
            </h2>
            <div className="table-responsive">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    {viewMode.includes('hitting') ? (
                      <>
                        <th>Batting Avg</th>
                        <th>HR</th>
                        <th>RBI</th>
                        <th>Runs</th>
                        <th>SB</th>
                        <th>OBP</th>
                        <th>SLG</th>
                        <th>OPS</th>
                      </>
                    ) : (
                      <>
                        <th>ERA</th>
                        <th>WHIP</th>
                        <th>Wins</th>
                        <th>SO</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {viewMode.startsWith('individual') ? (
                    players.length > 0 ? players.map((p: Player, i: number) => (
                      <tr key={i}>
                        <td>{p.name}</td>
                        {viewMode.includes('hitting') ? (
                          <>
                            <td className={parseFloat(p.avg || '0') > 0.300 ? 'stat-highlight-good' : parseFloat(p.avg || '0') < 0.220 ? 'stat-highlight-bad' : ''}>{p.avg || '.000'}</td>
                            <td className={parseInt(p.hr || '0') > 20 ? 'stat-highlight-good' : ''}>{p.hr || '0'}</td>
                            <td className={parseInt(p.rbi || '0') > 50 ? 'stat-highlight-good' : ''}>{p.rbi || '0'}</td>
                            <td className={parseInt(p.runs || '0') > 40 ? 'stat-highlight-good' : ''}>{p.runs || '0'}</td>
                            <td className={parseInt(p.sb || '0') > 10 ? 'stat-highlight-good' : ''}>{p.sb || '0'}</td>
                            <td className={parseFloat(p.obp || '0') > 0.350 ? 'stat-highlight-good' : ''}>{p.obp || '.000'}</td>
                            <td className={parseFloat(p.slg || '0') > 0.450 ? 'stat-highlight-good' : ''}>{p.slg || '.000'}</td>
                            <td className={parseFloat(p.ops || '0') > 0.800 ? 'stat-highlight-good' : ''}>{p.ops || '.000'}</td>
                          </>
                        ) : (
                          <>
                            <td className={parseFloat(p.era || '999') < 3.50 ? 'stat-highlight-good' : parseFloat(p.era || '0') > 5.00 ? 'stat-highlight-bad' : ''}>{p.era || '0.00'}</td>
                            <td className={parseFloat(p.whip || '999') < 1.20 ? 'stat-highlight-good' : parseFloat(p.whip || '0') > 1.40 ? 'stat-highlight-bad' : ''}>{p.whip || '0.00'}</td>
                            <td className={parseInt(p.wins || '0') > 10 ? 'stat-highlight-good' : ''}>{p.wins || '0'}</td>
                            <td className={parseInt(p.so || '0') > 100 ? 'stat-highlight-good' : ''}>{p.so || '0'}</td>
                          </>
                        )}
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={viewMode.includes('hitting') ? 9 : 5} style={{textAlign: 'center'}}>No player data available</td>
                      </tr>
                    )
                  ) : (
                    // Team averages view - show all teams
                    TEAMS.map(teamInfo => {
                      const statType = viewMode.includes('pitching') ? 'pitching' : 'hitting';
                      const teamAvg = calculateTeamAverages(allTeamsData[teamInfo.code] || [], statType);
                      return (
                        <tr key={teamInfo.code}>
                          <td>{teamInfo.name}</td>
                          {viewMode.includes('hitting') ? (
                            <>
                              <td>{teamAvg.avg || '.000'}</td>
                              <td>{teamAvg.hr || '0'}</td>
                              <td>{teamAvg.rbi || '0'}</td>
                              <td>{teamAvg.runs || '0'}</td>
                              <td>{teamAvg.sb || '0'}</td>
                              <td>{teamAvg.obp || '.000'}</td>
                              <td>{teamAvg.slg || '.000'}</td>
                              <td>{teamAvg.ops || '.000'}</td>
                            </>
                          ) : (
                            <>
                              <td>{teamAvg.era || '0.00'}</td>
                              <td>{teamAvg.whip || '0.00'}</td>
                              <td>{teamAvg.wins || '0'}</td>
                              <td>{teamAvg.so || '0'}</td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Teams;
