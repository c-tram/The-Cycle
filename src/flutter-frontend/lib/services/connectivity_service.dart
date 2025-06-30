import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';

class ConnectivityService {
  // Singleton instance
  static final ConnectivityService _instance = ConnectivityService._internal();
  factory ConnectivityService() => _instance;
  ConnectivityService._internal();

  final Connectivity _connectivity = Connectivity();

  // Controller for streaming connectivity status
  final _connectivityController = StreamController<bool>.broadcast();

  // Stream to listen to connectivity changes
  Stream<bool> get connectivityStream => _connectivityController.stream;

  // Flag to track current connectivity status
  bool _isConnected = true;
  bool get isConnected => _isConnected;

  // Initialize service
  Future<void> initialize() async {
    // Check initial connectivity
    _checkConnectivity();

    // Listen for connectivity changes
    _connectivity.onConnectivityChanged
        .listen((List<ConnectivityResult> results) {
      _handleConnectivityChange(results);
    });
  }

  // Check current connectivity
  Future<void> _checkConnectivity() async {
    final List<ConnectivityResult> results =
        await _connectivity.checkConnectivity();
    _handleConnectivityChange(results);
  }

  // Handle connectivity change
  void _handleConnectivityChange(List<ConnectivityResult> results) {
    bool isConnected =
        results.isNotEmpty && !results.contains(ConnectivityResult.none);

    // Only emit event if connectivity status changed
    if (_isConnected != isConnected) {
      _isConnected = isConnected;
      _connectivityController.add(isConnected);
    }
  }

  // Check if we can make network requests
  Future<bool> canMakeNetworkRequest() async {
    final List<ConnectivityResult> results =
        await _connectivity.checkConnectivity();
    return results.isNotEmpty && !results.contains(ConnectivityResult.none);
  }

  // Dispose resources
  void dispose() {
    _connectivityController.close();
  }
}
