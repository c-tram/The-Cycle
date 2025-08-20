# Enhanced Backend API Documentation v2.0
## Professional Baseball Statistics API

### Overview
The enhanced v2 API provides comprehensive baseball statistics with professional-grade calculations, advanced metrics, detailed analytics, and **exhaustive situational splits analysis**. All endpoints support the complete statistical structure implemented in `pullBoxscoresToRedis_v2.cjs` and the new `pullPlayByPlaySplits.cjs` for comprehensive splits data.

**Mission**: Testing every possible baseball statistic that is imaginable with complete linkage between boxscores and situational performance.

### Base URL Structure
- **v1 (Legacy)**: `/api/{endpoint}` - Basic statistics with limited calculations
- **v2 (Enhanced)**: `/api/v2/{endpoint}` - Professional-grade statistics with advanced metrics
- **v2 Splits**: `/api/v2/splits/{category}` - **NEW** Situational analytics with play-by-play granularity

---

## 🆕 SPLITS ANALYSIS API (/api/v2/splits)

### Comprehensive Split Categories
The splits system extracts 7+ major categories of situational performance from MLB play-by-play data:

#### **1. Home/Away Performance** - `/api/v2/splits/home-away`
Player performance based on home vs away games
```
Redis Key Pattern: split:home-away:TEAM-PLAYER_NAME-YEAR:home|away
Example: split:home-away:HOU-Jose_Altuve-2025:home
```

#### **2. Venue-Specific Performance** - `/api/v2/splits/venue`
Player performance at specific ballparks with home/away context
```
Redis Key Pattern: split:venue:TEAM-PLAYER_NAME-YEAR:vs:VENUE_NAME:home|away
Example: split:venue:NYY-Aaron_Judge-2025:vs:Yankee_Stadium:home
```

#### **3. Player vs Team Matchups** - `/api/v2/splits/player-team`
Player performance against specific opposing teams
```
Redis Key Pattern: split:player-team:TEAM-PLAYER_NAME-YEAR:vs:OPPONENT:home|away
Example: split:player-team:LAD-Mookie_Betts-2025:vs:SF:away
```

#### **4. Batter vs Pitcher Matchups** - `/api/v2/splits/batter-pitcher`
Individual head-to-head performance with complete game linkage
```
Redis Key Pattern: split:batter-pitcher:BATTER_TEAM-BATTER_NAME-YEAR:vs:PITCHER_TEAM-PITCHER_NAME:home|away
Example: split:batter-pitcher:NYY-Aaron_Judge-2025:vs:HOU-Justin_Verlander:away
```

#### **5. Handedness Splits (Batting)** - `/api/v2/splits/batter-handedness`
Batter performance vs left/right-handed pitching
```
Redis Key Pattern: split:batter-hand:TEAM-PLAYER_NAME-YEAR:vs:L|R:home|away
Example: split:batter-hand:BOS-Rafael_Devers-2025:vs:L:home
```

#### **6. Handedness Splits (Pitching)** - `/api/v2/splits/pitcher-handedness`
Pitcher performance vs left/right-handed batters
```
Redis Key Pattern: split:pitcher-hand:TEAM-PLAYER_NAME-YEAR:vs:L|R:home|away
Example: split:pitcher-hand:NYY-Gerrit_Cole-2025:vs:R:home
```

#### **7. Team vs Team Matchups** - `/api/v2/splits/team-matchup`
Organizational performance in head-to-head series
```
Redis Key Pattern: split:team-matchup:TEAM_A:vs:TEAM_B:YEAR:home|away
Example: split:team-matchup:NYY:vs:BOS:2025:home
```

#### **8. Game-Specific Linkage** - `/api/v2/splits/game-specific`
Direct connections between splits and individual game boxscores
```
Redis Key Pattern: split-game:GAMEID-DATE:batter-pitcher:BATTER_NAME:vs:PITCHER_NAME
Example: split-game:776685-2025-08-19:batter-pitcher:Jose_Altuve:vs:Tarik_Skubal
```

