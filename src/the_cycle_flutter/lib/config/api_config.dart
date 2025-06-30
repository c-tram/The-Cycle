// Configuration for the API service used throughout the app
class ApiConfig {
  // Base URL for API requests - development environment
  static const String devBaseUrl = 'http://localhost:3000/api';
  
  // Base URL for API requests - production environment
  static const String prodBaseUrl = 'https://your-azure-app.com/api';
  
  // Set to false for production environment
  static const bool isDevelopment = true;
  
  // Get the appropriate base URL based on environment
  static String get baseUrl => isDevelopment ? devBaseUrl : prodBaseUrl;
  
  // Timeout duration for API requests
  static const Duration timeout = Duration(seconds: 30);
  
  // API endpoints
  static const String gamesEndpoint = '/games';
  static const String standingsEndpoint = '/standings';
  static const String rosterEndpoint = '/roster';
  static const String trendsEndpoint = '/trends';
  static const String redisHealthEndpoint = '/health/redis';
}
