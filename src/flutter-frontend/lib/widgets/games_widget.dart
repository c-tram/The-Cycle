import 'package:flutter/material.dart';
import '../models/game.dart';
import '../utils/constants.dart';
import 'game_card.dart';

class GamesWidget extends StatelessWidget {
  final List<Game> games;
  final String title;
  final Function(Game)? onGameTap;
  final bool isLoading;

  const GamesWidget({
    Key? key,
    required this.games,
    required this.title,
    this.onGameTap,
    this.isLoading = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(AppConstants.paddingSmall),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(context),
          if (isLoading)
            const Expanded(
              child: Center(
                child: CircularProgressIndicator(),
              ),
            )
          else if (games.isEmpty)
            const Expanded(
              child: Center(
                child: Text('No games available'),
              ),
            )
          else
            // SCROLLABLE - Show ALL games, not just 5!
            Expanded(
              child: ListView.builder(
                itemCount: games.length,
                itemBuilder: (context, index) => GameCard(
                  game: games[index],
                  onTap: onGameTap != null 
                      ? () => onGameTap!(games[index])
                      : null,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppConstants.paddingMedium),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: AppConstants.mlbRed,
              fontWeight: FontWeight.bold,
            ),
          ),
          Chip(
            label: Text('${games.length}'),
            backgroundColor: AppConstants.mlbRed.withOpacity(0.2),
          ),
        ],
      ),
    );
  }
}
