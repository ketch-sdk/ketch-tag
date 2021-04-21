import * as ketchapi from "@ketch-sdk/ketch-web-api";

export declare type Callback = (arg0: any)=>void;

export type ConsentStatus = {[key: string]: boolean};

export interface Plugin {
  onInit: (host: Ketch, config: ketchapi.Configuration) => void;
  onEnvironment: (host: Ketch, config: ketchapi.Configuration, env: ketchapi.Environment) => void;
  onGeoIP: (host: Ketch, config: ketchapi.Configuration, ipInfo: ketchapi.IPInfo) => void;
  onIdentities: (host: Ketch, config: ketchapi.Configuration, identities: string[]) => void;
  onPolicyScope: (host: Ketch, config: ketchapi.Configuration, policyScope: string) => void;
  onRegionInfo: (host: Ketch, config: ketchapi.Configuration, region: string) => void;

  onShowExperience: (host: Ketch, config: ketchapi.Configuration /* , TODO */) => void;
  onHideExperience: (host: Ketch, config: ketchapi.Configuration /* , TODO */) => void;

  onConsent: (host: Ketch, config: ketchapi.Configuration, consent: ConsentStatus) => void;
  onInvokeRight: (host: Ketch, config: ketchapi.Configuration, request: ketchapi.InvokeRightRequest) => void;

  showPreferences: ShowPreferences;
  showConsent: ShowConsent;
}

export interface Ketch {
  getConfig(): Promise<ketchapi.Configuration>;
  getConsent(): Promise<ConsentStatus>;
  getEnvironment(): Promise<ketchapi.Environment>;
  getGeoIP(): Promise<ketchapi.IPInfo>;
  getIdentities(): Promise<string[]>;
  getPolicyScope(): Promise<string>;
  getProperty(p: string): string | null;
  getRegionInfo(): Promise<string>;

  hasConsent(): boolean;

  invokeRight(identities: string[], eventData: InvokeRightsEvent): Promise<void>;

  onConsent(callback: Callback): void;
  onEnvironment(callback: Callback): void;
  onGeoIP(callback: Callback): void;
  onHideExperience(callback: Function): void;
  onIdentities(callback: Callback): void;
  onInvokeRight(callback: Callback): void;
  onPolicyScope(callback: Callback): void;
  onRegionInfo(callback: Callback): void;
  onShowConsent(callback: ShowConsent): void;
  onShowExperience(callback: Function): void;
  onShowPreferences(callback: ShowPreferences): void;

  registerPlugin(plugin: Plugin): void;

  setConsent(c: ConsentStatus): Promise<ConsentStatus>;
  setEnvironment(env: ketchapi.Environment): Promise<ketchapi.Environment>;
  setGeoIP(g: ketchapi.IPInfo): Promise<ketchapi.IPInfo>;
  setIdentities(id: string[]): Promise<string[]>;
  setPolicyScope(ps: string): Promise<string>;
  setRegionInfo(info: string): Promise<string>;

  shouldShowConsent(c: ConsentStatus): boolean;

  showConsent(): Promise<ConsentStatus>;
  showPreferences(): Promise<ConsentStatus>;
}

export type ShowPreferences = (host: Ketch, config: ketchapi.Configuration, consents: ConsentStatus) => void;
export type ShowConsent = (host: Ketch, config: ketchapi.Configuration, consents: ConsentStatus, experienceHint: string) => void;

export type UpdateConsentEvent = {
  consent: ConsentStatus;
}

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
