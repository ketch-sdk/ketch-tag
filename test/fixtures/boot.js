window.semaphore = window.semaphore || []
window.semaphore.push([
  'init',
  {
    environments: [
      {
        code: 'production',
        hash: '5705927189240264495',
      },
    ],
    language: 'en',
    options: {
      appDivs: 'hubspot-messages-iframe-container',
    },
    organization: {
      code: 'vara_labs',
    },
    jurisdiction: {
      code: 'default',
      defaultJurisdictionCode: 'default',
      variable: 'test',
      jurisdictions: {
        'US-CA': 'california_cpa',
      },
    },
    plugins: {
      dynamic_yield: {},
      facebook_ads: {},
      fullstory: {},
      google_analytics: {},
      google_marketing: {},
      gpc: {},
      heap: {},
      lanyard: {},
      optimizely: {},
      shopify: {},
      tcf: {},
      usprivacy: {},
    },
    property: {
      code: 'vara_labs',
      name: 'Vara Labs',
      platform: 'WEB',
    },
    services: {
      lanyard: 'https://global.ketchcdn.com/transom/route/switchbit/lanyard/vara_labs/lanyard.js',
      scriptHost: 'https://cdn.uat.ketchjs.com',
      shoreline: 'https://dev.ketchcdn.com/web/v2',
    },
  },
])
