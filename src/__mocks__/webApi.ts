import { Configuration } from '@ketch-sdk/ketch-types'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'

export const webAPIMock = {
  getLocation: jest.fn(), // () => Promise<GetLocationResponse>
  getBootstrapConfiguration: jest.fn(), // () => request: GetBootstrapConfigurationRequest): Promise<Configuration>
  getFullConfiguration: jest.fn(), // () => request: GetFullConfigurationRequest): Promise<Configuration>
  getConsent: jest.fn(), // () => request: GetConsentRequest): Promise<GetConsentResponse>
  setConsent: jest.fn(), // () => request: SetConsentRequest): Promise<void>
  invokeRight: jest.fn(), // () => request: InvokeRightRequest): Promise<void>
  preferenceQR: jest.fn(), // () => request: GetPreferenceQRRequest): Promise<string>
  webReport: jest.fn(), // () => channel: string, request: WebReportRequest): Promise<void>
  getSubscriptionsConfiguration: jest.fn(),
  getConsentConfiguration: jest.fn(),
  getPreferenceConfiguration: jest.fn(),
}
export const webAPI = webAPIMock as unknown as KetchWebAPI
export const emptyConfig = {} as Configuration
