import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
	cleanup()
})

// Minimal ResizeObserver polyfill for test environment (Recharts uses it)
class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

// @ts-ignore - provide polyfill for test environment
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverMock
