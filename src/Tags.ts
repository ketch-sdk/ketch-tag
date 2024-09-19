import { Configuration, ConfigurationV2 } from '@ketch-sdk/ketch-types'
import constants from './constants'
import { Ketch } from './Ketch'
import log from './log'
import { wrapLogger } from '@ketch-sdk/ketch-logging'
import { addToKetchLog } from './Console'

type MappedElementConfig = {
  /**
   * HTML element to use, e.g. 'script' or 'iframe'
   */
  elementName: string

  /**
   * The name of the attribute which contains purpose codes required for the element to be
   * switched on
   */
  purposesAttribute?: string

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

  /**
   * If this flag is set, then the purpose mappings for this element are done in the Ketch platform
   * and can be found in the ConfigurationV2.mappings field.
   */
  isPlatformMapped?: boolean
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

  // Script elements mapped within the Ketch platform
  {
    elementName: 'script',
    requiredAttributes: ['data-ketch-id'],
    requiredAttributeValues: {
      type: 'text/plain',
    },
    enableActions: {
      attributeValueSwaps: {
        type: 'text/javascript',
      },
    },
    isPlatformMapped: true,
  },
]

export default class Tags {
  private readonly _ketch: Ketch
  private readonly _tagsConfig: MappedElementConfig[]
  private readonly _config: ConfigurationV2
  private _results: { [elementName: string]: { enabledElements: Element[]; disabledElements: Element[] } } = {}

  constructor(ketch: Ketch, tagsConfig: MappedElementConfig[], config: Configuration | ConfigurationV2) {
    this._ketch = ketch
    this._tagsConfig = tagsConfig
    this._config = config as ConfigurationV2

    // Add a listener to retry whenever consent is updated
    this._ketch.on(constants.CONSENT_EVENT, () => this.execute())
  }

