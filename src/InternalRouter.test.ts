import { Ketch } from './Ketch'
import InternalRouter from './InternalRouter'

describe('InternalRouter', () => {
  describe('route', () => {
    it('calls registerStorageProvider', async () => {
      const registerStorageProvider = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        registerStorageProvider,
      } as any as Ketch)
      await router.route('registerStorageProvider')
      return expect(registerStorageProvider).toHaveBeenCalled()
    })

    it('calls setConsent', async () => {
      const setConsent = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        setConsent,
      } as any as Ketch)
      await router.route('setConsent')
      return expect(setConsent).toHaveBeenCalled()
    })

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
  })
})