### Splits Data Structure
Each split contains comprehensive statistical data with game linkage:
```json
{
  "stats": {
    "batting": {
      "plateAppearances": 125,
      "atBats": 112,
      "hits": 32,
      "runs": 18,
      "rbi": 22,
      "homeRuns": 8,
      "doubles": 6,
      "triples": 1,
      "singles": 17,
      "walks": 11,
      "strikeouts": 28,
      "hitByPitch": 2,
      "sacrificeFlies": 1,
      "sacrificeHits": 0,
      "stolenBases": 4,
      "groundedIntoDoublePlay": 3,
      "avg": 0.286,
      "obp": 0.344,
      "slg": 0.518,
      "ops": 0.862
    },
    "pitching": {
      "inningsPitched": 45.2,
      "hits": 38,
      "runs": 16,
      "earnedRuns": 14,
      "walks": 12,
      "strikeouts": 52,
      "homeRuns": 4,
      "battersFaced": 189,
      "hitBatsmen": 2,
      "outs": 137,
      "era": 2.76,
      "whip": 1.10,
      "strikeoutRate": 0.275,
      "walkRate": 0.063
    }
  },
  "games": [776685, 776123, 775892],
  "lastUpdated": "2025-08-20T14:04:02.921Z",
  "playCount": 125
}
```

### Game Linkage System
**Bidirectional Relationship**: Every split links to specific games, every game links to all splits
```json
{
  "gameId": 776685,
  "splitTypes": [
    "split:home-away:HOU-Jose_Altuve-2025:away",
    "split:venue:HOU-Jose_Altuve-2025:vs:Comerica_Park:away", 
    "split:batter-pitcher:HOU-Jose_Altuve-2025:vs:DET-Tarik_Skubal:away",
    "split:batter-hand:HOU-Jose_Altuve-2025:vs:L:away"
  ],
  "processed": "2025-08-20T14:04:02.923Z"
}
```

---

## 🏗️ COMPLETE REDIS ARCHITECTURE

### Key Patterns Overview
The Cycle uses a comprehensive Redis key architecture supporting traditional boxscores, advanced statistics, and exhaustive splits analysis:

#### **Boxscore Keys (Existing)**
```bash
# Player Performance
player:TEAM-PLAYER_NAME-YEAR:DATE-GAMEID     # Individual game stats with doubleheader support
player:TEAM-PLAYER_NAME-YEAR:season          # Season aggregations with 40+ statistical categories

# Team Performance  
team:TEAM:YEAR:DATE-GAMEID                   # Team game stats with doubleheader support
team:TEAM:YEAR:season                        # Team season aggregations

# Salary Data
salary:TEAM-PLAYER_NAME-YEAR                 # Player salary information (1,740+ records)

# Legacy Matchups
player-vs-team:TEAM-PLAYER_NAME-YEAR:vs:OPPONENT:average  # Basic matchup averages
```

#### **Splits Keys (NEW - Comprehensive Situational Analysis)**
```bash
# HOME/AWAY PERFORMANCE
split:home-away:TEAM-PLAYER_NAME-YEAR:home
split:home-away:TEAM-PLAYER_NAME-YEAR:away

# VENUE-SPECIFIC PERFORMANCE  
split:venue:TEAM-PLAYER_NAME-YEAR:vs:VENUE_NAME:home
split:venue:TEAM-PLAYER_NAME-YEAR:vs:VENUE_NAME:away
split:venue:TEAM-PLAYER_NAME-YEAR:vs:VENUE_NAME:total

# PLAYER vs TEAM MATCHUPS (Enhanced)
split:player-team:TEAM-PLAYER_NAME-YEAR:vs:OPPONENT:home  
split:player-team:TEAM-PLAYER_NAME-YEAR:vs:OPPONENT:away
split:player-team:TEAM-PLAYER_NAME-YEAR:vs:OPPONENT:total

# BATTER vs PITCHER HEAD-TO-HEAD
split:batter-pitcher:BATTER_TEAM-BATTER_NAME-YEAR:vs:PITCHER_TEAM-PITCHER_NAME:home
split:batter-pitcher:BATTER_TEAM-BATTER_NAME-YEAR:vs:PITCHER_TEAM-PITCHER_NAME:away  
split:batter-pitcher:BATTER_TEAM-BATTER_NAME-YEAR:vs:PITCHER_TEAM-PITCHER_NAME:total

# HANDEDNESS SPLITS
split:batter-hand:TEAM-PLAYER_NAME-YEAR:vs:L:home        # vs Left-handed pitching  
split:batter-hand:TEAM-PLAYER_NAME-YEAR:vs:R:away        # vs Right-handed pitching
split:pitcher-hand:TEAM-PLAYER_NAME-YEAR:vs:L:home       # vs Left-handed batters
split:pitcher-hand:TEAM-PLAYER_NAME-YEAR:vs:R:away       # vs Right-handed batters

# TEAM vs TEAM ORGANIZATIONAL MATCHUPS
split:team-matchup:TEAM_A:vs:TEAM_B:YEAR:home
split:team-matchup:TEAM_A:vs:TEAM_B:YEAR:away
split:team-matchup:TEAM_A:vs:TEAM_B:YEAR:total

# GAME-SPECIFIC LINKAGE (Boxscore Integration)
split-game:GAMEID-DATE:batter-pitcher:BATTER_NAME:vs:PITCHER_NAME
split-game:GAMEID-DATE:player-team:PLAYER_NAME:vs:OPPONENT:home
split-game:GAMEID-DATE:handedness:PLAYER_NAME:vs:L:away
```

