import {
    getCacheKey,
    getCachedResponse,
    setCachedResponse,
    clearCachedResponse,
    clearAllCachedResponses,
    getCacheStats,
    cleanupMemoryCache
} from '../utils';

describe('Memory Cache Implementation', () => {
    beforeEach(() => {
        // Clear all caches before each test
        clearAllCachedResponses('memory');
        clearAllCachedResponses('localStorage');
        clearAllCachedResponses('sessionStorage');
    });

    afterEach(() => {
        // Clean up after each test
        clearAllCachedResponses('memory');
    });

    describe('Cache Key Generation', () => {
        test('should generate standard cache key', () => {
            const key = getCacheKey('/api/users');
            expect(key).toBe('redux-unified:cache:/api/users');
        });

        test('should use custom key when provided', () => {
            const key = getCacheKey('/api/users', 'custom-user-cache');
            expect(key).toBe('redux-unified:cache:custom-user-cache');
        });
    });

    describe('Memory Cache Operations', () => {
        test('should store and retrieve data from memory cache', () => {
            const key = 'test-key';
            const data = { id: 1, name: 'Test User' };

            setCachedResponse(key, data, 300000, 'memory');
            const retrieved = getCachedResponse(key, 'memory');

            expect(retrieved).toEqual(data);
        });

        test('should return null for non-existent keys', () => {
            const result = getCachedResponse('non-existent-key', 'memory');
            expect(result).toBeNull();
        });

        test('should handle cache expiration', (done) => {
            const key = 'expiring-key';
            const data = { test: 'data' };
            const shortTTL = 50; // 50ms

            setCachedResponse(key, data, shortTTL, 'memory');

            // Should be available immediately
            expect(getCachedResponse(key, 'memory')).toEqual(data);

            // Should be expired after TTL
            setTimeout(() => {
                expect(getCachedResponse(key, 'memory')).toBeNull();
                done();
            }, 100);
        });

        test('should clear specific cache entry', () => {
            const key = 'test-key';
            const data = { test: 'data' };

            setCachedResponse(key, data, 300000, 'memory');
            expect(getCachedResponse(key, 'memory')).toEqual(data);

            clearCachedResponse(key, 'memory');
            expect(getCachedResponse(key, 'memory')).toBeNull();
        });

        test('should clear all cache entries', () => {
            const key1 = 'key1';
            const key2 = 'key2';
            const data1 = { test: 'data1' };
            const data2 = { test: 'data2' };

            setCachedResponse(key1, data1, 300000, 'memory');
            setCachedResponse(key2, data2, 300000, 'memory');

            expect(getCachedResponse(key1, 'memory')).toEqual(data1);
            expect(getCachedResponse(key2, 'memory')).toEqual(data2);

            clearAllCachedResponses('memory');

            expect(getCachedResponse(key1, 'memory')).toBeNull();
            expect(getCachedResponse(key2, 'memory')).toBeNull();
        });

        test('should provide cache statistics', () => {
            const key1 = 'stats-key1';
            const key2 = 'stats-key2';
            const data = { test: 'data' };

            setCachedResponse(key1, data, 300000, 'memory');
            setCachedResponse(key2, data, 300000, 'memory');

            const stats = getCacheStats('memory');
            expect(stats.size).toBe(2);
            expect(stats.keys).toContain(key1);
            expect(stats.keys).toContain(key2);
        });

        test('should handle cache cleanup', (done) => {
            const key1 = 'cleanup-key1';
            const key2 = 'cleanup-key2';
            const data = { test: 'data' };

            // Set one with very short TTL, one with long TTL
            setCachedResponse(key1, data, 1, 'memory'); // 1ms TTL
            setCachedResponse(key2, data, 300000, 'memory'); // 5min TTL

            // Wait for first cache to expire
            setTimeout(() => {
                cleanupMemoryCache();
                
                const stats = getCacheStats('memory');
                expect(stats.size).toBe(1);
                expect(stats.keys).toContain(key2);
                expect(stats.keys).not.toContain(key1);
                done();
            }, 10);
        });

        test('should handle concurrent cache operations', () => {
            const key = 'concurrent-key';
            const data1 = { version: 1 };
            const data2 = { version: 2 };

            // Set initial data
            setCachedResponse(key, data1, 300000, 'memory');
            expect(getCachedResponse(key, 'memory')).toEqual(data1);

            // Overwrite with new data
            setCachedResponse(key, data2, 300000, 'memory');
            expect(getCachedResponse(key, 'memory')).toEqual(data2);
        });

        test('should handle complex data structures', () => {
            const key = 'complex-key';
            const complexData = {
                user: {
                    id: 1,
                    name: 'John Doe',
                    profile: {
                        age: 30,
                        preferences: ['coding', 'reading'],
                        settings: {
                            theme: 'dark',
                            notifications: true
                        }
                    }
                },
                metadata: {
                    lastLogin: new Date().toISOString(),
                    permissions: ['read', 'write']
                }
            };

            setCachedResponse(key, complexData, 300000, 'memory');
            const retrieved = getCachedResponse(key, 'memory');

            expect(retrieved).toEqual(complexData);
            expect(retrieved.user.profile.preferences).toEqual(['coding', 'reading']);
            expect(retrieved.metadata.permissions).toEqual(['read', 'write']);
        });
    });

    describe('Cross-Storage Compatibility', () => {
        test('should work independently across storage types', () => {
            const key = 'cross-storage-key';
            const memoryData = { storage: 'memory' };
            const localData = { storage: 'localStorage' };

            setCachedResponse(key, memoryData, 300000, 'memory');
            setCachedResponse(key, localData, 300000, 'localStorage');

            expect(getCachedResponse(key, 'memory')).toEqual(memoryData);
            expect(getCachedResponse(key, 'localStorage')).toEqual(localData);
        });

        test('should handle storage unavailability gracefully', () => {
            const key = 'unavailable-storage-key';
            const data = { test: 'data' };

            // Mock localStorage as undefined (Node.js environment)
            const originalLocalStorage = global.localStorage;
            // @ts-ignore
            delete global.localStorage;

            setCachedResponse(key, data, 300000, 'localStorage');
            const result = getCachedResponse(key, 'localStorage');

            expect(result).toBeNull();

            // Restore localStorage
            global.localStorage = originalLocalStorage;
        });
    });

    describe('Performance and Memory Management', () => {
        test('should handle large number of cache entries', () => {
            const entriesCount = 1000;
            const data = { test: 'data' };

            // Add many entries
            for (let i = 0; i < entriesCount; i++) {
                setCachedResponse(`key-${i}`, data, 300000, 'memory');
            }

            const stats = getCacheStats('memory');
            expect(stats.size).toBe(entriesCount);

            // Verify random entries
            expect(getCachedResponse('key-100', 'memory')).toEqual(data);
            expect(getCachedResponse('key-500', 'memory')).toEqual(data);
            expect(getCachedResponse('key-999', 'memory')).toEqual(data);
        });

        test('should automatically clean up expired entries', (done) => {
            const key1 = 'auto-cleanup-1';
            const key2 = 'auto-cleanup-2';
            const data = { test: 'data' };

            // Set entries with very short TTL
            setCachedResponse(key1, data, 20, 'memory'); // 20ms
            setCachedResponse(key2, data, 40, 'memory'); // 40ms

            // Check initial state
            expect(getCacheStats('memory').size).toBe(2);

            // After 30ms, first should be auto-cleaned
            setTimeout(() => {
                expect(getCachedResponse(key1, 'memory')).toBeNull();
                expect(getCachedResponse(key2, 'memory')).toEqual(data);
                
                // After 50ms, both should be cleaned
                setTimeout(() => {
                    expect(getCachedResponse(key2, 'memory')).toBeNull();
                    expect(getCacheStats('memory').size).toBe(0);
                    done();
                }, 30);
            }, 30);
        });
    });

    describe('Error Handling', () => {
        test('should handle cache operations when errors occur', () => {
            // These operations should not throw errors
            expect(() => {
                setCachedResponse('error-key', undefined, 300000, 'memory');
                getCachedResponse('error-key', 'memory');
                clearCachedResponse('non-existent', 'memory');
                clearAllCachedResponses('memory');
                getCacheStats('memory');
                cleanupMemoryCache();
            }).not.toThrow();
        });

        test('should handle invalid TTL values gracefully', () => {
            const key = 'invalid-ttl-key';
            const data = { test: 'data' };

            // Should handle negative TTL
            setCachedResponse(key, data, -1000, 'memory');
            expect(getCachedResponse(key, 'memory')).toBeNull(); // Should be immediately expired

            // Should handle zero TTL
            setCachedResponse(key, data, 0, 'memory');
            expect(getCachedResponse(key, 'memory')).toBeNull(); // Should be immediately expired
        });
    });
}); 