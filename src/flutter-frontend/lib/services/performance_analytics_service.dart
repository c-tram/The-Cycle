import 'dart:math';
import '../models/game.dart';
import '../models/player.dart';
import '../models/team.dart';
import 'api_service.dart';

// Service for team performance analytics and game predictions
class PerformanceAnalyticsService {
  static final PerformanceAnalyticsService _instance =
      PerformanceAnalyticsService._internal();
  factory PerformanceAnalyticsService() => _instance;
  PerformanceAnalyticsService._internal();

  final ApiService _apiService = ApiService();

  // Get comprehensive analytics data from backend
  Future<Map<String, dynamic>?> getComprehensiveAnalytics(
      String teamCode) async {
    try {
      return await _apiService.getTeamAnalytics(teamCode);
    } catch (e) {
      print('Error fetching comprehensive analytics: $e');
      return null;
    }
  }

  // Generate chart data with comprehensive backend data
  Future<Map<String, List<dynamic>>> generateComprehensiveCharts(
      String teamCode) async {
    try {
      final analytics = await getComprehensiveAnalytics(teamCode);
      if (analytics == null) {
        // Fallback to local calculation
        return {};
      }

      final charts = <String, List<dynamic>>{};

      // Win/Loss chart data
      if (analytics['winLoss'] != null) {
        charts['winLoss'] = (analytics['winLoss'] as List)
            .map((data) => {
                  'date': data['date'],
                  'winPercentage': data['winPercentage'],
                  'gameNumber': data['gameNumber'],
                })
            .toList();
      }

      // Runs chart data
      if (analytics['runs'] != null) {
        charts['runs'] = (analytics['runs'] as List)
            .map((data) => {
                  'date': data['date'],
                  'runsScored': data['runsScored'],
                  'runsAllowed': data['runsAllowed'],
                  'runDifferential': data['runDifferential'],
                })
            .toList();
      }

      // Momentum chart data
      if (analytics['momentum'] != null) {
        charts['momentum'] = (analytics['momentum'] as List)
            .map((data) => {
                  'date': data['date'],
                  'momentum': data['momentum'],
                  'trend': data['trend'],
                })
            .toList();
      }

      return charts;
    } catch (e) {
      print('Error generating comprehensive charts: $e');
      return {};
    }
  }

  // Get comprehensive team data for enhanced analytics
  Future<Map<String, dynamic>?> getComprehensiveTeamData(
      String teamCode) async {
    try {
      return await _apiService.getComprehensiveTeamData(teamCode);
    } catch (e) {
      print('Error fetching comprehensive team data: $e');
      return null;
    }
  }

  // Calculate team performance metrics
  TeamPerformanceMetrics calculateTeamPerformance(
    Team team,
    List<Game> recentGames,
    List<Player> roster,
  ) {
    final teamGames = recentGames
        .where((game) =>
            game.homeTeamCode == team.code || game.awayTeamCode == team.code)
        .toList();

    if (teamGames.isEmpty) {
      return TeamPerformanceMetrics.empty();
    }

    // Calculate win percentage
    int wins = 0;
    int totalGames = 0;
    List<double> runsScoredPerGame = [];
    List<double> runsAllowedPerGame = [];

    for (final game in teamGames) {
      if (game.status == GameStatus.completed) {
        totalGames++;
        final isHome = game.homeTeamCode == team.code;
        final teamScore = isHome ? game.homeScore : game.awayScore;
        final opponentScore = isHome ? game.awayScore : game.homeScore;

        if (teamScore != null && opponentScore != null) {
          if (teamScore > opponentScore) wins++;
          runsScoredPerGame.add(teamScore.toDouble());
          runsAllowedPerGame.add(opponentScore.toDouble());
        }
      }
    }

    final winPercentage = totalGames > 0 ? wins / totalGames : 0.0;
    final avgRunsScored = runsScoredPerGame.isNotEmpty
        ? runsScoredPerGame.reduce((a, b) => a + b) / runsScoredPerGame.length
        : 0.0;
    final avgRunsAllowed = runsAllowedPerGame.isNotEmpty
        ? runsAllowedPerGame.reduce((a, b) => a + b) / runsAllowedPerGame.length
        : 0.0;

    // Calculate team batting and pitching stats
    final battingStats = _calculateTeamBattingStats(roster);
    final pitchingStats = _calculateTeamPitchingStats(roster);

    // Calculate momentum (recent 10 games)
    final recent10Games = teamGames.take(10).toList();
    final momentum = _calculateMomentum(recent10Games, team.code);

    return TeamPerformanceMetrics(
      winPercentage: winPercentage,
      averageRunsScored: avgRunsScored,
      averageRunsAllowed: avgRunsAllowed,
      totalGames: totalGames,
      wins: wins,
      losses: totalGames - wins,
      teamBattingAverage: battingStats.average,
      teamERA: pitchingStats.era,
      momentum: momentum,
      form: _getFormString(recent10Games, team.code),
      runDifferential: avgRunsScored - avgRunsAllowed,
    );
  }

