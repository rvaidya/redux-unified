# Redux Unified Test Suite

This test suite provides comprehensive coverage for the Redux Unified package, testing all functionality including HTTP middleware, WebSocket middleware, unified slice creation, and integration scenarios.

## Test Files

### `setup.ts`
- Mock setup for fetch, WebSocket, localStorage
- Test utilities and helpers
- Global configuration for test environment

### `slice.test.ts`
- Tests for unified `createSlice` functionality
- HTTP endpoint action creation and reducers
- WebSocket endpoint action creation and reducers
- Mixed endpoint scenarios
- TypeScript integration
- Store integration

### `httpMiddleware.test.ts`
- HTTP middleware functionality
- Authentication (Bearer, Basic, Custom)
- Request/response handling
- Error handling and retries
- Caching mechanisms
- URL building and parameter replacement

### `websocketMiddleware.test.ts`
- WebSocket middleware functionality
- Connection management and lifecycle
- Message sending and receiving
- Reconnection logic
- Error handling
- Authentication integration

### `utils.test.ts`
- Utility function testing
- URL building and parameter replacement
- Authentication header building
- Cache management
- Token validation
- Error formatting

### `config.test.ts`
- Configuration management
- HTTP configuration
- WebSocket configuration
- Authentication configuration
- Environment variable integration
- Configuration validation

### `integration.test.ts`
- End-to-end integration tests
- Complete HTTP request lifecycle
- Complete WebSocket message lifecycle
- Mixed HTTP/WebSocket scenarios
- Real-world application patterns
- Performance and caching
- Error handling integration

## Running Tests

### Prerequisites
```bash
npm install --dev jest @types/jest ts-jest jsdom
```

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test slice.test.ts
npm test httpMiddleware.test.ts
npm test integration.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Watch Mode
```bash
npm test -- --watch
```

## Test Coverage Goals

The test suite aims for:
- **80%+ line coverage** across all modules
- **80%+ branch coverage** for conditional logic
- **80%+ function coverage** for all exported functions
- **100% endpoint coverage** for all action types

## Test Categories

### Unit Tests
- Individual function testing
- Component isolation
- Mock dependencies
- Edge case handling

### Integration Tests
- Multiple components working together
- Real Redux store scenarios
- Middleware interaction
- End-to-end flows

### Error Handling Tests
- Network failures
- Invalid responses
- Malformed data
- Connection issues

### Performance Tests
- Caching effectiveness
- Memory usage patterns
- Concurrent request handling
- WebSocket message throughput

## Mock Strategy

### HTTP Mocking
- Global fetch mock with configurable responses
- Response builder utilities
- Network error simulation
- Authentication token simulation

### WebSocket Mocking
- Mock WebSocket class with event simulation
- Connection state management
- Message sending/receiving simulation
- Error condition testing

### Storage Mocking
- localStorage/sessionStorage mocks
- Cache persistence testing
- Configuration storage testing

## Test Patterns

### Async Testing
```typescript
// HTTP requests
await flushPromises();

// WebSocket connections
await waitFor(50);

// Complex async flows
store.dispatch(action);
await flushPromises();
expect(store.getState()).toEqual(expectedState);
```

### Error Testing
```typescript
// Mock network errors
mockFetch.mockRejectedValueOnce(new Error('Network failed'));

// Mock WebSocket errors
wsInstance.send.mockImplementation(() => {
    throw new Error('Send failed');
});
```

### State Testing
```typescript
// Initial state
expect(store.getState().feature.loading).toBe(false);

// Action dispatch
store.dispatch(action);

// State verification
expect(store.getState().feature.loading).toBe(true);
```

## Debugging Tests

### Verbose Output
```bash
npm test -- --verbose
```

### Debug Specific Test
```bash
npm test -- --testNamePattern="should handle HTTP endpoints"
```

### Console Logging
```typescript
// Add debug output in tests
console.log('State:', store.getState());
console.log('Mock calls:', mockFetch.mock.calls);
```

## Continuous Integration

The test suite is designed to run in CI environments with:
- Headless browser support (jsdom)
- No external dependencies
- Deterministic test outcomes
- Proper cleanup between tests

## Contributing Tests

When adding new features:
1. Add unit tests for new functions
2. Add integration tests for feature combinations
3. Update mock setup if needed
4. Maintain coverage thresholds
5. Document new test patterns

## Known Limitations

- WebSocket tests use mocks (no real connections)
- HTTP tests use fetch mocks (no real network)
- Time-based tests may be flaky in slow environments
- Some browser-specific APIs are mocked

## Future Improvements

- Add E2E tests with real servers
- Performance benchmarking
- Cross-browser compatibility testing
- Load testing for concurrent scenarios 