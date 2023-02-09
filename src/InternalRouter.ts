import Router from './Router'
import { Ketch } from './Ketch'
import { Consent, ExperienceClosedReason, InvokeRightEvent, Ketch as KetchAPI } from '@ketch-sdk/ketch-types'

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
}
