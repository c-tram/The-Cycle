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
  Button,
  Chip,
  Divider,
  SegmentedButtons,
} from 'react-native-paper';
import {showMessage} from 'react-native-flash-message';
import {apiService} from '../services/api';
import {theme} from '../theme/theme';

const LeaderboardsScreen = ({route}) => {
  const initialCategory = route?.params?.category || 'batting';
  
  const [leaderboards, setLeaderboards] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState(initialCategory);
  const [statType, setStatType] = useState('avg');

  const statOptions = {
    batting: [
      {value: 'avg', label: 'Batting Average'},
      {value: 'homeRuns', label: 'Home Runs'},
      {value: 'rbi', label: 'RBI'},
      {value: 'runs', label: 'Runs'},
      {value: 'hits', label: 'Hits'},
    ],
    pitching: [
      {value: 'era', label: 'ERA'},
      {value: 'wins', label: 'Wins'},
      {value: 'strikeouts', label: 'Strikeouts'},
      {value: 'saves', label: 'Saves'},
    ],
  };

  const fetchLeaderboards = async (cat = category, stat = statType) => {
    try {
      setLoading(true);
      
      const response = await apiService.getLeaders({
        category: cat,
        stat: stat,
        limit: 50,
      });

      setLeaderboards(prev => ({
        ...prev,
        [`${cat}-${stat}`]: response.data || [],
      }));

      showMessage({
        message: `${cat} ${stat} leaderboard loaded!`,
        type: 'success',
        duration: 1500,
      });
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
      Alert.alert(
        'Error',
        'Failed to load leaderboard. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboards();
  }, [category, statType]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboards();
  };

  const formatStatValue = (stat, value) => {
    if (stat === 'era' || stat === 'avg') {
      return typeof value === 'number' ? value.toFixed(3) : value;
    }
    return value?.toString() || 'N/A';
  };

  const getStatUnit = (stat) => {
    switch (stat) {
      case 'era':
        return 'ERA';
      case 'avg':
        return 'AVG';
      default:
        return '';
    }
  };

  const currentLeaderboard = leaderboards[`${category}-${statType}`] || [];

  const renderLeaderItem = ({item, index}) => (
    <Card style={styles.leaderCard}>
      <Card.Content>
        <View style={styles.leaderRow}>
          <View style={styles.rankContainer}>
            <Paragraph style={[
              styles.rank,
              index < 3 && styles.topThreeRank
            ]}>
              {index + 1}
            </Paragraph>
            {index < 3 && (
              <View style={[
                styles.medal,
                index === 0 && styles.goldMedal,
                index === 1 && styles.silverMedal,
                index === 2 && styles.bronzeMedal,
              ]} />
            )}
          </View>
          
          <View style={styles.playerInfo}>
            <Paragraph style={styles.playerName}>{item.name}</Paragraph>
            <View style={styles.playerDetails}>
              <Chip style={styles.teamChip} compact>
                {item.team}
              </Chip>
              <Paragraph style={styles.year}>
                {item.year || '2025'}
              </Paragraph>
            </View>
          </View>
          
          <View style={styles.statContainer}>
            <Paragraph style={styles.statValue}>
              {formatStatValue(statType, item.value)}
            </Paragraph>
            <Paragraph style={styles.statUnit}>
              {getStatUnit(statType)}
            </Paragraph>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Paragraph style={styles.emptyText}>
        No leaderboard data available for {category} {statType}
      </Paragraph>
      <Button mode="outlined" onPress={() => fetchLeaderboards()}>
        Retry
      </Button>
    </View>
  );

  if (loading && Object.keys(leaderboards).length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Paragraph style={styles.loadingText}>Loading leaderboards...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Category Selection */}
      <View style={styles.categoryContainer}>
        <SegmentedButtons
          value={category}
          onValueChange={setCategory}
          buttons={[
            {value: 'batting', label: 'Batting'},
            {value: 'pitching', label: 'Pitching'},
          ]}
        />
      </View>

      {/* Stat Type Selection */}
      <View style={styles.statTypeContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statOptions[category] || []}
          keyExtractor={(item) => item.value}
          renderItem={({item}) => (
            <Button
              mode={statType === item.value ? 'contained' : 'outlined'}
              onPress={() => setStatType(item.value)}
              style={styles.statButton}
              compact>
              {item.label}
            </Button>
          )}
          contentContainerStyle={styles.statButtonContainer}
        />
      </View>

      {/* Leaderboard Header */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerContent}>
            <View>
              <Title style={styles.leaderboardTitle}>
                {statOptions[category]?.find(s => s.value === statType)?.label || statType}
              </Title>
              <Paragraph style={styles.leaderboardSubtitle}>
                2025 Season Leaders
              </Paragraph>
            </View>
            {currentLeaderboard.length > 0 && (
              <Chip style={styles.countChip}>
                {currentLeaderboard.length} players
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Leaderboard List */}
      <FlatList
        data={currentLeaderboard}
        renderItem={renderLeaderItem}
        keyExtractor={(item, index) => `${item.key || item.name}-${index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  categoryContainer: {
    padding: 16,
  },
  statTypeContainer: {
    paddingBottom: 16,
  },
  statButtonContainer: {
    paddingHorizontal: 16,
  },
  statButton: {
    marginRight: 8,
  },
  headerCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  leaderboardSubtitle: {
    color: theme.colors.placeholder,
    fontSize: 14,
  },
  countChip: {
    backgroundColor: theme.colors.accent,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  leaderCard: {
    elevation: 1,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    position: 'relative',
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  topThreeRank: {
    color: theme.colors.primary,
    fontSize: 20,
  },
  medal: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  goldMedal: {
    backgroundColor: '#FFD700',
  },
  silverMedal: {
    backgroundColor: '#C0C0C0',
  },
  bronzeMedal: {
    backgroundColor: '#CD7F32',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  playerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  teamChip: {
    backgroundColor: theme.colors.primary,
    marginRight: 8,
  },
  year: {
    fontSize: 12,
    color: theme.colors.placeholder,
  },
  statContainer: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statUnit: {
    fontSize: 12,
    color: theme.colors.placeholder,
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.placeholder,
    marginBottom: 16,
  },
});

export default LeaderboardsScreen;
