/**
 * Tests for Utils module
 */

import {
    pathToUrl,
    getApiPath,
    createHttpClient,
    getAuthHeader,
    createWebSocketClient,
    getCacheKey,
    getCachedResponse,
    setCachedResponse
} from '../utils/index';

// Mock environment utilities
jest.mock('../utils/environment', () => ({
    envFetch: jest.fn(),
    envWebSocket: jest.fn(),
    isHttpAvailable: jest.fn(() => true),
    isWebSocketAvailable: jest.fn(() => true),
    getEnvironmentInfo: jest.fn(() => ({ type: 'test' }))
}));

import { envFetch, envWebSocket } from '../utils/environment';

const mockEnvFetch = envFetch as jest.MockedFunction<typeof envFetch>;
const mockEnvWebSocket = envWebSocket as jest.MockedFunction<typeof envWebSocket>;

// Mock storage for cache tests
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
};

const mockSessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage
});

Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage
});

describe('Utils Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.getItem.mockClear();
        mockLocalStorage.setItem.mockClear();
        mockSessionStorage.getItem.mockClear();
        mockSessionStorage.setItem.mockClear();
        
        // Reset Date.now for cache tests
        jest.spyOn(Date, 'now').mockReturnValue(1000000);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('pathToUrl', () => {
        test('should convert simple path without parameters', () => {
            const result = pathToUrl('/users');
            expect(result).toBe('/users');
        });

        test('should replace path parameters', () => {
            const result = pathToUrl('/users/:id', { id: 123 });
            expect(result).toBe('/users/123');
        });

        test('should replace multiple path parameters', () => {
            const result = pathToUrl('/users/:userId/posts/:postId', {
                userId: 123,
                postId: 456
            });
            expect(result).toBe('/users/123/posts/456');
        });

        test('should add query parameters', () => {
            const result = pathToUrl('/users', undefined, {
                page: 1,
                limit: 10
            });
            expect(result).toBe('/users?page=1&limit=10');
        });

        test('should handle both path and query parameters', () => {
            const result = pathToUrl('/users/:id', { id: 123 }, { include: 'posts' });
            expect(result).toBe('/users/123?include=posts');
        });

        test('should handle URLs that already have query parameters', () => {
            const result = pathToUrl('/users?existing=true', undefined, { new: 'param' });
            expect(result).toBe('/users?existing=true&new=param');
        });

        test('should convert number parameters to strings', () => {
            const result = pathToUrl('/users/:id', { id: 123 }, { limit: 10 });
            expect(result).toBe('/users/123?limit=10');
        });

        test('should handle empty parameters objects', () => {
            const result = pathToUrl('/users', {}, {});
            expect(result).toBe('/users');
        });
    });

    describe('getApiPath', () => {
        test('should return endpoint when no baseURL provided', () => {
            const result = getApiPath('/users');
            expect(result).toBe('/users');
        });

        test('should combine baseURL and endpoint', () => {
            const result = getApiPath('/users', 'https://api.example.com');
            expect(result).toBe('https://api.example.com/users');
        });

        test('should handle baseURL with trailing slash', () => {
            const result = getApiPath('/users', 'https://api.example.com/');
            expect(result).toBe('https://api.example.com/users');
        });

        test('should handle endpoint without leading slash', () => {
            const result = getApiPath('users', 'https://api.example.com');
            expect(result).toBe('https://api.example.com/users');
        });

        test('should handle both baseURL with trailing slash and endpoint without leading slash', () => {
            const result = getApiPath('users', 'https://api.example.com/');
            expect(result).toBe('https://api.example.com/users');
        });
    });

    describe('getAuthHeader', () => {
        test('should return empty object when no auth config', () => {
            const result = getAuthHeader();
            expect(result).toEqual({});
        });

        test('should return empty object when no getToken function', () => {
            const result = getAuthHeader({
                type: 'bearer'
            } as any);
            expect(result).toEqual({});
        });

        test('should return empty object when getToken returns no token', () => {
            const result = getAuthHeader({
                type: 'bearer',
                getToken: () => null
            } as any);
            expect(result).toEqual({});
        });

        test('should return bearer token header', () => {
            const result = getAuthHeader({
                type: 'bearer',
                tokenPrefix: 'Bearer',
                getToken: () => 'test-token'
            } as any);
            expect(result).toEqual({
                'Authorization': 'Bearer test-token'
            });
        });

        test('should return bearer token with default prefix', () => {
            const result = getAuthHeader({
                type: 'bearer',
                getToken: () => 'test-token'
            } as any);
            expect(result).toEqual({
                'Authorization': 'Bearer test-token'
            });
        });

        test('should return basic auth header', () => {
            const result = getAuthHeader({
                type: 'basic',
                getToken: () => 'encoded-credentials'
            } as any);
            expect(result).toEqual({
                'Authorization': 'Basic encoded-credentials'
            });
        });

        test('should return custom auth header', () => {
            const result = getAuthHeader({
                type: 'custom',
                tokenKey: 'X-API-Key',
                getToken: () => 'custom-token'
            } as any);
            expect(result).toEqual({
                'X-API-Key': 'custom-token'
            });
        });

        test('should return custom auth header with default key', () => {
            const result = getAuthHeader({
                type: 'custom',
                getToken: () => 'custom-token'
            } as any);
            expect(result).toEqual({
                'Authorization': 'custom-token'
            });
        });

        test('should return empty object for unknown auth type', () => {
            const result = getAuthHeader({
                type: 'unknown' as any,
                getToken: () => 'token'
            });
            expect(result).toEqual({});
        });
    });

    describe('createHttpClient', () => {
        const config = {
            baseURL: 'https://api.example.com',
            headers: {
                'X-Custom': 'header'
            },
            auth: {
                type: 'bearer' as const,
                getToken: () => 'test-token'
            }
        };

        beforeEach(() => {
            mockEnvFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: 'test' })
            } as any);
        });

        test('should create GET request', async () => {
            const client = createHttpClient(config);
            await client.get('/users');

            expect(mockEnvFetch).toHaveBeenCalledWith(
                'https://api.example.com/users',
                {
                    method: 'GET',
                    headers: {
                        'X-Custom': 'header',
                        'Authorization': 'Bearer test-token'
                    }
                }
            );
        });

        test('should create POST request with data', async () => {
            const client = createHttpClient(config);
            const data = { name: 'John' };
            await client.post('/users', data);

            expect(mockEnvFetch).toHaveBeenCalledWith(
                'https://api.example.com/users',
                {
                    method: 'POST',
                    headers: {
                        'X-Custom': 'header',
                        'Authorization': 'Bearer test-token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                }
            );
        });

        test('should create POST request without data', async () => {
            const client = createHttpClient(config);
            await client.post('/users');

            expect(mockEnvFetch).toHaveBeenCalledWith(
                'https://api.example.com/users',
                {
                    method: 'POST',
                    headers: {
                        'X-Custom': 'header',
                        'Authorization': 'Bearer test-token',
                        'Content-Type': 'application/json'
                    },
                    body: undefined
                }
            );
        });

        test('should create PUT request', async () => {
            const client = createHttpClient(config);
            const data = { name: 'John Updated' };
            await client.put('/users/1', data);

            expect(mockEnvFetch).toHaveBeenCalledWith(
                'https://api.example.com/users/1',
                {
                    method: 'PUT',
                    headers: {
                        'X-Custom': 'header',
                        'Authorization': 'Bearer test-token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                }
            );
        });

        test('should create PATCH request', async () => {
            const client = createHttpClient(config);
            const data = { name: 'John Patched' };
            await client.patch('/users/1', data);

            expect(mockEnvFetch).toHaveBeenCalledWith(
                'https://api.example.com/users/1',
                {
                    method: 'PATCH',
                    headers: {
                        'X-Custom': 'header',
                        'Authorization': 'Bearer test-token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                }
            );
        });

        test('should create DELETE request', async () => {
            const client = createHttpClient(config);
            await client.delete('/users/1');

            expect(mockEnvFetch).toHaveBeenCalledWith(
                'https://api.example.com/users/1',
                {
                    method: 'DELETE',
                    headers: {
                        'X-Custom': 'header',
                        'Authorization': 'Bearer test-token'
                    }
                }
            );
        });

        test('should merge additional options', async () => {
            const client = createHttpClient(config);
            await client.get('/users', { signal: new AbortController().signal });

            expect(mockEnvFetch).toHaveBeenCalledWith(
                'https://api.example.com/users',
                expect.objectContaining({
                    method: 'GET',
                    signal: expect.any(AbortSignal)
                })
            );
        });
    });

    describe('getCacheKey', () => {
        test('should generate cache key from endpoint', () => {
            const result = getCacheKey('/users');
            expect(result).toBe('redux-unified:cache:/users');
        });

        test('should use custom key when provided', () => {
            const result = getCacheKey('/users', 'custom-key');
            expect(result).toBe('redux-unified:cache:custom-key');
        });

        test('should handle complex endpoints', () => {
            const result = getCacheKey('/users/123/posts?page=1');
            expect(result).toBe('redux-unified:cache:/users/123/posts?page=1');
        });
    });

    describe('Cache Storage Operations', () => {
        describe('getCachedResponse', () => {
            test('should return null when no cached data in localStorage', () => {
                mockLocalStorage.getItem.mockReturnValue(null);
                
                const result = getCachedResponse('test-key');
                expect(result).toBeNull();
                expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
            });

            test('should return null when cached data is expired', () => {
                const expiredData = JSON.stringify({
                    data: { test: 'data' },
                    expiry: 500000 // Expired (current time is 1000000)
                });
                mockLocalStorage.getItem.mockReturnValue(expiredData);
                
                const result = getCachedResponse('test-key');
                expect(result).toBeNull();
                expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
            });

            test('should return cached data when not expired', () => {
                const validData = JSON.stringify({
                    data: { test: 'data' },
                    expiry: 2000000 // Not expired
                });
                mockLocalStorage.getItem.mockReturnValue(validData);
                
                const result = getCachedResponse('test-key');
                expect(result).toEqual({ test: 'data' });
            });

            test('should handle sessionStorage', () => {
                const validData = JSON.stringify({
                    data: { test: 'session-data' },
                    expiry: 2000000
                });
                mockSessionStorage.getItem.mockReturnValue(validData);
                
                const result = getCachedResponse('test-key', 'sessionStorage');
                expect(result).toEqual({ test: 'session-data' });
                expect(mockSessionStorage.getItem).toHaveBeenCalledWith('test-key');
            });

            test('should handle memory storage (returns null)', () => {
                const result = getCachedResponse('test-key', 'memory');
                expect(result).toBeNull();
            });

            test('should handle invalid JSON gracefully', () => {
                mockLocalStorage.getItem.mockReturnValue('invalid-json');
                
                const result = getCachedResponse('test-key');
                expect(result).toBeNull();
            });
        });

        describe('setCachedResponse', () => {
            test('should cache data in localStorage with default TTL', () => {
                const data = { test: 'data' };
                setCachedResponse('test-key', data);

                expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                    'test-key',
                    JSON.stringify({
                        data,
                        expiry: 1000000 + 300000 // current time + default TTL
                    })
                );
            });

            test('should cache data with custom TTL', () => {
                const data = { test: 'data' };
                const customTTL = 600000;
                setCachedResponse('test-key', data, customTTL);

                expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                    'test-key',
                    JSON.stringify({
                        data,
                        expiry: 1000000 + customTTL
                    })
                );
            });

            test('should cache data in sessionStorage', () => {
                const data = { test: 'session-data' };
                setCachedResponse('test-key', data, 300000, 'sessionStorage');

                expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
                    'test-key',
                    JSON.stringify({
                        data,
                        expiry: 1000000 + 300000
                    })
                );
            });

            test('should handle memory storage (no-op)', () => {
                const data = { test: 'data' };
                setCachedResponse('test-key', data, 300000, 'memory');

                expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
                expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
            });
        });
    });
}); 