  getMappedElements: (
    elementName: string,
    purposesAttribute?: string,
    requiredAttributes?: string[],
    requiredAttributeValues?: { [attributeName: string]: string },
    isPlatformMapped?: boolean,
  ) => Element[] = (
    elementName,
    purposesAttribute,
    requiredAttributes,
    requiredAttributeValues,
    isPlatformMapped = false,
  ) => {
    const l = wrapLogger(log, 'tags: getMappedElements')

    // Get all elements with this elementName, e.g. all script elements
    const elements = document.querySelectorAll(elementName)

    // Filter for only those elements having all required attributes and attribute:value pairs
    const filteredElements = Array.from(elements).filter(element => {
      // Check if element has the attribute storing ketch purposes, , e.g. data-purposes="..."
      const hasPurposesAttribute = purposesAttribute ? element.hasAttribute(purposesAttribute) : false

      // For elements with purposes mapped inside the Ketch platform (Consent > Tags screen), verify
      // that the element has the data-ketch-id attribute
      const hasKetchIdAttribute = isPlatformMapped && element.hasAttribute('data-ketch-id')

      // Check if element has all required attributes, e.g. data-src="..."
      const hasRequiredAttributes =
        !requiredAttributes || requiredAttributes?.every(attribute => element.hasAttribute(attribute))

      // Check if elements has all required attribute:value pairs, e.g. type="text/plain"
      const hasRequiredAttributeValues =
        !requiredAttributeValues ||
        Object.entries(requiredAttributeValues).every(([attribute, value]) => element.getAttribute(attribute) === value)
      return (hasPurposesAttribute || hasKetchIdAttribute) && hasRequiredAttributes && hasRequiredAttributeValues
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
    const consent = await this._ketch.getConsent()
    const purposes = consent?.purposes || {}
    l.debug('got consent purposes', purposes)
    const grantedPurposes = new Set(Object.keys(purposes).filter(key => purposes[key] === true))
    return grantedPurposes
  }

  // Return a list of required purpose codes for this element, either from the purposesAttribute on
  // the element or from the mapping within the config
  getRequiredPurposes: (element: Element, purposesAttribute?: string, isPlatformMapped?: boolean) => string[] = (
    element,
    purposesAttribute,
    isPlatformMapped = false,
  ) => {
    const l = wrapLogger(log, 'tags: getRequiredPurposes')
    if (isPlatformMapped) {
      // Get purpose mappings from config - TODO:JB - Finish once config type is updated
      const id = element.getAttribute('data-ketch-id') || ''
      console.log(id)
      return this._config.tags?.[id]?.purposeCodes || []
    } else {
      // Handle case where no purpose attribute defined in MappingConfig
      if (!purposesAttribute) {
        l.error('No purposes attribute for element: ', element)
        return []
      }
      return element.getAttribute(purposesAttribute)?.split(' ') || []
    }
  }

  // Get elements on the page which are mapped to purposes, and enable those which
  // we have consent for
  execute = async () => {
    const l = wrapLogger(log, 'tags: execute')

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
        isPlatformMapped,
      } = mappingConfig

      // Get mapped elements
      const mappedElements = this.getMappedElements(
        elementName,
        purposesAttribute,
        requiredAttributes,
        requiredAttributeValues,
        isPlatformMapped,
      )

      // Enable elements for which we have consent
      const enabledElements = mappedElements.filter(element => {
        const requiredPurposes = this.getRequiredPurposes(element, purposesAttribute, isPlatformMapped)
        // If a tag is mapped as though it should be configured in the Ketch platform but there is no required
        // purposes for it in the config, enable the tag
        const isKetchIdNotInConfig = isPlatformMapped && !requiredPurposes.length
        l.debug('required purposes for element', element, requiredPurposes)
        // Enable element
        if (isKetchIdNotInConfig || requiredPurposes.some(purposeCode => grantedPurposes.has(purposeCode))) {
          this.enableElement(element, attributeNameSwaps, attributeValueSwaps)
          return true
        }
        return false
      })

      // Get elements which we don't have consent for and will stay disabled
      const disabledElements = mappedElements.filter(element => {
        const requiredPurposes = this.getRequiredPurposes(element, purposesAttribute, isPlatformMapped)
        return !requiredPurposes.some(purposeCode => grantedPurposes.has(purposeCode))
      })

      // Update results
      const previousEnabledElements = this._results[elementName]?.enabledElements || []
      const previousDisabledElements = (this._results[elementName]?.disabledElements || []).filter(
        // Remove newly or previously enabled elements from previously disabled elements array
        element => !previousEnabledElements.includes(element) && !enabledElements.includes(element),
      )
      this._results[elementName] = {
        enabledElements: [...previousEnabledElements, ...enabledElements],
        disabledElements: [...previousDisabledElements, ...disabledElements],
      }
      l.debug(
        `enabled ${elementName} elements:`,
        enabledElements,
        `disabled ${elementName} elements:`,
        disabledElements,
      )
    })

    // Once enabling is complete, add a window.KetchLog.getWrappedTags utility function
    addToKetchLog('getWrappedTags', () => {
      Object.entries(this._results).forEach(([elementName, { enabledElements, disabledElements }]) => {
        // Log results
        console.group(
          `%cWrapped %c<${elementName}>%c Tags`,
          '', // No styling for 'Wrapped'
          'font-family: monospace; background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; color: #333;', // Styling for '<element>'
          '', // No styling for ' Tags'
        )

        // Blocked tags
        console.groupCollapsed(`%cBlocked (${disabledElements.length})`, 'color: red')
        disabledElements.forEach(element => console.log(element))
        console.groupEnd()

        // Allowed tags
        console.groupCollapsed(`%cAllowed (${enabledElements.length})`, 'color: green')
        enabledElements.forEach(element => console.log(element))
        console.groupEnd()

        console.groupEnd()
      })
    })

    // Combine all enabled elements for each element type (script, iframe, etc.) into a list
    const allEnabledElements = Object.values(this._results).reduce((acc, current) => {
      return acc.concat(current.enabledElements)
    }, [] as Element[])

    return allEnabledElements
  }
}
