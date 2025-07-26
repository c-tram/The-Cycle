import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Chip,
  Button,
  List,
  Divider,
} from 'react-native-paper';
import {showMessage} from 'react-native-flash-message';
import {apiService} from '../services/api';
import {theme} from '../theme/theme';

const MatchupsScreen = ({navigation}) => {
  const [playerMatchups, setPlayerMatchups] = useState([]);
  const [teamMatchups, setTeamMatchups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' or 'players'

  const fetchMatchupsData = async () => {
    try {
      setLoading(true);
      
      const [teamMatchupsResponse, playerMatchupsResponse] = await Promise.all([
        apiService.getTeamMatchups({limit: 20}),
        apiService.getPlayerMatchups({limit: 20}),
      ]);

      setTeamMatchups(teamMatchupsResponse.data.matchups || teamMatchupsResponse.data || []);
      setPlayerMatchups(playerMatchupsResponse.data.matchups || playerMatchupsResponse.data || []);

      showMessage({
        message: 'Matchups data loaded successfully!',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error fetching matchups:', error);
      Alert.alert(
        'Error',
        'Failed to load matchups data. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatchupsData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatchupsData();
  };

  const onTeamMatchupPress = async (matchup) => {
    try {
      const [team1, team2] = matchup.teams || matchup.matchup?.split(' vs ') || ['', ''];
      if (team1 && team2) {
        const response = await apiService.getTeamVsTeamGames(team1, team2, {limit: 10});
        const games = response.data.games || response.data || [];
        
        navigation.navigate('MatchupDetail', {
          team1,
          team2,
          games,
          matchupData: matchup,
        });
      }
    } catch (error) {
      console.error('Error fetching team matchup games:', error);
      Alert.alert('Error', 'Failed to load matchup details.');
    }
  };

  const renderTeamMatchup = (matchup, index) => (
    <Card key={index} style={styles.matchupCard} onPress={() => onTeamMatchupPress(matchup)}>
      <Card.Content>
        <View style={styles.matchupHeader}>
          <Title style={styles.matchupTitle}>
            {matchup.team1 || matchup.teams?.[0] || 'Team 1'} vs{' '}
            {matchup.team2 || matchup.teams?.[1] || 'Team 2'}
          </Title>
          <Chip style={styles.gamesChip}>
            {matchup.gamesPlayed || matchup.games || 0} games
          </Chip>
        </View>
        
        {matchup.stats && (
          <View style={styles.matchupStats}>
            <View style={styles.teamStats}>
              <Paragraph style={styles.teamLabel}>
                {matchup.team1 || matchup.teams?.[0]}
              </Paragraph>
              {matchup.stats.team1 && (
                <View>
                  <Paragraph style={styles.statText}>
                    AVG: {matchup.stats.team1.batting?.battingAverage || 'N/A'}
                  </Paragraph>
                  <Paragraph style={styles.statText}>
                    ERA: {matchup.stats.team1.pitching?.era || 'N/A'}
                  </Paragraph>
                </View>
              )}
            </View>
            
            <View style={styles.vsContainer}>
              <Paragraph style={styles.vsText}>VS</Paragraph>
            </View>
            
            <View style={styles.teamStats}>
              <Paragraph style={styles.teamLabel}>
                {matchup.team2 || matchup.teams?.[1]}
              </Paragraph>
              {matchup.stats.team2 && (
                <View>
                  <Paragraph style={styles.statText}>
                    AVG: {matchup.stats.team2.batting?.battingAverage || 'N/A'}
                  </Paragraph>
                  <Paragraph style={styles.statText}>
                    ERA: {matchup.stats.team2.pitching?.era || 'N/A'}
                  </Paragraph>
                </View>
              )}
            </View>
          </View>
        )}

        {matchup.record && (
          <View style={styles.recordContainer}>
            <Paragraph style={styles.recordText}>
              Series Record: {matchup.record.team1Wins || 0}-{matchup.record.team2Wins || 0}
            </Paragraph>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderPlayerMatchup = (matchup, index) => (
    <List.Item
      key={index}
      title={`${matchup.player || 'Player'} vs ${matchup.opponent || 'Team'}`}
      description={`${matchup.gamesPlayed || 0} games played`}
      right={() => (
        <View style={styles.playerMatchupStats}>
          {matchup.stats?.batting && (
            <Paragraph style={styles.statText}>
              AVG: {matchup.stats.batting.battingAverage || 'N/A'}
            </Paragraph>
          )}
          {matchup.stats?.pitching && (
            <Paragraph style={styles.statText}>
              ERA: {matchup.stats.pitching.era || 'N/A'}
            </Paragraph>
          )}
        </View>
      )}
      style={styles.playerMatchupItem}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Paragraph style={styles.loadingText}>Loading matchups...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Selection */}
      <View style={styles.tabContainer}>
        <Button
          mode={activeTab === 'teams' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('teams')}
          style={styles.tabButton}>
          Team Matchups
        </Button>
        <Button
          mode={activeTab === 'players' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('players')}
          style={styles.tabButton}>
          Player Matchups
        </Button>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        
        {activeTab === 'teams' && (
          <View style={styles.matchupsContainer}>
            <Title style={styles.sectionTitle}>Team vs Team Matchups</Title>
            <Paragraph style={styles.sectionDescription}>
              Head-to-head statistics between teams in {new Date().getFullYear()}
            </Paragraph>
            
            {teamMatchups.length > 0 ? (
              teamMatchups.map((matchup, index) => renderTeamMatchup(matchup, index))
            ) : (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Paragraph style={styles.emptyText}>
                    No team matchups available
                  </Paragraph>
                </Card.Content>
              </Card>
            )}
          </View>
        )}

        {activeTab === 'players' && (
          <View style={styles.matchupsContainer}>
            <Title style={styles.sectionTitle}>Player vs Team Matchups</Title>
            <Paragraph style={styles.sectionDescription}>
              Individual player performance against specific teams
            </Paragraph>
            
            <Card style={styles.card}>
              <Card.Content>
                {playerMatchups.length > 0 ? (
                  playerMatchups.map((matchup, index) => (
                    <View key={index}>
                      {renderPlayerMatchup(matchup, index)}
                      {index < playerMatchups.length - 1 && <Divider />}
                    </View>
                  ))
                ) : (
                  <Paragraph style={styles.emptyText}>
                    No player matchups available
                  </Paragraph>
                )}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Featured Matchups */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Featured Matchups</Title>
            <Paragraph style={styles.featuredDescription}>
              Explore classic rivalries and interesting statistical matchups
            </Paragraph>
            <Divider style={styles.divider} />
            
            <List.Item
              title="Yankees vs Red Sox"
              description="The ultimate rivalry"
              left={() => <List.Icon icon="star" />}
              onPress={() => onTeamMatchupPress({team1: 'NYY', team2: 'BOS'})}
            />
            <Divider />
            <List.Item
              title="Dodgers vs Giants"
              description="West Coast classic"
              left={() => <List.Icon icon="star" />}
              onPress={() => onTeamMatchupPress({team1: 'LAD', team2: 'SF'})}
            />
            <Divider />
            <List.Item
              title="Cubs vs Cardinals"
              description="Central division rivals"
              left={() => <List.Icon icon="star" />}
              onPress={() => onTeamMatchupPress({team1: 'CHC', team2: 'STL'})}
            />
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  matchupsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    color: theme.colors.placeholder,
    marginBottom: 16,
  },
  matchupCard: {
    marginBottom: 12,
    elevation: 2,
  },
  matchupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  matchupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  gamesChip: {
    backgroundColor: theme.colors.accent,
    marginLeft: 8,
  },
  matchupStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamStats: {
    flex: 1,
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  vsContainer: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.placeholder,
  },
  statText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  recordContainer: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  recordText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  playerMatchupItem: {
    paddingHorizontal: 0,
  },
  playerMatchupStats: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  emptyCard: {
    elevation: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.placeholder,
    fontStyle: 'italic',
  },
  featuredDescription: {
    color: theme.colors.placeholder,
    fontSize: 14,
  },
  divider: {
    marginVertical: 12,
  },
});

export default MatchupsScreen;
