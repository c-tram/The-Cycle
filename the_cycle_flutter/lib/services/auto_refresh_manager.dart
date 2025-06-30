import 'dart:async';
import 'package:flutter/foundation.dart';
import '../services/connectivity_service.dart';
import '../providers/games_provider.dart';
import '../providers/standings_provider.dart';
import '../providers/user_preferences_provider.dart';

/// Service to handle automatic data refresh based on user preferences
class AutoRefreshManager {
  // Singleton pattern
  static final AutoRefreshManager _instance = AutoRefreshManager._internal();
  factory AutoRefreshManager() => _instance;
  AutoRefreshManager._internal();
  
  // Dependencies
  final ConnectivityService _connectivityService = ConnectivityService();
  
  // State
  Timer? _refreshTimer;
  bool _isInitialized = false;
  
  // Providers
  late GamesProvider _gamesProvider;
  late StandingsProvider _standingsProvider;
  late UserPreferencesProvider _preferencesProvider;
  
  // Initialize manager with providers
  void initialize({
    required GamesProvider gamesProvider,
    required StandingsProvider standingsProvider,
    required UserPreferencesProvider preferencesProvider,
  }) {
    if (_isInitialized) return;
    
    _gamesProvider = gamesProvider;
    _standingsProvider = standingsProvider;
    _preferencesProvider = preferencesProvider;
    
    _setupRefreshTimer();
    _setupPreferencesListener();
    
    _isInitialized = true;
  }
  
  // Setup timer based on current preferences
  void _setupRefreshTimer() {
    _cancelCurrentTimer();
    
    // Only setup timer if auto refresh is enabled
    if (!_preferencesProvider.autoRefreshEnabled) return;
    
    // Get interval from preferences
    final intervalSeconds = _preferencesProvider.getRefreshIntervalInSeconds();
    
    // Setup periodic timer
    _refreshTimer = Timer.periodic(Duration(seconds: intervalSeconds), (_) {
      _refreshData();
    });
  }
  
  // Listen for changes to preferences
  void _setupPreferencesListener() {
    _preferencesProvider.addListener(_onPreferencesChanged);
  }
  
  // Handle preferences changes
  void _onPreferencesChanged() {
    // Reconfigure timer when settings change
    _setupRefreshTimer();
  }
  
  // Cancel any existing timer
  void _cancelCurrentTimer() {
    if (_refreshTimer != null) {
      _refreshTimer!.cancel();
      _refreshTimer = null;
    }
  }
  
  // Refresh data based on network conditions and data optimization settings
  Future<void> _refreshData() async {
    try {
      // Check if we can make network requests
      final hasConnectivity = await _connectivityService.canMakeNetworkRequest();
      if (!hasConnectivity) return; // Skip refresh when offline
      
      // Check data usage optimization setting
      final isOptimizingDataUsage = _preferencesProvider.dataUsageOptimizationEnabled;
      
      // If data optimization is enabled, don't refresh as often when not on WiFi
      if (isOptimizingDataUsage) {
        final isOnWifi = await _isOnWifiConnection();
        if (!isOnWifi) {
          // Only refresh games data (not standings) when on cellular to save data
          await _gamesProvider.loadGames(forceRefresh: true);
          return;
        }
      }
      
      // Normal refresh of all data
      await Future.wait([
        _gamesProvider.loadGames(forceRefresh: true),
        _standingsProvider.loadStandings(forceRefresh: true),
      ]);
    } catch (e) {
      debugPrint('Error during auto refresh: $e');
    }
  }
  
  // Check if device is on WiFi
  Future<bool> _isOnWifiConnection() async {
    // This is simplified - in a real app, we'd use Connectivity plugin's 
    // ConnectivityResult.wifi check
    return true; // Default to assuming WiFi for now
  }
  
  // Dispose resources
  void dispose() {
    _cancelCurrentTimer();
    _preferencesProvider.removeListener(_onPreferencesChanged);
  }
}
