import {ConsentStatus, InvokeRightsEvent, Ketch, UpdateConsentEvent} from "./internal/types";
import constants from "./internal/constants";
import * as scripts from "./internal/scripts";
import loglevel from "./internal/logging";
const log = loglevel.getLogger('lanyard');

export class LanyardPlugin {
  _ketch?: Ketch;

  /**
   * Called when Lanyard tells us the user has updated consent.
   *
   * @param data
   */
  handleUpdateConsent(data: UpdateConsentEvent): Promise<any> {
    if (this._ketch === undefined) {
      return Promise.resolve({});
    }

    log.debug('handleUpdateConsent', data);

    return this._ketch.setConsent(data.consent);
  }

  /**
   * Called when Lanyard tells us the user has invoked rights.
   *
   * @param data
   */
  handleInvokeRight(data: InvokeRightsEvent): Promise<void> {
    if (this._ketch === undefined) {
      return Promise.resolve();
    }

    log.debug('handleInvokeRight', data);

    return this._ketch.getIdentities().then(identities => this._ketch.invokeRight(identities, data));
  }

  /**
   * Called when Lanyard tells us the user has closed the dialog.
   */
  handleCloseDialog(): Promise<void> {
    log.debug('handleCloseDialog');

    // Send message back to Lanyard to confirm closing
    window.postMessage(
      {
        type: constants.CLOSE_MODAL,
        to: constants.LANYARD,
        from: constants.SEMAPHORE,
      },
      origin
    );

    for (const appDiv of this._appDivs) {
      const div = document.getElementById(appDiv.id)
      if (div) {
        div.style.zIndex = appDiv.zIndex;
      }
    }
    this._appDivs = []

    // Call functions registered using onHideExperience
    this._hideExperience.forEach(func => {
      func();
    });

    return Promise.resolve();
  }

  /**
   * Event handler from Lanyard.
   *
   * @param e
   */
  handleEvent(e: MessageEvent): Promise<any> {
    // Check for things that would disqualify this event
    if (
      e.origin !== origin ||
      !e.data ||
      e.data.from !== constants.LANYARD ||
      e.data.to !== constants.SEMAPHORE ||
      !(e.data.type === constants.UPDATE_CONSENT || e.data.type === constants.INVOKE_RIGHTS || e.data.type === constants.CLOSE)
    ) {
      log.debug('skipping', e);
      return Promise.resolve();
    }

    log.debug('message received', e.data.type);

    // Call the handler
    switch (e.data.type) {
      case constants.UPDATE_CONSENT:
        return this.handleUpdateConsent(e.data);

      case constants.INVOKE_RIGHTS:
        return this.handleInvokeRight(e.data);

      case constants.CLOSE:
        return this.handleCloseDialog();
    }

    return Promise.resolve();
  }

  /**
   * Loaded is called when the Lanyard module is loaded
   *
   * @param consent
   * @param experience
   */
  loaded(consent: ConsentStatus, experience: string): Promise<any> {
    log.debug('loaded', consent, experience);

    if (this._config.options?.appDivs) {
      const appDivList = this._config.options.appDivs.split(",")
      for (const divID of appDivList) {
        const div = document.getElementById(divID)
        if (div) {
          this._appDivs.push({ id: divID, zIndex: div.style.zIndex })
          div.style.zIndex = "-1";
        }
      }
    }

    // update isExperienceDisplayed flag when experience displayed
    this._isExperienceDisplayed = true

    // Call functions registered using onShowExperience
    this._showExperience.forEach(func => {
      func();
    });

    // Send off the message to Lanyard to show the modal
    window.postMessage(
      {
        type: constants.SHOW_MODAL,
        config: this._config,
        consent,
        experience,
        to: constants.LANYARD,
        from: constants.SEMAPHORE,
      },
      origin
    );

    // Add an event listener for messages from Lanyard.
    window.addEventListener('message', this.handleEvent, false);
    return Promise.resolve();
  }

  /**
   * Load the experience and setup the listeners to receive messages back from the experience manager.
   *
   * @param consent
   * @param experience
   */
  loadExperience(consent: ConsentStatus, experience: string): Promise<any> {
    log.debug('load', consent, experience);

    // Check to see if we already have the lanyard root (and then by definition
    // have already loaded the script. If so, bypass loading the script a second
    // time.
    let elem = document.getElementById(constants.LANYARD_ROOT);
    if (elem) {
      return this.loaded(consent, experience);
    }

    // No element found, so create the root div.
    elem = document.createElement('div');
    elem.id = constants.LANYARD_ROOT;
    const parentNode = window.document.body;
    parentNode.insertBefore(elem, parentNode.firstChild);

    // Load the bundle.
    const url = this._config.services ? this._config.services[constants.LANYARD] : '';

    return scripts
      .load(url)
      .then(
        // Wait lanyard script parsed and executed after load
        // TODO: implement via messaging
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 50);
          })
      )
      .then(() => this.loaded(consent, experience))
      .catch(() => {
        log.error('could not load lanyard bundle');
      });
  }
}
