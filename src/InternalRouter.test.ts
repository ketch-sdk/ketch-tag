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

    it('calls getSubscriptions', async () => {
      const getSubscriptions = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        getSubscriptions,
      } as any as Ketch)
      await router.route('getSubscriptions')
      return expect(getSubscriptions).toHaveBeenCalled()
    })

    it('calls setSubscriptions', async () => {
      const setSubscriptions = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        setSubscriptions,
      } as any as Ketch)
      await router.route('setSubscriptions')
      return expect(setSubscriptions).toHaveBeenCalled()
    })

    it('calls getSubscriptionConfiguration', async () => {
      const getSubscriptionConfiguration = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        getSubscriptionConfiguration,
      } as any as Ketch)
      await router.route('getSubscriptionConfiguration')
      return expect(getSubscriptionConfiguration).toHaveBeenCalled()
    })

    it('calls getConsentConfiguration', async () => {
      const getConsentConfiguration = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        getConsentConfiguration,
      } as any as Ketch)
      await router.route('getConsentConfiguration')
      return expect(getConsentConfiguration).toHaveBeenCalled()
    })

    it('calls getPreferenceConfiguration', async () => {
      const getPreferenceConfiguration = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        getPreferenceConfiguration,
      } as any as Ketch)
      await router.route('getPreferenceConfiguration')
      return expect(getPreferenceConfiguration).toHaveBeenCalled()
    })

    it('calls willChangeExperience', async () => {
      // TODO:JA - Review that this is testing the proper thing
      const willChangeExperience = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        willChangeExperience,
      } as any as Ketch)
      await router.route('willChangeExperience')
      return expect(willChangeExperience).toHaveBeenCalled()
    })

    it('calls hasChangedExperience', async () => {
      // TODO:JA - Review that this is testing the proper thing
      const hasChangedExperience = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        hasChangedExperience,
      } as any as Ketch)
      await router.route('hasChangedExperience')
      return expect(hasChangedExperience).toHaveBeenCalled()
    })

    it('calls hasShownExperience', async () => {
      // TODO:JA - Review that this is testing the proper thing
      const hasShownExperience = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        hasShownExperience,
      } as any as Ketch)
      await router.route('hasShownExperience')
      return expect(hasShownExperience).toHaveBeenCalled()
    })
  })
})
