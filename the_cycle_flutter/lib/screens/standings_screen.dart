import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/team.dart';
import '../providers/standings_provider.dart';
import '../utils/constants.dart';
import '../utils/helpers.dart';
import '../widgets/standings_table.dart';
import '../widgets/offline_banner.dart';

class StandingsScreen extends StatefulWidget {
  const StandingsScreen({Key? key}) : super(key: key);

  @override
  State<StandingsScreen> createState() => _StandingsScreenState();
}

class _StandingsScreenState extends State<StandingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    
    // Load standings data if not already loaded
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final standingsProvider = Provider.of<StandingsProvider>(context, listen: false);
      if (standingsProvider.divisions == null) {
        standingsProvider.loadStandings();
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
        title: const Text('MLB Standings'),
        backgroundColor: AppConstants.mlbRed,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'American League'),
            Tab(text: 'National League'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Offline banner
          const OfflineBanner(),
          
          // Standings content
          Expanded(
            child: Consumer<StandingsProvider>(
              builder: (context, standingsProvider, _) {
                if (standingsProvider.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }
                
                if (standingsProvider.error != null) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error, size: 64, color: Colors.red),
                        const SizedBox(height: 16),
                        Text(standingsProvider.error!),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => standingsProvider.refreshStandings(),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }
                
                if (standingsProvider.divisions == null || standingsProvider.divisions!.isEmpty) {
                  return const Center(
                    child: Text('No standings available'),
                  );
                }
                
                // Filter divisions by league
                final alDivisions = standingsProvider.divisions!
                    .where((div) => div.league == 'AL')
                    .toList();
                final nlDivisions = standingsProvider.divisions!
                    .where((div) => div.league == 'NL')
                    .toList();
                
                return TabBarView(
                  controller: _tabController,
                  children: [
                    // American League
                    _buildStandingsByLeague(alDivisions),
                    
                    // National League
                    _buildStandingsByLeague(nlDivisions),
                  ],
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          final standingsProvider = Provider.of<StandingsProvider>(context, listen: false);
          standingsProvider.refreshStandings();
          AppHelpers.showSnackBar(context, 'Refreshing standings data...');
        },
        backgroundColor: AppConstants.mlbRed,
        child: const Icon(Icons.refresh),
      ),
    );
  }

  Widget _buildStandingsByLeague(List<dynamic> divisions) {
    if (divisions.isEmpty) {
      return const Center(
        child: Text(
          'No standings available',
          style: TextStyle(fontSize: 16),
        ),
      );
    }
    
    return ListView.builder(
      padding: const EdgeInsets.all(AppConstants.paddingSmall),
      itemCount: divisions.length,
      itemBuilder: (context, index) {
        final division = divisions[index];
        return StandingsTable(
          division: division,
          onTeamTap: (Team team) {
            // Navigate to team details page
            Navigator.of(context).pushNamed(
              '/team',
              arguments: {'teamId': team.code},
            );
          },
        );
      },
    );
  }
}
