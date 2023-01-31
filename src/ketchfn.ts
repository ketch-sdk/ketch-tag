export default function ketch(...args: any[]) {
  const q = (window.semaphore = window.semaphore || [])
  q.push(args)
}
