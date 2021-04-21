import * as ketchapi from "@ketch-sdk/ketch-web-api";
import Future from "./internal/future";
import {
  AppDiv,
  Callback,
  ConsentStatus,
  InvokeRightsEvent, ShowConsent,
  ShowPreferences,
  Plugin
} from "./internal/types";
import constants from "./internal/constants";
import dataLayer from "./internal/datalayer";
import isEmpty from "./internal/isEmpty";
import loglevel from "./internal/logging";
import errors from "./internal/errors";
import parameters from "./internal/parameters";
import {ResourceName} from "@ketch-com/resourcename-js";
import {getCookie, setCookie} from "./internal/cookie";
import {OID} from "@ketch-com/oid-js";
const log = loglevel.getLogger('ketch');

const DEFAULT_MIGRATION_OPTION = 0;

/**
 * Loads the config.
 *
 * @param boot The bootstrap configuration.
 */
export function newFromBootstrap(boot: ketchapi.Configuration): Promise<Ketch> {
  log.info('loadConfig');

  const k = new Ketch(boot);

  return Promise.all([k.detectEnvironment(), k.loadPolicyScope()])
    .then(([env, policyScope]) => {
      if (!env.hash) {
        return Promise.reject(errors.noEnvironmentError);
      }

      log.info('loadConfig', env, policyScope);

      if (!k._config || !k._config.organization || !k._config.app || !policyScope) {
        throw errors.noPolicyScopeError;
      }

      const language = parameters.get(parameters.LANGUAGE, window.location.search) || k._config.language;

      log.info('language', language);

      const request: ketchapi.GetFullConfigurationRequest = {
        organizationCode: k._config.organization.code || '',
        appCode: k._config.app.code || '',
        envCode: env.code,
        hash: env.hash || '',
        languageCode: language || 'en',
        policyScopeCode: policyScope,
      };

      return ketchapi.getFullConfiguration(request).then(cfg => new Ketch(cfg));
    });
}

/**
 * Ketch class is the public interface to the Ketch web infrastructure services.
 */
export class Ketch {
  _config: ketchapi.Configuration;
  _consent: Future<ConsentStatus>;
  _environment: Future<ketchapi.Environment>;
  _geoip: Future<ketchapi.IPInfo>;
  _identities: Future<string[]>;
  _policyScope: Future<string>;
  _regionInfo: Future<string>;
  _origin: string;

  /**
   * appDivs is a list of hidden popup div ids and zIndexes as defined in AppDiv
   */
  _appDivs: AppDiv[];

  /**
   * showExperience is the list of functions registered with onShowExperience
   */
  _showExperience: Function[];

  /**
   * hideExperience is the list of functions registered with onHideExperience
   */
  _hideExperience: Function[];

  /**
   * invokeRights is the list of functions registered with onInvokeRight
   */
  _invokeRights: Callback[];

  /**
   * showPreferences is the function registered with onShowPreferences
   */
  _showPreferences?: ShowPreferences;

  /**
   * showConsent is the function registered with onShowConsent
   */
  _showConsent?: ShowConsent;

  /**
   * Constructor for Ketch takes the configuration object. All other operations are driven by the configuration
   * provided.
   *
   * @param config
   */
  constructor(config: ketchapi.Configuration) {
    this._config = config;
    this._consent = new Future<ConsentStatus>('consent');
    this._environment = new Future<ketchapi.Environment>('environment');
    this._geoip = new Future('geoip');
    this._identities = new Future<string[]>('identities');
    this._policyScope = new Future<string>('policyScope');
    this._regionInfo = new Future<string>('regionInfo');
    this._origin = window.location.protocol + '//' + window.location.host;
    this._appDivs = [];
    this._showExperience = [];
    this._hideExperience = [];
    this._invokeRights = [];
    this._showPreferences = undefined;
    this._showConsent = undefined;
  }

