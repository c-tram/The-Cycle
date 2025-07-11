import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/performance_analytics_service.dart';
import '../../services/team_branding_service.dart';

class RunsChart extends StatelessWidget {
  final List<PerformanceDataPoint> runsScoredData;
  final List<PerformanceDataPoint> runsAllowedData;
  final TeamColors teamColors;
  final String title;

  const RunsChart({
    Key? key,
    required this.runsScoredData,
    required this.runsAllowedData,
    required this.teamColors,
    this.title = 'Runs Scored vs Allowed',
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (runsScoredData.isEmpty && runsAllowedData.isEmpty) {
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
    final maxLength = [runsScoredData.length, runsAllowedData.length]
        .reduce((a, b) => a > b ? a : b);
    final maxY = _calculateMaxY();

    return LineChartData(
      gridData: FlGridData(
        show: true,
        drawVerticalLine: true,
        horizontalInterval: maxY / 5,
        verticalInterval: maxLength > 10 ? (maxLength / 5).ceilToDouble() : 1,
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
            interval: maxLength > 10 ? (maxLength / 5).ceilToDouble() : 1,
            getTitlesWidget: (double value, TitleMeta meta) {
              if (value.toInt() >= 0 && value.toInt() < runsScoredData.length) {
                final point = runsScoredData[value.toInt()];
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
            interval: maxY / 5,
            getTitlesWidget: (double value, TitleMeta meta) {
              return Text(
                value.toInt().toString(),
                style: const TextStyle(
                  color: Colors.grey,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              );
            },
            reservedSize: 32,
          ),
        ),
      ),
      borderData: FlBorderData(
        show: true,
        border: Border.all(color: Colors.grey.withOpacity(0.3)),
      ),
      minX: 0,
      maxX: (maxLength - 1).toDouble(),
      minY: 0,
      maxY: maxY,
      lineBarsData: [
        // Runs Scored Line
        if (runsScoredData.isNotEmpty)
          LineChartBarData(
            spots: runsScoredData
                .asMap()
                .entries
                .map((entry) => FlSpot(entry.key.toDouble(), entry.value.y))
                .toList(),
            isCurved: true,
            color: teamColors.primary,
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, percent, barData, index) =>
                  FlDotCirclePainter(
                radius: 3,
                color: teamColors.primary,
                strokeWidth: 2,
                strokeColor: Colors.white,
              ),
            ),
            belowBarData: BarAreaData(
              show: true,
              color: teamColors.primary.withOpacity(0.2),
            ),
          ),
        // Runs Allowed Line
        if (runsAllowedData.isNotEmpty)
          LineChartBarData(
            spots: runsAllowedData
                .asMap()
                .entries
                .map((entry) => FlSpot(entry.key.toDouble(), entry.value.y))
                .toList(),
            isCurved: true,
            color: Colors.red[400]!,
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, percent, barData, index) =>
                  FlDotCirclePainter(
                radius: 3,
                color: Colors.red[400]!,
                strokeWidth: 2,
                strokeColor: Colors.white,
              ),
            ),
            belowBarData: BarAreaData(
              show: true,
              color: Colors.red[400]!.withOpacity(0.2),
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
              final isRunsScored = barSpot.barIndex == 0;

              if (isRunsScored && index >= 0 && index < runsScoredData.length) {
                final point = runsScoredData[index];
                return LineTooltipItem(
                  '${point.label}\nRuns Scored: ${point.y.toStringAsFixed(1)}',
                  const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                );
              } else if (!isRunsScored &&
                  index >= 0 &&
                  index < runsAllowedData.length) {
                final point = runsAllowedData[index];
                return LineTooltipItem(
                  '${point.label}\nRuns Allowed: ${point.y.toStringAsFixed(1)}',
                  TextStyle(
                    color: Colors.red[100]!,
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

  double _calculateMaxY() {
    double maxScored = runsScoredData.isEmpty
        ? 0
        : runsScoredData.map((e) => e.y).reduce((a, b) => a > b ? a : b);
    double maxAllowed = runsAllowedData.isEmpty
        ? 0
        : runsAllowedData.map((e) => e.y).reduce((a, b) => a > b ? a : b);

    final max = [maxScored, maxAllowed].reduce((a, b) => a > b ? a : b);
    return (max * 1.1).ceilToDouble(); // Add 10% padding
  }

  Widget _buildLegend() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (runsScoredData.isNotEmpty) ...[
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
            'Runs Scored',
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
        if (runsScoredData.isNotEmpty && runsAllowedData.isNotEmpty)
          const SizedBox(width: 24),
        if (runsAllowedData.isNotEmpty) ...[
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: Colors.red[400],
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            'Runs Allowed',
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
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
                Icons.bar_chart,
                size: 64,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 16),
              Text(
                'No Runs Data Available',
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
