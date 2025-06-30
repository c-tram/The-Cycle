// Game model extensions for MLB game data formatting
import 'package:the_cycle_flutter/models/game.dart';
import 'package:the_cycle_flutter/utils/game_data_formatter.dart';
import 'package:the_cycle_flutter/utils/team_data_formatter.dart';
import 'package:intl/intl.dart';

/// Extension on Game class to format game data using utility functions
extension GameFormatting on Game {
  /// Get formatted score as "Away Score - Home Score"
  String get formattedScore {
    if (homeScore == null || awayScore == null) return 'vs';
    return GameDataFormatter.formatGameScore(homeScore!, awayScore!);
  }
  
  /// Get formatted game time in standard MLB format
  String get formattedTime {
    if (time == null || time!.isEmpty) return 'TBD';
    return GameDataFormatter.formatGameTime(time!);
  }
  
  /// Get formatted game date (e.g., "Wed, Jun 15")
  String get formattedDate {
    try {
      final dateTime = DateTime.parse(date);
      return GameDataFormatter.formatGameDate(dateTime);
    } catch (e) {
      return date;
    }
  }
  
  /// Get formatted game date with year (e.g., "Wed, Jun 15, 2025")
  String get formattedDateWithYear {
    try {
      final dateTime = DateTime.parse(date);
      return GameDataFormatter.formatGameDate(dateTime, includeYear: true);
    } catch (e) {
      return date;
    }
  }
  
  /// Get formatted matchup as "Away @ Home"
  String get matchup {
    return '$awayTeam @ $homeTeam';
  }
  
  /// Get formatted matchup with team codes as "Away @ Home"
  String get matchupWithCodes {
    return '$awayTeamCode @ $homeTeamCode';
  }
  
  /// Get formatted game status text
  String get statusText {
    switch (status) {
      case GameStatus.completed:
        return 'Final';
      case GameStatus.scheduled:
        return formattedTime;
      case GameStatus.live:
        return 'Live';
    }
  }
  
  /// Get the full name of the home team
  String get homeTeamFullName {
    return TeamDataFormatter.getTeamNameFromCode(homeTeamCode);
  }
  
  /// Get the full name of the away team
  String get awayTeamFullName {
    return TeamDataFormatter.getTeamNameFromCode(awayTeamCode);
  }
  
  /// Get primary color for home team
  String get homeTeamColor {
    return TeamDataFormatter.getTeamPrimaryColor(homeTeamCode);
  }
  
  /// Get primary color for away team
  String get awayTeamColor {
    return TeamDataFormatter.getTeamPrimaryColor(awayTeamCode);
  }
  
  /// Get date in short format for display (e.g., "6/15")
  String get shortDate {
    try {
      final dateTime = DateTime.parse(date);
      return '${dateTime.month}/${dateTime.day}';
    } catch (e) {
      return date;
    }
  }
  
  /// Check if game is today
  bool get isToday {
    try {
      final gameDate = DateTime.parse(date);
      final today = DateTime.now();
      return gameDate.year == today.year && 
             gameDate.month == today.month && 
             gameDate.day == today.day;
    } catch (e) {
      return false;
    }
  }
  
  /// Get day of week for the game (e.g., "Monday")
  String get dayOfWeek {
    try {
      final dateTime = DateTime.parse(date);
      return DateFormat('EEEE').format(dateTime);
    } catch (e) {
      return '';
    }
  }
}
