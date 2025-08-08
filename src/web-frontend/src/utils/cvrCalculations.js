// CVR (Cycle Value Rating) Calculations - Version 4.0 
// A proprietary metric that measures player value relative to salary
// Scale: 0.0 to 2.0+ where 1.0 = league average value for money
// CVR > 1.0 = above average value (undervalued players)
// CVR < 1.0 = below average value (overpaid players)
// Elite players like Aaron Judge should approach 2.0 despite high salaries

/**
 * CVR SYSTEM - Normalized 0-2 Scale  
 * CVR = (Performance Score / 50) / (Salary Tier / 1.0)
 * Scale: 0.0-2.0+ where 1.0 is average, 2.0 is elite value
 */

/**
 * Calculate a simple but meaningful player value score (0-100)
 * Based on key offensive/defensive contributions
 */
const calculatePlayerValueScore = (stats) => {
  console.log('CVR: calculatePlayerValueScore called with:', stats);
  
  if (!stats) {
    console.log('CVR: No stats provided');
    return 0;
  }
  
  // For pitchers - CHECK PITCHING FIRST but only if they actually pitched
  if (stats.pitching) {
    const pitching = stats.pitching;
    const ip = parseFloat(pitching.inningsPitched) || 0;
    const gamesStarted = parseInt(pitching.gamesStarted) || 0;
    const gamesPlayed = parseInt(pitching.gamesPlayed) || 0;
    
    // Only process as pitcher if they have meaningful pitching activity
    const isPitcher = ip >= 2 || gamesStarted > 0 || gamesPlayed > 0;
    
    console.log('CVR: Checking if player is a pitcher - IP:', ip, 'GS:', gamesStarted, 'GP:', gamesPlayed, 'isPitcher:', isPitcher);
    
    if (isPitcher) {
      console.log('CVR: Processing as pitcher');
      if (ip < 2) {  // Still need minimum innings for scoring
        console.log('CVR: Insufficient innings for pitcher scoring:', ip);
        return 0;
      }
      
      const era = parseFloat(pitching.era) || 999;
      const whip = parseFloat(pitching.whip) || 999;
      const wins = pitching.wins || 0;
      const strikeouts = pitching.strikeouts || 0;
      const k9 = ip > 0 ? (strikeouts * 9) / ip : 0;
      
      // TOUGHER PITCHER SCORING - More realistic thresholds
      let score = 10; // Start with 10 base points (reduced from previous)
      
      // ERA contribution (0-25 points) - REDUCED and tougher thresholds
      if (era <= 2.00) score += 25;        // Cy Young level
      else if (era <= 2.50) score += 20;   // Elite
      else if (era <= 3.00) score += 16;   // Very Good
      else if (era <= 3.50) score += 12;   // Good
      else if (era <= 4.00) score += 8;    // Average
      else if (era <= 4.50) score += 4;    // Below Average
      // ERA > 4.50 gets no points
      
      // WHIP contribution (0-20 points) - REDUCED and tougher
      if (whip <= 0.90) score += 20;       // Elite
      else if (whip <= 1.00) score += 17;  // Excellent
      else if (whip <= 1.15) score += 14;  // Very Good
      else if (whip <= 1.30) score += 10;  // Good
      else if (whip <= 1.45) score += 6;   // Average
      else if (whip <= 1.60) score += 3;   // Below Average
      // WHIP > 1.60 gets no points
      
      // Strikeouts per 9 (0-20 points) - TOUGHER thresholds
      if (k9 >= 11.0) score += 20;         // Elite
      else if (k9 >= 10.0) score += 17;    // Excellent
      else if (k9 >= 8.5) score += 14;     // Very Good
      else if (k9 >= 7.5) score += 10;     // Good
      else if (k9 >= 6.5) score += 6;      // Average
      else if (k9 >= 5.5) score += 3;      // Below Average
      // K/9 < 5.5 gets no points
      
      // Wins and innings (0-25 points) - REDUCED and more demanding
      const winRate = ip > 0 ? wins / (ip / 6) : 0; // wins per 6 innings
      const ipBonus = Math.min(12, ip / 15); // up to 12 points for innings (tougher threshold)
      const winBonus = Math.min(13, winRate * 6); // up to 13 points for win rate (tougher threshold)
      score += ipBonus + winBonus;
      
      const finalScore = Math.min(100, score);
      console.log('CVR: Pitcher final score:', finalScore, '(with tougher thresholds)');
      return finalScore;
    }
  }
  
  // For hitters - only process if NO pitching stats
  if (stats.batting) {
    console.log('CVR: Processing hitter stats');
    const batting = stats.batting;
    
    // Check for meaningful batting stats
    const hasStats = (batting.battingAverage && batting.battingAverage !== '0.000') ||
                     (batting.onBasePercentage && batting.onBasePercentage !== '0.000') ||
                     (batting.sluggingPercentage && batting.sluggingPercentage !== '0.000') ||
                     (batting.atBats && batting.atBats > 0) ||
                     (batting.hits && batting.hits > 0);
    
    if (!hasStats) {
      console.log('CVR: No meaningful batting stats for hitter');
      return 0;
    }
    
    // Key offensive stats (use at-bats as fallback for games if needed)
    console.log('CVR: Raw batting object keys:', Object.keys(batting));
    console.log('CVR: Raw batting values:', batting);
    
    const avg = parseFloat(batting.battingAverage || batting.avg || batting.ba || batting.AVG) || 0;
    const obp = parseFloat(batting.onBasePercentage || batting.obp || batting.OBP) || 0;
    const slg = parseFloat(batting.sluggingPercentage || batting.slg || batting.SLG) || 0;
    const atBats = parseInt(batting.atBats || batting.ab || batting.AB) || 0;
    const games = batting.games || batting.gamesPlayed || batting.G || batting.g || 0;
    const effectiveGames = Math.max(games, Math.floor(atBats / 3.5)) || 1; // Estimate games from at-bats
    
    console.log('CVR: Parsed key stats - AVG:', avg, 'OBP:', obp, 'SLG:', slg, 'AB:', atBats, 'Games:', effectiveGames);
    
    const hrs = (batting.homeRuns || batting.hr || batting.HR || 0) / Math.max(effectiveGames, 1);
    const rbis = (batting.rbi || batting.RBI || batting.runs_batted_in || 0) / Math.max(effectiveGames, 1);
    const runs = (batting.runs || batting.r || batting.R || 0) / Math.max(effectiveGames, 1);
    
    console.log('CVR: Hitter key stats:', { 
      avg, obp, slg, hrs, rbis, runs, 
      atBats, effectiveGames,
      rawHRs: batting.homeRuns || batting.hr || batting.HR,
      rawRBIs: batting.rbi || batting.RBI,
      rawRuns: batting.runs || batting.r || batting.R
    });
    
    // BALANCED SCORING SYSTEM - Higher baseline to match pitcher scoring
    let score = 15; // Start with 15 base points (pitchers start at 0)
    console.log('CVR: Starting hitter score with 15 base points');
    
    // Batting average contribution (0-30 points) - INCREASED
    let avgPoints = 0;
    if (avg >= 0.320) avgPoints = 30;       // Elite
    else if (avg >= 0.300) avgPoints = 26;  // Excellent 
    else if (avg >= 0.280) avgPoints = 22;  // Very Good
    else if (avg >= 0.260) avgPoints = 18;  // Good
    else if (avg >= 0.240) avgPoints = 14;  // Average
    else if (avg >= 0.220) avgPoints = 8;   // Below Average
    score += avgPoints;
    console.log('CVR: AVG', avg, '→', avgPoints, 'points, total:', score);
    
    // OBP contribution (0-30 points) - INCREASED and most important
    let obpPoints = 0;
    if (obp >= 0.420) obpPoints = 30;       // Elite
    else if (obp >= 0.400) obpPoints = 26;  // Excellent
    else if (obp >= 0.370) obpPoints = 22;  // Very Good
    else if (obp >= 0.340) obpPoints = 18;  // Good
    else if (obp >= 0.320) obpPoints = 14;  // Average
    else if (obp >= 0.300) obpPoints = 8;   // Below Average
    score += obpPoints;
    console.log('CVR: OBP', obp, '→', obpPoints, 'points, total:', score);
    
    // Power contribution (0-25 points) - INCREASED
    let slgPoints = 0;
    if (slg >= 0.600) slgPoints = 25;       // Elite
    else if (slg >= 0.550) slgPoints = 22;  // Excellent
    else if (slg >= 0.480) slgPoints = 18;  // Very Good
    else if (slg >= 0.420) slgPoints = 14;  // Good
    else if (slg >= 0.380) slgPoints = 10;  // Average
    else if (slg >= 0.350) slgPoints = 6;   // Below Average
    score += slgPoints;
    console.log('CVR: SLG', slg, '→', slgPoints, 'points, total:', score);
    
    // Production per game (0-25 points) - IMPROVED calculation
    let productionScore = 0;
    if (effectiveGames > 0) {
      const productionPerGame = hrs + (rbis * 0.8) + (runs * 0.6);
      if (productionPerGame >= 2.5) productionScore = 25;      // Elite production
      else if (productionPerGame >= 2.0) productionScore = 21; // Excellent
      else if (productionPerGame >= 1.5) productionScore = 17; // Very Good
      else if (productionPerGame >= 1.0) productionScore = 13; // Good
      else if (productionPerGame >= 0.7) productionScore = 9;  // Average
      else if (productionPerGame >= 0.4) productionScore = 5;  // Below Average
    } else {
      // Fallback: Use raw counting stats if no games data
      const rawHRs = batting.homeRuns || batting.hr || batting.HR || 0;
      const rawRBIs = batting.rbi || batting.RBI || batting.runs_batted_in || 0;
      const rawRuns = batting.runs || batting.r || batting.R || 0;
      
      console.log('CVR: Using fallback production calculation with raw stats:', { rawHRs, rawRBIs, rawRuns });
      
      if (rawHRs >= 30 || rawRBIs >= 100 || rawRuns >= 100) productionScore = 25; // Elite
      else if (rawHRs >= 20 || rawRBIs >= 80 || rawRuns >= 80) productionScore = 20; // Excellent
      else if (rawHRs >= 15 || rawRBIs >= 60 || rawRuns >= 60) productionScore = 15; // Very Good
      else if (rawHRs >= 10 || rawRBIs >= 40 || rawRuns >= 40) productionScore = 10; // Good
      else if (rawHRs >= 5 || rawRBIs >= 25 || rawRuns >= 25) productionScore = 5;   // Average
    }
    score += productionScore;
    
    console.log('CVR: Production calculation - PerGame:', hrs, '+', (rbis * 0.8), '+', (runs * 0.6), '=', (hrs + (rbis * 0.8) + (runs * 0.6)), 'over', effectiveGames, 'games =', productionScore, 'points');
    
    const finalScore = Math.min(100, score);
    console.log('CVR: Hitter final score:', finalScore, '(with 15pt baseline + performance bonuses)');
    return finalScore;
  }
  
  console.log('CVR: No valid batting or pitching stats found');
  return 0;
};

