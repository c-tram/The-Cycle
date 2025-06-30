import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/game.dart';
import '../models/standings.dart';
import '../models/player.dart';
import 'connectivity_service.dart';

// Exception class for API related errors
class ApiException implements Exception {
  final String message;
  final bool isOfflineError;

  ApiException(this.message, {this.isOfflineError = false});

  @override
  String toString() => 'ApiException: $message';
}

// Service to handle all API communications with the backend
class ApiService {
  final ConnectivityService _connectivityService = ConnectivityService();

  // Get games data (recent, upcoming, and live games)
  Future<GamesData> getGames() async {
    try {
      // Check for internet connection before making request
      final hasConnectivity =
          await _connectivityService.canMakeNetworkRequest();
      if (!hasConnectivity) {
        throw ApiException('No internet connection available',
            isOfflineError: true);
      }

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.gamesEndpoint}'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return GamesData.fromJson(data);
      } else {
        throw ApiException('Failed to load games: ${response.statusCode}');
      }
    } on SocketException {
      throw ApiException('Network error: Could not connect to server',
          isOfflineError: true);
    } catch (e) {
      throw ApiException('Network error: $e');
    }
  }

  // Get standings data (divisions and teams)
  Future<List<Division>> getStandings() async {
    try {
      // Check for internet connection before making request
      final hasConnectivity =
          await _connectivityService.canMakeNetworkRequest();
      if (!hasConnectivity) {
        throw ApiException('No internet connection available',
            isOfflineError: true);
      }

      final response = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}${ApiConfig.standingsEndpoint}'),
          )
          .timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Division.fromJson(json)).toList();
      } else {
        throw ApiException('Failed to load standings: ${response.statusCode}');
      }
    } on SocketException {
      throw ApiException('Network error: Could not connect to server',
          isOfflineError: true);
    } catch (e) {
      throw ApiException('Network error: $e');
    }
  }

  // Get roster data for specific team
  Future<List<Player>> getTeamRoster(String teamCode) async {
    try {
      // Check for internet connection before making request
      final hasConnectivity =
          await _connectivityService.canMakeNetworkRequest();
      if (!hasConnectivity) {
        throw ApiException('No internet connection available',
            isOfflineError: true);
      }

      final response = await http.get(
        Uri.parse(
            '${ApiConfig.baseUrl}${ApiConfig.rosterEndpoint}?team=$teamCode&statType=hitting'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        // The backend returns a list with team data structure
        if (data.isNotEmpty && data[0]['players'] != null) {
          final List<dynamic> playersList = data[0]['players'];
          return playersList.map((json) => Player.fromJson(json)).toList();
        } else {
          return [];
        }
      } else {
        throw ApiException('Failed to load roster: ${response.statusCode}');
      }
    } on SocketException {
      throw ApiException('Network error: Could not connect to server',
          isOfflineError: true);
    } catch (e) {
      throw ApiException('Network error: $e');
    }
  }

  // Check Redis cache health
  Future<bool> isRedisCacheHealthy() async {
    try {
      // Check for internet connection before making request
      final hasConnectivity =
          await _connectivityService.canMakeNetworkRequest();
      if (!hasConnectivity) {
        return false; // Cannot check Redis health while offline
      }

      final response = await http
          .get(
            Uri.parse('${ApiConfig.baseUrl}${ApiConfig.redisHealthEndpoint}'),
          )
          .timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['healthy'] == true;
      } else {
        return false;
      }
    } on SocketException {
      return false;
    } catch (e) {
      return false;
    }
  }
}
