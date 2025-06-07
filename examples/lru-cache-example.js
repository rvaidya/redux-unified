/**
 * Redux Unified - LRU Cache Implementation Example
 * 
 * This example demonstrates the complete LRU (Least Recently Used) cache functionality
 * across all storage backends: memory, localStorage, and sessionStorage.
 */

const { 
    setCachedResponse,
    getCachedResponse,
    configureMemoryCache,
    getMemoryCacheLRUStats,
    getWebStorageLRUStats,
    evictLRUFromWebStorage,
    clearAllCachedResponses,
    getCacheKey
} = require('../dist/index');

console.log('🚀 LRU Cache Implementation Demo\n');

// ===================================
// MEMORY CACHE LRU DEMO
// ===================================

console.log('1. Memory Cache LRU:');

// Configure small cache for demonstration
configureMemoryCache({ maxSize: 3, enableLRU: true });

// Add items to fill cache
setCachedResponse('user1', { name: 'Alice', role: 'admin' }, 300000, 'memory');
setCachedResponse('user2', { name: 'Bob', role: 'user' }, 300000, 'memory');
setCachedResponse('user3', { name: 'Charlie', role: 'user' }, 300000, 'memory');

console.log('✅ Added 3 users to memory cache');
console.log('Cache stats:', getMemoryCacheLRUStats());

// Access user1 to make it recently used
getCachedResponse('user1', 'memory');
console.log('📖 Accessed user1 (making it recently used)');

// Add 4th user - should evict user2 (least recently used)
setCachedResponse('user4', { name: 'Diana', role: 'admin' }, 300000, 'memory');
console.log('➕ Added user4 - should evict user2 (LRU)');

const memStats = getMemoryCacheLRUStats();
console.log('Final memory cache stats:', memStats);
console.log('user1 (accessed):', getCachedResponse('user1', 'memory') ? '✅ Still there' : '❌ Evicted');
console.log('user2 (LRU):', getCachedResponse('user2', 'memory') ? '✅ Still there' : '❌ Evicted');
console.log('user3:', getCachedResponse('user3', 'memory') ? '✅ Still there' : '❌ Evicted');
console.log('user4 (new):', getCachedResponse('user4', 'memory') ? '✅ Still there' : '❌ Evicted');

// ===================================
// LOCALSTORAGE LRU DEMO
// ===================================

console.log('\n2. LocalStorage LRU:');

clearAllCachedResponses('localStorage');

const lruConfig = { maxSize: 2, enableLRU: true };

// Add items with proper cache keys
const productKey1 = getCacheKey('product1');
const productKey2 = getCacheKey('product2');
const productKey3 = getCacheKey('product3');

setCachedResponse(productKey1, { name: 'Laptop', price: 999 }, 300000, 'localStorage', lruConfig);
setCachedResponse(productKey2, { name: 'Mouse', price: 29 }, 300000, 'localStorage', lruConfig);

console.log('✅ Added 2 products to localStorage');
console.log('LocalStorage stats:', getWebStorageLRUStats('localStorage'));

// Access product1 to make it recently used
getCachedResponse(productKey1, 'localStorage');
console.log('📖 Accessed product1 (making it recently used)');

// Add 3rd product - should evict product2
setCachedResponse(productKey3, { name: 'Keyboard', price: 79 }, 300000, 'localStorage', lruConfig);
console.log('➕ Added product3 - should evict product2 (LRU)');

const localStats = getWebStorageLRUStats('localStorage');
console.log('Final localStorage stats:', localStats);
console.log('product1 (accessed):', getCachedResponse(productKey1, 'localStorage') ? '✅ Still there' : '❌ Evicted');
console.log('product2 (LRU):', getCachedResponse(productKey2, 'localStorage') ? '✅ Still there' : '❌ Evicted');
console.log('product3 (new):', getCachedResponse(productKey3, 'localStorage') ? '✅ Still there' : '❌ Evicted');

// ===================================
// SESSIONSTORAGE LRU DEMO
// ===================================

console.log('\n3. SessionStorage LRU:');

clearAllCachedResponses('sessionStorage');

// Add session data
const sessionKey1 = getCacheKey('session1');
const sessionKey2 = getCacheKey('session2');
const sessionKey3 = getCacheKey('session3');

setCachedResponse(sessionKey1, { userId: 1, token: 'abc123' }, 300000, 'sessionStorage', lruConfig);
setCachedResponse(sessionKey2, { userId: 2, token: 'def456' }, 300000, 'sessionStorage', lruConfig);

console.log('✅ Added 2 sessions to sessionStorage');

// Add 3rd session - should evict first one
setCachedResponse(sessionKey3, { userId: 3, token: 'ghi789' }, 300000, 'sessionStorage', lruConfig);
console.log('➕ Added session3 - should evict session1 (LRU)');

const sessionStats = getWebStorageLRUStats('sessionStorage');
console.log('Final sessionStorage stats:', sessionStats);

// ===================================
// MANUAL LRU EVICTION DEMO
// ===================================

