import init from './init'

export function boot() {
  if (document.readyState === 'loading') {
    // Document hasn't finished loading yet, so add an event to init when content is loaded
    document.addEventListener('DOMContentLoaded', init)
  } else {
    // `DOMContentLoaded` has already fired, so just run init now (since an event handler will never be called)
    init().then(() => {})
  }
}
