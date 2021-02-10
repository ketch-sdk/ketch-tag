/**
 * Returns true if the given object is empty.
 *
 * @param obj
 */
export default function isEmpty(obj: object): boolean {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }
  }

  return true;
}
