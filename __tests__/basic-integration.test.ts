/**
 * Basic integration tests for redux-unified
 * Tests core functionality without complex middleware setup
 */

import { configureStore } from '@reduxjs/toolkit';
import { TestServerManager } from './test-servers';

// Global test servers
let testServers: TestServerManager;

beforeAll(async () => {
  testServers = new TestServerManager();
  await testServers.start();
  console.log(`Test servers started - HTTP: ${testServers.getHttpUrl()}, WS: ${testServers.getWebSocketUrl()}`);
}, 30000);

afterAll(async () => {
  if (testServers) {
    await testServers.stop();
  }
}, 10000);

describe('Test Servers Validation', () => {
  test('HTTP server should be running and responding', async () => {
    const response = await fetch(`${testServers.getHttpUrl()}/health`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data).toMatchObject({
      status: 'ok'
    });
    expect(data.timestamp).toBeDefined();
  });

  test('HTTP server should echo POST requests', async () => {
    const testData = { name: 'Test User', email: 'test@example.com' };
    
    const response = await fetch(`${testServers.getHttpUrl()}/echo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data).toMatchObject({
      method: 'POST',
      path: '/echo',
      body: testData
    });
  });

  test('HTTP server should return error responses', async () => {
    const response = await fetch(`${testServers.getHttpUrl()}/error`);
    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data).toMatchObject({
      error: 'Test error',
      message: 'This is a test error response'
    });
  });

  test('WebSocket server should be accessible', async () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(testServers.getWebSocketUrl());
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve(undefined);
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  });

  test('WebSocket server should echo messages', async () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(testServers.getWebSocketUrl());
      const testMessage = { type: 'test', content: 'Hello WebSocket' };
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket message timeout'));
      }, 5000);
      
      ws.onopen = () => {
        // Send test message
        ws.send(JSON.stringify(testMessage));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Skip welcome message, wait for echo
          if (data.type === 'echo') {
            clearTimeout(timeout);
            expect(data.original).toEqual(testMessage);
            expect(data.timestamp).toBeDefined();
            ws.close();
            resolve(undefined);
          }
        } catch (error) {
          clearTimeout(timeout);
          ws.close();
          reject(error);
        }
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  });
});

describe('Redux Unified Basic Tests', () => {
  test('should be able to import main modules', async () => {
    // Test that we can import the main modules without errors
    const sliceModule = await import('../slice');
    const middlewareModule = await import('../middleware');
    
    expect(sliceModule.createSlice).toBeDefined();
    expect(middlewareModule.getUnifiedMiddleware).toBeDefined();
  });

  test('should be able to create a basic slice', async () => {
    const { createSlice } = await import('../slice');
    
    const testSlice = createSlice({
      name: 'test',
      initialState: { value: 0 },
      reducers: {
        increment: (state) => {
          (state as any).value += 1;
        }
      }
    });
    
    expect(testSlice.actions.increment).toBeDefined();
    expect(testSlice.reducer).toBeDefined();
  });

  test('should be able to create a store with unified middleware', async () => {
    const { createSlice } = await import('../slice');
    const { getUnifiedMiddleware } = await import('../middleware');
    
    const testSlice = createSlice({
      name: 'test',
      initialState: { value: 0 },
      reducers: {
        increment: (state) => {
          (state as any).value += 1;
        }
      }
    });
    
    const store = configureStore({
      reducer: {
        test: testSlice.reducer
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(getUnifiedMiddleware())
    });
    
    expect(store.getState()).toEqual({ test: { value: 0 } });
    
    store.dispatch(testSlice.actions.increment());
    expect(store.getState()).toEqual({ test: { value: 1 } });
  });

  test('should be able to create slice with HTTP endpoint', async () => {
    const { createSlice } = await import('../slice');
    
    const apiSlice = createSlice({
      name: 'api',
      initialState: { 
        data: null,
        loading: false,
        error: null
      },
      reducers: {
        reset: (state) => {
          (state as any).data = null;
          (state as any).loading = false;
          (state as any).error = null;
        }
      },
      endpoints: {
        fetchData: {
          type: 'rsaa',
          config: {
            path: 'health',
            method: 'GET'
          },
          reducers: {
            request: (state) => {
              (state as any).loading = true;
              (state as any).error = null;
            },
            success: (state, action) => {
              (state as any).loading = false;
              (state as any).data = action.payload;
            },
            error: (state, action) => {
              (state as any).loading = false;
              (state as any).error = action.payload;
            }
          }
        }
      }
    });
    
    expect(apiSlice.actions.reset).toBeDefined();
    expect(apiSlice.actions.fetchData).toBeDefined();
    expect(apiSlice.reducer).toBeDefined();
  });

  test('should be able to create slice with WebSocket endpoint', async () => {
    const { createSlice } = await import('../slice');
    
    const socketSlice = createSlice({
      name: 'socket',
      initialState: { 
        connected: false,
        messages: []
      },
      reducers: {
        reset: (state) => {
          (state as any).connected = false;
          (state as any).messages = [];
        }
      },
      endpoints: {
        connect: {
          type: 'socket',
          reducers: {
            success: (state) => {
              (state as any).connected = true;
            },
            update: (state, action) => {
              (state as any).messages.push(action.payload);
            }
          }
        }
      }
    });
    
    expect(socketSlice.actions.reset).toBeDefined();
    expect(socketSlice.actions.connect).toBeDefined();
    expect(socketSlice.reducer).toBeDefined();
  });
}); 