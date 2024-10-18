import log from './log'
import * as utils from './utils'

jest.mock('./log')

describe('safeJsonParse', () => {
  it('should parse a valid JSON string correctly', () => {
    const input = '{"name":"John","age":30}'
    const expected = { name: 'John', age: 30 }
    expect(utils.safeJsonParse(input)).toEqual(expected)
  })

  it('should return {} for an empty string', () => {
    expect(utils.safeJsonParse('')).toEqual({})
  })

  it('should return {} for undefined input', () => {
    expect(utils.safeJsonParse()).toEqual({})
  })

  it('should return {} for a string with only whitespace', () => {
    expect(utils.safeJsonParse('   ')).toEqual({})
  })

  it('should log an error and return null for invalid JSON', () => {
    const invalidJson = '{"name": "John", "age":}'
    const result = utils.safeJsonParse(invalidJson)
    expect(result).toBeNull()
    expect(log.error).toHaveBeenCalled()
  })
})

describe('decodeDataNav', () => {
  const encodedStr = 'eyJleHBlcmllbmNlIjoia2V0Y2gtY29uc2VudC1iYW5uZXIiLCJuYXYtaW5kZXgiOjJ9'
  const decodedObj = { experience: 'ketch-consent-banner', 'nav-index': 2, src: encodedStr }

  it('should decode base 64 and parse JSON', () => {
    expect(utils.decodeDataNav(encodedStr)).toEqual(decodedObj)
  })

  it('should decode Base64 string and handle invalid JSON', () => {
    const base64String = window.btoa('{"name": "John", "age":}')
    const expected = {}

    jest.spyOn(window, 'atob').mockReturnValue('{"name": "John", "age":}')
    jest.spyOn(utils, 'safeJsonParse').mockReturnValue(expected)

    expect(utils.decodeDataNav(base64String)).toBeNull()
    jest.restoreAllMocks()
  })

  it('should handle invalid Base64 string', () => {
    const invalidStr = '!!!invalid!!!'
    const loggerName = '[decodeDataNav]'
    const error = `Invalid encoding: ${invalidStr}`
    expect(utils.decodeDataNav(invalidStr)).toBeNull()
    expect(log.debug).toHaveBeenCalledWith(loggerName, error, expect.anything())
  })
})

