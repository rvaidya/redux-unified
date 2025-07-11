/**
 * Simple React Component Tests for Redux Unified
 * Tests basic React integration with redux-unified
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { createSlice } from '../index';

// Mock fetch for HTTP requests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Define types for our state
interface CounterState {
  value: number;
  loading: boolean;
  error: string | null;
  data: any;
}

interface RootState {
  counter: CounterState;
}

// Create a simple slice for testing
const counterSlice = createSlice({
  name: 'counter',
  initialState: {
    value: 0,
    loading: false,
    error: null as string | null,
    data: null as any
  } as CounterState,
  
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    reset: (state) => {
      state.value = 0;
      state.error = null;
    },
    // Add direct actions for testing HTTP-like behavior
    startLoading: (state) => {
      state.loading = true;
      state.error = null;
    },
    loadSuccess: (state, action) => {
      state.loading = false;
      state.data = action.payload;
    },
    loadError: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    }
  },
  
  endpoints: {
    // Simple HTTP endpoint without complex configuration
    fetchData: {
      type: 'rsaa',
      config: {
        path: 'data',
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
          state.error = 'Failed to fetch data';
        }
      }
    }
  }
});

const { 
  increment, 
  decrement, 
  reset, 
  startLoading, 
  loadSuccess, 
  loadError, 
  fetchData 
} = counterSlice.actions;

// Create store for testing
function createTestStore() {
  return configureStore({
    reducer: {
      counter: counterSlice.reducer
    }
  });
}

// Simple Counter Component
const Counter: React.FC = () => {
  const counter = useSelector((state: RootState) => state.counter);
  const dispatch = useDispatch();

  // Simulate API call with direct action dispatching
  const handleFetchData = async () => {
    dispatch(startLoading());
    
    try {
      // This simulates what the middleware would do
      const response = await fetch('/api/data');
      const data = await response.json();
      dispatch(loadSuccess(data));
    } catch (error) {
      dispatch(loadError('Failed to fetch data'));
    }
  };

  return (
    <div>
      <h1>Counter: {counter.value}</h1>
      
      <button 
        onClick={() => dispatch(increment())}
        data-testid="increment-btn"
      >
        +
      </button>

      <button 
        onClick={() => dispatch(decrement())}
        data-testid="decrement-btn"
      >
        -
      </button>

      <button 
        onClick={() => dispatch(reset())}
        data-testid="reset-btn"
      >
        Reset
      </button>

      <button 
        onClick={handleFetchData}
        disabled={counter.loading}
        data-testid="fetch-btn"
      >
        {counter.loading ? 'Loading...' : 'Fetch Data'}
      </button>

      {counter.error && (
        <div data-testid="error-message">
          Error: {counter.error}
        </div>
      )}

      {counter.data && (
        <div data-testid="data-display">
          Data: {JSON.stringify(counter.data)}
        </div>
      )}
    </div>
  );
};

// Test utilities
function renderWithStore(component: React.ReactElement) {
  const store = createTestStore();
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store
  };
}

// Helper function to get typed state
function getTypedState(store: ReturnType<typeof createTestStore>): RootState {
  return store.getState() as RootState;
}

describe('Redux Unified React Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.clearAllMocks();
  });

  describe('Basic Redux Actions', () => {
    test('should increment counter when increment button is clicked', async () => {
      const user = userEvent.setup();
      
      const { store } = renderWithStore(<Counter />);

      // Initial state
      expect(screen.getByText('Counter: 0')).toBeInTheDocument();

      // Click increment button
      await user.click(screen.getByTestId('increment-btn'));

      // Check UI updated
      expect(screen.getByText('Counter: 1')).toBeInTheDocument();

      // Check Redux state
      expect(getTypedState(store).counter.value).toBe(1);
    });

    test('should decrement counter when decrement button is clicked', async () => {
      const user = userEvent.setup();
      
      const { store } = renderWithStore(<Counter />);

      // First increment to get to 1
      await user.click(screen.getByTestId('increment-btn'));
      expect(screen.getByText('Counter: 1')).toBeInTheDocument();

      // Then decrement
      await user.click(screen.getByTestId('decrement-btn'));
      expect(screen.getByText('Counter: 0')).toBeInTheDocument();

      // Check Redux state
      expect(getTypedState(store).counter.value).toBe(0);
    });

    test('should reset counter when reset button is clicked', async () => {
      const user = userEvent.setup();
      
      const { store } = renderWithStore(<Counter />);

      // Increment a few times
      await user.click(screen.getByTestId('increment-btn'));
      await user.click(screen.getByTestId('increment-btn'));
      await user.click(screen.getByTestId('increment-btn'));
      
      expect(screen.getByText('Counter: 3')).toBeInTheDocument();

      // Reset
      await user.click(screen.getByTestId('reset-btn'));
      expect(screen.getByText('Counter: 0')).toBeInTheDocument();

      // Check Redux state
      expect(getTypedState(store).counter.value).toBe(0);
    });
  });

  describe('HTTP-like Endpoint Simulation', () => {
    test('should handle successful API call', async () => {
      const user = userEvent.setup();
      
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Hello from API', timestamp: '2023-01-01' })
      });

      const { store } = renderWithStore(<Counter />);

      // Click fetch button
      const fetchBtn = screen.getByTestId('fetch-btn');
      await user.click(fetchBtn);

      // API call happens async - wait for completion
      // (Loading state is too fast to test reliably in this simple mock)

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('data-display')).toBeInTheDocument();
      });

      // Check data is displayed
      expect(screen.getByTestId('data-display')).toHaveTextContent(
        'Data: {"message":"Hello from API","timestamp":"2023-01-01"}'
      );

      // Check Redux state
      const state = getTypedState(store);
      expect(state.counter.loading).toBe(false);
      expect(state.counter.data).toEqual({
        message: 'Hello from API',
        timestamp: '2023-01-01'
      });

      // Button should be enabled again
      expect(fetchBtn).toHaveTextContent('Fetch Data');
      expect(fetchBtn).not.toBeDisabled();
    });

    test('should handle API error', async () => {
      const user = userEvent.setup();
      
      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { store } = renderWithStore(<Counter />);

      // Click fetch button
      await user.click(screen.getByTestId('fetch-btn'));

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent('Error: Failed to fetch data');

      // Check Redux state
      const state = getTypedState(store);
      expect(state.counter.loading).toBe(false);
      expect(state.counter.error).toBe('Failed to fetch data');
    });
  });

  describe('User Interaction Flow', () => {
    test('should handle multiple user interactions correctly', async () => {
      const user = userEvent.setup();
      
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 42 })
      });

      const { store } = renderWithStore(<Counter />);

      // Start with some counter increments
      await user.click(screen.getByTestId('increment-btn'));
      await user.click(screen.getByTestId('increment-btn'));
      expect(screen.getByText('Counter: 2')).toBeInTheDocument();

      // Fetch some data
      await user.click(screen.getByTestId('fetch-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('data-display')).toBeInTheDocument();
      });

      // Reset counter (should keep data but reset counter)
      await user.click(screen.getByTestId('reset-btn'));
      expect(screen.getByText('Counter: 0')).toBeInTheDocument();
      expect(screen.getByTestId('data-display')).toBeInTheDocument(); // Data should still be there

      // Verify final state
      const finalState = getTypedState(store);
      expect(finalState.counter.value).toBe(0);
      expect(finalState.counter.data).toEqual({ count: 42 });
      expect(finalState.counter.error).toBeNull();
    });
  });

  describe('Loading States', () => {
    test('should show loading state correctly', async () => {
      const user = userEvent.setup();
      
      // Create a promise that we can control
      let resolvePromise: (value: any) => void;
      const controlledPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockFetch.mockReturnValueOnce(controlledPromise);

      renderWithStore(<Counter />);

      // Click fetch button
      await user.click(screen.getByTestId('fetch-btn'));

      // Should immediately show loading state
      expect(screen.getByTestId('fetch-btn')).toHaveTextContent('Loading...');
      expect(screen.getByTestId('fetch-btn')).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ result: 'success' })
      });

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.getByTestId('fetch-btn')).toHaveTextContent('Fetch Data');
        expect(screen.getByTestId('fetch-btn')).not.toBeDisabled();
      });
    });
  });

  describe('Direct Action Testing', () => {
    test('should work with direct action dispatching', () => {
      const { store } = renderWithStore(<Counter />);

      // Test direct action dispatch
      store.dispatch(startLoading());
      expect(getTypedState(store).counter.loading).toBe(true);

      store.dispatch(loadSuccess({ testData: 'success' }));
      expect(getTypedState(store).counter.loading).toBe(false);
      expect(getTypedState(store).counter.data).toEqual({ testData: 'success' });

      store.dispatch(loadError('Test error'));
      expect(getTypedState(store).counter.error).toBe('Test error');
    });

    test('should work with endpoint actions', () => {
      const { store } = renderWithStore(<Counter />);

      // Test endpoint action creators
      expect(fetchData.request).toBeDefined();
      expect(fetchData.success).toBeDefined();
      expect(fetchData.error).toBeDefined();

      // Test endpoint reducers
      store.dispatch(fetchData.request());
      expect(getTypedState(store).counter.loading).toBe(true);

      store.dispatch(fetchData.success({ endpoint: 'data' }));
      expect(getTypedState(store).counter.loading).toBe(false);
      expect(getTypedState(store).counter.data).toEqual({ endpoint: 'data' });
    });
  });
}); 