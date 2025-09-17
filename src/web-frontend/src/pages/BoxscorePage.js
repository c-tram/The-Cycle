import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Skeleton,
  Alert,
  Button,
  Stack,
  useTheme
} from '@mui/material';
import { ArrowBack, SportsBaseball } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import Boxscore from '../components/Boxscore';
import { gamesApi } from '../services/apiService';

const BoxscorePage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { gameId, date } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to get the game from live MLB data first
        if (date) {
          const response = await fetch(`/api/v2/mlb-live/schedule/${date}`);
          const data = await response.json();
          
          const foundGame = data.games?.find(g => g.id.toString() === gameId);
          if (foundGame) {
            setGame(foundGame);
            setLoading(false);
            return;
          }
        }

        // Fallback to Redis cache for historical games
        const response = await gamesApi.getRecentGames({ limit: 100 });
        const foundGame = response.games?.find(g => g.id.toString() === gameId);
        
        if (foundGame) {
          setGame(foundGame);
        } else {
          setError('Game not found');
        }
      } catch (err) {
        console.error('Failed to fetch game:', err);
        setError('Failed to load game data');
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      fetchGame();
    }
  }, [gameId, date]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="rectangular" height={400} />
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            variant="outlined"
            sx={{ alignSelf: 'flex-start' }}
          >
            Back
          </Button>
          
          <Alert severity="error">
            {error}
          </Alert>
        </Stack>
      </Container>
    );
  }

  if (!game) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            variant="outlined"
            sx={{ alignSelf: 'flex-start' }}
          >
            Back
          </Button>
          
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <SportsBaseball sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom>
              Game Not Found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              The requested game could not be found.
            </Typography>
          </Box>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {/* Navigation */}
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          variant="outlined"
          sx={{ alignSelf: 'flex-start' }}
        >
          Back
        </Button>

        {/* Page Title */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <SportsBaseball color="primary" />
              <Typography variant="h4" fontWeight="bold">
                Game Boxscore
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Comprehensive game statistics and play-by-play analysis
            </Typography>
          </CardContent>
        </Card>

        {/* Boxscore Content - Display as expanded view */}
        <Box>
          <Boxscore 
            game={game}
            open={true}
            onClose={() => {}} // No close button on dedicated page
            embedded={true} // Flag to indicate this is embedded (could customize display)
          />
        </Box>
      </Stack>
    </Container>
  );
};

export default BoxscorePage;
