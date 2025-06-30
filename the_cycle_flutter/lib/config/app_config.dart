// General app configuration settings
class AppConfig {
  // App name
  static const String appName = 'The Cycle - MLB Dashboard';
  
  // App version
  static const String appVersion = '1.0.0';
  
  // Cache expiration time (1 hour)
  static const Duration cacheExpiry = Duration(hours: 1);
  
  // MLB brand color
  static const int mlbRedColor = 0xFFD50000;
  
  // Theme settings
  static const bool isDarkMode = true;
  
  // Feature flags
  static const bool enableNotifications = true;
  static const bool enableOfflineMode = true;
  
  // UI settings
  static const double defaultPadding = 16.0;
  static const double borderRadius = 8.0;
}
