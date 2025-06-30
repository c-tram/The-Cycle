import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_preferences.dart';

class PreferencesService {
  static const String _prefsKey = 'user_preferences';
  
  // Save user preferences
  Future<void> savePreferences(UserPreferences preferences) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, json.encode(preferences.toJson()));
  }
  
  // Load user preferences
  Future<UserPreferences> loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    final savedPrefs = prefs.getString(_prefsKey);
    
    if (savedPrefs != null) {
      try {
        final Map<String, dynamic> prefsMap = json.decode(savedPrefs);
        return UserPreferences.fromJson(prefsMap);
      } catch (e) {
        print('Error loading preferences: $e');
      }
    }
    
    // Return default preferences if none saved or error occurred
    return UserPreferences();
  }
  
  // Save favorite team
  Future<void> setFavoriteTeam(String? teamCode) async {
    final currentPrefs = await loadPreferences();
    final updatedPrefs = currentPrefs.copyWith(favoriteTeam: teamCode);
    await savePreferences(updatedPrefs);
  }
  
  // Get favorite team
  Future<String?> getFavoriteTeam() async {
    final prefs = await loadPreferences();
    return prefs.favoriteTeam;
  }
  
  // Toggle dark mode
  Future<void> setDarkMode(bool useDarkMode) async {
    final currentPrefs = await loadPreferences();
    final updatedPrefs = currentPrefs.copyWith(useDarkMode: useDarkMode);
    await savePreferences(updatedPrefs);
  }
  
  // Toggle notifications
  Future<void> setEnableNotifications(bool enable) async {
    final currentPrefs = await loadPreferences();
    final updatedPrefs = currentPrefs.copyWith(enableNotifications: enable);
    await savePreferences(updatedPrefs);
  }
  
  // Toggle show scores on home screen
  Future<void> setShowScoresOnHomeScreen(bool show) async {
    final currentPrefs = await loadPreferences();
    final updatedPrefs = currentPrefs.copyWith(showScoresOnHomeScreen: show);
    await savePreferences(updatedPrefs);
  }
  
  // Set refresh frequency
  Future<void> setRefreshFrequency(RefreshFrequency frequency) async {
    final currentPrefs = await loadPreferences();
    final updatedPrefs = currentPrefs.copyWith(refreshFrequency: frequency);
    await savePreferences(updatedPrefs);
  }
  
  // Toggle auto refresh
  Future<void> setAutoRefresh(bool enable) async {
    final currentPrefs = await loadPreferences();
    final updatedPrefs = currentPrefs.copyWith(autoRefreshEnabled: enable);
    await savePreferences(updatedPrefs);
  }
  
  // Toggle data usage optimization
  Future<void> setDataUsageOptimization(bool enable) async {
    final currentPrefs = await loadPreferences();
    final updatedPrefs = currentPrefs.copyWith(dataUsageOptimization: enable);
    await savePreferences(updatedPrefs);
  }
  
  // Get current refresh interval in seconds
  Future<int> getRefreshIntervalInSeconds() async {
    final prefs = await loadPreferences();
    return prefs.getRefreshIntervalInSeconds();
  }
  
  // Check if auto refresh is enabled
  Future<bool> isAutoRefreshEnabled() async {
    final prefs = await loadPreferences();
    return prefs.autoRefreshEnabled;
  }
  
  // Check if data usage optimization is enabled
  Future<bool> isDataUsageOptimizationEnabled() async {
    final prefs = await loadPreferences();
    return prefs.dataUsageOptimization;
  }
}
