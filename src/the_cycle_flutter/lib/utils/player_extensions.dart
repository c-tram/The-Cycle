// Player model extensions for MLB statistics formatting
import 'package:the_cycle_flutter/models/player.dart';
import 'package:the_cycle_flutter/utils/mlb_utils.dart';

/// Extension on Player class to format statistics using utility functions
extension PlayerStatsFormatting on Player {
  /// Get formatted batting average
  String get battingAverage {
    if (stats?.avg == null) return '.000';
    return MLBStatsFormatter.formatBattingAverage(stats!.avg);
  }

  /// Get formatted OBP (on-base percentage)
  String get obp {
    if (stats?.obp == null) return '.000';
    return MLBStatsFormatter.formatOBP(stats!.obp);
  }

  /// Get formatted SLG (slugging percentage)
  String get slg {
    if (stats?.slg == null) return '.000';
    return MLBStatsFormatter.formatSLG(stats!.slg);
  }

  /// Get formatted OPS (on-base plus slugging)
  String get ops {
    if (stats?.ops == null) return '.000';
    return MLBStatsFormatter.formatOPS(stats!.ops);
  }

  /// Get formatted ERA (earned run average)
  String get era {
    if (stats?.era == null) return '0.00';
    return MLBStatsFormatter.formatERA(stats!.era);
  }

  /// Get formatted WHIP (walks + hits per innings pitched)
  String get whip {
    if (stats?.whip == null) return '0.00';
    return MLBStatsFormatter.formatWHIP(stats!.whip);
  }

  /// Get formatted K/9 (strikeouts per 9 innings)
  String get kPer9 {
    if (stats?.inningsPitched == null || stats?.strikeouts == null)
      return '0.0';

    double kPer9 = (stats!.strikeouts! * 9.0) / stats!.inningsPitched!;

    return MLBStatsFormatter.formatKper9(kPer9);
  }

  /// Get home runs as int
  int get homeRuns => stats?.homeRuns ?? 0;

  /// Get RBI as int
  int get rbi => stats?.rbi ?? 0;

  /// Get runs as int
  int get runs => stats?.runs ?? 0;

  /// Get hits as int
  int get hits => stats?.hits ?? 0;

  /// Get wins as int
  int get wins => stats?.wins ?? 0;

  /// Get losses as int
  int get losses => stats?.losses ?? 0;

  /// Get strikeouts as int
  int get strikeouts => stats?.strikeouts ?? 0;

  /// Get walks as int
  int get walks => 0; // Add to PlayerStats model if not available

  /// Get stolen bases as int
  int get stolenBases => 0; // Add to PlayerStats model if not available

  /// Get saves as int
  int get saves => stats?.saves ?? 0;

  /// Get innings pitched as formatted string
  String get inningsPitched {
    if (stats?.inningsPitched == null) return '0.0';
    return stats!.inningsPitched!.toStringAsFixed(1);
  }

  /// Check if player is a pitcher
  bool get isPitcher => stats?.isPitcher ?? false;

  /// Check if player is a hitter
  bool get isHitter => stats?.isBatter ?? true;

  /// Player's age - mock data for now, extend PlayerStats model later
  int get age => 25;

  /// Player's height - mock data for now, extend PlayerStats model later
  String get height => "6'2\"";

  /// Player's weight - mock data for now, extend PlayerStats model later
  int get weight => 200;

  /// Player's birth place - mock data for now, extend PlayerStats model later
  String get birthPlace => "USA";

  /// Player's jersey number - mock data for now, extend PlayerStats model later
  String get number => "25";

  /// Player's batting side - mock data for now, extend PlayerStats model later
  String get bats => "R";

  /// Player's throwing arm - mock data for now, extend PlayerStats model later
  String get throws => "R";
}
