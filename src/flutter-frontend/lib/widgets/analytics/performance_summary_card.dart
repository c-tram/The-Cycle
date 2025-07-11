import 'package:flutter/material.dart';
import '../../services/performance_analytics_service.dart';
import '../../services/team_branding_service.dart';
import '../../models/game.dart';

class PerformanceSummaryCard extends StatelessWidget {
  final String teamCode;
  final List<Game> recentGames;
  final TeamColors teamColors;
  final VoidCallback? onTap;

  const PerformanceSummaryCard({
    Key? key,
    required this.teamCode,
    required this.recentGames,
    required this.teamColors,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final analytics = PerformanceAnalyticsService();

    // Calculate recent performance (last 10 games)
    final teamGames = recentGames
        .where((game) =>
            (game.homeTeamCode == teamCode || game.awayTeamCode == teamCode) &&
            game.status == GameStatus.completed)
        .take(10)
        .toList();

    if (teamGames.isEmpty) {
      return _buildEmptyCard();
    }

    final recentWins = teamGames.where((game) {
      final isHome = game.homeTeamCode == teamCode;
      final teamScore = isHome ? game.homeScore : game.awayScore;
      final opponentScore = isHome ? game.awayScore : game.homeScore;
      return teamScore != null &&
          opponentScore != null &&
          teamScore > opponentScore;
    }).length;

    final winRate = recentWins / teamGames.length;
    final momentum = analytics.generatePerformanceChart(
        recentGames, teamCode, PerformanceChartType.momentum);
    final currentMomentum = momentum.isNotEmpty ? momentum.last.y : 0.0;

    return GestureDetector(
      onTap: onTap,
      child: Card(
        elevation: 6,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: LinearGradient(
              colors: [
                teamColors.primary.withOpacity(0.15),
                teamColors.secondary.withOpacity(0.08),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: teamColors.primary,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.analytics,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Recent Performance',
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: teamColors.primary,
                                  ),
                        ),
                        Text(
                          'Last ${teamGames.length} games',
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.grey[600],
                                  ),
                        ),
                      ],
                    ),
                  ),
                  if (onTap != null)
                    Icon(
                      Icons.arrow_forward_ios,
                      size: 16,
                      color: teamColors.primary,
                    ),
                ],
              ),

              const SizedBox(height: 16),

              // Performance indicators
              Row(
                children: [
                  // Win Rate Circle
                  _buildCircularIndicator(
                    value: winRate,
                    label: 'Win Rate',
                    color: winRate >= 0.5 ? teamColors.primary : Colors.red,
                  ),

                  const SizedBox(width: 24),

                  // Performance metrics
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildMetricRow(
                          'Record:',
                          '$recentWins-${teamGames.length - recentWins}',
                          Icons.sports_baseball,
                        ),
                        const SizedBox(height: 8),
                        _buildMetricRow(
                          'Momentum:',
                          _getMomentumLabel(currentMomentum),
                          _getMomentumIcon(currentMomentum),
                          color: _getMomentumColor(currentMomentum),
                        ),
                        const SizedBox(height: 8),
                        _buildMetricRow(
                          'Form:',
                          _getFormString(teamGames.take(5).toList()),
                          Icons.timeline,
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Quick insights
              _buildInsightChips(teamGames, winRate, currentMomentum),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCircularIndicator({
    required double value,
    required String label,
    required Color color,
  }) {
    return Column(
      children: [
        SizedBox(
          width: 60,
          height: 60,
          child: Stack(
            children: [
              CircularProgressIndicator(
                value: 1.0,
                strokeWidth: 6,
                color: Colors.grey[300],
              ),
              CircularProgressIndicator(
                value: value,
                strokeWidth: 6,
                color: color,
              ),
              Center(
                child: Text(
                  '${(value * 100).toInt()}%',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildMetricRow(String label, String value, IconData icon,
      {Color? color}) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: color ?? Colors.grey[600],
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(width: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: color ?? teamColors.primary,
          ),
        ),
      ],
    );
  }

  Widget _buildInsightChips(List<Game> games, double winRate, double momentum) {
    final insights = <String>[];

    if (winRate >= 0.7) {
      insights.add('🔥 Hot Streak');
    } else if (winRate <= 0.3) {
      insights.add('❄️ Cold Streak');
    }

    if (momentum > 0.4) {
      insights.add('📈 Trending Up');
    } else if (momentum < -0.4) {
      insights.add('📉 Trending Down');
    }

    // Check for recent high-scoring games
    final highScoringGames = games.where((game) {
      final isHome = game.homeTeamCode == teamCode;
      final teamScore = isHome ? game.homeScore : game.awayScore;
      return teamScore != null && teamScore >= 8;
    }).length;

    if (highScoringGames >= 3) {
      insights.add('💥 High Offense');
    }

    if (insights.isEmpty) {
      insights.add('📊 Steady Performance');
    }

    return Wrap(
      spacing: 8,
      children: insights
          .map((insight) => Chip(
                label: Text(
                  insight,
                  style: const TextStyle(fontSize: 10),
                ),
                backgroundColor: teamColors.primary.withOpacity(0.1),
                side: BorderSide(color: teamColors.primary.withOpacity(0.3)),
              ))
          .toList(),
    );
  }

  Widget _buildEmptyCard() {
    return Card(
      elevation: 4,
      child: Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(
              Icons.analytics,
              size: 48,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 8),
            Text(
              'No Recent Games',
              style: TextStyle(
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getMomentumLabel(double momentum) {
    if (momentum > 0.3) return 'Hot';
    if (momentum < -0.3) return 'Cold';
    return 'Neutral';
  }

  IconData _getMomentumIcon(double momentum) {
    if (momentum > 0.3) return Icons.trending_up;
    if (momentum < -0.3) return Icons.trending_down;
    return Icons.trending_flat;
  }

  Color _getMomentumColor(double momentum) {
    if (momentum > 0.3) return Colors.green;
    if (momentum < -0.3) return Colors.red;
    return Colors.orange;
  }

  String _getFormString(List<Game> recentGames) {
    final form = StringBuffer();
    for (final game in recentGames) {
      final isHome = game.homeTeamCode == teamCode;
      final teamScore = isHome ? game.homeScore : game.awayScore;
      final opponentScore = isHome ? game.awayScore : game.homeScore;

      if (teamScore != null && opponentScore != null) {
        form.write(teamScore > opponentScore ? 'W' : 'L');
      }
    }
    return form.toString();
  }
}
