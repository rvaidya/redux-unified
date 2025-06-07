/**
 * Test setup and mocks for redux-unified
 */

// Mock fetch globally
global.fetch = jest.fn();

// Mock WebSocket
class MockWebSocket {
    url: string;
    readyState: number = WebSocket.CONNECTING;
    onopen: ((event: Event) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;

    constructor(url: string, protocols?: string | string[]) {
        this.url = url;
        // Simulate connection opening after a short delay
        setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            if (this.onopen) {
                this.onopen(new Event('open'));
            }
        }, 10);
    }

    send = jest.fn();
    close = jest.fn(() => {
        this.readyState = WebSocket.CLOSED;
        if (this.onclose) {
            this.onclose(new CloseEvent('close'));
        }
    });

    // Static constants
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
}

// Assign static constants to instance
Object.assign(MockWebSocket.prototype, {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
});

// Mock WebSocket globally
(global as any).WebSocket = MockWebSocket;
(global as any).MessageEvent = class MockMessageEvent {
    data: any;
    constructor(type: string, eventInitDict?: { data?: any }) {
        this.data = eventInitDict?.data;
    }
};
(global as any).CloseEvent = class MockCloseEvent {
    wasClean: boolean = true;
    constructor(type: string, eventInitDict?: { wasClean?: boolean }) {
        this.wasClean = eventInitDict?.wasClean ?? true;
    }
};

// Mock localStorage
const mockStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: jest.fn((index: number) => {
            const keys = Object.keys(store);
            return keys[index] || null;
        })
    };
})();

Object.defineProperty(global, 'localStorage', {
    value: mockStorage,
    writable: true
});

Object.defineProperty(global, 'sessionStorage', {
    value: mockStorage,
    writable: true
});

// Mock process.env
process.env.REACT_APP_API_URL = 'http://localhost:8000';
process.env.REACT_APP_WS_URL = 'ws://localhost:8000/ws';

// Test utilities
export const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

export const createMockResponse = (data: any, status: number = 200, ok: boolean = true) => ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers(),
    statusText: ok ? 'OK' : 'Error',
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn()
}) as unknown as Response;

export const createMockWebSocket = () => {
    const ws = new MockWebSocket('ws://test');
    return ws as any;
};

export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Reset mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockFetch.mockReset();
});

export { mockStorage };

// Set longer timeout for integration tests
jest.setTimeout(30000); 