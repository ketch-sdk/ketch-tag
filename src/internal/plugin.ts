import * as ketchapi from "@ketch-sdk/ketch-web-api";
import {ConsentStatus} from "./types";

export interface Plugin {
  onInit: (config: ketchapi.Configuration) => void;
  onEnvironment: (config: ketchapi.Configuration, env: ketchapi.Environment) => void;
  onGeoIP: (config: ketchapi.Configuration, ipInfo: ketchapi.IPInfo) => void;
  onIdentities: (config: ketchapi.Configuration, identities: string[]) => void;
  onPolicyScope: (config: ketchapi.Configuration, policyScope: string) => void;
  onRegionInfo: (config: ketchapi.Configuration, region: string) => void;

  onShowExperience: (config: ketchapi.Configuration /* , TODO */) => void;
  onHideExperience: (config: ketchapi.Configuration /* , TODO */) => void;

  onConsent: (config: ketchapi.Configuration, consent: ConsentStatus) => void;
  onInvokeRight: (config: ketchapi.Configuration, request: ketchapi.InvokeRightRequest) => void;
}
