import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Standings = () => {
  const [standings, setStandings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState('divisions'); // 'divisions' or 'wildcard'
  const [selectedLeague, setSelectedLeague] = useState('all'); // 'all', 'al', 'nl'

  useEffect(() => {
    fetchStandings();
  }, []);

  const fetchStandings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/standings');
      if (!response.ok) {
        throw new Error('Failed to fetch standings');
      }
      const data = await response.json();
      setStandings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatRecord = (wins, losses) => `${wins}-${losses}`;

  const getDivisionsByLeague = (league) => {
    if (!standings) return {};
    
    if (league === 'all') return standings.divisions;
    
    const filteredDivisions = {};
    Object.keys(standings.divisions).forEach(divName => {
      const teams = standings.divisions[divName];
      if (teams.length > 0) {
        const teamLeague = teams[0].league;
        if ((league === 'al' && teamLeague === 'American League') ||
            (league === 'nl' && teamLeague === 'National League')) {
          filteredDivisions[divName] = teams;
        }
      }
    });
    
    return filteredDivisions;
  };

  const renderDivisionTable = (divisionName, teams) => (
    <Card key={divisionName} className="mb-6">
      <CardContent>
        <h3 className="text-xl font-bold mb-4 text-center bg-blue-500 text-white py-2 rounded">
          {divisionName}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2 font-semibold">Team</th>
                <th className="text-center p-2 font-semibold">W</th>
                <th className="text-center p-2 font-semibold">L</th>
                <th className="text-center p-2 font-semibold">PCT</th>
                <th className="text-center p-2 font-semibold">GB</th>
                <th className="text-center p-2 font-semibold">RS</th>
                <th className="text-center p-2 font-semibold">RA</th>
                <th className="text-center p-2 font-semibold">DIFF</th>
                <th className="text-center p-2 font-semibold">L10</th>
                <th className="text-center p-2 font-semibold">HOME</th>
                <th className="text-center p-2 font-semibold">AWAY</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => (
                <tr key={team.teamCode} className={`border-b hover:bg-gray-50 ${index === 0 ? 'bg-green-50' : ''}`}>
                  <td className="p-2 font-medium">{team.teamName}</td>
                  <td className="text-center p-2">{team.wins}</td>
                  <td className="text-center p-2">{team.losses}</td>
                  <td className="text-center p-2">{team.winPct.toFixed(3)}</td>
                  <td className="text-center p-2">{team.gamesBehind}</td>
                  <td className="text-center p-2">{team.runsScored}</td>
                  <td className="text-center p-2">{team.runsAllowed}</td>
                  <td className="text-center p-2">
                    <span className={team.runDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {team.runDiff >= 0 ? '+' : ''}{team.runDiff}
                    </span>
                  </td>
                  <td className="text-center p-2">{team.lastTen}</td>
                  <td className="text-center p-2">{team.homeRecord}</td>
                  <td className="text-center p-2">{team.awayRecord}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  const renderWildCardTable = (league, teams) => (
    <Card key={league} className="mb-6">
      <CardContent>
        <h3 className="text-xl font-bold mb-4 text-center bg-purple-500 text-white py-2 rounded">
          {league} Wild Card
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2 font-semibold">Team</th>
                <th className="text-center p-2 font-semibold">W</th>
                <th className="text-center p-2 font-semibold">L</th>
                <th className="text-center p-2 font-semibold">PCT</th>
                <th className="text-center p-2 font-semibold">WCGB</th>
                <th className="text-center p-2 font-semibold">Division</th>
              </tr>
            </thead>
            <tbody>
              {teams.slice(0, 8).map((team, index) => (
                <tr key={team.teamCode} className={`border-b hover:bg-gray-50 ${index < 3 ? 'bg-green-50' : ''}`}>
                  <td className="p-2 font-medium">{team.teamName}</td>
                  <td className="text-center p-2">{team.wins}</td>
                  <td className="text-center p-2">{team.losses}</td>
                  <td className="text-center p-2">{team.winPct.toFixed(3)}</td>
                  <td className="text-center p-2">{team.wildCardGB || '—'}</td>
                  <td className="text-center p-2 text-sm text-gray-600">{team.division}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          <span className="bg-green-50 px-2 py-1 rounded">Green</span> indicates playoff position
        </p>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner message="Loading standings..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">Error loading standings: {error}</p>
              <button 
                onClick={fetchStandings}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!standings) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-600">No standings data available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const divisions = getDivisionsByLeague(selectedLeague);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">MLB Standings</h1>
        <p className="text-gray-600 mb-4">
          Season: {standings.year} | Last Updated: {new Date(standings.lastUpdated).toLocaleString()}
        </p>
        
        {/* View Toggle */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedView('divisions')}
            className={`px-4 py-2 rounded ${
              selectedView === 'divisions' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Divisions
          </button>
          <button
            onClick={() => setSelectedView('wildcard')}
            className={`px-4 py-2 rounded ${
              selectedView === 'wildcard' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Wild Card
          </button>
        </div>

        {/* League Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedLeague('all')}
            className={`px-4 py-2 rounded ${
              selectedLeague === 'all' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Leagues
          </button>
          <button
            onClick={() => setSelectedLeague('al')}
            className={`px-4 py-2 rounded ${
              selectedLeague === 'al' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            American League
          </button>
          <button
            onClick={() => setSelectedLeague('nl')}
            className={`px-4 py-2 rounded ${
              selectedLeague === 'nl' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            National League
          </button>
        </div>
      </div>

      {selectedView === 'divisions' && (
        <div>
          {Object.keys(divisions).map(divisionName => 
            renderDivisionTable(divisionName, divisions[divisionName])
          )}
        </div>
      )}

      {selectedView === 'wildcard' && standings.wildCard && (
        <div>
          {selectedLeague === 'all' || selectedLeague === 'al' ? (
            renderWildCardTable('American League', standings.wildCard['American League'] || [])
          ) : null}
          {selectedLeague === 'all' || selectedLeague === 'nl' ? (
            renderWildCardTable('National League', standings.wildCard['National League'] || [])
          ) : null}
        </div>
      )}

      {/* Legend */}
      <Card className="mt-6">
        <CardContent>
          <h4 className="font-bold mb-2">Legend</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>W/L:</strong> Wins/Losses | <strong>PCT:</strong> Win Percentage | <strong>GB:</strong> Games Behind</p>
            <p><strong>WCGB:</strong> Wild Card Games Behind | <strong>RS/RA:</strong> Runs Scored/Allowed | <strong>DIFF:</strong> Run Differential</p>
            <p><strong>L10:</strong> Last 10 Games | <strong>HOME/AWAY:</strong> Home/Away Record</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Standings;