  /**
   * Registers a plugin
   *
   * @param plugin The plugin to register
   */
  registerPlugin(plugin: Plugin): void {
    if (plugin.onInit) {
      plugin.onInit(this._config);
    }

    if (plugin.onEnvironment) {
      this.onEnvironment((env) => plugin.onEnvironment(this._config, env));
    }

    if (plugin.onGeoIP) {
      this.onGeoIP((ipInfo) => plugin.onGeoIP(this._config, ipInfo));
    }

    if (plugin.onIdentities) {
      this.onIdentities((identities) => plugin.onIdentities(this._config, identities));
    }

    if (plugin.onPolicyScope) {
      this.onPolicyScope((policyScope) => plugin.onPolicyScope(this._config, policyScope));
    }

    if (plugin.onRegionInfo) {
      this.onRegionInfo((region) => plugin.onRegionInfo(this._config, region));
    }

    if (plugin.onShowExperience) {
      this.onShowExperience(() => plugin.onShowExperience(this._config));
    }

    if (plugin.onHideExperience) {
      this.onHideExperience(() => plugin.onHideExperience(this._config));
    }

    if (plugin.onConsent) {
      this.onConsent((consent) => plugin.onConsent(this._config, consent));
    }

    if (plugin.onInvokeRight) {
      this.onInvokeRight((request) => plugin.onInvokeRight(this._config, request));
    }
  }

  /**
   * Returns the configuration.
   */
  getConfig(): Promise<ketchapi.Configuration> {
    return Promise.resolve(this._config);
  }

  /**
   * Determines if we should show the consent dialog.
   *
   * @param c
   */
  shouldShowConsent(c: ConsentStatus): boolean {
    if (this._config.experiences?.consent && this._config.purposes) {
      for (const pa of this._config.purposes) {
        if (c[pa.code] === undefined) {
          log.debug('shouldShowConsent', true);
          return true;
        }
      }
    }

    log.debug('shouldShowConsent', false);
    return false;
  }

  /**
   * Selects the correct experience.
   *
   * @param config
   */
  selectExperience(): string {
    if (this._config.purposes) {
      for (const pa of this._config.purposes) {
        if (pa.requiresOptIn) {
          if (this._config.experiences?.consent?.experienceDefault == 2) {
            log.debug('selectExperience', constants.CONSENT_MODAL);
            return constants.CONSENT_MODAL;
          }
        }
      }
    }

    log.debug('selectExperience', constants.CONSENT_BANNER);
    return constants.CONSENT_BANNER;
  }

  /**
   * Shows the consent manager.
   */
  showConsent(): Promise<ConsentStatus> {
    log.info('showConsent');

    let c: Promise<ConsentStatus | undefined>;
    if (this._consent.hasValue()) {
      c = this._consent.getValue();
    } else {
      c = Promise.resolve({} as ConsentStatus);
    }

    return c.then(consent => {
      if (consent === undefined) {
        return {} as ConsentStatus;
      }

      if (this._showConsent) {
        this._showConsent(this, this._config, consent, this.selectExperience());
      }

      return consent;
    });
  }

  /**
   * Returns true if the consent is available.
   */
  hasConsent(): boolean {
    return this._consent.hasValue();
  }

  /**
   * Trigger ketchPermitChanged event by pushing updated permit values to dataLayer
   *
   * @param c
   */
  triggerPermitChangedEvent(c: ConsentStatus): void {
    log.info('triggerPermitChangedEvent');

    const permitChangedEvent: {[key: string]: any} = {
      event: 'ketchPermitChanged',
    }

    for (const purposeCode in c) {
      permitChangedEvent[purposeCode] = c[purposeCode]
    }

    dataLayer().push(permitChangedEvent)
  }

  /**
   * Sets the consent.
   *
   * @param c
   */
  setConsent(c: ConsentStatus): Promise<ConsentStatus> {
    log.info('setConsent', c);

    if (!c || isEmpty(c)) {
      return this._consent.setValue(undefined) as Promise<ConsentStatus>;
    }

    // Merge new consent into existing consent
    if (this.hasConsent()) {
      const existingConsent = this._consent.getRawValue();

      for (const key in existingConsent) {
        if (Object.prototype.hasOwnProperty.call(existingConsent, key) &&
          !Object.prototype.hasOwnProperty.call(c, key)) {
          c[key] = existingConsent[key];
        }
      }
    }

    // trigger ketchPermitChanged event by pushing updated permit values to dataLayer
    this.triggerPermitChangedEvent(c)

    return this._consent.setValue(c).then(() => {
      return this.getIdentities()
        .then(identities => this.updateConsent(identities, c))
        .then(() => c);
    });
  }

