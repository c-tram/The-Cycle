import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import '../models/game.dart';
import '../models/standings.dart';
import '../models/player.dart';

// Service to handle local caching of data
class CacheService {
  static const String _gamesKey = 'cached_games';
  static const String _standingsKey = 'cached_standings';
  static const String _rosterPrefix = 'cached_roster_';
  
  // Cache games data
  Future<void> cacheGames(GamesData games) async {
    final prefs = await SharedPreferences.getInstance();
    final cacheItem = {
      'data': games.toJson(),
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };
    await prefs.setString(_gamesKey, json.encode(cacheItem));
  }

  // Retrieve cached games
  Future<GamesData?> getCachedGames() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString(_gamesKey);
    
    if (cached != null) {
      final cacheItem = json.decode(cached);
      final timestamp = DateTime.fromMillisecondsSinceEpoch(cacheItem['timestamp']);
      
      if (DateTime.now().difference(timestamp) < AppConfig.cacheExpiry) {
        return GamesData.fromJson(cacheItem['data']);
      }
    }
    return null;
  }

  // Cache standings data
  Future<void> cacheStandings(List<Division> divisions) async {
    final prefs = await SharedPreferences.getInstance();
    final cacheItem = {
      'data': divisions.map((division) => division.toJson()).toList(),
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };
    await prefs.setString(_standingsKey, json.encode(cacheItem));
  }

  // Retrieve cached standings
  Future<List<Division>?> getCachedStandings() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString(_standingsKey);
    
    if (cached != null) {
      final cacheItem = json.decode(cached);
      final timestamp = DateTime.fromMillisecondsSinceEpoch(cacheItem['timestamp']);
      
      if (DateTime.now().difference(timestamp) < AppConfig.cacheExpiry) {
        final List<dynamic> data = cacheItem['data'];
        return data.map((json) => Division.fromJson(json)).toList();
      }
    }
    return null;
  }

  // Cache team roster
  Future<void> cacheTeamRoster(String teamCode, List<Player> players) async {
    final prefs = await SharedPreferences.getInstance();
    final cacheItem = {
      'data': players.map((player) => player.toJson()).toList(),
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };
    await prefs.setString('$_rosterPrefix$teamCode', json.encode(cacheItem));
  }

  // Retrieve cached team roster
  Future<List<Player>?> getCachedTeamRoster(String teamCode) async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString('$_rosterPrefix$teamCode');
    
    if (cached != null) {
      final cacheItem = json.decode(cached);
      final timestamp = DateTime.fromMillisecondsSinceEpoch(cacheItem['timestamp']);
      
      if (DateTime.now().difference(timestamp) < AppConfig.cacheExpiry) {
        final List<dynamic> data = cacheItem['data'];
        return data.map((json) => Player.fromJson(json)).toList();
      }
    }
    return null;
  }
  
  // Clear all cached data
  Future<void> clearAllCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
  
  // Clear specific cache
  Future<void> clearCache(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(key);
  }
}
