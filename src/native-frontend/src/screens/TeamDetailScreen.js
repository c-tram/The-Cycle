import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Chip,
  Divider,
  Button,
  List,
} from 'react-native-paper';
import {showMessage} from 'react-native-flash-message';
import {apiService} from '../services/api';
import {theme} from '../theme/theme';

const TeamDetailScreen = ({route, navigation}) => {
  const {teamId, teamName, year} = route.params;
  const [teamData, setTeamData] = useState(null);
  const [roster, setRoster] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      
      const [teamResponse, rosterResponse, gamesResponse] = await Promise.all([
        apiService.getTeamSeasonStats(teamId, year),
        apiService.getTeamRoster(teamId, year, {limit: 20}),
        apiService.getTeamGames(teamId, year, {limit: 10}),
      ]);

      setTeamData(teamResponse.data);
      setRoster(rosterResponse.data.players || rosterResponse.data || []);
      setRecentGames(gamesResponse.data.games || gamesResponse.data || []);

      showMessage({
        message: 'Team data loaded successfully!',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error fetching team data:', error);
      Alert.alert(
        'Error',
        'Failed to load team data. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeamData();
  };

  const onPlayerPress = (player) => {
    navigation.navigate('Players', {
      screen: 'PlayerDetail',
      params: {
        playerKey: player.key,
        playerName: player.name,
        team: teamId,
        year: year,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Paragraph style={styles.loadingText}>Loading team data...</Paragraph>
      </View>
    );
  }

  if (!teamData) {
    return (
      <View style={styles.errorContainer}>
        <Paragraph style={styles.errorText}>No team data available</Paragraph>
        <Button mode="contained" onPress={fetchTeamData}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      
      {/* Team Header */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.teamHeader}>
            <View>
              <Title style={styles.teamName}>{teamName}</Title>
              <Paragraph style={styles.teamDetails}>{teamId} • {year}</Paragraph>
            </View>
            <Chip style={styles.statusChip}>Active</Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Team Record */}
      {teamData.record && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Season Record</Title>
            <View style={styles.recordContainer}>
              <View style={styles.recordItem}>
                <Paragraph style={styles.recordNumber}>
                  {teamData.record.wins || 0}
                </Paragraph>
                <Paragraph style={styles.recordLabel}>Wins</Paragraph>
              </View>
              <View style={styles.recordItem}>
                <Paragraph style={styles.recordNumber}>
                  {teamData.record.losses || 0}
                </Paragraph>
                <Paragraph style={styles.recordLabel}>Losses</Paragraph>
              </View>
              <View style={styles.recordItem}>
                <Paragraph style={styles.recordNumber}>
                  {teamData.record.winPercentage ? 
                    (teamData.record.winPercentage * 100).toFixed(1) + '%' : 
                    'N/A'
                  }
                </Paragraph>
                <Paragraph style={styles.recordLabel}>Win %</Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Team Batting Stats */}
      {teamData.batting && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Team Batting</Title>
            <Divider style={styles.divider} />
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.batting.battingAverage || 'N/A'}
                </Paragraph>
                <Paragraph style={styles.statLabel}>AVG</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.batting.homeRuns || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>HR</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.batting.rbi || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>RBI</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.batting.runs || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>R</Paragraph>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.batting.hits || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>H</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.batting.doubles || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>2B</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.batting.triples || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>3B</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.batting.gamesPlayed || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>GP</Paragraph>
              </View>
            </View>
            {teamData.batting.summary && (
              <View style={styles.summaryContainer}>
                <Paragraph style={styles.summaryText}>
                  {teamData.batting.summary}
                </Paragraph>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Team Pitching Stats */}
      {teamData.pitching && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Team Pitching</Title>
            <Divider style={styles.divider} />
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.pitching.era || 'N/A'}
                </Paragraph>
                <Paragraph style={styles.statLabel}>ERA</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.pitching.wins || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>W</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.pitching.losses || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>L</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.pitching.saves || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>SV</Paragraph>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.pitching.inningsPitched || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>IP</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.pitching.strikeOuts || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>K</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.pitching.baseOnBalls || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>BB</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statValue}>
                  {teamData.pitching.gamesPlayed || 0}
                </Paragraph>
                <Paragraph style={styles.statLabel}>GP</Paragraph>
              </View>
            </View>
            {teamData.pitching.summary && (
              <View style={styles.summaryContainer}>
                <Paragraph style={styles.summaryText}>
                  {teamData.pitching.summary}
                </Paragraph>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Roster */}
      {roster.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Active Roster</Title>
            <Divider style={styles.divider} />
            {roster.slice(0, 10).map((player, index) => (
              <List.Item
                key={index}
                title={player.name}
                description={`${player.team} • ${player.year || year}`}
                right={() => (
                  <View style={styles.playerStats}>
                    {player.batting && (
                      <Paragraph style={styles.playerStatText}>
                        AVG: {player.batting.battingAverage || 'N/A'}
                      </Paragraph>
                    )}
                    {player.pitching && (
                      <Paragraph style={styles.playerStatText}>
                        ERA: {player.pitching.era || 'N/A'}
                      </Paragraph>
                    )}
                  </View>
                )}
                onPress={() => onPlayerPress(player)}
                style={styles.rosterItem}
              />
            ))}
            {roster.length > 10 && (
              <Button mode="outlined" style={styles.viewAllButton}>
                View All {roster.length} Players
              </Button>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Recent Games */}
      {recentGames.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Recent Games</Title>
            <Divider style={styles.divider} />
            {recentGames.slice(0, 5).map((game, index) => (
              <View key={index} style={styles.gameItem}>
                <View style={styles.gameHeader}>
                  <Paragraph style={styles.gameDate}>
                    {game.date || `Game ${index + 1}`}
                  </Paragraph>
                  <Paragraph style={styles.gameOpponent}>
                    vs {game.opponent || 'N/A'}
                  </Paragraph>
                </View>
                <View style={styles.gameStats}>
                  {game.result && (
                    <Chip 
                      style={[
                        styles.resultChip,
                        {backgroundColor: game.result === 'W' ? theme.colors.success : theme.colors.error}
                      ]}>
                      {game.result}
                    </Chip>
                  )}
                  {game.score && (
                    <Paragraph style={styles.gameScore}>
                      {game.score}
                    </Paragraph>
                  )}
                </View>
                {index < recentGames.slice(0, 5).length - 1 && (
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
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  teamDetails: {
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
  recordContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  recordItem: {
    alignItems: 'center',
  },
  recordNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  recordLabel: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 4,
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
    fontSize: 16,
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
  rosterItem: {
    paddingHorizontal: 0,
  },
  playerStats: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  playerStatText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  viewAllButton: {
    marginTop: 12,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultChip: {
    minWidth: 30,
  },
  gameScore: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  gameDivider: {
    marginTop: 8,
  },
});

export default TeamDetailScreen;