  /**
   * Gets the consent.
   */
  getConsent(): Promise<ConsentStatus> {
    log.info('getConsent');

    if (this.hasConsent()) {
      return this._consent.getValue() as Promise<ConsentStatus>;
    }

    return this.getIdentities()
      .then(identities => {
        return this.fetchConsent(identities).then((c) => {
          let changed = false;

          // trigger ketchPermitChanged event by pushing updated permit values to dataLayer
          this.triggerPermitChangedEvent(c)

          // check if shouldShowConsent before populating permits
          const displayConsent = this.shouldShowConsent(c);

          // populate permits that are undefined
          // requiresOptIn => false
          // else => true
          if (this._config.purposes) {
            for (const pa of this._config.purposes) {
              if (c[pa.code] === undefined) {
                if (pa.requiresOptIn) {
                  c[pa.code] = false;
                } else {
                  c[pa.code] = true;
                }
              }
            }
          }

          const p: Promise<any>[] = [];

          if (changed) {
            p.push(this.setConsent(c));
          }

          if (displayConsent) {
            p.push(this.showConsent());
          } else {
            p.push(this._consent.setValue(c));

            // experience will not show - call functions registered using onHideExperience
            this._hideExperience.forEach(func => {
              func();
            });
          }

          return Promise.all(p);
        });
      })
      .then(() => this._consent.getValue()) as Promise<ConsentStatus>;
  }

  /**
   * Registers a callback for consent change notifications.
   *
   * @param callback
   */
  onConsent(callback: Callback): void {
    this._consent.subscribe(callback);
  }

  /**
   * Registers a callback for right invocations.

   * @param callback
   */
  onInvokeRight(callback: Callback): void {
    this._invokeRights.push(callback);
  }

  /**
   * Get the consent.
   *
   * @param identities
   */
  fetchConsent(identities: string[]): Promise<ConsentStatus> {
    log.debug('getConsent', identities);

    // If no identities or purposes defined, skip the call.
    if (!identities || identities.length === 0) {
      return Promise.reject(errors.noIdentitiesError);
    }
    if (!this._config || !this._config.app || !this._config.organization || !this._config.environment ||
      !this._config.purposes || this._config.purposes.length === 0) {
      return Promise.reject(errors.noPurposesError);
    }

    const request: ketchapi.GetConsentRequest = {
      organizationCode: this._config.organization.code || '',
      applicationCode: this._config.app.code || '',
      applicationEnvironmentCode: this._config.environment.code,
      controllerCode: '',
      identities: identities,
      purposes: {},
    };

    // Add the purposes by ID with the legal basis
    for (const pa of this._config.purposes) {
      request.purposes[pa.code] = {
        legalBasisCode: pa.legalBasisCode
      };
    }

    return ketchapi.getConsent(request).then((consent: ketchapi.GetConsentResponse) => {
      const newConsent: ConsentStatus = {};

      if (this._config.purposes && consent.purposes) {
        for (const pa of this._config.purposes) {
          if (consent.purposes[pa.code] &&
            consent.purposes[pa.code].allowed) {
            newConsent[pa.code] = consent.purposes[pa.code].allowed === 'true';
          }
        }
      }

      return newConsent;
    });
  }

