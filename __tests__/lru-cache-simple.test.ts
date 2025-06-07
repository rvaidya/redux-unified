import {
    setCachedResponse,
    getCachedResponse,
    configureMemoryCache,
    getMemoryCacheLRUStats,
    clearAllCachedResponses
} from '../utils';

describe('LRU Cache Simple Tests', () => {
    beforeEach(() => {
        clearAllCachedResponses('memory');
        configureMemoryCache({ maxSize: 1000, enableLRU: true });
    });

    afterEach(() => {
        clearAllCachedResponses('memory');
    });

    describe('Memory Cache Basic LRU', () => {
        test('should set and get basic cache items', () => {
            setCachedResponse('test1', { value: 1 }, 300000, 'memory');
            setCachedResponse('test2', { value: 2 }, 300000, 'memory');
            
            expect(getCachedResponse('test1', 'memory')).toEqual({ value: 1 });
            expect(getCachedResponse('test2', 'memory')).toEqual({ value: 2 });
            
            const stats = getMemoryCacheLRUStats();
            expect(stats.size).toBe(2);
            expect(stats.lruEnabled).toBe(true);
        });

        test('should evict when cache size limit is reached', () => {
            // Set very small cache size
            configureMemoryCache({ maxSize: 2, enableLRU: true });
            
            setCachedResponse('item1', { value: 1 }, 300000, 'memory');
            setCachedResponse('item2', { value: 2 }, 300000, 'memory');
            
            let stats = getMemoryCacheLRUStats();
            expect(stats.size).toBe(2);
            expect(stats.maxSize).toBe(2);
            
            // This should trigger eviction
            setCachedResponse('item3', { value: 3 }, 300000, 'memory');
            
            stats = getMemoryCacheLRUStats();
            expect(stats.size).toBe(2); // Should stay at max size
            
            // item1 should be evicted (least recently used)
            expect(getCachedResponse('item1', 'memory')).toBeNull();
            expect(getCachedResponse('item2', 'memory')).toEqual({ value: 2 });
            expect(getCachedResponse('item3', 'memory')).toEqual({ value: 3 });
        });

        test('should respect LRU access order', (done) => {
            configureMemoryCache({ maxSize: 2, enableLRU: true });
            
            setCachedResponse('first', { value: 'first' }, 300000, 'memory');
            
            setTimeout(() => {
                setCachedResponse('second', { value: 'second' }, 300000, 'memory');
                
                setTimeout(() => {
                    // Access first to make it more recently used
                    getCachedResponse('first', 'memory');
                    
                    setTimeout(() => {
                        // Add third item - should evict 'second' now
                        setCachedResponse('third', { value: 'third' }, 300000, 'memory');
                        
                        expect(getCachedResponse('first', 'memory')).toEqual({ value: 'first' }); // Should remain
                        expect(getCachedResponse('second', 'memory')).toBeNull(); // Should be evicted
                        expect(getCachedResponse('third', 'memory')).toEqual({ value: 'third' }); // New item
                        done();
                    }, 5);
                }, 5);
            }, 5);
        });

        test('should handle configuration changes', () => {
            // Fill cache with 3 items
            configureMemoryCache({ maxSize: 3, enableLRU: true });
            
            setCachedResponse('a', { value: 'a' }, 300000, 'memory');
            setCachedResponse('b', { value: 'b' }, 300000, 'memory');
            setCachedResponse('c', { value: 'c' }, 300000, 'memory');
            
            expect(getMemoryCacheLRUStats().size).toBe(3);
            
            // Reduce max size - should trigger eviction
            configureMemoryCache({ maxSize: 2 });
            
            const stats = getMemoryCacheLRUStats();
            expect(stats.size).toBe(2);
            expect(stats.maxSize).toBe(2);
        });
    });

    describe('LocalStorage Basic LRU', () => {
        test('should handle localStorage basic operations', () => {
            if (typeof localStorage === 'undefined') {
                console.log('Skipping localStorage tests - not available');
                return;
            }

            clearAllCachedResponses('localStorage');
            
            const config = { maxSize: 2, enableLRU: true };
            
            setCachedResponse('local1', { value: 1 }, 300000, 'localStorage', config);
            setCachedResponse('local2', { value: 2 }, 300000, 'localStorage', config);
            
            expect(getCachedResponse('local1', 'localStorage')).toEqual({ value: 1 });
            expect(getCachedResponse('local2', 'localStorage')).toEqual({ value: 2 });
        });
    });
}); 