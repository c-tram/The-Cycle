import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter/services.dart';

// Import providers
import 'providers/games_provider.dart';
import 'providers/standings_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/user_preferences_provider.dart';

// Import services
import 'services/notification_service.dart';
import 'services/connectivity_service.dart';
import 'services/auto_refresh_manager.dart';

// Import screens
import 'screens/overview_screen.dart';
import 'screens/games_screen.dart';
import 'screens/standings_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/team_details_screen.dart';

// Import config
import 'config/app_config.dart';

void main() async {
  // Ensure Flutter is initialized
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize services
  await NotificationService().initialize();
  await ConnectivityService().initialize();

  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  runApp(const TheCycleApp());
}

class TheCycleApp extends StatefulWidget {
  const TheCycleApp({super.key});

  @override
  State<TheCycleApp> createState() => _TheCycleAppState();
}

class _TheCycleAppState extends State<TheCycleApp> {
  final AutoRefreshManager _autoRefreshManager = AutoRefreshManager();

  @override
  void dispose() {
    _autoRefreshManager.dispose();
    super.dispose();
  }

  // Initialize the auto refresh manager with all required providers
  void _initAutoRefreshManager(BuildContext context) {
    // Only initialize once
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final gamesProvider = Provider.of<GamesProvider>(context, listen: false);
      final standingsProvider =
          Provider.of<StandingsProvider>(context, listen: false);
      final preferencesProvider =
          Provider.of<UserPreferencesProvider>(context, listen: false);

      _autoRefreshManager.initialize(
        gamesProvider: gamesProvider,
        standingsProvider: standingsProvider,
        preferencesProvider: preferencesProvider,
      );

      // Setup notifications based on user preferences
      preferencesProvider.setupNotifications(gamesProvider);
    });
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => GamesProvider()),
        ChangeNotifierProvider(create: (_) => StandingsProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => UserPreferencesProvider()),
        Provider(create: (_) => NotificationService()),
      ],
      child: Builder(
        builder: (context) {
          // Initialize auto refresh manager once providers are created
          _initAutoRefreshManager(context);

          return Consumer<ThemeProvider>(
            builder: (context, themeProvider, child) {
              return MaterialApp(
                title: AppConfig.appName,
                debugShowCheckedModeBanner: false,
                theme: ThemeData(
                  primarySwatch: Colors.blue,
                  primaryColor: const Color(0xFF1565C0), // Deep Blue
                  brightness: Brightness.light,
                  scaffoldBackgroundColor: Colors.white,
                  appBarTheme: const AppBarTheme(
                    backgroundColor: Color(0xFF1565C0), // Deep Blue
                    foregroundColor: Colors.white,
                    elevation: 2,
                  ),
                  colorScheme: ColorScheme.fromSwatch(
                    primarySwatch: Colors.blue,
                    accentColor: const Color(0xFF90A4AE), // Blue Grey
                    backgroundColor: Colors.white,
                    cardColor: const Color(0xFFF5F5F5), // Light Grey
                  ).copyWith(
                    primary: const Color(0xFF1565C0), // Deep Blue
                    secondary: const Color(0xFF90A4AE), // Blue Grey
                    surface: Colors.white,
                    background: Colors.white,
                  ),
                  cardTheme: const CardTheme(
                    color: Color(0xFFF5F5F5), // Light Grey
                    elevation: 2,
                  ),
                ),
                darkTheme: ThemeData(
                  primarySwatch: Colors.blue,
                  primaryColor:
                      const Color(0xFF1976D2), // Lighter Blue for dark mode
                  scaffoldBackgroundColor:
                      const Color(0xFF121212), // Dark background
                  brightness: Brightness.dark,
                  appBarTheme: const AppBarTheme(
                    backgroundColor: Color(0xFF1976D2),
                    foregroundColor: Colors.white,
                    elevation: 2,
                  ),
                  colorScheme: const ColorScheme.dark(
                    primary: Color(0xFF1976D2),
                    secondary: Color(0xFF78909C), // Darker Blue Grey
                    surface: Color(0xFF1E1E1E),
                    background: Color(0xFF121212),
                  ),
                  cardTheme: const CardTheme(
                    color: Color(0xFF1E1E1E), // Dark Grey
                    elevation: 2,
                  ),
                ),
                themeMode: themeProvider.themeMode,
                home: const OverviewScreen(),
                routes: {
                  '/games': (context) => const GamesScreen(),
                  '/standings': (context) => const StandingsScreen(),
                  '/settings': (context) => const SettingsScreen(),
                  '/team': (context) {
                    final args = ModalRoute.of(context)?.settings.arguments
                        as Map<String, dynamic>;
                    return TeamDetailsScreen(teamId: args['teamId']);
                  },
                },
              );
            },
          );
        },
      ),
    );
  }
}
