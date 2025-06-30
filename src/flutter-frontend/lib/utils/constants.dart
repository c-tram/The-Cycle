import 'package:flutter/material.dart';
import '../models/game.dart'; // Import GameStatus enum

// App-wide constants for consistent usage
class AppConstants {
  // App information
  static const String appName = 'The Cycle - MLB Dashboard';
  static const String appVersion = '1.0.0';
  
  // MLB brand colors
  static const Color mlbRed = Color(0xFFD50000);
  static const Color mlbBlue = Color(0xFF0D47A1);
  
  // Team colors - Map of team codes to their primary colors
  static const Map<String, Color> teamColors = {
    'ari': Color(0xFFA71930), // Arizona Diamondbacks
    'atl': Color(0xFFCE1141), // Atlanta Braves
    'bal': Color(0xFFDF4601), // Baltimore Orioles
    'bos': Color(0xFFBD3039), // Boston Red Sox
    'chc': Color(0xFF0E3386), // Chicago Cubs
    'cin': Color(0xFFC6011F), // Cincinnati Reds
    'cle': Color(0xFFE31937), // Cleveland Guardians
    'col': Color(0xFF33006F), // Colorado Rockies
    'cws': Color(0xFF27251F), // Chicago White Sox
    'det': Color(0xFF0C2340), // Detroit Tigers
    'hou': Color(0xFF002D62), // Houston Astros
    'kc': Color(0xFF004687), // Kansas City Royals
    'laa': Color(0xFFBA0021), // Los Angeles Angels
    'lad': Color(0xFF005A9C), // Los Angeles Dodgers
    'mia': Color(0xFF00A3E0), // Miami Marlins
    'mil': Color(0xFF0A2351), // Milwaukee Brewers
    'min': Color(0xFF002B5C), // Minnesota Twins
    'nyy': Color(0xFF0C2340), // New York Yankees
    'nym': Color(0xFF002D72), // New York Mets
    'oak': Color(0xFF003831), // Oakland Athletics
    'phi': Color(0xFFE81828), // Philadelphia Phillies
    'pit': Color(0xFFFFB81C), // Pittsburgh Pirates
    'sd': Color(0xFF2F241D), // San Diego Padres
    'sf': Color(0xFFFD5A1E), // San Francisco Giants
    'sea': Color(0xFF0C2C56), // Seattle Mariners
    'stl': Color(0xFFCD1141), // St. Louis Cardinals
    'tb': Color(0xFF092C5C), // Tampa Bay Rays
    'tex': Color(0xFF003278), // Texas Rangers
    'tor': Color(0xFF134A8E), // Toronto Blue Jays
    'wsh': Color(0xFFAB0003), // Washington Nationals
  };
  
  // Status colors
  static const Color liveColor = Colors.green;
  static const Color completedColor = Colors.blue;
  static const Color scheduledColor = Colors.orange;
  
  // Spacing
  static const double paddingSmall = 8.0;
  static const double paddingMedium = 16.0;
  static const double paddingLarge = 24.0;
  static const double borderRadius = 8.0;
  
  // Animation durations
  static const Duration shortAnimationDuration = Duration(milliseconds: 200);
  static const Duration mediumAnimationDuration = Duration(milliseconds: 400);
  static const Duration longAnimationDuration = Duration(milliseconds: 800);
  
  // Text styles
  static const TextStyle headingStyle = TextStyle(
    fontWeight: FontWeight.bold,
    fontSize: 20,
  );
  
  static const TextStyle subheadingStyle = TextStyle(
    fontWeight: FontWeight.w600,
    fontSize: 16,
  );
  
  static const TextStyle bodyStyle = TextStyle(
    fontSize: 14,
  );
  
  static const TextStyle captionStyle = TextStyle(
    fontSize: 12,
    color: Colors.grey,
  );
  
  // Get team color by team code
  static Color getTeamColor(String? teamCode) {
    if (teamCode == null || !teamColors.containsKey(teamCode.toLowerCase())) {
      return mlbRed;
    }
    return teamColors[teamCode.toLowerCase()]!;
  }
  
  // Get status color based on game status
  static Color getStatusColor(GameStatus status) {
    switch (status) {
      case GameStatus.live:
        return liveColor;
      case GameStatus.completed:
        return completedColor;
      case GameStatus.scheduled:
        return scheduledColor;
    }
  }
  
  // Get status text based on game status
  static String getStatusText(GameStatus status) {
    switch (status) {
      case GameStatus.live:
        return 'LIVE';
      case GameStatus.completed:
        return 'FINAL';
      case GameStatus.scheduled:
        return 'SCHEDULED';
    }
  }
}

// Using the game status from models, not duplicating here
// Import the GameStatus enum from models/game.dart when needed
