/**
 * Unit tests for redux-unified core functionality
 * Tests Redux slice creation and action generation without network dependencies
 */

describe('Redux Unified Unit Tests', () => {
  test('can create basic slice with reducers', async () => {
    const { createSlice } = await import('../slice');
    
    const slice = createSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {
        increment: (state: any) => {
          state.value += 1;
        },
        decrement: (state: any) => {
          state.value -= 1;
        },
        incrementByAmount: (state: any, action: any) => {
          state.value += action.payload;
        }
      }
    });
    
    expect(slice.actions.increment).toBeDefined();
    expect(slice.actions.decrement).toBeDefined();
    expect(slice.actions.incrementByAmount).toBeDefined();
    expect(slice.reducer).toBeDefined();
    
    // Test reducer functionality
    const initialState = { value: 0 };
    
    // Test increment
    let newState = slice.reducer(initialState, slice.actions.increment());
    expect(newState.value).toBe(1);
    
    // Test decrement
    newState = slice.reducer(newState, slice.actions.decrement());
    expect(newState.value).toBe(0);
    
    // Test incrementByAmount
    newState = slice.reducer(newState, slice.actions.incrementByAmount(5));
    expect(newState.value).toBe(5);
  });

  test('can create slice with HTTP endpoint definition', async () => {
    const { createSlice } = await import('../slice');
    
    const apiSlice = createSlice({
      name: 'api',
      initialState: { 
        data: null,
        loading: false,
        error: null
      },
      reducers: {
        reset: (state: any) => {
          state.data = null;
          state.loading = false;
          state.error = null;
        }
      },
      endpoints: {
        fetchUser: {
          type: 'rsaa',
          config: {
            path: 'users/:id',
            method: 'GET'
          },
          reducers: {
            request: (state: any) => {
              state.loading = true;
              state.error = null;
            },
            success: (state: any, action: any) => {
              state.loading = false;
              state.data = action.payload;
            },
            error: (state: any, action: any) => {
              state.loading = false;
              state.error = action.payload;
            }
          }
        }
      }
    });
    
    // Check that regular actions are available
    expect(apiSlice.actions.reset).toBeDefined();
    
    // Check that endpoint actions are available
    expect(apiSlice.actions.fetchUser).toBeDefined();
    expect(apiSlice.actions.fetchUser.action).toBeDefined();
    expect(apiSlice.actions.fetchUser.request).toBeDefined();
    expect(apiSlice.actions.fetchUser.success).toBeDefined();
    expect(apiSlice.actions.fetchUser.error).toBeDefined();
    
    // Test reducer functionality
    const initialState = { data: null, loading: false, error: null };
    
    // Test regular action
    let newState = apiSlice.reducer(initialState, apiSlice.actions.reset());
    expect(newState).toEqual(initialState);
    
    // Test endpoint request action
    newState = apiSlice.reducer(initialState, apiSlice.actions.fetchUser.request());
    expect(newState.loading).toBe(true);
    expect(newState.error).toBe(null);
    
    // Test endpoint success action
    const userData = { id: 1, name: 'John Doe' };
    newState = apiSlice.reducer(newState, apiSlice.actions.fetchUser.success(userData));
    expect(newState.loading).toBe(false);
    expect(newState.data).toEqual(userData);
    
    // Test endpoint error action
    const error = { message: 'User not found' };
    newState = apiSlice.reducer({ ...initialState, loading: true }, apiSlice.actions.fetchUser.error(error));
    expect(newState.loading).toBe(false);
    expect(newState.error).toEqual(error);
  });

  test('can create slice with WebSocket endpoint definition', async () => {
    const { createSlice } = await import('../slice');
    
    const socketSlice = createSlice({
      name: 'socket',
      initialState: { 
        connected: false,
        messages: [] as any[],
        lastMessage: null
      },
      reducers: {
        reset: (state: any) => {
          state.connected = false;
          state.messages = [];
          state.lastMessage = null;
        }
      },
      endpoints: {
        liveChat: {
          type: 'socket',
          reducers: {
            request: (state: any) => {
              state.connected = false;
            },
            success: (state: any) => {
              state.connected = true;
            },
            update: (state: any, action: any) => {
              state.messages.push(action.payload);
              state.lastMessage = action.payload;
            },
            error: (state: any, action: any) => {
              state.connected = false;
              state.error = action.payload;
            }
          }
        }
      }
    });
    
    // Check that regular actions are available
    expect(socketSlice.actions.reset).toBeDefined();
    
    // Check that endpoint actions are available
    expect(socketSlice.actions.liveChat).toBeDefined();
    expect(socketSlice.actions.liveChat.action).toBeDefined();
    expect(socketSlice.actions.liveChat.request).toBeDefined();
    expect(socketSlice.actions.liveChat.success).toBeDefined();
    expect(socketSlice.actions.liveChat.update).toBeDefined();
    expect(socketSlice.actions.liveChat.error).toBeDefined();
    
    // Test reducer functionality
    const initialState = { connected: false, messages: [], lastMessage: null };
    
    // Test connection success
    let newState = socketSlice.reducer(initialState, socketSlice.actions.liveChat.success());
    expect(newState.connected).toBe(true);
    
    // Test message update
    const message1 = { id: 1, text: 'Hello', user: 'Alice' };
    newState = socketSlice.reducer(newState, socketSlice.actions.liveChat.update(message1));
    expect(newState.messages).toHaveLength(1);
    expect(newState.messages[0]).toEqual(message1);
    expect(newState.lastMessage).toEqual(message1);
    
    // Test another message
    const message2 = { id: 2, text: 'Hi there!', user: 'Bob' };
    newState = socketSlice.reducer(newState, socketSlice.actions.liveChat.update(message2));
    expect(newState.messages).toHaveLength(2);
    expect(newState.lastMessage).toEqual(message2);
  });

  test('can create store without middleware', async () => {
    const { configureStore } = await import('@reduxjs/toolkit');
    const { createSlice } = await import('../slice');
    
    const slice = createSlice({
      name: 'test',
      initialState: { value: 0 },
      reducers: {
        increment: (state: any) => { state.value += 1; }
      }
    });
    
    const store = configureStore({
      reducer: { test: slice.reducer }
    });
    
    expect(store.getState()).toEqual({ test: { value: 0 } });
    store.dispatch(slice.actions.increment());
    expect(store.getState()).toEqual({ test: { value: 1 } });
  });

  test('slice with both regular and endpoint actions', async () => {
    const { createSlice } = await import('../slice');
    
    const userSlice = createSlice({
      name: 'user',
      initialState: {
        profile: null,
        loading: false,
        error: null,
        preferences: {
          theme: 'light',
          notifications: true
        }
      },
      reducers: {
        logout: (state: any) => {
          state.profile = null;
        },
        updatePreferences: (state: any, action: any) => {
          state.preferences = { ...state.preferences, ...action.payload };
        }
      },
      endpoints: {
        fetchProfile: {
          type: 'rsaa',
          config: {
            path: 'users/me',
            method: 'GET'
          },
          reducers: {
            request: (state: any) => {
              state.loading = true;
              state.error = null;
            },
            success: (state: any, action: any) => {
              state.loading = false;
              state.profile = action.payload;
            },
            error: (state: any, action: any) => {
              state.loading = false;
              state.error = action.payload;
            }
          }
        },
        liveUpdates: {
          type: 'socket',
          reducers: {
            update: (state: any, action: any) => {
              if (action.payload.type === 'profile_update') {
                state.profile = { ...state.profile, ...action.payload.data };
              }
            }
          }
        }
      }
    });

    // Test that all actions are available
    expect(userSlice.actions.logout).toBeDefined();
    expect(userSlice.actions.updatePreferences).toBeDefined();
    expect(userSlice.actions.fetchProfile).toBeDefined();
    expect(userSlice.actions.liveUpdates).toBeDefined();

    // Test combined functionality
    const initialState = {
      profile: null,
      loading: false,
      error: null,
      preferences: { theme: 'light', notifications: true }
    };

    // Test regular actions work
    let state = userSlice.reducer(initialState, userSlice.actions.updatePreferences({ theme: 'dark' }));
    expect(state.preferences.theme).toBe('dark');

    // Test HTTP endpoint actions work
    state = userSlice.reducer(state, userSlice.actions.fetchProfile.request());
    expect(state.loading).toBe(true);

    const profileData = { id: 1, name: 'John', email: 'john@example.com' };
    state = userSlice.reducer(state, userSlice.actions.fetchProfile.success(profileData));
    expect(state.loading).toBe(false);
    expect(state.profile).toEqual(profileData);

    // Test WebSocket endpoint actions work
    const liveUpdate = { type: 'profile_update', data: { name: 'John Doe' } };
    state = userSlice.reducer(state, userSlice.actions.liveUpdates.update(liveUpdate));
    expect(state.profile.name).toBe('John Doe');
    expect(state.profile.email).toBe('john@example.com'); // Should preserve other fields
  });
}); 