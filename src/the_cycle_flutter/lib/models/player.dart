// Player model representing an MLB player
class Player {
  final String id;
  final String name;
  final String team;
  final String teamCode;
  final String position;
  final PlayerStats? stats;
  final String? imageUrl;

  Player({
    required this.id,
    required this.name,
    required this.team,
    required this.teamCode,
    required this.position,
    this.stats,
    this.imageUrl,
  });

  factory Player.fromJson(Map<String, dynamic> json) {
    // Handle both the new backend format and potential future nested format
    PlayerStats? stats;

    if (json['stats'] != null) {
      // Nested stats format
      stats = PlayerStats.fromJson(json['stats']);
    } else {
      // Backend sends stats as flat fields, convert to PlayerStats object
      stats = PlayerStats(
        avg: double.tryParse(
            json['avg']?.toString().replaceAll(RegExp(r'[^\d\.]'), '') ?? '0'),
        homeRuns: int.tryParse(json['hr']?.toString() ?? '0'),
        rbi: int.tryParse(json['rbi']?.toString() ?? '0'),
        runs: int.tryParse(json['runs']?.toString() ?? '0'),
        hits: null, // Not provided in backend response
        obp: double.tryParse(
            json['obp']?.toString().replaceAll(RegExp(r'[^\d\.]'), '') ?? '0'),
        slg: double.tryParse(
            json['slg']?.toString().replaceAll(RegExp(r'[^\d\.]'), '') ?? '0'),
        ops: double.tryParse(
            json['ops']?.toString().replaceAll(RegExp(r'[^\d\.]'), '') ?? '0'),
        era: double.tryParse(
            json['era']?.toString().replaceAll(RegExp(r'[^\d\.]'), '') ?? '0'),
        wins: int.tryParse(json['wins']?.toString() ?? '0'),
        losses: null, // Not provided in current backend response
        strikeouts: int.tryParse(json['strikeouts']?.toString() ?? '0'),
        whip: double.tryParse(
            json['whip']?.toString().replaceAll(RegExp(r'[^\d\.]'), '') ?? '0'),
        saves: null, // Not provided in current backend response
        inningsPitched: null, // Not provided in current backend response
      );
    }

    return Player(
      id: json['id']?.toString() ??
          json['name']?.toString() ??
          'unknown', // Use name as fallback ID
      name: json['name'] ?? 'Unknown Player',
      team: json['team'] ?? 'Unknown Team',
      teamCode: json['teamCode'] ?? '',
      position: json['position'] ?? '',
      stats: stats,
      imageUrl: json['imageUrl'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'team': team,
      'teamCode': teamCode,
      'position': position,
      'stats': stats?.toJson(),
      'imageUrl': imageUrl,
    };
  }
}

// Player statistics class
class PlayerStats {
  // Batting stats
  final double? avg;
  final int? homeRuns;
  final int? rbi;
  final int? runs;
  final int? hits;
  final double? obp;
  final double? slg;
  final double? ops;

  // Pitching stats
  final double? era;
  final int? wins;
  final int? losses;
  final int? strikeouts;
  final double? whip;
  final int? saves;
  final double? inningsPitched;

  PlayerStats({
    this.avg,
    this.homeRuns,
    this.rbi,
    this.runs,
    this.hits,
    this.obp,
    this.slg,
    this.ops,
    this.era,
    this.wins,
    this.losses,
    this.strikeouts,
    this.whip,
    this.saves,
    this.inningsPitched,
  });

  factory PlayerStats.fromJson(Map<String, dynamic> json) {
    return PlayerStats(
      avg: json['avg']?.toDouble(),
      homeRuns: json['homeRuns'],
      rbi: json['rbi'],
      runs: json['runs'],
      hits: json['hits'],
      obp: json['obp']?.toDouble(),
      slg: json['slg']?.toDouble(),
      ops: json['ops']?.toDouble(),
      era: json['era']?.toDouble(),
      wins: json['wins'],
      losses: json['losses'],
      strikeouts: json['strikeouts'],
      whip: json['whip']?.toDouble(),
      saves: json['saves'],
      inningsPitched: json['inningsPitched']?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'avg': avg,
      'homeRuns': homeRuns,
      'rbi': rbi,
      'runs': runs,
      'hits': hits,
      'obp': obp,
      'slg': slg,
      'ops': ops,
      'era': era,
      'wins': wins,
      'losses': losses,
      'strikeouts': strikeouts,
      'whip': whip,
      'saves': saves,
      'inningsPitched': inningsPitched,
    };
  }

  // Helper method to determine if player is primarily a batter or pitcher
  bool get isPitcher => era != null;
  bool get isBatter => avg != null;
}
