import Router from './Router'
import { Ketch } from './Ketch'
import {
  ConfigurationV2,
  Consent,
  ExperienceClosedReason,
  ExperienceDisplayType,
  InvokeRightEvent,
  Ketch as KetchAPI,
  SubscriptionConfiguration,
  Subscriptions,
} from '@ketch-sdk/ketch-types'

export default class InternalRouter extends Router implements KetchAPI {
  constructor(ketch: Ketch) {
    super(ketch)
  }

  experienceClosed(reason: ExperienceClosedReason): Promise<void> {
    return this._ketch.experienceClosed(reason).then(() => {})
  }

  invokeRight(eventData: InvokeRightEvent): Promise<void> {
    return this._ketch.invokeRight(eventData)
  }

  setProvisionalConsent(consent: Consent): Promise<void> {
    return this._ketch.setProvisionalConsent(consent)
  }

  /**
   * Get subscriptions
   */
  getSubscriptions(): Promise<Subscriptions> {
    return this._ketch.getSubscriptions()
  }

  /**
   * Set subscriptions
   *
   * @param request
   */
  setSubscriptions(request: Subscriptions): Promise<void> {
    return this._ketch.setSubscriptions(request)
  }

  /**
   * Get Subscription configuration
   */
  getSubscriptionConfiguration(): Promise<SubscriptionConfiguration> {
    return this._ketch.getSubscriptionConfiguration()
  }

  /**
   * Get Consent configuration
   */
  getConsentConfiguration(): Promise<ConfigurationV2> {
    return this._ketch.getConsentConfiguration()
  }

  /**
   * Get Preference configuration
   */
  getPreferenceConfiguration(): Promise<ConfigurationV2> {
    return this._ketch.getPreferenceConfiguration()
  }

  willChangeExperience(type: ExperienceDisplayType): Promise<void> {
    // TODO:JA - Implement
    return this._ketch.willChangeExperience(type).then(() => {})
  }

  hasChangedExperience(type: ExperienceDisplayType): Promise<void> {
    // TODO:JA - Implement
    return this._ketch.hasChangedExperience(type).then(() => {})
  }

  hasShownExperience(): Promise<void> {
    // TODO:JA - Implement
    return this._ketch.hasShownExperience().then(() => {})
  }
}
