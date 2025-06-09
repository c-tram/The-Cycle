import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { searchPlayers as searchPlayersApi, getPlayerStats, PlayerMetadata } from '../services/api';
import Loading from '../components/Loading';
import ErrorMessage from '../components/Error';
import '../styles/PlayerSearch.css';

const PlayerSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>();

  // Debounced search function
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Don't search if query is empty
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await searchPlayersApi(query);
        setResults(data);
      } catch (err: any) {
        console.error('Error searching players:', err);
        setError(err.message === 'Request timeout' 
          ? 'Search request timed out. Please try again.' 
          : 'Failed to search players. Please try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    // Set new timeout
    const timeout = setTimeout(performSearch, 300);
    setSearchTimeout(timeout);

    // Cleanup
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [query]);

  const handleRetry = () => {
    setError('');
    setQuery(query); // This will trigger a new search
  };

  const handlePlayerClick = async (playerId: string) => {
    try {
      setSelectedPlayer(playerId);
      const stats = await getPlayerStats(playerId);
      setPlayerStats(stats);
    } catch (err) {
      console.error('Error fetching player stats:', err);
      setPlayerStats(null);
    }
  };

  return (
    <div className="page-content">
      <Helmet>
        <title>MLB Statcast | Player Search</title>
      </Helmet>
      
      <h1>Player Search</h1>
      
      <div className="search-container">
        <input
          type="text"
          placeholder="Search players by name, team, or position..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
          autoFocus
        />
      </div>

      {loading && <Loading message="Searching players..." />}
      {error && <ErrorMessage message={error} onRetry={handleRetry} />}

      {!loading && !error && (
        <div className="results-container">
          {results.length > 0 ? (
            <div className="player-grid">
              {results.map((player) => (
                <div 
                  key={player.id} 
                  className={`player-card ${player.position === 'P' ? 'pitcher' : 'hitter'} ${selectedPlayer === player.id ? 'selected' : ''}`}
                  onClick={() => handlePlayerClick(player.id)}
                >
                  <div className="player-info">
                    <h3>{player.name}</h3>
                    <div className="player-details">
                      <span className={`position ${player.position === 'P' ? 'pitcher' : 'position-player'}`}>
                        {player.position}
                      </span>
                      <span className="team">{player.team}</span>
                      {player.jerseyNumber && (
                        <span className="jersey">#{player.jerseyNumber}</span>
                      )}
                    </div>
                    <div className="player-bio">
                      {player.batsThrows && (
                        <span className="bats-throws">B/T: {player.batsThrows}</span>
                      )}
                      {player.position === 'P' ? (
                        <span className="player-type">Pitcher</span>
                      ) : (
                        <span className="player-type">Position Player</span>
                      )}
                    </div>
                    {selectedPlayer === player.id && playerStats && (
                      <div className="player-stats">
                        {player.position === 'P' ? (
                          <>
                            <div>ERA: {playerStats.era || 'N/A'}</div>
                            <div>W-L: {playerStats.wins || '0'}-{playerStats.losses || '0'}</div>
                            <div>WHIP: {playerStats.whip || 'N/A'}</div>
                            <div>K: {playerStats.strikeouts || 'N/A'}</div>
                          </>
                        ) : (
                          <>
                            <div>AVG: {playerStats.avg || 'N/A'}</div>
                            <div>HR: {playerStats.hr || '0'}</div>
                            <div>RBI: {playerStats.rbi || '0'}</div>
                            <div>OPS: {playerStats.ops || 'N/A'}</div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="no-results">No players found matching "{query}"</div>
          ) : (
            <div className="search-prompt">
              Enter a player name, team, or position to search
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerSearch;
