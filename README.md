# ketch-tag

Ketch web infrastructure tag

# Prerequisites
- [NCC](https://www.npmjs.com/package/@vercel/ncc) `npm i -g @vercel/ncc`

# Local DX

1. `npm install`
2. `npm run build`
3. `docker compose -f base.yml -f docker-compose.yml up --build`
4. Navigate to [https://localhost:8080/ketchtag/test/?swb_debug](https://localhost:8080/ketchtag/test/?swb_debug)

### Optional
You can test [ketch-plugins](https://github.com/ketch-com/ketch-plugins/) or [lanyard](https://github.com/ketch-com/lanyard) locally by including the following in `./docker-compose.yml` under `volumes`.

```
- "{path-to-local-directory}/dist/plugins.js:/ketch/public/plugins.js"
```

Then update `./test/fixtures/index.html` to point to the new file:

```
<script src="../plugins.js"></script>
```

## Showing Consent Experience

The consent experience can be shown to a data subject using the following:

```typescript
semaphore.push(['showConsent', {
  // options
}])
```

## Showing Preferences Experience

The preferences experience can be shown to a data subject using the following:

```typescript
semaphore.push(['showPreferences', {
  // options
}])
```
## Events

The Ketch tag will emit a variety of events to allow integrating into a site and extending functionality.

### on

To handle every occurrence of an event (`consent` in this example), use the following:
```typescript
function handleConsentChange(consent: Consent) {
  // TODO - do something with the consent
}

semaphore.push(['on', 'consent', handleConsentChange])
```

### once

To handle just a single occurrence of an event, use the following:
```typescript
semaphore.push(['once', 'consent', handleConsentChange])
```

### off

To stop handling events, use the following:
```typescript
semaphore.push(['off', 'consent', handleConsentChange])
```

### consent

The `consent` event is emitted whenever consent is resolved, either by loading from local storage, remote storage or
by prompting the user. The argument to the event is a consent object, where the keys are the purposes and the value is
a boolean denoting whether the user has consented to the purpose.

### environment

The `environment` event is emitted whenever the environment is resolved from configuration.

### geoip

The `geoip` event is emitted whenever the location has been resolved from the IP address.

### identities

The `identities` event is emitted whenever the identities collected about the user have changed.

### jurisdiction

The `jurisdiction` event is emitted whenever the jurisdiction of the user has resolved or changed.

### regionInfo

The `regionInfo` event is emitted whenever the region information about the user has resolved or changed.

### willShowExperience

The `willShowExperience` event is emitted when an experience is shown to the user.

### hideExperience

The `hideExperience` event is emitted when an experience is hidden from the user.

## Properties

The Ketch tag exposes several properties available to interrogate.

### config

To get the current configuration, use the following:

```typescript
semaphore.push(['getConfig', handleConfig])
```

## Plugins

The Ketch Tag allows extending functionality by registering plugins. The plugin is a function that receives an instance
of the Ketch Tag and the configuration of the plugin.

```typescript
function myPlugin(host: Ketch, _config: any) {
  host.on('consent', consent => {
    console.log('consent changed to: ', consent)
  })
}

semaphore.push(['registerPlugin', myPlugin])
```

## Testing

To test the tag locally, run the following:
```shell
npm run all
docker compose --file base.yml up -d
docker compose up -d
open https://localhost:8080/ketchtag/test/
```

The test page is located in `./test/fixtures/index.html`. The configuration is in `./test/fixtues/boot.js`.
