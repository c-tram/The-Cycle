import 'package:flutter/material.dart';
import '../services/connectivity_service.dart';
import '../utils/constants.dart';

class OfflineBanner extends StatefulWidget {
  const OfflineBanner({Key? key}) : super(key: key);

  @override
  State<OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends State<OfflineBanner> with SingleTickerProviderStateMixin {
  late final ConnectivityService _connectivityService;
  late final AnimationController _animationController;
  bool _showBanner = false;

  @override
  void initState() {
    super.initState();
    _connectivityService = ConnectivityService();
    
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    
    // Initialize with current connectivity status
    _checkConnectivity();
    
    // Listen for connectivity changes
    _connectivityService.connectivityStream.listen((isConnected) {
      if (mounted) {
        setState(() {
          _showBanner = !isConnected;
          if (_showBanner) {
            _animationController.forward();
          } else {
            _animationController.reverse();
          }
        });
      }
    });
  }
  
  Future<void> _checkConnectivity() async {
    final isConnected = await _connectivityService.canMakeNetworkRequest();
    if (mounted) {
      setState(() {
        _showBanner = !isConnected;
        if (_showBanner) {
          _animationController.forward();
        }
      });
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(0, -1),
        end: Offset.zero,
      ).animate(CurvedAnimation(
        parent: _animationController,
        curve: Curves.fastOutSlowIn,
      )),
      child: _showBanner
          ? Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                vertical: 6.0,
                horizontal: AppConstants.paddingSmall,
              ),
              color: Colors.amber.shade800,
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.cloud_off,
                    color: Colors.white,
                    size: 16,
                  ),
                  SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      'You are offline. Using cached data.',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ),
            )
          : const SizedBox.shrink(),
    );
  }
}
