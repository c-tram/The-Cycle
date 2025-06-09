import React from 'react';
import '../styles/Standings.css';

interface Player {
  name: string;
  team?: string;
  teamCode?: string;
  position?: string;
  avg?: string;
  hr?: string;
  rbi?: string;
  runs?: string;
  sb?: string;
  era?: string;
  wins?: string;
  so?: string;
  whip?: string;
  statType?: 'hitting' | 'pitching';
}

interface Props {
  results: Player[];
}

const SearchResultsTable: React.FC<Props> = ({ results }) => {
  if (!results.length) return null;

  // Determine if showing hitters or pitchers based on statType
  const isPitcher = (p: Player) => p.statType === 'pitching' || (!!p.era && !!p.whip);

  return (
    <div className="standings-container" style={{ marginTop: 24 }}>
      <div className="division-standings">
        <h2>Search Results</h2>
        <div className="table-responsive">
          <table className="standings-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Team</th>
                <th>Position</th>
                <th>AVG</th>
                <th>HR</th>
                <th>RBI</th>
                <th>Runs</th>
                <th>SB</th>
                <th>ERA</th>
                <th>W</th>
                <th>SO</th>
                <th>WHIP</th>
              </tr>
            </thead>
            <tbody>
              {results.map((p, i) => (
                <tr key={i}>
                  <td className="team-name">{p.name}</td>
                  <td>{p.team}</td>
                  <td>{p.position || ''}</td>
                  <td>{p.avg || ''}</td>
                  <td>{p.hr || ''}</td>
                  <td>{p.rbi || ''}</td>
                  <td>{p.runs || ''}</td>
                  <td>{p.sb || ''}</td>
                  <td>{p.era || ''}</td>
                  <td>{p.wins || ''}</td>
                  <td>{p.so || ''}</td>
                  <td>{p.whip || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SearchResultsTable;
