import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

/// Utility class for platform-specific features and optimizations
class PlatformUtils {
  // Private constructor to prevent instantiation
  PlatformUtils._();

  /// Check if running on mobile platform (iOS or Android)
  static bool get isMobile => !kIsWeb && (Platform.isIOS || Platform.isAndroid);

  /// Check if running on desktop platform (Windows, macOS, Linux)
  static bool get isDesktop => !kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux);

  /// Check if running on web platform
  static bool get isWeb => kIsWeb;

  /// Check if running on iOS
  static bool get isIOS => !kIsWeb && Platform.isIOS;

  /// Check if running on Android
  static bool get isAndroid => !kIsWeb && Platform.isAndroid;

  /// Check if running on macOS
  static bool get isMacOS => !kIsWeb && Platform.isMacOS;

  /// Check if running on Windows
  static bool get isWindows => !kIsWeb && Platform.isWindows;

  /// Check if running on Linux
  static bool get isLinux => !kIsWeb && Platform.isLinux;

  /// Get platform name for display
  static String get platformName {
    if (kIsWeb) return 'Web';
    if (Platform.isIOS) return 'iOS';
    if (Platform.isAndroid) return 'Android';
    if (Platform.isWindows) return 'Windows';
    if (Platform.isMacOS) return 'macOS';
    if (Platform.isLinux) return 'Linux';
    return 'Unknown';
  }

  /// Get appropriate padding based on platform
  static EdgeInsets getAdaptivePadding() {
    if (isDesktop) {
      return const EdgeInsets.all(16.0); // More padding on desktop
    } else if (isWeb) {
      return const EdgeInsets.all(12.0); // Medium padding on web
    } else {
      return const EdgeInsets.all(8.0); // Less padding on mobile
    }
  }

  /// Get grid columns count based on screen width and platform
  static int getGridColumnCount(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    
    if (width < 600) {
      return 1; // Phone size
    } else if (width < 900) {
      return 2; // Small tablet
    } else if (width < 1200) {
      return 3; // Large tablet or small desktop
    } else {
      return 4; // Large desktop
    }
  }

  /// Check if device supports haptic feedback
  static bool get supportsHapticFeedback => isIOS || isAndroid;

  /// Detect if running in dark mode
  static bool isDarkMode(BuildContext context) {
    return MediaQuery.of(context).platformBrightness == Brightness.dark;
  }

  /// Get appropriate font size for current platform
  static double getAdaptiveFontSize(BuildContext context, {double baseFontSize = 14.0}) {
    if (isDesktop) {
      return baseFontSize * 1.1; // Slightly larger on desktop
    } else if (isWeb) {
      return baseFontSize * 1.0; // Default on web
    } else {
      // Scale based on device pixel ratio on mobile
      final pixelRatio = MediaQuery.of(context).devicePixelRatio;
      if (pixelRatio > 2.5) {
        return baseFontSize * 0.9; // Smaller on high density screens
      }
      return baseFontSize;
    }
  }
  
  /// Get top padding accounting for system status bar
  static double getTopPadding(BuildContext context) {
    return MediaQuery.of(context).padding.top;
  }
  
  /// Get bottom padding accounting for home indicator
  static double getBottomPadding(BuildContext context) {
    return MediaQuery.of(context).padding.bottom;
  }
}
