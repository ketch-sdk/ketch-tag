/**
 * Ketch is the main entrypoint to the JS API.
 *
 * @param action The action to invoke
 * @param args The arguments to the action
 */
export default function ketch(action: string, ...args: any[]) {
  const q = (window.semaphore = window.semaphore || [])
  q.push([action, ...args])
}
