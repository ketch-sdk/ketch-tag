declare global {
  interface Window {
    dataLayer: any[]
    ketchPermitPreferences: any
  }

}

export default function datalayer(): any[] {
  return (window.dataLayer = window.dataLayer || [])
}

export function ketchPermitPreferences(): any {
  return (window.ketchPermitPreferences = window.ketchPermitPreferences || {})
}
