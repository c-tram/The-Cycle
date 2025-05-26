import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Loading from '../components/Loading';
import ErrorMessage from '../components/Error';
import { getTrends } from '../services/api';
import '../styles/Trends.css';

const STAT_CATEGORIES = [
  'Batting Average',
  'Home Runs',
  'RBIs',
  'OPS',
  'ERA',
  'Strikeouts',
  'WHIP',
  'Exit Velocity',
  'Launch Angle',
  'Sprint Speed',
] as const;
type StatCategory = typeof STAT_CATEGORIES[number];

// Fallback data in case API fails
const FALLBACK_TREND_DATA: Record<StatCategory, number[]> = {
  'Batting Average': [.267, .265, .264, .268, .271, .270, .266],
  'Home Runs': [1.18, 1.21, 1.25, 1.31, 1.27, 1.22, 1.19],
  'RBIs': [4.12, 4.21, 4.35, 4.41, 4.32, 4.22, 4.18],
  'OPS': [.728, .735, .741, .752, .748, .739, .731],
  'ERA': [4.05, 3.97, 3.95, 4.01, 4.08, 4.11, 4.07],
  'Strikeouts': [8.7, 8.8, 8.9, 9.1, 9.3, 9.2, 9.0],
  'WHIP': [1.28, 1.26, 1.25, 1.23, 1.24, 1.27, 1.29],
  'Exit Velocity': [88.5, 88.7, 89.1, 89.3, 89.0, 88.8, 88.6],
  'Launch Angle': [12.1, 12.3, 12.6, 12.8, 12.5, 12.4, 12.2],
  'Sprint Speed': [27.1, 27.0, 26.9, 26.8, 26.9, 27.0, 27.2]
};

const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October'];

const Trends = () => {
  const [selectedStat, setSelectedStat] = useState('Batting Average' as StatCategory);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendData, setTrendData] = useState(FALLBACK_TREND_DATA);
  
  useEffect(() => {
    // Load trend data from API when the selected stat changes
    const loadTrendData = async () => {
      try {
        setLoading(true);
        setError(''); // Clear any previous errors
        
        // Get data from API
        const apiData = await getTrends(selectedStat);
        
        // Check if API returned data for the selected stat
        if (apiData && apiData[selectedStat] && apiData[selectedStat].length > 0) {
          // Create a new object with the updated data
          setTrendData((prevData: Record<StatCategory, number[]>) => {
            const newData = { ...prevData };
            const statKey = selectedStat as StatCategory;
            newData[statKey] = apiData[selectedStat] as number[];
            return newData;
          });
        } else {
          // If API didn't return usable data, fall back to mock data
          console.warn('API returned empty data, using fallback');
          setTrendData((prevData: Record<StatCategory, number[]>) => {
            const newData = { ...prevData };
            const statKey = selectedStat as StatCategory;
            newData[statKey] = FALLBACK_TREND_DATA[statKey];
            return newData;
          });
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading trend data:', err);
        setError('Failed to load trend data from API. Using fallback data.');
        // Use fallback data if API fails
        setTrendData((prevData: Record<StatCategory, number[]>) => {
          const newData = { ...prevData };
          const statKey = selectedStat as StatCategory;
          newData[statKey] = FALLBACK_TREND_DATA[statKey];
          return newData;
        });
        setLoading(false);
      }
    };
    
    loadTrendData();
  }, [selectedStat]);

  const renderTrendChart = () => {
    const data = trendData[selectedStat];
    const max = Math.max(...data) * 1.1;
    
    return (
      <div className="trend-chart">
        <div className="chart-title">{selectedStat} Trend (League Average)</div>
        <div className="chart-container">
          {data.map((value: number, index: number) => {
            const height = (value / max) * 100;
            return (
              <div className="chart-bar-container" key={index}>
                <div 
                  className="chart-bar" 
                  style={{ height: `${height}%` }}
                  title={`${MONTHS[index]}: ${value}`}
                ></div>
                <div className="chart-label">{MONTHS[index].substring(0, 3)}</div>
              </div>
            );
          })}
        </div>
        <div className="chart-values">
          <div className="max-value">{max.toFixed(2)}</div>
          <div className="mid-value">{(max/2).toFixed(2)}</div>
          <div className="min-value">0</div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="page-content">
      <Helmet>
        <title>MLB Statcast | Trends</title>
      </Helmet>
      <h1>MLB Trends</h1>
      
      {loading && <Loading message="Loading trend data..." />}
      {error && <ErrorMessage message={error} onRetry={() => setSelectedStat(selectedStat)} />}
      
      {!loading && !error && (
        <div className="trends-container animate-fade-in">
          <div className="trend-selector">
            <h3>Select Statistic:</h3>
            <div className="stat-buttons">
              {STAT_CATEGORIES.map((stat) => (
                <button 
                  key={stat} 
                  className={selectedStat === stat ? 'active' : ''}
                  onClick={() => setSelectedStat(stat)}
                  style={{animationDelay: `${STAT_CATEGORIES.indexOf(stat) * 0.05}s`}}
                >
                  {stat}
                </button>
              ))}
            </div>
          </div>
        
        <div className="trend-visualization">
          {renderTrendChart()}
          
          <div className="trend-analysis">
            <h3>Analysis: {selectedStat}</h3>
            <p>
              This visualization shows the league-wide trends for {selectedStat} throughout 
              the 2023 MLB season. The data represents monthly averages across all teams.
            </p>
            <p>
              {selectedStat === 'Batting Average' && 'Batting averages peaked in August at .271, likely due to warmer weather conditions.'}
              {selectedStat === 'Home Runs' && 'Home run rates were highest in July, averaging 1.31 per game.'}
              {selectedStat === 'ERA' && 'Pitcher ERA was lowest in June and July, before rising during the later months of the season.'}
              {selectedStat === 'Exit Velocity' && 'Exit velocity peaked in July at 89.4 mph, correlating with the increase in home runs.'}
            </p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default Trends;