console.log('\n4. Manual LRU Eviction:');

clearAllCachedResponses('localStorage');

// Add many items without LRU config
for (let i = 1; i <= 5; i++) {
    const key = getCacheKey(`item${i}`);
    setCachedResponse(key, { id: i, data: `Item ${i}` }, 300000, 'localStorage');
}

console.log('✅ Added 5 items to localStorage without LRU');
console.log('Before eviction:', getWebStorageLRUStats('localStorage').size, 'items');

// Manually evict to reduce to 3 items
const evictedCount = evictLRUFromWebStorage('localStorage', 3);
console.log(`🗑️  Manually evicted ${evictedCount} items`);
console.log('After eviction:', getWebStorageLRUStats('localStorage').size, 'items');

// ===================================
// ACCESS PATTERN TRACKING
// ===================================

console.log('\n5. Access Pattern Tracking:');

clearAllCachedResponses('localStorage');

const trackingKey = getCacheKey('tracking-test');
setCachedResponse(trackingKey, { data: 'test' }, 300000, 'localStorage');

// Access multiple times
for (let i = 0; i < 5; i++) {
    getCachedResponse(trackingKey, 'localStorage');
}

const trackingStats = getWebStorageLRUStats('localStorage');
console.log('Access tracking stats:', trackingStats);
console.log('Access count for tracked item:', trackingStats.accessCounts[trackingKey]);

// ===================================
// PERFORMANCE COMPARISON
// ===================================

console.log('\n6. Performance Comparison:');

const performanceTest = (storage, config) => {
    const startTime = Date.now();
    
    // Add 100 items
    for (let i = 0; i < 100; i++) {
        const key = storage === 'memory' ? `perf-${i}` : getCacheKey(`perf-${i}`);
        setCachedResponse(key, { id: i, data: `Performance test ${i}` }, 300000, storage, config);
    }
    
    const endTime = Date.now();
    return endTime - startTime;
};

// Test memory cache performance
configureMemoryCache({ maxSize: 50, enableLRU: true });
const memoryTime = performanceTest('memory');

// Test localStorage performance
const localTime = performanceTest('localStorage', { maxSize: 50, enableLRU: true });

console.log('Performance Results:');
console.log(`- Memory cache: ${memoryTime}ms`);
console.log(`- LocalStorage: ${localTime}ms`);
console.log(`- Memory is ${(localTime / memoryTime).toFixed(1)}x faster`);

// ===================================
// CACHE CONFIGURATION DEMO
// ===================================

console.log('\n7. Dynamic Cache Configuration:');

// Start with large cache
configureMemoryCache({ maxSize: 10, enableLRU: true });

// Fill cache
for (let i = 0; i < 8; i++) {
    setCachedResponse(`config-${i}`, { value: i }, 300000, 'memory');
}

console.log('Before reconfiguration:', getMemoryCacheLRUStats().size, 'items');

// Reduce cache size - should trigger eviction
configureMemoryCache({ maxSize: 5 });

console.log('After reducing maxSize to 5:', getMemoryCacheLRUStats().size, 'items');

// Disable LRU
configureMemoryCache({ enableLRU: false });

// Add more items - should not evict now
for (let i = 8; i < 12; i++) {
    setCachedResponse(`config-${i}`, { value: i }, 300000, 'memory');
}

const finalStats = getMemoryCacheLRUStats();
console.log('After disabling LRU:', finalStats.size, 'items (LRU enabled:', finalStats.lruEnabled, ')');

// ===================================
// BEST PRACTICES SUMMARY
// ===================================

console.log('\n📋 LRU Cache Best Practices:');
console.log('');
console.log('✅ Memory Cache:');
console.log('  - Fastest performance');
console.log('  - Automatic cleanup with timers');
console.log('  - Configurable max size and LRU');
console.log('  - Lost on app restart');
console.log('');
console.log('✅ LocalStorage LRU:');
console.log('  - Persistent across sessions');
console.log('  - Manual LRU configuration required');
console.log('  - Use getCacheKey() for proper prefixing');
console.log('  - Good for user preferences');
console.log('');
console.log('✅ SessionStorage LRU:');
console.log('  - Persistent during session');
console.log('  - Manual LRU configuration required');
console.log('  - Use getCacheKey() for proper prefixing');
console.log('  - Good for temporary data');
console.log('');
console.log('🚀 Performance Tips:');
console.log('  - Use memory cache for frequently accessed data');
console.log('  - Set appropriate maxSize based on memory constraints');
console.log('  - Monitor cache hit rates with statistics');
console.log('  - Use manual eviction for batch cleanup');
console.log('  - Consider TTL + LRU for optimal memory usage');

// Clean up
clearAllCachedResponses('memory');
clearAllCachedResponses('localStorage');
clearAllCachedResponses('sessionStorage');

console.log('\n🧹 Cleaned up all caches');
console.log('Demo complete! 🎉');

module.exports = {
    // Export for use in other examples
    lruConfig,
    performanceTest
}; 