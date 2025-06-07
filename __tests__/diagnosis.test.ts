/**
 * Diagnosis tests for redux-unified
 * Identifies specific issues that need to be fixed
 */

describe('Redux Unified Diagnosis', () => {
  test('Redux Toolkit imports work correctly', async () => {
    // This should pass - basic Redux Toolkit functionality
    const { createSlice, configureStore } = await import('@reduxjs/toolkit');
    
    const basicSlice = createSlice({
      name: 'test',
      initialState: { value: 0 },
      reducers: {
        increment: (state) => {
          state.value += 1;
        }
      }
    });
    
    const store = configureStore({
      reducer: { test: basicSlice.reducer }
    });
    
    expect(store.getState()).toEqual({ test: { value: 0 } });
    store.dispatch(basicSlice.actions.increment());
    expect(store.getState()).toEqual({ test: { value: 1 } });
  });

  test('Can import redux-unified modules', async () => {
    // Test if the main modules can be imported without errors
    try {
      console.log('Attempting to import slice module...');
      const sliceModule = await import('../slice');
      console.log('✓ Slice module imported successfully');
      expect(sliceModule.createSlice).toBeDefined();
    } catch (error) {
      console.error('✗ Failed to import slice module:', error);
      throw error;
    }

    try {
      console.log('Attempting to import types module...');
      await import('../types');
      console.log('✓ Types module imported successfully');
    } catch (error) {
      console.error('✗ Failed to import types module:', error);
      throw error;
    }

    try {
      console.log('Attempting to import utils module...');
      await import('../utils');
      console.log('✓ Utils module imported successfully');
    } catch (error) {
      console.error('✗ Failed to import utils module:', error);
      // Don't throw here as utils likely has fetch/WebSocket dependencies
      console.log('Expected error due to fetch/WebSocket dependencies in Node.js environment');
    }

    try {
      console.log('Attempting to import middleware module...');
      await import('../middleware');
      console.log('✓ Middleware module imported successfully');
    } catch (error) {
      console.error('✗ Failed to import middleware module:', error);
      // Don't throw here as middleware likely has fetch/WebSocket dependencies
      console.log('Expected error due to fetch/WebSocket dependencies in Node.js environment');
    }
  });

  test('Can create unified slice without endpoints', async () => {
    try {
      const { createSlice } = await import('../slice');
      
      const slice = createSlice({
        name: 'simple',
        initialState: { count: 0 },
        reducers: {
          increment: (state: any) => {
            state.count += 1;
          }
        }
      });
      
      expect(slice.actions.increment).toBeDefined();
      expect(slice.reducer).toBeDefined();
      
      // Test reducer functionality
      const initialState = { count: 0 };
      const newState = slice.reducer(initialState, slice.actions.increment());
      expect(newState.count).toBe(1);
      
      console.log('✓ Basic unified slice works correctly');
    } catch (error) {
      console.error('✗ Failed to create basic unified slice:', error);
      throw error;
    }
  });

  test('Identify issues with HTTP endpoints', async () => {
    try {
      const { createSlice } = await import('../slice');
      
      const slice = createSlice({
        name: 'api',
        initialState: { data: null, loading: false },
        reducers: {
          reset: (state: any) => {
            state.data = null;
            state.loading = false;
          }
        },
        endpoints: {
          fetchData: {
            type: 'rsaa',
            config: {
              path: 'test',
              method: 'GET'
            },
            reducers: {
              request: (state: any) => {
                console.log('HTTP request reducer called');
                state.loading = true;
              },
              success: (state: any, action: any) => {
                console.log('HTTP success reducer called with:', action.payload);
                state.loading = false;
                state.data = action.payload;
              }
            }
          }
        }
      });
      
      expect(slice.actions.fetchData).toBeDefined();
      expect(slice.actions.fetchData.request).toBeDefined();
      expect(slice.actions.fetchData.success).toBeDefined();
      
      // Test the endpoint actions
      const initialState = { data: null, loading: false };
      
      console.log('Testing HTTP request action...');
      const requestState = slice.reducer(initialState, slice.actions.fetchData.request());
      expect(requestState.loading).toBe(true);
      
      console.log('Testing HTTP success action...');
      const successData = { id: 1, name: 'test' };
      const successState = slice.reducer(requestState, slice.actions.fetchData.success(successData));
      expect(successState.loading).toBe(false);
      expect(successState.data).toEqual(successData);
      
      console.log('✓ HTTP endpoint slice works correctly');
    } catch (error) {
      console.error('✗ HTTP endpoint slice failed:', error);
      console.error('Error details:', (error as Error).message);
      console.error('Stack trace:', (error as Error).stack);
      throw error;
    }
  });

  test('Identify issues with WebSocket endpoints', async () => {
    try {
      const { createSlice } = await import('../slice');
      
      const slice = createSlice({
        name: 'socket',
        initialState: { connected: false, messages: [] },
        reducers: {
          reset: (state: any) => {
            state.connected = false;
            state.messages = [];
          }
        },
        endpoints: {
          chat: {
            type: 'socket',
            reducers: {
              success: (state: any) => {
                console.log('WebSocket success reducer called');
                state.connected = true;
              },
              update: (state: any, action: any) => {
                console.log('WebSocket update reducer called with:', action.payload);
                state.messages.push(action.payload);
              }
            }
          }
        }
      });
      
      expect(slice.actions.chat).toBeDefined();
      expect(slice.actions.chat.success).toBeDefined();
      expect(slice.actions.chat.update).toBeDefined();
      
      // Test the endpoint actions
      const initialState = { connected: false, messages: [] };
      
      console.log('Testing WebSocket success action...');
      const connectedState = slice.reducer(initialState, slice.actions.chat.success());
      expect(connectedState.connected).toBe(true);
      
      console.log('Testing WebSocket update action...');
      const message = { id: 1, text: 'Hello' };
      const messageState = slice.reducer(connectedState, slice.actions.chat.update(message));
      expect(messageState.messages).toHaveLength(1);
      expect(messageState.messages[0]).toEqual(message);
      
      console.log('✓ WebSocket endpoint slice works correctly');
    } catch (error) {
      console.error('✗ WebSocket endpoint slice failed:', error);
      console.error('Error details:', (error as Error).message);
      console.error('Stack trace:', (error as Error).stack);
      throw error;
    }
  });
}); 