import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/performance_analytics_service.dart';
import '../../services/team_branding_service.dart';

class MomentumChart extends StatelessWidget {
  final List<PerformanceDataPoint> data;
  final TeamColors teamColors;
  final String title;

  const MomentumChart({
    Key? key,
    required this.data,
    required this.teamColors,
    this.title = 'Team Momentum',
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return _buildEmptyState();
    }

    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: teamColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const Spacer(),
                _buildMomentumIndicator(),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 300,
              child: LineChart(
                _buildLineChartData(),
              ),
            ),
            const SizedBox(height: 8),
            _buildLegend(),
          ],
        ),
      ),
    );
  }

  Widget _buildMomentumIndicator() {
    final currentMomentum = data.isNotEmpty ? data.last.y : 0.0;
    final isPositive = currentMomentum > 0;
    final isNeutral = currentMomentum == 0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isNeutral
            ? Colors.grey[300]
            : isPositive
                ? Colors.green[100]
                : Colors.red[100],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isNeutral
              ? Colors.grey[400]!
              : isPositive
                  ? Colors.green[400]!
                  : Colors.red[400]!,
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isNeutral
                ? Icons.remove
                : isPositive
                    ? Icons.trending_up
                    : Icons.trending_down,
            size: 16,
            color: isNeutral
                ? Colors.grey[700]
                : isPositive
                    ? Colors.green[700]
                    : Colors.red[700],
          ),
          const SizedBox(width: 4),
          Text(
            isNeutral
                ? 'Neutral'
                : isPositive
                    ? 'Hot'
                    : 'Cold',
            style: TextStyle(
              color: isNeutral
                  ? Colors.grey[700]
                  : isPositive
                      ? Colors.green[700]
                      : Colors.red[700],
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  LineChartData _buildLineChartData() {
    final minY = data.map((e) => e.y).reduce((a, b) => a < b ? a : b);
    final maxY = data.map((e) => e.y).reduce((a, b) => a > b ? a : b);
    final range = maxY - minY;
    final paddedMinY = minY - (range * 0.1);
    final paddedMaxY = maxY + (range * 0.1);

    return LineChartData(
      gridData: FlGridData(
        show: true,
        drawVerticalLine: true,
        horizontalInterval: (paddedMaxY - paddedMinY) / 5,
        verticalInterval:
            data.length > 10 ? (data.length / 5).ceilToDouble() : 1,
        getDrawingHorizontalLine: (value) => FlLine(
          color: value == 0
              ? Colors.grey.withOpacity(0.7) // Emphasize zero line
              : Colors.grey.withOpacity(0.3),
          strokeWidth: value == 0 ? 2 : 1,
        ),
        getDrawingVerticalLine: (value) => FlLine(
          color: Colors.grey.withOpacity(0.3),
          strokeWidth: 1,
        ),
      ),
      titlesData: FlTitlesData(
        show: true,
        rightTitles: const AxisTitles(
          sideTitles: SideTitles(showTitles: false),
        ),
        topTitles: const AxisTitles(
          sideTitles: SideTitles(showTitles: false),
        ),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 30,
            interval: data.length > 10 ? (data.length / 5).ceilToDouble() : 1,
            getTitlesWidget: (double value, TitleMeta meta) {
              if (value.toInt() >= 0 && value.toInt() < data.length) {
                final point = data[value.toInt()];
                return SideTitleWidget(
                  axisSide: meta.axisSide,
                  child: Text(
                    point.label,
                    style: const TextStyle(
                      color: Colors.grey,
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                    ),
                  ),
                );
              }
              return Container();
            },
          ),
        ),
        leftTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            interval: (paddedMaxY - paddedMinY) / 5,
            getTitlesWidget: (double value, TitleMeta meta) {
              return Text(
                value.toStringAsFixed(1),
                style: TextStyle(
                  color: value == 0 ? Colors.grey[800] : Colors.grey,
                  fontWeight: value == 0 ? FontWeight.bold : FontWeight.normal,
                  fontSize: 12,
                ),
              );
            },
            reservedSize: 42,
          ),
        ),
      ),
      borderData: FlBorderData(
        show: true,
        border: Border.all(color: Colors.grey.withOpacity(0.3)),
      ),
      minX: 0,
      maxX: (data.length - 1).toDouble(),
      minY: paddedMinY,
      maxY: paddedMaxY,
      lineBarsData: [
        LineChartBarData(
          spots: data
              .asMap()
              .entries
              .map((entry) => FlSpot(entry.key.toDouble(), entry.value.y))
              .toList(),
          isCurved: true,
          gradient: LinearGradient(
            colors: data
                .map((point) => point.y >= 0
                    ? teamColors.primary.withOpacity(0.8)
                    : Colors.red.withOpacity(0.8))
                .toList(),
          ),
          barWidth: 4,
          isStrokeCapRound: true,
          dotData: FlDotData(
            show: true,
            getDotPainter: (spot, percent, barData, index) {
              final isPositive = spot.y >= 0;
              return FlDotCirclePainter(
                radius: 4,
                color: isPositive ? teamColors.primary : Colors.red,
                strokeWidth: 2,
                strokeColor: Colors.white,
              );
            },
          ),
          belowBarData: BarAreaData(
            show: true,
            gradient: LinearGradient(
              colors: [
                teamColors.primary.withOpacity(0.3),
                teamColors.primary.withOpacity(0.1),
              ],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
            applyCutOffY: true,
            cutOffY: 0,
          ),
          aboveBarData: BarAreaData(
            show: true,
            gradient: LinearGradient(
              colors: [
                Colors.red.withOpacity(0.1),
                Colors.red.withOpacity(0.3),
              ],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
            applyCutOffY: true,
            cutOffY: 0,
          ),
        ),
      ],
      lineTouchData: LineTouchData(
        enabled: true,
        touchTooltipData: LineTouchTooltipData(
          tooltipBgColor: teamColors.primary.withOpacity(0.9),
          tooltipRoundedRadius: 8,
          getTooltipItems: (List<LineBarSpot> touchedBarSpots) {
            return touchedBarSpots.map((barSpot) {
              final index = barSpot.x.toInt();
              if (index >= 0 && index < data.length) {
                final point = data[index];
                final momentumText = point.y > 0.5
                    ? 'Hot Streak'
                    : point.y < -0.5
                        ? 'Cold Streak'
                        : 'Neutral';

                return LineTooltipItem(
                  '${point.label}\nMomentum: ${point.y.toStringAsFixed(2)}\n$momentumText',
                  const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                );
              }
              return null;
            }).toList();
          },
        ),
        handleBuiltInTouches: true,
        touchSpotThreshold: 10,
      ),
    );
  }

  Widget _buildLegend() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildLegendItem(teamColors.primary, 'Positive Momentum'),
        const SizedBox(width: 24),
        _buildLegendItem(Colors.red, 'Negative Momentum'),
        const SizedBox(width: 24),
        Container(
          width: 12,
          height: 2,
          color: Colors.grey,
        ),
        const SizedBox(width: 8),
        Text(
          'Baseline',
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Card(
      elevation: 4,
      child: Container(
        height: 300,
        padding: const EdgeInsets.all(16.0),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.trending_up,
                size: 64,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 16),
              Text(
                'No Momentum Data Available',
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Chart will appear when game data is loaded',
                style: TextStyle(
                  color: Colors.grey[500],
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
