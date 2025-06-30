// Player statistics calculation utilities for The Cycle Flutter app
// This file contains utility functions for calculating and converting player statistics

import 'mlb_stats_formatter.dart';

/// Utility class for calculating MLB player statistics
class PlayerStatsCalculator {
  /// Calculate batting average from hits and at-bats
  static double calculateBattingAverage(int hits, int atBats) {
    if (atBats == 0) return 0.0;
    return hits / atBats;
  }

  /// Format calculated batting average
  static String formatCalculatedBattingAverage(int hits, int atBats) {
    double avg = calculateBattingAverage(hits, atBats);
    return MLBStatsFormatter.formatBattingAverage(avg);
  }

  /// Calculate on-base percentage (OBP) from hits, walks, HBP, and plate appearances
  static double calculateOBP(int hits, int walks, int hitByPitch, int plateAppearances) {
    if (plateAppearances == 0) {
      return 0.0;
    }
    return (hits + walks + hitByPitch) / plateAppearances;
  }

  /// Calculate slugging percentage (SLG) from total bases and at-bats
  static double calculateSLG(int totalBases, int atBats) {
    if (atBats == 0) return 0.0;
    return totalBases / atBats;
  }

  /// Calculate OPS (On-base Plus Slugging)
  static double calculateOPS(double obp, double slg) {
    return obp + slg;
  }

  /// Calculate ERA (Earned Run Average) from earned runs and innings pitched
  static double calculateERA(int earnedRuns, double inningsPitched) {
    if (inningsPitched == 0) {
      return 0.0;
    }
    return (earnedRuns * 9) / inningsPitched;
  }

  /// Calculate WHIP (Walks and Hits per Inning Pitched)
  static double calculateWHIP(int walks, int hits, double inningsPitched) {
    if (inningsPitched == 0) {
      return 0.0;
    }
    return (walks + hits) / inningsPitched;
  }

  /// Calculate K/9 (Strikeouts per 9 innings)
  static double calculateKper9(int strikeouts, double inningsPitched) {
    if (inningsPitched == 0) {
      return 0.0;
    }
    return (strikeouts * 9) / inningsPitched;
  }

  /// Calculate BB/9 (Walks per 9 innings)
  static double calculateBBper9(int walks, double inningsPitched) {
    if (inningsPitched == 0) {
      return 0.0;
    }
    return (walks * 9) / inningsPitched;
  }

  /// Calculate K/BB ratio (Strikeout to Walk ratio)
  static double calculateKBBRatio(int strikeouts, int walks) {
    if (walks == 0) return 0.0;
    return strikeouts / walks;
  }

  /// Calculate batting average against (BAA)
  static double calculateBAA(int hitsAllowed, int atBatsFaced) {
    if (atBatsFaced == 0) {
      return 0.0;
    }
    return hitsAllowed / atBatsFaced;
  }

  /// Calculate total bases from hits breakdown
  static int calculateTotalBases(int singles, int doubles, int triples, int homeRuns) {
    return singles + (doubles * 2) + (triples * 3) + (homeRuns * 4);
  }

  /// Calculate isolated power (ISO) as SLG - AVG
  static double calculateISO(double slg, double avg) {
    return slg - avg;
  }

  /// Calculate batting average on balls in play (BABIP)
  static double calculateBABIP(int hits, int homeRuns, int atBats, int strikeouts, int sacrificeFlies) {
    int denominator = atBats - strikeouts - homeRuns + sacrificeFlies;
    if (denominator == 0) return 0.0;
    
    return (hits - homeRuns) / denominator;
  }

  /// Convert string stats to numeric for calculations
  static double parseStatToDouble(String? stat) {
    if (stat == null || stat.isEmpty) return 0.0;
    
    // Handle stats that start with a period (like batting average)
    if (stat.startsWith('.')) {
      return double.tryParse('0$stat') ?? 0.0;
    }
    
    return double.tryParse(stat) ?? 0.0;
  }

  /// Convert string stats to integer for calculations
  static int parseStatToInt(String? stat) {
    if (stat == null || stat.isEmpty) return 0;
    return int.tryParse(stat) ?? 0;
  }

  /// Convert innings pitched from string format (e.g. "7.1" means 7⅓ innings)
  static double parseInningsPitched(String? inningsPitched) {
    if (inningsPitched == null || inningsPitched.isEmpty) return 0.0;
    
    try {
      if (inningsPitched.contains('.')) {
        final parts = inningsPitched.split('.');
        final fullInnings = int.tryParse(parts[0]) ?? 0;
        final fraction = int.tryParse(parts[1]) ?? 0;
        
        // Convert to true decimal (0.1 = 1/3 inning, 0.2 = 2/3 inning)
        double fractionalInnings = 0.0;
        if (fraction == 1) {
          fractionalInnings = 1/3;
        } else if (fraction == 2) {
          fractionalInnings = 2/3;
        }
        
        return fullInnings + fractionalInnings;
      } else {
        return double.tryParse(inningsPitched) ?? 0.0;
      }
    } catch (e) {
      return 0.0;
    }
  }

  /// Format innings pitched from decimal to string representation (e.g., 7.33 to "7.1")
  static String formatInningsPitchedToString(double? inningsPitched) {
    if (inningsPitched == null) return '0.0';
    
    int fullInnings = inningsPitched.floor();
    double fraction = inningsPitched - fullInnings;
    
    // Convert decimal fraction to baseball notation (1/3 = .1, 2/3 = .2)
    String fractionStr = '';
    if (fraction > 0 && fraction < 0.4) {
      fractionStr = '.1';
    } else if (fraction >= 0.4 && fraction < 0.8) {
      fractionStr = '.2';
    } else if (fraction >= 0.8) {
      fullInnings += 1;
      fractionStr = '.0';
    } else {
      fractionStr = '.0';
    }
    
    return '$fullInnings$fractionStr';
  }

  /// Calculate winning percentage from wins and losses
  static double calculateWinningPct(int? wins, int? losses) {
    if (wins == null || losses == null) return 0.0;
    if (wins == 0 && losses == 0) return 0.0;
    
    return wins / (wins + losses);
  }

  /// Calculate games back in standings
  static double calculateGamesBack(int? leaderWins, int? leaderLosses, int? teamWins, int? teamLosses) {
    if (leaderWins == null || leaderLosses == null || teamWins == null || teamLosses == null) {
      return 0.0;
    }
    
    if (leaderWins == teamWins && leaderLosses == teamLosses) return 0.0;
    
    return ((leaderWins - teamWins) + (teamLosses - leaderLosses)) / 2;
  }
}
