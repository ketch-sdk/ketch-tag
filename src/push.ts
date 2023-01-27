import log from './logging'

export default function pusher(
  entrypoint: (fnName: string, ...args: any[]) => Promise<any>,
): (a: any[] | string | IArguments | undefined) => void {
  return function push(a: any[] | string | IArguments | undefined): void {
    if (a === undefined) {
      return
    }

    let fnName: string
    if (typeof a === 'string') {
      fnName = a
      a = []
    } else {
      a = Array.from(a)
      fnName = a.shift()
    }

    const p = entrypoint(fnName, ...a)

    if (p && p.then) {
      p.then(() => {
        log.trace(`${fnName} completed`)
      }).catch((reason: any) => {
        log.warn(`${fnName} failed: ${reason}`)
      })
    }
  }
}