  // Predict game outcome
  GamePrediction predictGame(Game upcomingGame, Team homeTeam, Team awayTeam,
      TeamPerformanceMetrics homeMetrics, TeamPerformanceMetrics awayMetrics) {
    // Factors that influence the prediction
    double homeAdvantage = 0.54; // Home teams win ~54% of games
    double homeWinProb = homeAdvantage;

    // Adjust based on win percentage
    homeWinProb +=
        (homeMetrics.winPercentage - awayMetrics.winPercentage) * 0.3;

    // Adjust based on run differential
    final homeRunDiff = homeMetrics.runDifferential;
    final awayRunDiff = awayMetrics.runDifferential;
    homeWinProb += (homeRunDiff - awayRunDiff) * 0.05;

    // Adjust based on momentum
    homeWinProb += (homeMetrics.momentum - awayMetrics.momentum) * 0.1;

    // Adjust based on batting vs pitching matchup
    final homeOffenseVsAwayPitching =
        homeMetrics.teamBattingAverage - awayMetrics.teamERA * 0.1;
    final awayOffenseVsHomePitching =
        awayMetrics.teamBattingAverage - homeMetrics.teamERA * 0.1;
    homeWinProb +=
        (homeOffenseVsAwayPitching - awayOffenseVsHomePitching) * 0.2;

    // Clamp probability between 0.1 and 0.9
    homeWinProb = homeWinProb.clamp(0.1, 0.9);

    // Predict score
    final predictedHomeScore =
        _predictScore(homeMetrics.averageRunsScored, awayMetrics.teamERA);
    final predictedAwayScore =
        _predictScore(awayMetrics.averageRunsScored, homeMetrics.teamERA);

    return GamePrediction(
      homeWinProbability: homeWinProb,
      awayWinProbability: 1.0 - homeWinProb,
      predictedHomeScore: predictedHomeScore,
      predictedAwayScore: predictedAwayScore,
      confidence: _calculateConfidence(homeMetrics, awayMetrics),
      keyFactors:
          _identifyKeyFactors(homeTeam, awayTeam, homeMetrics, awayMetrics),
    );
  }

  // Generate performance chart data
  List<PerformanceDataPoint> generatePerformanceChart(
    List<Game> games,
    String teamCode,
    PerformanceChartType chartType,
  ) {
    final teamGames = games
        .where((game) =>
            (game.homeTeamCode == teamCode || game.awayTeamCode == teamCode) &&
            game.status == GameStatus.completed)
        .toList();

    switch (chartType) {
      case PerformanceChartType.winLoss:
        return _generateWinLossChart(teamGames, teamCode);
      case PerformanceChartType.runsScored:
        return _generateRunsScoredChart(teamGames, teamCode);
      case PerformanceChartType.runDifferential:
        return _generateRunDifferentialChart(teamGames, teamCode);
      case PerformanceChartType.momentum:
        return _generateMomentumChart(teamGames, teamCode);
    }
  }

