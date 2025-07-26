import React from 'react';
import ComingSoon from '../components/ComingSoon';

const Leaders = () => {
  return (
    <ComingSoon 
      title="Statistical Leaders"
      description="Comprehensive leaderboards for batting, pitching, and fielding statistics. This will include sortable categories, filters by team and position, and historical comparisons."
      backLink="/players"
      backText="View Players"
    />
  );
};

export default Leaders;
