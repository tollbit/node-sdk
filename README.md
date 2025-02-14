# Tollbit SDK

The Tollbit SDK enables developers to seamlessly run browser agents with Tollbit-compatible websites, eliminating issues with CAPTCHAs and IP blocks.

## Packages

- `@tollbit/core` - Core functionality and types
- `@tollbit/playwright` - Playwright integration
- `@tollbit/stagehand` - Stagehand integration

## Installation

```bash
# Playwright users
npm install @tollbit/playwright

# Stagehand users
npm install @tollbit/stagehand
```

## Development

This is a monorepo using npm workspaces. To get started:

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm test
```

## License

MIT
