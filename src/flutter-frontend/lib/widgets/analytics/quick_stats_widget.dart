import 'package:flutter/material.dart';
import '../../services/performance_analytics_service.dart';
import '../../services/team_branding_service.dart';

class QuickStatsWidget extends StatelessWidget {
  final TeamPerformanceMetrics metrics;
  final TeamColors teamColors;
  final bool isCompact;

  const QuickStatsWidget({
    Key? key,
    required this.metrics,
    required this.teamColors,
    this.isCompact = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: LinearGradient(
            colors: [
              teamColors.primary.withOpacity(0.1),
              teamColors.secondary.withOpacity(0.05),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: isCompact ? _buildCompactLayout() : _buildFullLayout(),
      ),
    );
  }

  Widget _buildCompactLayout() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildStatItem(
          'Win %',
          '${(metrics.winPercentage * 100).toStringAsFixed(1)}%',
          Icons.trending_up,
          metrics.winPercentage >= 0.5 ? teamColors.primary : Colors.red,
        ),
        _buildStatItem(
          'Run Diff',
          _formatRunDifferential(metrics.runDifferential),
          Icons.compare_arrows,
          metrics.runDifferential >= 0 ? teamColors.primary : Colors.red,
        ),
        _buildStatItem(
          'Momentum',
          _getMomentumLabel(metrics.momentum),
          _getMomentumIcon(metrics.momentum),
          _getMomentumColor(metrics.momentum),
        ),
      ],
    );
  }

  Widget _buildFullLayout() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Icons.analytics,
              color: teamColors.primary,
              size: 24,
            ),
            const SizedBox(width: 8),
            Text(
              'Team Performance',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: teamColors.primary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // First row of stats
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                'Record',
                '${metrics.wins}-${metrics.losses}',
                '${(metrics.winPercentage * 100).toStringAsFixed(1)}% Win Rate',
                Icons.sports_baseball,
                teamColors.primary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard(
                'Run Differential',
                _formatRunDifferential(metrics.runDifferential),
                'Avg: ${metrics.averageRunsScored.toStringAsFixed(1)} - ${metrics.averageRunsAllowed.toStringAsFixed(1)}',
                Icons.compare_arrows,
                metrics.runDifferential >= 0 ? Colors.green : Colors.red,
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),

        // Second row of stats
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                'Team Momentum',
                _getMomentumLabel(metrics.momentum),
                'Recent form: ${metrics.form}',
                _getMomentumIcon(metrics.momentum),
                _getMomentumColor(metrics.momentum),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard(
                'Team Stats',
                '${(metrics.teamBattingAverage * 1000).toInt()}/${metrics.teamERA.toStringAsFixed(2)}',
                'AVG / ERA',
                Icons.bar_chart,
                teamColors.secondary,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatItem(
      String label, String value, IconData icon, Color color) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(
      String title, String value, String subtitle, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 16),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Colors.grey[700],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 10,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  String _formatRunDifferential(double runDiff) {
    if (runDiff > 0) {
      return '+${runDiff.toStringAsFixed(1)}';
    } else {
      return runDiff.toStringAsFixed(1);
    }
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
}
