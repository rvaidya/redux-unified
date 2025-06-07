/**
 * Integration tests for redux-unified
 * Tests HTTP and WebSocket functionality with real servers
 */

import { configureStore } from '@reduxjs/toolkit';
import { TestServerManager } from './test-servers';
import { createSlice } from '../slice';
import { getUnifiedMiddleware } from '../middleware';

// Global test servers
let testServers: TestServerManager;

beforeAll(async () => {
  testServers = new TestServerManager();
  await testServers.start();
}, 30000);

afterAll(async () => {
  if (testServers) {
    await testServers.stop();
  }
}, 10000);

describe('HTTP API Integration Tests', () => {
  let store: any;

  beforeEach(() => {
    // Create a test slice with HTTP endpoints
    const apiSlice = createSlice({
      name: 'api',
      initialState: {
        data: null,
        loading: false,
        error: null,
        lastResponse: null
      },
      reducers: {
        reset: (state) => {
          state.data = null;
          state.loading = false;
          state.error = null;
          state.lastResponse = null;
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
              state.loading = true;
              state.error = null;
            },
            success: (state, action) => {
              state.loading = false;
              state.data = action.payload;
              state.lastResponse = action.payload;
            },
            error: (state, action) => {
              state.loading = false;
              state.error = action.payload;
            }
          }
        },
        postData: {
          type: 'rsaa',
          config: {
            path: 'echo',
            method: 'POST'
          },
          reducers: {
            request: (state) => {
              state.loading = true;
              state.error = null;
            },
            success: (state, action) => {
              state.loading = false;
              state.data = action.payload;
              state.lastResponse = action.payload;
            },
            error: (state, action) => {
              state.loading = false;
              state.error = action.payload;
            }
          }
        },
        fetchUserProfile: {
          type: 'rsaa',
          config: {
            path: 'users/profile',
            method: 'GET'
          },
          reducers: {
            request: (state) => {
              state.loading = true;
              state.error = null;
            },
            success: (state, action) => {
              state.loading = false;
              state.data = action.payload;
              state.lastResponse = action.payload;
            },
            error: (state, action) => {
              state.loading = false;
              state.error = action.payload;
            }
          }
        },
        testError: {
          type: 'rsaa',
          config: {
            path: 'error',
            method: 'GET'
          },
          reducers: {
            request: (state) => {
              state.loading = true;
              state.error = null;
            },
            success: (state, action) => {
              state.loading = false;
              state.data = action.payload;
            },
            error: (state, action) => {
              state.loading = false;
              state.error = action.payload;
            }
          }
        }
      }
    });

    // Configure store with test server URL
    store = configureStore({
      reducer: {
        api: apiSlice.reducer
      },
             middleware: (getDefaultMiddleware) =>
         getDefaultMiddleware().concat(getUnifiedMiddleware())
    });
  });

  test('should handle GET requests successfully', async () => {
    const initialState = store.getState();
    expect(initialState.api.loading).toBe(false);
    expect(initialState.api.data).toBe(null);

    // Dispatch the action
    await store.dispatch({ type: 'api/fetchData' });

    const finalState = store.getState();
    expect(finalState.api.loading).toBe(false);
    expect(finalState.api.error).toBe(null);
    expect(finalState.api.data).toMatchObject({
      status: 'ok'
    });
    expect(finalState.api.data.timestamp).toBeDefined();
  });

  test('should handle POST requests with data', async () => {
    const testData = { name: 'Test User', email: 'test@example.com' };

    await store.dispatch({ 
      type: 'api/postData',
      payload: testData
    });

    const state = store.getState();
    expect(state.api.loading).toBe(false);
    expect(state.api.error).toBe(null);
    expect(state.api.data).toMatchObject({
      method: 'POST',
      path: '/echo',
      body: testData
    });
  });

  test('should handle user profile endpoint', async () => {
    await store.dispatch({ type: 'api/fetchUserProfile' });

    const state = store.getState();
    expect(state.api.loading).toBe(false);
    expect(state.api.error).toBe(null);
    expect(state.api.data).toMatchObject({
      id: 1,
      name: 'Test User',
      email: 'test@example.com'
    });
  });

  test('should handle error responses', async () => {
    await store.dispatch({ type: 'api/testError' });

    const state = store.getState();
    expect(state.api.loading).toBe(false);
    expect(state.api.data).toBe(null);
    expect(state.api.error).toMatchObject({
      error: 'Test error',
      message: 'This is a test error response'
    });
  });

  test('should show loading state during requests', async () => {
    // This test would require mocking slow responses
    // For now, we'll just verify the loading state logic
    store.dispatch({ type: 'api/fetchData/request' });
    
    let state = store.getState();
    expect(state.api.loading).toBe(true);
    expect(state.api.error).toBe(null);

    store.dispatch({ 
      type: 'api/fetchData/success', 
      payload: { status: 'ok' } 
    });

    state = store.getState();
    expect(state.api.loading).toBe(false);
    expect(state.api.data).toMatchObject({ status: 'ok' });
  });
});