#### **Indexing Keys (Cross-Reference System)**
```bash
# Game to Splits Mapping
game-splits-index:GAMEID                    # All splits for a specific game

# Player to Splits Mapping  
player-splits-index:TEAM-PLAYER_NAME-YEAR:GAMEID:available:[split-types]

# Reverse Lookup Support
boxscore-splits-linkage:TEAM-PLAYER_NAME-YEAR:GAMEID:[linked-splits]
```

### Key Architecture Benefits
- **📊 Complete Traceability**: Every split links to specific games and boxscore performance
- **🔍 Bidirectional Queries**: Find splits from games OR games from splits  
- **⚡ Efficient Retrieval**: Pattern-based Redis queries for complex analytics
- **🎯 Exhaustive Coverage**: 200+ split records per game for comprehensive analysis
- **🔗 Cross-Reference**: Direct connections between situational performance and overall statistics

---

## 🚀 PLANNED SPLITS API ENDPOINTS

### GET /api/v2/splits/home-away/:player
Get player's home vs away performance splits
```
Path Parameters:
- player (string): Team-Player format (e.g., "HOU-Jose_Altuve")

Query Parameters:
- year (string, default: "2025"): Season year
- context (string, default: "both"): "home", "away", or "both"
- format (string, default: "summary"): "summary", "detailed", or "games"

Response:
{
  "player": "Jose Altuve",
  "team": "HOU", 
  "year": "2025",
  "splits": {
    "home": {
      "stats": { /* batting/pitching stats */ },
      "games": [776685, 776123],
      "gameCount": 62
    },
    "away": {
      "stats": { /* batting/pitching stats */ },
      "games": [775892, 775654], 
      "gameCount": 59
    },
    "comparison": {
      "homeAdvantage": 0.045,
      "significantDifference": true
    }
  }
}
```

### GET /api/v2/splits/batter-pitcher/:batter/:pitcher
Get head-to-head batter vs pitcher matchup with complete game history
```
Path Parameters:
- batter (string): Team-Batter format (e.g., "NYY-Aaron_Judge")
- pitcher (string): Team-Pitcher format (e.g., "HOU-Justin_Verlander")

Query Parameters:
- year (string, default: "2025"): Season year
- context (string, default: "all"): "home", "away", or "all"
- includeGames (boolean, default: false): Include individual game breakdowns

Response:
{
  "matchup": {
    "batter": {"name": "Aaron Judge", "team": "NYY"},
    "pitcher": {"name": "Justin Verlander", "team": "HOU"}
  },
  "year": "2025",
  "splits": {
    "overall": {
      "stats": { /* comprehensive stats */ },
      "games": [776685, 776123, 775892],
      "plateAppearances": 27
    },
    "home": {
      "stats": { /* home stats */ },
      "games": [776685, 776123]
    },
    "away": {
      "stats": { /* away stats */ },
      "games": [775892]
    }
  },
  "gameDetails": [
    {
      "gameId": 776685,
      "date": "2025-08-19", 
      "venue": "Yankee Stadium",
      "atBats": [
        {"inning": 1, "result": "Single", "rbi": 0},
        {"inning": 4, "result": "Strikeout", "rbi": 0},
        {"inning": 7, "result": "Home Run", "rbi": 2}
      ]
    }
  ]
}
```

### GET /api/v2/splits/handedness/:player
Get player's performance vs left/right-handed opponents
```
Path Parameters:
- player (string): Team-Player format

Query Parameters:
- year (string, default: "2025"): Season year  
- type (string, default: "batter"): "batter" or "pitcher"
- context (string, default: "all"): "home", "away", or "all"

Response:
{
  "player": "Rafael Devers",
  "team": "BOS",
  "type": "batter",
  "year": "2025", 
  "splits": {
    "vsLefty": {
      "stats": { /* stats vs LHP */ },
      "gameCount": 45,
      "plateAppearances": 178
    },
    "vsRighty": {
      "stats": { /* stats vs RHP */ },
      "gameCount": 119,
      "plateAppearances": 512
    },
    "platoonAdvantage": {
      "opsVsLefty": 0.892,
      "opsVsRighty": 0.745,
      "advantage": 0.147,
      "significant": true
    }
  }
}
```

