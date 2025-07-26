import React from 'react';
import ComingSoon from '../components/ComingSoon';

const Standings = () => {
  return (
    <ComingSoon 
      title="League Standings"
      description="Complete league standings with division rankings, wild card races, and playoff positioning are being implemented. This will include win-loss records, games behind, and streak analysis."
      backLink="/teams"
      backText="View Teams"
    />
  );
};

export default Standings;