/**
 * Calculate our own WAR-like metric based on available stats
 * This ensures every player gets a WAR adjustment even if external WAR isn't available
 */
const calculateEstimatedWAR = (stats) => {
  console.log('CVR: Calculating estimated WAR from stats');
  
  // Check if player is a pitcher first
  if (stats.pitching) {
    const pitching = stats.pitching;
    const ip = parseFloat(pitching.inningsPitched) || 0;
    const gamesStarted = parseInt(pitching.gamesStarted) || 0;
    const gamesPlayed = parseInt(pitching.gamesPlayed) || 0;
    
    const isPitcher = ip >= 2 || gamesStarted > 0 || gamesPlayed > 0;
    
    if (isPitcher && ip >= 2) {
      // Pitcher WAR calculation
      const era = parseFloat(pitching.era) || 5.00;
      const whip = parseFloat(pitching.whip) || 1.50;
      const strikeouts = pitching.strikeouts || 0;
      const walks = pitching.walks || 0;
      const k9 = ip > 0 ? (strikeouts * 9) / ip : 0;
      const bb9 = ip > 0 ? (walks * 9) / ip : 0;
      
      // Simple pitcher WAR formula based on performance vs league average
      // League average ERA ~4.50, WHIP ~1.35, K/9 ~8.5, BB/9 ~3.2
      let warEstimate = 0;
      
      // ERA component (most important)
      if (era <= 2.50) warEstimate += 3.0;      // Cy Young level
      else if (era <= 3.00) warEstimate += 2.0; // Elite
      else if (era <= 3.50) warEstimate += 1.0; // Very good
      else if (era <= 4.00) warEstimate += 0.5; // Above average
      else if (era <= 4.50) warEstimate += 0.0; // Average
      else if (era <= 5.00) warEstimate -= 0.5; // Below average
      else warEstimate -= 1.0;                  // Poor
      
      // WHIP component
      if (whip <= 1.00) warEstimate += 1.5;
      else if (whip <= 1.15) warEstimate += 1.0;
      else if (whip <= 1.30) warEstimate += 0.5;
      else if (whip <= 1.45) warEstimate += 0.0;
      else warEstimate -= 0.5;
      
      // Strikeout rate component
      if (k9 >= 10.0) warEstimate += 1.0;
      else if (k9 >= 8.5) warEstimate += 0.5;
      else if (k9 >= 7.0) warEstimate += 0.0;
      else warEstimate -= 0.5;
      
      // Walk rate component (lower is better)
      if (bb9 <= 2.0) warEstimate += 0.5;
      else if (bb9 <= 3.0) warEstimate += 0.0;
      else warEstimate -= 0.5;
      
      // Innings bonus (durability matters)
      if (ip >= 180) warEstimate += 1.0;
      else if (ip >= 150) warEstimate += 0.5;
      else if (ip >= 100) warEstimate += 0.0;
      else warEstimate -= 0.5;
      
      console.log('CVR: Estimated pitcher WAR:', warEstimate);
      return Math.max(-2.0, Math.min(8.0, warEstimate)); // Cap between -2 and 8
    }
  }
  
  // Hitter WAR calculation
  if (stats.batting) {
    const batting = stats.batting;
    const obp = parseFloat(batting.onBasePercentage) || 0;
    const slg = parseFloat(batting.sluggingPercentage) || 0;
    const atBats = parseInt(batting.atBats) || 0;
    const games = batting.games || batting.gamesPlayed || 0;
    const hrs = parseInt(batting.homeRuns) || 0;
    const rbi = parseInt(batting.rbi) || 0;
    const runs = parseInt(batting.runs) || 0;
    const sb = parseInt(batting.stolenBases) || 0;
    
    if (atBats < 50) {
      console.log('CVR: Insufficient at-bats for WAR calculation');
      return 0; // Need meaningful sample size
    }
    
    // Simple hitter WAR formula
    // League averages: .250 AVG, .320 OBP, .400 SLG, .720 OPS
    const ops = obp + slg;
    let warEstimate = 0;
    
    // OPS component (most important)
    if (ops >= 1.000) warEstimate += 4.0;      // MVP level
    else if (ops >= 0.900) warEstimate += 3.0; // All-Star
    else if (ops >= 0.800) warEstimate += 2.0; // Very good
    else if (ops >= 0.750) warEstimate += 1.0; // Above average
    else if (ops >= 0.700) warEstimate += 0.0; // Average
    else if (ops >= 0.650) warEstimate -= 0.5; // Below average
    else warEstimate -= 1.0;                   // Poor
    
    // Power component
    if (games > 0) {
      const hrRate = hrs / games;
      if (hrRate >= 0.25) warEstimate += 1.0;      // 40+ HR pace
      else if (hrRate >= 0.15) warEstimate += 0.5; // 25+ HR pace
      else if (hrRate >= 0.10) warEstimate += 0.0; // 15+ HR pace
      else warEstimate -= 0.2;
    }
    
    // Production component
    if (games > 0) {
      const rbiRate = rbi / games;
      const runRate = runs / games;
      const productionRate = rbiRate + runRate;
      
      if (productionRate >= 1.5) warEstimate += 0.5;
      else if (productionRate >= 1.0) warEstimate += 0.0;
      else warEstimate -= 0.3;
    }
    
    // Speed component
    if (games > 0 && sb > 0) {
      const sbRate = sb / games;
      if (sbRate >= 0.15) warEstimate += 0.3; // 25+ SB pace
      else if (sbRate >= 0.06) warEstimate += 0.1; // 10+ SB pace
    }
    
    // Playing time bonus
    if (games >= 140) warEstimate += 0.5; // Full season
    else if (games >= 100) warEstimate += 0.0;
    else warEstimate -= 0.5; // Part-time player
    
    console.log('CVR: Estimated hitter WAR:', warEstimate);
    return Math.max(-2.0, Math.min(8.0, warEstimate)); // Cap between -2 and 8
  }
  
  console.log('CVR: No valid stats for WAR estimation');
  return 0; // No meaningful stats
};
/**
 * Convert estimated WAR to CVR multiplier
 */
