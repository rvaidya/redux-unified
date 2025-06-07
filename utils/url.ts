/**
 * URL and path utility functions for Redux Unified
 */

/**
 * Convert path with parameters to full URL
 */
export function pathToUrl(
    path: string,
    pathParams?: Record<string, string | number>,
    queryParams?: Record<string, string | number>
): string {
    let url = path;

    // Replace path parameters
    if (pathParams) {
        Object.entries(pathParams).forEach(([key, value]) => {
            url = url.replace(`:${key}`, String(value));
        });
    }

    // Add query parameters
    if (queryParams && Object.keys(queryParams).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
            searchParams.append(key, String(value));
        });
        url += (url.includes('?') ? '&' : '?') + searchParams.toString();
    }

    return url;
}

/**
 * Get full API path with base URL
 */
export function getApiPath(endpoint: string, baseURL?: string): string {
    if (!baseURL) return endpoint;
    
    // If endpoint is already a full URL, return it as-is
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        return endpoint;
    }
    
    const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    return `${base}${path}`;
} 