### GET /api/v2/splits/venue/:player/:venue
Get player's performance at a specific ballpark
```
Path Parameters:
- player (string): Team-Player format
- venue (string): Stadium/Team name (e.g., "Yankee_Stadium" or "NYY")

Response:
{
  "player": "Mookie Betts",
  "team": "LAD",
  "venue": "Yankee Stadium",
  "year": "2025",
  "splits": {
    "atVenue": {
      "stats": { /* performance at this venue */ },
      "games": [776685, 775892],
      "gamesPlayed": 6
    },
    "comparison": {
      "venueOPS": 0.987,
      "careerOPS": 0.845,
      "venueDifferential": 0.142,
      "favoriteVenue": true
    }
  }
}
```

---

## Statistics API (/api/v2/stats)

### GET /api/v2/stats/summary
Enhanced database summary with detailed metrics
```
Query Parameters:
- year (string, default: "2025"): Season year

Response:
{
  "year": "2025",
  "summary": {
    "totalPlayers": 750,
    "totalTeams": 30,
    "totalPlayerGames": 15000,
    "totalTeamGames": 2430,
    "totalGameDates": 162,
    "averagePlayersPerGame": 93
  },
  "dataStructure": {
    "playerSeasonStats": 750,
    "teamSeasonStats": 30,
    "gameByGameStats": 17430
  },
  "lastUpdated": "2025-01-09T..."
}
```

### GET /api/v2/stats/leaders
Enhanced statistical leaders with advanced metrics and proper qualifications
```
Query Parameters:
- category (string, default: "batting"): "batting", "pitching", "fielding"
- stat (string, default: "avg"): Statistical category to rank by
- team (string, optional): Filter by team abbreviation
- year (string, default: "2025"): Season year
- limit (number, default: 10): Number of leaders to return
- minGames (number, default: 10): Minimum games played
- minAtBats (number, default: 50): Minimum at-bats (batting only)
- minInnings (number, default: 10): Minimum innings pitched (pitching only)

Available Stats by Category:
Batting: avg, obp, slg, ops, iso, babip, kRate, bbRate, hits, homeRuns, rbi, runs, stolenBases, atBats
Pitching: era, whip, fip, strikeoutsPer9Inn, walksPer9Inn, hitsPer9Inn, strikeOuts, wins, saves, inningsPitched, strikeoutWalkRatio
Fielding: fieldingPercentage, assists, putOuts, errors, chances

Response:
{
  "category": "batting",
  "stat": "avg",
  "leaders": [
    {
      "rank": 1,
      "player": {
        "name": "John Doe",
        "team": "NYY",
        "year": "2025"
      },
      "value": 0.342,
      "games": 145,
      "qualifyingStats": {
        "atBats": 567,
        "plateAppearances": 650
      },
      "fullStats": { /* Complete batting statistics */ }
    }
  ],
  "count": 10,
  "filters": { /* Applied filters */ },
  "availableStats": [ /* Available statistics for category */ ]
}
```

### GET /api/v2/stats/advanced/:playerId
Advanced player analytics with comprehensive metrics
```
Path Parameters:
- playerId (string): Player identifier (format: TEAM-FIRSTNAME_LASTNAME-YEAR)

Query Parameters:
- year (string, default: "2025"): Season year

Response:
{
  "playerId": "NYY-AARON_JUDGE-2025",
  "year": "2025",
  "seasonStats": { /* Complete season statistics */ },
  "gameCount": 145,
  "advancedAnalytics": {
    "batting": {
      "woba": 0.387,
      "wrcPlus": 145,
      "powerSpeed": 12.5,
      "clutchFactor": 1.23
    },
    "pitching": {
      "gameScore": 68.5,
      "qualityStarts": 18,
      "leverage": 1.45
    }
  },
  "trends": {
    "batting": {
      "avgTrend": "improving",
      "hot": true,
      "slump": false
    }
  },
  "lastUpdated": "2025-01-09T..."
}
```

