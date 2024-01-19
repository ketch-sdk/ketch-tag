import type { Configuration } from '@ketch-sdk/ketch-types'
import { Ketch } from './'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import fetchMock from 'jest-fetch-mock'

jest.mock('./parameters')

describe('full config', () => {
  describe('getFullConfig', () => {
    it('returns the existing full config', () => {
      const config: Configuration = {
        organization: {
          code: 'org',
        },
        property: {
          code: 'app',
        },
        environment: {
          code: 'env',
        },
        jurisdiction: {
          code: 'ps',
        },
        rights: [
          {
            code: 'portability',
            name: 'Portability',
            description: 'Right to have all data provided to you.',
            canonicalRightCode: 'get',
          },
          {
            code: 'rtbf',
            name: 'Data Deletion',
            description: 'Right to be forgotten.',
            canonicalRightCode: 'delete',
          },
        ],
        purposes: [
          // @ts-ignore
          {
            code: 'pacode1',
            legalBasisCode: 'lb1',
          },
          // @ts-ignore
          {
            code: 'pacode2',
            legalBasisCode: 'lb2',
          },
          // @ts-ignore
          {
            code: 'pacode4',
            legalBasisCode: 'lb4',
          },
        ],
        options: {
          migration: '3',
        },
        formTemplates: [],
      }
      const ketch = new Ketch(new KetchWebAPI(''), config)

      fetchMock.mockResponse(async (): Promise<string> => {
        return JSON.stringify({
          theme: {
            banner: {},
            modal: {},
            preference: {},
          },
          experiences: {
            content: {
              banner: {},
              modal: {},
              preference: {},
              display: "banner",
              static: {}
            },
            layout: {
              banner: {},
              modal: {},
              preference: {},
            },
          },
        })
      })

      return expect(ketch.getFullConfig()).resolves.toStrictEqual({
        environment: {
          code: 'env',
        },
        experiences: {
          content: {
            banner: {},
            modal: {},
            preference: {},
            display: "banner",
            static: {}
          },
          layout: {
            banner: {},
            modal: {},
            preference: {},
          },
        },
        formTemplates: [],
        jurisdiction: {
          code: 'ps',
        },
        options: {
          migration: '3',
        },
        organization: {
          code: 'org',
        },
        property: {
          code: 'app',
        },
        purposes: [
          {
            code: 'pacode1',
            legalBasisCode: 'lb1',
          },
          {
            code: 'pacode2',
            legalBasisCode: 'lb2',
          },
          {
            code: 'pacode4',
            legalBasisCode: 'lb4',
          },
        ],
        rights: [
          {
            canonicalRightCode: 'get',
            code: 'portability',
            description: 'Right to have all data provided to you.',
            name: 'Portability',
          },
          {
            canonicalRightCode: 'delete',
            code: 'rtbf',
            description: 'Right to be forgotten.',
            name: 'Data Deletion',
          },
        ],
        theme: {
          banner: {},
          modal: {},
          preference: {},
        },
      })
    })
  })
})
