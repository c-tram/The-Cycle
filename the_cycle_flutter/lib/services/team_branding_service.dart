import 'package:flutter/material.dart';

// Service to handle team logos, colors, and branding
class TeamBrandingService {
  static final TeamBrandingService _instance = TeamBrandingService._internal();
  factory TeamBrandingService() => _instance;
  TeamBrandingService._internal();

  // Team colors mapping based on official MLB team colors
  static const Map<String, TeamColors> _teamColors = {
    // American League East
    'nyy': TeamColors(
      primary: Color(0xFF132448), // Navy Blue
      secondary: Color(0xFFC4CED4), // Silver/Grey
      accent: Color(0xFFFFFFFF), // White
    ),
    'bos': TeamColors(
      primary: Color(0xFFBD3039), // Red
      secondary: Color(0xFF0C2340), // Navy Blue
      accent: Color(0xFFFFFFFF), // White
    ),
    'tor': TeamColors(
      primary: Color(0xFF134A8E), // Royal Blue
      secondary: Color(0xFF1D2D5C), // Navy Blue
      accent: Color(0xFFE8291C), // Red
    ),
    'bal': TeamColors(
      primary: Color(0xFFDF4601), // Orange
      secondary: Color(0xFF000000), // Black
      accent: Color(0xFFFFFFFF), // White
    ),
    'tb': TeamColors(
      primary: Color(0xFF092C5C), // Navy Blue
      secondary: Color(0xFF8FBCE6), // Light Blue
      accent: Color(0xFFFFF100), // Yellow
    ),

    // American League Central
    'cle': TeamColors(
      primary: Color(0xFFE31937), // Red
      secondary: Color(0xFF0C2340), // Navy Blue
      accent: Color(0xFFFFFFFF), // White
    ),
    'min': TeamColors(
      primary: Color(0xFF002B5C), // Navy Blue
      secondary: Color(0xFFD31145), // Red
      accent: Color(0xFFFFFFFF), // White
    ),
    'kc': TeamColors(
      primary: Color(0xFF004687), // Royal Blue
      secondary: Color(0xFFBD9B60), // Gold
      accent: Color(0xFFFFFFFF), // White
    ),
    'det': TeamColors(
      primary: Color(0xFF0C2340), // Navy Blue
      secondary: Color(0xFFFA4616), // Orange
      accent: Color(0xFFFFFFFF), // White
    ),
    'cws': TeamColors(
      primary: Color(0xFF27251F), // Black
      secondary: Color(0xFFC4CED4), // Silver
      accent: Color(0xFFFFFFFF), // White
    ),

    // American League West
    'hou': TeamColors(
      primary: Color(0xFFEB6E1F), // Orange
      secondary: Color(0xFF002D62), // Navy Blue
      accent: Color(0xFFFFFFFF), // White
    ),
    'sea': TeamColors(
      primary: Color(0xFF0C2C56), // Navy Blue
      secondary: Color(0xFF005C5C), // Teal
      accent: Color(0xFFC4CED4), // Silver
    ),
    'tex': TeamColors(
      primary: Color(0xFF003278), // Royal Blue
      secondary: Color(0xFFC0111F), // Red
      accent: Color(0xFFFFFFFF), // White
    ),
    'laa': TeamColors(
      primary: Color(0xFFBA0021), // Red
      secondary: Color(0xFF003263), // Navy Blue
      accent: Color(0xFFFFFFFF), // White
    ),
    'oak': TeamColors(
      primary: Color(0xFF003831), // Forest Green
      secondary: Color(0xFFEFB21E), // Gold
      accent: Color(0xFFFFFFFF), // White
    ),

    // National League East
    'atl': TeamColors(
      primary: Color(0xFFCE1141), // Red
      secondary: Color(0xFF13274F), // Navy Blue
      accent: Color(0xFFFFFFFF), // White
    ),
    'phi': TeamColors(
      primary: Color(0xFFE81828), // Red
      secondary: Color(0xFF002D72), // Blue
      accent: Color(0xFFFFFFFF), // White
    ),
    'nym': TeamColors(
      primary: Color(0xFF002D72), // Blue
      secondary: Color(0xFFFF5910), // Orange
      accent: Color(0xFFFFFFFF), // White
    ),
    'mia': TeamColors(
      primary: Color(0xFF00A3E0), // Blue
      secondary: Color(0xFF000000), // Black
      accent: Color(0xFFEF3340), // Red
    ),
    'wsh': TeamColors(
      primary: Color(0xFFAB0003), // Red
      secondary: Color(0xFF14225A), // Navy Blue
      accent: Color(0xFFFFFFFF), // White
    ),

    // National League Central
    'mil': TeamColors(
      primary: Color(0xFFFFC52F), // Gold
      secondary: Color(0xFF12284B), // Navy Blue
      accent: Color(0xFFFFFFFF), // White
    ),
    'chc': TeamColors(
      primary: Color(0xFF0E3386), // Blue
      secondary: Color(0xFFCC3433), // Red
      accent: Color(0xFFFFFFFF), // White
    ),
    'stl': TeamColors(
      primary: Color(0xFFC41E3A), // Red
      secondary: Color(0xFF0C2340), // Navy Blue
      accent: Color(0xFFFFFFFF), // White
    ),
    'cin': TeamColors(
      primary: Color(0xFFC6011F), // Red
      secondary: Color(0xFF000000), // Black
      accent: Color(0xFFFFFFFF), // White
    ),
    'pit': TeamColors(
      primary: Color(0xFFFDB827), // Gold
      secondary: Color(0xFF27251F), // Black
      accent: Color(0xFFFFFFFF), // White
    ),

    // National League West
    'lad': TeamColors(
      primary: Color(0xFF005A9C), // Blue
      secondary: Color(0xFFFFFFFF), // White
      accent: Color(0xFFEF3E42), // Red
    ),
    'sd': TeamColors(
      primary: Color(0xFF2F241D), // Brown
      secondary: Color(0xFFFFC425), // Gold
      accent: Color(0xFFFFFFFF), // White
    ),
    'sf': TeamColors(
      primary: Color(0xFFFD5A1E), // Orange
      secondary: Color(0xFF27251F), // Black
      accent: Color(0xFFFFFFFF), // White
    ),
    'ari': TeamColors(
      primary: Color(0xFFA71930), // Red
      secondary: Color(0xFF000000), // Black
      accent: Color(0xFFE3D4A7), // Sand
    ),
    'col': TeamColors(
      primary: Color(0xFF33006F), // Purple
      secondary: Color(0xFF231F20), // Black
      accent: Color(0xFFC4CED4), // Silver
    ),
  };