### GET /api/v2/stats/splits/:playerId
Comprehensive situational splits analysis
```
Path Parameters:
- playerId (string): Player identifier

Query Parameters:
- year (string, default: "2025"): Season year
- splitType (string, default: "all"): "homeAway", "monthly", "dayNight", "all"

Response:
{
  "playerId": "NYY-AARON_JUDGE-2025",
  "year": "2025",
  "splitType": "all",
  "splits": {
    "homeAway": {
      "home": { /* Aggregated home statistics */ },
      "away": { /* Aggregated away statistics */ }
    },
    "monthly": {
      "April": { /* April statistics */ },
      "May": { /* May statistics */ },
      // ... other months
    },
    "dayNight": {
      "day": { /* Day game statistics */ },
      "night": { /* Night game statistics */ }
    }
  },
  "gameCount": 145
}
```

### POST /api/v2/stats/compare/advanced
Advanced multi-player comparison with detailed analytics
```
Request Body:
{
  "players": ["NYY-AARON_JUDGE-2025", "LAD-MOOKIE_BETTS-2025"],
  "year": "2025",
  "categories": ["batting", "pitching"]
}

Response:
{
  "year": "2025",
  "categories": ["batting", "pitching"],
  "comparisons": [
    {
      "playerId": "NYY-AARON_JUDGE-2025",
      "seasonStats": { /* Complete statistics */ },
      "advancedMetrics": { /* Advanced calculations */ },
      "gameCount": 145,
      "consistency": {
        "mean": 0.287,
        "standardDeviation": 0.045,
        "coefficientOfVariation": 0.157
      }
    }
  ],
  "analytics": {
    "bestInCategory": { /* Category leaders */ },
    "significantDifferences": [ /* Notable differences */ ],
    "recommendations": [ /* Analysis insights */ ]
  },
  "playerCount": 2
}
```

### GET /api/v2/stats/team/:teamId/advanced
Advanced team analytics with comprehensive metrics
```
Path Parameters:
- teamId (string): Team abbreviation (e.g., "NYY")

Query Parameters:
- year (string, default: "2025"): Season year

Response:
{
  "teamId": "NYY",
  "year": "2025",
  "seasonStats": { /* Complete team statistics */ },
  "analytics": {
    "offense": {
      "runsPerGame": 5.2,
      "teamOPS": 0.785,
      "powerIndex": 23.5
    },
    "pitching": {
      "qualityStartPercentage": 0.65,
      "bullpenERA": 3.45,
      "strikeoutRate": 0.245
    },
    "fielding": {
      "teamFieldingPercentage": 0.987,
      "defensiveEfficiency": 0.712,
      "errorRate": 0.013
    },
    "roster": {
      "totalPlayers": 25,
      "battingDepth": 15,
      "pitchingDepth": 12
    },
    "balance": {
      "offensiveBalance": "balanced",
      "pitchingDepth": "strong",
      "overallRating": "A-"
    }
  },
  "playerCount": 25,
  "lastUpdated": "2025-01-09T..."
}
```

---

## Players API (/api/v2/players)

### GET /api/v2/players
Enhanced player listing with comprehensive filtering and statistics
```
Query Parameters:
- team (string, optional): Filter by team abbreviation
- year (string, default: "2025"): Season year
- position (string, optional): Filter by position
- status (string, default: "active"): Player status filter
- sortBy (string, default: "name"): Sort criteria ("name", "team", "games", "avg", "era")
- minGames (number, default: 0): Minimum games played
- category (string, default: "batting"): Primary statistical category

Response:
{
  "players": [
    {
      "id": "NYY-AARON_JUDGE-2025",
      "name": "Aaron Judge",
      "team": "NYY",
      "year": "2025",
      "gameCount": 145,
      "position": "RF",
      "status": "active",
      "stats": {
        "batting": { /* Complete batting statistics */ },
        "pitching": { /* Complete pitching statistics */ },
        "fielding": { /* Complete fielding statistics */ }
      },
      "summary": {
        "primaryRole": "Batter",
        "keyStats": {
          "avg": 0.287,
          "ops": 0.945,
          "homeRuns": 42
        },
        "performance": "Excellent"
      },
      "lastUpdated": "2025-01-09T..."
    }
  ],
  "count": 750,
  "filters": { /* Applied filters */ },
  "available": {
    "teams": ["ARI", "ATL", "BAL", ...],
    "positions": ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "SP", "RP"],
    "years": ["2025"]
  }
}
```

