/**
 * HTTP-only integration tests for redux-unified
 */

import express from 'express';
import * as http from 'http';

class SimpleHttpServer {
  private server!: http.Server;
  private port: number = 0;

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const app = express();
      app.use(express.json());
      
      app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', '*');
        res.header('Access-Control-Allow-Headers', '*');
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
          return;
        }
        next();
      });

      app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
      });

      app.post('/echo', (req, res) => {
        res.json({
          method: req.method,
          path: req.path,
          body: req.body,
          timestamp: new Date().toISOString()
        });
      });

      this.server = http.createServer(app);
      
      this.server.listen(0, () => {
        const address = this.server.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
          resolve();
        } else {
          reject(new Error('Failed to get server address'));
        }
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  getUrl(): string {
    return `http://localhost:${this.port}`;
  }
}

let testServer: SimpleHttpServer;

beforeAll(async () => {
  testServer = new SimpleHttpServer();
  await testServer.start();
}, 30000);

afterAll(async () => {
  if (testServer) {
    await testServer.stop();
  }
}, 10000);

describe('Basic HTTP Tests', () => {
  test('HTTP server responds to health check', async () => {
    const response = await fetch(`${testServer.getUrl()}/health`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data).toMatchObject({ status: 'ok' });
  });

  test('HTTP server echoes POST data', async () => {
    const testData = { name: 'Test User' };
    
    const response = await fetch(`${testServer.getUrl()}/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.body).toEqual(testData);
  });
});

describe('Redux Unified Basic Tests', () => {
  test('can import modules', async () => {
    const sliceModule = await import('../slice');
    const middlewareModule = await import('../middleware');
    
    expect(sliceModule.createSlice).toBeDefined();
    expect(middlewareModule.getUnifiedMiddleware).toBeDefined();
  });

  test('can create basic slice', async () => {
    const { createSlice } = await import('../slice');
    
    const slice = createSlice({
      name: 'test',
      initialState: { value: 0 },
      reducers: {
        increment: (state: any) => {
          state.value += 1;
        }
      }
    });
    
    expect(slice.actions.increment).toBeDefined();
    expect(slice.reducer).toBeDefined();
  });

  test('can create store with middleware', async () => {
    const { configureStore } = await import('@reduxjs/toolkit');
    const { createSlice } = await import('../slice');
    const { getUnifiedMiddleware } = await import('../middleware');
    
    const slice = createSlice({
      name: 'test',
      initialState: { value: 0 },
      reducers: {
        increment: (state: any) => { state.value += 1; }
      }
    });
    
    const store = configureStore({
      reducer: { test: slice.reducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(getUnifiedMiddleware())
    });
    
    expect(store.getState()).toEqual({ test: { value: 0 } });
    store.dispatch(slice.actions.increment());
    expect(store.getState()).toEqual({ test: { value: 1 } });
  });
}); 