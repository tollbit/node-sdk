# Tollbit SDK

The Tollbit SDK enables developers to seamlessly run browser automation with Tollbit-compatible websites, eliminating issues with CAPTCHAs and IP blocks. It provides integrations with popular browser automation frameworks like Playwright and Stagehand.

## Features

- 🚀 Easy integration with Playwright and Stagehand
- 🛡️ Automatic CAPTCHA and IP block prevention
- 🔒 Secure header management
- 🔍 Debug mode for troubleshooting
- 📝 TypeScript support

## Packages

This monorepo contains the following packages:

- `@tollbit/client` - Core functionality and types for Tollbit integrations
- `@tollbit/playwright` - [Playwright](https://playwright.dev) integration
- `@tollbit/stagehand` - [Stagehand](https://browserbase.io) integration

## Installation

Choose the package that matches your browser automation framework:

```bash
# Playwright users
npm install @tollbit/playwright

# Stagehand users
npm install @tollbit/stagehand
```

## Usage

### Playwright Example

```typescript
import { PlaywrightTollbit } from "@tollbit/playwright";
import { chromium } from "@playwright/test";

async function main() {
  // Initialize Tollbit with your credentials
  const tollbit = new PlaywrightTollbit({
    secretKey: process.env.TOLLBIT_SECRET_KEY,
    userAgent: process.env.TOLLBIT_USER_AGENT,
    debug: true,
    forceHeaders: true,
  });

  // Launch browser and create context
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Attach Tollbit to the context
  await tollbit.attachToContext(context);

  const page = await context.newPage();
  await page.goto("https://your-protected-site.com");
}
```

### Stagehand Example

```typescript
import { Stagehand } from "@browserbasehq/stagehand";
import { StagehandTollbit } from "@tollbit/stagehand";

async function main() {
  // Initialize Stagehand
  const stagehand = new Stagehand({
    env: "LOCAL",
    headless: false,
  });

  await stagehand.init();

  // Initialize Tollbit
  const tollbit = new StagehandTollbit({
    secretKey: process.env.TOLLBIT_SECRET_KEY,
    userAgent: process.env.TOLLBIT_USER_AGENT,
    debug: true,
    forceHeaders: true,
  });

  // Attach Tollbit to the context
  await tollbit.attachToContext(stagehand.context);

  await stagehand.page.goto("https://your-protected-site.com");
}
```

## Configuration

Both integrations accept the following configuration options:

- `secretKey` - Your Tollbit secret key
- `userAgent` - Your registered user agent string
- `debug` - Enable debug logging (default: false)
- `forceHeaders` - Always add Tollbit headers (default: false)

## Development

This is a monorepo using pnpm workspaces. To get started:

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm test
```

## Environment Variables

Create a `.env` file with your Tollbit credentials:

```env
TOLLBIT_SECRET_KEY=your-secret-key
TOLLBIT_USER_AGENT=your-registered-user-agent
```

## License

MIT
