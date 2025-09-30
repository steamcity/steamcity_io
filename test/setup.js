// Test setup file
import { vi } from 'vitest'

// Mock localStorage with proper implementation
const localStorageMock = (() => {
  let store = {}

  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value?.toString()
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get _store() { return store },
    set _store(newStore) { store = newStore }
  }
})()

global.localStorage = localStorageMock

// Mock location.reload
const locationMock = {
  ...window.location,
  reload: vi.fn()
}

Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true
})

// Mock DOM elements helper
global.createMockElement = (id, tagName = 'div') => {
  const element = document.createElement(tagName)
  element.id = id
  document.body.appendChild(element)
  return element
}

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = ''
})