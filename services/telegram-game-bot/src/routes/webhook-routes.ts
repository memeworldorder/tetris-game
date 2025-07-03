import { Router, Request, Response } from 'express';
import WebhookService from '@/services/webhook-service';

const router = Router();
const webhookService = WebhookService.getInstance();

// Receive Telegram webhook
router.post('/telegram', async (req: Request, res: Response) => {
  try {
    // This would handle Telegram webhook updates
    // For now, just acknowledge receipt
    res.status(200).json({
      message: 'Telegram webhook received',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to process Telegram webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test webhook endpoint
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { url, event_type, test_data } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'URL is required for webhook test'
      });
    }

    // Send test webhook
    const success = await webhookService.sendWebhook(
      event_type || 'gameStart',
      test_data || { test: true, timestamp: new Date().toISOString() },
      url
    );

    res.json({
      success,
      message: success ? 'Test webhook sent successfully' : 'Test webhook failed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to send test webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get webhook statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await webhookService.getWebhookStats();
    res.json({
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch webhook stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Retry failed webhooks
router.post('/retry', async (req: Request, res: Response) => {
  try {
    await webhookService.retryFailedWebhooks();
    res.json({
      message: 'Failed webhooks retry initiated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retry webhooks',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clean up old webhook events
router.delete('/cleanup', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const cleaned = await webhookService.cleanupOldWebhooks(days);
    
    res.json({
      message: `Cleaned up ${cleaned} old webhook events`,
      days_kept: days,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to cleanup webhook events',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check for webhooks
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthy = await webhookService.healthCheck();
    
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      service: 'webhook-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Failed to check webhook health',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generic webhook receiver for external services
router.post('/receive/:service', async (req: Request, res: Response) => {
  try {
    const { service } = req.params;
    const payload = req.body;
    const signature = req.headers['x-webhook-signature'];
    
    // Log webhook receipt
    console.log(`Received webhook from ${service}:`, {
      timestamp: new Date().toISOString(),
      payload: payload,
      signature: signature
    });

    // This would process the webhook based on the service
    // For now, just acknowledge receipt
    res.status(200).json({
      message: `Webhook from ${service} received successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;