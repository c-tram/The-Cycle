"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mlbDataService_1 = require("../../services/mlbDataService");
const router = (0, express_1.Router)();
// GET /api/v1/players
router.get('/', async (req, res) => {
    try {
        const { team, position, search, statType = 'hitting', limit = 50, offset = 0 } = req.query;
        let players;
        if (search) {
            console.log(`Processing player search request: "${search}"`);
            players = await mlbDataService_1.mlbDataService.searchPlayers(search);
        }
        else if (team) {
            console.log(`Getting players for team: "${team}"`);
            players = await mlbDataService_1.mlbDataService.getPlayersByTeam(team);
        }
        else if (position) {
            console.log(`Getting players for position: "${position}"`);
            players = await mlbDataService_1.mlbDataService.getPlayersByPosition(position);
        }
        else {
            throw new Error('At least one filter parameter is required');
        }
        // Apply pagination
        const totalCount = players.length;
        players = players.slice(Number(offset), Number(offset) + Number(limit));
        console.log(`Returning ${players.length} players (total: ${totalCount})`);
        // Return just the players array since that's what the frontend expects
        res.json(players);
    }
    catch (error) {
        console.error('Error in players route:', error);
        res.status(400).json({ error: error.message });
    }
});
// GET /api/v1/players/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const stats = await mlbDataService_1.mlbDataService.getPlayerStats(id);
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching player stats:', error);
        res.status(404).json({ error: 'Player not found' });
    }
});
exports.default = router;
