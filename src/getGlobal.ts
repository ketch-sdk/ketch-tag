export type CommandEntry = string | any[]

export default function getGlobal(pusher?: (a: any[] | string | IArguments | undefined) => void): CommandEntry[] {
  const v = (window.semaphore = window.semaphore || [])

  // Override push if one is specified
  if (pusher !== undefined) {
    v.push = pusher
    v.loaded = true
  }

  return v as any
}