const getWARMultiplier = (estimatedWAR) => {
  console.log('CVR: Converting estimated WAR to multiplier:', estimatedWAR);
  
  let warMultiplier;
  
  // Convert WAR to aggressive multiplier (0.5 to 1.8 range)
  if (estimatedWAR >= 6) {
    warMultiplier = 1.8; // Superstar WAR - massive bonus
  } else if (estimatedWAR >= 4) {
    warMultiplier = 1.5; // Elite WAR - huge bonus
  } else if (estimatedWAR >= 2.5) {
    warMultiplier = 1.3; // Very good WAR - big bonus
  } else if (estimatedWAR >= 1.5) {
    warMultiplier = 1.15; // Good WAR - solid bonus
  } else if (estimatedWAR >= 0.5) {
    warMultiplier = 1.0; // Average WAR - neutral
  } else if (estimatedWAR >= -0.5) {
    warMultiplier = 0.9; // Slightly below average
  } else if (estimatedWAR >= -1.5) {
    warMultiplier = 0.75; // Poor WAR - big penalty
  } else {
    warMultiplier = 0.5; // Terrible WAR - massive penalty
  }
  
  console.log('CVR: WAR multiplier applied:', warMultiplier);
  return warMultiplier;
};

/**
 * Get salary tier multiplier based on salary range - BALANCED FOR ELITE PLAYERS
 * Lower multipliers = easier to achieve good CVR for that salary tier
 */
