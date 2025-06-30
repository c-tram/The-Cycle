// MLB standings formatting utilities for The Cycle Flutter app
// This file contains utility functions for formatting MLB standings data

import 'package:the_cycle_flutter/models/team.dart';
import 'package:the_cycle_flutter/utils/mlb_stats_formatter.dart';

/// Utility class for handling MLB standings data
class StandingsFormatter {
  /// Sort teams by division rank
  static List<Team> sortTeamsByDivisionRank(List<Team> teams) {
    return List<Team>.from(teams)
      ..sort((a, b) {
        if (a.record?.divisionRank == null && b.record?.divisionRank == null) {
          return 0;
        } else if (a.record?.divisionRank == null) {
          return 1;
        } else if (b.record?.divisionRank == null) {
          return -1;
        } else {
          return a.record!.divisionRank!.compareTo(b.record!.divisionRank!);
        }
      });
  }

  /// Group teams by division
  static Map<String, List<Team>> groupTeamsByDivision(List<Team> teams) {
    final divisions = <String, List<Team>>{};
    
    for (final team in teams) {
      if (!divisions.containsKey(team.division)) {
        divisions[team.division] = [];
      }
      divisions[team.division]!.add(team);
    }
    
    // Sort each division by rank
    for (final division in divisions.keys) {
      divisions[division] = sortTeamsByDivisionRank(divisions[division]!);
    }
    
    return divisions;
  }

  /// Group teams by league
  static Map<String, List<Team>> groupTeamsByLeague(List<Team> teams) {
    final leagues = <String, List<Team>>{};
    
    for (final team in teams) {
      String league = team.league;
      if (!leagues.containsKey(league)) {
        leagues[league] = [];
      }
      leagues[league]!.add(team);
    }
    
    return leagues;
  }

  /// Calculate games back for teams in a division
  static List<Team> calculateGamesBehind(List<Team> teams) {
    // Find division leader
    Team leader = teams.firstWhere(
      (team) => team.record?.divisionRank == 1,
      orElse: () => teams.first,
    );
    
    if (leader.record == null) return teams;
    
    // Calculate GB for each team
    for (var i = 0; i < teams.length; i++) {
      if (teams[i].record == null) continue;
      if (teams[i].code == leader.code) continue;
      
      double gb = (leader.record!.wins - teams[i].record!.wins + 
                   teams[i].record!.losses - leader.record!.losses) / 2;
      
      // Create a new TeamRecord with calculated GB
      teams[i] = Team(
        name: teams[i].name,
        code: teams[i].code,
        division: teams[i].division,
        league: teams[i].league,
        logoUrl: teams[i].logoUrl,
        record: TeamRecord(
          wins: teams[i].record!.wins,
          losses: teams[i].record!.losses,
          winPercentage: teams[i].record!.winPercentage,
          gamesBehind: gb,
          divisionRank: teams[i].record!.divisionRank,
        ),
      );
    }
    
    return teams;
  }

  /// Format division standings title
  static String formatDivisionTitle(String division) {
    // Convert full division name to standard format (e.g., "American League East" to "AL East")
    if (division.toLowerCase().contains('american')) {
      return 'AL ' + division.split(' ').last;
    } else if (division.toLowerCase().contains('national')) {
      return 'NL ' + division.split(' ').last;
    }
    return division;
  }

  /// Format last 10 games record (e.g., "7-3")
  static String formatLast10(int wins, int losses) {
    return '$wins-$losses';
  }

  /// Calculate win-loss percentage for a team
  static double calculateWinPct(int? wins, int? losses) {
    if (wins == null || losses == null || (wins == 0 && losses == 0)) return 0.0;
    return wins / (wins + losses);
  }

  /// Format winning percentage for display
  static String formatWinPct(int? wins, int? losses) {
    double pct = calculateWinPct(wins, losses);
    return MLBStatsFormatter.formatWinningPct(pct);
  }
}
