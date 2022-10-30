import log from './logging'
import entrypoint from './entrypoint'

export default function push(a: any): void {
  let p: Promise<any>
  let fnName: string
  if (Array.isArray(a)) {
    fnName = a.shift()
    p = entrypoint(fnName, ...a)
  } else {
    fnName = a
    p = entrypoint(fnName)
  }

  if (p && p.then) {
    p.then(() => {
      log.trace(`${fnName} completed`)
    }).catch((reason: any) => {
      log.trace(`${fnName} failed: ${reason}`)
    })
  }
}
