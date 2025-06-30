// Team model representing a baseball team entity
class Team {
  final String name;
  final String code;
  final String division;
  final String league;
  final String? logoUrl;
  final TeamRecord? record;

  Team({
    required this.name,
    required this.code,
    required this.division,
    required this.league,
    this.logoUrl,
    this.record,
  });

  factory Team.fromJson(Map<String, dynamic> json) {
    // Backend structure for standings is different
    // Backend sends: {team: "Team Name", wins: 48, losses: 35, pct: ".578", gb: "-", last10: "6-4", streak: "W1"}
    // We need to handle both formats: direct team data and nested team data
    
    String teamName;
    String teamCode = '';
    String division = '';
    String league = '';
    TeamRecord? record;
    
    if (json.containsKey('team') && json.containsKey('wins')) {
      // This is standings data from backend
      teamName = json['team'] ?? 'Unknown Team';
      
      // Extract team code from team name (simple mapping)
      teamCode = _getTeamCodeFromName(teamName);
      
      // Create record from backend data
      final wins = json['wins'] ?? 0;
      final losses = json['losses'] ?? 0;
      final pctString = (json['pct'] ?? '0.000').replaceAll('.', '');
      final winPercentage = double.tryParse('0.$pctString') ?? 0.0;
      
      // Parse games behind
      final gbString = json['gb'] ?? '-';
      final gamesBehind = gbString == '-' ? 0.0 : double.tryParse(gbString) ?? 0.0;
      
      record = TeamRecord(
        wins: wins,
        losses: losses,
        winPercentage: winPercentage,
        gamesBehind: gamesBehind,
        divisionRank: null, // Not provided in backend data
      );
    } else {
      // This is regular team data format
      teamName = json['name'] ?? 'Unknown Team';
      teamCode = json['code'] ?? '';
      division = json['division'] ?? '';
      league = json['league'] ?? '';
      record = json['record'] != null ? TeamRecord.fromJson(json['record']) : null;
    }
    
    return Team(
      name: teamName,
      code: teamCode,
      division: division,
      league: league,
      logoUrl: json['logoUrl'],
      record: record,
    );
  }
  
  // Helper method to get team code from team name
  static String _getTeamCodeFromName(String teamName) {
    final Map<String, String> teamNameToCode = {
      'Arizona Diamondbacks': 'ari',
      'Atlanta Braves': 'atl',
      'Baltimore Orioles': 'bal',
      'Boston Red Sox': 'bos',
      'Chicago Cubs': 'chc',
      'Chicago White Sox': 'cws',
      'Cincinnati Reds': 'cin',
      'Cleveland Guardians': 'cle',
      'Colorado Rockies': 'col',
      'Detroit Tigers': 'det',
      'Houston Astros': 'hou',
      'Kansas City Royals': 'kc',
      'Los Angeles Angels': 'laa',
      'Los Angeles Dodgers': 'lad',
      'Miami Marlins': 'mia',
      'Milwaukee Brewers': 'mil',
      'Minnesota Twins': 'min',
      'New York Mets': 'nym',
      'New York Yankees': 'nyy',
      'Oakland Athletics': 'oak',
      'Philadelphia Phillies': 'phi',
      'Pittsburgh Pirates': 'pit',
      'San Diego Padres': 'sd',
      'San Francisco Giants': 'sf',
      'Seattle Mariners': 'sea',
      'St. Louis Cardinals': 'stl',
      'Tampa Bay Rays': 'tb',
      'Texas Rangers': 'tex',
      'Toronto Blue Jays': 'tor',
      'Washington Nationals': 'wsh',
    };
    
    return teamNameToCode[teamName] ?? teamName.toLowerCase().replaceAll(' ', '');
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'code': code,
      'division': division,
      'league': league,
      'logoUrl': logoUrl,
      'record': record?.toJson(),
    };
  }
}

// TeamRecord class to track wins, losses, and position
class TeamRecord {
  final int wins;
  final int losses;
  final double? winPercentage;
  final double? gamesBehind;
  final int? divisionRank;

  TeamRecord({
    required this.wins,
    required this.losses,
    this.winPercentage,
    this.gamesBehind,
    this.divisionRank,
  });

  factory TeamRecord.fromJson(Map<String, dynamic> json) {
    // Handle different formats from backend
    double? winPercentage;
    if (json['pct'] != null) {
      // Backend sends ".578" format, convert to 0.578
      final pctString = json['pct'].toString().replaceAll('.', '');
      winPercentage = double.tryParse('0.$pctString');
    } else if (json['winPercentage'] != null) {
      winPercentage = json['winPercentage']?.toDouble();
    }
    
    double? gamesBehind;
    if (json['gb'] != null) {
      final gbString = json['gb'].toString();
      gamesBehind = gbString == '-' ? 0.0 : double.tryParse(gbString);
    } else if (json['gamesBehind'] != null) {
      gamesBehind = json['gamesBehind']?.toDouble();
    }
    
    return TeamRecord(
      wins: json['wins'] ?? 0,
      losses: json['losses'] ?? 0,
      winPercentage: winPercentage,
      gamesBehind: gamesBehind,
      divisionRank: json['divisionRank'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'wins': wins,
      'losses': losses,
      'winPercentage': winPercentage,
      'gamesBehind': gamesBehind,
      'divisionRank': divisionRank,
    };
  }
}
