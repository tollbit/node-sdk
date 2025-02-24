# @tollbit/stagehand

This package contains a plugin-style component to help playwright scripts access sites using the Tollbit proxy.

**Note: This plugin is in early development, the APIs may change over time**

## Initialization

You can initialize the plugin using the following:

```typescript
import { TollbitStagehandPlugin } from "@tollbit/stagehand";

const plugin = TollbitStagehandPlugin.fromConfig({
  clientConfig: {
    apiKey: process.env.TOLLBIT_API_KEY,
  },
});

await plugin.attachToContext(context);
```

This plugin will automatically add hooks onto your playwright browser under the `**/*` route to detect tollbit sites
and automatically handle including the token on requests (as well as retrying requests that failed due to 401).