const getSalaryTier = (salary) => {
  if (salary >= 35000000) return 1.4; // Ultra-mega contracts (Judge, Ohtani level) - reduced penalty
  if (salary >= 25000000) return 1.3; // Superstar contracts - reduced penalty
  if (salary >= 15000000) return 1.2; // Star contracts - reduced penalty
  if (salary >= 8000000) return 1.1;  // Above average - slight penalty
  if (salary >= 3000000) return 1.0;  // Average MLB salary - neutral
  if (salary >= 1000000) return 0.95; // Below average - slight bonus
  return 0.9; // Minimum/rookie contracts - bigger bonus
};

/**
 * Calculate CVR using simple value score divided by salary expectations
 */
export const calculatePlayerCVR = async (playerData, salaryData, leagueData = null) => {
  console.log('🚨 CVR FUNCTION CALLED! Version 3.0');
  try {
    console.log('CVR Input - playerData:', playerData);
    console.log('CVR Input - salaryData:', salaryData);
    
    if (!playerData || !playerData.stats) {
      console.log('CVR: No player data');
      return { cvr: null, salaryType: 'unknown', explanation: 'No player data' };
    }

    // Extract salary
    let salary = null;
    if (salaryData && typeof salaryData === 'object') {
      salary = salaryData.salary || salaryData.amount || salaryData.value;
    } else if (typeof salaryData === 'number') {
      salary = salaryData;
    }

    if (!salary || salary <= 0) {
      console.log('CVR: No valid salary data');
      return { cvr: null, salaryType: 'unknown', explanation: 'No salary data available' };
    }

    const salaryType = salaryData?.type || (salary < 1000000 ? 'rookie' : 'contract');
    const stats = playerData.stats;
    
    console.log('CVR: Processing stats:', stats);
    console.log('CVR: Salary:', salary, 'Type:', salaryType);
    
    // Calculate player value score
    const baseValueScore = calculatePlayerValueScore(stats);
    console.log('CVR: Base player value score:', baseValueScore);
    
    if (baseValueScore <= 0) {
      console.log('CVR: Zero base value score, returning null CVR');
      return { cvr: null, salaryType, explanation: 'Insufficient performance data' };
    }
    
    // Apply WAR multiplier to enhance the base score
    const estimatedWAR = calculateEstimatedWAR(stats);
    const warMultiplier = getWARMultiplier(estimatedWAR);
    const valueScore = Math.round(baseValueScore * warMultiplier);
    console.log('CVR: Final value score after WAR adjustment:', valueScore, '(base:', baseValueScore, '× estimated WAR:', estimatedWAR, '→ multiplier:', warMultiplier, ')');
    
    // Get salary tier expectations
    const salaryTier = getSalaryTier(salary);
    console.log('CVR: Salary tier multiplier:', salaryTier);
    
    // Calculate CVR using normalized 0-2 scale where 1.0 = average value
    // CVR = (Value Score / 50) / (Salary Tier / 1.0) 
    // This creates a scale where 1.0 is average, 0.5 is poor, 1.5+ is excellent
    const normalizedValueScore = valueScore / 50; // Convert 0-100 scale to 0-2 scale (50 = average performance)
    const normalizedSalaryTier = salaryTier / 1.0; // Salary tier already around 1.0 average
    const cvr = normalizedValueScore / normalizedSalaryTier; 
    
    console.log('CVR: Final calculated CVR:', cvr, '(normalized 0-2 scale where 1.0 = average)');
    
    // Create explanation
    let explanation = `${baseValueScore}/100 performance`;
    if (warMultiplier !== 1.0) {
      explanation += ` × ${warMultiplier} WAR (${estimatedWAR.toFixed(1)})`;
    }
    explanation += ` ÷ ${salaryTier}x salary tier = ${cvr.toFixed(2)} CVR`;
    
    if (cvr >= 1.8) explanation += ' (Elite Value)';
    else if (cvr >= 1.5) explanation += ' (Excellent Value)';
    else if (cvr >= 1.2) explanation += ' (Good Value)';
    else if (cvr >= 0.8) explanation += ' (Fair Value)';
    else if (cvr >= 0.5) explanation += ' (Below Average)';
    else explanation += ' (Poor Value)';
    
    return {
      cvr: Math.round(cvr * 100) / 100, // Round to 2 decimal places (0.00-2.00 scale)
      salaryType,
      valueScore: Math.round(valueScore),
      baseValueScore: Math.round(baseValueScore),
      estimatedWAR: Math.round(estimatedWAR * 10) / 10,
      warMultiplier: warMultiplier,
      salaryTier: salaryTier,
      explanation: explanation
    };
    
  } catch (error) {
    console.error('CVR calculation error:', error);
    return {
      cvr: null,
      salaryType: 'unknown',
      explanation: 'Error calculating CVR'
    };
  }
};