  /**
   * Update consent.
   *
   * @param identities
   * @param consent
   */
  updateConsent(identities: string[], consent: ConsentStatus): Promise<void> {
    log.debug('updateConsent', identities, consent);

    // If no identities or purposes defined, skip the call.
    if (!identities || identities.length === 0) {
      log.debug('updateConsent', 'skipping');
      return Promise.resolve();
    }

    if (!this._config || !this._config.organization || !this._config.app || !this._config.environment || !this._config.policyScope ||
      !this._config.purposes || this._config.purposes.length === 0) {
      log.debug('updateConsent', 'skipping');
      return Promise.resolve();
    }

    if (isEmpty(consent)) {
      log.debug('updateConsent', 'skipping');
      return Promise.resolve();
    }

    const request: ketchapi.SetConsentRequest = {
      organizationCode: this._config.organization.code || '',
      applicationCode: this._config.app.code || '',
      applicationEnvironmentCode: this._config.environment.code,
      controllerCode: '',
      identities: identities,
      policyScopeCode: this._config.policyScope.code || '',
      purposes: {},
      migrationOption: DEFAULT_MIGRATION_OPTION,
    };

    if (this._config.options) {
      request.migrationOption = parseInt(String(this._config.options.migration));
    }

    if (this._config.purposes && consent) {
      for (const pa of this._config.purposes) {
        if (consent[pa.code] !== undefined) {
          request.purposes[pa.code] = {
            allowed: consent[pa.code].toString(),
            legalBasisCode: pa.legalBasisCode
          };
        }
      }
    }

    // Make sure we actually got purposes to update
    if (isEmpty(request.purposes)) {
      log.debug('updateConsent', 'calculated consents empty');
      return Promise.resolve();
    }

    return ketchapi.setConsent(request);
  }

  /**
   * Set the environment.
   *
   * @param env
   */
  setEnvironment(env: ketchapi.Environment): Promise<ketchapi.Environment> {
    log.info('setEnvironment', env);
    return this._environment.setValue(env) as Promise<ketchapi.Environment>;
  }

  /**
   * Detect the current environment. It will first look at the query string for any specified environment,
   * then it will iterate through the environment specifications to match based on the environment pattern.
   */
  detectEnvironment(): Promise<ketchapi.Environment> {
    log.info('detectEnvironment');

    // We have to have environments
    if (!this._config.environments) {
      log.debug('detectEnvironment', 'no environments');
      return Promise.reject(errors.noEnvironmentError);
    }

    // Try to locate the specifiedEnv
    const specifiedEnv = parameters.get(parameters.ENV, window.location.search);
    if (specifiedEnv) {
      for (let i = 0; i < this._config.environments.length; i++) {
        const e = this._config.environments[i];

        if (specifiedEnv && e.code === specifiedEnv) {
          log.debug('found', e);
          return this.setEnvironment(e);
        }
      }

      log.error('not found', specifiedEnv);
      return Promise.reject(errors.noEnvironmentError);
    }

    // Try to locate based on pattern
    let environment = {} as ketchapi.Environment;
    for (let i = 0; i < this._config.environments.length; i++) {
      const e = this._config.environments[i];
      const pattern = atob(e.pattern || '');

      if (pattern && new RegExp(pattern).test(window.document.location.href) && (!environment.pattern ||
        (pattern.length > environment.pattern.length))) {
        environment = e
      }
    }

    // match pattern
    if (environment.pattern) {
      log.debug('matched', environment);
      return this.setEnvironment(environment);
    }

    // Finally, try to locate production
    for (let i = 0; i < this._config.environments.length; i++) {
      const e = this._config.environments[i];

      if (e.code === 'production') {
        log.debug(e.code, e);
        return this.setEnvironment(e);
      }
    }

    return Promise.reject(errors.noEnvironmentError);
  }

  /**
   * Get the environment.
   */
  getEnvironment(): Promise<ketchapi.Environment> {
    log.info('getEnvironment');

    if (this._environment.hasValue()) {
      return this._environment.getValue() as Promise<ketchapi.Environment>;
    } else {
      return this.detectEnvironment().then(env => this.setEnvironment(env));
    }
  }

  /**
   * Registers a callback for environment change notifications.
   *
   * @param callback
   */
  onEnvironment(callback: Callback): void {
    this._environment.subscribe(callback);
  }

  /**
   * Push the IPInfo to data layer.
   *
   * @param g
   */
  pushGeoIP(g: ketchapi.IPInfo): number {
    log.info('pushGeoIP', g);

    const GeoipEvent = {
      event: 'ketchGeoip',
      ip: g.ip,
      countryCode: g.countryCode,
      regionCode: g.regionCode,
    };

    return dataLayer().push(GeoipEvent)
  }

