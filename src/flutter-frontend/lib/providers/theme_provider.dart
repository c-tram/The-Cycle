import 'package:flutter/material.dart';
import '../services/preferences_service.dart';

// Provider to manage app theme settings
class ThemeProvider with ChangeNotifier {
  final PreferencesService _preferencesService = PreferencesService();
  
  ThemeMode _themeMode = ThemeMode.system;
  
  ThemeMode get themeMode => _themeMode;
  
  // Initialize theme provider with saved preference
  ThemeProvider() {
    _loadThemePreference();
  }
  
  // Load theme preference from PreferencesService
  Future<void> _loadThemePreference() async {
    final preferences = await _preferencesService.loadPreferences();
    
    // Set theme mode based on user preference
    _themeMode = preferences.useDarkMode 
        ? ThemeMode.dark 
        : ThemeMode.light;
    
    notifyListeners();
  }
  
  // Set theme mode and save preference
  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    
    // Save preference
    await _preferencesService.setDarkMode(mode == ThemeMode.dark);
    
    notifyListeners();
  }
  
  // Toggle between light and dark mode
  Future<void> toggleTheme() async {
    if (_themeMode == ThemeMode.light) {
      await setThemeMode(ThemeMode.dark);
    } else {
      await setThemeMode(ThemeMode.light);
    }
  }
  
  // Helper method to get theme based on current mode
  ThemeData getTheme(BuildContext context, {required bool isDark}) {
    if (isDark) {
      return _darkTheme;
    } else {
      return _lightTheme;
    }
  }
  
  // Dark theme data
  static final ThemeData _darkTheme = ThemeData(
    brightness: Brightness.dark,
    primaryColor: const Color(0xFFD50000), // MLB Red
    primaryColorDark: const Color(0xFF9B0000),
    primaryColorLight: const Color(0xFFFF5131),
    scaffoldBackgroundColor: const Color(0xFF121212),
    cardColor: const Color(0xFF1E1E1E),
    dividerColor: Colors.grey[800],
    colorScheme: const ColorScheme.dark(
      primary: Color(0xFFD50000),
      secondary: Color(0xFF2196F3),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: const Color(0xFF1E1E1E),
      foregroundColor: Colors.white,
      elevation: 2,
      shadowColor: Colors.black.withOpacity(0.5),
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: const Color(0xFF1E1E1E),
      selectedItemColor: const Color(0xFFD50000),
      unselectedItemColor: Colors.grey[400],
    ),
    textTheme: const TextTheme(
      displayLarge: TextStyle(color: Colors.white),
      displayMedium: TextStyle(color: Colors.white),
      displaySmall: TextStyle(color: Colors.white),
      headlineMedium: TextStyle(color: Colors.white),
      headlineSmall: TextStyle(color: Colors.white),
      titleLarge: TextStyle(color: Colors.white),
      bodyLarge: TextStyle(color: Colors.white),
      bodyMedium: TextStyle(color: Colors.white70),
    ),
  );
  
  // Light theme data
  static final ThemeData _lightTheme = ThemeData(
    brightness: Brightness.light,
    primaryColor: const Color(0xFFD50000), // MLB Red
    primaryColorDark: const Color(0xFF9B0000),
    primaryColorLight: const Color(0xFFFF5131),
    scaffoldBackgroundColor: Colors.grey[100],
    cardColor: Colors.white,
    dividerColor: Colors.grey[300],
    colorScheme: const ColorScheme.light(
      primary: Color(0xFFD50000),
      secondary: Color(0xFF2196F3),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFFD50000),
      foregroundColor: Colors.white,
      elevation: 2,
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: const Color(0xFFD50000),
      unselectedItemColor: Colors.grey[600],
    ),
    textTheme: TextTheme(
      displayLarge: const TextStyle(color: Colors.black),
      displayMedium: const TextStyle(color: Colors.black),
      displaySmall: const TextStyle(color: Colors.black),
      headlineMedium: const TextStyle(color: Colors.black),
      headlineSmall: const TextStyle(color: Colors.black),
      titleLarge: const TextStyle(color: Colors.black),
      bodyLarge: const TextStyle(color: Colors.black),
      bodyMedium: TextStyle(color: Colors.black.withOpacity(0.7)),
    ),
  );
}
