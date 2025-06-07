/**
 * Test servers for integration testing redux-unified
 * Provides tiny HTTP and WebSocket servers that echo back messages
 */

import * as http from 'http';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import express, { Request, Response, NextFunction } from 'express';

interface TestServers {
  httpServer: http.Server;
  wsServer: WebSocket.Server;
  httpPort: number;
  wsPort: number;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class TestServerManager implements TestServers {
  httpServer!: http.Server;
  wsServer!: WebSocket.Server;
  httpPort: number = 0;
  wsPort: number = 0;

  async start(): Promise<void> {
    await Promise.all([
      this.startHttpServer(),
      this.startWebSocketServer()
    ]);
  }

  async stop(): Promise<void> {
    await Promise.all([
      this.stopHttpServer(),
      this.stopWebSocketServer()
    ]);
  }

  private async startHttpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const app = express();
      
      // Enable CORS for all routes
      app.use((req: Request, res: Response, next: NextFunction) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
          return;
        }
        next();
      });

      // Parse JSON bodies
      app.use(express.json());

      // Echo endpoint - returns the request data
      app.all('/echo', (req, res) => {
        const response = {
          method: req.method,
          path: req.path,
          query: req.query,
          headers: req.headers,
          body: req.body,
          timestamp: new Date().toISOString()
        };
        res.json(response);
      });

      // Users endpoint for testing
      app.get('/users/profile', (req, res) => {
        res.json({
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          timestamp: new Date().toISOString()
        });
      });

      app.post('/users', (req, res) => {
        res.status(201).json({
          id: Date.now(),
          ...req.body,
          created: new Date().toISOString()
        });
      });

      // Generic endpoint that echoes back data with status
      app.all('/api/*', (req, res) => {
        const path = req.path.replace('/api/', '');
        res.json({
          path,
          method: req.method,
          data: req.body || req.query,
          timestamp: new Date().toISOString()
        });
      });

      // Error endpoint for testing error handling
      app.all('/error', (req, res) => {
        res.status(500).json({
          error: 'Test error',
          message: 'This is a test error response'
        });
      });

      // Health check
      app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
      });

      this.httpServer = http.createServer(app);
      
      this.httpServer.listen(0, () => {
        const address = this.httpServer.address();
        if (address && typeof address === 'object') {
          this.httpPort = address.port;
          console.log(`Test HTTP server started on port ${this.httpPort}`);
          resolve();
        } else {
          reject(new Error('Failed to get HTTP server address'));
        }
      });

      this.httpServer.on('error', reject);
    });
  }

  private async startWebSocketServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create a separate HTTP server for WebSocket
      const wsHttpServer = http.createServer();
      
      this.wsServer = new WebSocket.Server({ 
        server: wsHttpServer,
        path: '/ws'
      });

      this.wsServer.on('connection', (ws, req) => {
        console.log('WebSocket client connected');

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'welcome',
          message: 'Connected to test WebSocket server',
          timestamp: new Date().toISOString()
        }));

        // Echo back any received messages
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            // Echo the message back with additional metadata
            const response = {
              type: 'echo',
              original: message,
              timestamp: new Date().toISOString(),
              clientCount: this.wsServer.clients.size
            };

            ws.send(JSON.stringify(response));
          } catch (error) {
            // If not JSON, echo as plain text
            ws.send(JSON.stringify({
              type: 'echo',
              message: data.toString(),
              timestamp: new Date().toISOString()
            }));
          }
        });

        ws.on('close', () => {
          console.log('WebSocket client disconnected');
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
        });
      });

      wsHttpServer.listen(0, () => {
        const address = wsHttpServer.address();
        if (address && typeof address === 'object') {
          this.wsPort = address.port;
          console.log(`Test WebSocket server started on port ${this.wsPort}`);
          resolve();
        } else {
          reject(new Error('Failed to get WebSocket server address'));
        }
      });

      wsHttpServer.on('error', reject);
    });
  }

  private async stopHttpServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => {
          console.log('Test HTTP server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private async stopWebSocketServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wsServer) {
        this.wsServer.close(() => {
          console.log('Test WebSocket server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getHttpUrl(): string {
    return `http://localhost:${this.httpPort}`;
  }

  getWebSocketUrl(): string {
    return `ws://localhost:${this.wsPort}/ws`;
  }
}

// Global test server instance
let globalTestServers: TestServerManager | null = null;

export async function setupTestServers(): Promise<TestServerManager> {
  if (!globalTestServers) {
    globalTestServers = new TestServerManager();
    await globalTestServers.start();
  }
  return globalTestServers;
}

export async function teardownTestServers(): Promise<void> {
  if (globalTestServers) {
    await globalTestServers.stop();
    globalTestServers = null;
  }
}

export function getTestServers(): TestServerManager | null {
  return globalTestServers;
} 