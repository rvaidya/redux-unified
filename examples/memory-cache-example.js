/**
 * Redux Unified - Memory Cache Implementation Example
 * 
 * This example demonstrates the complete memory cache functionality
 * and how to use it in different scenarios.
 */

const { 
    createSlice, 
    EndpointType,
    getCacheKey,
    getCachedResponse,
    setCachedResponse,
    clearCachedResponse,
    clearAllCachedResponses,
    getCacheStats,
    cleanupMemoryCache
} = require('../index');

// ===================================
// BASIC MEMORY CACHE USAGE
// ===================================

console.log('🚀 Memory Cache Implementation Demo\n');

// 1. Basic cache operations
console.log('1. Basic Cache Operations:');

// Cache some data
const userData = { id: 1, name: 'John Doe', email: 'john@example.com' };
setCachedResponse('user-1', userData, 300000, 'memory'); // 5 minutes

console.log('✅ Cached user data');
console.log('Retrieved:', getCachedResponse('user-1', 'memory'));

// Cache with custom key
const customKey = getCacheKey('/api/users/1', 'user-profile-cache');
setCachedResponse(customKey, userData, 300000, 'memory');
console.log('✅ Cached with custom key:', customKey);

// ===================================
// DIFFERENT STORAGE TYPES
// ===================================

console.log('\n2. Storage Type Comparison:');

const testData = { message: 'Hello World', timestamp: Date.now() };

// Store in different cache types
setCachedResponse('test-key', { ...testData, storage: 'memory' }, 300000, 'memory');
setCachedResponse('test-key', { ...testData, storage: 'localStorage' }, 300000, 'localStorage');
setCachedResponse('test-key', { ...testData, storage: 'sessionStorage' }, 300000, 'sessionStorage');

console.log('Memory cache:', getCachedResponse('test-key', 'memory'));
console.log('LocalStorage cache:', getCachedResponse('test-key', 'localStorage'));
console.log('SessionStorage cache:', getCachedResponse('test-key', 'sessionStorage'));

// ===================================
// CACHE EXPIRATION DEMO
// ===================================

console.log('\n3. Cache Expiration Demo:');

// Short-lived cache (100ms)
setCachedResponse('short-lived', { data: 'expires soon' }, 100, 'memory');
console.log('Immediately after caching:', getCachedResponse('short-lived', 'memory'));

setTimeout(() => {
    console.log('After 150ms (expired):', getCachedResponse('short-lived', 'memory'));
}, 150);

// ===================================
// CACHE STATISTICS
// ===================================

console.log('\n4. Cache Statistics:');

// Add multiple entries
const entries = [
    { key: 'stats-1', data: { type: 'user' } },
    { key: 'stats-2', data: { type: 'product' } },
    { key: 'stats-3', data: { type: 'order' } }
];

entries.forEach(({ key, data }) => {
    setCachedResponse(key, data, 300000, 'memory');
});

const stats = getCacheStats('memory');
console.log('Cache statistics:');
console.log('- Size:', stats.size);
console.log('- Keys:', stats.keys);

// ===================================
// CACHE CLEANUP
// ===================================

console.log('\n5. Cache Cleanup:');

// Add entries with different TTLs
setCachedResponse('cleanup-1', { data: 'short' }, 50, 'memory');
setCachedResponse('cleanup-2', { data: 'medium' }, 200, 'memory');
setCachedResponse('cleanup-3', { data: 'long' }, 300000, 'memory');

console.log('Before cleanup:', getCacheStats('memory').size, 'entries');

setTimeout(() => {
    cleanupMemoryCache(); // Manually clean expired entries
    console.log('After cleanup:', getCacheStats('memory').size, 'entries');
    
    // Clear all remaining entries
    clearAllCachedResponses('memory');
    console.log('After clear all:', getCacheStats('memory').size, 'entries');
}, 100);

// ===================================
// USING CACHE WITH REDUX SLICES
// ===================================

console.log('\n6. Integration with Redux Slices:\n');

