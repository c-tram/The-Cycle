// Team data formatting utilities for The Cycle Flutter app
// This file contains utility functions for formatting MLB team data

/// Utility class for formatting MLB team data in Flutter application
class TeamDataFormatter {
  /// Format team code (abbreviation) to standard format
  static String formatTeamCode(String? teamCode) {
    if (teamCode == null || teamCode.isEmpty) return '';
    
    // Ensure team code is uppercase
    return teamCode.toUpperCase();
  }
  
  /// Format team name with city and nickname
  static String formatTeamFullName(String? city, String? nickname) {
    if (city == null || city.isEmpty) {
      if (nickname == null || nickname.isEmpty) return '';
      return nickname;
    }
    
    if (nickname == null || nickname.isEmpty) {
      return city;
    }
    
    return '$city $nickname';
  }
  
  /// Map team code to full team name
  static String getTeamNameFromCode(String? teamCode) {
    if (teamCode == null || teamCode.isEmpty) return '';
    
    final teamCode2 = teamCode.toUpperCase();
    return _teamCodeMap[teamCode2] ?? teamCode;
  }
  
  /// Get team primary color from team code
  static String getTeamPrimaryColor(String? teamCode) {
    if (teamCode == null || teamCode.isEmpty) return '#000000';
    
    final teamCode2 = teamCode.toUpperCase();
    return _teamColorMap[teamCode2]?['primary'] ?? '#000000';
  }
  
  /// Get team secondary color from team code
  static String getTeamSecondaryColor(String? teamCode) {
    if (teamCode == null || teamCode.isEmpty) return '#FFFFFF';
    
    final teamCode2 = teamCode.toUpperCase();
    return _teamColorMap[teamCode2]?['secondary'] ?? '#FFFFFF';
  }
  
  /// Format team record string (W-L)
  static String formatTeamRecord(int? wins, int? losses) {
    if (wins == null || losses == null) return '';
    
    return '$wins-$losses';
  }
  
  /// Get division name from team code
  static String getTeamDivision(String? teamCode) {
    if (teamCode == null || teamCode.isEmpty) return '';
    
    final teamCode2 = teamCode.toUpperCase();
    return _teamDivisionMap[teamCode2] ?? '';
  }
  
  /// Get league (AL/NL) from team code
  static String getTeamLeague(String? teamCode) {
    if (teamCode == null || teamCode.isEmpty) return '';
    
    final teamCode2 = teamCode.toUpperCase();
    final division = _teamDivisionMap[teamCode2] ?? '';
    
    if (division.startsWith('American')) {
      return 'AL';
    } else if (division.startsWith('National')) {
      return 'NL';
    } else {
      return '';
    }
  }
  
  /// Map of team codes to full team names
  static final Map<String, String> _teamCodeMap = {
    'AZ': 'Arizona Diamondbacks',
    'ATL': 'Atlanta Braves',
    'BAL': 'Baltimore Orioles',
    'BOS': 'Boston Red Sox',
    'CHC': 'Chicago Cubs',
    'CWS': 'Chicago White Sox',
    'CIN': 'Cincinnati Reds',
    'CLE': 'Cleveland Guardians',
    'COL': 'Colorado Rockies',
    'DET': 'Detroit Tigers',
    'HOU': 'Houston Astros',
    'KC': 'Kansas City Royals',
    'LAA': 'Los Angeles Angels',
    'LAD': 'Los Angeles Dodgers',
    'MIA': 'Miami Marlins',
    'MIL': 'Milwaukee Brewers',
    'MIN': 'Minnesota Twins',
    'NYM': 'New York Mets',
    'NYY': 'New York Yankees',
    'OAK': 'Oakland Athletics',
    'PHI': 'Philadelphia Phillies',
    'PIT': 'Pittsburgh Pirates',
    'SD': 'San Diego Padres',
    'SF': 'San Francisco Giants',
    'SEA': 'Seattle Mariners',
    'STL': 'St. Louis Cardinals',
    'TB': 'Tampa Bay Rays',
    'TEX': 'Texas Rangers',
    'TOR': 'Toronto Blue Jays',
    'WSH': 'Washington Nationals',
  };
  
