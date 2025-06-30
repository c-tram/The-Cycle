# The Cycle - Flutter Frontend

A modern Flutter web application for MLB analytics and team management, featuring real-time data, team-specific branding, and comprehensive performance analytics.

## 🚀 Features

- **Team-Specific Branding**: Each MLB team has custom colors, logos, and themed interfaces
- **Real-time Game Data**: Live scores, schedules, and game updates
- **Performance Analytics**: Team metrics, player stats, and game predictions
- **Responsive Design**: Optimized for web, mobile, and tablet
- **Offline Support**: Cached data for offline viewing
- **Modern UI**: Material Design 3 with custom team themes

## 🛠️ Tech Stack

- **Flutter 3.x** - Cross-platform UI framework
- **Provider** - State management
- **HTTP** - API communication
- **Cached Network Image** - Image caching and optimization
- **FL Chart** - Interactive charts and graphs
- **Material Design 3** - Modern UI components

## 📊 Current Architecture

```
lib/
├── main.dart                 # App entry point with blue/white/grey theme
├── config/
│   └── app_config.dart      # App configuration and constants
├── models/
│   ├── game.dart            # Game data model
│   ├── player.dart          # Player and stats models
│   ├── standings.dart       # Division standings model
│   └── team.dart            # Team information model
├── providers/
│   ├── games_provider.dart  # Game data state management
│   └── standings_provider.dart # Standings state management
├── screens/
│   ├── home_screen.dart     # Main dashboard
│   ├── standings_screen.dart # Division standings
│   └── team_details_screen.dart # Enhanced team details with analytics
├── services/
│   ├── api_service.dart     # Backend API communication
│   ├── cache_service.dart   # Local data caching
│   ├── connectivity_service.dart # Network status
│   ├── notification_service.dart # Push notifications
│   ├── team_branding_service.dart # Team colors and logos
│   └── performance_analytics_service.dart # Analytics engine
├── utils/
│   └── constants.dart       # App constants and configurations
└── widgets/
    ├── game_card.dart       # Game display widget
    ├── offline_banner.dart  # Offline status indicator
    └── team_logo.dart       # Team logo widget
```

## 🎯 TODO List - Analytics & Frontend Enhancements

### 📈 High Priority Analytics Features

- [ ] **Performance Charts Implementation**
  - [ ] Win/Loss trend charts using FL Chart
  - [ ] Runs scored vs allowed over time
  - [ ] Team momentum visualization
  - [ ] Run differential charts
  - [ ] Batting average trends
  - [ ] ERA progression charts

- [ ] **Advanced Team Analytics Dashboard**
  - [ ] Head-to-head matchup predictions
  - [ ] Season projection models
  - [ ] Player performance correlation analysis
  - [ ] Home vs away performance breakdown
  - [ ] Weather impact analysis
  - [ ] Injury impact tracking

- [ ] **Interactive Data Visualization**
  - [ ] Touch-responsive charts with drill-down capability
  - [ ] Interactive timeline scrubber for historical data
  - [ ] Comparative team overlay charts
  - [ ] Real-time updating during live games
  - [ ] Export charts as images/PDFs

- [ ] **Predictive Analytics Features**
  - [ ] Game outcome probability models
  - [ ] Player performance predictions
  - [ ] Season win total projections
  - [ ] Playoff probability calculator
  - [ ] Trade impact analysis
  - [ ] Draft pick value assessment

### 🎨 UI/UX Enhancements

- [ ] **Enhanced Team Theming**
  - [ ] Animated team logo transitions
  - [ ] Dynamic gradient backgrounds based on team colors
  - [ ] Custom team-specific icons and imagery
  - [ ] Team fight song integration
  - [ ] Stadium-specific backgrounds
  - [ ] Jersey color schemes for different uniforms

- [ ] **Responsive Design Improvements**
  - [ ] Mobile-optimized navigation drawer
  - [ ] Tablet landscape layout optimization
  - [ ] Desktop multi-column layouts
  - [ ] Adaptive chart sizing
  - [ ] Touch-friendly controls for mobile

