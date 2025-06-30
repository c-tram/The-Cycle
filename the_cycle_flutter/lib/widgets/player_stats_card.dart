import 'package:flutter/material.dart';
import '../models/player.dart';
import '../utils/constants.dart';

/// Widget to display player statistics in a card format
class PlayerStatsCard extends StatelessWidget {
  final Player player;
  final bool expanded;
  final VoidCallback? onTap;

  const PlayerStatsCard({
    Key? key,
    required this.player,
    this.expanded = false,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppConstants.paddingMedium),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildPlayerHeader(context),
              if (expanded) ...[
                const Divider(),
                _buildExpandedStats(context),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // Player header with name, position, number
  Widget _buildPlayerHeader(BuildContext context) {
    return Row(
      children: [
        // Player image or placeholder
        CircleAvatar(
          radius: 25,
          backgroundImage:
              player.imageUrl != null ? NetworkImage(player.imageUrl!) : null,
          backgroundColor: Colors.grey.shade200,
          child: player.imageUrl == null
              ? Text(
                  player.name.substring(0, 1),
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                )
              : null,
        ),
        const SizedBox(width: AppConstants.paddingMedium),

        // Player info
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                player.name,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              Text(
                player.position,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),
              Text(
                player.team,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),

        // Key stat
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _buildKeyStatWidget(context),
            if (!expanded)
              const Icon(
                Icons.chevron_right,
                color: AppConstants.mlbRed,
              ),
          ],
        ),
      ],
    );
  }

  // Show expanded player statistics
  Widget _buildExpandedStats(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),

        // Basic info section
        _buildInfoSection(context),
        const SizedBox(height: AppConstants.paddingMedium),

        // Stats based on player type
        (player.stats?.isBatter ?? false)
            ? _buildHittingStats(context)
            : _buildPitchingStats(context),
      ],
    );
  }

  // Player basic info section
  Widget _buildInfoSection(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _buildInfoItem('Team', player.team),
        _buildInfoItem('Position', player.position),
        _buildInfoItem(
            'Type', (player.stats?.isBatter ?? false) ? 'Batter' : 'Pitcher'),
      ],
    );
  }

  // Individual info item
  Widget _buildInfoItem(String label, String value) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  // Hitting statistics table
  Widget _buildHittingStats(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Season Hitting Stats'),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            columnSpacing: 16,
            horizontalMargin: 8,
            headingRowHeight: 32,
            dataRowHeight: 38,
            columns: const [
              DataColumn(label: Text('AVG')),
              DataColumn(label: Text('HR')),
              DataColumn(label: Text('RBI')),
              DataColumn(label: Text('R')),
              DataColumn(label: Text('H')),
              DataColumn(label: Text('OBP')),
              DataColumn(label: Text('SLG')),
              DataColumn(label: Text('OPS')),
            ],
            rows: [
              DataRow(cells: [
                DataCell(Text(player.stats?.avg?.toStringAsFixed(3) ?? '--')),
                DataCell(Text(player.stats?.homeRuns?.toString() ?? '--')),
                DataCell(Text(player.stats?.rbi?.toString() ?? '--')),
                DataCell(Text(player.stats?.runs?.toString() ?? '--')),
                DataCell(Text(player.stats?.hits?.toString() ?? '--')),
                DataCell(Text(player.stats?.obp?.toStringAsFixed(3) ?? '--')),
                DataCell(Text(player.stats?.slg?.toStringAsFixed(3) ?? '--')),
                DataCell(Text(player.stats?.ops?.toStringAsFixed(3) ?? '--')),
              ]),
            ],
          ),
        ),
      ],
    );
  }

  // Pitching statistics table
  Widget _buildPitchingStats(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Season Pitching Stats'),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            columnSpacing: 16,
            horizontalMargin: 8,
            headingRowHeight: 32,
            dataRowHeight: 38,
            columns: const [
              DataColumn(label: Text('ERA')),
              DataColumn(label: Text('W')),
              DataColumn(label: Text('L')),
              DataColumn(label: Text('SV')),
              DataColumn(label: Text('IP')),
              DataColumn(label: Text('SO')),
              DataColumn(label: Text('WHIP')),
            ],
            rows: [
              DataRow(cells: [
                DataCell(Text(player.stats?.era?.toStringAsFixed(2) ?? '--')),
                DataCell(Text(player.stats?.wins?.toString() ?? '--')),
                DataCell(Text(player.stats?.losses?.toString() ?? '--')),
                DataCell(Text(player.stats?.saves?.toString() ?? '--')),
                DataCell(Text(
                    player.stats?.inningsPitched?.toStringAsFixed(1) ?? '--')),
                DataCell(Text(player.stats?.strikeouts?.toString() ?? '--')),
                DataCell(Text(player.stats?.whip?.toStringAsFixed(2) ?? '--')),
              ]),
            ],
          ),
        ),
      ],
    );
  }

  // Section title
  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.bold,
        color: AppConstants.mlbRed,
      ),
    );
  }

  // Display key statistic based on player type
  Widget _buildKeyStatWidget(BuildContext context) {
    if (player.stats?.isBatter ?? false) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          const Text(
            'AVG',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey,
            ),
          ),
          Text(
            player.stats?.avg?.toStringAsFixed(3) ?? '--',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      );
    } else {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          const Text(
            'ERA',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey,
            ),
          ),
          Text(
            player.stats?.era?.toStringAsFixed(2) ?? '--',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      );
    }
  }
}
