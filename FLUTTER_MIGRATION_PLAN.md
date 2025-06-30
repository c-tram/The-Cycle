# Flutter Migration Plan for "The Cycle" MLB Dashboard

## 📋 Overview
Migrate "The Cycle" from React web app to Flutter for true cross-platform compatibility while preserving the robust Express.js backend and Redis caching infrastructure.

## 🏗️ Phase 1: Project Setup & Architecture (Week 1-2)

### 1.1 Flutter Project Initialization
```bash
# Create new Flutter project alongside existing React app
flutter create the_cycle_flutter
cd the_cycle_flutter

# Add essential dependencies
flutter pub add http
flutter pub add provider
flutter pub add shared_preferences
flutter pub add connectivity_plus
flutter pub add flutter_local_notifications
flutter pub add cached_network_image
flutter pub add pull_to_refresh
```

### 1.2 Project Structure
```
the_cycle_flutter/
├── lib/
│   ├── main.dart
│   ├── config/
│   │   ├── api_config.dart
│   │   └── app_config.dart
│   ├── models/
│   │   ├── game.dart
│   │   ├── player.dart
│   │   ├── team.dart
│   │   └── standings.dart
│   ├── services/
│   │   ├── api_service.dart
│   │   ├── cache_service.dart
│   │   └── notification_service.dart
│   ├── providers/
│   │   ├── games_provider.dart
│   │   ├── standings_provider.dart
│   │   └── theme_provider.dart
│   ├── screens/
│   │   ├── overview_screen.dart
│   │   ├── games_screen.dart
│   │   ├── standings_screen.dart
│   │   └── trends_screen.dart
│   ├── widgets/
│   │   ├── game_card.dart
│   │   ├── standings_table.dart
│   │   └── trend_chart.dart
│   └── utils/
│       ├── constants.dart
│       └── helpers.dart
```

### 1.3 Backend Compatibility Layer
Keep existing Express.js backend unchanged - Flutter will consume the same REST APIs:
- `/api/games` - Recent and upcoming games (no more 5-game limit!)
- `/api/standings` - Current MLB standings
- `/api/roster` - Team rosters and player stats
- `/api/trends` - Statistical trends
- `/api/health/redis` - Redis status monitoring

## 🔄 Phase 2: Core Data Models & Services (Week 3)

### 2.1 Data Models (Dart equivalents of TypeScript interfaces)

```dart
// lib/models/game.dart
class Game {
  final String homeTeam;
  final String homeTeamCode;
  final String awayTeam;
  final String awayTeamCode;
  final int? homeScore;
  final int? awayScore;
  final String date;
  final String? time;
  final GameStatus status;

  Game({
    required this.homeTeam,
    required this.homeTeamCode,
    required this.awayTeam,
    required this.awayTeamCode,
    this.homeScore,
    this.awayScore,
    required this.date,
    this.time,
    required this.status,
  });

  factory Game.fromJson(Map<String, dynamic> json) {
    return Game(
      homeTeam: json['homeTeam'],
      homeTeamCode: json['homeTeamCode'],
      awayTeam: json['awayTeam'],
      awayTeamCode: json['awayTeamCode'],
      homeScore: json['homeScore'],
      awayScore: json['awayScore'],
      date: json['date'],
      time: json['time'],
      status: GameStatus.values.firstWhere(
        (e) => e.toString().split('.').last == json['status'],
      ),
    );
  }
}

enum GameStatus { completed, scheduled, live }
```

### 2.2 API Service (Leverages your existing backend)

```dart
// lib/services/api_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'http://localhost:3000/api'; // Dev
  // static const String baseUrl = 'https://your-azure-app.com/api'; // Prod
  
  static const Duration timeout = Duration(seconds: 30);

  // Reuse your existing /api/games endpoint
  Future<GamesData> getGames() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/games'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(timeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return GamesData.fromJson(data);
      } else {
        throw ApiException('Failed to load games: ${response.statusCode}');
      }
    } catch (e) {
      throw ApiException('Network error: $e');
    }
  }

  // Your Redis-cached standings endpoint
  Future<List<Division>> getStandings() async {
    final response = await http.get(Uri.parse('$baseUrl/standings')).timeout(timeout);
    
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => Division.fromJson(json)).toList();
    }
    throw ApiException('Failed to load standings');
  }
}
```

### 2.3 Local Caching (Complements your Redis backend cache)

