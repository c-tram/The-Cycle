// MLB Statistics formatting utilities for The Cycle Flutter app
// This file contains utility functions for formatting MLB statistics consistently across the app

/// Utility class for formatting MLB statistics in Flutter application
class MLBStatsFormatter {
  /// Format batting average with 3 decimal places
  static String formatBattingAverage(dynamic average) {
    if (average == null) return '.000';
    
    // Handle if already formatted as string with leading dot
    if (average is String) {
      if (average.startsWith('.')) return average;
      if (average.startsWith('0.')) return '.' + average.substring(2);
      return average; // Return as is if it's already in the desired format
    }
    
    // Handle numeric values
    if (average is num) {
      return average.toStringAsFixed(3).replaceFirst('0.', '.');
    }
    
    return '.000'; // Default fallback
  }

  /// Format on-base percentage with 3 decimal places
  static String formatOBP(dynamic obp) {
    if (obp == null) return '.000';
    
    // Handle if already formatted as string with leading dot
    if (obp is String) {
      if (obp.startsWith('.')) return obp;
      if (obp.startsWith('0.')) return '.' + obp.substring(2);
      return obp;
    }
    
    // Handle numeric values
    if (obp is num) {
      return obp.toStringAsFixed(3).replaceFirst('0.', '.');
    }
    
    return '.000';
  }

  /// Format slugging percentage with 3 decimal places
  static String formatSLG(dynamic slg) {
    if (slg == null) return '.000';
    
    // Handle if already formatted as string with leading dot
    if (slg is String) {
      if (slg.startsWith('.')) return slg;
      if (slg.startsWith('0.')) return '.' + slg.substring(2);
      return slg;
    }
    
    // Handle numeric values
    if (slg is num) {
      return slg.toStringAsFixed(3).replaceFirst('0.', '.');
    }
    
    return '.000';
  }

  /// Format on-base plus slugging (OPS) with 3 decimal places
  static String formatOPS(dynamic ops) {
    if (ops == null) return '.000';
    
    // Handle if already formatted as string with leading dot
    if (ops is String) {
      if (ops.startsWith('.')) return ops;
      if (ops.startsWith('0.')) return '.' + ops.substring(2);
      // If OPS is over 1, preserve the leading digit
      if (ops.contains('.') && ops[0] != '.') return ops;
      return ops;
    }
    
    // Handle numeric values
    if (ops is num) {
      // Keep the leading digit for OPS values >= 1
      if (ops >= 1) {
        return ops.toStringAsFixed(3);
      } else {
        return ops.toStringAsFixed(3).replaceFirst('0.', '.');
      }
    }
    
    return '.000';
  }

  /// Format ERA with 2 decimal places
  static String formatERA(dynamic era) {
    if (era == null) return '0.00';
    
    // Handle if already formatted as string
    if (era is String) {
      // If it's already in the proper format, return it
      return era;
    }
    
    // Handle numeric values
    if (era is num) {
      return era.toStringAsFixed(2);
    }
    
    return '0.00';
  }

  /// Format WHIP with 2 decimal places
  static String formatWHIP(dynamic whip) {
    if (whip == null) return '0.00';
    
    // Handle if already formatted as string
    if (whip is String) {
      // If it's already in the proper format, return it
      return whip;
    }
    
    // Handle numeric values
    if (whip is num) {
      return whip.toStringAsFixed(2);
    }
    
    return '0.00';
  }

  /// Format innings pitched with 1 decimal place
  static String formatInningsPitched(dynamic ip) {
    if (ip == null) return '0.0';
    
    // Handle if already formatted as string
    if (ip is String) {
      // If it's already in the proper format, return it
      return ip;
    }
    
    // Handle numeric values
    if (ip is num) {
      return ip.toStringAsFixed(1);
    }
    
    return '0.0';
  }

  /// Format K/9 (strikeouts per 9 innings) with 1 decimal place
  static String formatKper9(dynamic kPer9) {
    if (kPer9 == null) return '0.0';
    
    // Handle if already formatted as string
    if (kPer9 is String) {
      // If it's already in the proper format, return it
      return kPer9;
    }
    
    // Handle numeric values
    if (kPer9 is num) {
      return kPer9.toStringAsFixed(1);
    }
    
    return '0.0';
  }

  /// Format winning percentage with 3 decimal places
  static String formatWinningPct(dynamic pct) {
    if (pct == null) return '.000';
    
    // Handle if already formatted as string with leading dot
    if (pct is String) {
      if (pct.startsWith('.')) return pct;
      if (pct.startsWith('0.')) return '.' + pct.substring(2);
      return pct;
    }
    
    // Handle numeric values
    if (pct is num) {
      return pct.toStringAsFixed(3).replaceFirst('0.', '.');
    }
    
    return '.000';
  }

  /// Format games back (GB) in standings
  static String formatGB(dynamic gb) {
    if (gb == null) return '-';
    
    // Handle if already formatted as string
    if (gb is String) {
      // If it's already formatted (like "-" for leader), return as is
      if (gb == '-') return gb;
      // Check if it already has the .0 format
      if (gb.contains('.')) return gb;
      return gb + '.0';
    }
    
    // Handle numeric values
    if (gb is num) {
      if (gb == 0) return '-';
      // Format with .0 extension
      return gb.toStringAsFixed(1);
    }
    
    return '-';
  }

  /// Format win-loss record for a team
  static String formatWinLossRecord(int wins, int losses) {
    return '$wins-$losses';
  }

  /// Format standings win percentage with 3 decimal places
  static String formatStandingsPct(dynamic pct) {
    return formatWinningPct(pct);
  }

  /// Format integer statistics like HR, RBI, etc.
  static String formatIntStat(dynamic stat) {
    if (stat == null) return '0';
    
    // Handle if already formatted as string
    if (stat is String) {
      // Try to convert to int
      try {
        return int.parse(stat).toString();
      } catch (e) {
        return stat;
      }
    }
    
    // Handle numeric values
    if (stat is num) {
      return stat.toInt().toString();
    }
    
    return '0';
  }

  /// Format team win-loss streak
  static String formatStreak(String? streak) {
    if (streak == null) return '-';
    return streak;
  }

  /// Format last 10 games record
  static String formatLast10(String? last10) {
    if (last10 == null) return '0-0';
    return last10;
  }
}
