import { Tollbit, TollbitConfig } from "@tollbit/core";
import type { Page, BrowserContext } from "@playwright/test";

export class PlaywrightTollbit extends Tollbit {
  constructor(config: TollbitConfig) {
    super(config);
  }

  async attachToContext(context: BrowserContext): Promise<void> {
    if (this.config.debug) {
      console.log("Attaching Tollbit to Playwright context");
    }

    // If forceHeaders is enabled, add headers to all requests
    if (this.config.forceHeaders) {
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        const headers = await this.generateHeaders(
          url,
          route.request().headers()
        );
        if (this.config.debug) {
          console.log("Adding forced headers for:", url.toString());
        }
        console.log("Headers:", headers);
        return route.continue({ headers });
      });
      return;
    }

    // Otherwise use the default redirect-based behavior
    await context.route("**/*", async (route, request) => {
      try {
        // First try to fetch with no token
        const response = await route.fetch({ maxRedirects: 0 });

        // Check if this is a Tollbit redirect
        const { shouldRedirect } = await this.handleResponse(
          {
            status: response.status(),
            headers: response.headers() as Record<string, string>,
          },
          request.url()
        );

        if (!shouldRedirect) {
          return route.fulfill({ response });
        }

        // If it is a Tollbit redirect, retry with token
        return route.continue({
          headers: await this.generateHeaders(
            new URL(request.url()),
            request.headers()
          ),
        });
      } catch (error) {
        if (this.config.debug) {
          console.error("Failed to handle request:", error);
        }
        await route.continue();
      }
    });
  }

  async attachToPage(page: Page): Promise<void> {
    if (this.config.debug) {
      console.log("Attaching Tollbit to Playwright page");
    }

    await page.route("**/*", async (route, request) => {
      try {
        // First try to fetch with no token
        const response = await route.fetch({ maxRedirects: 0 });

        // Check if this is a Tollbit redirect
        const { shouldRedirect } = await this.handleResponse(
          {
            status: response.status(),
            headers: response.headers() as Record<string, string>,
          },
          request.url()
        );

        if (!shouldRedirect) {
          return route.fulfill({ response });
        }

        // If it is a Tollbit redirect, retry with token
        return route.continue({
          headers: await this.generateHeaders(
            new URL(request.url()),
            request.headers()
          ),
        });
      } catch (error) {
        if (this.config.debug) {
          console.error("Failed to handle request:", error);
        }
        await route.continue();
      }
    });
  }
}
