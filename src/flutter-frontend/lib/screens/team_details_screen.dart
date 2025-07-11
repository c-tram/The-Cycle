import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/team.dart';
import '../models/game.dart';
import '../models/player.dart';
import '../providers/games_provider.dart';
import '../providers/standings_provider.dart';
import '../services/team_branding_service.dart';
import '../services/api_service.dart';
import '../services/performance_analytics_service.dart';
import '../widgets/offline_banner.dart';
import '../widgets/charts/win_loss_chart.dart';
import '../widgets/charts/runs_chart.dart';
import '../widgets/charts/momentum_chart.dart';

// Enhanced screen to show detailed team information with team branding
class TeamDetailsScreen extends StatefulWidget {
  final String teamId;

  const TeamDetailsScreen({
    Key? key,
    required this.teamId,
  }) : super(key: key);

  @override
  State<TeamDetailsScreen> createState() => _TeamDetailsScreenState();
}

class _TeamDetailsScreenState extends State<TeamDetailsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TeamBrandingService _brandingService = TeamBrandingService();
  final ApiService _apiService = ApiService();
  final PerformanceAnalyticsService _analyticsService =
      PerformanceAnalyticsService();

  Team? _team;
  List<Player> _roster = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);

    // Load team data when screen opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadTeamData();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // Load comprehensive team data
  Future<void> _loadTeamData() async {
    try {
      setState(() {
        _isLoading = true;
      });

      final gamesProvider = Provider.of<GamesProvider>(context, listen: false);
      final standingsProvider =
          Provider.of<StandingsProvider>(context, listen: false);

      // Load basic data
      await gamesProvider.loadTeamGames(widget.teamId);
      await standingsProvider.loadStandings();

      // Get team from standings
      final allDivisions = standingsProvider.divisions ?? [];
      for (final division in allDivisions) {
        final foundTeam = division.teams.cast<Team?>().firstWhere(
              (team) => team?.code.toLowerCase() == widget.teamId.toLowerCase(),
              orElse: () => null,
            );
        if (foundTeam != null) {
          _team = foundTeam;
          break;
        }
      }

      // If team not found in standings, create a basic team object
      if (_team == null) {
        _team = Team(
          name: _getTeamNameFromCode(widget.teamId),
          code: widget.teamId,
          division: '',
          league: '',
        );
      }

      // Load roster data
      try {
        _roster = await _apiService.getTeamRoster(widget.teamId);
      } catch (e) {
        print('Error loading roster: $e');
        _roster = [];
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  String _getTeamNameFromCode(String code) {
    final Map<String, String> teamNames = {
      'nyy': 'New York Yankees',
      'bos': 'Boston Red Sox',
      'tor': 'Toronto Blue Jays',
      'bal': 'Baltimore Orioles',
      'tb': 'Tampa Bay Rays',
      'cle': 'Cleveland Guardians',
      'min': 'Minnesota Twins',
      'kc': 'Kansas City Royals',
      'det': 'Detroit Tigers',
      'cws': 'Chicago White Sox',
      'hou': 'Houston Astros',
      'sea': 'Seattle Mariners',
      'tex': 'Texas Rangers',
      'laa': 'Los Angeles Angels',
      'oak': 'Oakland Athletics',
      'atl': 'Atlanta Braves',
      'phi': 'Philadelphia Phillies',
      'nym': 'New York Mets',
      'mia': 'Miami Marlins',
      'wsh': 'Washington Nationals',
      'mil': 'Milwaukee Brewers',
      'chc': 'Chicago Cubs',
      'stl': 'St. Louis Cardinals',
      'cin': 'Cincinnati Reds',
      'pit': 'Pittsburgh Pirates',
      'lad': 'Los Angeles Dodgers',
      'sd': 'San Diego Padres',
      'sf': 'San Francisco Giants',
      'ari': 'Arizona Diamondbacks',
      'col': 'Colorado Rockies',
    };

    return teamNames[code.toLowerCase()] ?? code.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    if (_team == null && _isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Loading...'),
        ),
        body: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    // Get team colors and theme
    final teamColors = _brandingService.getTeamColors(widget.teamId);
    final teamTheme = _brandingService.getTeamTheme(widget.teamId,
        isDark: Theme.of(context).brightness == Brightness.dark);

    return Theme(
      data: teamTheme,
      child: Scaffold(
        body: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            SliverAppBar(
              expandedHeight: 200,
              floating: false,
              pinned: true,
              backgroundColor: teamColors.primary,
              flexibleSpace: FlexibleSpaceBar(
                title: Text(
                  _team?.name ?? 'Team Details',
                  style: TextStyle(
                    color: teamColors.accent,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                background: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        teamColors.primary,
                        teamColors.secondary,
                      ],
                    ),
                  ),
                  child: Stack(
                    children: [
                      // Team logo
                      Positioned(
                        right: 20,
                        top: 50,
                        child: Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: teamColors.accent.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(40),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(40),
                            child: CachedNetworkImage(
                              imageUrl: _brandingService
                                  .getTeamLogoUrl(widget.teamId),
                              fit: BoxFit.contain,
                              placeholder: (context, url) => Icon(
                                Icons.sports_baseball,
                                size: 40,
                                color: teamColors.accent,
                              ),
                              errorWidget: (context, url, error) => Icon(
                                Icons.sports_baseball,
                                size: 40,
                                color: teamColors.accent,
                              ),
                            ),
                          ),
                        ),
                      ),
                      // Team record overlay
                      if (_team?.record != null)
                        Positioned(
                          left: 20,
                          bottom: 20,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: teamColors.accent.withOpacity(0.9),
                              borderRadius: BorderRadius.circular(15),
                            ),
                            child: Text(
                              '${_team!.record!.wins}-${_team!.record!.losses}',
                              style: TextStyle(
                                color: teamColors.primary,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ],
          body: Column(
            children: [
              // Tab bar
              Container(
                color: teamColors.primary,
                child: TabBar(
                  controller: _tabController,
                  indicatorColor: teamColors.accent,
                  labelColor: teamColors.accent,
                  unselectedLabelColor: teamColors.accent.withOpacity(0.7),
                  tabs: const [
                    Tab(text: 'Overview'),
                    Tab(text: 'Roster'),
                    Tab(text: 'Schedule'),
                    Tab(text: 'Analytics'),
                  ],
                ),
              ),
              // Tab content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOverviewTab(teamColors),
                    _buildRosterTab(teamColors),
                    _buildScheduleTab(teamColors),
                    _buildAnalyticsTab(teamColors),
                  ],
                ),
              ),
            ],
          ),
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: _loadTeamData,
          backgroundColor: teamColors.primary,
          foregroundColor: teamColors.accent,
          child: const Icon(Icons.refresh),
        ),
      ),
    );
  }

  // Build overview tab with team info
  Widget _buildOverviewTab(TeamColors teamColors) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const OfflineBanner(),
          const SizedBox(height: 16),

          // Team information card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Team Information',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: teamColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 16),
                  if (_team != null) ...[
                    _buildInfoRow('Division', _team!.division),
                    _buildInfoRow('League', _team!.league),
                    if (_team!.record != null) ...[
                      _buildInfoRow('Record',
                          '${_team!.record!.wins}-${_team!.record!.losses}'),
                      if (_team!.record!.winPercentage != null)
                        _buildInfoRow('Win %',
                            _team!.record!.winPercentage!.toStringAsFixed(3)),
                      if (_team!.record!.gamesBehind != null)
                        _buildInfoRow(
                            'Games Behind',
                            _team!.record!.gamesBehind == 0.0
                                ? '-'
                                : _team!.record!.gamesBehind!
                                    .toStringAsFixed(1)),
                    ],
                  ],
                  _buildInfoRow('Players', '${_roster.length}'),
                  if (_roster.isNotEmpty) ...[
                    _buildInfoRow('Top Hitter', _getTopHitter()),
                    _buildInfoRow('Top Power', _getTopPowerHitter()),
                  ],
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Recent games card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Recent Games',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: teamColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 16),
                  Consumer<GamesProvider>(
                    builder: (context, gamesProvider, _) {
                      final teamGames =
                          gamesProvider.getTeamGames(widget.teamId) ?? [];

                      if (teamGames.isEmpty) {
                        return const Text('No recent games found.');
                      }

                      return Column(
                        children: teamGames
                            .take(5)
                            .map((game) => _buildGameTile(game, teamColors))
                            .toList(),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Build roster tab
  Widget _buildRosterTab(TeamColors teamColors) {
    if (_roster.isEmpty) {
      return const Center(
        child: Text('No roster data available.'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _roster.length,
      itemBuilder: (context, index) {
        final player = _roster[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            title: Text(
              player.name,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: teamColors.primary,
              ),
            ),
            subtitle: Text(player.position),
            trailing: player.stats != null
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (player.stats!.avg != null)
                        Text('AVG: ${player.stats!.avg!.toStringAsFixed(3)}'),
                      if (player.stats!.homeRuns != null)
                        Text('HR: ${player.stats!.homeRuns}'),
                    ],
                  )
                : null,
          ),
        );
      },
    );
  }

  // Build schedule tab
  Widget _buildScheduleTab(TeamColors teamColors) {
    return Consumer<GamesProvider>(
      builder: (context, gamesProvider, _) {
        final teamGames = gamesProvider.getTeamGames(widget.teamId) ?? [];

        if (teamGames.isEmpty) {
          return const Center(
            child: Text('No games found.'),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: teamGames.length,
          itemBuilder: (context, index) {
            final game = teamGames[index];
            return _buildGameTile(game, teamColors);
          },
        );
      },
    );
  }

  // Build analytics tab with performance charts
  Widget _buildAnalyticsTab(TeamColors teamColors) {
    return Consumer<GamesProvider>(
      builder: (context, gamesProvider, _) {
        final teamGames = gamesProvider.getTeamGames(widget.teamId) ?? [];
        final allGames = gamesProvider.allGames;
        final completedTeamGames = teamGames
            .where((game) => game.status == GameStatus.completed)
            .toList();

        // Debug information
        print('DEBUG: Team ID: ${widget.teamId}');
        print('DEBUG: Total games in provider: ${allGames.length}');
        print('DEBUG: Team games found: ${teamGames.length}');
        print('DEBUG: Completed team games: ${completedTeamGames.length}');

        if (teamGames.isEmpty || _team == null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.analytics, size: 64, color: Colors.grey[400]),
                const SizedBox(height: 16),
                Text(
                  'No data available for analytics',
                  style: TextStyle(color: Colors.grey[600], fontSize: 18),
                ),
                const SizedBox(height: 8),
                Text(
                  'Team: ${widget.teamId}',
                  style: TextStyle(color: Colors.grey[500], fontSize: 14),
                ),
                Text(
                  'Total games loaded: ${allGames.length}',
                  style: TextStyle(color: Colors.grey[500], fontSize: 14),
                ),
                Text(
                  'Team games found: ${teamGames.length}',
                  style: TextStyle(color: Colors.grey[500], fontSize: 14),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () async {
                    await gamesProvider.loadTeamGames(widget.teamId);
                  },
                  child: const Text('Reload Game Data'),
                ),
              ],
            ),
          );
        }

        if (completedTeamGames.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.schedule, size: 64, color: Colors.grey[400]),
                const SizedBox(height: 16),
                Text(
                  'No completed games for analytics',
                  style: TextStyle(color: Colors.grey[600], fontSize: 18),
                ),
                const SizedBox(height: 8),
                Text(
                  'Found ${teamGames.length} total games',
                  style: TextStyle(color: Colors.grey[500], fontSize: 14),
                ),
                Text(
                  'Upcoming: ${teamGames.where((g) => g.status == GameStatus.scheduled).length}',
                  style: TextStyle(color: Colors.grey[500], fontSize: 14),
                ),
                const SizedBox(height: 16),
                Text(
                  'Analytics will be available after games are completed',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                ),
              ],
            ),
          );
        }

        final analytics = _analyticsService.calculateTeamPerformance(
            _team!, teamGames, _roster);

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Performance metrics
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Performance Metrics',
                        style:
                            Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  color: teamColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                      ),
                      const SizedBox(height: 16),
                      _buildInfoRow('Win Percentage',
                          analytics.winPercentage.toStringAsFixed(3)),
                      _buildInfoRow('Average Runs Scored',
                          analytics.averageRunsScored.toStringAsFixed(1)),
                      _buildInfoRow('Average Runs Allowed',
                          analytics.averageRunsAllowed.toStringAsFixed(1)),
                      _buildInfoRow('Run Differential',
                          analytics.runDifferential.toStringAsFixed(1)),
                      _buildInfoRow('Team Momentum',
                          analytics.momentum.toStringAsFixed(2)),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Interactive Performance Charts
              _buildPerformanceCharts(teamGames, teamColors),

              const SizedBox(height: 16),

              // Game predictions
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Upcoming Game Predictions',
                        style:
                            Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  color: teamColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                          'AI-powered predictions based on team performance analytics coming soon...'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // Build interactive performance charts
  Widget _buildPerformanceCharts(List<Game> teamGames, TeamColors teamColors) {
    // Generate chart data
    final chartData =
        _analyticsService.generateAllCharts(teamGames, widget.teamId);
    final runsAllowedData =
        _analyticsService.generateRunsAllowedChart(teamGames, widget.teamId);

    return Column(
      children: [
        // Win/Loss Trend Chart
        WinLossChart(
          data: chartData[PerformanceChartType.winLoss] ?? [],
          teamColors: teamColors,
        ),
        const SizedBox(height: 16),

        // Runs Scored vs Allowed Chart
        RunsChart(
          runsScoredData: chartData[PerformanceChartType.runsScored] ?? [],
          runsAllowedData: runsAllowedData,
          teamColors: teamColors,
        ),
        const SizedBox(height: 16),

        // Team Momentum Chart
        MomentumChart(
          data: chartData[PerformanceChartType.momentum] ?? [],
          teamColors: teamColors,
        ),
        const SizedBox(height: 16),

        // Run Differential Chart
        Card(
          elevation: 4,
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Run Differential Trend',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: teamColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 16),
                if (chartData[PerformanceChartType.runDifferential]
                        ?.isNotEmpty ==
                    true)
                  Container(
                    height: 300,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount:
                          chartData[PerformanceChartType.runDifferential]!
                              .length,
                      itemBuilder: (context, index) {
                        final point = chartData[
                            PerformanceChartType.runDifferential]![index];
                        final isPositive = point.y >= 0;
                        return Container(
                          margin: const EdgeInsets.only(right: 8),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Container(
                                width: 24,
                                height: (point.y.abs() * 10).clamp(5, 200),
                                decoration: BoxDecoration(
                                  color: isPositive
                                      ? teamColors.primary.withOpacity(0.8)
                                      : Colors.red.withOpacity(0.8),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                point.label,
                                style: const TextStyle(fontSize: 10),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  )
                else
                  Container(
                    height: 200,
                    child: Center(
                      child: Text(
                        'No run differential data available',
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // Helper method to build info rows
  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          Text(value),
        ],
      ),
    );
  }

  // Helper method to build game tiles
  Widget _buildGameTile(Game game, TeamColors teamColors) {
    final isHome = game.homeTeamCode == widget.teamId;
    final opponent = isHome ? game.awayTeamCode : game.homeTeamCode;
    final gameResult = _getGameResult(game, isHome);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(
          isHome ? Icons.home : Icons.flight_takeoff,
          color: teamColors.primary,
        ),
        title: Text(
          '${isHome ? 'vs' : '@'} ${opponent.toUpperCase()}',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: teamColors.primary,
          ),
        ),
        subtitle: Text(game.date),
        trailing: gameResult.isNotEmpty
            ? Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: gameResult.startsWith('W') ? Colors.green : Colors.red,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  gameResult,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              )
            : const Text('TBD'),
      ),
    );
  }

  // Get game result for the team
  String _getGameResult(Game game, bool isHomeTeam) {
    if (game.homeScore == null || game.awayScore == null) {
      return '';
    }

    final teamScore = isHomeTeam ? game.homeScore! : game.awayScore!;
    final opponentScore = isHomeTeam ? game.awayScore! : game.homeScore!;

    if (teamScore > opponentScore) {
      return 'W $teamScore-$opponentScore';
    } else {
      return 'L $teamScore-$opponentScore';
    }
  }

  // Get top hitter from roster
  String _getTopHitter() {
    if (_roster.isEmpty) return 'N/A';

    Player? topHitter;
    double topAvg = 0.0;

    for (final player in _roster) {
      if (player.stats?.avg != null && player.stats!.avg! > topAvg) {
        topAvg = player.stats!.avg!;
        topHitter = player;
      }
    }

    return topHitter?.name ?? 'N/A';
  }

  // Get top power hitter from roster
  String _getTopPowerHitter() {
    if (_roster.isEmpty) return 'N/A';

    Player? topPowerHitter;
    int topHR = 0;

    for (final player in _roster) {
      if (player.stats?.homeRuns != null && player.stats!.homeRuns! > topHR) {
        topHR = player.stats!.homeRuns!;
        topPowerHitter = player;
      }
    }

    return topPowerHitter?.name ?? 'N/A';
  }
}
