import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/performance_analytics_service.dart';
import '../../services/team_branding_service.dart';

class WinLossChart extends StatelessWidget {
  final List<PerformanceDataPoint> data;
  final TeamColors teamColors;
  final String title;

  const WinLossChart({
    Key? key,
    required this.data,
    required this.teamColors,
    this.title = 'Win/Loss Trend',
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
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: teamColors.primary,
                    fontWeight: FontWeight.bold,
                  ),
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

  LineChartData _buildLineChartData() {
    return LineChartData(
      gridData: FlGridData(
        show: true,
        drawVerticalLine: true,
        horizontalInterval: 0.2,
        verticalInterval: 1,
        getDrawingHorizontalLine: (value) => FlLine(
          color: Colors.grey.withOpacity(0.3),
          strokeWidth: 1,
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
            interval: 0.2,
            getTitlesWidget: (double value, TitleMeta meta) {
              return Text(
                '${(value * 100).toInt()}%',
                style: const TextStyle(
                  color: Colors.grey,
                  fontWeight: FontWeight.bold,
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
      minY: 0,
      maxY: 1,
      lineBarsData: [
        LineChartBarData(
          spots: data
              .asMap()
              .entries
              .map((entry) => FlSpot(entry.key.toDouble(), entry.value.y))
              .toList(),
          isCurved: true,
          gradient: LinearGradient(
            colors: [
              teamColors.primary.withOpacity(0.8),
              teamColors.secondary.withOpacity(0.8),
            ],
          ),
          barWidth: 3,
          isStrokeCapRound: true,
          dotData: FlDotData(
            show: true,
            getDotPainter: (spot, percent, barData, index) =>
                FlDotCirclePainter(
              radius: 4,
              color: teamColors.primary,
              strokeWidth: 2,
              strokeColor: Colors.white,
            ),
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
                return LineTooltipItem(
                  '${point.label}\n${(point.y * 100).toStringAsFixed(1)}% Win Rate',
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
        getTouchLineStart: (data, index) => 0,
        getTouchLineEnd: (data, index) => 1,
        touchSpotThreshold: 10,
      ),
    );
  }

  Widget _buildLegend() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: teamColors.primary,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          'Win Percentage',
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
                Icons.show_chart,
                size: 64,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 16),
              Text(
                'No Win/Loss Data Available',
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
