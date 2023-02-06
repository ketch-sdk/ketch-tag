declare global {
  interface Window {
    dataLayer?: any[]
  }
}

export default function dataLayer(): any[] {
  return (window.dataLayer = window.dataLayer || [])
}