/**
 * Calculate batting performance score (0-100)
 */
export const calculateBattingPerformance = (stats) => {
  if (!stats || !stats.batting) return 0;
  
  const batting = stats.batting;
  const avg = parseFloat(batting.battingAverage) || 0;
  const obp = parseFloat(batting.onBasePercentage) || 0;
  const slg = parseFloat(batting.sluggingPercentage) || 0;
  const hr = parseInt(batting.homeRuns) || 0;
  const rbi = parseInt(batting.rbi) || 0;
  const sb = parseInt(batting.stolenBases) || 0;
  
  // Normalized scoring (0-100 scale)
  const avgScore = Math.min(100, (avg / 0.350) * 100); // .350 = elite
  const obpScore = Math.min(100, (obp / 0.450) * 100); // .450 = elite
  const slgScore = Math.min(100, (slg / 0.650) * 100); // .650 = elite
  const hrScore = Math.min(100, (hr / 50) * 100); // 50 HR = elite
  const rbiScore = Math.min(100, (rbi / 130) * 100); // 130 RBI = elite
  const sbScore = Math.min(100, (sb / 50) * 100); // 50 SB = elite
  
  // Weighted composite score
  return (avgScore * 0.2 + obpScore * 0.25 + slgScore * 0.25 + hrScore * 0.15 + rbiScore * 0.1 + sbScore * 0.05);
};

