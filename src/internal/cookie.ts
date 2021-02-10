import errors from './errors';
import loglevel from './logging';
const log = loglevel.getLogger('cookie');

/**
 * Get a value from a cookie by the key.
 *
 * @param key
 */
export function getCookie(key: string): Promise<string> {
  log.trace('getItem', key);

  return new Promise((resolve, reject) => {
    try {
      const v = window.document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=');
        return parts[0] === key ? decodeURIComponent(parts[1]) : r;
      }, '');

      if (v) {
        resolve(v);
      } else {
        reject(errors.itemNotFoundError);
      }
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Set the value against the given key
 *
 * @param key
 * @param value
 * @param ttl
 */
export function setCookie(key: string, value: any, ttl?: number): Promise<string> {
  log.trace('setItem', key, value);

  return new Promise((resolve, reject) => {
    try {
      const days = ttl || 1;

      const expires = new Date(Date.now() + days * 864e5).toUTCString();
      window.document.cookie = key + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';

      resolve(value);
    } catch (e) {
      reject(e);
    }
  });
}
