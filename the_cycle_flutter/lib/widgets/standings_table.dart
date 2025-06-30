import 'package:flutter/material.dart';
import '../models/standings.dart';
import '../models/team.dart';
import '../utils/constants.dart';

class StandingsTable extends StatelessWidget {
  final Division division;
  final Function(Team)? onTeamTap;

  const StandingsTable({
    Key? key,
    required this.division,
    this.onTeamTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(AppConstants.paddingSmall),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(context),
          _buildTeamsTable(context),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppConstants.paddingMedium),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).dividerColor,
          ),
        ),
      ),
      child: Row(
        children: [
          Text(
            '${division.league} ${division.name}',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTeamsTable(BuildContext context) {
    // Sort teams by division rank
    final teams = List<Team>.from(division.teams);
    teams.sort((a, b) {
      final rankA = a.record?.divisionRank ?? 999;
      final rankB = b.record?.divisionRank ?? 999;
      return rankA.compareTo(rankB);
    });

    return Column(
      children: [
        // Table header
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppConstants.paddingMedium,
            vertical: AppConstants.paddingSmall,
          ),
          child: Row(
            children: [
              const Expanded(
                flex: 2,
                child: Text('Team', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              Expanded(
                flex: 3,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: const [
                    Text('W', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('L', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('PCT', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('GB', style: TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
        ),
        
        // Team rows
        ...teams.map((team) => _buildTeamRow(context, team)).toList(),
      ],
    );
  }

  Widget _buildTeamRow(BuildContext context, Team team) {
    return InkWell(
      onTap: onTeamTap != null ? () => onTeamTap!(team) : null,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppConstants.paddingMedium,
          vertical: AppConstants.paddingSmall,
        ),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: Theme.of(context).dividerColor.withOpacity(0.3),
            ),
          ),
        ),
        child: Row(
          children: [
            // Team name and code
            Expanded(
              flex: 2,
              child: Row(
                children: [
                  Container(
                    width: 4,
                    height: 16,
                    decoration: BoxDecoration(
                      color: AppConstants.getTeamColor(team.code),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          team.name,
                          style: const TextStyle(fontWeight: FontWeight.w500),
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          team.code.toUpperCase(),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            // Stats
            Expanded(
              flex: 3,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Text('${team.record?.wins ?? "-"}'),
                  Text('${team.record?.losses ?? "-"}'),
                  Text('${_formatPct(team.record?.winPercentage)}'),
                  Text('${_formatGB(team.record?.gamesBehind)}'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatPct(double? pct) {
    if (pct == null) return '-';
    return pct.toStringAsFixed(3).substring(1); // Remove leading 0
  }

  String _formatGB(double? gb) {
    if (gb == null) return '-';
    if (gb == 0) return '-';
    return gb.toString();
  }
}