  /// Map of team codes to division names
  static final Map<String, String> _teamDivisionMap = {
    'BAL': 'American League East',
    'BOS': 'American League East',
    'NYY': 'American League East',
    'TB': 'American League East',
    'TOR': 'American League East',
    
    'CWS': 'American League Central',
    'CLE': 'American League Central',
    'DET': 'American League Central',
    'KC': 'American League Central',
    'MIN': 'American League Central',
    
    'HOU': 'American League West',
    'LAA': 'American League West',
    'OAK': 'American League West',
    'SEA': 'American League West',
    'TEX': 'American League West',
    
    'ATL': 'National League East',
    'MIA': 'National League East',
    'NYM': 'National League East',
    'PHI': 'National League East',
    'WSH': 'National League East',
    
    'CHC': 'National League Central',
    'CIN': 'National League Central',
    'MIL': 'National League Central',
    'PIT': 'National League Central',
    'STL': 'National League Central',
    
    'AZ': 'National League West',
    'COL': 'National League West',
    'LAD': 'National League West',
    'SD': 'National League West',
    'SF': 'National League West',
  };
  
  /// Map of team codes to team colors
  static final Map<String, Map<String, String>> _teamColorMap = {
    'AZ': {'primary': '#A71930', 'secondary': '#E3D4AD'},
    'ATL': {'primary': '#CE1141', 'secondary': '#13274F'},
    'BAL': {'primary': '#DF4601', 'secondary': '#000000'},
    'BOS': {'primary': '#BD3039', 'secondary': '#0C2340'},
    'CHC': {'primary': '#0E3386', 'secondary': '#CC3433'},
    'CWS': {'primary': '#27251F', 'secondary': '#C4CED4'},
    'CIN': {'primary': '#C6011F', 'secondary': '#000000'},
    'CLE': {'primary': '#00385D', 'secondary': '#E50022'},
    'COL': {'primary': '#333366', 'secondary': '#C4CED4'},
    'DET': {'primary': '#0C2340', 'secondary': '#FA4616'},
    'HOU': {'primary': '#002D62', 'secondary': '#EB6E1F'},
    'KC': {'primary': '#004687', 'secondary': '#BD9B60'},
    'LAA': {'primary': '#BA0021', 'secondary': '#003263'},
    'LAD': {'primary': '#005A9C', 'secondary': '#A5ACAF'},
    'MIA': {'primary': '#00A3E0', 'secondary': '#EF3340'},
    'MIL': {'primary': '#0A2351', 'secondary': '#FFC52F'},
    'MIN': {'primary': '#002B5C', 'secondary': '#D31145'},
    'NYM': {'primary': '#002D72', 'secondary': '#FF5910'},
    'NYY': {'primary': '#0C2340', 'secondary': '#C4CED4'},
    'OAK': {'primary': '#003831', 'secondary': '#EFB21E'},
    'PHI': {'primary': '#E81828', 'secondary': '#002D72'},
    'PIT': {'primary': '#27251F', 'secondary': '#FDB827'},
    'SD': {'primary': '#2F241D', 'secondary': '#FFC425'},
    'SF': {'primary': '#FD5A1E', 'secondary': '#27251F'},
    'SEA': {'primary': '#0C2C56', 'secondary': '#005C5C'},
    'STL': {'primary': '#C41E3A', 'secondary': '#0C2340'},
    'TB': {'primary': '#092C5C', 'secondary': '#8FBCE6'},
    'TEX': {'primary': '#003278', 'secondary': '#C01227'},
    'TOR': {'primary': '#134A8E', 'secondary': '#1D2D5C'},
    'WSH': {'primary': '#AB0003', 'secondary': '#14225A'},
  };
}