  // Chart generation methods
  List<PerformanceDataPoint> _generateWinLossChart(
      List<Game> teamGames, String teamCode) {
    final points = <PerformanceDataPoint>[];
    int wins = 0;
    int totalGames = 0;

    // Sort games by date for chronological order
    teamGames.sort((a, b) => a.date.compareTo(b.date));

    for (int i = 0; i < teamGames.length; i++) {
      final game = teamGames[i];
      if (game.status == GameStatus.completed) {
        totalGames++;
        final isHome = game.homeTeamCode == teamCode;
        final teamScore = isHome ? game.homeScore : game.awayScore;
        final opponentScore = isHome ? game.awayScore : game.homeScore;

        if (teamScore != null &&
            opponentScore != null &&
            teamScore > opponentScore) {
          wins++;
        }

        final winPercentage = totalGames > 0 ? wins / totalGames : 0.0;
        points.add(PerformanceDataPoint(
          x: i.toDouble(),
          y: winPercentage,
          date: DateTime.parse(game.date),
          label: _formatDateLabel(game.date),
        ));
      }
    }

    return points;
  }

  List<PerformanceDataPoint> _generateRunsScoredChart(
      List<Game> teamGames, String teamCode) {
    final points = <PerformanceDataPoint>[];

    // Sort games by date for chronological order
    teamGames.sort((a, b) => a.date.compareTo(b.date));

    for (int i = 0; i < teamGames.length; i++) {
      final game = teamGames[i];
      if (game.status == GameStatus.completed) {
        final isHome = game.homeTeamCode == teamCode;
        final teamScore = isHome ? game.homeScore : game.awayScore;

        if (teamScore != null) {
          points.add(PerformanceDataPoint(
            x: i.toDouble(),
            y: teamScore.toDouble(),
            date: DateTime.parse(game.date),
            label: _formatDateLabel(game.date),
          ));
        }
      }
    }

    return points;
  }

  List<PerformanceDataPoint> _generateRunsAllowedChart(
      List<Game> teamGames, String teamCode) {
    final points = <PerformanceDataPoint>[];

    // Sort games by date for chronological order
    teamGames.sort((a, b) => a.date.compareTo(b.date));

    for (int i = 0; i < teamGames.length; i++) {
      final game = teamGames[i];
      if (game.status == GameStatus.completed) {
        final isHome = game.homeTeamCode == teamCode;
        final opponentScore = isHome ? game.awayScore : game.homeScore;

        if (opponentScore != null) {
          points.add(PerformanceDataPoint(
            x: i.toDouble(),
            y: opponentScore.toDouble(),
            date: DateTime.parse(game.date),
            label: _formatDateLabel(game.date),
          ));
        }
      }
    }

    return points;
  }

  List<PerformanceDataPoint> _generateRunDifferentialChart(
      List<Game> teamGames, String teamCode) {
    final points = <PerformanceDataPoint>[];

    // Sort games by date for chronological order
    teamGames.sort((a, b) => a.date.compareTo(b.date));

    for (int i = 0; i < teamGames.length; i++) {
      final game = teamGames[i];
      if (game.status == GameStatus.completed) {
        final isHome = game.homeTeamCode == teamCode;
        final teamScore = isHome ? game.homeScore : game.awayScore;
        final opponentScore = isHome ? game.awayScore : game.homeScore;

        if (teamScore != null && opponentScore != null) {
          final differential = teamScore - opponentScore;
          points.add(PerformanceDataPoint(
            x: i.toDouble(),
            y: differential.toDouble(),
            date: DateTime.parse(game.date),
            label: _formatDateLabel(game.date),
          ));
        }
      }
    }

    return points;
  }

