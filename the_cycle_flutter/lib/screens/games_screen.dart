import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/game.dart';
import '../providers/games_provider.dart';
import '../providers/user_preferences_provider.dart';
import '../services/notification_service.dart';
import '../utils/constants.dart';
import '../utils/helpers.dart';
import '../widgets/offline_banner.dart';

class GamesScreen extends StatefulWidget {
  const GamesScreen({Key? key}) : super(key: key);

  @override
  State<GamesScreen> createState() => _GamesScreenState();
}

class _GamesScreenState extends State<GamesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    
    // Load games data if not already loaded
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final gamesProvider = Provider.of<GamesProvider>(context, listen: false);
      if (gamesProvider.games == null) {
        gamesProvider.loadGames();
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('MLB Games'),
        backgroundColor: AppConstants.mlbRed,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Live'),
            Tab(text: 'Upcoming'),
            Tab(text: 'Recent'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Offline banner
          const OfflineBanner(),
          
          // Games content
          Expanded(
            child: Consumer<GamesProvider>(
              builder: (context, gamesProvider, _) {
                if (gamesProvider.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }
                
                if (gamesProvider.error != null) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error, size: 64, color: Colors.red),
                        const SizedBox(height: 16),
                        Text(gamesProvider.error!),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => gamesProvider.refreshGames(),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }
                
                return TabBarView(
                  controller: _tabController,
                  children: [
                    // Live games tab
                    _buildGamesTab(
                      games: gamesProvider.liveGames,
                      emptyMessage: 'No live games at the moment',
                    ),
                    
                    // Upcoming games tab
                    _buildGamesTab(
                      games: gamesProvider.upcomingGames,
                      emptyMessage: 'No upcoming games',
                    ),
                    
                    // Recent games tab
                    _buildGamesTab(
                      games: gamesProvider.recentGames,
                      emptyMessage: 'No recent games',
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          final gamesProvider = Provider.of<GamesProvider>(context, listen: false);
          gamesProvider.refreshGames();
          AppHelpers.showSnackBar(context, 'Refreshing games data...');
        },
        backgroundColor: AppConstants.mlbRed,
        child: const Icon(Icons.refresh),
      ),
    );
  }

  Widget _buildGamesTab({required List<Game> games, required String emptyMessage}) {
    if (games.isEmpty) {
      return Center(
        child: Text(
          emptyMessage,
          style: const TextStyle(fontSize: 16),
        ),
      );
    }
    
    return ListView.builder(
      padding: const EdgeInsets.all(AppConstants.paddingSmall),
      itemCount: games.length,
      itemBuilder: (context, index) {
        final game = games[index];
        return Card(
          margin: const EdgeInsets.only(bottom: AppConstants.paddingSmall),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppConstants.paddingMedium,
              vertical: AppConstants.paddingSmall,
            ),
            title: Row(
              children: [
                Expanded(
                  child: Text(
                    game.awayTeam,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                Text(
                  game.awayScore?.toString() ?? '-',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: game.status == GameStatus.completed ? 
                        (game.awayScore! > game.homeScore! ? Colors.green : Colors.grey) : 
                        Colors.grey,
                  ),
                ),
              ],
            ),
            subtitle: Row(
              children: [
                Expanded(
                  child: Text(
                    game.homeTeam,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                Text(
                  game.homeScore?.toString() ?? '-',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: game.status == GameStatus.completed ? 
                        (game.homeScore! > game.awayScore! ? Colors.green : Colors.grey) : 
                        Colors.grey,
                  ),
                ),
              ],
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  AppHelpers.formatDate(game.date, includeYear: false),
                  style: const TextStyle(fontSize: 12),
                ),
                const SizedBox(height: 4),
                _buildGameStatusChip(game),
              ],
            ),
            onTap: () {
              // Show game actions sheet
              showModalBottomSheet(
                context: context,
                builder: (context) => Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ListTile(
                      leading: const Icon(Icons.notifications),
                      title: const Text('Set Notification'),
                      onTap: () {
                        Navigator.pop(context);
                        _showNotificationOptions(context, game);
                      },
                    ),
                    if (game.status == GameStatus.scheduled)
                      ListTile(
                        leading: const Icon(Icons.share),
                        title: const Text('Share Game'),
                        onTap: () {
                          Navigator.pop(context);
                          // Show share options in the future
                          AppHelpers.showSnackBar(context, 'Share feature coming soon');
                        },
                      ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildGameStatusChip(Game game) {
    final color = AppConstants.getStatusColor(game.status);
    final text = AppConstants.getStatusText(game.status);
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  // Show notification options for a specific game
  void _showNotificationOptions(BuildContext context, Game game) {
    final userPrefsProvider = Provider.of<UserPreferencesProvider>(context, listen: false);
    
    if (!userPrefsProvider.notificationsEnabled) {
      // Notifications are disabled, prompt to enable
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Notifications Disabled'),
          content: const Text(
            'Game notifications are currently disabled. '
            'Would you like to enable notifications?'
          ),
          actions: [
            TextButton(
              child: const Text('NO'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
            TextButton(
              child: const Text('YES'),
              onPressed: () async {
                await userPrefsProvider.toggleNotifications(true);
                Navigator.of(context).pop();
                
                // Now show specific game notification options
                _scheduleGameNotification(context, game);
              },
            ),
          ],
        ),
      );
      return;
    }
    
    _scheduleGameNotification(context, game);
  }
  
  // Schedule a notification for a specific game
  void _scheduleGameNotification(BuildContext context, Game game) {
    if (game.status != GameStatus.scheduled) {
      AppHelpers.showSnackBar(
        context,
        'Notifications can only be set for upcoming games',
        isError: true,
      );
      return;
    }
    
    final notificationService = Provider.of<NotificationService>(context, listen: false);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Game Notification'),
        content: Text('Set a notification for ${game.awayTeam} @ ${game.homeTeam}?'),
        actions: [
          TextButton(
            child: const Text('CANCEL'),
            onPressed: () {
              Navigator.of(context).pop();
            },
          ),
          TextButton(
            child: const Text('CONFIRM'),
            onPressed: () async {
              await notificationService.scheduleGameNotification(game);
              Navigator.of(context).pop();
              
              AppHelpers.showSnackBar(
                context,
                'Game notification has been set',
                isError: false,
              );
            },
          ),
        ],
      ),
    );
  }
}
