/**
 * Returns true if the given object is a function.
 *
 * @param obj
 */
export default function isFunction(obj: any): boolean {
  return !!(obj && obj.constructor && obj.call && obj.apply)
}
