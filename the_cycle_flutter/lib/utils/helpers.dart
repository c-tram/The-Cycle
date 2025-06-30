import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:intl/intl.dart';

// Helper functions for the app
class AppHelpers {
  // Check if the device is connected to the internet
  static Future<bool> isOnline() async {
    final connectivityResults = await Connectivity().checkConnectivity();
    return connectivityResults.isNotEmpty &&
        !connectivityResults.contains(ConnectivityResult.none);
  }

  // Format a date string
  static String formatDate(String dateString, {bool includeYear = true}) {
    try {
      final date = DateTime.parse(dateString);
      if (includeYear) {
        return DateFormat.yMMMMd().format(date);
      } else {
        return DateFormat.MMMMd().format(date);
      }
    } catch (e) {
      return dateString;
    }
  }

  // Format a time string
  static String formatTime(String timeString) {
    try {
      final parts = timeString.split(':');
      final hour = int.parse(parts[0]);
      final minute = parts[1];
      final period = hour >= 12 ? 'PM' : 'AM';
      final formattedHour = hour > 12 ? hour - 12 : hour;
      return '$formattedHour:$minute $period';
    } catch (e) {
      return timeString;
    }
  }

  // Show a snackbar with a message
  static void showSnackBar(BuildContext context, String message,
      {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  // Show a loading dialog
  static Future<void> showLoadingDialog(BuildContext context,
      {String message = 'Loading...'}) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Row(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(width: 20),
            Text(message),
          ],
        ),
      ),
    );
  }

  // Calculate time since a date
  static String timeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 365) {
      return '${(difference.inDays / 365).floor()} ${(difference.inDays / 365).floor() == 1 ? 'year' : 'years'} ago';
    } else if (difference.inDays > 30) {
      return '${(difference.inDays / 30).floor()} ${(difference.inDays / 30).floor() == 1 ? 'month' : 'months'} ago';
    } else if (difference.inDays > 0) {
      return '${difference.inDays} ${difference.inDays == 1 ? 'day' : 'days'} ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} ${difference.inHours == 1 ? 'hour' : 'hours'} ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} ${difference.inMinutes == 1 ? 'minute' : 'minutes'} ago';
    } else {
      return 'Just now';
    }
  }

  // Get initials from a name
  static String getInitials(String name) {
    final nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return '${nameParts[0][0]}${nameParts[1][0]}'.toUpperCase();
    } else if (name.isNotEmpty) {
      return name[0].toUpperCase();
    } else {
      return '';
    }
  }
}