  /**
   * Set the IPInfo.
   *
   * @param g
   */
  setGeoIP(g: ketchapi.IPInfo): Promise<ketchapi.IPInfo> {
    log.info('setGeoIP', g);
    this.pushGeoIP(g)
    return this._geoip.setValue(g) as Promise<ketchapi.IPInfo>;
  }

  /**
   * Loads the IPInfo.
   */
  loadGeoIP(): Promise<ketchapi.GetLocationResponse> {
    log.info('loadGeoIP');

    const request: ketchapi.GetLocationRequest = {};

    return ketchapi.getLocation(request);
  }

  /**
   * Gets the IPInfo.
   */
  getGeoIP(): Promise<ketchapi.IPInfo> {
    log.info('getGeoIP');

    if (this._geoip.hasValue()) {
      return this._geoip.getValue() as Promise<ketchapi.IPInfo>;
    } else {
      return this.loadGeoIP()
        .then(r => r.location)
        .then(ip => this.setGeoIP(ip));
    }
  }

  /**
   * Registers a callback for GeoIP change notifications.
   *
   * @param callback
   */
  onGeoIP(callback: Callback): void {
    this._geoip.subscribe(callback);
  }

  /**
   * Sets the identities.
   *
   * @param id
   */
  setIdentities(id: string[]): Promise<string[]> {
    log.info('setIdentities', id);

    return this._identities.setValue(id) as Promise<string[]>;
  }

  /**
   * Get a window property.
   *
   * @param p
   */
  getProperty(p: string): string | null {
    const parts: string[] = p.split('.');
    let context: any = window;

    while (parts.length > 0) {
      if (parts[0] === 'window') {
        parts.shift();
      } else if (typeof context === 'object') {
        context = context[parts.shift() as string];
      } else {
        return null;
      }
    }

    return context;
  }

  /**
   * Collect identities.
   */
  collectIdentities(): Promise<string[]> {
    log.info('collectIdentities');

    const ids = this._config.identities;

    if (!this._config || !this._config.organization || ids == null || isEmpty(ids)) {
      return Promise.resolve([]);
    }

    const windowProperties: any[] = [];
    const dataLayerProperties: any[] = [];
    const cookieProperties: any[] = [];
    const managedCookieProperties: any[] = [];
    const promises: Promise<string>[] = [];

    for (const id in ids) {
      if (Object.prototype.hasOwnProperty.call(ids, id)) {
        switch (ids[id].type) {
          case 'window':
            windowProperties.push([id, ids[id].variable]);
            break;

          case 'cookie':
            cookieProperties.push([id, ids[id].variable]);
            break;

          case 'managedCookie':
            managedCookieProperties.push([id, ids[id].variable]);
            break;

          default:
            dataLayerProperties.push([id, ids[id].variable]);
            break;
        }
      }
    }

    if (windowProperties.length > 0) {
      for (const p of windowProperties) {
        const pv = this.getProperty(p[1]);
        if (!pv) continue;

        const rn = new ResourceName({
          service: '',
          tenant: '',
          organization: this._config.organization.code,
          resource: 'id',
          info: [p[0], pv]
        });
        promises.push(Promise.resolve(rn.toString()));
      }
    }

    if (dataLayerProperties.length > 0) {
      for (const dl of dataLayer()) {
        for (const p of dataLayerProperties) {
          if (Object.prototype.hasOwnProperty.call(dl, p[1])) {
            const pv = dl[p[1]];
            if (!pv) continue;

            const rn = new ResourceName({
              service: '',
              tenant: '',
              organization: this._config.organization.code,
              resource: 'id',
              info: [p[0], pv]
            });
            promises.push(Promise.resolve(rn.toString()));
          }
        }
      }
    }

    if (cookieProperties.length > 0) {
      for (const p of cookieProperties) {
        promises.push(
          getCookie(p[1]).then((pv) => {
            const rn = new ResourceName({
              service: '',
              tenant: '',
              organization: this._config.organization?.code,
              resource: 'id',
              info: [p[0], pv]
            });
            return rn.toString();
          }, (error) => {
            log.trace(error);
            return '';
          })
        )
      }
    }

    if (managedCookieProperties.length > 0) {
      for (const p of managedCookieProperties) {
        promises.push(
          getCookie(p[1]).then((pv) => {
            const rn = new ResourceName({
              service: '',
              tenant: '',
              organization: this._config.organization?.code,
              resource: 'id',
              info: [p[0], pv]
            });
            return rn.toString();
          }, () => {
            return setCookie(p[1], new OID().toString(), 730).then((pv) => {
              const rn = new ResourceName({
                service: '',
                tenant: '',
                organization: this._config.organization?.code,
                resource: 'id',
                info: [p[0], pv]
              });
              return rn.toString();
            }, (error) => {
              log.trace(error)
              return '';
            })
          })
        )
      }
    }

    return Promise.all(promises).then(items => items.filter(i => i !== ''));
  }