```dart
// lib/services/cache_service.dart
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class CacheService {
  static const String _gamesKey = 'cached_games';
  static const String _standingsKey = 'cached_standings';
  static const Duration _cacheExpiry = Duration(hours: 1);

  // Local cache that works with your Redis backend cache
  Future<void> cacheGames(GamesData games) async {
    final prefs = await SharedPreferences.getInstance();
    final cacheItem = {
      'data': games.toJson(),
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };
    await prefs.setString(_gamesKey, json.encode(cacheItem));
  }

  Future<GamesData?> getCachedGames() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString(_gamesKey);
    
    if (cached != null) {
      final cacheItem = json.decode(cached);
      final timestamp = DateTime.fromMillisecondsSinceEpoch(cacheItem['timestamp']);
      
      if (DateTime.now().difference(timestamp) < _cacheExpiry) {
        return GamesData.fromJson(cacheItem['data']);
      }
    }
    return null;
  }
}
```

## 📱 Phase 3: Core UI Components (Week 4-5)

### 3.1 Games Widget (No more artificial limits!)

```dart
// lib/widgets/games_widget.dart
class GamesWidget extends StatelessWidget {
  final List<Game> games;
  final String title;

  const GamesWidget({
    Key? key,
    required this.games,
    required this.title,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.all(8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.all(16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Color(0xFFD50000), // MLB Red
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Chip(
                  label: Text('${games.length}'),
                  backgroundColor: Color(0xFFD50000).withOpacity(0.2),
                ),
              ],
            ),
          ),
          // SCROLLABLE - Show ALL games, not just 5!
          Expanded(
            child: ListView.builder(
              itemCount: games.length,
              itemBuilder: (context, index) => GameCard(game: games[index]),
            ),
          ),
        ],
      ),
    );
  }
}
```

### 3.2 Game Card Component

```dart
// lib/widgets/game_card.dart
class GameCard extends StatelessWidget {
  final Game game;

  const GameCard({Key? key, required this.game}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey.shade800)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Team matchup
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      game.awayTeamCode.toUpperCase(),
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(' @ '),
                    Text(
                      game.homeTeamCode.toUpperCase(),
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Text(
                  game.date,
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ),
          // Score or time
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (game.status == GameStatus.completed && 
                  game.homeScore != null && game.awayScore != null)
                Text(
                  '${game.awayScore}-${game.homeScore}',
                  style: TextStyle(
                    color: Color(0xFFD50000),
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                )
              else if (game.time != null)
                Text(game.time!, style: TextStyle(color: Colors.grey))
              else
                Text('TBD', style: TextStyle(color: Colors.grey)),
              _buildStatusChip(),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip() {
    Color color;
    String text;
    
    switch (game.status) {
      case GameStatus.live:
        color = Colors.green;
        text = 'LIVE';
        break;
      case GameStatus.completed:
        color = Colors.blue;
        text = 'FINAL';
        break;
      case GameStatus.scheduled:
        color = Colors.orange;
        text = 'SCHEDULED';
        break;
    }
    
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}
```

## 📊 Phase 4: State Management & Data Flow (Week 6)

### 4.1 Provider Pattern (Similar to your React state management)

```dart
// lib/providers/games_provider.dart
import 'package:flutter/foundation.dart';

class GamesProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  final CacheService _cacheService = CacheService();
  
  GamesData? _games;
  bool _isLoading = false;
  String? _error;

  GamesData? get games => _games;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadGames({bool forceRefresh = false}) async {
    // Try cache first (like your Redis cache strategy)
    if (!forceRefresh) {
      final cached = await _cacheService.getCachedGames();
      if (cached != null) {
        _games = cached;
        notifyListeners();
        return;
      }
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Hit your Express.js API (which uses Redis backend cache)
      final gamesData = await _apiService.getGames();
      _games = gamesData;
      
      // Cache locally for offline support
      await _cacheService.cacheGames(gamesData);
      
      _error = null;
    } catch (e) {
      _error = e.toString();
      print('Error loading games: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshGames() async {
    await loadGames(forceRefresh: true);
  }
}
```

### 4.2 Main App Structure

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

void main() {
  runApp(TheCycleApp());
}

class TheCycleApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => GamesProvider()),
        ChangeNotifierProvider(create: (_) => StandingsProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, child) {
          return MaterialApp(
            title: 'The Cycle - MLB Dashboard',
            theme: ThemeData(
              primarySwatch: Colors.red,
              primaryColor: Color(0xFFD50000), // MLB Red
              scaffoldBackgroundColor: Color(0xFF121212), // Dark theme
              brightness: Brightness.dark,
              appBarTheme: AppBarTheme(
                backgroundColor: Color(0xFF1E1E1E),
                foregroundColor: Colors.white,
              ),
            ),
            home: OverviewScreen(),
            routes: {
              '/games': (context) => GamesScreen(),
              '/standings': (context) => StandingsScreen(),
              '/trends': (context) => TrendsScreen(),
            },
          );
        },
      ),
    );
  }
}
```

## 🚀 Phase 5: Advanced Features (Week 7-8)

### 5.1 Push Notifications (Mobile advantage!)

```dart
// lib/services/notification_service.dart
class NotificationService {
  static final FlutterLocalNotificationsPlugin _notifications = 
      FlutterLocalNotificationsPlugin();

  static Future<void> initialize() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iOS = DarwinInitializationSettings();
    const settings = InitializationSettings(android: android, iOS: iOS);
    
    await _notifications.initialize(settings);
  }

  // Notify when favorite team games start
  static Future<void> scheduleGameNotification(Game game) async {
    await _notifications.zonedSchedule(
      game.hashCode,
      'Game Starting!',
      '${game.awayTeam} @ ${game.homeTeam}',
      // Schedule for game time
      TZDateTime.parse(tz.local, '${game.date} ${game.time}'),
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'game_alerts',
          'Game Alerts',
          description: 'Notifications for game start times',
          importance: Importance.high,
        ),
      ),
      uiLocalNotificationDateInterpretation: 
          UILocalNotificationDateInterpretation.absoluteTime,
    );
  }
}
```

### 5.2 Offline Support (Leverage your caching strategy)

```dart
// lib/services/offline_service.dart
class OfflineService {
  static Future<bool> isOnline() async {
    final connectivity = await Connectivity().checkConnectivity();
    return connectivity != ConnectivityResult.none;
  }

  // Work with your Redis cache + local cache
  static Future<GamesData?> getOfflineGames() async {
    final cacheService = CacheService();
    return await cacheService.getCachedGames();
  }
}
```

## 📋 Phase 6: Platform-Specific Features (Week 9-10)

### 6.1 Desktop Support (Windows, macOS, Linux)

```dart
// Add to pubspec.yaml for desktop
dependencies:
  window_manager: ^0.3.0
  desktop_window: ^0.4.0

// lib/main_desktop.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
    await windowManager.ensureInitialized();
    await windowManager.setMinimumSize(Size(800, 600));
    await windowManager.setTitle('The Cycle - MLB Dashboard');
  }
  
  runApp(TheCycleApp());
}
```

### 6.2 Web Support (PWA capabilities)

```dart
// web/manifest.json
{
  "name": "The Cycle - MLB Dashboard",
  "short_name": "The Cycle",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#121212",
  "theme_color": "#D50000",
  "icons": [
    {
      "src": "icons/Icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

## 🎯 Migration Benefits You'll Gain

### ✅ **Immediate Wins**
- **No more 5-game limit** - Your backend fix will show ALL games
- **Native mobile apps** with push notifications
- **Offline viewing** of cached data
- **60fps smooth animations**
- **Smaller app size** vs React Native/Cordova

### ✅ **Long-term Advantages**
- **Single codebase** for mobile, desktop, and web
- **Native performance** on all platforms
- **App store distribution** potential
- **Widget support** (home screen widgets showing live scores)
- **Background sync** capabilities

### ✅ **Preserved Infrastructure**
- **Express.js backend unchanged** - all your Redis work preserved
- **Same API endpoints** - `/api/games`, `/api/standings`, etc.
- **Azure deployment** strategy remains the same
- **Database/cache logic** completely reusable

## 📅 Timeline Summary

| Phase | Duration | Focus | Deliverable |
|-------|----------|-------|-------------|
| 1 | Week 1-2 | Setup & Architecture | Flutter project initialized |
| 2 | Week 3 | Data Models & Services | API integration complete |
| 3 | Week 4-5 | Core UI Components | Games/standings widgets |
| 4 | Week 6 | State Management | Provider pattern implemented |
| 5 | Week 7-8 | Advanced Features | Notifications, offline support |
| 6 | Week 9-10 | Platform Features | Desktop, web, mobile polish |

## 🚦 Risk Mitigation

### **Parallel Development**
- Keep React app running during migration
- Flutter app hits same APIs
- Gradual user migration possible

### **Feature Parity**
- Start with core features (games, standings)
- Add advanced features incrementally
- User feedback drives priorities

Would you like me to start implementing any of these phases, or dive deeper into specific aspects like the API service layer or state management patterns?
