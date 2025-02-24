import * as tollbit from "@tollbit/client";
import type { Page, BrowserContext } from "@playwright/test";

export type PluginOptions = {
  debug?: boolean;
  forceHeaders?: boolean;
};

export class TollbitPlaywrightPlugin {
  private readonly client: tollbit.ProxyClient;
  private readonly config: PluginOptions;

  static usingClient(
    client: tollbit.ProxyClient,
    opts: PluginOptions = {}
  ): TollbitPlaywrightPlugin {
    return new TollbitPlaywrightPlugin(client, { ...opts });
  }

  static fromConfig({
    clientConfig,
    ...opts
  }: PluginOptions & {
    clientConfig: tollbit.ProxyClientConfig;
  }): TollbitPlaywrightPlugin {
    const client = tollbit.ProxyClient.create(clientConfig);

    return new TollbitPlaywrightPlugin(client, {
      ...opts,
    });
  }

  protected constructor(client: tollbit.ProxyClient, opts: PluginOptions = {}) {
    this.client = client;
    this.config = opts;
  }

  async attachToContext(context: BrowserContext): Promise<void> {
    if (this.config.debug) {
      console.log("Attaching Tollbit to Stagehand context");
    }

    // Otherwise use the default redirect-based behavior
    await context.route("**/*", async (route, request) => {
      try {
        const headers = await this.client.generateHeaders(
          new URL(request.url()),
          request.headers()
        );
        const response = await route.fetch({
          headers: headers,
          maxRedirects: 0,
        });

        // Check if this is a Tollbit redirect
        const { action, isTollbitSite, to } = await this.client.checkResponse(
          {
            status: response.status(),
            headers: response.headers() as Record<string, string>,
          },
          request.url()
        );

        if (!isTollbitSite) {
          // not a tollbit site - retry the request if we got a 3xx status
          if (/^3\d\d$/.test(`${response.status}`)) {
            return await route.continue();
          }

          return route.fulfill({ response });
        }

        if (action === "token_required") {
          // If it is a Tollbit redirect, retry with token
          return route.continue({
            headers: await this.client.generateHeaders(
              new URL(request.url()),
              request.headers()
            ),
          });
        }

        if (action === "redirect") {
          // If it is a Tollbit redirect, retry with token
          return route.continue({
            headers: await this.client.generateHeaders(to, request.headers()),
          });
        }
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
      console.log("Attaching Tollbit to Stagehand page");
    }

    await page.route("**/*", async (route, request) => {
      try {
        const headers = await this.client.generateHeaders(
          new URL(request.url()),
          request.headers()
        );
        const response = await route.fetch({
          headers: headers,
          maxRedirects: 0,
        });

        // Check if this is a Tollbit redirect
        const { action, isTollbitSite, to } = await this.client.checkResponse(
          {
            status: response.status(),
            headers: response.headers() as Record<string, string>,
          },
          request.url()
        );

        if (!isTollbitSite) {
          // not a tollbit site - retry the request if we got a 3xx status
          if (/^3\d\d$/.test(`${response.status}`)) {
            return await route.continue();
          }

          return route.fulfill({ response });
        }

        if (action === "token_required") {
          // If it is a Tollbit redirect, retry with token
          return route.continue({
            headers: await this.client.generateHeaders(
              new URL(request.url()),
              request.headers()
            ),
          });
        }

        if (action === "redirect") {
          // If it is a Tollbit redirect, retry with token
          return route.continue({
            headers: await this.client.generateHeaders(to, request.headers()),
          });
        }
      } catch (error) {
        if (this.config.debug) {
          console.error("Failed to handle request:", error);
        }
        await route.continue();
      }
    });
  }
}
