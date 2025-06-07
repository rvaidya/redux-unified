/**
 * Tests for HTTP middleware functionality
 */

import './setup';
import { httpMiddleware, configureHttpMiddleware, HTTP_ACTION } from '../middleware/httpMiddleware';
import { configureStore } from '@reduxjs/toolkit';
import { mockFetch, createMockResponse, flushPromises } from './setup';

describe('HTTP Middleware', () => {
    let store: any;
    let dispatch: jest.Mock;
    let next: jest.Mock;

    beforeEach(() => {
        dispatch = jest.fn();
        next = jest.fn();
        store = {
            dispatch,
            getState: jest.fn(() => ({}))
        };

        // Reset HTTP middleware configuration
        configureHttpMiddleware({
            baseURL: 'http://localhost:8000',
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    });

    describe('Basic middleware functionality', () => {
        test('should pass through non-HTTP actions', () => {
            const action = { type: 'REGULAR_ACTION', payload: 'test' };
            const middleware = httpMiddleware(store)(next);

            middleware(action);

            expect(next).toHaveBeenCalledWith(action);
            expect(dispatch).not.toHaveBeenCalled();
        });

        test('should handle HTTP actions', async () => {
            const httpAction = {
                type: 'FETCH_DATA',
                [HTTP_ACTION]: {
                    endpoint: 'users',
                    method: 'GET',
                    types: ['FETCH_DATA_REQUEST', 'FETCH_DATA_SUCCESS', 'FETCH_DATA_ERROR']
                }
            };

            const responseData = { id: 1, name: 'John' };
            mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

            const middleware = httpMiddleware(store)(next);
            middleware(httpAction);

            // Should dispatch request action immediately
            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DATA_REQUEST',
                payload: undefined
            });

            await flushPromises();

            // Should dispatch success action after fetch
            expect(dispatch).toHaveBeenCalledWith({
                type: 'FETCH_DATA_SUCCESS',
                payload: responseData,
                meta: undefined
            });
        });
    });

    describe('HTTP request handling', () => {
        test('should make GET request with correct parameters', async () => {
            const httpAction = {
                type: 'FETCH_USER',
                [HTTP_ACTION]: {
                    endpoint: 'http://localhost:8000/users/123',
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    types: ['REQUEST', 'SUCCESS', 'ERROR']
                }
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({ id: 123 }));

            const middleware = httpMiddleware(store)(next);
            middleware(httpAction);

            await flushPromises();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/users/123', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 10000
            });
        });

        test('should make POST request with body', async () => {
            const requestBody = { name: 'John', email: 'john@example.com' };
            const httpAction = {
                type: 'CREATE_USER',
                [HTTP_ACTION]: {
                    endpoint: 'http://localhost:8000/users',
                    method: 'POST',
                    body: requestBody,
                    types: ['REQUEST', 'SUCCESS', 'ERROR']
                }
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({ id: 1, ...requestBody }));

            const middleware = httpMiddleware(store)(next);
            middleware(httpAction);

            await flushPromises();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                timeout: 10000
            });
        });

        test('should handle HTTP errors', async () => {
            const httpAction = {
                type: 'FETCH_DATA',
                [HTTP_ACTION]: {
                    endpoint: 'http://localhost:8000/users',
                    method: 'GET',
                    types: ['REQUEST', 'SUCCESS', 'ERROR']
                }
            };

            const errorResponse = { message: 'User not found' };
            mockFetch.mockResolvedValueOnce(createMockResponse(errorResponse, 404, false));

            const middleware = httpMiddleware(store)(next);
            middleware(httpAction);

            await flushPromises();

            expect(dispatch).toHaveBeenCalledWith({
                type: 'ERROR',
                payload: {
                    message: 'User not found',
                    status: 404,
                    code: undefined,
                    data: errorResponse,
                    timestamp: expect.any(Number)
                },
                error: true,
                meta: undefined
            });
        });

        test('should handle network errors', async () => {
            const httpAction = {
                type: 'FETCH_DATA',
                [HTTP_ACTION]: {
                    endpoint: 'http://localhost:8000/users',
                    method: 'GET',
                    types: ['REQUEST', 'SUCCESS', 'ERROR']
                }
            };

            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const middleware = httpMiddleware(store)(next);
            middleware(httpAction);

            await flushPromises();

            expect(dispatch).toHaveBeenCalledWith({
                type: 'ERROR',
                payload: {
                    message: 'Network error',
                    status: 0,
                    code: 'NETWORK_ERROR',
                    data: expect.any(Error),
                    timestamp: expect.any(Number)
                },
                error: true,
                meta: undefined
            });
        });
    });

    describe('Authentication', () => {
        test('should add bearer token to requests', async () => {
            configureHttpMiddleware({
                baseURL: 'http://localhost:8000',
                auth: {
                    type: 'bearer',
                    getToken: () => 'test-token'
                }
            });

            const httpAction = {
                type: 'FETCH_DATA',
                [HTTP_ACTION]: {
                    endpoint: 'http://localhost:8000/users',
                    method: 'GET',
                    types: ['REQUEST', 'SUCCESS', 'ERROR']
                }
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({}));

            const middleware = httpMiddleware(store)(next);
            middleware(httpAction);

            await flushPromises();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/users', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                },
                timeout: 10000
            });
        });

        test('should handle custom auth headers', async () => {
            configureHttpMiddleware({
                baseURL: 'http://localhost:8000',
                auth: {
                    type: 'custom',
                    tokenKey: 'X-API-Key',
                    getToken: () => 'custom-key'
                }
            });

            const httpAction = {
                type: 'FETCH_DATA',
                [HTTP_ACTION]: {
                    endpoint: 'http://localhost:8000/users',
                    method: 'GET',
                    types: ['REQUEST', 'SUCCESS', 'ERROR']
                }
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({}));

            const middleware = httpMiddleware(store)(next);
            middleware(httpAction);

            await flushPromises();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/users', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'custom-key'
                },
                timeout: 10000
            });
        });

        test('should not add auth headers when token is missing', async () => {
            configureHttpMiddleware({
                baseURL: 'http://localhost:8000',
                auth: {
                    type: 'bearer',
                    getToken: () => null
                }
            });

            const httpAction = {
                type: 'FETCH_DATA',
                [HTTP_ACTION]: {
                    endpoint: 'http://localhost:8000/users',
                    method: 'GET',
                    types: ['REQUEST', 'SUCCESS', 'ERROR']
                }
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({}));

            const middleware = httpMiddleware(store)(next);
            middleware(httpAction);

            await flushPromises();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/users', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
        });
    });

    describe('Caching', () => {
        test('should cache GET responses when enabled', async () => {
            configureHttpMiddleware({
                baseURL: 'http://localhost:8000',
                cache: {
                    enabled: true,
                    ttl: 60000
                }
            });

            const httpAction = {
                type: 'FETCH_DATA',
                [HTTP_ACTION]: {
                    endpoint: 'http://localhost:8000/users',
                    method: 'GET',
                    cache: true,
                    types: ['REQUEST', 'SUCCESS', 'ERROR']
                }
            };

            const responseData = { id: 1, name: 'John' };
            mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

            const middleware = httpMiddleware(store)(next);
            middleware(httpAction);

            await flushPromises();

            // Check that response was cached
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'http_cache_http://localhost:8000/users',
                expect.stringContaining('"data":{"id":1,"name":"John"}')
            );
        });

        test('should return cached response when available', async () => {
            // Pre-populate cache
            const cachedData = { id: 1, name: 'John' };
            const cacheEntry = {
                data: cachedData,
                timestamp: Date.now(),
                ttl: 60000
            };
            (localStorage.getItem as jest.Mock).mockReturnValueOnce(JSON.stringify(cacheEntry));

            const httpAction = {
                type: 'FETCH_DATA',
                [HTTP_ACTION]: {
                    endpoint: 'http://localhost:8000/users',
                    method: 'GET',
                    cache: true,
                    types: ['REQUEST', 'SUCCESS', 'ERROR']
                }
            };

            const middleware = httpMiddleware(store)(next);
            middleware(httpAction);

            await flushPromises();

            // Should not make HTTP request
            expect(mockFetch).not.toHaveBeenCalled();

            // Should dispatch cached response
            expect(dispatch).toHaveBeenCalledWith({
                type: 'SUCCESS',
                payload: cachedData,
                meta: { fromCache: true }
            });
        });

        test('should not cache non-GET requests', async () => {
            configureHttpMiddleware({
                baseURL: 'http://localhost:8000',
                cache: {
                    enabled: true,
                    ttl: 60000
                }
            });

            const httpAction = {
                type: 'CREATE_USER',
                [HTTP_ACTION]: {
                    endpoint: 'http://localhost:8000/users',
                    method: 'POST',
                    body: { name: 'John' },
                    cache: true,
                    types: ['REQUEST', 'SUCCESS', 'ERROR']
                }
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({ id: 1 }));

            const middleware = httpMiddleware(store)(next);
            middleware(httpAction);

            await flushPromises();

            // Should not set cache for POST request
            expect(localStorage.setItem).not.toHaveBeenCalled();
        });
    });

    describe('Metadata handling', () => {
        test('should include meta in success action', async () => {
            const metaFunction = jest.fn().mockReturnValue({ userId: 123 });
            const httpAction = {
                type: 'FETCH_DATA',
                [HTTP_ACTION]: {
                    endpoint: 'http://localhost:8000/users',
                    method: 'GET',
                    meta: { userId: 123 },
                    types: ['REQUEST', 'SUCCESS', 'ERROR']
                }
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({ id: 1 }));

            const middleware = httpMiddleware(store)(next);
            middleware(httpAction);

            await flushPromises();

            expect(dispatch).toHaveBeenCalledWith({
                type: 'SUCCESS',
                payload: { id: 1 },
                meta: { userId: 123 }
            });
        });
    });

    describe('Store integration', () => {
        test('should work with real Redux store', async () => {
            const initialState = { loading: false, data: null, error: null };
            const reducer = (state = initialState, action: any) => {
                switch (action.type) {
                    case 'FETCH_DATA_REQUEST':
                        return { ...state, loading: true };
                    case 'FETCH_DATA_SUCCESS':
                        return { ...state, loading: false, data: action.payload };
                    case 'FETCH_DATA_ERROR':
                        return { ...state, loading: false, error: action.payload };
                    default:
                        return state;
                }
            };

            const store = configureStore({
                reducer: { data: reducer },
                middleware: (getDefaultMiddleware) => 
                    getDefaultMiddleware().concat(httpMiddleware)
            });

            const httpAction = {
                type: 'FETCH_DATA',
                [HTTP_ACTION]: {
                    endpoint: 'http://localhost:8000/users',
                    method: 'GET',
                    types: ['FETCH_DATA_REQUEST', 'FETCH_DATA_SUCCESS', 'FETCH_DATA_ERROR']
                }
            };

            const responseData = { id: 1, name: 'John' };
            mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

            store.dispatch(httpAction);

            // Check request state
            expect(store.getState().data.loading).toBe(true);

            await flushPromises();

            // Check success state
            expect(store.getState().data.loading).toBe(false);
            expect(store.getState().data.data).toEqual(responseData);
        });
    });
}); 