  // Team logo URLs (using official MLB team logos)
  static const Map<String, String> _teamLogos = {
    // American League East
    'nyy': 'https://www.mlbstatic.com/team-logos/147.svg',
    'bos': 'https://www.mlbstatic.com/team-logos/111.svg',
    'tor': 'https://www.mlbstatic.com/team-logos/141.svg',
    'bal': 'https://www.mlbstatic.com/team-logos/110.svg',
    'tb': 'https://www.mlbstatic.com/team-logos/139.svg',

    // American League Central
    'cle': 'https://www.mlbstatic.com/team-logos/114.svg',
    'min': 'https://www.mlbstatic.com/team-logos/142.svg',
    'kc': 'https://www.mlbstatic.com/team-logos/118.svg',
    'det': 'https://www.mlbstatic.com/team-logos/116.svg',
    'cws': 'https://www.mlbstatic.com/team-logos/145.svg',

    // American League West
    'hou': 'https://www.mlbstatic.com/team-logos/117.svg',
    'sea': 'https://www.mlbstatic.com/team-logos/136.svg',
    'tex': 'https://www.mlbstatic.com/team-logos/140.svg',
    'laa': 'https://www.mlbstatic.com/team-logos/108.svg',
    'oak': 'https://www.mlbstatic.com/team-logos/133.svg',

    // National League East
    'atl': 'https://www.mlbstatic.com/team-logos/144.svg',
    'phi': 'https://www.mlbstatic.com/team-logos/143.svg',
    'nym': 'https://www.mlbstatic.com/team-logos/121.svg',
    'mia': 'https://www.mlbstatic.com/team-logos/146.svg',
    'wsh': 'https://www.mlbstatic.com/team-logos/120.svg',

    // National League Central
    'mil': 'https://www.mlbstatic.com/team-logos/158.svg',
    'chc': 'https://www.mlbstatic.com/team-logos/112.svg',
    'stl': 'https://www.mlbstatic.com/team-logos/138.svg',
    'cin': 'https://www.mlbstatic.com/team-logos/113.svg',
    'pit': 'https://www.mlbstatic.com/team-logos/134.svg',

    // National League West
    'lad': 'https://www.mlbstatic.com/team-logos/119.svg',
    'sd': 'https://www.mlbstatic.com/team-logos/135.svg',
    'sf': 'https://www.mlbstatic.com/team-logos/137.svg',
    'ari': 'https://www.mlbstatic.com/team-logos/109.svg',
    'col': 'https://www.mlbstatic.com/team-logos/115.svg',
  };

