import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/games_provider.dart';
import '../providers/standings_provider.dart';
import '../utils/constants.dart';
import '../widgets/games_widget.dart';
import '../widgets/offline_banner.dart';
import 'games_screen.dart';
import 'standings_screen.dart';
import 'settings_screen.dart';

class OverviewScreen extends StatefulWidget {
  const OverviewScreen({Key? key}) : super(key: key);

  @override
  State<OverviewScreen> createState() => _OverviewScreenState();
}

class _OverviewScreenState extends State<OverviewScreen> {
  @override
  void initState() {
    super.initState();
    // Load data when screen initializes
    _loadData();
  }

  // Load games and standings data
  Future<void> _loadData() async {
    final gamesProvider = Provider.of<GamesProvider>(context, listen: false);
    final standingsProvider = Provider.of<StandingsProvider>(context, listen: false);
    
    await Future.wait([
      gamesProvider.loadGames(),
      standingsProvider.loadStandings(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('The Cycle - MLB Dashboard'),
        backgroundColor: AppConstants.mlbRed,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              Navigator.pushNamed(context, '/settings');
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Offline status banner
          const OfflineBanner(),
          
          // Main content with refresh indicator
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadData,
              child: _buildBody(),
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: 0, // Overview screen
        type: BottomNavigationBarType.fixed, // Important for 4+ items
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.sports_baseball),
            label: 'Games',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.format_list_numbered),
            label: 'Standings',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
        onTap: (index) {
          // Navigate to other screens
          if (index == 1) {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const GamesScreen()),
            );
          } else if (index == 2) {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const StandingsScreen()),
            );
          } else if (index == 3) {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const SettingsScreen()),
            );
          }
        },
      ),
    );
  }

  Widget _buildBody() {
    return Consumer2<GamesProvider, StandingsProvider>(
      builder: (context, gamesProvider, standingsProvider, _) {
        // Show loading indicator if both providers are loading
        if (gamesProvider.isLoading && standingsProvider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }
        
        // Show error if either provider has an error
        if (gamesProvider.error != null || standingsProvider.error != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                Text(
                  gamesProvider.error ?? standingsProvider.error ?? 'An error occurred',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _loadData,
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }
        
        // Show dashboard content
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Live games section
              if (gamesProvider.liveGames.isNotEmpty)
                Container(
                  height: 300,
                  padding: const EdgeInsets.only(
                    top: AppConstants.paddingMedium,
                  ),
                  child: GamesWidget(
                    title: 'Live Games',
                    games: gamesProvider.liveGames,
                    onGameTap: (game) {
                      // Navigate to game details in the future
                    },
                  ),
                ),
              
              // Today's games section
              Container(
                height: 300,
                padding: const EdgeInsets.only(
                  top: AppConstants.paddingMedium,
                ),
                child: GamesWidget(
                  title: 'Today\'s Games',
                  games: gamesProvider.upcomingGames.take(8).toList(),
                  isLoading: gamesProvider.isLoading,
                  onGameTap: (game) {
                    // Navigate to game details in the future
                  },
                ),
              ),
              
              // Recent games section
              Container(
                height: 300,
                padding: const EdgeInsets.only(
                  top: AppConstants.paddingMedium,
                  bottom: AppConstants.paddingMedium,
                ),
                child: GamesWidget(
                  title: 'Recent Games',
                  games: gamesProvider.recentGames.take(8).toList(),
                  isLoading: gamesProvider.isLoading,
                  onGameTap: (game) {
                    // Navigate to game details in the future
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
