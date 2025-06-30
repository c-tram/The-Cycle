// Refresh frequency enum for controlling data update intervals
enum RefreshFrequency {
  low,    // Refresh every 5 minutes
  medium, // Refresh every 1 minute
  high,   // Refresh every 30 seconds
  live    // Real-time updates (when possible)
}

// User preferences model to store app settings
class UserPreferences {
  final String? favoriteTeam;
  final bool useDarkMode;
  final bool enableNotifications;
  final bool showScoresOnHomeScreen;
  final RefreshFrequency refreshFrequency;
  final bool autoRefreshEnabled;
  final bool dataUsageOptimization;
  
  UserPreferences({
    this.favoriteTeam,
    this.useDarkMode = false,
    this.enableNotifications = true,
    this.showScoresOnHomeScreen = true,
    this.refreshFrequency = RefreshFrequency.medium,
    this.autoRefreshEnabled = true,
    this.dataUsageOptimization = false,
  });
  
  factory UserPreferences.fromJson(Map<String, dynamic> json) {
    return UserPreferences(
      favoriteTeam: json['favoriteTeam'],
      useDarkMode: json['useDarkMode'] ?? false,
      enableNotifications: json['enableNotifications'] ?? true,
      showScoresOnHomeScreen: json['showScoresOnHomeScreen'] ?? true,
      refreshFrequency: _parseRefreshFrequency(json['refreshFrequency']),
      autoRefreshEnabled: json['autoRefreshEnabled'] ?? true,
      dataUsageOptimization: json['dataUsageOptimization'] ?? false,
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'favoriteTeam': favoriteTeam,
      'useDarkMode': useDarkMode,
      'enableNotifications': enableNotifications,
      'showScoresOnHomeScreen': showScoresOnHomeScreen,
      'refreshFrequency': refreshFrequency.toString().split('.').last,
      'autoRefreshEnabled': autoRefreshEnabled,
      'dataUsageOptimization': dataUsageOptimization,
    };
  }
  
  // Parse refresh frequency from string
  static RefreshFrequency _parseRefreshFrequency(String? value) {
    if (value == null) return RefreshFrequency.medium;
    
    try {
      return RefreshFrequency.values.firstWhere(
        (e) => e.toString().split('.').last == value,
        orElse: () => RefreshFrequency.medium,
      );
    } catch (e) {
      return RefreshFrequency.medium;
    }
  }
  
  // Create a copy of the current preferences with some values changed
  UserPreferences copyWith({
    String? favoriteTeam,
    bool? useDarkMode,
    bool? enableNotifications,
    bool? showScoresOnHomeScreen,
    RefreshFrequency? refreshFrequency,
    bool? autoRefreshEnabled,
    bool? dataUsageOptimization,
  }) {
    return UserPreferences(
      favoriteTeam: favoriteTeam ?? this.favoriteTeam,
      useDarkMode: useDarkMode ?? this.useDarkMode,
      enableNotifications: enableNotifications ?? this.enableNotifications,
      showScoresOnHomeScreen: showScoresOnHomeScreen ?? this.showScoresOnHomeScreen,
      refreshFrequency: refreshFrequency ?? this.refreshFrequency,
      autoRefreshEnabled: autoRefreshEnabled ?? this.autoRefreshEnabled,
      dataUsageOptimization: dataUsageOptimization ?? this.dataUsageOptimization,
    );
  }
  
  // Convert refresh frequency to human-readable string
  String getRefreshFrequencyLabel() {
    switch (refreshFrequency) {
      case RefreshFrequency.low:
        return 'Every 5 minutes';
      case RefreshFrequency.medium:
        return 'Every minute';
      case RefreshFrequency.high:
        return 'Every 30 seconds';
      case RefreshFrequency.live:
        return 'Real-time';
    }
  }
  
  // Get refresh interval in seconds
  int getRefreshIntervalInSeconds() {
    if (!autoRefreshEnabled) return 0; // No refresh if disabled
    
    switch (refreshFrequency) {
      case RefreshFrequency.low:
        return 300; // 5 minutes
      case RefreshFrequency.medium:
        return 60;  // 1 minute
      case RefreshFrequency.high:
        return 30;  // 30 seconds
      case RefreshFrequency.live:
        return 10;  // "Real-time" (10-second intervals)
    }
  }
  
  
}
