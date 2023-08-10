import { Configuration } from '@ketch-sdk/ketch-types'
import { Ketch } from './'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'

describe('identities', () => {
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
        canonicalRightCode: 'get'
      },
      {
        code: 'rtbf',
        name: 'Data Deletion',
        description: 'Right to be forgotten.',
        canonicalRightCode: 'delete'
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

  const identities = {
    space1: 'id1',
  }

  const identities2 = {
    space2: 'id2',
  }

  const identities3 = {
    space1: 'newid1',
    space3: 'id3',
  }

  describe('setIdentities', () => {
    it('handles merging of identities', () => {
      const ketch = new Ketch(new KetchWebAPI(''), config)
      return ketch.setIdentities(identities).then(x => {
        expect(x).toEqual({
          space1: 'id1',
        })
        ketch.setIdentities(identities2).then(x => {
          expect(x).toEqual({
            space1: 'id1',
            space2: 'id2',
          })
          ketch.setIdentities(identities3).then(x => {
            expect(x).toEqual({
              space1: 'newid1',
              space2: 'id2',
              space3: 'id3',
            })
          })
        })
      })
    })
  })
})