- [ ] **User Experience Features**
  - [ ] Dark mode with team-specific accents
  - [ ] Customizable dashboard layouts
  - [ ] Favorite teams quick access
  - [ ] Search functionality for players/teams
  - [ ] Filter and sort options for all data views
  - [ ] Bookmarking system for key games/players

### 📱 Mobile-First Features

- [ ] **Mobile Navigation**
  - [ ] Bottom navigation bar for key sections
  - [ ] Swipe gestures for chart navigation
  - [ ] Pull-to-refresh on all data screens
  - [ ] Haptic feedback for interactions

- [ ] **Mobile Analytics**
  - [ ] Simplified mobile chart views
  - [ ] Swipeable analytics cards
  - [ ] Mobile-optimized data tables
  - [ ] Quick stats overlay widgets

### 🔔 Real-time Features

- [ ] **Live Game Updates**
  - [ ] Real-time score updates
  - [ ] Live play-by-play integration
  - [ ] In-game analytics updates
  - [ ] Live probability updates during games

- [ ] **Push Notifications**
  - [ ] Game start/end notifications
  - [ ] Score update alerts
  - [ ] Favorite team news
  - [ ] Statistical milestone alerts

### 🎮 Interactive Features

- [ ] **Fantasy Baseball Integration**
  - [ ] Player value calculations
  - [ ] Trade analyzer tool
  - [ ] Lineup optimizer
  - [ ] Waiver wire recommendations

- [ ] **Social Features**
  - [ ] Share team/player stats
  - [ ] Comment system for games
  - [ ] Fan prediction contests
  - [ ] Social media integration

### 🔍 Advanced Analytics

- [ ] **Machine Learning Integration**
  - [ ] Player similarity algorithms
  - [ ] Injury prediction models
  - [ ] Performance regression analysis
  - [ ] Clutch performance metrics

- [ ] **Statistical Deep Dives**
  - [ ] Sabermetrics integration (WAR, wOBA, etc.)
  - [ ] Advanced pitching metrics
  - [ ] Situational statistics
  - [ ] Historical player comparisons

### 🛠️ Technical Improvements

- [ ] **Performance Optimization**
  - [ ] Implement lazy loading for large datasets
  - [ ] Optimize image loading and caching
  - [ ] Background data syncing
  - [ ] Memory usage optimization

- [ ] **Testing & Quality**
  - [ ] Unit tests for all services and models
  - [ ] Widget tests for UI components
  - [ ] Integration tests for user flows
  - [ ] Performance benchmarking

- [ ] **Developer Experience**
  - [ ] Add development environment setup scripts
  - [ ] Implement hot reload for analytics widgets
  - [ ] Add debugging tools for data flow
  - [ ] Create component style guide

## 🏗️ Setup & Development

### Prerequisites
- Flutter SDK 3.x+
- Dart SDK 3.x+
- VS Code or Android Studio
- Node.js backend running on port 3000

### Getting Started

1. **Install dependencies:**
   ```bash
   cd the_cycle_flutter
   flutter pub get
   ```

2. **Run the app:**
   ```bash
   # Web development
   flutter run -d web-server --web-port=3001
   
   # Mobile development
   flutter run
   ```

3. **Build for production:**
   ```bash
   # Web
   flutter build web --web-renderer html
   
   # Mobile
   flutter build apk --release
   ```

### API Configuration

The app connects to the backend API running on `http://localhost:3000`. Update `lib/services/api_service.dart` if you need to change the base URL.

## 📊 Analytics Implementation Guide

### Adding New Charts

1. **Create chart widget in `lib/widgets/charts/`:**
   ```dart
   class TeamPerformanceChart extends StatelessWidget {
     final List<PerformanceDataPoint> data;
     final TeamColors teamColors;
     
     @override
     Widget build(BuildContext context) {
       return LineChart(
         LineChartData(
           // FL Chart configuration
         ),
       );
     }
   }
   ```

2. **Add data processing in `PerformanceAnalyticsService`:**
   ```dart
   List<PerformanceDataPoint> generateCustomChart(
     List<Game> games,
     String teamCode,
   ) {
     // Process raw data into chart format
   }
   ```

