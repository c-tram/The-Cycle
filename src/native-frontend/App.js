import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {Provider as PaperProvider} from 'react-native-paper';
import FlashMessage from 'react-native-flash-message';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import PlayersScreen from './src/screens/PlayersScreen';
import PlayerDetailScreen from './src/screens/PlayerDetailScreen';
import TeamsScreen from './src/screens/TeamsScreen';
import TeamDetailScreen from './src/screens/TeamDetailScreen';
import MatchupsScreen from './src/screens/MatchupsScreen';
import LeaderboardsScreen from './src/screens/LeaderboardsScreen';
import StatsScreen from './src/screens/StatsScreen';

// Import theme
import {theme} from './src/theme/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack navigators for each tab
function PlayersStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: theme.colors.primary},
        headerTintColor: '#fff',
        headerTitleStyle: {fontWeight: 'bold'},
      }}>
      <Stack.Screen 
        name="PlayersList" 
        component={PlayersScreen} 
        options={{title: 'Players'}}
      />
      <Stack.Screen 
        name="PlayerDetail" 
        component={PlayerDetailScreen}
        options={({route}) => ({title: route.params?.playerName || 'Player'})}
      />
    </Stack.Navigator>
  );
}

function TeamsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: theme.colors.primary},
        headerTintColor: '#fff',
        headerTitleStyle: {fontWeight: 'bold'},
      }}>
      <Stack.Screen 
        name="TeamsList" 
        component={TeamsScreen} 
        options={{title: 'Teams'}}
      />
      <Stack.Screen 
        name="TeamDetail" 
        component={TeamDetailScreen}
        options={({route}) => ({title: route.params?.teamName || 'Team'})}
      />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: theme.colors.primary},
        headerTintColor: '#fff',
        headerTitleStyle: {fontWeight: 'bold'},
      }}>
      <Stack.Screen 
        name="Dashboard" 
        component={HomeScreen} 
        options={{title: 'The Cycle'}}
      />
    </Stack.Navigator>
  );
}

function MatchupsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: theme.colors.primary},
        headerTintColor: '#fff',
        headerTitleStyle: {fontWeight: 'bold'},
      }}>
      <Stack.Screen 
        name="MatchupsList" 
        component={MatchupsScreen} 
        options={{title: 'Matchups'}}
      />
    </Stack.Navigator>
  );
}

function StatsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: theme.colors.primary},
        headerTintColor: '#fff',
        headerTitleStyle: {fontWeight: 'bold'},
      }}>
      <Stack.Screen 
        name="StatsList" 
        component={StatsScreen} 
        options={{title: 'Stats & Leaders'}}
      />
      <Stack.Screen 
        name="Leaderboards" 
        component={LeaderboardsScreen} 
        options={{title: 'Leaderboards'}}
      />
    </Stack.Navigator>
  );
}

function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({route}) => ({
            tabBarIcon: ({focused, color, size}) => {
              let iconName;

              switch (route.name) {
                case 'Home':
                  iconName = 'home';
                  break;
                case 'Players':
                  iconName = 'person';
                  break;
                case 'Teams':
                  iconName = 'groups';
                  break;
                case 'Matchups':
                  iconName = 'compare-arrows';
                  break;
                case 'Stats':
                  iconName = 'analytics';
                  break;
                default:
                  iconName = 'home';
              }

              return <Icon name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: 'gray',
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopWidth: 1,
              borderTopColor: '#e0e0e0',
            },
          })}>
          <Tab.Screen name="Home" component={HomeStack} />
          <Tab.Screen name="Players" component={PlayersStack} />
          <Tab.Screen name="Teams" component={TeamsStack} />
          <Tab.Screen name="Matchups" component={MatchupsStack} />
          <Tab.Screen name="Stats" component={StatsStack} />
        </Tab.Navigator>
        <FlashMessage position="top" />
      </NavigationContainer>
    </PaperProvider>
  );
}

export default App;
