/**
 * Cache utilities for Redux Unified
 * Includes memory cache, LRU eviction, and web storage cache management
 */

import { ICacheEntry, ICacheConfig } from '../types';

// ===================================
// MEMORY CACHE WITH LRU SUPPORT
// ===================================

/**
 * Memory cache store with LRU support
 */
class MemoryCache {
    private cache = new Map<string, ICacheEntry>();
    private timers = new Map<string, NodeJS.Timeout>();
    private maxSize: number;
    private lruEnabled: boolean;

    constructor(maxSize: number = 1000, enableLRU: boolean = true) {
        this.maxSize = maxSize;
        this.lruEnabled = enableLRU;
    }

    set(key: string, entry: ICacheEntry): void {
        // Clear existing timer if any
        const existingTimer = this.timers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Update entry with LRU metadata
        const now = Date.now();
        const enhancedEntry: ICacheEntry = {
            ...entry,
            lastAccessed: now,
            accessCount: (entry.accessCount || 0) + 1
        };

        // Store the entry
        this.cache.set(key, enhancedEntry);

        // Check if we need to evict items (LRU) - do this after adding the item
        if (this.lruEnabled && this.cache.size > this.maxSize) {
            this.evictLRU();
        }

        // Set expiration timer only if TTL is positive
        if (entry.ttl > 0) {
            const timer = setTimeout(() => {
                this.delete(key);
            }, entry.ttl);
            
            this.timers.set(key, timer);
        } else {
            // If TTL is 0 or negative, mark as immediately expired
            this.timers.delete(key);
        }
    }

    get(key: string): ICacheEntry | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if expired (TTL <= 0 means immediately expired)
        if (entry.ttl <= 0 || Date.now() > entry.timestamp + entry.ttl) {
            this.delete(key);
            return null;
        }

        // Update LRU metadata
        if (this.lruEnabled) {
            const now = Date.now();
            entry.lastAccessed = now;
            entry.accessCount = (entry.accessCount || 0) + 1;
            this.cache.set(key, entry); // Update the entry
        }

        return entry;
    }

    delete(key: string): void {
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
        this.cache.delete(key);
    }

    clear(): void {
        // Clear all timers
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }

    keys(): string[] {
        return Array.from(this.cache.keys());
    }

    // Clean up expired entries manually (useful for long-running apps)
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.timestamp + entry.ttl) {
                this.delete(key);
            }
        }
    }

    // LRU eviction - remove least recently used item
    private evictLRU(): void {
        if (this.cache.size === 0) return;

        let lruKey: string | null = null;
        let oldestAccess: number | null = null;

        // Find the least recently used item
        for (const [key, entry] of this.cache.entries()) {
            const lastAccessed = entry.lastAccessed || entry.timestamp;
            if (oldestAccess === null || lastAccessed < oldestAccess) {
                oldestAccess = lastAccessed;
                lruKey = key;
            }
        }

        if (lruKey) {
            this.delete(lruKey);
        }
    }

    // Get LRU statistics
    getLRUStats(): {
        size: number;
        maxSize: number;
        lruEnabled: boolean;
        oldestAccess: number | null;
        newestAccess: number | null;
    } {
        let oldestAccess: number | null = null;
        let newestAccess: number | null = null;

        for (const entry of this.cache.values()) {
            const lastAccessed = entry.lastAccessed || entry.timestamp;
            if (oldestAccess === null || lastAccessed < oldestAccess) {
                oldestAccess = lastAccessed;
            }
            if (newestAccess === null || lastAccessed > newestAccess) {
                newestAccess = lastAccessed;
            }
        }

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            lruEnabled: this.lruEnabled,
            oldestAccess,
            newestAccess
        };
    }

    // Update cache configuration
    configure(config: Partial<ICacheConfig>): void {
        if (config.maxSize !== undefined) {
            this.maxSize = config.maxSize;
            // Evict items if current size exceeds new max size
            while (this.lruEnabled && this.cache.size > this.maxSize) {
                this.evictLRU();
            }
        }
        if (config.enableLRU !== undefined) {
            this.lruEnabled = config.enableLRU;
            // If enabling LRU and over max size, evict
            if (this.lruEnabled && this.cache.size > this.maxSize) {
                while (this.cache.size > this.maxSize) {
                    this.evictLRU();
                }
            }
        }
    }
}

