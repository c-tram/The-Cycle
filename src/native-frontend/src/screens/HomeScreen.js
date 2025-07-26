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
  Button,
  ActivityIndicator,
  Chip,
  Divider,
} from 'react-native-paper';
import {showMessage} from 'react-native-flash-message';
import {apiService} from '../services/api';
import {theme} from '../theme/theme';

const HomeScreen = ({navigation}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [leadersData, setLeadersData] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch health status
      const [healthResponse, statsResponse, leadersResponse] = await Promise.all([
        apiService.getHealth(),
        apiService.getStatsSummary(),
        apiService.getLeaders({category: 'batting', stat: 'avg', limit: 5}),
      ]);

      setHealthData(healthResponse.data);
      setStatsData(statsResponse.data);
      setLeadersData(leadersResponse.data);

      showMessage({
        message: 'Data refreshed successfully!',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert(
        'Error',
        'Failed to load dashboard data. Please check your connection.',
        [{text: 'OK'}]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Paragraph style={styles.loadingText}>Loading dashboard...</Paragraph>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      
      {/* Welcome Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.welcomeTitle}>Welcome to The Cycle</Title>
          <Paragraph style={styles.welcomeText}>
            Your complete baseball statistics and analytics platform
          </Paragraph>
        </Card.Content>
      </Card>

      {/* System Health */}
      {healthData && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>System Status</Title>
            <View style={styles.healthContainer}>
              <Chip 
                icon="check-circle" 
                style={[styles.chip, {backgroundColor: theme.colors.success}]}
                textStyle={{color: 'white'}}>
                API: {healthData.status}
              </Chip>
              <Chip 
                icon="database" 
                style={[styles.chip, {backgroundColor: theme.colors.info}]}
                textStyle={{color: 'white'}}>
                Database: Connected
              </Chip>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Quick Stats */}
      {statsData && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Quick Stats</Title>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Paragraph style={styles.statNumber}>
                  {statsData.totalPlayers || 'N/A'}
                </Paragraph>
                <Paragraph style={styles.statLabel}>Players</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statNumber}>
                  {statsData.totalTeams || '30'}
                </Paragraph>
                <Paragraph style={styles.statLabel}>Teams</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statNumber}>
                  {statsData.totalGames || 'N/A'}
                </Paragraph>
                <Paragraph style={styles.statLabel}>Games</Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Top Performers */}
      {leadersData && leadersData.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Top Batting Averages</Title>
            <Divider style={styles.divider} />
            {leadersData.slice(0, 5).map((player, index) => (
              <View key={index} style={styles.leaderItem}>
                <Paragraph style={styles.leaderRank}>{index + 1}</Paragraph>
                <View style={styles.leaderInfo}>
                  <Paragraph style={styles.leaderName}>
                    {player.name}
                  </Paragraph>
                  <Paragraph style={styles.leaderTeam}>
                    {player.team}
                  </Paragraph>
                </View>
                <Paragraph style={styles.leaderStat}>
                  {player.value?.toFixed(3) || 'N/A'}
                </Paragraph>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Quick Navigation */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Explore</Title>
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              style={styles.navButton}
              onPress={() => navigation.navigate('Players')}>
              Browse Players
            </Button>
            <Button
              mode="contained"
              style={styles.navButton}
              onPress={() => navigation.navigate('Teams')}>
              View Teams
            </Button>
            <Button
              mode="contained"
              style={styles.navButton}
              onPress={() => navigation.navigate('Matchups')}>
              Team Matchups
            </Button>
            <Button
              mode="contained"
              style={styles.navButton}
              onPress={() => navigation.navigate('Stats')}>
              Leaderboards
            </Button>
          </View>
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
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  welcomeText: {
    textAlign: 'center',
    marginTop: 8,
    color: theme.colors.text,
  },
  healthContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  chip: {
    margin: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  leaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  leaderRank: {
    width: 30,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  leaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leaderName: {
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  leaderTeam: {
    fontSize: 12,
    color: theme.colors.placeholder,
  },
  leaderStat: {
    fontWeight: 'bold',
    color: theme.colors.primary,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 16,
  },
  navButton: {
    marginVertical: 4,
  },
});

export default HomeScreen;
