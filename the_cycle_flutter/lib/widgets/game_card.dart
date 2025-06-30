import 'package:flutter/material.dart';
import '../models/game.dart';
import '../utils/constants.dart';

class GameCard extends StatelessWidget {
  final Game game;
  final Function()? onTap;

  const GameCard({
    Key? key,
    required this.game,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppConstants.paddingMedium, 
          vertical: AppConstants.paddingSmall,
        ),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Team matchup
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        game.awayTeamCode.toUpperCase(),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const Text(' @ '),
                      Text(
                        game.homeTeamCode.toUpperCase(),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    game.date,
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
            ),
            // Score or time
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (game.status == GameStatus.completed && 
                    game.homeScore != null && game.awayScore != null)
                  Text(
                    '${game.awayScore}-${game.homeScore}',
                    style: TextStyle(
                      color: AppConstants.mlbRed,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  )
                else if (game.time != null)
                  Text(
                    game.time!, 
                    style: const TextStyle(color: Colors.grey),
                  )
                else
                  const Text(
                    'TBD', 
                    style: TextStyle(color: Colors.grey),
                  ),
                const SizedBox(height: 4),
                _buildStatusChip(),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip() {
    final color = AppConstants.getStatusColor(game.status);
    final text = AppConstants.getStatusText(game.status);
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color, 
          fontSize: 10, 
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