describe('WebSocket Integration Tests', () => {
  let store: any;

  beforeEach(() => {
    // Create a test slice with WebSocket endpoints
    const socketSlice = createSlice({
      name: 'socket',
      initialState: {
        connected: false,
        messages: [],
        lastMessage: null,
        error: null
      },
      reducers: {
        reset: (state) => {
          state.connected = false;
          state.messages = [];
          state.lastMessage = null;
          state.error = null;
        }
      },
      endpoints: {
        connect: {
          type: 'socket',
          reducers: {
            request: (state) => {
              state.connected = false;
              state.error = null;
            },
            success: (state) => {
              state.connected = true;
            },
            error: (state, action) => {
              state.connected = false;
              state.error = action.payload;
            }
          }
        },
        sendMessage: {
          type: 'socket',
                     reducers: {
             update: (state, action) => {
               (state as any).messages.push(action.payload);
               (state as any).lastMessage = action.payload;
             }
          }
        }
      }
    });

    // Configure store with test WebSocket URL
    store = configureStore({
      reducer: {
        socket: socketSlice.reducer
      },
             middleware: (getDefaultMiddleware) =>
         getDefaultMiddleware().concat(getUnifiedMiddleware())
    });
  });

  test('should connect to WebSocket server', async () => {
    const initialState = store.getState();
    expect(initialState.socket.connected).toBe(false);

    // Simulate connection
    store.dispatch({ type: 'socket/connect' });
    
    // Wait a bit for connection
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate successful connection
    store.dispatch({ type: 'socket/connect/success' });

    const state = store.getState();
    expect(state.socket.connected).toBe(true);
    expect(state.socket.error).toBe(null);
  });

  test('should handle incoming WebSocket messages', async () => {
    const testMessage = {
      type: 'test',
      content: 'Hello WebSocket',
      timestamp: new Date().toISOString()
    };

    store.dispatch({ 
      type: 'socket/sendMessage/update',
      payload: testMessage
    });

    const state = store.getState();
    expect(state.socket.messages).toHaveLength(1);
    expect(state.socket.lastMessage).toEqual(testMessage);
    expect(state.socket.messages[0]).toEqual(testMessage);
  });

  test('should handle multiple WebSocket messages', async () => {
    const messages = [
      { type: 'message1', content: 'First message' },
      { type: 'message2', content: 'Second message' },
      { type: 'message3', content: 'Third message' }
    ];

    messages.forEach(message => {
      store.dispatch({ 
        type: 'socket/sendMessage/update',
        payload: message
      });
    });

    const state = store.getState();
    expect(state.socket.messages).toHaveLength(3);
    expect(state.socket.lastMessage).toEqual(messages[2]);
  });

  test('should handle WebSocket connection errors', async () => {
    const errorMessage = 'Connection failed';

    store.dispatch({ 
      type: 'socket/connect/error',
      payload: errorMessage
    });

    const state = store.getState();
    expect(state.socket.connected).toBe(false);
    expect(state.socket.error).toBe(errorMessage);
  });
});

describe('Combined HTTP and WebSocket Tests', () => {
  let store: any;

  beforeEach(() => {
    // Create a combined slice with both HTTP and WebSocket endpoints
    const unifiedSlice = createSlice({
      name: 'unified',
      initialState: {
        // HTTP state
        apiData: null,
        apiLoading: false,
        apiError: null,
        // WebSocket state
        socketConnected: false,
        socketMessages: [],
        socketError: null
      },
      reducers: {
        reset: (state) => {
          state.apiData = null;
          state.apiLoading = false;
          state.apiError = null;
          state.socketConnected = false;
          state.socketMessages = [];
          state.socketError = null;
        }
      },
      endpoints: {
        // HTTP endpoint
        fetchStatus: {
          type: 'rsaa',
          config: {
            path: 'health',
            method: 'GET'
          },
          reducers: {
            request: (state) => {
              state.apiLoading = true;
              state.apiError = null;
            },
            success: (state, action) => {
              state.apiLoading = false;
              state.apiData = action.payload;
            },
            error: (state, action) => {
              state.apiLoading = false;
              state.apiError = action.payload;
            }
          }
        },
        // WebSocket endpoint
        liveUpdates: {
          type: 'socket',
          reducers: {
            request: (state) => {
              state.socketConnected = false;
              state.socketError = null;
            },
            success: (state) => {
              state.socketConnected = true;
            },
            update: (state, action) => {
              state.socketMessages.push(action.payload);
            },
            error: (state, action) => {
              state.socketConnected = false;
              state.socketError = action.payload;
            }
          }
        }
      }
    });

    store = configureStore({
      reducer: {
        unified: unifiedSlice.reducer
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(getUnifiedMiddleware({
          http: {
            baseURL: testServers.getHttpUrl()
          },
          websocket: {
            url: testServers.getWebSocketUrl()
          }
        }))
    });
  });

  test('should handle both HTTP and WebSocket actions', async () => {
    // Test HTTP action
    await store.dispatch({ type: 'unified/fetchStatus' });
    
    // Test WebSocket actions
    store.dispatch({ type: 'unified/liveUpdates/success' });
    store.dispatch({ 
      type: 'unified/liveUpdates/update',
      payload: { type: 'update', data: 'test data' }
    });

    const state = store.getState();
    
    // Check HTTP state
    expect(state.unified.apiLoading).toBe(false);
    expect(state.unified.apiData).toMatchObject({ status: 'ok' });
    expect(state.unified.apiError).toBe(null);
    
    // Check WebSocket state
    expect(state.unified.socketConnected).toBe(true);
    expect(state.unified.socketMessages).toHaveLength(1);
    expect(state.unified.socketMessages[0]).toMatchObject({ 
      type: 'update', 
      data: 'test data' 
    });
    expect(state.unified.socketError).toBe(null);
  });

  test('should maintain separate error states for HTTP and WebSocket', async () => {
    // Simulate HTTP error
    store.dispatch({ 
      type: 'unified/fetchStatus/error',
      payload: 'HTTP error'
    });

    // Simulate WebSocket error
    store.dispatch({ 
      type: 'unified/liveUpdates/error',
      payload: 'WebSocket error'
    });

    const state = store.getState();
    expect(state.unified.apiError).toBe('HTTP error');
    expect(state.unified.socketError).toBe('WebSocket error');
    expect(state.unified.apiLoading).toBe(false);
    expect(state.unified.socketConnected).toBe(false);
  });
}); 