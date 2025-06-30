import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz;
import '../models/game.dart';

// Service to handle push notifications for game start times, scores, etc.
class NotificationService {
  static final FlutterLocalNotificationsPlugin _notifications = 
      FlutterLocalNotificationsPlugin();
      
  static final NotificationService _instance = NotificationService._internal();
  
  factory NotificationService() {
    return _instance;
  }
  
  NotificationService._internal();

  // Initialize notification service
  Future<void> initialize() async {
    // Initialize timezone
    tz.initializeTimeZones();
    
    // Initialize notifications
    const AndroidInitializationSettings androidInitializationSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const DarwinInitializationSettings iosInitializationSettings =
        DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    
    const InitializationSettings initializationSettings = InitializationSettings(
      android: androidInitializationSettings,
      iOS: iosInitializationSettings,
    );
    
    await _notifications.initialize(initializationSettings);
    
    // Request permissions for iOS
    await _notifications.resolvePlatformSpecificImplementation<
        IOSFlutterLocalNotificationsPlugin>()?.requestPermissions(
      alert: true,
      badge: true,
      sound: true,
    );
  }
  
  // Show immediate notification
  Future<void> showNotification({
    required String title,
    required String body,
    int id = 0,
  }) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'mlb_updates',
      'MLB Updates',
      channelDescription: 'Updates for MLB games and scores',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
    );
    
    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    
    const NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );
    
    await _notifications.show(
      id,
      title,
      body,
      details,
    );
  }

  // Schedule notification for game start
  Future<void> scheduleGameNotification(Game game, {int? notificationId}) async {
    if (game.status != GameStatus.scheduled || game.time == null) {
      return;
    }
    
    try {
      // Parse game date and time
      final dateTimeParts = '${game.date} ${game.time}'.split(' ');
      final dateParts = dateTimeParts[0].split('-');
      final timeParts = dateTimeParts[1].split(':');
      
      final gameDateTime = tz.TZDateTime(
        tz.local,
        int.parse(dateParts[0]), // year
        int.parse(dateParts[1]), // month
        int.parse(dateParts[2]), // day
        int.parse(timeParts[0]), // hour
        int.parse(timeParts[1]), // minute
      );
      
      // Schedule notification 15 minutes before game time
      final notificationTime = gameDateTime.subtract(const Duration(minutes: 15));
      
      if (notificationTime.isAfter(tz.TZDateTime.now(tz.local))) {
        const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
          'game_alerts',
          'Game Alerts',
          channelDescription: 'Notifications for game start times',
          importance: Importance.high,
          priority: Priority.high,
        );
        
        const DarwinNotificationDetails iosDetails = DarwinNotificationDetails();
        
        const NotificationDetails notificationDetails = NotificationDetails(
          android: androidDetails,
          iOS: iosDetails,
        );
        
        await _notifications.zonedSchedule(
          notificationId ?? game.hashCode,
          'Game Starting Soon',
          '${game.awayTeam} @ ${game.homeTeam} starts in 15 minutes',
          notificationTime,
          notificationDetails,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
          androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
          payload: 'game_${game.homeTeamCode}_${game.awayTeamCode}',
        );
      }
    } catch (e) {
      print('Error scheduling notification: $e');
    }
  }
  
  // Schedule score notification for a team's game
  Future<void> scheduleTeamScoreNotifications(String teamId, List<Game> games) async {
    // Cancel existing notifications for this team first
    await cancelTeamNotifications(teamId);
    
    // Filter for upcoming games for this team
    final upcomingGames = games.where((game) {
      // Check if the game is scheduled and has a valid date
      if (game.status != GameStatus.scheduled || game.date.isEmpty) {
        return false;
      }
      
      // Check if the team is playing in this game
      return game.homeTeamCode == teamId || game.awayTeamCode == teamId;
    }).toList();
    
    // Schedule notifications for each game
    for (final game in upcomingGames) {
      // Generate a unique ID for each game notification based on teamId and game
      final notificationId = '${teamId}_${game.date}'.hashCode;
      
      // Schedule pre-game notification
      await scheduleGameNotification(game, notificationId: notificationId);
      
      // Add another notification for final score
      await schedulePostGameScoreNotification(game, teamId, notificationId: notificationId + 1);
    }
  }

  // Schedule a notification for after the game to show the final score
  Future<void> schedulePostGameScoreNotification(Game game, String favoriteTeamId, {int notificationId = 0}) async {
    if (game.status != GameStatus.scheduled || game.date.isEmpty || game.time == null) {
      return;
    }
    
    try {
      // Parse game date and time
      final dateTimeParts = '${game.date} ${game.time}'.split(' ');
      final dateParts = dateTimeParts[0].split('-');
      final timeParts = dateTimeParts[1].split(':');
      
      // Create game time (average MLB game is about 3 hours)
      final gameDateTime = tz.TZDateTime(
        tz.local,
        int.parse(dateParts[0]), // year
        int.parse(dateParts[1]), // month
        int.parse(dateParts[2]), // day
        int.parse(timeParts[0]), // hour
        int.parse(timeParts[1]), // minute
      );
      
      // Schedule notification for 3 hours after game start (likely game end)
      final notificationTime = gameDateTime.add(const Duration(hours: 3));
      
      // Only schedule if the notification time is in the future
      if (notificationTime.isAfter(tz.TZDateTime.now(tz.local))) {
        const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
          'score_updates',
          'Score Updates',
          channelDescription: 'Final score notifications for completed games',
          importance: Importance.high,
          priority: Priority.high,
        );
        
        const DarwinNotificationDetails iosDetails = DarwinNotificationDetails();
        
        const NotificationDetails notificationDetails = NotificationDetails(
          android: androidDetails,
          iOS: iosDetails,
        );
        
        // Create title and body based on favorite team
        final isHomeTeam = game.homeTeamCode == favoriteTeamId;
        final teamName = isHomeTeam ? game.homeTeam : game.awayTeam;
        final opposingTeam = isHomeTeam ? game.awayTeam : game.homeTeam;
        
        await _notifications.zonedSchedule(
          notificationId,
          '$teamName Game Ended',
          'Check the final score for $teamName vs $opposingTeam',
          notificationTime,
          notificationDetails,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
          androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
          payload: 'game_${game.homeTeamCode}_${game.awayTeamCode}',
        );
      }
    } catch (e) {
      print('Error scheduling post-game notification: $e');
    }
  }

  // Cancel a specific notification
  Future<void> cancelNotification(int id) async {
    await _notifications.cancel(id);
  }
  
  // Cancel all notifications
  Future<void> cancelAllNotifications() async {
    await _notifications.cancelAll();
  }
  
  // Cancel all notifications for a specific team
  Future<void> cancelTeamNotifications(String teamId) async {
    // This is a simplification - in a full implementation we would track 
    // notification IDs by team to allow precise cancellation
    await _notifications.cancelAll();
  }
  
  // Handle notification tap
  void configureSelectNotificationHandler(void Function(String?) onSelectNotification) {
    // Configure notification tap handler
    _notifications.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        onSelectNotification(response.payload);
      },
    );
  }
  
  // Check notification permissions
  Future<bool> checkPermissions() async {
    // For iOS
    final ios = await _notifications.resolvePlatformSpecificImplementation<
        IOSFlutterLocalNotificationsPlugin>()?.requestPermissions(
      alert: true,
      badge: true,
      sound: true,
    );
    
    // Android permissions are granted at installation time
    return ios ?? true;
  }
  
  // Schedule notifications based on user preferences
  Future<void> setupNotificationsForUser(String? favoriteTeamId, List<Game> games, bool enableNotifications) async {
    // First cancel all existing notifications
    await cancelAllNotifications();
    
    if (!enableNotifications) {
      return; // Don't schedule any notifications if disabled
    }
    
    // Check permissions before scheduling
    final hasPermission = await checkPermissions();
    if (!hasPermission) {
      return; // Don't schedule if no permission
    }
    
    // If user has a favorite team, schedule team-specific notifications
    if (favoriteTeamId != null) {
      await scheduleTeamScoreNotifications(favoriteTeamId, games);
    } else {
      // Otherwise schedule notifications for all games
      // Schedule for a few games only to avoid too many notifications
      final limitedGames = games.take(3).toList();
      
      for (int i = 0; i < limitedGames.length; i++) {
        await scheduleGameNotification(
          limitedGames[i],
          notificationId: 1000 + i,
        );
      }
    }
  }
}
