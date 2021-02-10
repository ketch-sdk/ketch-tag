export default function datalayer(): any[] {
  // @ts-ignore
  return window['dataLayer'] = window['dataLayer'] || [];
}
