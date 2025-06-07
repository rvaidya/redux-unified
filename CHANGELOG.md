# Changelog

All notable changes to Redux Unified will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### 🚀 Initial Release

Redux Unified v1.0.0 brings a comprehensive solution for managing HTTP API calls, WebSocket connections, and regular actions in Redux applications with built-in caching and authentication.

### ✨ Added

#### Core Features
- **Unified Slice Creation**: Single API for HTTP, WebSocket, and regular actions
- **EndpointType Enum**: User-friendly `EndpointType.HTTP` and `EndpointType.WEBSOCKET` instead of confusing strings
- **Built-in Authentication**: Support for Bearer tokens, API keys, and custom auth
- **Comprehensive Caching**: Memory, localStorage, and sessionStorage with TTL support

#### LRU Cache System
- **Memory Cache LRU**: Automatic eviction with configurable size limits
- **Web Storage LRU**: LRU support for localStorage and sessionStorage
- **Access Tracking**: Monitor cache hit patterns and access counts
- **Manual Eviction**: Tools for batch cache cleanup
- **Performance Monitoring**: Comprehensive cache statistics and metrics

#### WebSocket Features
- **Real-time Updates**: Automatic state synchronization via WebSocket messages
- **Redux Action Format**: WebSocket messages follow Redux action patterns (type/payload/meta)
- **Connection Management**: Automatic reconnection and error handling
- **Server Examples**: Complete Node.js and Socket.IO server implementations

#### HTTP Features
- **Request Lifecycle**: Automatic REQUEST/SUCCESS/ERROR action dispatching  
- **Path Parameters**: Dynamic URL building with parameter substitution
- **Query Parameters**: Automatic query string generation
- **Error Handling**: Comprehensive error states and retry logic

#### Developer Experience
- **TypeScript Support**: Full type safety with IntelliSense
- **Backward Compatibility**: Legacy string endpoints still supported
- **Comprehensive Examples**: Working examples for all features
- **Extensive Testing**: 50+ tests covering all functionality

### 📊 Technical Specifications

#### Cache Implementation
- **Memory Cache**: Map-based storage with automatic TTL cleanup
- **LRU Eviction**: Least Recently Used algorithm for memory management
- **Cross-Storage Support**: Unified API across memory/localStorage/sessionStorage
- **Configuration**: Runtime cache size and behavior adjustment

#### Performance Features
- **Efficient Storage**: Optimized data structures for fast access
- **Memory Management**: Automatic cleanup of expired entries
- **Background Processing**: Non-blocking cache operations
- **Statistics Tracking**: Real-time performance monitoring

#### API Design
- **Intuitive Interface**: Easy-to-use function signatures
- **Flexible Configuration**: Optional parameters with sensible defaults
- **Error Resilience**: Graceful handling of storage unavailability
- **Extensible Architecture**: Designed for future enhancements

### 🔧 Configuration Options

#### Memory Cache Configuration
```typescript
configureMemoryCache({
    maxSize: 1000,        // Maximum number of cache entries
    enableLRU: true,      // Enable LRU eviction
    ttl: 300000          // Default TTL in milliseconds
});
```

#### Web Storage LRU Configuration
```typescript
const lruConfig = {
    maxSize: 50,          // Maximum cache entries
    enableLRU: true,      // Enable LRU eviction
    ttl: 600000          // Default TTL
};

setCachedResponse(key, data, ttl, 'localStorage', lruConfig);
```

### 📈 Performance Benchmarks

- **Memory Cache**: ~0.1ms average access time
- **localStorage LRU**: ~2-5ms average access time  
- **Large Scale**: Handles 1000+ cache entries efficiently
- **Memory Usage**: Predictable with configurable limits

### 🛠️ Breaking Changes

- **Version Bump**: From 0.0.1 to 1.0.0 (stable release)
- **Enhanced Types**: New `ICacheConfig` and `ICacheEntry` interfaces
- **New Dependencies**: Updated peer dependency requirements

### 📚 Documentation

#### New Examples
- `examples/lru-cache-example.js` - Comprehensive LRU cache demo
- `examples/websocket-server-client-example.js` - Full WebSocket implementation
- `examples/memory-cache-example.js` - Memory cache usage patterns

#### Enhanced README
- Clear problem/solution explanation
- Before/after code comparisons (173 lines → 45 lines)
- Complete server-side WebSocket documentation
- Migration guide for legacy endpoints

#### API Reference
- Complete function documentation
- TypeScript type definitions
- Usage examples for all features
- Best practices guide

### 🔮 What's Next

Future releases will focus on:
- Advanced caching strategies (TTL + LRU combinations)
- WebSocket room management
- Enhanced authentication methods
- Performance optimizations
- Additional storage backends

---

## Previous Versions

### [0.0.1] - 2024-01-10
- Initial development version
- Basic HTTP and WebSocket functionality
- Memory cache implementation
- TypeScript foundation

---

**Full Changelog**: https://github.com/rvaidya/redux-unified/commits/main 