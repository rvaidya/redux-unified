import {
    setCachedResponse,
    getCachedResponse,
    configureMemoryCache,
    getMemoryCacheLRUStats,
    getWebStorageLRUStats,
    evictLRUFromWebStorage,
    clearAllCachedResponses,
    getCacheKey
} from '../utils';

describe('LRU Cache Implementation', () => {
    beforeEach(() => {
        // Clear all caches and reset memory cache
        clearAllCachedResponses('memory');
        clearAllCachedResponses('localStorage');
        clearAllCachedResponses('sessionStorage');
        
        // Reset memory cache configuration
        configureMemoryCache({ maxSize: 1000, enableLRU: true });
    });

    afterEach(() => {
        clearAllCachedResponses('memory');
        clearAllCachedResponses('localStorage');
        clearAllCachedResponses('sessionStorage');
    });

    describe('Memory Cache LRU', () => {
        test('should evict LRU item when cache is full', () => {
            // Configure small cache size
            configureMemoryCache({ maxSize: 3, enableLRU: true });

            // Add items to fill cache
            setCachedResponse('item1', { value: 1 }, 300000, 'memory');
            setCachedResponse('item2', { value: 2 }, 300000, 'memory');
            setCachedResponse('item3', { value: 3 }, 300000, 'memory');

            const stats = getMemoryCacheLRUStats();
            expect(stats.size).toBe(3);
            expect(stats.maxSize).toBe(3);

            // Access item1 to make it recently used
            getCachedResponse('item1', 'memory');

            // Add new item - should evict item2 (least recently used)
            setCachedResponse('item4', { value: 4 }, 300000, 'memory');

            expect(getMemoryCacheLRUStats().size).toBe(3);
            expect(getCachedResponse('item1', 'memory')).toEqual({ value: 1 }); // Still there
            expect(getCachedResponse('item2', 'memory')).toBeNull(); // Evicted
            expect(getCachedResponse('item3', 'memory')).toEqual({ value: 3 }); // Still there
            expect(getCachedResponse('item4', 'memory')).toEqual({ value: 4 }); // New item
        });

        test('should track access counts and times', () => {
            setCachedResponse('tracked-item', { data: 'test' }, 300000, 'memory');
            
            // Access the item multiple times
            getCachedResponse('tracked-item', 'memory');
            getCachedResponse('tracked-item', 'memory');
            getCachedResponse('tracked-item', 'memory');

            const stats = getMemoryCacheLRUStats();
            expect(stats.size).toBe(1);
            expect(stats.oldestAccess).toBeLessThanOrEqual(Date.now());
            expect(stats.newestAccess).toBeLessThanOrEqual(Date.now());
        });

        test('should allow disabling LRU', () => {
            configureMemoryCache({ maxSize: 2, enableLRU: false });

            setCachedResponse('item1', { value: 1 }, 300000, 'memory');
            setCachedResponse('item2', { value: 2 }, 300000, 'memory');
            
            const statsBefore = getMemoryCacheLRUStats();
            expect(statsBefore.size).toBe(2);
            expect(statsBefore.lruEnabled).toBe(false);

            // With LRU disabled, cache can grow beyond maxSize
            setCachedResponse('item3', { value: 3 }, 300000, 'memory');
            
            const statsAfter = getMemoryCacheLRUStats();
            expect(statsAfter.size).toBe(3); // No eviction occurred
        });

        test('should handle cache reconfiguration', () => {
            // Start with larger cache
            configureMemoryCache({ maxSize: 5, enableLRU: true });
            
            // Fill with items
            for (let i = 0; i < 5; i++) {
                setCachedResponse(`item${i}`, { value: i }, 300000, 'memory');
            }
            
            expect(getMemoryCacheLRUStats().size).toBe(5);

            // Reduce cache size - should trigger eviction
            configureMemoryCache({ maxSize: 3 });
            
            const stats = getMemoryCacheLRUStats();
            expect(stats.size).toBe(3);
            expect(stats.maxSize).toBe(3);
        });
    });

    describe('LocalStorage LRU', () => {
        test('should implement LRU for localStorage', () => {
            const config = { maxSize: 3, enableLRU: true };

            // Fill cache with proper cache keys
            const key1 = getCacheKey('local1');
            const key2 = getCacheKey('local2');
            const key3 = getCacheKey('local3');
            const key4 = getCacheKey('local4');

            setCachedResponse(key1, { value: 1 }, 300000, 'localStorage', config);
            setCachedResponse(key2, { value: 2 }, 300000, 'localStorage', config);
            setCachedResponse(key3, { value: 3 }, 300000, 'localStorage', config);

            let stats = getWebStorageLRUStats('localStorage');
            expect(stats.size).toBe(3);

            // Access local1 to make it recently used
            getCachedResponse(key1, 'localStorage');

            // Add new item - should evict local2 (LRU)
            setCachedResponse(key4, { value: 4 }, 300000, 'localStorage', config);

            stats = getWebStorageLRUStats('localStorage');
            expect(stats.size).toBe(3);
            expect(getCachedResponse(key1, 'localStorage')).toEqual({ value: 1 });
            expect(getCachedResponse(key2, 'localStorage')).toBeNull();
            expect(getCachedResponse(key3, 'localStorage')).toEqual({ value: 3 });
            expect(getCachedResponse(key4, 'localStorage')).toEqual({ value: 4 });
        });

        test('should track access counts in localStorage', () => {
            const key = getCacheKey('access-test');
            setCachedResponse(key, { data: 'test' }, 300000, 'localStorage');
            
            // Access multiple times
            getCachedResponse(key, 'localStorage');
            getCachedResponse(key, 'localStorage');
            getCachedResponse(key, 'localStorage');

            const stats = getWebStorageLRUStats('localStorage');
            const cacheKey = Object.keys(stats.accessCounts)[0];
            expect(stats.accessCounts[cacheKey]).toBe(4); // 1 initial + 3 accesses
        });

        test('should manually evict LRU items from localStorage', () => {
            // Add multiple items
            for (let i = 0; i < 5; i++) {
                const key = getCacheKey(`manual-${i}`);
                setCachedResponse(key, { value: i }, 300000, 'localStorage');
            }

            expect(getWebStorageLRUStats('localStorage').size).toBe(5);

            // Manually evict to reduce to 3 items
            const evictedCount = evictLRUFromWebStorage('localStorage', 3);
            
            expect(evictedCount).toBe(2);
            expect(getWebStorageLRUStats('localStorage').size).toBe(3);
        });
    });

    describe('SessionStorage LRU', () => {
        test('should implement LRU for sessionStorage', () => {
            const config = { maxSize: 2, enableLRU: true };

            const key1 = getCacheKey('session1');
            const key2 = getCacheKey('session2');
            const key3 = getCacheKey('session3');

            setCachedResponse(key1, { value: 1 }, 300000, 'sessionStorage', config);
            setCachedResponse(key2, { value: 2 }, 300000, 'sessionStorage', config);

            let stats = getWebStorageLRUStats('sessionStorage');
            expect(stats.size).toBe(2);

            // Add third item - should evict first one
            setCachedResponse(key3, { value: 3 }, 300000, 'sessionStorage', config);

            stats = getWebStorageLRUStats('sessionStorage');
            expect(stats.size).toBe(2);
            expect(getCachedResponse(key1, 'sessionStorage')).toBeNull();
            expect(getCachedResponse(key2, 'sessionStorage')).toEqual({ value: 2 });
            expect(getCachedResponse(key3, 'sessionStorage')).toEqual({ value: 3 });
        });

        test('should handle sessionStorage LRU statistics', () => {
            const key = getCacheKey('stats-test');
            setCachedResponse(key, { data: 'test' }, 300000, 'sessionStorage');
            
            const statsBefore = getWebStorageLRUStats('sessionStorage');
            expect(statsBefore.size).toBe(1);
            expect(statsBefore.oldestAccess).toBeLessThanOrEqual(Date.now());

            // Wait and access again
            setTimeout(() => {
                getCachedResponse(key, 'sessionStorage');
                
                const statsAfter = getWebStorageLRUStats('sessionStorage');
                expect(statsAfter.newestAccess).toBeGreaterThan(statsBefore.oldestAccess!);
            }, 10);
        });
    });

    describe('Cross-Storage LRU Behavior', () => {
        test('should handle LRU independently across storage types', () => {
            const config = { maxSize: 2, enableLRU: true };

            // Use different keys for different storage types to avoid confusion
            const memoryKey = 'test-key-memory';
            const localKey = getCacheKey('test-key-local');
            const sessionKey = getCacheKey('test-key-session');

            // Fill each storage type
            setCachedResponse(memoryKey, { storage: 'memory' }, 300000, 'memory');
            setCachedResponse(localKey, { storage: 'localStorage' }, 300000, 'localStorage', config);
            setCachedResponse(sessionKey, { storage: 'sessionStorage' }, 300000, 'sessionStorage', config);

            // Each should have independent data
            expect(getCachedResponse(memoryKey, 'memory')).toEqual({ storage: 'memory' });
            expect(getCachedResponse(localKey, 'localStorage')).toEqual({ storage: 'localStorage' });
            expect(getCachedResponse(sessionKey, 'sessionStorage')).toEqual({ storage: 'sessionStorage' });

            // LRU should work independently
            configureMemoryCache({ maxSize: 1, enableLRU: true });
            setCachedResponse('new-key', { data: 'new' }, 300000, 'memory');

            // Memory cache should evict, but others shouldn't be affected
            expect(getCachedResponse(memoryKey, 'memory')).toBeNull();
            expect(getCachedResponse(localKey, 'localStorage')).toEqual({ storage: 'localStorage' });
            expect(getCachedResponse(sessionKey, 'sessionStorage')).toEqual({ storage: 'sessionStorage' });
        });

        test('should handle storage unavailability in LRU operations', () => {
            // Mock storage as unavailable
            const originalLocalStorage = global.localStorage;
            // @ts-ignore
            delete global.localStorage;

            const config = { maxSize: 2, enableLRU: true };
            
            // Should not throw errors
            expect(() => {
                setCachedResponse('unavailable-test', { data: 'test' }, 300000, 'localStorage', config);
                getCachedResponse('unavailable-test', 'localStorage');
                getWebStorageLRUStats('localStorage');
                evictLRUFromWebStorage('localStorage', 1);
            }).not.toThrow();

            // Restore storage
            global.localStorage = originalLocalStorage;
        });
    });

    describe('Performance and Edge Cases', () => {
        test('should handle rapid access pattern changes', () => {
            configureMemoryCache({ maxSize: 3, enableLRU: true });

            // Add items
            setCachedResponse('rapid1', { value: 1 }, 300000, 'memory');
            setCachedResponse('rapid2', { value: 2 }, 300000, 'memory');
            setCachedResponse('rapid3', { value: 3 }, 300000, 'memory');

            // Rapidly change access patterns
            for (let i = 0; i < 10; i++) {
                getCachedResponse('rapid1', 'memory');
                getCachedResponse('rapid3', 'memory');
                
                if (i % 2 === 0) {
                    getCachedResponse('rapid2', 'memory');
                }
            }

            // Add new item - rapid2 should be evicted as it was accessed less recently
            setCachedResponse('rapid4', { value: 4 }, 300000, 'memory');

            const stats = getMemoryCacheLRUStats();
            expect(stats.size).toBe(3);
            expect(getCachedResponse('rapid1', 'memory')).toEqual({ value: 1 });
            expect(getCachedResponse('rapid3', 'memory')).toEqual({ value: 3 });
            expect(getCachedResponse('rapid4', 'memory')).toEqual({ value: 4 });
        });

        test('should handle large-scale LRU operations efficiently', () => {
            const startTime = Date.now();
            
            // Configure larger cache
            configureMemoryCache({ maxSize: 100, enableLRU: true });

            // Add many items
            for (let i = 0; i < 150; i++) {
                setCachedResponse(`large-${i}`, { value: i }, 300000, 'memory');
            }

            const endTime = Date.now();
            const stats = getMemoryCacheLRUStats();

            // Should maintain max size through LRU eviction
            expect(stats.size).toBe(100);
            expect(stats.maxSize).toBe(100);
            
            // Should complete in reasonable time (less than 100ms)
            expect(endTime - startTime).toBeLessThan(100);

            // Recent items should still be in cache
            expect(getCachedResponse('large-149', 'memory')).toEqual({ value: 149 });
            expect(getCachedResponse('large-100', 'memory')).toEqual({ value: 100 });
            
            // Early items should be evicted
            expect(getCachedResponse('large-0', 'memory')).toBeNull();
            expect(getCachedResponse('large-49', 'memory')).toBeNull();
        });

        test('should handle mixed TTL and LRU eviction', () => {
            configureMemoryCache({ maxSize: 3, enableLRU: true });

            // Add items with different TTLs
            setCachedResponse('short-ttl', { value: 'short' }, 50, 'memory'); // 50ms
            setCachedResponse('long-ttl', { value: 'long' }, 300000, 'memory'); // 5min
            setCachedResponse('medium-ttl', { value: 'medium' }, 200, 'memory'); // 200ms

            expect(getMemoryCacheLRUStats().size).toBe(3);

            // Wait for short TTL to expire
            setTimeout(() => {
                // Access to clean up expired entries
                getCachedResponse('long-ttl', 'memory');
                
                const stats = getMemoryCacheLRUStats();
                expect(stats.size).toBeLessThan(3); // Some should be expired
                expect(getCachedResponse('short-ttl', 'memory')).toBeNull();
                expect(getCachedResponse('long-ttl', 'memory')).toEqual({ value: 'long' });
            }, 100);
        });
    });

    describe('LRU Configuration and Flexibility', () => {
        test('should allow runtime configuration changes', () => {
            // Start with LRU disabled
            configureMemoryCache({ maxSize: 3, enableLRU: false });
            
            // Fill beyond max size
            for (let i = 0; i < 5; i++) {
                setCachedResponse(`config-${i}`, { value: i }, 300000, 'memory');
            }

            expect(getMemoryCacheLRUStats().size).toBe(5);
            expect(getMemoryCacheLRUStats().lruEnabled).toBe(false);

            // Enable LRU - should trigger immediate eviction
            configureMemoryCache({ enableLRU: true });
            
            const stats = getMemoryCacheLRUStats();
            expect(stats.size).toBe(3); // Should be reduced to maxSize
            expect(stats.lruEnabled).toBe(true);
        });

        test('should provide comprehensive LRU statistics', () => {
            configureMemoryCache({ maxSize: 5, enableLRU: true });

            // Add items with delays to create access pattern
            setCachedResponse('stat1', { value: 1 }, 300000, 'memory');
            
            setTimeout(() => {
                setCachedResponse('stat2', { value: 2 }, 300000, 'memory');
                getCachedResponse('stat1', 'memory'); // Update access time
                
                const stats = getMemoryCacheLRUStats();
                expect(stats.size).toBe(2);
                expect(stats.maxSize).toBe(5);
                expect(stats.lruEnabled).toBe(true);
                expect(stats.oldestAccess).toBeLessThanOrEqual(stats.newestAccess!);
                expect(typeof stats.oldestAccess).toBe('number');
                expect(typeof stats.newestAccess).toBe('number');
            }, 10);
        });
    });
}); 