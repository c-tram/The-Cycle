// Team model extensions for MLB team data formatting
import 'package:the_cycle_flutter/models/team.dart';
import 'package:the_cycle_flutter/utils/mlb_stats_formatter.dart';
import 'package:the_cycle_flutter/utils/team_data_formatter.dart';

/// Extension on Team class to format team data using utility functions
extension TeamFormatting on Team {
  /// Get formatted team record as "W-L"
  String get formattedRecord {
    if (record == null) return '0-0';
    return TeamDataFormatter.formatTeamRecord(record!.wins, record!.losses);
  }
  
  /// Get formatted winning percentage
  String get winningPercentage {
    if (record == null || record!.winPercentage == null) return '.000';
    return MLBStatsFormatter.formatWinningPct(record!.winPercentage);
  }
  
  /// Get formatted games behind leader
  String get gamesBehind {
    if (record == null || record!.gamesBehind == null) return '-';
    return MLBStatsFormatter.formatGB(record!.gamesBehind);
  }
  
  /// Get team primary color
  String get primaryColor {
    return TeamDataFormatter.getTeamPrimaryColor(code);
  }
  
  /// Get team secondary color
  String get secondaryColor {
    return TeamDataFormatter.getTeamSecondaryColor(code);
  }
  
  /// Get standardized league abbreviation (AL/NL)
  String get leagueAbbreviation {
    if (league.toLowerCase().contains('american')) return 'AL';
    if (league.toLowerCase().contains('national')) return 'NL';
    return league;
  }
  
  /// Get standardized division abbreviation (East/Central/West)
  String get divisionAbbreviation {
    if (division.toLowerCase().contains('east')) return 'East';
    if (division.toLowerCase().contains('central')) return 'Central';
    if (division.toLowerCase().contains('west')) return 'West';
    return division;
  }
  
  /// Get formatted division name (e.g., "AL East")
  String get formattedDivision {
    return '$leagueAbbreviation $divisionAbbreviation';
  }
  
  /// Check if team is in American League
  bool get isAL => leagueAbbreviation == 'AL';
  
  /// Check if team is in National League
  bool get isNL => leagueAbbreviation == 'NL';
  
  /// Get win-loss differential
  int get differential => record != null ? record!.wins - record!.losses : 0;
  
  /// Check if team has a winning record
  bool get hasWinningRecord => differential > 0;
  
  /// Check if team has a losing record
  bool get hasLosingRecord => differential < 0;
  
  /// Check if team has an even record
  bool get hasEvenRecord => differential == 0;
}
