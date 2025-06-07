/**
 * React Component Tests for Redux Unified
 * Tests real React components using redux-unified with user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { configureStore } from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { createSlice, EndpointType } from '../index';
import { getUnifiedMiddleware } from '../middleware';

// Mock fetch for HTTP requests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock WebSocket for WebSocket tests
class MockWebSocket {
  url: string;
  onopen: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  readyState: number = 1; // OPEN
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
    }, 10);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose({ wasClean: true });
    }
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data: typeof data === 'string' ? data : JSON.stringify(data) });
    }
  }
}

global.WebSocket = MockWebSocket as any;

// Create a unified slice for testing
const userSlice = createSlice({
  name: 'user',
  initialState: {
    profile: null as any,
    loading: false,
    error: null as string | null,
    posts: [] as any[],
    notifications: [] as any[],
    socketConnected: false,
  },
  
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    logout: (state) => {
      state.profile = null;
      state.posts = [];
      state.notifications = [];
    }
  },
  
  endpoints: {
    // HTTP endpoint for fetching user profile
    fetchProfile: {
      type: EndpointType.HTTP,
      config: {
        path: 'users/me',
        method: 'GET'
      },
      reducers: {
        request: (state) => {
          state.loading = true;
          state.error = null;
        },
        success: (state, action) => {
          state.loading = false;
          state.profile = action.payload;
        },
        error: (state, action) => {
          state.loading = false;
          state.error = action.payload.message || 'Failed to fetch profile';
        }
      }
    },

    // HTTP endpoint for creating posts
    createPost: {
      type: EndpointType.HTTP,
      config: {
        path: 'posts',
        method: 'POST'
      },
      reducers: {
        request: (state) => {
          state.loading = true;
        },
        success: (state, action) => {
          state.loading = false;
          state.posts.unshift(action.payload);
        },
        error: (state, action) => {
          state.loading = false;
          state.error = action.payload.message || 'Failed to create post';
        }
      }
    },

    // WebSocket endpoint for real-time notifications
    notifications: {
      type: EndpointType.WEBSOCKET,
      reducers: {
        success: (state) => {
          state.socketConnected = true;
        },
        update: (state, action) => {
          state.notifications.unshift(action.payload);
        },
        error: (state) => {
          state.socketConnected = false;
        }
      }
    }
  }
});

const { 
  clearError, 
  logout, 
  fetchProfile, 
  createPost, 
  notifications 
} = userSlice.actions;

// Create store for testing
function createTestStore() {
  return configureStore({
    reducer: {
      user: userSlice.reducer
    },
    middleware: (getDefaultMiddleware) => 
      getDefaultMiddleware().concat(getUnifiedMiddleware({
        http: {
          baseURL: 'https://api.test.com'
        },
        websocket: {
          url: 'wss://api.test.com/ws'
        }
      }))
  });
}

// Test Components
const UserProfile: React.FC = () => {
  const user = useSelector((state: any) => state.user);
  const dispatch = useDispatch();

  return (
    <div>
      <h1>User Profile</h1>
      
      <button 
        onClick={() => dispatch(fetchProfile.action())}
        disabled={user.loading}
        data-testid="fetch-profile-btn"
      >
        {user.loading ? 'Loading...' : 'Fetch Profile'}
      </button>

      <button 
        onClick={() => dispatch(logout())}
        data-testid="logout-btn"
      >
        Logout
      </button>

      <button 
        onClick={() => dispatch(clearError())}
        data-testid="clear-error-btn"
      >
        Clear Error
      </button>

      {user.error && (
        <div data-testid="error-message" className="error">
          Error: {user.error}
        </div>
      )}

      {user.profile && (
        <div data-testid="profile-info">
          <h2>{user.profile.name}</h2>
          <p>{user.profile.email}</p>
          <p>ID: {user.profile.id}</p>
        </div>
      )}
    </div>
  );
};

const PostCreator: React.FC = () => {
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const user = useSelector((state: any) => state.user);
  const dispatch = useDispatch();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && content.trim()) {
      dispatch(createPost.action({ title, content }));
      setTitle('');
      setContent('');
    }
  };

  return (
    <div>
      <h2>Create Post</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="post-title-input"
        />
        <textarea
          placeholder="Post content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          data-testid="post-content-input"
        />
        <button 
          type="submit" 
          disabled={user.loading || !title.trim() || !content.trim()}
          data-testid="create-post-btn"
        >
          {user.loading ? 'Creating...' : 'Create Post'}
        </button>
      </form>

      <div data-testid="posts-list">
        <h3>Posts ({user.posts.length})</h3>
        {user.posts.map((post: any, index: number) => (
          <div key={index} data-testid={`post-${index}`}>
            <h4>{post.title}</h4>
            <p>{post.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const NotificationPanel: React.FC = () => {
  const user = useSelector((state: any) => state.user);
  const dispatch = useDispatch();

  React.useEffect(() => {
    // Connect to WebSocket notifications
    dispatch(notifications.action());
  }, [dispatch]);

  return (
    <div>
      <h2>Notifications</h2>
      
      <div data-testid="connection-status">
        Status: {user.socketConnected ? 'Connected' : 'Disconnected'}
      </div>

      <div data-testid="notifications-list">
        {user.notifications.length === 0 ? (
          <p>No notifications</p>
        ) : (
          user.notifications.map((notification: any, index: number) => (
            <div key={index} data-testid={`notification-${index}`}>
              <strong>{notification.type}:</strong> {notification.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const TestApp: React.FC = () => {
  return (
    <div>
      <UserProfile />
      <PostCreator />
      <NotificationPanel />
    </div>
  );
};

// Test utilities
function renderWithStore(component: React.ReactElement, store?: any) {
  const testStore = store || createTestStore();
  return {
    ...render(
      <Provider store={testStore}>
        {component}
      </Provider>
    ),
    store: testStore
  };
}

describe('Redux Unified React Component Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.clearAllMocks();
  });

  describe('HTTP Endpoint Integration', () => {
    test('should fetch user profile when button is clicked', async () => {
      const user = userEvent.setup();
      
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: 'John Doe',
          email: 'john@example.com'
        })
      });

      const { store } = renderWithStore(<TestApp />);

      // Click fetch profile button
      const fetchBtn = screen.getByTestId('fetch-profile-btn');
      await user.click(fetchBtn);

      // Should show loading state
      expect(fetchBtn).toHaveTextContent('Loading...');
      expect(fetchBtn).toBeDisabled();

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByTestId('profile-info')).toBeInTheDocument();
      });

      // Check profile data is displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('ID: 1')).toBeInTheDocument();

      // Verify API was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users/me',
        expect.objectContaining({
          method: 'GET'
        })
      );

      // Check Redux state
      const state = store.getState();
      expect(state.user.profile).toEqual({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      });
      expect(state.user.loading).toBe(false);
    });

    test('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithStore(<TestApp />);

      // Click fetch profile button
      await user.click(screen.getByTestId('fetch-profile-btn'));

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent('Network error');

      // Test error clearing
      await user.click(screen.getByTestId('clear-error-btn'));
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    test('should create posts and update the list', async () => {
      const user = userEvent.setup();
      
      // Mock successful post creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Test Post',
          content: 'This is a test post'
        })
      });

      const { store } = renderWithStore(<TestApp />);

      // Fill in post form
      const titleInput = screen.getByTestId('post-title-input');
      const contentInput = screen.getByTestId('post-content-input');
      const createBtn = screen.getByTestId('create-post-btn');

      await user.type(titleInput, 'Test Post');
      await user.type(contentInput, 'This is a test post');
      
      // Button should be enabled when form is filled
      expect(createBtn).not.toBeDisabled();

      // Submit the form
      await user.click(createBtn);

      // Wait for post to be created
      await waitFor(() => {
        expect(screen.getByTestId('post-0')).toBeInTheDocument();
      });

      // Check post is displayed
      expect(screen.getByText('Test Post')).toBeInTheDocument();
      expect(screen.getByText('This is a test post')).toBeInTheDocument();
      expect(screen.getByText('Posts (1)')).toBeInTheDocument();

      // Check form was cleared
      expect(titleInput).toHaveValue('');
      expect(contentInput).toHaveValue('');

      // Verify API call
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/posts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Test Post',
            content: 'This is a test post'
          })
        })
      );
    });
  });

  describe('WebSocket Integration', () => {
    test('should connect to WebSocket and receive notifications', async () => {
      const { store } = renderWithStore(<TestApp />);

      // Wait for WebSocket connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // Simulate receiving a notification
      const mockWs = global.WebSocket as any;
      const wsInstance = new mockWs('wss://api.test.com/ws');
      
      // Simulate notification message
      setTimeout(() => {
        wsInstance.simulateMessage({
          type: 'notification',
          action: {
            type: 'user/notifications/update',
            payload: {
              type: 'info',
              message: 'Welcome to the app!'
            }
          }
        });
      }, 100);

      // Wait for notification to appear
      await waitFor(() => {
        expect(screen.getByTestId('notification-0')).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(screen.getByText('info:')).toBeInTheDocument();
      expect(screen.getByText('Welcome to the app!')).toBeInTheDocument();

      // Check Redux state
      const state = store.getState();
      expect(state.user.socketConnected).toBe(true);
      expect(state.user.notifications).toHaveLength(1);
      expect(state.user.notifications[0]).toEqual({
        type: 'info',
        message: 'Welcome to the app!'
      });
    });
  });

  describe('Complex User Interactions', () => {
    test('should handle multiple interactions in sequence', async () => {
      const user = userEvent.setup();
      
      // Mock responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1, name: 'Alice', email: 'alice@test.com' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1, title: 'Hello World', content: 'My first post' })
        });

      const { store } = renderWithStore(<TestApp />);

      // 1. Fetch profile
      await user.click(screen.getByTestId('fetch-profile-btn'));
      await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

      // 2. Create a post
      await user.type(screen.getByTestId('post-title-input'), 'Hello World');
      await user.type(screen.getByTestId('post-content-input'), 'My first post');
      await user.click(screen.getByTestId('create-post-btn'));
      
      await waitFor(() => expect(screen.getByText('Posts (1)')).toBeInTheDocument());

      // 3. Logout (should clear profile and posts)
      await user.click(screen.getByTestId('logout-btn'));

      // Check everything is cleared
      expect(screen.queryByTestId('profile-info')).not.toBeInTheDocument();
      expect(screen.getByText('Posts (0)')).toBeInTheDocument();

      // Verify final state
      const finalState = store.getState();
      expect(finalState.user.profile).toBeNull();
      expect(finalState.user.posts).toHaveLength(0);
      expect(finalState.user.notifications).toHaveLength(0);
    });

    test('should handle form validation correctly', async () => {
      const user = userEvent.setup();
      
      renderWithStore(<TestApp />);

      const createBtn = screen.getByTestId('create-post-btn');
      
      // Button should be disabled when form is empty
      expect(createBtn).toBeDisabled();

      // Add only title
      await user.type(screen.getByTestId('post-title-input'), 'Title');
      expect(createBtn).toBeDisabled();

      // Add only content (clear title first)
      await user.clear(screen.getByTestId('post-title-input'));
      await user.type(screen.getByTestId('post-content-input'), 'Content');
      expect(createBtn).toBeDisabled();

      // Add both title and content
      await user.type(screen.getByTestId('post-title-input'), 'Title');
      expect(createBtn).not.toBeDisabled();
    });
  });

  describe('Loading States and UI Feedback', () => {
    test('should show loading states correctly', async () => {
      const user = userEvent.setup();
      
      // Mock slow API response
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockFetch.mockReturnValueOnce(slowPromise);

      renderWithStore(<TestApp />);

      // Click fetch profile button
      await user.click(screen.getByTestId('fetch-profile-btn'));

      // Should immediately show loading state
      expect(screen.getByTestId('fetch-profile-btn')).toHaveTextContent('Loading...');
      expect(screen.getByTestId('fetch-profile-btn')).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ id: 1, name: 'Test User', email: 'test@example.com' })
      });

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.getByTestId('fetch-profile-btn')).toHaveTextContent('Fetch Profile');
        expect(screen.getByTestId('fetch-profile-btn')).not.toBeDisabled();
      });
    });
  });
}); 