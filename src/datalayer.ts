declare global {
  interface Window {
    dataLayer: any[]
    utag_data: TealiumketchPermitData
  }

  type TealiumketchPermitData = {
    [key: string]: any
    ketchPermit?: any
  }
}

export default function datalayer(): any[] {
  return (window.dataLayer = window.dataLayer || [])
}

export function tealiumKetchPermitData(): any {
  window.utag_data = tealiumDataLayer()
  return (window.utag_data.ketchPermit = window.utag_data?.ketchPermit || {})
}

export function tealiumDataLayer(): any {
  return (window.utag_data = window.utag_data || {})
}
