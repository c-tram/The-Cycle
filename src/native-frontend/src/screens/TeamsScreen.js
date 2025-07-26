import React, {useState, useEffect} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Searchbar,
  Chip,
} from 'react-native-paper';
import {showMessage} from 'react-native-flash-message';
import {apiService} from '../services/api';
import {theme} from '../theme/theme';

const TeamsScreen = ({navigation}) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTeams = async () => {
    try {
      setLoading(true);
      
      const params = {
        limit: 50,
      };

      if (searchQuery) params.search = searchQuery;

      const response = await apiService.getTeams(params);
      const teamsData = response.data.teams || response.data || [];
      
      setTeams(teamsData);

      showMessage({
        message: `Loaded ${teamsData.length} teams`,
        type: 'success',
        duration: 1500,
      });
    } catch (error) {
      console.error('Error fetching teams:', error);
      Alert.alert(
        'Error',
        'Failed to load teams. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeams();
  };

  const onTeamPress = (team) => {
    navigation.navigate('TeamDetail', {
      teamId: team.team || team.abbreviation,
      teamName: team.name || team.team,
      year: team.year || '2025',
    });
  };

  const renderTeam = ({item}) => (
    <Card style={styles.teamCard} onPress={() => onTeamPress(item)}>
      <Card.Content>
        <View style={styles.teamHeader}>
          <View style={styles.teamInfo}>
            <Title style={styles.teamName}>
              {item.name || item.team || item.abbreviation}
            </Title>
            <Paragraph style={styles.teamAbbr}>
              {item.abbreviation || item.team}
            </Paragraph>
          </View>
          <Chip style={styles.yearChip}>{item.year || '2025'}</Chip>
        </View>
        
        {item.stats && (
          <View style={styles.statsContainer}>
            {item.stats.batting && (
              <View style={styles.statGroup}>
                <Paragraph style={styles.statLabel}>Team Batting</Paragraph>
                <Paragraph style={styles.statValue}>
                  AVG: {item.stats.batting.battingAverage || 'N/A'}
                </Paragraph>
                <Paragraph style={styles.statValue}>
                  HR: {item.stats.batting.homeRuns || 0}
                </Paragraph>
                <Paragraph style={styles.statValue}>
                  RBI: {item.stats.batting.rbi || 0}
                </Paragraph>
              </View>
            )}
            
            {item.stats.pitching && (
              <View style={styles.statGroup}>
                <Paragraph style={styles.statLabel}>Team Pitching</Paragraph>
                <Paragraph style={styles.statValue}>
                  ERA: {item.stats.pitching.era || 'N/A'}
                </Paragraph>
                <Paragraph style={styles.statValue}>
                  W: {item.stats.pitching.wins || 0}
                </Paragraph>
                <Paragraph style={styles.statValue}>
                  K: {item.stats.pitching.strikeOuts || 0}
                </Paragraph>
              </View>
            )}
          </View>
        )}

        {item.record && (
          <View style={styles.recordContainer}>
            <Paragraph style={styles.recordText}>
              Record: {item.record.wins || 0}-{item.record.losses || 0}
              {item.record.winPercentage && (
                ` (${(item.record.winPercentage * 100).toFixed(1)}%)`
              )}
            </Paragraph>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Paragraph style={styles.loadingText}>Loading teams...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search teams..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      <FlatList
        data={teams}
        renderItem={renderTeam}
        keyExtractor={(item, index) => `${item.team || item.abbreviation}-${index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
  searchbar: {
    margin: 16,
    elevation: 2,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  teamCard: {
    marginBottom: 12,
    elevation: 2,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  teamAbbr: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  yearChip: {
    backgroundColor: theme.colors.accent,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statGroup: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statValue: {
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
});

export default TeamsScreen;
