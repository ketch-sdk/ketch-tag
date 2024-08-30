import Builder from './Builder'
import { Ketch } from './Ketch'
import Tags, { TagsConfig } from './Tags'
import { Configuration, IdentityType } from '@ketch-sdk/ketch-types'
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

  let ketch: Ketch
  let tags: Tags

  beforeEach(async () => {
    // Setup ketch tag and builder
    jest.spyOn(window.navigator, 'language', 'get').mockReturnValue('')
    const builder = new Builder(config)
    config.language = 'en'
    fetchMock.mockResponseOnce(async (): Promise<string> => JSON.stringify(config))
    ketch = await builder.build()
    tags = new Tags(ketch, TagsConfig)

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
    expect(enabledElements[4].getAttribute('src')).toBe('www.youtube.com/embed/some-video')
  })

  it('re-executes with updated consent values', async () => {
    // Spy on the execute method of the Tags instance
    const executeSpy = jest.spyOn(tags, 'execute')
    tags.execute()
    // Set consent to trigger the listener in the Tags constructor
    ketch.setConsent({ purposes: { purpose1: true } })
    expect(executeSpy).toHaveBeenCalledTimes(2)
  })
})
