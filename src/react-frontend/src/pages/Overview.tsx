import { Helmet } from 'react-helmet-async';
import '../styles/Dashboard.css';

const Overview = () => {
  return (
    <div className="page-content">
      <Helmet>
        <title>MLB Statcast | Overview</title>
      </Helmet>
      <h1>Overview</h1>
      <div className="dashboard-grid">
        <div className="dashboard-card animate-fade-in" style={{animationDelay: '0.1s'}}>
          <h3>League Leaders</h3>
          <div className="card-content">
            <p>Batting Average: .342 - Player Name</p>
            <p>Home Runs: 37 - Player Name</p>
            <p>RBIs: 112 - Player Name</p>
            <p>ERA: 1.89 - Player Name</p>
          </div>
        </div>
        
        <div className="dashboard-card animate-fade-in" style={{animationDelay: '0.2s'}}>
          <h3>Recent Games</h3>
          <div className="card-content">
            <p>NYY 5 - BOS 3</p>
            <p>LAD 2 - SF 1</p>
            <p>CHC 7 - STL 4</p>
            <p>HOU 8 - TEX 2</p>
          </div>
        </div>
        
        <div className="dashboard-card animate-fade-in" style={{animationDelay: '0.3s'}}>
          <h3>Upcoming Games</h3>
          <div className="card-content">
            <p>NYY vs BOS - 7:05 PM</p>
            <p>LAD vs SF - 10:10 PM</p>
            <p>CHC vs STL - 8:15 PM</p>
            <p>HOU vs TEX - 8:05 PM</p>
          </div>
        </div>
        
        <div className="dashboard-card animate-fade-in" style={{animationDelay: '0.4s'}}>
          <h3>Trending Stats</h3>
          <div className="card-content">
            <p>Average Exit Velocity: 92.3 mph</p>
            <p>Average Launch Angle: 12.5°</p>
            <p>Average Fastball Velocity: 94.7 mph</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