// Global memory cache instance with default LRU settings
const memoryCache = new MemoryCache(1000, true);

// ===================================
// WEB STORAGE LRU UTILITIES
// ===================================

/**
 * Handle LRU eviction for web storage (localStorage/sessionStorage)
 */
function handleLRUForWebStorage(
    storageType: 'localStorage' | 'sessionStorage',
    key: string,
    entry: ICacheEntry,
    maxSize: number
): void {
    const storage = storageType === 'localStorage' ? 
        (typeof localStorage !== 'undefined' ? localStorage : null) : 
        (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!storage) return;

    // Get all Redux Unified cache keys
    const cacheKeys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
        const storageKey = storage.key(i);
        if (storageKey && storageKey.startsWith('redux-unified:cache:')) {
            cacheKeys.push(storageKey);
        }
    }

    // If we're not exceeding max size, just set the item
    if (!cacheKeys.includes(key) && cacheKeys.length < maxSize) {
        storage.setItem(key, JSON.stringify(entry));
        return;
    }

    // If we're updating an existing key, just update it
    if (cacheKeys.includes(key)) {
        storage.setItem(key, JSON.stringify(entry));
        return;
    }

    // We need to evict the LRU item
    let lruKey: string | null = null;
    let oldestAccess = Date.now();

    for (const cacheKey of cacheKeys) {
        try {
            const cached = storage.getItem(cacheKey);
            if (cached) {
                const cachedEntry: ICacheEntry = JSON.parse(cached);
                const lastAccessed = cachedEntry.lastAccessed || cachedEntry.timestamp;
                
                if (lastAccessed < oldestAccess) {
                    oldestAccess = lastAccessed;
                    lruKey = cacheKey;
                }
            }
        } catch {
            // If we can't parse an entry, consider it for removal
            lruKey = cacheKey;
            break;
        }
    }

    // Remove the LRU item and add the new one
    if (lruKey) {
        storage.removeItem(lruKey);
    }
    storage.setItem(key, JSON.stringify(entry));
}

// ===================================
// CACHE OPERATIONS
// ===================================

/**
 * Create cache key for request
 */
export function getCacheKey(endpoint: string, customKey?: string): string {
    return customKey ? `redux-unified:cache:${customKey}` : `redux-unified:cache:${endpoint}`;
}

/**
 * Get cached response from storage with LRU access tracking
 */
export function getCachedResponse(key: string, storage: 'memory' | 'localStorage' | 'sessionStorage' = 'localStorage'): any {
    try {
        let cached: string | null = null;
        
        switch (storage) {
            case 'localStorage': {
                if (typeof localStorage === 'undefined') return null;
                cached = localStorage.getItem(key);
                
                if (cached) {
                    const entry: ICacheEntry = JSON.parse(cached);
                    
                    // Check if expired
                    if (Date.now() > entry.timestamp + entry.ttl) {
                        localStorage.removeItem(key);
                        return null;
                    }
                    
                    // Update LRU metadata
                    const now = Date.now();
                    entry.lastAccessed = now;
                    entry.accessCount = (entry.accessCount || 0) + 1;
                    localStorage.setItem(key, JSON.stringify(entry));
                    
                    return entry.data;
                }
                break;
            }
            case 'sessionStorage': {
                if (typeof sessionStorage === 'undefined') return null;
                cached = sessionStorage.getItem(key);
                
                if (cached) {
                    const entry: ICacheEntry = JSON.parse(cached);
                    
                    // Check if expired
                    if (Date.now() > entry.timestamp + entry.ttl) {
                        sessionStorage.removeItem(key);
                        return null;
                    }
                    
                    // Update LRU metadata
                    const now = Date.now();
                    entry.lastAccessed = now;
                    entry.accessCount = (entry.accessCount || 0) + 1;
                    sessionStorage.setItem(key, JSON.stringify(entry));
                    
                    return entry.data;
                }
                break;
            }
            case 'memory': {
                const memoryEntry = memoryCache.get(key);
                return memoryEntry ? memoryEntry.data : null;
            }
        }
        
        return null;
    } catch {
        return null;
    }
}