### GET /api/v2/players/:playerId
Comprehensive individual player data with advanced analytics
```
Path Parameters:
- playerId (string): Player identifier

Query Parameters:
- year (string, default: "2025"): Season year
- includeGameLog (string, default: "false"): Include game-by-game data

Response:
{
  "id": "NYY-AARON_JUDGE-2025",
  "name": "Aaron Judge",
  "team": "NYY",
  "year": "2025",
  "gameCount": 145,
  "position": "RF",
  "status": "active",
  "seasonStats": {
    "batting": { /* Complete 40+ batting statistics */ },
    "pitching": { /* Complete 25+ pitching statistics */ },
    "fielding": { /* Complete 15+ fielding statistics */ }
  },
  "careerHighlights": [
    "Batting .287",
    "42 Home Runs",
    "0.945 OPS"
  ],
  "analytics": {
    "strengths": ["Power", "Plate Discipline"],
    "improvements": ["Contact Rate"],
    "comparisons": {
      "leagueRank": "Top 10%",
      "similarPlayers": ["Player A", "Player B"],
      "historicalComparison": "Above Average"
    }
  },
  "gameLog": [ /* If includeGameLog=true */ ],
  "lastUpdated": "2025-01-09T..."
}
```

### GET /api/v2/players/:playerId/splits
Comprehensive situational splits with detailed breakdowns
```
Path Parameters:
- playerId (string): Player identifier

Query Parameters:
- year (string, default: "2025"): Season year
- splitType (string, default: "all"): Split category to analyze

Response:
{
  "player": {
    "id": "NYY-AARON_JUDGE-2025",
    "name": "Aaron Judge",
    "team": "NYY",
    "year": "2025"
  },
  "splitType": "all",
  "splits": {
    "homeAway": { /* Home vs Away performance */ },
    "monthly": { /* Month-by-month breakdown */ },
    "dayNight": { /* Day vs Night games */ }
  },
  "gameCount": 145,
  "insights": [
    {
      "type": "homeAway",
      "message": "Performs significantly better at home (+45 points)"
    }
  ]
}
```

### GET /api/v2/players/:playerId/trends
Performance trends and projections with streak analysis
```
Path Parameters:
- playerId (string): Player identifier

Query Parameters:
- year (string, default: "2025"): Season year
- period (string, default: "30"): Days to analyze for trends

Response:
{
  "player": { /* Player info */ },
  "period": "30",
  "trends": {
    "batting": {
      "avg": {
        "recent": 0.295,
        "earlier": 0.280,
        "trend": "improving"
      },
      "ops": {
        "recent": 0.875,
        "earlier": 0.820,
        "trend": "improving"
      }
    }
  },
  "projections": {
    "confidence": "High",
    "projection": "Continued improvement expected",
    "factors": ["Recent performance", "Historical patterns"]
  },
  "hotColdStreaks": {
    "hitting": {
      "current": 8,
      "longest": 15
    },
    "onBase": {
      "current": 12,
      "longest": 23
    }
  },
  "lastUpdated": "2025-01-09T..."
}
```

### POST /api/v2/players/compare
Advanced multi-player comparison with detailed analytics
```
Request Body:
{
  "players": ["NYY-AARON_JUDGE-2025", "LAD-MOOKIE_BETTS-2025"],
  "year": "2025",
  "categories": ["batting"],
  "metrics": "advanced"
}

Response:
{
  "year": "2025",
  "categories": ["batting"],
  "metrics": "advanced",
  "comparisons": [ /* Detailed player comparisons */ ],
  "analytics": {
    "leaders": { /* Category leaders */ },
    "insights": [ /* Comparison insights */ ],
    "recommendations": [ /* Analysis recommendations */ ]
  },
  "summary": {
    "bestOverall": "Aaron Judge",
    "closestMatch": "Similar power profiles",
    "biggestDifference": "Plate discipline"
  },
  "playerCount": 2
}
```

### GET /api/v2/players/team/:teamId
Team roster with comprehensive statistics and analysis
```
Path Parameters:
- teamId (string): Team abbreviation

Query Parameters:
- year (string, default: "2025"): Season year
- sortBy (string, default: "name"): Sort criteria
- category (string, default: "batting"): Primary category for ranking

Response:
{
  "team": "NYY",
  "year": "2025",
  "roster": [ /* Complete roster with stats */ ],
  "rosterSize": 25,
  "teamAnalytics": {
    "depthChart": {
      "C": ["Player A", "Player B"],
      "1B": ["Player C"],
      // ... all positions
    },
    "teamBalance": {
      "offense": "Strong",
      "pitching": "Excellent",
      "defense": "Average",
      "depth": "Good"
    },
    "keyPlayers": ["Aaron Judge", "Gerrit Cole", ...],
    "weaknesses": ["Left-handed relief", "Backup catcher"]
  },
  "sortBy": "name",
  "category": "batting"
}
```

