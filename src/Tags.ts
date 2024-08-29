import { Ketch } from './Ketch'
import log from './log'
import { wrapLogger } from '@ketch-sdk/ketch-logging'

type MappedElementConfig = {
  /**
   * HTML element to use, e.g. 'script' or 'iframe'
   */
  elementName: string

  /**
   * The name of the attribute which contains purpose codes required for the element to be
   * switched on
   */
  purposesAttribute: string

  /**
   * Attributes which must be present on the element (value does not matter)
   */
  requiredAttributes?: string[]

  /**
   * Attributes which must be present on the element with a certain value
   */
  requiredAttributeValues?: { [attributeName: string]: string }

  /**
   * This section defines what should happen when the element is turned 'on', i.e. we
   * have consent for one of the purposes listed in the purposesAttribute value for the element.
   */
  enableActions: {
    /**
     * Attributes that we should swap the name of, e.g. <iframe data-src="..."> to <iframe src="...">
     *
     * Map of attribute name to its new name, e.g. { data-src: 'src' }
     */
    attributeNameSwaps?: { [attributeName: string]: string }

    /**
     * Attributes that we should update the value of, e.g. <script type="text/plain"> to <script type="text/javascript">
     *
     * Map of attribute name to its new value, e.g. { type: 'text/javascript' }
     */
    attributeValueSwaps?: { [attributeName: string]: string }
  }
}

export const TagsConfig: MappedElementConfig[] = [
  // Script elements
  {
    elementName: 'script',
    purposesAttribute: 'data-purposes',
    requiredAttributeValues: {
      type: 'text/plain',
    },
    enableActions: {
      attributeValueSwaps: {
        type: 'text/javascript',
      },
    },
  },

  // IFrame elements
  {
    elementName: 'iframe',
    purposesAttribute: 'data-purposes',
    requiredAttributes: ['data-src'],
    enableActions: {
      attributeNameSwaps: {
        'data-src': 'src',
      },
    },
  },
]

export default class Tags {
  private readonly _ketch: Ketch
  private readonly _tagsConfig: MappedElementConfig[]

  constructor(ketch: Ketch, tagsConfig: MappedElementConfig[]) {
    this._ketch = ketch
    this._tagsConfig = tagsConfig
  }

  getMappedElements: (
    elementName: string,
    purposesAttribute: string,
    requiredAttributes?: string[],
    requiredAttributeValues?: { [attributeName: string]: string },
  ) => Element[] = (elementName, purposesAttribute, requiredAttributes, requiredAttributeValues) => {
    const l = wrapLogger(log, 'tags: getMappedElements')

    // Get all elements with this elementName, e.g. all script elements
    const elements = document.querySelectorAll(elementName)

    // Filter for only those elements having all required attributes and attribute:value pairs
    const filteredElements = Array.from(elements).filter(element => {
      // Check if element has the attribute storing ketch purposes, , e.g. data-purposes="..."
      const hasPurposesAttribute = element.hasAttribute(purposesAttribute)

      // Check if element has all required attributes, e.g. data-src="..."
      const hasRequiredAttributes =
        !requiredAttributes || requiredAttributes?.every(attribute => element.hasAttribute(attribute))

      // Check if elements has all required attribute:value pairs, e.g. type="text/plain"
      const hasRequiredAttributeValues =
        !requiredAttributeValues ||
        Object.entries(requiredAttributeValues).every(([attribute, value]) => element.getAttribute(attribute) === value)
      return hasPurposesAttribute && hasRequiredAttributes && hasRequiredAttributeValues
    })

    l.debug(`found ${filteredElements.length} '${elementName}' elements mapped to ketch purposes`)

    return filteredElements
  }

  enableElement: (
    element: Element,
    nameSwaps?: { [attributeName: string]: string },
    valueSwaps?: { [attributeName: string]: string },
  ) => Element = (element, nameSwaps = {}, valueSwaps = {}) => {
    const l = wrapLogger(log, 'tags: enableElement')
    l.debug('enabling element', element)
    let newElement: Element | undefined = undefined

    // Update attribute names
    Object.entries(nameSwaps).forEach(([currentName, newName]) => {
      const value = element.getAttribute(currentName)
      if (value) {
        element.setAttribute(newName, value)
        element.removeAttribute(currentName)
      }
    })

    // Update attribute values
    Object.entries(valueSwaps).forEach(([name, newValue]) => {
      // Clone the element
      newElement = element.cloneNode(true) as HTMLElement

      // Update the attribute
      newElement.setAttribute(name, newValue)

      // Replace the current element with the new one
      element.parentNode?.replaceChild(newElement, element)
    })

    return newElement ?? element
  }

  // Return a promise containing the set of purposes codes for which we have consent
  getGrantedPurposes: () => Promise<Set<string>> = async () => {
    const l = wrapLogger(log, 'tags: getGrantedPurposes')
    const { purposes } = await this._ketch.getConsent()
    l.debug('got consent purposes', purposes)
    const grantedPurposes = new Set(Object.keys(purposes).filter(key => purposes[key] === true))
    return grantedPurposes
  }

  // Get elements on the page which are mapped to purposes, and enable those which
  // we have consent for
  execute = async () => {
    const l = wrapLogger(log, 'tags: execute')
    const enabledElements: Element[] = []

    // Get set of purposes codes which we have consent for
    const grantedPurposes = await this.getGrantedPurposes()
    l.debug('granted purposes', grantedPurposes)

    this._tagsConfig.forEach(async mappingConfig => {
      // Configuration for this mapping
      const {
        elementName,
        purposesAttribute,
        requiredAttributes,
        requiredAttributeValues,
        enableActions: { attributeNameSwaps, attributeValueSwaps },
      } = mappingConfig

      // Get mapped elements
      const mappedElements = this.getMappedElements(
        elementName,
        purposesAttribute,
        requiredAttributes,
        requiredAttributeValues,
      )

      mappedElements.forEach(element => {
        // Get purposes required for this tag
        const requiredPurposes = element.getAttribute(purposesAttribute)?.split(' ') || []
        l.debug('required purposes for element', element, requiredPurposes)

        // Enable the element if we have consent for at least one of its required purposes
        const grantedRequiredPurposes = requiredPurposes.filter(purposeCode => grantedPurposes.has(purposeCode))
        if (grantedRequiredPurposes.length) {
          l.debug('granted purposes for element', grantedRequiredPurposes)
          enabledElements.push(this.enableElement(element, attributeNameSwaps, attributeValueSwaps))
        }
      })
    })

    l.debug('enabled elements', enabledElements)
    return enabledElements
  }
}
