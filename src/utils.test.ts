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
  const decodedObj = { experience: 'ketch-consent-banner', 'nav-index': 2 }

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
    expect(utils.decodeDataNav(invalidStr)).toEqual({})
    expect(log.debug).toHaveBeenCalledWith(loggerName, error, expect.anything())
  })
})
