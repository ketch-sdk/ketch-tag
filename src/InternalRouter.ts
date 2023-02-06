import Router from './Router'
import { Ketch } from './Ketch'
import {
  StorageOriginPolicy,
  StorageProvider,
  Consent,
  ExperienceClosedReason,
  InvokeRightEvent,
  Ketch as KetchAPI,
} from '@ketch-sdk/ketch-types'

export default class InternalRouter extends Router implements KetchAPI {
  constructor(ketch: Ketch) {
    super(ketch)
  }

  registerStorageProvider(policy: StorageOriginPolicy, provider: StorageProvider): Promise<void> {
    return this._ketch.registerStorageProvider(policy, provider)
  }

  setConsent(consent: Consent): Promise<void> {
    return this._ketch.setConsent(consent).then(() => {})
  }

  experienceClosed(reason: ExperienceClosedReason): Promise<void> {
    return this._ketch.experienceClosed(reason).then(() => {})
  }

  invokeRight(eventData: InvokeRightEvent): Promise<void> {
    return this._ketch.invokeRight(eventData)
  }
}
