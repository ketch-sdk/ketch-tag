import loglevel from './internal/logging'
import errors from './internal/errors'
import { Ketch, newFromBootstrap } from './pure'
import constants from './internal/constants'
const log = loglevel.getLogger('index')

type CommandEntry = string | any[]

let ketch: Ketch | undefined

log.trace('booting')

if (document.readyState === 'loading') {
  // Document hasn't finished loading yet, so add an event to init when content is loaded
  log.debug('adding event listener')
  document.addEventListener('DOMContentLoaded', init)
} else {
  // `DOMContentLoaded` has already fired, so just run init now (since an event handler will never be called)
  log.debug('page already loaded')
  init().then(() => {
    log.trace('booted')
  })
}

/**
 * This is the entry point when this package is first loaded.
 */
function init(): Promise<any> {
  const initRequest = getGlobal().shift()

  if (!Array.isArray(initRequest) || initRequest[0] != 'init') {
    log.error('ketch tag command queue is not configured correctly')
    return Promise.resolve()
  }

  const cfg = initRequest[1]

  return newFromBootstrap(cfg).then(k => {
    log.trace('init')

    ketch = k

    const p: Promise<any>[] = []

    const g = getGlobal(push)
    while (g.length > 0) {
      const x = g.shift()

      let r
      if (Array.isArray(x)) {
        const fnName = x.shift()
        r = entrypoint(fnName, ...x)
      } else if (x !== undefined) {
        r = entrypoint(x)
      }

      if (r) {
        p.push(r)
      }
    }

    p.push(ketch.getConsent())

    return Promise.all(p).then(() => {
      k.pollIdentity([1000, 2000, 4000, 8000])
    })
  })
}

function getAction(action: string): Function | undefined {
  if (ketch === undefined) {
    return undefined
  }

  switch (action) {
    // TODO: case 'onConfig': return ketch.onConfig;
    case 'getConfig':
      return ketch.getConfig
    case 'getConsent':
      return ketch.getConsent
    case 'getEnvironment':
      return ketch.getEnvironment
    case 'getGeoIP':
      return ketch.getGeoIP
    case 'getIdentities':
      return ketch.getIdentities
    case 'getJurisdiction':
      return ketch.getJurisdiction
    case 'getRegionInfo':
      return ketch.getRegionInfo
    case 'onConsent':
      return ketch.onConsent
    case 'onEnvironment':
      return ketch.onEnvironment
    case 'onGeoIP':
      return ketch.onGeoIP
    case 'onHideExperience':
      return ketch.onHideExperience
    case 'onWillShowExperience':
      return ketch.onWillShowExperience
    case 'onIdentities':
      return ketch.onIdentities
    case 'onJurisdiction':
      return ketch.onJurisdiction
    case 'onRegionInfo':
      return ketch.onRegionInfo
    case 'setEnvironment':
      return ketch.setEnvironment
    case 'setGeoIP':
      return ketch.setGeoIP
    case 'setIdentities':
      return ketch.setIdentities
    case 'setJurisdiction':
      return ketch.setJurisdiction
    case 'setRegionInfo':
      return ketch.setRegionInfo
    case 'showConsent':
      return ketch.showConsentExperience
    case 'showPreferences':
      return ketch.showPreferenceExperience
    case 'registerPlugin':
      return ketch.registerPlugin
  }

  return undefined
}

/**
 * Returns true if the given object is a function.
 *
 * @param obj
 */
function isFunction(obj: any): boolean {
  return !!(obj && obj.constructor && obj.call && obj.apply)
}

/**
 * This is the entrypoint for all calls into the platform calling actions from outside.
 */
function entrypoint(fnName: string, ...args: any[]): Promise<any> {
  log.trace(fnName, args)

  const fn = getAction(fnName)
  if (fn === undefined) {
    return Promise.reject(errors.actionNotFoundError(fnName))
  }

  const fns = fn.toString().match(/^function\s*[^(]*\(\s*([^)]*)\)/m)
  if (fns === null) {
    return Promise.reject(errors.actionNotFoundError(fnName))
  }

  const fnDef = fns[1]
  let argDecl = fnDef.split(',')
  if (fnDef === '') {
    argDecl = []
  }

  log.debug('entrypoint', fnName, args, argDecl)

  if (args.length < argDecl.length) {
    return Promise.reject(errors.missingArgumentsError(fnName))
  }

  if (args.length == argDecl.length) {
    return fn.apply(ketch, args)
  }

  if (args.length == argDecl.length + 1) {
    const resolve = args.pop()
    if (!isFunction(resolve)) {
      return Promise.reject(errors.expectedFunctionError(fnName))
    }

    return fn.apply(ketch, args).then(resolve)
  }

  const reject = args.pop()
  if (!isFunction(reject)) {
    return Promise.reject(errors.expectedFunctionError(fnName))
  }

  const resolve = args.pop()
  if (!isFunction(resolve)) {
    return Promise.reject(errors.expectedFunctionError(fnName))
  }

  return fn.apply(ketch, args).then(resolve).catch(reject)
}

function push(a: any): void {
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

function getGlobal(pusher?: Function): CommandEntry[] {
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
  }

  return v
}