  // Get team colors for a given team code
  TeamColors getTeamColors(String teamCode) {
    return _teamColors[teamCode.toLowerCase()] ?? 
           const TeamColors(
             primary: Color(0xFF1565C0), // Default blue
             secondary: Color(0xFF90A4AE), // Default grey
             accent: Color(0xFFFFFFFF), // White
           );
  }

  // Get team logo URL for a given team code
  String getTeamLogoUrl(String teamCode) {
    return _teamLogos[teamCode.toLowerCase()] ?? '';
  }

  // Get a themed ColorScheme for a team
  ColorScheme getTeamColorScheme(String teamCode, {bool isDark = false}) {
    final teamColors = getTeamColors(teamCode);
    
    if (isDark) {
      return ColorScheme.dark(
        primary: teamColors.primary,
        secondary: teamColors.secondary,
        surface: const Color(0xFF1E1E1E),
        background: const Color(0xFF121212),
        onPrimary: teamColors.accent,
        onSecondary: Colors.white,
      );
    } else {
      return ColorScheme.light(
        primary: teamColors.primary,
        secondary: teamColors.secondary,
        surface: Colors.white,
        background: const Color(0xFFF5F5F5),
        onPrimary: teamColors.accent,
        onSecondary: Colors.white,
      );
    }
  }

  // Get a complete ThemeData for a team
  ThemeData getTeamTheme(String teamCode, {bool isDark = false}) {
    final teamColors = getTeamColors(teamCode);
    final colorScheme = getTeamColorScheme(teamCode, isDark: isDark);

    return ThemeData(
      primarySwatch: _generateMaterialColor(teamColors.primary),
      primaryColor: teamColors.primary,
      brightness: isDark ? Brightness.dark : Brightness.light,
      scaffoldBackgroundColor: isDark ? const Color(0xFF121212) : Colors.white,
      appBarTheme: AppBarTheme(
        backgroundColor: teamColors.primary,
        foregroundColor: teamColors.accent,
        elevation: 2,
      ),
      colorScheme: colorScheme,
      cardTheme: CardTheme(
        color: isDark ? const Color(0xFF1E1E1E) : const Color(0xFFF5F5F5),
        elevation: 2,
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: teamColors.primary,
        foregroundColor: teamColors.accent,
      ),
    );
  }

  // Helper method to generate MaterialColor from a Color
  MaterialColor _generateMaterialColor(Color color) {
    List strengths = <double>[.05];
    Map<int, Color> swatch = {};
    final int r = color.red, g = color.green, b = color.blue;

    for (int i = 1; i < 10; i++) {
      strengths.add(0.1 * i);
    }
    for (var strength in strengths) {
      final double ds = 0.5 - strength;
      swatch[(strength * 1000).round()] = Color.fromRGBO(
        r + ((ds < 0 ? r : (255 - r)) * ds).round(),
        g + ((ds < 0 ? g : (255 - g)) * ds).round(),
        b + ((ds < 0 ? b : (255 - b)) * ds).round(),
        1,
      );
    }
    return MaterialColor(color.value, swatch);
  }
}

// Team colors data class
class TeamColors {
  final Color primary;
  final Color secondary;
  final Color accent;

  const TeamColors({
    required this.primary,
    required this.secondary,
    required this.accent,
  });
}
