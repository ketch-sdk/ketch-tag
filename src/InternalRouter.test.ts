import { Ketch } from './Ketch'
import InternalRouter from './InternalRouter'

describe('InternalRouter', () => {
  describe('route', () => {
    it('calls experienceClosed', async () => {
      const experienceClosed = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        experienceClosed,
      } as any as Ketch)
      await router.route('experienceClosed')
      return expect(experienceClosed).toHaveBeenCalled()
    })

    it('calls invokeRight', async () => {
      const invokeRight = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        invokeRight,
      } as any as Ketch)
      await router.route('invokeRight')
      return expect(invokeRight).toHaveBeenCalled()
    })

    it('calls setProvisionalConsent', async () => {
      const setProvisionalConsent = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        setProvisionalConsent,
      } as any as Ketch)
      await router.route('setProvisionalConsent')
      return expect(setProvisionalConsent).toHaveBeenCalled()
    })
  })
})