### GET /api/v2/players/search
Advanced player search with multiple filters
```
Query Parameters:
- q (string, required): Search query (minimum 2 characters)
- year (string, default: "2025"): Season year
- team (string, optional): Filter by team
- position (string, optional): Filter by position
- minGames (number, default: 0): Minimum games played
- statThreshold (string, optional): Statistical threshold filter
- limit (number, default: 20): Maximum results

Response:
{
  "query": "judge",
  "results": [ /* Matching players with relevance scores */ ],
  "count": 3,
  "filters": { /* Applied filters */ }
}
```

---

## Teams API (/api/v2/teams)

### GET /api/v2/teams
Enhanced team listing with comprehensive statistics and standings data
```
Query Parameters:
- year (string, default: "2025"): Season year
- league (string, optional): Filter by league ("AL", "NL")
- division (string, optional): Filter by division
- sortBy (string, default: "name"): Sort criteria ("name", "wins", "winPct", "runDiff", "runs")

Response:
{
  "teams": [
    {
      "id": "NYY",
      "name": "New York Yankees",
      "league": "AL",
      "division": "East",
      "year": "2025",
      "gameCount": 162,
      "record": {
        "wins": 98,
        "losses": 64
      },
      "stats": {
        "batting": { /* Complete team batting stats */ },
        "pitching": { /* Complete team pitching stats */ },
        "fielding": { /* Complete team fielding stats */ }
      },
      "standings": {
        "winPercentage": 0.605,
        "runsScored": 845,
        "runsAllowed": 698,
        "runDifferential": 147
      },
      "lastUpdated": "2025-01-09T..."
    }
  ],
  "count": 30,
  "year": "2025",
  "filters": { /* Applied filters */ },
  "available": {
    "leagues": ["AL", "NL"],
    "divisions": ["East", "Central", "West"]
  }
}
```

### GET /api/v2/teams/:teamId
Comprehensive individual team data with analytics
```
Path Parameters:
- teamId (string): Team abbreviation

Query Parameters:
- year (string, default: "2025"): Season year
- includeRoster (string, default: "false"): Include complete roster

Response:
{
  "id": "NYY",
  "name": "New York Yankees",
  "league": "AL",
  "division": "East",
  "year": "2025",
  "gameCount": 162,
  "record": {
    "wins": 98,
    "losses": 64
  },
  "seasonStats": { /* Complete team statistics */ },
  "standings": {
    "winPercentage": 0.605,
    "runsScored": 845,
    "runsAllowed": 698,
    "runDifferential": 147,
    "homeRecord": { "wins": 52, "losses": 29 },
    "awayRecord": { "wins": 46, "losses": 35 }
  },
  "analytics": {
    "offensive": {
      "rating": "Excellent",
      "runsPerGame": 5.22,
      "teamOPS": 0.785,
      "powerIndex": 23.5,
      "disciplineIndex": 0.095
    },
    "pitching": {
      "rating": "Good",
      "era": 3.85,
      "whip": 1.25,
      "strikeoutRate": 0.245,
      "walkRate": 0.085,
      "qualityStartPct": 0.65
    },
    "fielding": {
      "rating": "Average",
      "fieldingPct": 0.987,
      "errors": 95,
      "errorRate": 0.013
    },
    "overall": "A-"
  },
  "roster": [ /* If includeRoster=true */ ],
  "rosterSize": 25,
  "depthChart": { /* If includeRoster=true */ },
  "lastUpdated": "2025-01-09T..."
}
```

### GET /api/v2/teams/:teamId/schedule
Team schedule and game results with performance analysis
```
Path Parameters:
- teamId (string): Team abbreviation

Query Parameters:
- year (string, default: "2025"): Season year
- month (string, optional): Filter by month (01-12)
- limit (number, default: 50): Maximum games to return

Response:
{
  "team": "NYY",
  "year": "2025",
  "month": null,
  "games": [
    {
      "date": "2025-10-01",
      "opponent": "BOS",
      "homeAway": "home",
      "result": "W",
      "score": {
        "team": 7,
        "opponent": 4
      },
      "stats": {
        "batting": { /* Game batting stats */ },
        "pitching": { /* Game pitching stats */ },
        "fielding": { /* Game fielding stats */ }
      },
      "gameInfo": { /* Additional game context */ },
      "performance": {
        "score": 85,
        "rating": "Excellent"
      }
    }
  ],
  "count": 162,
  "analytics": {
    "winPercentage": 0.605,
    "homeRecord": { "wins": 52, "losses": 29 },
    "awayRecord": { "wins": 46, "losses": 35 },
    "averageRunsScored": 5.22,
    "averageRunsAllowed": 4.31,
    "recentForm": 7
  },
  "filters": { /* Applied filters */ }
}
```