/**
 * Calculate pitching performance score (0-100)
 */
export const calculatePitchingPerformance = (stats) => {
  if (!stats || !stats.pitching) return 0;
  
  const pitching = stats.pitching;
  const era = parseFloat(pitching.era) || 999;
  const whip = parseFloat(pitching.whip) || 999;
  const k9 = parseFloat(pitching.strikeoutsPerNine) || 0;
  const ip = parseFloat(pitching.inningsPitched) || 0;
  const wins = parseInt(pitching.wins) || 0;
  
  // Normalized scoring (lower ERA/WHIP is better, higher K/9 is better)
  const eraScore = era < 7 ? Math.max(0, (7 - era) / 7) * 100 : 0;
  const whipScore = whip < 2 ? Math.max(0, (2 - whip) / 2) * 100 : 0;
  const k9Score = Math.min(100, (k9 / 12) * 100); // 12 K/9 = excellent
  const ipScore = Math.min(100, (ip / 200) * 100); // 200 IP = workhorse
  const winScore = Math.min(100, (wins / 20) * 100); // 20 wins = excellent
  
  // Weighted composite score
  return (eraScore * 0.3 + whipScore * 0.25 + k9Score * 0.2 + ipScore * 0.15 + winScore * 0.1);
};

/**
 * Calculate salary efficiency based on player's salary type
 */
export const calculateSalaryEfficiency = (salary, salaryType, leagueAverageSalary = 4500000) => {
  const salaryRatio = salary / leagueAverageSalary;
  
  // Adjust efficiency calculation based on salary type
  switch (salaryType) {
    case 'rookie':
      // Rookie contracts are team-friendly, so they get efficiency bonus
      return Math.max(0.5, 1 / (salaryRatio * 0.7)); // 30% efficiency bonus
    
    case 'arbitration':
      // Arbitration salaries are market-adjusted, so standard calculation
      return Math.max(0.1, 1 / salaryRatio);
    
    case 'free-agent':
      // Free agent contracts are market rate, standard calculation
      return Math.max(0.1, 1 / salaryRatio);
    
    case 'extension':
      // Extensions can vary, use standard calculation
      return Math.max(0.1, 1 / salaryRatio);
    
    default:
      return Math.max(0.1, 1 / salaryRatio);
  }
};

/**
 * Calculate performance score based on player type and stats
 */
