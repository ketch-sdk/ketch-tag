import Builder from './Builder'
import { Ketch } from './Ketch'
import Tags, { TagsConfig } from './Tags'
import { Configuration, ConfigurationV2, Consent, IdentityType } from '@ketch-sdk/ketch-types'
import fetchMock from 'jest-fetch-mock'

describe('Tags', () => {
  // @ts-ignore
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
        code: '0',
        legalBasisCode: 'lb1',
      },
      // @ts-ignore
      {
        code: '1',
        legalBasisCode: 'lb2',
      },
      // @ts-ignore
      {
        code: '2',
        legalBasisCode: 'lb4',
      },
    ],
    options: {
      migration: '3',
    },
    identities: {
      space1: {
        type: IdentityType.IDENTITY_TYPE_WINDOW,
        variable: 'id1',
      },
    },
  }

  // @ts-ignore
  const configV2: ConfigurationV2 = {
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
        code: '0',
        legalBasisCode: 'lb1',
      },
      // @ts-ignore
      {
        code: '1',
        legalBasisCode: 'lb2',
      },
      // @ts-ignore
      {
        code: '2',
        legalBasisCode: 'lb4',
      },
    ],
    options: {
      migration: '3',
    },
    identities: {
      space1: {
        type: IdentityType.IDENTITY_TYPE_WINDOW,
        variable: 'id1',
      },
    },
    tags: {
      '1': {
        purposeCodes: ['purpose-1'],
      },
      '2': {
        purposeCodes: ['purpose-2', 'purpose-3'],
      },
      // Test GTM/Adobe tags which should not be wrapped
      '2rX92N95ZoveKKtluFjW7E_121': {
        purposeCodes: ['advertising'],
      },
      '2rX92N95ZoveKKtluFjW7E_14': {
        purposeCodes: ['analytics'],
      },
      '2rX92N95ZoveKKtluFjW7E_20': {
        purposeCodes: ['analytics'],
      },
    },
  }

  let ketch: Ketch
  let tags: Tags

  beforeEach(async () => {
    // Setup ketch tag and builder
    jest.spyOn(window.navigator, 'language', 'get').mockReturnValue('')
    const builder = new Builder(config)
    config.language = 'en'
    fetchMock.mockResponseOnce(async (): Promise<string> => JSON.stringify(config))
    ketch = await builder.build()
    tags = new Tags(ketch, TagsConfig, configV2)

    // Mock the document.querySelectorAll method
    jest.spyOn(document, 'querySelectorAll').mockImplementation((_: string) => {
      // Elements which we will add to our mock return of querySelectorAll
      const scriptElement1 = document.createElement('script')
      const scriptElement2 = document.createElement('script')
      const scriptElement3 = document.createElement('script')
      const scriptElement4 = document.createElement('script')
      const scriptElement5 = document.createElement('script')
      const scriptElement6 = document.createElement('script')
      const scriptElement7 = document.createElement('script')
      const scriptElement8 = document.createElement('script')
      const scriptElement9 = document.createElement('script')
      const scriptElement10 = document.createElement('script')
      const iframeElement1 = document.createElement('iframe')
      const iframeElement2 = document.createElement('iframe')
      const iframeElement3 = document.createElement('iframe')

      // Script with data-purposes attribute and type="text/plain"
      scriptElement1.src = 'mock-script-1.js'
      scriptElement1.setAttribute('data-purposes', 'purpose-1')
      scriptElement1.setAttribute('type', 'text/plain')

      // Script with data-purposes attribute but not type="text/plain"
      scriptElement2.src = 'mock-script-2.js'
      scriptElement2.setAttribute('data-purposes', 'purpose-1')

      // Script with type="text/plain" attribute but not data-purposes
      scriptElement3.src = 'mock-script-3.js'
      scriptElement3.setAttribute('type', 'text/plain')

      // Script with data-purposes attribute and type="text/plain"
      scriptElement4.src = 'mock-script-4.js'
      scriptElement4.setAttribute('data-purposes', 'purpose-1 purpose-3')
      scriptElement4.setAttribute('type', 'text/plain')

      // Script with data-purposes attribute and type="text/plain"
      scriptElement5.src = 'mock-script-5.js'
      scriptElement5.setAttribute('data-purposes', 'purpose-3')
      scriptElement5.setAttribute('type', 'text/plain')

      // Script with data-purposes attribute and type="text/plain"
      scriptElement6.src = 'mock-script-6.js'
      scriptElement6.setAttribute('data-purposes', 'purpose-1 purpose-2')
      scriptElement6.setAttribute('type', 'text/plain')

      // Script with data-purposes attribute and type="text/plain"
      scriptElement7.setAttribute('data-purposes', 'purpose-1')
      scriptElement7.setAttribute('type', 'text/plain')
      scriptElement7.textContent = `
        console.log('This is an inline script');
      `

      // Script with data-purposes attribute and type="text/plain"
      scriptElement8.src = 'mock-script-1.js'
      scriptElement8.setAttribute('data-ketch-id', '1')
      scriptElement8.setAttribute('type', 'text/plain')

      // Script with data-purposes attribute and type="text/plain"
      scriptElement9.src = 'mock-script-2.js'
      scriptElement9.setAttribute('data-ketch-id', '2')
      scriptElement9.setAttribute('type', 'text/plain')

      // Script with data-purposes attribute and type="text/plain"
      scriptElement10.src = 'mock-script-3.js'
      scriptElement10.setAttribute('data-ketch-id', '3')
      scriptElement10.setAttribute('type', 'text/plain')

      // Iframe with data-src and data-purposes
      iframeElement1.setAttribute('data-src', 'www.youtube.com/embed/some-video')
      iframeElement1.setAttribute('data-purposes', 'purpose-1')

      // Iframe with data-src and no data-purposes
      iframeElement2.setAttribute('data-src', 'www.youtube.com/embed/some-video')

      // Iframe with data-purposes and no data-src
      iframeElement3.setAttribute('data-purposes', 'purpose-1')

      const elementsArray = [
        scriptElement1,
        scriptElement2,
        scriptElement3,
        scriptElement4,
        scriptElement5,
        scriptElement6,
        scriptElement7,
        scriptElement8,
        scriptElement9,
        scriptElement10,
        iframeElement1,
        iframeElement2,
        iframeElement3,
      ]

      return {
        length: elementsArray.length,
        item: (index: number) => elementsArray[index] || null,
        forEach: (callback: (element: Element, index: number, array: Element[]) => void) => {
          elementsArray.forEach(callback)
        },
        [Symbol.iterator]: function* () {
          for (let element of elementsArray) {
            yield element
          }
        },
      } as unknown as NodeListOf<Element>
    })

    // Mock consents
    jest.spyOn(ketch, 'getConsent').mockResolvedValue({
      purposes: {
        'purpose-1': true,
        'purpose-2': true,
        'purpose-3': false,
      },
    })
  })

  it('gets mapped script elements', async () => {
    const { elementName, purposesAttribute, requiredAttributes, requiredAttributeValues } = TagsConfig[0]

    const mappedElements = tags.getMappedElements(
      elementName,
      purposesAttribute,
      requiredAttributes,
      requiredAttributeValues,
    )

    // Verify that only scriptElement1 is returned
    expect(mappedElements.length).toBe(5)
    expect(mappedElements[0].getAttribute('src')).toBe('mock-script-1.js')
    expect(mappedElements[1].getAttribute('src')).toBe('mock-script-4.js')
    expect(mappedElements[2].getAttribute('src')).toBe('mock-script-5.js')
    expect(mappedElements[3].getAttribute('src')).toBe('mock-script-6.js')
    expect(mappedElements[4].textContent?.trim()).toBe("console.log('This is an inline script');")
    expect(mappedElements[0].getAttribute('data-purposes')).toBe('purpose-1')
    expect(mappedElements[0].getAttribute('type')).toBe('text/plain')
  })

  it('gets platform mapped script elements', async () => {
    const { elementName, purposesAttribute, requiredAttributes, requiredAttributeValues, isPlatformMapped } =
      TagsConfig[2]

    const mappedElements = tags.getMappedElements(
      elementName,
      purposesAttribute,
      requiredAttributes,
      requiredAttributeValues,
      isPlatformMapped,
    )

    // Verify mapped elements returned are the platform mapped scripts, having data-ketch-id as an attribute
    expect(mappedElements.length).toBe(3)
    expect(mappedElements[0].getAttribute('data-ketch-id')).toBe('1')
    expect(mappedElements[1].getAttribute('data-ketch-id')).toBe('2')
    expect(mappedElements[2].getAttribute('data-ketch-id')).toBe('3')
    expect(mappedElements[0].getAttribute('src')).toBe('mock-script-1.js')
    expect(mappedElements[1].getAttribute('src')).toBe('mock-script-2.js')
    expect(mappedElements[2].getAttribute('src')).toBe('mock-script-3.js')
    expect(mappedElements[0].getAttribute('type')).toBe('text/plain')
    expect(mappedElements[1].getAttribute('type')).toBe('text/plain')
    expect(mappedElements[2].getAttribute('type')).toBe('text/plain')
  })

  it('gets mapped iframe elements', async () => {
    const { elementName, purposesAttribute, requiredAttributes, requiredAttributeValues } = TagsConfig[1]

    const mappedElements = tags.getMappedElements(
      elementName,
      purposesAttribute,
      requiredAttributes,
      requiredAttributeValues,
    )

    // Verify that only iframeElement1 is returned
    expect(mappedElements.length).toBe(1)
    expect(mappedElements[0].getAttribute('data-src')).toBe('www.youtube.com/embed/some-video')
    expect(mappedElements[0].getAttribute('data-purposes')).toBe('purpose-1')
  })

  it('gets required purposes for platform mapped scripts', async () => {
    const { elementName, purposesAttribute, requiredAttributes, requiredAttributeValues, isPlatformMapped } =
      TagsConfig[2]

    const mappedElements = tags.getMappedElements(
      elementName,
      purposesAttribute,
      requiredAttributes,
      requiredAttributeValues,
      isPlatformMapped,
    )

    expect(mappedElements.length).toBe(3)

    const tag1purposes = tags.getRequiredPurposes(mappedElements[0], purposesAttribute, isPlatformMapped)
    const tag2purposes = tags.getRequiredPurposes(mappedElements[1], purposesAttribute, isPlatformMapped)
    const tag3purposes = tags.getRequiredPurposes(mappedElements[2], purposesAttribute, isPlatformMapped)

    expect(tag1purposes.length).toBe(1)
    expect(tag2purposes.length).toBe(2)
    expect(tag3purposes.length).toBe(0)
  })

  it('gets granted purposes', async () => {
    const grantedPurposes = await tags.getGrantedPurposes()

    expect(grantedPurposes.size).toBe(2)
    expect(grantedPurposes.has('purpose-1')).toBe(true)
    expect(grantedPurposes.has('purpose-2')).toBe(true)
    expect(grantedPurposes.has('purpose-3')).toBe(false)
  })

  it('enables script elements', () => {
    const {
      elementName,
      purposesAttribute,
      requiredAttributes,
      requiredAttributeValues,
      enableActions: { attributeNameSwaps, attributeValueSwaps },
    } = TagsConfig[0]

    const mappedElements = tags.getMappedElements(
      elementName,
      purposesAttribute,
      requiredAttributes,
      requiredAttributeValues,
    )

    expect(mappedElements.length).toBe(5)
    mappedElements.forEach(element => {
      // Verify that before enabling the script has type="text/plain"
      expect(element.getAttribute('type')).toBe('text/plain')
      // Verify that after enabling the script has type="text/javascript"
      const enabledElement = tags.enableElement(element, attributeNameSwaps, attributeValueSwaps)
      expect(enabledElement.getAttribute('type')).toBe('text/javascript')
    })
  })

  it('enables iframe elements', () => {
    const {
      elementName,
      purposesAttribute,
      requiredAttributes,
      requiredAttributeValues,
      enableActions: { attributeNameSwaps, attributeValueSwaps },
    } = TagsConfig[1]

    const mappedElements = tags.getMappedElements(
      elementName,
      purposesAttribute,
      requiredAttributes,
      requiredAttributeValues,
    )

    // Verify that before enabling the iframe has data-src="..."
    expect(mappedElements.length).toBe(1)
    expect(mappedElements[0].hasAttribute('src')).toBe(false)
    expect(mappedElements[0].getAttribute('data-src')).toBe('www.youtube.com/embed/some-video')
    // Verify that after enabling the iframe has src="..."
    const enabledElement = tags.enableElement(mappedElements[0], attributeNameSwaps, attributeValueSwaps)
    expect(enabledElement.hasAttribute('data-src')).toBe(false)
    expect(enabledElement.getAttribute('src')).toBe('www.youtube.com/embed/some-video')
  })

  it('enables only script elements for which we have consent', async () => {
    const enabledElements = await tags.execute()
    expect(enabledElements.length).toBe(8)
    // Tests the case where only one purpose was provided in the data-purposes attribute
    // and we have consent for that one
    expect(enabledElements[0].getAttribute('src')).toBe('mock-script-1.js')
    // Tests the case where multiple purposes were provided in the data-purposes attribute
    // and we have consent for at least one of them
    expect(enabledElements[1].getAttribute('src')).toBe('mock-script-4.js')
    // Tests the case where multiple purposes were provided in the data-purposes attribute
    // and we have consent for both of them
    expect(enabledElements[2].getAttribute('src')).toBe('mock-script-6.js')
    expect(enabledElements[3].textContent?.trim()).toBe("console.log('This is an inline script');")

    expect(enabledElements[4].getAttribute('data-ketch-id')).toBe('1')
    expect(enabledElements[4].getAttribute('src')).toBe('mock-script-1.js')

    expect(enabledElements[5].getAttribute('data-ketch-id')).toBe('2')
    expect(enabledElements[5].getAttribute('src')).toBe('mock-script-2.js')

    expect(enabledElements[6].getAttribute('data-ketch-id')).toBe('3')
    expect(enabledElements[6].getAttribute('src')).toBe('mock-script-3.js')

    expect(enabledElements[7].getAttribute('src')).toBe('www.youtube.com/embed/some-video')
  })

  it('re-executes with updated consent values', async () => {
    // Spy on the execute method of the Tags instance
    const executeSpy = jest.spyOn(tags, 'execute')
    tags.execute()
    // Set consent to trigger the listener in the Tags constructor
    expect(executeSpy).toHaveBeenCalledTimes(1)
    ketch.setConsent({ purposes: { purpose1: true } })
    expect(executeSpy).toHaveBeenCalledTimes(2)
  })

  it('verifies no errors when consent is undefined', async () => {
    // Mock consents
    jest.spyOn(ketch, 'getConsent').mockResolvedValue(undefined as unknown as Consent)
    tags.execute()
  })

  it('verifies no errors when consent is has no consent field', async () => {
    // Mock consents
    jest.spyOn(ketch, 'getConsent').mockResolvedValue({} as Consent)
    tags.execute()
  })
})
