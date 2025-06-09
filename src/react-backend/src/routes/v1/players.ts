import { Router } from 'express';
import { mlbDataService } from '../../services/mlbDataService';

const router = Router();

// GET /api/v1/players
router.get('/', async (req, res) => {
  try {
    const { 
      team, 
      position, 
      search, 
      statType = 'hitting',
      limit = 50,
      offset = 0
    } = req.query;

    let players;

    if (search) {
      console.log(`Processing player search request: "${search}"`);
      players = await mlbDataService.searchPlayers(search as string);
    } else if (team) {
      console.log(`Getting players for team: "${team}"`);
      players = await mlbDataService.getPlayersByTeam(team as string);
    } else if (position) {
      console.log(`Getting players for position: "${position}"`);
      players = await mlbDataService.getPlayersByPosition(position as string);
    } else {
      throw new Error('At least one filter parameter is required');
    }

    // Apply pagination
    const totalCount = players.length;
    players = players.slice(Number(offset), Number(offset) + Number(limit));

    console.log(`Returning ${players.length} players (total: ${totalCount})`);
    // Return just the players array since that's what the frontend expects
    res.json(players);
  } catch (error: any) {
    console.error('Error in players route:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/v1/players/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await mlbDataService.getPlayerStats(id);
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching player stats:', error);
    res.status(404).json({ error: 'Player not found' });
  }
});

export default router;
