import { Router, Request, Response } from 'express';
import GameService from '@/services/game-service';
import { GameCreationRequest, PlayerJoinRequest, NumberSelectionRequest } from '@/models/types';

const router = Router();
const gameService = new GameService();

// Get all active games
router.get('/', async (req: Request, res: Response) => {
  try {
    // This would be implemented to get active games from database
    res.json({
      games: [],
      message: 'Active games endpoint - implementation coming soon'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch games',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific game by ID
router.get('/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const game = await gameService.getGame(gameId);
    
    if (!game) {
      return res.status(404).json({
        error: 'Game not found',
        message: `Game with ID ${gameId} does not exist`
      });
    }

    res.json({ game });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch game',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new game
router.post('/', async (req: Request, res: Response) => {
  try {
    const gameRequest: GameCreationRequest = req.body;
    const createdBy = req.headers['x-user-id'] as string || 'system';
    
    // Basic validation
    if (!gameRequest.type || !gameRequest.title || !gameRequest.chatId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Missing required fields: type, title, chatId'
      });
    }

    const game = await gameService.createGame(gameRequest, createdBy);
    
    res.status(201).json({
      game,
      message: 'Game created successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create game',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Join a game
router.post('/:gameId/join', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const joinRequest: PlayerJoinRequest = {
      gameId,
      ...req.body
    };

    // Basic validation
    if (!joinRequest.telegramUserId || !joinRequest.displayName) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Missing required fields: telegramUserId, displayName'
      });
    }

    const result = await gameService.joinGame(joinRequest);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        participant: result.participant
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to join game',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Select a number in a game
router.post('/:gameId/select-number', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const selectionRequest: NumberSelectionRequest = {
      gameId,
      ...req.body
    };

    // Basic validation
    if (!selectionRequest.playerId || typeof selectionRequest.number !== 'number') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Missing required fields: playerId, number'
      });
    }

    const result = await gameService.selectNumber(selectionRequest);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to select number',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get game participants
router.get('/:gameId/participants', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    
    // This would be implemented to get game participants
    res.json({
      participants: [],
      message: 'Game participants endpoint - implementation coming soon'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch participants',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get game history/events
router.get('/:gameId/history', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    
    // This would be implemented to get game history
    res.json({
      history: [],
      message: 'Game history endpoint - implementation coming soon'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch game history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cancel a game (admin only)
router.delete('/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const reason = req.body.reason || 'Cancelled by admin';

    // This would check admin permissions
    // For now, just return not implemented
    res.status(501).json({
      message: 'Game cancellation endpoint - implementation coming soon'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to cancel game',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;