  List<PerformanceDataPoint> _generateMomentumChart(
      List<Game> teamGames, String teamCode) {
    final points = <PerformanceDataPoint>[];

    // Sort games by date for chronological order
    teamGames.sort((a, b) => a.date.compareTo(b.date));

    // Calculate rolling momentum using a sliding window
    const windowSize = 10;

    for (int i = 0; i < teamGames.length; i++) {
      final game = teamGames[i];
      if (game.status == GameStatus.completed) {
        // Calculate momentum based on recent games up to this point
        final startIndex = (i - windowSize + 1).clamp(0, i + 1);
        final recentGames = teamGames.sublist(startIndex, i + 1);
        final momentum = _calculateMomentum(recentGames, teamCode);

        points.add(PerformanceDataPoint(
          x: i.toDouble(),
          y: momentum,
          date: DateTime.parse(game.date),
          label: _formatDateLabel(game.date),
        ));
      }
    }

    return points;
  }

  String _formatDateLabel(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.month}/${date.day}';
    } catch (e) {
      return dateStr.substring(5, 10); // fallback to MM-DD format
    }
  }

  // Helper method to generate multiple chart types at once
  Map<PerformanceChartType, List<PerformanceDataPoint>> generateAllCharts(
    List<Game> games,
    String teamCode,
  ) {
    final teamGames = games
        .where((game) =>
            (game.homeTeamCode == teamCode || game.awayTeamCode == teamCode) &&
            game.status == GameStatus.completed)
        .toList();

    return {
      PerformanceChartType.winLoss: _generateWinLossChart(teamGames, teamCode),
      PerformanceChartType.runsScored:
          _generateRunsScoredChart(teamGames, teamCode),
      PerformanceChartType.runDifferential:
          _generateRunDifferentialChart(teamGames, teamCode),
      PerformanceChartType.momentum:
          _generateMomentumChart(teamGames, teamCode),
    };
  }

  // Helper method to get runs allowed data
  List<PerformanceDataPoint> generateRunsAllowedChart(
    List<Game> games,
    String teamCode,
  ) {
    final teamGames = games
        .where((game) =>
            (game.homeTeamCode == teamCode || game.awayTeamCode == teamCode) &&
            game.status == GameStatus.completed)
        .toList();

    return _generateRunsAllowedChart(teamGames, teamCode);
  }

  // Helper methods
  TeamBattingStats _calculateTeamBattingStats(List<Player> roster) {
    if (roster.isEmpty) return TeamBattingStats.empty();

    double totalAvg = 0;
    int count = 0;

    for (final player in roster) {
      if (player.stats?.avg != null) {
        totalAvg += player.stats!.avg!;
        count++;
      }
    }

    return TeamBattingStats(
      average: count > 0 ? totalAvg / count : 0.0,
    );
  }

  TeamPitchingStats _calculateTeamPitchingStats(List<Player> roster) {
    if (roster.isEmpty) return TeamPitchingStats.empty();

    double totalERA = 0;
    int count = 0;

    for (final player in roster) {
      if (player.stats?.era != null && player.stats!.era! > 0) {
        totalERA += player.stats!.era!;
        count++;
      }
    }

    return TeamPitchingStats(
      era: count > 0 ? totalERA / count : 0.0,
    );
  }

  double _calculateMomentum(List<Game> recentGames, String teamCode) {
    if (recentGames.isEmpty) return 0.0;

    double momentum = 0.0;
    for (int i = 0; i < recentGames.length; i++) {
      final game = recentGames[i];
      final isHome = game.homeTeamCode == teamCode;
      final teamScore = isHome ? game.homeScore : game.awayScore;
      final opponentScore = isHome ? game.awayScore : game.homeScore;

      if (teamScore != null && opponentScore != null) {
        final won = teamScore > opponentScore;
        // More recent games have higher weight
        final weight = (recentGames.length - i) / recentGames.length;
        momentum += won ? weight : -weight;
      }
    }

    return momentum / recentGames.length;
  }

  String _getFormString(List<Game> recentGames, String teamCode) {
    final form = StringBuffer();
    for (final game in recentGames.take(5)) {
      final isHome = game.homeTeamCode == teamCode;
      final teamScore = isHome ? game.homeScore : game.awayScore;
      final opponentScore = isHome ? game.awayScore : game.homeScore;

      if (teamScore != null && opponentScore != null) {
        form.write(teamScore > opponentScore ? 'W' : 'L');
      }
    }
    return form.toString();
  }

  int _predictScore(double avgRunsScored, double opponentERA) {
    // Simple prediction based on team's offensive capability vs opponent's pitching
    final adjustedRuns = avgRunsScored * (1.0 + (5.0 - opponentERA) * 0.1);
    return adjustedRuns.round().clamp(0, 15);
  }

  double _calculateConfidence(
      TeamPerformanceMetrics home, TeamPerformanceMetrics away) {
    // Confidence is higher when teams have more games played and larger performance gaps
    final gamesSample = min(home.totalGames, away.totalGames);
    final performanceGap = (home.winPercentage - away.winPercentage).abs();

    return (gamesSample / 50.0 + performanceGap).clamp(0.1, 0.9);
  }

  List<String> _identifyKeyFactors(Team homeTeam, Team awayTeam,
      TeamPerformanceMetrics homeMetrics, TeamPerformanceMetrics awayMetrics) {
    final factors = <String>[];

    if (homeMetrics.winPercentage > awayMetrics.winPercentage + 0.1) {
      factors.add('${homeTeam.name} has superior record');
    } else if (awayMetrics.winPercentage > homeMetrics.winPercentage + 0.1) {
      factors.add('${awayTeam.name} has superior record');
    }

    if (homeMetrics.momentum > 0.2) {
      factors.add('${homeTeam.name} is hot');
    } else if (awayMetrics.momentum > 0.2) {
      factors.add('${awayTeam.name} is hot');
    }

    if (homeMetrics.runDifferential > awayMetrics.runDifferential + 1.0) {
      factors.add('${homeTeam.name} has better run differential');
    } else if (awayMetrics.runDifferential >
        homeMetrics.runDifferential + 1.0) {
      factors.add('${awayTeam.name} has better run differential');
    }

    factors.add('Home field advantage');

    return factors;
  }
}

