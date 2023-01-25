import log from './logging'
import entrypoint from './entrypoint'

export default function push(a: any[] | string | undefined): void {
  if (a === undefined) {
    return
  }

  let fnName: string
  if (Array.isArray(a)) {
    fnName = a.shift()
  } else {
    fnName = a
    a = []
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
