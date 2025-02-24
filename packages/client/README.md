## @tollbit/client

This package contains a client for interacting with Tollbit's proxy services.

**Note: This client is in early development, the APIs may change over time**

### Initializing the Proxy Client

```typescript
import { ProyClient } from "@tollbit/client";

const client = ProxyClient.create({
  apiKey: process.env.TOLLBIT_API_KEY,
  knownSites: ["tollbit.example.com"], // optional list of known tollbit sites
});
```

### Using the Proxy Client

Manually generate your token and attach it:

```typescript
const token = client.generateToken(new URL("https://tollbit.example.com"));

fetch("https://tollbit.example.com", {
  headers: { Authorization: `Bearer ${token}` },
});
```

```typescript
const resp = fetch("https://tollbit.example.com", {
  headers: { Authorization: `Bearer ${token}` },
});

const { action, to } = client.checkResponse(
  { status: resp.status, headers: { ...resp.headers } },
  url.origin
);

if (action === "token_required") {
  // refetch but include the header
}
if (action === "redirect") {
  // redirected to a tollbit subdomain, include the token on the request
}
if (action === "none") {
  // nothing to do here from the tollbit side
}
```
