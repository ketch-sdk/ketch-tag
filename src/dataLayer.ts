declare global {
  interface Window {
    dataLayer?: any[]
    [key: string]: any
  }
}

export default function dataLayer(): any[] {
  return (window.dataLayer = window.dataLayer || [])
}