/**
 * Set cached response in storage with LRU support
 */
export function setCachedResponse(
    key: string, 
    data: any, 
    ttl: number = 300000, 
    storage: 'memory' | 'localStorage' | 'sessionStorage' = 'localStorage',
    config?: ICacheConfig
): void {
    try {
        const now = Date.now();
        const entry: ICacheEntry = {
            data,
            timestamp: now,
            ttl,
            lastAccessed: now,
            accessCount: 1
        };
        
        switch (storage) {
            case 'localStorage': {
                if (typeof localStorage !== 'undefined') {
                    // Handle LRU for localStorage
                    if (config?.enableLRU && config?.maxSize) {
                        handleLRUForWebStorage('localStorage', key, entry, config.maxSize);
                    } else {
                        localStorage.setItem(key, JSON.stringify(entry));
                    }
                }
                break;
            }
            case 'sessionStorage': {
                if (typeof sessionStorage !== 'undefined') {
                    // Handle LRU for sessionStorage
                    if (config?.enableLRU && config?.maxSize) {
                        handleLRUForWebStorage('sessionStorage', key, entry, config.maxSize);
                    } else {
                        sessionStorage.setItem(key, JSON.stringify(entry));
                    }
                }
                break;
            }
            case 'memory':
                memoryCache.set(key, entry);
                break;
        }
    } catch {
        // Ignore cache write errors
    }
}

/**
 * Clear cached response from storage
 */
export function clearCachedResponse(
    key: string, 
    storage: 'memory' | 'localStorage' | 'sessionStorage' = 'localStorage'
): void {
    try {
        switch (storage) {
            case 'localStorage':
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem(key);
                }
                break;
            case 'sessionStorage':
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.removeItem(key);
                }
                break;
            case 'memory':
                memoryCache.delete(key);
                break;
        }
    } catch {
        // Ignore errors
    }
}

/**
 * Clear all cached responses from storage
 */
