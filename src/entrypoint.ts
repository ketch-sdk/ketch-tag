import log from './logging'
import errors from './errors'
import getAction from './getAction'
import isFunction from './isFunction'
import { ketch } from './init'

/**
 * This is the entrypoint for all calls into the platform calling actions from outside.
 */
// TODO test
export default function entrypoint(fnName: string, ...args: any[]): Promise<any> {
  log.trace(fnName, args)

  const fn = getAction(fnName)
  if (fn === undefined) {
    return Promise.reject(errors.actionNotFoundError(fnName))
  }

  const fns = fn.toString().match(/^(function)?\s*[^(]*\(\s*([^)]*)\)/m)
  if (fns === null) {
    return Promise.reject(errors.actionNotFoundError(fnName))
  }

  const fnDef = fns[2]
  let argDecl = fnDef.split(',')
  if (fnDef === '') {
    argDecl = []
  }

  log.debug('entrypoint', fnName, args, argDecl)

  if (args.length <= argDecl.length) {
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
// TODO test