  /**
   * Get the identities.
   */
  getIdentities(): Promise<string[]> {
    log.info('getIdentities');

    if (this._identities.hasValue()) {
      return this._identities.getValue() as Promise<string[]>;
    } else {
      return this.collectIdentities().then(id => this.setIdentities(id));
    }
  }

  /**
   * Registers a callback for identity change notifications.
   *
   * @param callback
   */
  onIdentities(callback: Callback): void {
    this._identities.subscribe(callback);
  }

  /**
   * Push the PolicyScopeInfo to data layer.
   *
   * @param ps
   */
  pushPolicyScope(ps: string): void {
    log.info('pushPolicyScope', ps);

    const PolicyScopeEvent = {
      event: 'ketchPolicyScope',
      policyScopeCode: ps,
    }

    dataLayer().push(PolicyScopeEvent)
  }

  /**
   * Set the policy scope.
   *
   * @param ps
   */
  setPolicyScope(ps: string): Promise<string> {
    log.info('setPolicyScope', ps);

    this.pushPolicyScope(ps);
    return this._policyScope.setValue(ps) as Promise<string>;
  }

  /**
   * Get the policy scope.
   */
  getPolicyScope(): Promise<string> {
    log.info('getPolicyScope');

    if (this._policyScope.hasValue()) {
      return this._policyScope.getValue() as Promise<string>;
    } else {
      return this.loadPolicyScope().then(ps => this.setPolicyScope(ps));
    }
  }

  /**
   * Registers a callback for policy scope change notifications.
   *
   * @param callback
   */
  onPolicyScope(callback: Callback): void {
    this._policyScope.subscribe(callback);
  }

  /**
   * Get the policy scope from query, page or config.
   */
  loadPolicyScope(): Promise<string> {
    log.info('loadPolicyScope', this._config.policyScope);

    const policyScopeOverride = parameters.get(parameters.POLICY_SCOPE, window.location.search);
    if (policyScopeOverride) {
      return this.setPolicyScope(policyScopeOverride);
    }

    const ps: ketchapi.PolicyScopeInfo | undefined = this._config.policyScope;
    if (!ps) {
      return Promise.reject(errors.noPolicyScopeError);
    }

    const v = ps.variable;

    if (v) {
      for (const dl of dataLayer()) {
        const scope = dl[v];
        if (scope) {
          return this.setPolicyScope(scope);
        }
      }
    }

    return this.loadRegionInfo()
      .then(region => {
        if (ps.scopes && ps.scopes[region]) {
          return ps.scopes[region];
        }

        return ps.defaultScopeCode;
      })
      .then(x => {
        if (x) {
          return this.setPolicyScope(x);
        }

        return Promise.reject(errors.noPolicyScopeError);
      })
      .catch(() => {
        if (ps.defaultScopeCode) {
          return this.setPolicyScope(ps.defaultScopeCode);
        }

        return Promise.reject(errors.noPolicyScopeError);
      });
  }

