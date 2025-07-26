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
  Button,
} from 'react-native-paper';
import {showMessage} from 'react-native-flash-message';
import {apiService} from '../services/api';
import {theme} from '../theme/theme';

const PlayersScreen = ({navigation}) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const teams = ['NYY', 'BOS', 'TOR', 'TB', 'BAL', 'HOU', 'SEA', 'TEX', 'LAA', 'OAK'];

  const fetchPlayers = async (pageNum = 1, team = '', query = '') => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = {
        limit: 20,
        page: pageNum,
      };

      if (team) params.team = team;
      if (query) params.search = query;

      const response = await apiService.getPlayers(params);
      const newPlayers = response.data.players || response.data || [];

      if (pageNum === 1) {
        setPlayers(newPlayers);
      } else {
        setPlayers(prev => [...prev, ...newPlayers]);
      }

      showMessage({
        message: `Loaded ${newPlayers.length} players`,
        type: 'success',
        duration: 1500,
      });
    } catch (error) {
      console.error('Error fetching players:', error);
      Alert.alert(
        'Error',
        'Failed to load players. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPlayers(1, selectedTeam, searchQuery);
    setPage(1);
  }, [selectedTeam, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchPlayers(1, selectedTeam, searchQuery);
  };

  const loadMore = () => {
    if (!loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPlayers(nextPage, selectedTeam, searchQuery);
    }
  };

  const onPlayerPress = (player) => {
    navigation.navigate('PlayerDetail', {
      playerKey: player.key,
      playerName: player.name,
      team: player.team,
      year: player.year || '2025',
    });
  };

  const renderPlayer = ({item}) => (
    <Card style={styles.playerCard} onPress={() => onPlayerPress(item)}>
      <Card.Content>
        <View style={styles.playerHeader}>
          <View style={styles.playerInfo}>
            <Title style={styles.playerName}>{item.name}</Title>
            <Paragraph style={styles.playerTeam}>{item.team}</Paragraph>
          </View>
          <Chip style={styles.yearChip}>{item.year || '2025'}</Chip>
        </View>
        
        {item.stats && (
          <View style={styles.statsContainer}>
            {item.stats.batting && (
              <View style={styles.statGroup}>
                <Paragraph style={styles.statLabel}>Batting</Paragraph>
                <Paragraph style={styles.statValue}>
                  AVG: {item.stats.batting.battingAverage || 'N/A'}
                </Paragraph>
                {item.stats.batting.homeRuns !== undefined && (
                  <Paragraph style={styles.statValue}>
                    HR: {item.stats.batting.homeRuns}
                  </Paragraph>
                )}
                {item.stats.batting.rbi !== undefined && (
                  <Paragraph style={styles.statValue}>
                    RBI: {item.stats.batting.rbi}
                  </Paragraph>
                )}
              </View>
            )}
            
            {item.stats.pitching && (
              <View style={styles.statGroup}>
                <Paragraph style={styles.statLabel}>Pitching</Paragraph>
                <Paragraph style={styles.statValue}>
                  ERA: {item.stats.pitching.era || 'N/A'}
                </Paragraph>
                {item.stats.pitching.wins !== undefined && (
                  <Paragraph style={styles.statValue}>
                    W: {item.stats.pitching.wins}
                  </Paragraph>
                )}
                {item.stats.pitching.strikeOuts !== undefined && (
                  <Paragraph style={styles.statValue}>
                    K: {item.stats.pitching.strikeOuts}
                  </Paragraph>
                )}
              </View>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Paragraph style={styles.loadingText}>Loading players...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search players..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />
      
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', ...teams]}
          keyExtractor={(item) => item}
          renderItem={({item}) => (
            <Chip
              selected={item === 'All' ? !selectedTeam : selectedTeam === item}
              onPress={() => setSelectedTeam(item === 'All' ? '' : item)}
              style={styles.teamChip}>
              {item}
            </Chip>
          )}
          contentContainerStyle={styles.chipContainer}
        />
      </View>

      <FlatList
        data={players}
        renderItem={renderPlayer}
        keyExtractor={(item, index) => `${item.key || item.name}-${index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
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
  filtersContainer: {
    paddingBottom: 16,
  },
  chipContainer: {
    paddingHorizontal: 16,
  },
  teamChip: {
    marginRight: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  playerCard: {
    marginBottom: 12,
    elevation: 2,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  playerTeam: {
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
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default PlayersScreen;