export const calculatePerformanceScore = (playerStats, playerType) => {
  if (!playerStats) return 0;

  if (playerType === 'pitcher') {
    const stats = playerStats.pitching || {};
    
    // Key pitching metrics with weights
    const era = parseFloat(stats.era) || 999;
    const whip = parseFloat(stats.whip) || 999;
    const k9 = parseFloat(stats.strikeoutsPerNine) || 0;
    const ip = parseFloat(stats.inningsPitched) || 0;
    const wins = parseInt(stats.wins) || 0;
    
    // Normalized scoring (lower ERA/WHIP is better, higher K/9 is better)
    const eraScore = era < 7 ? Math.max(0, (7 - era) / 7) * 100 : 0;
    const whipScore = whip < 2 ? Math.max(0, (2 - whip) / 2) * 100 : 0;
    const k9Score = Math.min(100, (k9 / 12) * 100); // 12 K/9 = excellent
    const ipScore = Math.min(100, (ip / 200) * 100); // 200 IP = workhorse
    const winScore = Math.min(100, (wins / 20) * 100); // 20 wins = excellent
    
    // Weighted composite score
    return (eraScore * 0.3 + whipScore * 0.25 + k9Score * 0.2 + ipScore * 0.15 + winScore * 0.1);
    
  } else {
    // Hitter scoring
    const stats = playerStats.batting || {};
    
    const avg = parseFloat(stats.battingAverage) || 0;
    const obp = parseFloat(stats.onBasePercentage) || 0;
    const slg = parseFloat(stats.sluggingPercentage) || 0;
    const hr = parseInt(stats.homeRuns) || 0;
    const rbi = parseInt(stats.rbi) || 0;
    const sb = parseInt(stats.stolenBases) || 0;
    
    // Normalized scoring
    const avgScore = Math.min(100, (avg / 0.350) * 100); // .350 = elite
    const obpScore = Math.min(100, (obp / 0.450) * 100); // .450 = elite
    const slgScore = Math.min(100, (slg / 0.650) * 100); // .650 = elite
    const hrScore = Math.min(100, (hr / 50) * 100); // 50 HR = elite
    const rbiScore = Math.min(100, (rbi / 130) * 100); // 130 RBI = elite
    const sbScore = Math.min(100, (sb / 50) * 100); // 50 SB = elite
    
    // Weighted composite score
    return (avgScore * 0.2 + obpScore * 0.25 + slgScore * 0.25 + hrScore * 0.15 + rbiScore * 0.1 + sbScore * 0.05);
  }
};

/**
 * Calculate CVR for a single player with enhanced salary type handling
 * CVR = (Performance Score / League Average Performance) / (Salary / League Average Salary)
 * Special handling for arbitration, rookie, and minimum wage contracts
 */
export const calculateCVRLegacy = (playerStats, playerType, salary, salaryType = 'contract', leagueAverageSalary = 4500000) => {
  if (!salary || salary <= 0) return null;
  
  const performanceScore = calculatePerformanceScore(playerStats, playerType);
  if (performanceScore <= 0) return null;
  
  // League average performance is assumed to be 50 (middle of 0-100 scale)
  const leagueAveragePerformance = 50;
  
  // Normalized performance ratio
  const performanceRatio = performanceScore / leagueAveragePerformance;
  
  // Adjust salary comparison based on contract type
  let adjustedLeagueAverage = leagueAverageSalary;
  let salaryMultiplier = 1;
  
  // Special handling for different salary types
  if (salaryType === 'arbitration' || salary < 1000000) {
    // Arbitration players: Compare to arbitration-eligible average (~2M)
    adjustedLeagueAverage = 2000000;
    salaryMultiplier = 1.2; // Slight bonus for cost-controlled talent
  } else if (salaryType === 'rookie' || salary < 750000) {
    // Rookie/minimum wage: Compare to minimum wage (~740K)
    adjustedLeagueAverage = 740000;
    salaryMultiplier = 1.5; // Significant bonus for rookie contracts
  } else if (salary > 20000000) {
    // Superstar contracts: Higher standards
    salaryMultiplier = 0.9; // Slight penalty for mega contracts
  }
  
  // Normalized salary ratio with adjustments
  const salaryRatio = salary / adjustedLeagueAverage;
  
  // CVR = Performance per dollar relative to appropriate comparison group
  const cvr = (performanceRatio * salaryMultiplier) / salaryRatio;
  
  return Math.round(cvr * 100) / 100; // Round to 2 decimal places
};

/**
 * Get CVR color and description based on new 0-2 scale where 1.0 = average
 * CVR = Player Value Score / Salary Tier Expectations (normalized)
 */