  /**
   * Set the region.
   */
  setRegionInfo(info: string): Promise<string> {
    log.info('setRegionInfo', info);
    return this._regionInfo.setValue(info) as Promise<string>;
  }

  /**
   * Load the region info.
   */
  loadRegionInfo(): Promise<string> {
    log.info('loadRegionInfo');

    const specifiedRegion = parameters.get(parameters.REGION, window.location.search);
    if (specifiedRegion) {
      return this.setRegionInfo(specifiedRegion);
    }

    return this.loadGeoIP()
      .then(r => r.location)
      .then(d => this.setGeoIP(d))
      .then(g => {
        if (g == null) {
          return Promise.reject(errors.unrecognizedLocationError);
        }

        const cc = g.countryCode;
        if (!cc) {
          return Promise.reject(errors.unrecognizedLocationError);
        }

        let region = cc;
        if (cc === 'US') {
          region = `${cc}-${g.regionCode}`;
        }

        return region;
      }).then(info => this.setRegionInfo(info));
  }

  /**
   * Gets the region.
   */
  getRegionInfo(): Promise<string> {
    log.info('getRegionInfo');
    if (this._regionInfo.hasValue()) {
      return this._regionInfo.getValue() as Promise<string>;
    } else {
      return this.loadRegionInfo().then(info => this.setRegionInfo(info));
    }
  }

  /**
   * Registers a callback for region info change notifications.
   *
   * @param callback
   */
  onRegionInfo(callback: Callback): void {
    this._regionInfo.subscribe(callback);
  }

  /**
   * Shows the preferences manager.
   */
  showPreferences(): Promise<ConsentStatus> {
    log.info('showPreference');

    let c: Promise<ConsentStatus> = this.hasConsent() ? this.getConsent(): Promise.resolve({});

    return c.then(c => {
      // if no preference experience configured do not show
      if (!this._config.experiences?.preference) {
        return c;
      }

      if (this._showPreferences) {
        this._showPreferences(this, this._config, c);
      }

      return c;
    });
  }

  /**
   * Invoke rights.
   *
   * @param identities
   * @param eventData
   */
  invokeRight(identities: string[], eventData: InvokeRightsEvent): Promise<void> {
    log.debug('invokeRights', identities, eventData);

    // If no identities or rights defined, skip the call.
    if (!identities || identities.length === 0 ||
      !eventData.rightsEmail || eventData.rightsEmail === '' ||
      !eventData.right || eventData.right === '') {
      return Promise.resolve();
    }

    if (!this._config || !this._config.organization || !this._config.app || !this._config.environment || !this._config.policyScope ||
      !this._config.rights || this._config.rights.length === 0) {
      return Promise.resolve();
    }

    const user: ketchapi.User = {
      email: eventData.rightsEmail,
      first: eventData.firstName,
      last: eventData.lastName,
      country: eventData.country,
      stateRegion: eventData.state,
      description: eventData.details
    }

    const request: ketchapi.InvokeRightRequest = {
      organizationCode: this._config.organization.code || '',
      applicationCode: this._config.app.code || '',
      applicationEnvironmentCode: this._config.environment.code,
      controllerCode: '',
      identities: identities,
      policyScopeCode: this._config.policyScope.code || '',
      rightCodes: [eventData.right],
      user: user
    };

    for (let callback of this._invokeRights) {
      callback(request);
    }

    return ketchapi.invokeRight(request);
  }

  /**
   * onShowExperience called before experience will show
   * Used to trigger external dependencies
   */
  onShowExperience(callback: Function): void {
    this._showExperience.push(callback);
  }

  /**
   * onHideExperience called after experience hidden
   * Used to trigger external dependencies
   */
  onHideExperience(callback: Function): void {
    this._hideExperience.push(callback);
  }

  /**
   * onShowPreferences registers a function to handle showing preferences
   *
   * @param callback
   */
  onShowPreferences(callback: ShowPreferences): void {
    this._showPreferences = callback;
  }

  /**
   * onShowConsent registers a function to handle showing consent
   *
   * @param callback
   */
  onShowConsent(callback: ShowConsent): void {
    this._showConsent = callback;
  }
}
