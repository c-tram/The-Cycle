import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';
import '../services/connectivity_service.dart';
import '../models/standings.dart';
import '../models/team.dart';

// Provider to manage standings data and handle loading states
class StandingsProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  final CacheService _cacheService = CacheService();
  final ConnectivityService _connectivityService = ConnectivityService();
  
  List<Division>? _divisions;
  bool _isLoading = false;
  String? _error;
  bool _isOffline = false;

  List<Division>? get divisions => _divisions;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isOffline => _isOffline;

  // Load standings from API or cache
  Future<void> loadStandings({bool forceRefresh = false}) async {
    // Try cache first (unless force refresh is requested)
    if (!forceRefresh) {
      final cached = await _cacheService.getCachedStandings();
      if (cached != null) {
        _divisions = cached;
        notifyListeners();
        
        // If we have a cache hit, only continue to API if we're online and we want fresh data
        if (!await _connectivityService.canMakeNetworkRequest()) {
          _isOffline = true;
          notifyListeners();
          return; // We're offline but have cached data
        }
      }
    }

    _isLoading = true;
    _error = null;
    _isOffline = false;
    notifyListeners();

    try {
      // Hit the API
      final divisionsData = await _apiService.getStandings();
      _divisions = divisionsData;
      
      // Cache locally for offline support
      await _cacheService.cacheStandings(divisionsData);
      
      _error = null;
      _isOffline = false;
    } catch (e) {
      // Check if it's an offline error
      if (e is ApiException && e.isOfflineError) {
        _isOffline = true;
        
        // If we already loaded data from cache, don't show error
        if (_divisions != null) {
          _error = null;
        } else {
          _error = 'You are offline. Please connect to the internet and try again.';
        }
      } else {
        _isOffline = false;
        _error = e.toString();
      }
      print('Error loading standings: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Force refresh the standings data
  Future<void> refreshStandings() async {
    await loadStandings(forceRefresh: true);
  }
  
  // Get all teams across all divisions
  List<Team> get allTeams {
    List<Team> teams = [];
    if (_divisions != null) {
      for (var division in _divisions!) {
        teams.addAll(division.teams);
      }
    }
    return teams;
  }
  
  // Get a team by its team code
  Team? getTeamByCode(String teamCode) {
    try {
      return allTeams.firstWhere(
        (team) => team.code.toLowerCase() == teamCode.toLowerCase(),
      );
    } catch (e) {
      return null;
    }
  }
  
  // Find a team by its ID (team code)
  Team? getTeamById(String teamId) {
    if (_divisions == null) return null;
    
    // Search through all divisions and teams
    for (var division in _divisions!) {
      for (var team in division.teams) {
        if (team.code == teamId) {
          return team;
        }
      }
    }
    
    return null;
  }
  
  // Get division by name
  Division? getDivisionByName(String divisionName) {
    if (_divisions == null) return null;
    
    try {
      return _divisions!.firstWhere(
        (division) => division.name.toLowerCase() == divisionName.toLowerCase(),
      );
    } catch (_) {
      return null;
    }
  }
  
  // Get all teams in a specific league (AL or NL)
  List<Team> getTeamsByLeague(String league) {
    List<Team> teams = [];
    
    if (_divisions != null) {
      for (var division in _divisions!.where((d) => d.league == league)) {
        teams.addAll(division.teams);
      }
    }
    
    return teams;
  }
}