export const getCVRDisplay = (cvr) => {
  if (!cvr || cvr === null) {
    return {
      value: '---',
      color: 'text.secondary',
      description: 'No salary data',
      emoji: '❓'
    };
  }
  
  if (cvr >= 1.8) {
    return {
      value: cvr.toFixed(2),
      color: '#00C851', // Bright green
      description: 'Elite Value',
      emoji: '💎',
      grade: 'A++',
      context: 'Exceptional performance for any salary'
    };
  } else if (cvr >= 1.5) {
    return {
      value: cvr.toFixed(2),
      color: '#4CAF50', // Green
      description: 'Excellent Value',
      emoji: '🔥',
      grade: 'A+',
      context: 'Outstanding performance for the salary'
    };
  } else if (cvr >= 1.2) {
    return {
      value: cvr.toFixed(2),
      color: '#8BC34A', // Light green
      description: 'Good Value',
      emoji: '✅',
      grade: 'A',
      context: 'Strong performance for the money'
    };
  } else if (cvr >= 0.8) {
    return {
      value: cvr.toFixed(2),
      color: '#FFC107', // Amber
      description: 'Fair Value',
      emoji: '⚡',
      grade: 'B+',
      context: 'Decent return on investment'
    };
  } else if (cvr >= 0.5) {
    return {
      value: cvr.toFixed(2),
      color: '#FF9800', // Orange
      description: 'Below Average',
      emoji: '⚠️',
      grade: 'C+',
      context: 'Underperforming salary expectations'
    };
  } else if (cvr >= 0.3) {
    return {
      value: cvr.toFixed(2),
      color: '#FF5722', // Deep orange
      description: 'Poor Value',
      emoji: '📉',
      grade: 'C',
      context: 'Significant underperformance'
    };
  } else {
    return {
      value: cvr.toFixed(2),
      color: '#F44336', // Red
      description: 'Very Poor Value',
      emoji: '💸',
      grade: 'D',
      context: 'Major overpay for production'
    };
  }
};

/**
 * Format salary for display
 */
export const formatSalary = (salary) => {
  if (!salary || salary <= 0) return 'No data';
  
  if (salary >= 1000000) {
    return `$${(salary / 1000000).toFixed(1)}M`;
  } else if (salary >= 1000) {
    return `$${(salary / 1000).toFixed(0)}K`;
  } else {
    return `$${salary.toLocaleString()}`;
  }
};

/**
 * Determine salary type based on amount and context
 */
export const getSalaryType = (salary, playerYears = null) => {
  if (!salary || salary <= 0) return 'unknown';
  
  if (salary <= 750000) {
    return 'minimum'; // MLB minimum wage
  } else if (salary <= 1000000) {
    return 'rookie'; // Likely rookie contract or near-minimum
  } else if (salary <= 3000000) {
    return 'arbitration'; // Typical arbitration range
  } else if (salary <= 10000000) {
    return 'contract'; // Mid-level free agent
  } else if (salary <= 25000000) {
    return 'premium'; // High-end contract
  } else {
    return 'superstar'; // Mega contract
  }
};

/**
 * Get display-friendly salary type description
 */
export const getSalaryTypeDisplay = (salaryType) => {
  const types = {
    'minimum': 'Minimum Wage',
    'rookie': 'Rookie Contract',
    'arbitration': 'Arbitration Eligible', 
    'contract': 'Standard Contract',
    'premium': 'Premium Contract',
    'superstar': 'Superstar Contract',
    'extension': 'Contract Extension',
    'unknown': 'Unknown Contract'
  };
  
  return types[salaryType] || 'Unknown Contract';
};

/**
 * Calculate CVR for multiple players (for comparisons)
 */
export const calculateMultiplePlayerCVR = async (playersData) => {
  const results = [];
  
  for (const playerData of playersData) {
    const cvr = await calculatePlayerCVR(
      playerData.stats,
      playerData.salary,
      playerData.league
    );
    
    results.push({
      ...playerData,
      cvr
    });
  }
  
  return results;
};

/**
 * Get CVR ranking description (0-2 scale)
 */
export const getCVRRanking = (cvr) => {
  if (cvr >= 1.8) return { tier: 'Elite Value', color: '#4CAF50', emoji: '💎' };
  if (cvr >= 1.5) return { tier: 'Excellent Value', color: '#8BC34A', emoji: '💪' };
  if (cvr >= 1.2) return { tier: 'Good Value', color: '#FFC107', emoji: '👍' };
  if (cvr >= 0.8) return { tier: 'Fair Value', color: '#FF9800', emoji: '👌' };
  if (cvr >= 0.5) return { tier: 'Below Average', color: '#FF5722', emoji: '👎' };
  return { tier: 'Poor Value', color: '#F44336', emoji: '💸' };
};

/**
 * Compare two players' CVR values
 */
export const compareCVR = (cvrA, cvrB) => {
  if (!cvrA || !cvrB) return null;
  
  const difference = cvrA - cvrB;
  const percentDifference = ((difference / cvrB) * 100);
  
  return {
    difference: Math.round(difference * 100) / 100,
    percentDifference: Math.round(percentDifference * 10) / 10,
    betterValue: difference > 0 ? 'A' : 'B',
    description: Math.abs(percentDifference) > 25 
      ? 'Significantly different value'
      : Math.abs(percentDifference) > 10 
        ? 'Moderately different value'
        : 'Similar value'
  };
};
