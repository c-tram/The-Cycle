import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';
import '../services/connectivity_service.dart';
import '../services/notification_service.dart';
import '../models/game.dart';

// Provider to manage games data and handle loading states
class GamesProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  final CacheService _cacheService = CacheService();
  final ConnectivityService _connectivityService = ConnectivityService();

  GamesData? _games;
  bool _isLoading = false;
  String? _error;
  bool _isOffline = false;

  GamesData? get games => _games;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isOffline => _isOffline;

  List<Game> get recentGames => _games?.recentGames ?? [];
  List<Game> get upcomingGames => _games?.upcomingGames ?? [];
  List<Game> get liveGames => _games?.liveGames ?? [];

  // Returns all games in a single list
  List<Game> get allGames {
    List<Game> all = [];
    if (_games != null) {
      all.addAll(_games!.liveGames);
      all.addAll(_games!.upcomingGames);
      all.addAll(_games!.recentGames);
    }
    return all;
  }

  // Map to store team-specific games
  final Map<String, List<Game>> _teamGamesCache = {};

  // Get games for a specific team
  List<Game>? getTeamGames(String teamId) {
    return _teamGamesCache[teamId];
  }

  // Load games for a specific team
  Future<void> loadTeamGames(String teamId) async {
    // Check if we already have all games loaded
    if (allGames.isEmpty) {
      await loadGames();
    }

    // Filter games for the specific team (using team code)
    final teamGames = allGames
        .where((game) =>
            game.homeTeamCode == teamId || game.awayTeamCode == teamId)
        .toList();

    // Sort games by date (most recent first)
    teamGames.sort((a, b) => b.date.compareTo(a.date));

    // Cache the result
    _teamGamesCache[teamId] = teamGames;

    // Notify listeners
    notifyListeners();
  }

  // Load games from API or cache
  Future<void> loadGames(
      {bool forceRefresh = false,
      bool comprehensive = false,
      String? teamCode}) async {
    // Try cache first (unless force refresh is requested)
    if (!forceRefresh) {
      final cached = await _cacheService.getCachedGames();
      if (cached != null) {
        _games = cached;
        notifyListeners();

        // If we have a cache hit, only continue to API if we're online and we want fresh data
        if (!await _connectivityService.canMakeNetworkRequest()) {
          _isOffline = true;
          notifyListeners();
          return; // We're offline but have cached data
        }
      }
    }

    _isLoading = true;
    _error = null;
    _isOffline = false;
    notifyListeners();

    try {
      // Hit the API with comprehensive and team parameters
      final gamesData = await _apiService.getGames(
        comprehensive: comprehensive,
        teamCode: teamCode,
      );
      _games = gamesData;

      // Cache locally for offline support
      await _cacheService.cacheGames(gamesData);

      _error = null;
      _isOffline = false;
    } catch (e) {
      // Check if it's an offline error
      if (e is ApiException && e.isOfflineError) {
        _isOffline = true;

        // If we already loaded data from cache, don't show error
        if (_games != null) {
          _error = null;
        } else {
          _error =
              'You are offline. Please connect to the internet and try again.';
        }
      } else {
        _isOffline = false;
        _error = e.toString();
      }
      print('Error loading games: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Force refresh the games data
  Future<void> refreshGames() async {
    await loadGames(forceRefresh: true);
  }

  // Check if there's any live game
  bool get hasLiveGames => liveGames.isNotEmpty;

  // Get a game by its unique identifiers
  Game? getGameByTeams({
    required String homeTeamCode,
    required String awayTeamCode,
    required String date,
  }) {
    try {
      return allGames.firstWhere(
        (game) =>
            game.homeTeamCode == homeTeamCode &&
            game.awayTeamCode == awayTeamCode &&
            game.date == date,
      );
    } catch (e) {
      return null;
    }
  }

  // Setup notifications for games
  Future<void> setupNotifications(
      String? favoriteTeamId, bool enableNotifications) async {
    if (allGames.isEmpty) {
      await loadGames();
    }

    // Get the notification service
    final notificationService = NotificationService();

    // Setup notifications based on user preferences
    await notificationService.setupNotificationsForUser(
        favoriteTeamId, allGames, enableNotifications);
  }
}