3. **Integrate into team details screen:**
   ```dart
   // Add to _buildAnalyticsTab() method
   ```

### Team Branding Usage

```dart
// Get team colors and logo
final branding = TeamBrandingService();
final colors = branding.getTeamColors('hou');
final logoUrl = branding.getTeamLogoUrl('hou');
final theme = branding.getTeamTheme('hou');

// Apply to widgets
Container(
  decoration: BoxDecoration(
    gradient: LinearGradient(
      colors: [colors.primary, colors.secondary],
    ),
  ),
  child: CachedNetworkImage(imageUrl: logoUrl),
)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/analytics-charts`)
3. Commit your changes (`git commit -am 'Add performance charts'`)
4. Push to the branch (`git push origin feature/analytics-charts`)
5. Create a Pull Request

## 🎯 Current Status

✅ **Completed:**
- Global blue/white/grey theme implementation
- Team-specific branding system with all 30 MLB teams
- Enhanced team details screen with analytics framework
- Performance analytics service with prediction algorithms
- API integration with backend for games, standings, and roster data
- Offline support with caching

🚧 **In Progress:**
- Interactive chart implementation using FL Chart
- Mobile-responsive analytics dashboard
- Real-time data updates

⏳ **Planned:**
- Advanced machine learning analytics
- Fantasy baseball integration
- Social features and sharing
- Mobile app deployment

## 📈 Performance Analytics Features

The app includes a comprehensive analytics engine that provides:

- **Team Performance Metrics**: Win percentage, run differential, momentum
- **Game Predictions**: ML-based outcome predictions with confidence levels
- **Historical Analysis**: Trend analysis and performance tracking
- **Player Analytics**: Individual and team statistical analysis

## 🎨 Design System

The app uses a cohesive design system with:
- **Primary Theme**: Deep Blue (#1565C0) with white/grey accents
- **Team Themes**: Dynamic theming based on official MLB team colors
- **Typography**: Material Design 3 text styles
- **Spacing**: Consistent 8px grid system
- **Components**: Reusable widgets following Material Design guidelines


## Migration History

### ✅ Completed Migration Tasks
1. **Project Setup & Architecture**
   - Created Flutter project structure
   - Added essential dependencies (Provider, HTTP, FL Chart, etc.)
   - Setup clean architecture with config, models, services, providers, and screens

2. **Core Data Models & API Integration**
   - Game, Team, Player, and Standings models with backend compatibility
   - API service with proper error handling and offline support
   - Local caching service to complement Redis backend
   - Connectivity service for online/offline detection

3. **UI Components & Screens**
   - Enhanced team details screen with analytics framework
   - Games widget with live, upcoming, and recent game support
   - Standings screen with division/league organization
   - Offline banner and connectivity status indicators

4. **Team Branding System**
   - Complete team branding service with all 30 MLB teams
   - Official team colors and logo integration
   - Dynamic theme generation per team
   - Material Design 3 implementation with team-specific accents

5. **Performance Analytics Engine**
   - Team performance metrics calculation
   - Game prediction algorithms with confidence levels
   - Historical trend analysis
   - Player statistics processing

6. **State Management & Data Flow**
   - Provider pattern implementation for all data
   - Games provider with team-specific filtering
   - Standings provider with division management
   - User preferences and theme handling

### 📋 Migration Lessons Learned
- Flutter's type safety caught many potential runtime errors from React version
- Provider pattern provides cleaner state management than React hooks
- Flutter's widget system enables better component reusability
- Material Design 3 theming is more flexible than CSS-based theming

## Backend Integration

This app connects to the Express.js backend with Redis caching. The backend provides:

- `/api/games` - Recent and upcoming games with live updates
- `/api/standings` - Current MLB standings by division
- `/api/roster` - Team rosters and player statistics  
- `/api/trends` - Statistical trends and analytics data
- `/api/health/redis` - Redis status monitoring

---

**Last Updated:** December 30, 2024  
**Version:** 1.0.0  
**Maintainer:** Cole Trammell (@coletrammell)