// Create a slice that uses caching
const apiSlice = createSlice({
    name: 'api',
    initialState: {
        users: [],
        loading: false,
        error: null
    },
    
    reducers: {
        // Regular action to load from cache
        loadFromCache: (state, action) => {
            const cached = getCachedResponse(action.payload.cacheKey, 'memory');
            if (cached) {
                state.users = cached.users || [];
                console.log('✅ Loaded users from cache:', cached.users?.length || 0, 'users');
            }
        },
        
        // Action to save to cache
        saveToCache: (state, action) => {
            const cacheKey = getCacheKey('/api/users', 'users-list');
            setCachedResponse(cacheKey, { users: state.users }, 300000, 'memory');
            console.log('✅ Saved users to cache:', state.users.length, 'users');
        }
    },
    
    endpoints: {
        // HTTP endpoint with manual cache handling
        fetchUsers: {
            type: EndpointType.HTTP,
            config: {
                path: 'users',
                method: 'GET',
                cache: true // This enables automatic caching in HTTP middleware
            },
            reducers: {
                request: (state) => {
                    state.loading = true;
                    state.error = null;
                    
                    // Check cache first
                    const cacheKey = getCacheKey('/api/users', 'users-list');
                    const cached = getCachedResponse(cacheKey, 'memory');
                    if (cached) {
                        state.users = cached.users || [];
                        state.loading = false;
                        console.log('🚀 Cache hit! Loaded', cached.users?.length || 0, 'users from memory');
                        return;
                    }
                    
                    console.log('💻 Cache miss, making HTTP request...');
                },
                success: (state, action) => {
                    state.loading = false;
                    state.users = action.payload.users || [];
                    
                    // Save to cache
                    const cacheKey = getCacheKey('/api/users', 'users-list');
                    setCachedResponse(cacheKey, { users: state.users }, 300000, 'memory');
                    console.log('✅ Saved', state.users.length, 'users to memory cache');
                },
                error: (state, action) => {
                    state.loading = false;
                    state.error = action.payload.message;
                }
            }
        }
    }
});

// ===================================
// PERFORMANCE TESTING
// ===================================

console.log('\n7. Performance Testing:');

// Test with large dataset
const performanceTest = () => {
    const startTime = Date.now();
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        data: new Array(100).fill(`data-${i}`)
    }));
    
    // Cache the large dataset
    setCachedResponse('performance-test', largeDataset, 300000, 'memory');
    
    const cacheTime = Date.now();
    
    // Retrieve the dataset
    const retrieved = getCachedResponse('performance-test', 'memory');
    
    const retrieveTime = Date.now();
    
    console.log('Performance Results:');
    console.log('- Dataset size:', largeDataset.length, 'items');
    console.log('- Cache time:', cacheTime - startTime, 'ms');
    console.log('- Retrieve time:', retrieveTime - cacheTime, 'ms');
    console.log('- Data integrity:', retrieved.length === largeDataset.length ? '✅' : '❌');
    
    // Clean up
    clearCachedResponse('performance-test', 'memory');
};

setTimeout(performanceTest, 300);

// ===================================
// CACHE STRATEGIES EXAMPLE
// ===================================

const cacheStrategies = {
    // Write-through: Update both cache and source
    writeThrough: (key, data) => {
        // Update primary storage (would be database/API in real app)
        console.log('📝 Writing to primary storage...');
        
        // Update cache
        setCachedResponse(key, data, 300000, 'memory');
        console.log('📝 Updated cache');
    },
    
    // Write-behind: Update cache first, source later
    writeBehind: (key, data) => {
        // Update cache immediately
        setCachedResponse(key, data, 300000, 'memory');
        console.log('⚡ Updated cache immediately');
        
        // Update primary storage asynchronously
        setTimeout(() => {
            console.log('📝 Writing to primary storage (delayed)...');
        }, 100);
    },
    
    // Cache-aside: Check cache, load from source if miss
    cacheAside: (key) => {
        const cached = getCachedResponse(key, 'memory');
        if (cached) {
            console.log('🎯 Cache hit!');
            return cached;
        }
        
        console.log('💾 Cache miss, loading from source...');
        const data = { loaded: 'from source', timestamp: Date.now() };
        setCachedResponse(key, data, 300000, 'memory');
        return data;
    }
};

console.log('\n8. Cache Strategies:');

setTimeout(() => {
    cacheStrategies.writeThrough('strategy-1', { strategy: 'write-through' });
    cacheStrategies.writeBehind('strategy-2', { strategy: 'write-behind' });
    
    // Test cache-aside
    cacheStrategies.cacheAside('strategy-3'); // Miss
    cacheStrategies.cacheAside('strategy-3'); // Hit
}, 400);

// ===================================
// EXPORT FOR USE
// ===================================

module.exports = {
    apiSlice,
    cacheStrategies,
    // Re-export cache utilities for convenience
    getCacheKey,
    getCachedResponse,
    setCachedResponse,
    clearCachedResponse,
    clearAllCachedResponses,
    getCacheStats,
    cleanupMemoryCache
};

// ===================================
// BEST PRACTICES SUMMARY
// ===================================

console.log('\n📋 Memory Cache Best Practices:');
console.log('');
console.log('✅ Use memory cache for:');
console.log('  - Frequently accessed data');
console.log('  - Computed results that are expensive to calculate');
console.log('  - API responses that change infrequently');
console.log('  - Session-specific data');
console.log('');
console.log('⚠️  Memory cache considerations:');
console.log('  - Data is lost when application restarts');
console.log('  - Memory usage grows with cache size');
console.log('  - Set appropriate TTL values');
console.log('  - Use cleanup for long-running applications');
console.log('');
console.log('🚀 Performance tips:');
console.log('  - Use custom cache keys for better organization');
console.log('  - Monitor cache hit rates');
console.log('  - Implement cache warming for critical data');
console.log('  - Consider cache invalidation strategies');
console.log(''); 