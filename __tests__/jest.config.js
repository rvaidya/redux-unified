module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
    rootDir: '..',
    testMatch: [
        '**/__tests__/**/*.test.ts',
        '**/__tests__/**/*.test.tsx'
    ],
    collectCoverageFrom: [
        'slice/**/*.ts',
        'middleware/**/*.ts',
        'utils/**/*.ts',
        'config/**/*.ts',
        'types.ts',
        'index.ts',
        '!**/*.d.ts',
        '!node_modules/**',
        '!__tests__/**',
        '!dist/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html', 'text-summary', 'cobertura', 'json-summary'],
    coverageThreshold: {
        global: {
            branches: 20,
            functions: 20,
            lines: 25,
            statements: 25
        }
    },
    transformIgnorePatterns: [
        'node_modules/(?!(redux-api-middleware)/)'
    ],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: {
                jsx: 'react'
            }
        }]
    }
}; 