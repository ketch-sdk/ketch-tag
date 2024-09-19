type KetchLogType = {
  [key: string]: (...args: any[]) => void
}

declare global {
  interface Window {
    KetchLog: KetchLogType
  }
}

// Initialize window.KetchLog if it doesn't exist
const initializeKetchLog = () => {
  if (!window.KetchLog) {
    window.KetchLog = {}
  }
}

// Utility function to add methods to KetchLog
export const addToKetchLog = (methodName: string, method: (...args: any[]) => void) => {
  initializeKetchLog()

  // Add method if not already there
  if (!window.KetchLog[methodName]) {
    window.KetchLog[methodName] = method
  }
}
