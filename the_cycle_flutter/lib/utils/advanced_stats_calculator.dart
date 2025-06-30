// Advanced MLB statistics utilities for The Cycle Flutter app
// This file contains utility functions for calculating and formatting advanced MLB statistics

/// Utility class for advanced baseball statistics
class AdvancedStatsCalculator {
  /// Calculate FIP (Fielding Independent Pitching)
  /// FIP = ((13 * HR) + (3 * (BB + HBP)) - (2 * K)) / IP + constant
  /// The constant is typically around 3.2 but varies by season
  static double calculateFIP({
    required int homeRuns,
    required int walks,
    required int hitByPitch,
    required int strikeouts,
    required double inningsPitched,
    double constant = 3.2,
  }) {
    if (inningsPitched == 0) return 0.0;
    
    double numerator = (13 * homeRuns) + (3 * (walks + hitByPitch)) - (2 * strikeouts) * 1.0;
    return (numerator / inningsPitched) + constant;
  }
  
  /// Calculate wOBA (Weighted On-Base Average)
  static double calculateWOBA({
    required int walks,
    required int hitByPitch,
    required int singles,
    required int doubles,
    required int triples,
    required int homeRuns,
    required int atBats,
    required int sacrificeFlies,
    double walkWeight = 0.69,
    double hbpWeight = 0.719,
    double singleWeight = 0.87,
    double doubleWeight = 1.217,
    double tripleWeight = 1.529,
    double homeRunWeight = 1.94,
  }) {
    int plateAppearances = atBats + walks + hitByPitch + sacrificeFlies;
    if (plateAppearances == 0) return 0.0;
    
    double numerator = (walkWeight * walks) +
                       (hbpWeight * hitByPitch) +
                       (singleWeight * singles) +
                       (doubleWeight * doubles) +
                       (tripleWeight * triples) +
                       (homeRunWeight * homeRuns);
                       
    return numerator / plateAppearances;
  }
  
  /// Calculate OPS+ (On-base Plus Slugging Plus)
  /// OPS+ = 100 * (OBP / lgOBP + SLG / lgSLG - 1)
  static double calculateOPSPlus({
    required double obp,
    required double slg,
    required double leagueOBP,
    required double leagueSLG,
    double ballparkFactor = 1.0,
  }) {
    if (leagueOBP == 0 || leagueSLG == 0) return 0.0;
    
    return 100 * ((obp / leagueOBP) + (slg / leagueSLG) - 1) / ballparkFactor;
  }
  
  /// Calculate ERA+ (Earned Run Average Plus)
  /// ERA+ = 100 * (lgERA / ERA)
  static double calculateERAPlus({
    required double era,
    required double leagueERA,
    double ballparkFactor = 1.0,
  }) {
    if (era == 0) return 0.0;
    
    return 100 * (leagueERA / era) / ballparkFactor;
  }
  
  /// Format advanced stat with appropriate decimal places
  static String formatAdvancedStat(double? value, {int decimalPlaces = 1}) {
    if (value == null) return '0.0';
    
    return value.toStringAsFixed(decimalPlaces);
  }
  
  /// Format OPS+ or ERA+ (integer representation)
  static String formatPlusStat(double? value) {
    if (value == null) return '100';
    
    return value.round().toString();
  }
  
  /// Calculate batting average on balls in play (BABIP)
  /// BABIP = (H - HR) / (AB - K - HR + SF)
  static double calculateBABIP({
    required int hits,
    required int homeRuns,
    required int atBats,
    required int strikeouts,
    required int sacrificeFlies,
  }) {
    int denominator = atBats - strikeouts - homeRuns + sacrificeFlies;
    if (denominator == 0) return 0.0;
    
    return (hits - homeRuns) / denominator;
  }
  
  /// Calculate isolated power (ISO)
  /// ISO = SLG - AVG
  static double calculateISO({required double slg, required double avg}) {
    return slg - avg;
  }
  
  /// Calculate fielding-independent ERA (FIP) for display
  static String formatFIP(double? fip) {
    if (fip == null) return '0.00';
    return fip.toStringAsFixed(2);
  }
  
  /// Format WAR (Wins Above Replacement) with 1 decimal place
  static String formatWAR(double? war) {
    if (war == null) return '0.0';
    return war.toStringAsFixed(1);
  }
}