export function clearAllCachedResponses(
    storage: 'memory' | 'localStorage' | 'sessionStorage' = 'localStorage'
): void {
    try {
        switch (storage) {
            case 'localStorage':
                if (typeof localStorage !== 'undefined') {
                    // Clear only Redux Unified cache entries
                    const keysToRemove: string[] = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('redux-unified:cache:')) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => localStorage.removeItem(key));
                }
                break;
            case 'sessionStorage':
                if (typeof sessionStorage !== 'undefined') {
                    // Clear only Redux Unified cache entries
                    const keysToRemove: string[] = [];
                    for (let i = 0; i < sessionStorage.length; i++) {
                        const key = sessionStorage.key(i);
                        if (key && key.startsWith('redux-unified:cache:')) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => sessionStorage.removeItem(key));
                }
                break;
            case 'memory':
                memoryCache.clear();
                break;
        }
    } catch {
        // Ignore errors
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats(storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): {
    size: number;
    keys: string[];
} {
    try {
        switch (storage) {
            case 'memory':
                return {
                    size: memoryCache.size(),
                    keys: memoryCache.keys()
                };
                         case 'localStorage': {
                 if (typeof localStorage === 'undefined') return { size: 0, keys: [] };
                 const localKeys: string[] = [];
                 for (let i = 0; i < localStorage.length; i++) {
                     const key = localStorage.key(i);
                     if (key && key.startsWith('redux-unified:cache:')) {
                         localKeys.push(key);
                     }
                 }
                 return { size: localKeys.length, keys: localKeys };
             }
             case 'sessionStorage': {
                 if (typeof sessionStorage === 'undefined') return { size: 0, keys: [] };
                 const sessionKeys: string[] = [];
                 for (let i = 0; i < sessionStorage.length; i++) {
                     const key = sessionStorage.key(i);
                     if (key && key.startsWith('redux-unified:cache:')) {
                         sessionKeys.push(key);
                     }
                 }
                 return { size: sessionKeys.length, keys: sessionKeys };
             }
            default:
                return { size: 0, keys: [] };
        }
    } catch {
        return { size: 0, keys: [] };
    }
}

// ===================================
// MEMORY CACHE MANAGEMENT
// ===================================

/**
 * Cleanup expired entries from memory cache
 * Useful for long-running applications
 */
export function cleanupMemoryCache(): void {
    memoryCache.cleanup();
}

/**
 * Configure memory cache settings
 */
export function configureMemoryCache(config: ICacheConfig): void {
    // Clear existing cache when reconfiguring to ensure clean state
    memoryCache.clear();
    memoryCache.configure(config);
}

/**
 * Get LRU statistics for memory cache
 */
export function getMemoryCacheLRUStats(): {
    size: number;
    maxSize: number;
    lruEnabled: boolean;
    oldestAccess: number | null;
    newestAccess: number | null;
} {
    return memoryCache.getLRUStats();
}

// ===================================
// WEB STORAGE LRU MANAGEMENT
// ===================================

/**
 * Get LRU statistics for web storage
 */
export function getWebStorageLRUStats(storage: 'localStorage' | 'sessionStorage'): {
    size: number;
    keys: string[];
    oldestAccess: number | null;
    newestAccess: number | null;
    accessCounts: Record<string, number>;
} {
    const storageObj = storage === 'localStorage' ? 
        (typeof localStorage !== 'undefined' ? localStorage : null) : 
        (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    
    if (!storageObj) {
        return { size: 0, keys: [], oldestAccess: null, newestAccess: null, accessCounts: {} };
    }

    const cacheKeys: string[] = [];
    const accessCounts: Record<string, number> = {};
    let oldestAccess: number | null = null;
    let newestAccess: number | null = null;

    for (let i = 0; i < storageObj.length; i++) {
        const key = storageObj.key(i);
        if (key && key.startsWith('redux-unified:cache:')) {
            cacheKeys.push(key);
            
            try {
                const cached = storageObj.getItem(key);
                if (cached) {
                    const entry: ICacheEntry = JSON.parse(cached);
                    const lastAccessed = entry.lastAccessed || entry.timestamp;
                    
                    if (oldestAccess === null || lastAccessed < oldestAccess) {
                        oldestAccess = lastAccessed;
                    }
                    if (newestAccess === null || lastAccessed > newestAccess) {
                        newestAccess = lastAccessed;
                    }
                    
                    accessCounts[key] = entry.accessCount || 1;
                }
            } catch {
                // Ignore parsing errors
            }
        }
    }

    return {
        size: cacheKeys.length,
        keys: cacheKeys,
        oldestAccess,
        newestAccess,
        accessCounts
    };
}

/**
 * Manually evict LRU items from web storage
 */
export function evictLRUFromWebStorage(
    storage: 'localStorage' | 'sessionStorage',
    targetSize: number
): number {
    const storageObj = storage === 'localStorage' ? 
        (typeof localStorage !== 'undefined' ? localStorage : null) : 
        (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    
    if (!storageObj) return 0;

    const cacheEntries: Array<{ key: string; lastAccessed: number }> = [];
    
    // Collect all cache entries with their access times
    for (let i = 0; i < storageObj.length; i++) {
        const key = storageObj.key(i);
        if (key && key.startsWith('redux-unified:cache:')) {
            try {
                const cached = storageObj.getItem(key);
                if (cached) {
                    const entry: ICacheEntry = JSON.parse(cached);
                    cacheEntries.push({
                        key,
                        lastAccessed: entry.lastAccessed || entry.timestamp
                    });
                }
            } catch {
                // If we can't parse, remove it
                storageObj.removeItem(key);
            }
        }
    }

    // Sort by last accessed (oldest first)
    cacheEntries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    // Remove oldest entries until we reach target size
    let removedCount = 0;
    while (cacheEntries.length > targetSize && removedCount < cacheEntries.length) {
        const entryToRemove = cacheEntries.shift();
        if (entryToRemove) {
            storageObj.removeItem(entryToRemove.key);
            removedCount++;
        }
    }

    return removedCount;
} 