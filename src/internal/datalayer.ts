declare global {
  interface Window {
    dataLayer: any[];
  }
}

export default function datalayer(): any[] {
  return (window.dataLayer = window.dataLayer || [])
}
