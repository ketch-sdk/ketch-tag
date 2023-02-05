import dataLayer from './dataLayer'

describe('datalayer', () => {
  it('sets datalayer if not existing', () => {
    window.dataLayer = undefined
    expect(window.dataLayer).toBeUndefined()
    const q = dataLayer()
    expect(q).toBeDefined()
    expect(q).toHaveLength(0)
  })

  it('uses existing datalayer', () => {
    window.dataLayer = ['foo']
    expect(window.dataLayer).toBeDefined()
    const q = dataLayer()
    expect(q).toBeDefined()
    expect(q).toHaveLength(1)
    expect(q).toEqual(['foo'])
  })
})
