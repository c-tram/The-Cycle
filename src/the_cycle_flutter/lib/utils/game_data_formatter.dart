// Game score and data formatting utilities for The Cycle Flutter app
// This file contains utility functions for formatting MLB game scores and related data

/// Utility class for formatting MLB game scores and related data
class GameDataFormatter {
  /// Format game score in the standard format
  static String formatGameScore(int homeScore, int awayScore) {
    return '$homeScore-$awayScore';
  }
  
  /// Format game time in standard MLB format (e.g., "7:05 PM")
  static String formatGameTime(String? timeString) {
    if (timeString == null || timeString.isEmpty) return 'TBD';
    
    try {
      final parts = timeString.split(':');
      final hour = int.parse(parts[0]);
      final minute = parts[1];
      final period = hour >= 12 ? 'PM' : 'AM';
      final formattedHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
      return '$formattedHour:$minute $period';
    } catch (e) {
      return timeString;
    }
  }
  
  /// Format game status (e.g., "Final", "In Progress", "Postponed")
  static String formatGameStatus(String? status) {
    if (status == null || status.isEmpty) return '';
    
    // Handle common status variations
    switch (status.toLowerCase()) {
      case 'final':
      case 'f':
        return 'Final';
      case 'in_progress':
      case 'inprogress':
      case 'live':
        return 'In Progress';
      case 'postponed':
      case 'ppd':
        return 'Postponed';
      case 'delayed':
        return 'Delayed';
      case 'suspended':
        return 'Suspended';
      default:
        return status;
    }
  }
  
  /// Format the inning and status (e.g., "Top 5", "Bottom 9")
  static String formatInning(int? inning, bool isTop) {
    if (inning == null) return '';
    
    String position = isTop ? 'Top' : 'Bottom';
    return '$position $inning';
  }
  
  /// Format date for game schedule display (e.g., "Wed, Jun 15")
  static String formatGameDate(DateTime? date, {bool includeYear = false}) {
    if (date == null) return '';
    
    final month = _getShortMonth(date.month);
    final dayOfWeek = _getShortDayOfWeek(date.weekday);
    
    if (includeYear) {
      return '$dayOfWeek, $month ${date.day}, ${date.year}';
    } else {
      return '$dayOfWeek, $month ${date.day}';
    }
  }
  
  /// Format series information (e.g., "Game 3 of 4")
  static String formatSeriesInfo(int? gameNumber, int? totalGames) {
    if (gameNumber == null || totalGames == null) return '';
    
    return 'Game $gameNumber of $totalGames';
  }
  
  /// Get abbreviated day of week
  static String _getShortDayOfWeek(int weekday) {
    switch (weekday) {
      case 1: return 'Mon';
      case 2: return 'Tue';
      case 3: return 'Wed';
      case 4: return 'Thu';
      case 5: return 'Fri';
      case 6: return 'Sat';
      case 7: return 'Sun';
      default: return '';
    }
  }
  
  /// Get abbreviated month
  static String _getShortMonth(int month) {
    switch (month) {
      case 1: return 'Jan';
      case 2: return 'Feb';
      case 3: return 'Mar';
      case 4: return 'Apr';
      case 5: return 'May';
      case 6: return 'Jun';
      case 7: return 'Jul';
      case 8: return 'Aug';
      case 9: return 'Sep';
      case 10: return 'Oct';
      case 11: return 'Nov';
      case 12: return 'Dec';
      default: return '';
    }
  }
  
  /// Format count (balls-strikes)
  static String formatCount(int? balls, int? strikes) {
    if (balls == null || strikes == null) return '';
    
    return '$balls-$strikes';
  }
  
  /// Format outs display
  static String formatOuts(int? outs) {
    if (outs == null) return '';
    
    return '$outs ${outs == 1 ? 'Out' : 'Outs'}';
  }
}
