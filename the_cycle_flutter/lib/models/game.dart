// Game model representing a baseball game entity
class Game {
  final String homeTeam;
  final String homeTeamCode;
  final String awayTeam;
  final String awayTeamCode;
  final int? homeScore;
  final int? awayScore;
  final String date;
  final String? time;
  final GameStatus status;

  Game({
    required this.homeTeam,
    required this.homeTeamCode,
    required this.awayTeam,
    required this.awayTeamCode,
    this.homeScore,
    this.awayScore,
    required this.date,
    this.time,
    required this.status,
  });

  factory Game.fromJson(Map<String, dynamic> json) {
    return Game(
      homeTeam: json['homeTeam'],
      homeTeamCode: json['homeTeamCode'],
      awayTeam: json['awayTeam'],
      awayTeamCode: json['awayTeamCode'],
      homeScore: json['homeScore'],
      awayScore: json['awayScore'],
      date: json['date'],
      time: json['time'],
      status: GameStatus.values.firstWhere(
        (e) => e.toString().split('.').last == json['status'],
        orElse: () => GameStatus.scheduled,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'homeTeam': homeTeam,
      'homeTeamCode': homeTeamCode,
      'awayTeam': awayTeam,
      'awayTeamCode': awayTeamCode,
      'homeScore': homeScore,
      'awayScore': awayScore,
      'date': date,
      'time': time,
      'status': status.toString().split('.').last,
    };
  }
}

// Game status enum representing the state of a game
enum GameStatus { completed, scheduled, live }

// GamesData class to store collections of games by category
class GamesData {
  final List<Game> recentGames;
  final List<Game> upcomingGames;
  final List<Game> liveGames;

  GamesData({
    required this.recentGames,
    required this.upcomingGames,
    required this.liveGames,
  });

  factory GamesData.fromJson(Map<String, dynamic> json) {
    return GamesData(
      recentGames: (json['recent'] as List? ?? [])
          .map((game) => Game.fromJson(game))
          .toList(),
      upcomingGames: (json['upcoming'] as List? ?? [])
          .map((game) => Game.fromJson(game))
          .toList(),
      liveGames: (json['live'] as List? ?? [])
          .map((game) => Game.fromJson(game))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'recentGames': recentGames.map((game) => game.toJson()).toList(),
      'upcomingGames': upcomingGames.map((game) => game.toJson()).toList(),
      'liveGames': liveGames.map((game) => game.toJson()).toList(),
    };
  }
}
