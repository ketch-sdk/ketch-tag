import constants from './constants'

export type CommandEntry = string | any[]

export default function getGlobal(pusher?: Function): CommandEntry[] {
  let variableName = constants.VARIABLE_NAME

  // @ts-ignore
  if (window[constants.SEMAPHORE]) {
    variableName = constants.SEMAPHORE
  }

  // @ts-ignore
  const v = (window[variableName] = window[variableName] || [])

  // Override push if one is specified
  if (pusher !== undefined) {
    v.push = pusher
    v.loaded = true
  }

  return v
}