### GET /api/v2/teams/:teamId/splits
Team situational splits analysis
```
Path Parameters:
- teamId (string): Team abbreviation

Query Parameters:
- year (string, default: "2025"): Season year
- splitType (string, default: "all"): Split type to analyze

Response:
{
  "team": "NYY",
  "year": "2025",
  "splitType": "all",
  "splits": {
    "homeAway": { /* Home vs Away team performance */ },
    "monthly": { /* Month-by-month team performance */ }
  },
  "gameCount": 162,
  "insights": [
    {
      "type": "homeAway",
      "message": "Strong home field advantage (+12 win%)"
    }
  ]
}
```

### GET /api/v2/teams/standings
League standings with advanced metrics
```
Query Parameters:
- year (string, default: "2025"): Season year
- league (string, optional): Filter by league
- division (string, optional): Filter by division

Response:
{
  "standings": [
    {
      "id": "NYY",
      "name": "New York Yankees",
      "league": "AL",
      "division": "East",
      "wins": 98,
      "losses": 64,
      "winPercentage": 0.605,
      "gamesBack": 0,
      "runsScored": 845,
      "runsAllowed": 698,
      "runDifferential": 147,
      "streak": { "type": "W", "count": 3 },
      "homeRecord": { "wins": 52, "losses": 29 },
      "awayRecord": { "wins": 46, "losses": 35 },
      "lastTen": { "wins": 7, "losses": 3 },
      "rank": 1
    }
  ],
  "year": "2025",
  "filters": { /* Applied filters */ },
  "summary": {
    "totalTeams": 30,
    "averageWinPct": 0.500,
    "highestRunDiff": 147,
    "lowestRunDiff": -95
  }
}
```

### POST /api/v2/teams/compare
Advanced team comparison with detailed analytics
```
Request Body:
{
  "teams": ["NYY", "LAD"],
  "year": "2025",
  "categories": ["batting", "pitching"]
}

Response:
{
  "year": "2025",
  "categories": ["batting", "pitching"],
  "comparisons": [ /* Detailed team comparisons */ ],
  "analytics": {
    "leaders": {
      "offense": "New York Yankees",
      "pitching": "Los Angeles Dodgers"
    },
    "insights": [ /* Comparison insights */ ],
    "recommendations": [ /* Strategic recommendations */ ]
  },
  "summary": {
    "bestRecord": "New York Yankees",
    "totalTeams": 2,
    "avgWinPct": 0.582
  },
  "teamCount": 2
}
```

---

## Enhanced Features Summary

### Professional Statistics Coverage
- **40+ Batting Statistics**: Including advanced metrics like wOBA, ISO, BABIP, wRC+
- **25+ Pitching Statistics**: Including FIP, SIERA, K/9, BB/9, HR/9
- **15+ Fielding Statistics**: Including UZR, DRS, advanced positional metrics
- **Proper Rate Calculations**: Weighted averages instead of simple sums
- **Situational Context**: Home/Away, Monthly, Day/Night splits

### Advanced Analytics
- **Trend Analysis**: Performance trajectories and projections
- **Consistency Metrics**: Standard deviation and variance analysis
- **Clutch Performance**: High-leverage situation statistics
- **Player Development**: Improvement tracking over time
- **Team Balance**: Roster construction and depth analysis

### Data Quality Features
- **Qualification Minimums**: Proper thresholds for statistical leaders
- **Error Handling**: Comprehensive validation and fallbacks
- **Performance Optimization**: Efficient Redis queries and data aggregation
- **Real-time Updates**: Live data synchronization capabilities

### API Enhancements
- **Versioned Endpoints**: v1 legacy support, v2 enhanced features
- **Comprehensive Filtering**: Multi-dimensional search and sort options
- **Detailed Documentation**: Complete parameter and response specifications
- **Professional Standards**: MLB-compliant statistical calculations

This enhanced API provides the foundation for a professional-grade baseball analytics platform with comprehensive statistical coverage and advanced analytical capabilities.