// Data classes
class TeamPerformanceMetrics {
  final double winPercentage;
  final double averageRunsScored;
  final double averageRunsAllowed;
  final int totalGames;
  final int wins;
  final int losses;
  final double teamBattingAverage;
  final double teamERA;
  final double momentum;
  final String form;
  final double runDifferential;

  TeamPerformanceMetrics({
    required this.winPercentage,
    required this.averageRunsScored,
    required this.averageRunsAllowed,
    required this.totalGames,
    required this.wins,
    required this.losses,
    required this.teamBattingAverage,
    required this.teamERA,
    required this.momentum,
    required this.form,
    required this.runDifferential,
  });

  factory TeamPerformanceMetrics.empty() {
    return TeamPerformanceMetrics(
      winPercentage: 0.0,
      averageRunsScored: 0.0,
      averageRunsAllowed: 0.0,
      totalGames: 0,
      wins: 0,
      losses: 0,
      teamBattingAverage: 0.0,
      teamERA: 0.0,
      momentum: 0.0,
      form: '',
      runDifferential: 0.0,
    );
  }
}

class GamePrediction {
  final double homeWinProbability;
  final double awayWinProbability;
  final int predictedHomeScore;
  final int predictedAwayScore;
  final double confidence;
  final List<String> keyFactors;

  GamePrediction({
    required this.homeWinProbability,
    required this.awayWinProbability,
    required this.predictedHomeScore,
    required this.predictedAwayScore,
    required this.confidence,
    required this.keyFactors,
  });
}

class PerformanceDataPoint {
  final double x;
  final double y;
  final DateTime date;
  final String label;

  PerformanceDataPoint({
    required this.x,
    required this.y,
    required this.date,
    required this.label,
  });
}

enum PerformanceChartType {
  winLoss,
  runsScored,
  runDifferential,
  momentum,
}

class TeamBattingStats {
  final double average;

  TeamBattingStats({required this.average});

  factory TeamBattingStats.empty() => TeamBattingStats(average: 0.0);
}

class TeamPitchingStats {
  final double era;

  TeamPitchingStats({required this.era});

  factory TeamPitchingStats.empty() => TeamPitchingStats(era: 0.0);
}
