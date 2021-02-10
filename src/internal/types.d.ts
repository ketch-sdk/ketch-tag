export declare type Callback = (arg0: any)=>void;

export type ConsentStatus = {[key: string]: boolean};

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
