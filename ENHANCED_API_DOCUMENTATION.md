# Enhanced Backend API Documentation v2.0
## Professional Baseball Statistics API

### Overview
The enhanced v2 API provides comprehensive baseball statistics with professional-grade calculations, advanced metrics, and detailed analytics. All endpoints support the complete statistical structure implemented in `pullBoxscoresToRedis_v2.cjs`.

### Base URL Structure
- **v1 (Legacy)**: `/api/{endpoint}` - Basic statistics with limited calculations
- **v2 (Enhanced)**: `/api/v2/{endpoint}` - Professional-grade statistics with advanced metrics

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
