import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/user_preferences.dart';
import '../providers/theme_provider.dart';
import '../providers/user_preferences_provider.dart';
import '../providers/standings_provider.dart';
import '../providers/games_provider.dart';
import '../utils/constants.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: AppConstants.mlbRed,
      ),
      body: Consumer2<UserPreferencesProvider, StandingsProvider>(
        builder: (context, prefsProvider, standingsProvider, _) {
          if (prefsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          return ListView(
            padding: const EdgeInsets.all(AppConstants.paddingMedium),
            children: [
              // Theme settings
              _buildSectionHeader(context, 'Appearance'),
              _buildThemeSelector(context),
              const Divider(),

              // Favorite team settings
              _buildSectionHeader(context, 'Team Preferences'),
              _buildFavoriteTeamSelector(
                  context, prefsProvider, standingsProvider),
              const Divider(),

              // Notification settings
              _buildSectionHeader(context, 'Notifications'),
              _buildNotificationsToggle(context, prefsProvider),
              const Divider(),

              // Display settings
              _buildSectionHeader(context, 'Display'),
              _buildScoresToggle(context, prefsProvider),
              const Divider(),

              // Data settings
              _buildSectionHeader(context, 'Data & Updates'),
              _buildRefreshFrequencySelector(context, prefsProvider),
              _buildAutoRefreshToggle(context, prefsProvider),
              _buildDataOptimizationToggle(context, prefsProvider),

              const SizedBox(height: AppConstants.paddingLarge),
              _buildAboutSection(context),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleMedium!.copyWith(
              color: AppConstants.mlbRed,
              fontWeight: FontWeight.bold,
            ),
      ),
    );
  }

  Widget _buildThemeSelector(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, _) {
        return ListTile(
          title: const Text('Theme'),
          subtitle: Text(
              themeProvider.themeMode == ThemeMode.dark ? 'Dark' : 'Light'),
          trailing: Switch(
            value: themeProvider.themeMode == ThemeMode.dark,
            activeColor: AppConstants.mlbRed,
            onChanged: (value) {
              themeProvider.setThemeMode(
                value ? ThemeMode.dark : ThemeMode.light,
              );
            },
          ),
          onTap: () {
            themeProvider.toggleTheme();
          },
        );
      },
    );
  }

  Widget _buildFavoriteTeamSelector(
      BuildContext context,
      UserPreferencesProvider prefsProvider,
      StandingsProvider standingsProvider) {
    // Get the favorite team name for display
    final favoriteTeamCode = prefsProvider.favoriteTeam;
    String? favoriteTeamName;

    if (favoriteTeamCode != null && standingsProvider.divisions != null) {
      for (final division in standingsProvider.divisions!) {
        final team =
            division.teams.where((t) => t.code == favoriteTeamCode).firstOrNull;
        if (team != null) {
          favoriteTeamName = team.name;
          break;
        }
      }
    }

    return ListTile(
      title: const Text('Favorite Team'),
      subtitle: Text(favoriteTeamName ?? 'No team selected'),
      trailing: const Icon(Icons.chevron_right),
      onTap: () {
        _showTeamSelectorDialog(context, prefsProvider, standingsProvider);
      },
    );
  }

  void _showTeamSelectorDialog(
      BuildContext context,
      UserPreferencesProvider prefsProvider,
      StandingsProvider standingsProvider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Favorite Team'),
        content: SizedBox(
          width: double.maxFinite,
          height: 400,
          child: standingsProvider.divisions == null
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  itemCount: standingsProvider.divisions!.length,
                  itemBuilder: (context, divisionIndex) {
                    final division =
                        standingsProvider.divisions![divisionIndex];
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: Text(
                            division.name,
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall!
                                .copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AppConstants.mlbRed,
                                ),
                          ),
                        ),
                        ...division.teams
                            .map((team) => ListTile(
                                  title: Text(team.name),
                                  subtitle: Text(team.code),
                                  trailing:
                                      prefsProvider.favoriteTeam == team.code
                                          ? const Icon(Icons.check,
                                              color: AppConstants.mlbRed)
                                          : null,
                                  onTap: () {
                                    prefsProvider.setFavoriteTeam(team.code);
                                    Navigator.of(context).pop();
                                  },
                                ))
                            .toList(),
                      ],
                    );
                  },
                ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationsToggle(
      BuildContext context, UserPreferencesProvider prefsProvider) {
    final gamesProvider = Provider.of<GamesProvider>(context, listen: false);

    return ListTile(
      title: const Text('Game Notifications'),
      subtitle: const Text('Receive notifications for game updates'),
      trailing: Switch(
        value: prefsProvider.notificationsEnabled,
        activeColor: AppConstants.mlbRed,
        onChanged: (value) async {
          await prefsProvider.toggleNotifications(value);
          // Update notifications when preference changes
          prefsProvider.setupNotifications(gamesProvider);
        },
      ),
      onTap: () async {
        await prefsProvider
            .toggleNotifications(!prefsProvider.notificationsEnabled);
        // Update notifications when preference changes
        prefsProvider.setupNotifications(gamesProvider);
      },
    );
  }

  Widget _buildScoresToggle(
      BuildContext context, UserPreferencesProvider prefsProvider) {
    return ListTile(
      title: const Text('Show Scores'),
      subtitle: const Text('Display live scores and results'),
      trailing: Switch(
        value: prefsProvider.showScoresOnHomeScreen,
        activeColor: AppConstants.mlbRed,
        onChanged: (value) {
          prefsProvider.toggleScoresOnHomeScreen(value);
        },
      ),
      onTap: () {
        prefsProvider
            .toggleScoresOnHomeScreen(!prefsProvider.showScoresOnHomeScreen);
      },
    );
  }

  Widget _buildRefreshFrequencySelector(
      BuildContext context, UserPreferencesProvider prefsProvider) {
    final Map<RefreshFrequency, String> frequencyLabels = {
      RefreshFrequency.low: '5 minutes',
      RefreshFrequency.medium: '1 minute',
      RefreshFrequency.high: '30 seconds',
      RefreshFrequency.live: 'Real-time',
    };

    return ListTile(
      title: const Text('Refresh Frequency'),
      subtitle:
          Text('Every ${frequencyLabels[prefsProvider.refreshFrequency]}'),
      trailing: const Icon(Icons.chevron_right),
      onTap: () {
        _showRefreshFrequencyDialog(context, prefsProvider);
      },
    );
  }

  void _showRefreshFrequencyDialog(
      BuildContext context, UserPreferencesProvider prefsProvider) {
    final Map<RefreshFrequency, String> frequencyLabels = {
      RefreshFrequency.low: '5 minutes',
      RefreshFrequency.medium: '1 minute',
      RefreshFrequency.high: '30 seconds',
      RefreshFrequency.live: 'Real-time',
    };

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Refresh Frequency'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: RefreshFrequency.values
              .map((frequency) => RadioListTile<RefreshFrequency>(
                    title: Text(frequencyLabels[frequency] ?? 'Unknown'),
                    value: frequency,
                    groupValue: prefsProvider.refreshFrequency,
                    activeColor: AppConstants.mlbRed,
                    onChanged: (value) {
                      if (value != null) {
                        prefsProvider.setRefreshFrequency(value);
                        Navigator.of(context).pop();
                      }
                    },
                  ))
              .toList(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  Widget _buildAutoRefreshToggle(
      BuildContext context, UserPreferencesProvider prefsProvider) {
    return ListTile(
      title: const Text('Auto Refresh'),
      subtitle: const Text('Automatically refresh data in background'),
      trailing: Switch(
        value: prefsProvider.autoRefreshEnabled,
        activeColor: AppConstants.mlbRed,
        onChanged: (value) {
          prefsProvider.toggleAutoRefresh(value);
        },
      ),
      onTap: () {
        prefsProvider.toggleAutoRefresh(!prefsProvider.autoRefreshEnabled);
      },
    );
  }

  Widget _buildDataOptimizationToggle(
      BuildContext context, UserPreferencesProvider prefsProvider) {
    return ListTile(
      title: const Text('Optimize Data Usage'),
      subtitle: const Text('Use cached data when possible'),
      trailing: Switch(
        value: prefsProvider.dataUsageOptimizationEnabled,
        activeColor: AppConstants.mlbRed,
        onChanged: (value) {
          prefsProvider.toggleDataUsageOptimization(value);
        },
      ),
      onTap: () {
        prefsProvider.toggleDataUsageOptimization(
            !prefsProvider.dataUsageOptimizationEnabled);
      },
    );
  }

  Widget _buildAboutSection(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppConstants.paddingMedium),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'About The Cycle',
              style: Theme.of(context).textTheme.titleMedium!.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            const Text(
                'A comprehensive MLB dashboard app providing real-time scores, standings, and player statistics.'),
            const SizedBox(height: 16),
            Row(
              children: [
                const Text('Version: '),
                Text(
                  '1.0.0',
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
