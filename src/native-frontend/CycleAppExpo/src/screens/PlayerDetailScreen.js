import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Chip,
  Divider,
  Button,
} from 'react-native-paper';
import {LineChart, BarChart} from 'react-native-chart-kit';
import {showMessage} from 'react-native-flash-message';
import {apiService} from '../services/api';
import {theme} from '../theme/theme';

const {width: screenWidth} = Dimensions.get('window');

const PlayerDetailScreen = ({route}) => {
  const {playerKey, playerName, team, year} = route.params;
  const [playerData, setPlayerData] = useState(null);
  const [gameStats, setGameStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlayerData = async () => {
    try {
      setLoading(true);
      
      // Extract player name from key for API call
      const playerNameForAPI = playerKey.split('-').slice(1, -1).join('_');
      
      const [playerResponse, gamesResponse] = await Promise.all([
        apiService.getPlayerSeasonStats(team, playerNameForAPI, year),
        apiService.getPlayerGames(team, playerNameForAPI, year, {limit: 10}),
      ]);

      setPlayerData(playerResponse.data);
      setGameStats(gamesResponse.data.games || gamesResponse.data || []);

      showMessage({
        message: 'Player data loaded successfully!',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error fetching player data:', error);
      Alert.alert(
        'Error',
        'Failed to load player data. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlayerData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlayerData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Paragraph style={styles.loadingText}>Loading player data...</Paragraph>
      </View>
    );
  }

  if (!playerData) {
    return (
      <View style={styles.errorContainer}>
        <Paragraph style={styles.errorText}>No player data available</Paragraph>
        <Button mode="contained" onPress={fetchPlayerData}>
          Retry
        </Button>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 3,
    color: (opacity = 1) => `rgba(27, 94, 32, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  // Prepare chart data from recent games
  const chartData = {
    labels: gameStats.slice(0, 7).map((game, index) => `G${index + 1}`),
    datasets: [
      {
        data: gameStats.slice(0, 7).map(game => 
          game.batting?.battingAverage || 0
        ),
      },
    ],
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      
      {/* Player Header */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.playerHeader}>
            <View>
              <Title style={styles.playerName}>{playerName}</Title>
              <Paragraph style={styles.playerTeam}>{team} • {year}</Paragraph>
            </View>
            <Chip style={styles.statusChip}>Active</Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Season Stats */}
      {playerData.batting && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Batting Statistics</Title>
            <Divider style={styles.divider} />
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.batting.battingAverage || 'N/A'}
                </Paragraph>
                <Paragraph style={styles.statLabel}>AVG</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.batting.homeRuns || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>HR</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.batting.rbi || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>RBI</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.batting.runs || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>R</Paragraph>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.batting.hits || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>H</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.batting.doubles || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>2B</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.batting.triples || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>3B</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.batting.strikeOuts || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>SO</Paragraph>
              </View>
            </View>
            {playerData.batting.summary && (
              <View style={styles.summaryContainer}>
                <Paragraph style={styles.summaryText}>
                  {playerData.batting.summary}
                </Paragraph>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Pitching Stats */}
      {playerData.pitching && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Pitching Statistics</Title>
            <Divider style={styles.divider} />
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.pitching.era || 'N/A'}
                </Paragraph>
                <Paragraph style={styles.statLabel}>ERA</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.pitching.wins || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>W</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.pitching.losses || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>L</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.pitching.saves || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>SV</Paragraph>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.pitching.inningsPitched || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>IP</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.pitching.strikeOuts || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>K</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.pitching.baseOnBalls || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>BB</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {playerData.pitching.hits || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>H</Paragraph>
              </View>
            </View>
            {playerData.pitching.summary && (
              <View style={styles.summaryContainer}>
                <Paragraph style={styles.summaryText}>
                  {playerData.pitching.summary}
                </Paragraph>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Performance Chart */}
      {gameStats.length > 0 && playerData.batting && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Recent Performance</Title>
            <Paragraph style={styles.chartSubtitle}>
              Batting Average - Last 7 Games
            </Paragraph>
            <View style={styles.chartContainer}>
              <LineChart
                data={chartData}
                width={screenWidth - 64}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Recent Games */}
      {gameStats.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Recent Games</Title>
            <Divider style={styles.divider} />
            {gameStats.slice(0, 5).map((game, index) => (
              <View key={index} style={styles.gameItem}>
                <View style={styles.gameHeader}>
                  <Paragraph style={styles.gameDate}>
                    {game.date || `Game ${index + 1}`}
                  </Paragraph>
                  <Paragraph style={styles.gameOpponent}>
                    vs {game.opponent || 'N/A'}
                  </Paragraph>
                </View>
                {game.batting && (
                  <View style={styles.gameStats}>
                    <Paragraph style={styles.gameStatText}>
                      {game.batting.hits || 0}-{game.batting.atBats || 0}
                    </Paragraph>
                    <Paragraph style={styles.gameStatText}>
                      AVG: {game.batting.battingAverage || 'N/A'}
                    </Paragraph>
                    {game.batting.homeRuns > 0 && (
                      <Paragraph style={styles.gameStatText}>
                        {game.batting.homeRuns} HR
                      </Paragraph>
                    )}
                  </View>
                )}
                {index < gameStats.slice(0, 5).length - 1 && (
                  <Divider style={styles.gameDivider} />
                )}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  errorText: {
    marginBottom: 20,
    textAlign: 'center',
    color: theme.colors.text,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  playerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  playerTeam: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  statusChip: {
    backgroundColor: theme.colors.success,
  },
  divider: {
    marginVertical: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 4,
  },
  summaryContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  chartSubtitle: {
    fontSize: 12,
    color: theme.colors.placeholder,
    textAlign: 'center',
    marginTop: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  gameItem: {
    paddingVertical: 8,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  gameDate: {
    fontSize: 12,
    color: theme.colors.placeholder,
  },
  gameOpponent: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gameStatText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  gameDivider: {
    marginTop: 8,
  },
});

export default PlayerDetailScreen;
