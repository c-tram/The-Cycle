import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../utils/constants.dart';

/// Data point for trends chart
class TrendPoint {
  final int x; // X-axis value (e.g., game number or date index)
  final double y; // Y-axis value (e.g., runs, avg, win percentage)

  const TrendPoint({required this.x, required this.y});
}

/// Chart type enum for different visualization types
enum TrendChartType { line, bar, scatter }

/// A widget for visualizing MLB data trends
class TrendsChart extends StatelessWidget {
  final List<List<TrendPoint>> datasets;
  final List<Color> colors;
  final String title;
  final String xAxisLabel;
  final String yAxisLabel;
  final TrendChartType chartType;
  final bool showLegend;
  final List<String>? legendLabels;

  const TrendsChart({
    Key? key,
    required this.datasets,
    required this.colors,
    required this.title,
    this.xAxisLabel = '',
    this.yAxisLabel = '',
    this.chartType = TrendChartType.line,
    this.showLegend = false,
    this.legendLabels,
  })  : assert(legendLabels == null || legendLabels.length == datasets.length,
            'Legend labels must match the number of datasets'),
        super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      margin: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppConstants.mlbRed,
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 300,
              child: _buildChart(),
            ),
            if (showLegend && legendLabels != null) _buildLegend(),
          ],
        ),
      ),
    );
  }

  /// Build the chart based on the specified type
  Widget _buildChart() {
    switch (chartType) {
      case TrendChartType.line:
        return LineChart(_buildLineChartData());
      case TrendChartType.bar:
        return BarChart(_buildBarChartData());
      case TrendChartType.scatter:
        return ScatterChart(_buildScatterChartData());
    }
  }

  /// Build line chart data from datasets
  LineChartData _buildLineChartData() {
    return LineChartData(
      titlesData: _buildTitles(),
      borderData: _buildBorderData(),
      gridData: _buildGridData(),
      lineBarsData: _buildLineBarsData(),
      lineTouchData: _buildLineTouchData(),
    );
  }

  /// Build bar chart data from datasets
  BarChartData _buildBarChartData() {
    // Group bars by x value
    final Map<int, List<BarChartRodData>> groupedBars = {};

    for (int i = 0; i < datasets.length; i++) {
      for (final point in datasets[i]) {
        if (!groupedBars.containsKey(point.x)) {
          groupedBars[point.x] = [];
        }

        groupedBars[point.x]!.add(BarChartRodData(
          fromY: 0,
          toY: point.y,
          color: colors[i % colors.length],
          width: 16,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(4),
            topRight: Radius.circular(4),
          ),
        ));
      }
    }

    final sortedKeys = groupedBars.keys.toList()..sort();
    final barGroups = sortedKeys.map((x) {
      return BarChartGroupData(
        x: x,
        barRods: groupedBars[x]!,
      );
    }).toList();

    return BarChartData(
      titlesData: _buildTitles(),
      borderData: _buildBorderData(),
      gridData: _buildGridData(),
      barGroups: barGroups,
      barTouchData: _buildBarTouchData(),
    );
  }

  /// Build scatter chart data from datasets
  ScatterChartData _buildScatterChartData() {
    final scatterSpots = <ScatterSpot>[];

    for (int i = 0; i < datasets.length; i++) {
      for (final point in datasets[i]) {
        scatterSpots.add(ScatterSpot(
          point.x.toDouble(),
          point.y,
          color: colors[i % colors.length],
          radius: 4,
        ));
      }
    }

    return ScatterChartData(
      titlesData: _buildTitles(),
      borderData: _buildBorderData(),
      gridData: _buildGridData(),
      scatterSpots: scatterSpots,
      scatterTouchData: _buildScatterTouchData(),
    );
  }

  /// Build line bars for the line chart
  List<LineChartBarData> _buildLineBarsData() {
    final lineBarsData = <LineChartBarData>[];

    for (int i = 0; i < datasets.length; i++) {
      final spots = datasets[i]
          .map((point) => FlSpot(point.x.toDouble(), point.y))
          .toList();

      lineBarsData.add(
        LineChartBarData(
          spots: spots,
          isCurved: true,
          color: colors[i % colors.length],
          barWidth: 3,
          isStrokeCapRound: true,
          dotData: FlDotData(show: false),
          belowBarData: BarAreaData(
            show: true,
            color: colors[i % colors.length].withOpacity(0.2),
          ),
        ),
      );
    }

    return lineBarsData;
  }

  /// Build grid data for charts
  FlGridData _buildGridData() {
    return FlGridData(
      show: true,
      drawVerticalLine: true,
      getDrawingHorizontalLine: (value) {
        return FlLine(
          color: Colors.grey[300]!,
          strokeWidth: 1,
        );
      },
      getDrawingVerticalLine: (value) {
        return FlLine(
          color: Colors.grey[300]!,
          strokeWidth: 1,
        );
      },
    );
  }

  /// Build border data for charts
  FlBorderData _buildBorderData() {
    return FlBorderData(
      show: true,
      border: Border.all(color: const Color(0xff37434d), width: 1),
    );
  }

  /// Build titles data for charts
  FlTitlesData _buildTitles() {
    return FlTitlesData(
      bottomTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 30,
          getTitlesWidget: (value, meta) {
            return Padding(
              padding: const EdgeInsets.only(top: 8.0),
              child: Text(
                value.toInt().toString(),
                style: const TextStyle(
                  color: Color(0xff68737d),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            );
          },
        ),
        axisNameWidget: Text(
          xAxisLabel,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
      ),
      leftTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 40,
          getTitlesWidget: (value, meta) {
            return Text(
              value.toInt().toString(),
              style: const TextStyle(
                color: Color(0xff68737d),
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
              textAlign: TextAlign.right,
            );
          },
        ),
        axisNameWidget: Text(
          yAxisLabel,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
      ),
      topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
      rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
    );
  }

  /// Build touch data for line charts
  LineTouchData _buildLineTouchData() {
    return LineTouchData(
      touchTooltipData: LineTouchTooltipData(
        tooltipBgColor: Colors.blueGrey.withOpacity(0.8),
        getTooltipItems: (List<LineBarSpot> touchedBarSpots) {
          return touchedBarSpots.map((barSpot) {
            final datasetIndex = barSpot.barIndex;
            String label = '';

            if (showLegend && legendLabels != null) {
              label = '${legendLabels![datasetIndex]}: ';
            }

            return LineTooltipItem(
              '$label${barSpot.y.toString()}',
              const TextStyle(color: Colors.white),
            );
          }).toList();
        },
      ),
    );
  }

  /// Build touch data for bar charts
  BarTouchData _buildBarTouchData() {
    return BarTouchData(
      touchTooltipData: BarTouchTooltipData(
        tooltipBgColor: Colors.blueGrey.withOpacity(0.8),
        getTooltipItem: (group, groupIndex, rod, rodIndex) {
          String label = '';

          if (showLegend &&
              legendLabels != null &&
              rodIndex < legendLabels!.length) {
            label = '${legendLabels![rodIndex]}: ';
          }

          return BarTooltipItem(
            '$label${rod.toY.toString()}',
            const TextStyle(color: Colors.white),
          );
        },
      ),
    );
  }

  /// Build touch data for scatter charts
  ScatterTouchData _buildScatterTouchData() {
    return ScatterTouchData(
      enabled: true,
      touchTooltipData: ScatterTouchTooltipData(
        tooltipBgColor: Colors.blueGrey.withOpacity(0.8),
        getTooltipItems: (ScatterSpot touchedSpot) {
          int datasetIndex = 0;
          // Find the dataset index from x and y values
          for (int i = 0; i < datasets.length; i++) {
            for (var point in datasets[i]) {
              if (point.x == touchedSpot.x.toInt() &&
                  point.y == touchedSpot.y) {
                datasetIndex = i;
                break;
              }
            }
          }

          String label = '';
          if (showLegend && legendLabels != null) {
            label = '${legendLabels![datasetIndex]}: ';
          }

          return ScatterTooltipItem(
            '$label(${touchedSpot.x.toInt()}, ${touchedSpot.y})',
            textStyle: const TextStyle(color: Colors.white),
          );
        },
      ),
    );
  }

  /// Build a legend for the chart
  Widget _buildLegend() {
    return Padding(
      padding: const EdgeInsets.only(top: 16.0),
      child: Wrap(
        spacing: 16.0,
        runSpacing: 8.0,
        children: List.generate(
          datasets.length,
          (index) => _buildLegendItem(
              legendLabels![index], colors[index % colors.length]),
        ),
      ),
    );
  }

  /// Build an individual legend item
  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 8),
        Text(label),
      ],
    );
  }
}
