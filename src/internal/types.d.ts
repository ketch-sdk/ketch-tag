import * as ketchapi from "@ketch-sdk/ketch-web-api";

export declare type Callback = (arg0: any)=>void;

export type Status = {[key: string]: boolean};

export type Consent = {
  purposes: Status;
  vendors: Status;
}

export interface Plugin {
  init: (host: Ketch, config: ketchapi.Configuration) => void;
  environmentLoaded: (host: Ketch, config: ketchapi.Configuration, env: ketchapi.Environment) => void;
  geoIPLoaded: (host: Ketch, config: ketchapi.Configuration, ipInfo: ketchapi.IPInfo) => void;
  identitiesLoaded: (host: Ketch, config: ketchapi.Configuration, identities: string[]) => void;
  jurisdictionLoaded: (host: Ketch, config: ketchapi.Configuration, policyScope: string) => void;
  regionInfoLoaded: (host: Ketch, config: ketchapi.Configuration, region: string) => void;

  consentChanged: (host: Ketch, config: ketchapi.Configuration, consent: Consent) => void;
  rightInvoked: (host: Ketch, config: ketchapi.Configuration, request: ketchapi.InvokeRightRequest) => void;

  showPreferenceExperience: ShowPreferenceExperience;
  closePreferenceExperience: () => void;
  showConsentExperience: ShowConsentExperience;
  closeConsentExperience: () => void;
}

export interface Ketch {
  getConfig(): Promise<ketchapi.Configuration>;
  getConsent(): Promise<Consent>;
  getEnvironment(): Promise<ketchapi.Environment>;
  getGeoIP(): Promise<ketchapi.IPInfo>;
  getIdentities(): Promise<string[]>;
  getPolicyScope(): Promise<string>;
  getProperty(p: string): string | null;
  getRegionInfo(): Promise<string>;

  hasConsent(): boolean;

  changeConsent(consent: Consent): Promise<void>;)
  invokeRight(eventData: InvokeRightsEvent): Promise<void>;

  onConsent(callback: Callback): void;
  onEnvironment(callback: Callback): void;
  onGeoIP(callback: Callback): void;
  onHideExperience(callback: Function): void;
  onIdentities(callback: Callback): void;
  onInvokeRight(callback: Callback): void;
  onPolicyScope(callback: Callback): void;
  onRegionInfo(callback: Callback): void;
  onShowConsentExperience(callback: ShowConsentExperience): void;
  onShowPreferenceExperience(callback: ShowPreferenceExperience): void;
  onCloseConsentExperience(callback: Callback): void;
  onClosePreferenceExperience(callback: Callback): void;

  registerPlugin(plugin: Plugin): void;

  setConsent(c: Consent): Promise<Consent>;
  setEnvironment(env: ketchapi.Environment): Promise<ketchapi.Environment>;
  setGeoIP(g: ketchapi.IPInfo): Promise<ketchapi.IPInfo>;
  setIdentities(id: string[]): Promise<string[]>;
  setPolicyScope(ps: string): Promise<string>;
  setRegionInfo(info: string): Promise<string>;

  shouldShowConsent(c: Consent): boolean;

  showConsentExperience(): Promise<Consent>;
  showPreferenceExperience(): Promise<Consent>;
}

export type ShowPreferenceExperience = (host: Ketch, config: ketchapi.Configuration, consents: Consent) => void;
export type ShowConsentExperience = (host: Ketch, config: ketchapi.Configuration, consents: Consent, experienceHint: string) => void;

export type InvokeRightsEvent = {
  right: string;
  firstName: string;
  lastName: string;
  rightsEmail: string;
  country: string;
  state: string;
  details: string;
};

export interface AppDiv {
  id: string;
  zIndex: string;
}
