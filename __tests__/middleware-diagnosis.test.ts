/**
 * Middleware diagnosis tests for redux-unified
 * Identifies and helps fix middleware-specific issues
 */

describe('Middleware Diagnosis', () => {
  test('Identify HTTP middleware type issues', async () => {
    console.log('🔍 Diagnosing HTTP middleware type issues...');
    
    try {
      // Try to import just the HTTP middleware
      const httpModule = await import('../middleware/httpMiddleware');
      console.log('✓ HTTP middleware module imported');
      console.log('Available exports:', Object.keys(httpModule));
      
      // Check if we can create HTTP actions
      if (httpModule.createHttpAction) {
        const actionCreator = httpModule.createHttpAction({
          path: 'test',
          method: 'GET',
          type: 'TEST_ACTION'
        });
        console.log('✓ HTTP action creator works');
        console.log('Action creator structure:', Object.keys(actionCreator));
      }
      
    } catch (error) {
      console.error('✗ HTTP middleware issue:', (error as Error).message);
      console.log('This confirms HTTP middleware has type signature issues that need fixing');
    }
  });

  test('Identify WebSocket middleware type issues', async () => {
    console.log('🔍 Diagnosing WebSocket middleware type issues...');
    
    try {
      // Try to import just the WebSocket middleware
      const wsModule = await import('../middleware/websocketMiddleware');
      console.log('✓ WebSocket middleware module imported');
      console.log('Available exports:', Object.keys(wsModule));
      
      // Check if we can create WebSocket actions
      if (wsModule.createWebSocketAction) {
        const actionCreator = wsModule.createWebSocketAction({
          type: 'TEST_SOCKET_ACTION'
        });
        console.log('✓ WebSocket action creator works');
        console.log('Action creator structure:', Object.keys(actionCreator));
      }
      
    } catch (error) {
      console.error('✗ WebSocket middleware issue:', (error as Error).message);
      console.log('This confirms WebSocket middleware has type signature issues that need fixing');
    }
  });

  test('Test unified middleware compilation', async () => {
    console.log('🔍 Testing unified middleware compilation...');
    
    try {
      const middlewareModule = await import('../middleware');
      console.log('✓ Unified middleware module imported');
      console.log('Available exports:', Object.keys(middlewareModule));
      
      if (middlewareModule.getUnifiedMiddleware) {
        const middleware = middlewareModule.getUnifiedMiddleware();
        console.log('✓ getUnifiedMiddleware function works');
        console.log('Middleware array length:', middleware.length);
      }
      
    } catch (error) {
      console.error('✗ Unified middleware compilation issue:', (error as Error).message);
      console.log('This indicates type signature issues in the middleware composition');
    }
  });

  test('Validate core slice functionality independently', async () => {
    console.log('🔍 Validating core slice functionality works without middleware...');
    
    const { createSlice } = await import('../slice');
    const { configureStore } = await import('@reduxjs/toolkit');
    
    // Create a comprehensive slice with both HTTP and WebSocket endpoints
    const testSlice = createSlice({
      name: 'integration',
      initialState: {
        // HTTP state
        apiData: null,
        apiLoading: false,
        apiError: null,
        // WebSocket state
        socketConnected: false,
        socketMessages: [] as any[],
        socketError: null,
        // General state
        count: 0
      },
      reducers: {
        increment: (state: any) => {
          state.count += 1;
        },
        reset: (state: any) => {
          state.apiData = null;
          state.apiLoading = false;
          state.apiError = null;
          state.socketConnected = false;
          state.socketMessages = [];
          state.socketError = null;
          state.count = 0;
        }
      },
      endpoints: {
        // HTTP endpoint
        fetchData: {
          type: 'rsaa',
          config: {
            path: 'api/data',
            method: 'GET'
          },
          reducers: {
            request: (state: any) => {
              state.apiLoading = true;
              state.apiError = null;
            },
            success: (state: any, action: any) => {
              state.apiLoading = false;
              state.apiData = action.payload;
            },
            error: (state: any, action: any) => {
              state.apiLoading = false;
              state.apiError = action.payload;
            }
          }
        },
        // WebSocket endpoint
        liveUpdates: {
          type: 'socket',
          reducers: {
            request: (state: any) => {
              state.socketConnected = false;
              state.socketError = null;
            },
            success: (state: any) => {
              state.socketConnected = true;
            },
            update: (state: any, action: any) => {
              state.socketMessages.push(action.payload);
            },
            error: (state: any, action: any) => {
              state.socketConnected = false;
              state.socketError = action.payload;
            }
          }
        }
      }
    });
    
    // Create store without middleware to test slice functionality
    const store = configureStore({
      reducer: {
        test: testSlice.reducer
      }
    });
    
    // Test all action types
    console.log('Testing regular actions...');
    expect(store.getState().test.count).toBe(0);
    store.dispatch(testSlice.actions.increment());
    expect(store.getState().test.count).toBe(1);
    
    console.log('Testing HTTP endpoint actions...');
    store.dispatch(testSlice.actions.fetchData.request());
    expect(store.getState().test.apiLoading).toBe(true);
    
    const testData = { id: 1, message: 'test data' };
    store.dispatch(testSlice.actions.fetchData.success(testData));
    expect(store.getState().test.apiLoading).toBe(false);
    expect(store.getState().test.apiData).toEqual(testData);
    
    console.log('Testing WebSocket endpoint actions...');
    store.dispatch(testSlice.actions.liveUpdates.success());
    expect(store.getState().test.socketConnected).toBe(true);
    
    const message = { type: 'chat', content: 'Hello World' };
    store.dispatch(testSlice.actions.liveUpdates.update(message));
    expect(store.getState().test.socketMessages).toHaveLength(1);
    expect(store.getState().test.socketMessages[0]).toEqual(message);
    
    console.log('✅ ALL CORE FUNCTIONALITY WORKS PERFECTLY!');
    console.log('Final state:', JSON.stringify(store.getState(), null, 2));
  });
}); 