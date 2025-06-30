import 'team.dart';

// Division model for the standings view
class Division {
  final String name;
  final String league;
  final List<Team> teams;

  Division({
    required this.name,
    required this.league,
    required this.teams,
  });

  factory Division.fromJson(Map<String, dynamic> json) {
    // Backend sends 'division' instead of 'name'
    final divisionName = json['division'] ?? json['name'] ?? 'Unknown Division';

    // Extract league from division name
    final league = divisionName.toLowerCase().contains('american')
        ? 'AL'
        : divisionName.toLowerCase().contains('national')
            ? 'NL'
            : 'Unknown';

    return Division(
      name: divisionName,
      league: league,
      teams: (json['teams'] as List? ?? [])
          .map((team) => Team.fromJson(team))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'league': league,
      'teams': teams.map((team) => team.toJson()).toList(),
    };
  }
}

// StandingsData class to store all divisions
class StandingsData {
  final List<Division> divisions;
  final DateTime lastUpdated;

  StandingsData({
    required this.divisions,
    required this.lastUpdated,
  });

  factory StandingsData.fromJson(Map<String, dynamic> json) {
    return StandingsData(
      divisions: (json['divisions'] as List)
          .map((division) => Division.fromJson(division))
          .toList(),
      lastUpdated: DateTime.parse(json['lastUpdated']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'divisions': divisions.map((division) => division.toJson()).toList(),
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }
}
