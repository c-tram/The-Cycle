import 'package:flutter/foundation.dart';
import '../services/preferences_service.dart';
import '../models/user_preferences.dart';
import '../providers/games_provider.dart';

class UserPreferencesProvider with ChangeNotifier {
  final PreferencesService _preferencesService = PreferencesService();
  
  UserPreferences? _preferences;
  bool _isLoading = false;

  UserPreferences? get preferences => _preferences;
  bool get isLoading => _isLoading;
  
  // Get favorite team
  String? get favoriteTeam => _preferences?.favoriteTeam;
  
  // Are notifications enabled
  bool get notificationsEnabled => _preferences?.enableNotifications ?? true;
  
  // Should scores be shown on home screen
  bool get showScoresOnHomeScreen => _preferences?.showScoresOnHomeScreen ?? true;
  
  // Get refresh frequency
  RefreshFrequency get refreshFrequency => _preferences?.refreshFrequency ?? RefreshFrequency.medium;
  
  // Is auto refresh enabled
  bool get autoRefreshEnabled => _preferences?.autoRefreshEnabled ?? true;
  
  // Is data usage optimization enabled
  bool get dataUsageOptimizationEnabled => _preferences?.dataUsageOptimization ?? false;

  // Initialize provider
  UserPreferencesProvider() {
    loadPreferences();
  }

  // Load saved preferences
  Future<void> loadPreferences() async {
    _isLoading = true;
    notifyListeners();

    try {
      _preferences = await _preferencesService.loadPreferences();
    } catch (e) {
      print('Error loading preferences: $e');
      // Use defaults if there's an error
      _preferences = UserPreferences();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Set favorite team
  Future<void> setFavoriteTeam(String? teamCode) async {
    if (_preferences == null) {
      await loadPreferences();
    }
    
    await _preferencesService.setFavoriteTeam(teamCode);
    _preferences = _preferences!.copyWith(favoriteTeam: teamCode);
    notifyListeners();
  }

  // Toggle notifications
  Future<void> toggleNotifications(bool enable) async {
    if (_preferences == null) {
      await loadPreferences();
    }
    
    await _preferencesService.setEnableNotifications(enable);
    _preferences = _preferences!.copyWith(enableNotifications: enable);
    notifyListeners();
  }

  // Toggle score display on home screen
  Future<void> toggleScoresOnHomeScreen(bool show) async {
    if (_preferences == null) {
      await loadPreferences();
    }
    
    await _preferencesService.setShowScoresOnHomeScreen(show);
    _preferences = _preferences!.copyWith(showScoresOnHomeScreen: show);
    notifyListeners();
  }
  
  // Set refresh frequency
  Future<void> setRefreshFrequency(RefreshFrequency frequency) async {
    if (_preferences == null) {
      await loadPreferences();
    }
    
    await _preferencesService.setRefreshFrequency(frequency);
    _preferences = _preferences!.copyWith(refreshFrequency: frequency);
    notifyListeners();
  }
  
  // Toggle auto refresh
  Future<void> toggleAutoRefresh(bool enable) async {
    if (_preferences == null) {
      await loadPreferences();
    }
    
    await _preferencesService.setAutoRefresh(enable);
    _preferences = _preferences!.copyWith(autoRefreshEnabled: enable);
    notifyListeners();
  }
  
  // Toggle data usage optimization
  Future<void> toggleDataUsageOptimization(bool enable) async {
    if (_preferences == null) {
      await loadPreferences();
    }
    
    await _preferencesService.setDataUsageOptimization(enable);
    _preferences = _preferences!.copyWith(dataUsageOptimization: enable);
    notifyListeners();
  }
  
  // Get current refresh interval in seconds
  int getRefreshIntervalInSeconds() {
    if (_preferences == null) {
      return 60; // Default to 1 minute
    }
    return _preferences!.getRefreshIntervalInSeconds();
  }

  // Setup notifications based on current preferences
  Future<void> setupNotifications(GamesProvider gamesProvider) async {
    if (_preferences == null) {
      await loadPreferences();
    }
    
    // Use the games provider to setup notifications
    await gamesProvider.setupNotifications(
      _preferences!.favoriteTeam,
      _preferences!.enableNotifications
    );
  }
}
