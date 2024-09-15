import { addToKetchLog } from './Console'

// Mock the global `window` object in TypeScript
declare global {
  interface Window {
    KetchLog: {
      [key: string]: (...args: any[]) => void
    }
  }
}

describe('Console', () => {
  beforeEach(() => {
    // Reset window.KetchLog before each test
    window.KetchLog = undefined as any
  })

  it('should initialize window.KetchLog if it does not exist', () => {
    // Ensure KetchLog is not initialized at the start
    expect(window.KetchLog).toBeUndefined()

    // Add a method to trigger initialization
    addToKetchLog('testMethod', () => {})

    // Check if KetchLog is initialized
    expect(window.KetchLog).toBeDefined()
    expect(window.KetchLog).toHaveProperty('testMethod')
  })

  it('should add a method to window.KetchLog', () => {
    // Add a method to KetchLog
    const mockMethod = jest.fn()
    addToKetchLog('testMethod', mockMethod)

    // Check if the method was added
    expect(window.KetchLog.testMethod).toBe(mockMethod)
  })

  it('should not overwrite an existing method in window.KetchLog', () => {
    // Add an initial method
    const initialMethod = jest.fn()
    addToKetchLog('testMethod', initialMethod)

    // Try to add a different method with the same name
    const newMethod = jest.fn()
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation() // Mock console.warn
    addToKetchLog('testMethod', newMethod)

    // Check that the original method wasn't overwritten
    expect(window.KetchLog.testMethod).toBe(initialMethod)

    // Check that console.warn was called
    expect(consoleWarnSpy).toHaveBeenCalledWith('Method testMethod already exists on window.KetchLog')

    // Clean up the spy
    consoleWarnSpy.mockRestore()
  })

  it('should initialize KetchLog only once', () => {
    // Ensure KetchLog is not initialized at the start
    expect(window.KetchLog).toBeUndefined()

    // Initialize once
    addToKetchLog('firstMethod', jest.fn())

    // KetchLog should be initialized now
    expect(window.KetchLog).toBeDefined()

    // Add another method, no reinitialization should occur
    addToKetchLog('secondMethod', jest.fn())

    // Both methods should exist, no reinitialization of KetchLog
    expect(window.KetchLog).toHaveProperty('firstMethod')
    expect(window.KetchLog).toHaveProperty('secondMethod')
  })

  it('should log correctly when functions added via addToKetchLog use console.log', () => {
    // Mock console.log
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()

    // Add a function that logs something
    const loggingFunction = () => {
      console.log('This is a test log')
    }
    addToKetchLog('loggingFunction', loggingFunction)

    // Call the added function
    window.KetchLog.loggingFunction()

    // Check if console.log was called with the correct message
    expect(consoleLogSpy).toHaveBeenCalledWith('This is a test log')

    // Clean up the spy
    consoleLogSpy.mockRestore()
  })

  it('should log dynamic content via console.log when added to KetchLog', () => {
    // Mock console.log
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()

    // Add a function that logs dynamic content
    const dynamicLoggingFunction = (msg: string) => {
      console.log(`Logged message: ${msg}`)
    }
    addToKetchLog('dynamicLoggingFunction', dynamicLoggingFunction)

    // Call the added function with dynamic content
    window.KetchLog.dynamicLoggingFunction('Dynamic content here')

    // Check if console.log was called with the correct dynamic message
    expect(consoleLogSpy).toHaveBeenCalledWith('Logged message: Dynamic content here')

    // Clean up the spy
    consoleLogSpy.mockRestore()
  })
})