describe('sanitizePath', () => {
  it('should work for clean strings', () => {
    const goodStrings = ['en_US', 'us__hippa', 'FR']
    goodStrings.forEach(i => expect(utils.santizePaths(i)).toEqual(i))
  })

  it('should clean up bad string', () => {
    const badStrings = [
      '../../../../../../../web/v3/config/resistaz/website_smart_tag/production/default/en&xs=eval(atob(%27ZG9jdW1lbnQucXVlcnlTZWxlY3RvcigiI2FwcCA%2bIGRpdiA%2bIGRpdiA%2bIGRpdjpudGgtY2hpbGQoMykgPiBmb3JtID4gYSA%2bIGJ1dHRvbiIpLmFkZEV2ZW50TGlzdGVuZXIoImNsaWNrIixmdW5jdGlvbigpe1siYV9wb2MiLCJiX3BvYyIsImNfcG9jIiwiZF9wb2MiLCJhdV9wb2MiLCJidV9wb2MiLCJ1Y19wb2MiLCJkdV9wb2MiXS5mb3JFYWNoKG89PmRvY3VtZW50LmNvb2tpZT1gJHtvfT0keyIwIi5yZXBlYXQoMzkwMCl9O3BhdGg9L2FwaS9vYXV0aC9nb29nbGUvYCk7dHJ5e2xldCBvPXdpbmRvdy5vcGVuKCJodHRwczovL3BsYXRmb3JtLmZ1bGxjb250YWN0LmNvbS9hcGkvb2F1dGgvZ29vZ2xlP3R5cGU9bG9naW4mcmVtZW1iZXJtZT10cnVlJmNsaWVudD1hcGVydHVyZSZzaW1wbGU9dHJ1ZSIpLGM9c2V0SW50ZXJ2YWwoKCk9Pnt0cnl7by5sb2NhdGlvbi5vcmlnaW49PT13aW5kb3cubG9jYXRpb24ub3JpZ2luJiYodG9wLmRvY3VtZW50LndyaXRlKCJhdHRhY2tlciBjYW4gdGFrZW92ZXIgeW91ciBhY2NvdW50OiAiK28ubG9jYXRpb24pLGNsZWFySW50ZXJ2YWwoYykpfWNhdGNoKHQpe2NvbnNvbGUuZXJyb3IoIkVycm9yIGFjY2Vzc2luZyBuZXdXaW5kb3cgbG9jYXRpb246Iix0KX19LDUwKX1jYXRjaCh0KXtjb25zb2xlLmVycm9yKHQpfX0pOwpzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7bGV0IGU9ZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoImVtYWlsIilbMF0sdD1kb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgicGFzc3dvcmQiKVswXTtmdW5jdGlvbiBhKCl7dC52YWx1ZS5sZW5ndGg%2bMCYmYWxlcnQoYEhlcmUgaXMgdXNlciBjcmVkZW50aWFscyB0aGF0IGNhbiBiZSBmb3J3YXJkZWQgaW50byBhdHRhY2tlciBzZXJ2ZXIgKCAgSSBpbXBsZW1lbnRlZCB0aGUgcG9jIGluIHRoaXMgd2F5IHRvIHByZXZlbnQgeW91ciBjcmVkZW50aWFscyBmcm9tIGJlaW5nIHJlZGlyZWN0ZWQgdG8gbXkgd2Vic2l0ZSApICA6IEVtYWlsICR7ZS52YWx1ZX0gLCBQYXNzd29yZCA9ICR7dC52YWx1ZX1gKX1lJiZ0JiYoZS5mb3JtLmFkZEV2ZW50TGlzdGVuZXIoInN1Ym1pdCIsYSksW2UsdF0uZm9yRWFjaChlPT57WyJjaGFuZ2UiLCJpbnB1dCJdLmZvckVhY2godD0%2be2UuYWRkRXZlbnRMaXN0ZW5lcih0LGEpfSl9KSl9LDFlMyk7Cg==%27));',
      // eslint-disable-next-line no-script-url
      'javascript:void(0);',
    ]

    const expectedOutput = [
      'webv3configresistazwebsite_smart_tagproductiondefaultenxsevalatob27ZG9jdW1lbnQucXVlcnlTZWxlY3RvcigiI2FwcCA2bIGRpdiA2bIGRpdiA2bIGRpdjpudGgtY2hpbGQoMykgPiBmb3JtID4gYSA2bIGJ1dHRvbiIpLmFkZEV2ZW50TGlzdGVuZXIoImNsaWNrIixmdW5jdGlvbigpe1siYV9wb2MiLCJiX3BvYyIsImNfcG9jIiwiZF9wb2MiLCJhdV9wb2MiLCJidV9wb2MiLCJ1Y19wb2MiLCJkdV9wb2MiXS5mb3JFYWNoKG89PmRvY3VtZW50LmNvb2tpZT1gJHtvfT0keyIwIi5yZXBlYXQoMzkwMCl9O3BhdGg9L2FwaS9vYXV0aC9nb29nbGUvYCk7dHJ5e2xldCBvPXdpbmRvdy5vcGVuKCJodHRwczovL3BsYXRmb3JtLmZ1bGxjb250YWN0LmNvbS9hcGkvb2F1dGgvZ29vZ2xlP3R5cGU9bG9naW4mcmVtZW1iZXJtZT10cnVlJmNsaWVudD1hcGVydHVyZSZzaW1wbGU9dHJ1ZSIpLGM9c2V0SW50ZXJ2YWwoKCk9Pnt0cnl7by5sb2NhdGlvbi5vcmlnaW49PT13aW5kb3cubG9jYXRpb24ub3JpZ2luJiYodG9wLmRvY3VtZW50LndyaXRlKCJhdHRhY2tlciBjYW4gdGFrZW92ZXIgeW91ciBhY2NvdW50OiAiK28ubG9jYXRpb24pLGNsZWFySW50ZXJ2YWwoYykpfWNhdGNoKHQpe2NvbnNvbGUuZXJyb3IoIkVycm9yIGFjY2Vzc2luZyBuZXdXaW5kb3cgbG9jYXRpb246Iix0KX19LDUwKX1jYXRjaCh0KXtjb25zb2xlLmVycm9yKHQpfX0pOwpzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7bGV0IGU9ZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoImVtYWlsIilbMF0sdD1kb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgicGFzc3dvcmQiKVswXTtmdW5jdGlvbiBhKCl7dC52YWx1ZS5sZW5ndGg2bMCYmYWxlcnQoYEhlcmUgaXMgdXNlciBjcmVkZW50aWFscyB0aGF0IGNhbiBiZSBmb3J3YXJkZWQgaW50byBhdHRhY2tlciBzZXJ2ZXIgKCAgSSBpbXBsZW1lbnRlZCB0aGUgcG9jIGluIHRoaXMgd2F5IHRvIHByZXZlbnQgeW91ciBjcmVkZW50aWFscyBmcm9tIGJlaW5nIHJlZGlyZWN0ZWQgdG8gbXkgd2Vic2l0ZSApICA6IEVtYWlsICR7ZS52YWx1ZX0gLCBQYXNzd29yZCA9ICR7dC52YWx1ZX1gKX1lJiZ0JiYoZS5mb3JtLmFkZEV2ZW50TGlzdGVuZXIoInN1Ym1pdCIsYSksW2UsdF0uZm9yRWFjaChlPT57WyJjaGFuZ2UiLCJpbnB1dCJdLmZvckVhY2godD02be2UuYWRkRXZlbnRMaXN0ZW5lcih0LGEpfSl9KSl9LDFlMyk7Cg27',
      'javascriptvoid0',
    ]
    badStrings.forEach((i, idx) => {
      expect(utils.santizePaths(i)).toEqual(expectedOutput[idx])
    })
  })
})
