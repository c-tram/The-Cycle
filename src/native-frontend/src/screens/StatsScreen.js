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
  Button,
  Chip,
  Divider,
  List,
} from 'react-native-paper';
import {showMessage} from 'react-native-flash-message';
import {apiService} from '../services/api';
import {theme} from '../theme/theme';

const StatsScreen = ({navigation}) => {
  const [statsData, setStatsData] = useState(null);
  const [battingLeaders, setBattingLeaders] = useState([]);
  const [pitchingLeaders, setPitchingLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatsData = async () => {
    try {
      setLoading(true);
      
      const [
        statsResponse,
        battingAvgResponse,
        homeRunsResponse,
        eraResponse,
        winsResponse,
      ] = await Promise.all([
        apiService.getStatsSummary(),
        apiService.getLeaders({category: 'batting', stat: 'avg', limit: 5}),
        apiService.getLeaders({category: 'batting', stat: 'homeRuns', limit: 5}),
        apiService.getLeaders({category: 'pitching', stat: 'era', limit: 5}),
        apiService.getLeaders({category: 'pitching', stat: 'wins', limit: 5}),
      ]);

      setStatsData(statsResponse.data);
      setBattingLeaders([
        {name: 'Batting Average', data: battingAvgResponse.data || []},
        {name: 'Home Runs', data: homeRunsResponse.data || []},
      ]);
      setPitchingLeaders([
        {name: 'ERA', data: eraResponse.data || []},
        {name: 'Wins', data: winsResponse.data || []},
      ]);

      showMessage({
        message: 'Stats data loaded successfully!',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      Alert.alert(
        'Error',
        'Failed to load statistics. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatsData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStatsData();
  };

  const formatStatValue = (stat, value) => {
    if (stat === 'ERA' || stat === 'Batting Average') {
      return typeof value === 'number' ? value.toFixed(3) : value;
    }
    return value;
  };

  const renderLeaderItem = (leader, index, statName) => (
    <View key={index} style={styles.leaderItem}>
      <View style={styles.leaderRank}>
        <Paragraph style={styles.rankNumber}>{index + 1}</Paragraph>
      </View>
      <View style={styles.leaderInfo}>
        <Paragraph style={styles.leaderName}>{leader.name}</Paragraph>
        <Paragraph style={styles.leaderTeam}>{leader.team}</Paragraph>
      </View>
      <View style={styles.leaderStat}>
        <Paragraph style={styles.statValue}>
          {formatStatValue(statName, leader.value)}
        </Paragraph>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Paragraph style={styles.loadingText}>Loading statistics...</Paragraph>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      
      {/* Stats Overview */}
      {statsData && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>2025 Season Overview</Title>
            <View style={styles.overviewStats}>
              <View style={styles.overviewItem}>
                <Paragraph style={styles.overviewNumber}>
                  {statsData.totalPlayers || 'N/A'}
                </Paragraph>
                <Paragraph style={styles.overviewLabel}>Players</Paragraph>
              </View>
              <View style={styles.overviewItem}>
                <Paragraph style={styles.overviewNumber}>
                  {statsData.totalTeams || '30'}
                </Paragraph>
                <Paragraph style={styles.overviewLabel}>Teams</Paragraph>
              </View>
              <View style={styles.overviewItem}>
                <Paragraph style={styles.overviewNumber}>
                  {statsData.totalGames || 'N/A'}
                </Paragraph>
                <Paragraph style={styles.overviewLabel}>Games</Paragraph>
              </View>
            </View>
            
            {statsData.lastUpdated && (
              <Paragraph style={styles.lastUpdated}>
                Last updated: {new Date(statsData.lastUpdated).toLocaleDateString()}
              </Paragraph>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Quick Leaders */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title>League Leaders</Title>
            <Button
              mode="outlined"
              compact
              onPress={() => navigation.navigate('Leaderboards')}>
              View All
            </Button>
          </View>
          <Divider style={styles.divider} />
          
          {/* Batting Leaders */}
          {battingLeaders.map((category, categoryIndex) => (
            <View key={categoryIndex} style={styles.categoryContainer}>
              <View style={styles.categoryHeader}>
                <Paragraph style={styles.categoryTitle}>{category.name}</Paragraph>
                <Chip style={styles.categoryChip}>Batting</Chip>
              </View>
              {category.data.slice(0, 3).map((leader, index) =>
                renderLeaderItem(leader, index, category.name)
              )}
              {categoryIndex < battingLeaders.length - 1 && (
                <Divider style={styles.categoryDivider} />
              )}
            </View>
          ))}
          
          <Divider style={styles.majorDivider} />
          
          {/* Pitching Leaders */}
          {pitchingLeaders.map((category, categoryIndex) => (
            <View key={categoryIndex} style={styles.categoryContainer}>
              <View style={styles.categoryHeader}>
                <Paragraph style={styles.categoryTitle}>{category.name}</Paragraph>
                <Chip style={styles.pitchingChip}>Pitching</Chip>
              </View>
              {category.data.slice(0, 3).map((leader, index) =>
                renderLeaderItem(leader, index, category.name)
              )}
              {categoryIndex < pitchingLeaders.length - 1 && (
                <Divider style={styles.categoryDivider} />
              )}
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Statistical Categories */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Statistical Categories</Title>
          <Paragraph style={styles.sectionDescription}>
            Explore detailed leaderboards by category
          </Paragraph>
          <Divider style={styles.divider} />
          
          <List.Item
            title="Batting Statistics"
            description="Average, Home Runs, RBI, Runs, Hits"
            left={() => <List.Icon icon="baseball-bat" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => navigation.navigate('Leaderboards', {category: 'batting'})}
          />
          <Divider />
          <List.Item
            title="Pitching Statistics"
            description="ERA, Wins, Strikeouts, Saves"
            left={() => <List.Icon icon="baseball" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => navigation.navigate('Leaderboards', {category: 'pitching'})}
          />
          <Divider />
          <List.Item
            title="Team Statistics"
            description="Team batting and pitching averages"
            left={() => <List.Icon icon="account-group" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => navigation.navigate('Leaderboards', {category: 'teams'})}
          />
        </Card.Content>
      </Card>

      {/* Search Statistics */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Search Players & Stats</Title>
          <Paragraph style={styles.sectionDescription}>
            Find specific players or search by performance criteria
          </Paragraph>
          <View style={styles.searchButtons}>
            <Button
              mode="contained"
              style={styles.searchButton}
              onPress={() => navigation.navigate('Players')}>
              Browse Players
            </Button>
            <Button
              mode="outlined"
              style={styles.searchButton}
              onPress={() => navigation.navigate('Teams')}>
              Browse Teams
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Recent Performance */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Performance Insights</Title>
          <Paragraph style={styles.sectionDescription}>
            Key trends and notable performances this season
          </Paragraph>
          <Divider style={styles.divider} />
          
          <List.Item
            title="Hot Players"
            description="Players with exceptional recent performance"
            left={() => <List.Icon icon="trending-up" />}
            right={() => <List.Icon icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Team Matchups"
            description="Head-to-head team comparisons"
            left={() => <List.Icon icon="compare-arrows" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => navigation.navigate('Matchups')}
          />
          <Divider />
          <List.Item
            title="Statistical Milestones"
            description="Players approaching career milestones"
            left={() => <List.Icon icon="trophy" />}
            right={() => <List.Icon icon="chevron-right" />}
          />
        </Card.Content>
      </Card>
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
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionDescription: {
    color: theme.colors.placeholder,
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  majorDivider: {
    marginVertical: 16,
    backgroundColor: theme.colors.primary,
    height: 2,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  overviewItem: {
    alignItems: 'center',
  },
  overviewNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  overviewLabel: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: theme.colors.placeholder,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  categoryContainer: {
    marginVertical: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  categoryChip: {
    backgroundColor: theme.colors.success,
  },
  pitchingChip: {
    backgroundColor: theme.colors.info,
  },
  categoryDivider: {
    marginTop: 12,
  },
  leaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  leaderRank: {
    width: 30,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  leaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leaderName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  leaderTeam: {
    fontSize: 12,
    color: theme.colors.placeholder,
  },
  leaderStat: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  searchButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  searchButton: {
    flex: 1,
  },
});

export default StatsScreen;
