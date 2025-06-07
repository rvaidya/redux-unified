# Redux Unified - Runtime Dependencies Installation

Redux Unified is designed to work in both browser and Node.js environments. However, some environments require additional dependencies for full functionality.

## 🌐 **Browser Environment**
No additional dependencies required! Redux Unified works out of the box with:
- Native `fetch` API (all modern browsers)
- Native `WebSocket` API (all modern browsers)

## 🖥️ **Node.js Environment**

### For HTTP functionality:
Choose one of these options:

#### Option 1: Use Node.js 18+ (Recommended)
```bash
# Node.js 18+ includes native fetch support
# No additional dependencies needed!
node --version  # Should be 18.0.0 or higher
```

#### Option 2: Install node-fetch polyfill
```bash
npm install node-fetch
npm install @types/node-fetch  # If using TypeScript
```

### For WebSocket functionality:
```bash
npm install ws
npm install @types/ws  # If using TypeScript
```

### Complete Node.js setup:
```bash
# For full functionality in Node.js environments
npm install ws @types/ws

# Only needed if using Node.js < 18
npm install node-fetch @types/node-fetch
```

## 🧪 **Testing Environment**

For Jest/testing environments, ensure you have proper mocks:

```javascript
// jest.setup.js
global.fetch = jest.fn();
global.WebSocket = jest.fn();
```

Or use libraries like:
```bash
npm install --save-dev jest-fetch-mock
npm install --save-dev jest-websocket-mock
```

## 📦 **Full Package.json Example**

```json
{
  "dependencies": {
    "@reduxjs/toolkit": "^1.9.0",
    "redux": "^4.2.0",
    "redux-unified": "^1.0.0"
  },
  "optionalDependencies": {
    "ws": "^8.14.0",
    "node-fetch": "^3.3.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.0",
    "@types/node-fetch": "^2.6.0",
    "jest-fetch-mock": "^3.0.0",
    "jest-websocket-mock": "^2.4.0"
  }
}
```

## 🔍 **Checking Environment Support**

Redux Unified provides utilities to check environment compatibility:

```typescript
import { getEnvironmentInfo, isHttpAvailable, isWebSocketAvailable } from 'redux-unified/utils';

// Get full environment information
console.log(getEnvironmentInfo());

// Check specific functionality
if (isHttpAvailable()) {
  console.log('HTTP functionality is available');
}

if (isWebSocketAvailable()) {
  console.log('WebSocket functionality is available');
}
```

## ⚠️ **Troubleshooting**

### Error: "fetch is not available"
- **Browser**: Update to a modern browser
- **Node.js**: Update to Node.js 18+ or install `node-fetch`
- **Testing**: Ensure fetch is properly mocked

### Error: "WebSocket is not available"
- **Browser**: Update to a modern browser
- **Node.js**: Install the `ws` package
- **Testing**: Ensure WebSocket is properly mocked

### TypeScript errors
- Install the corresponding `@types/*` packages
- Ensure your `tsconfig.json` includes proper DOM types for browser usage 