import { Tollbit, TollbitConfig } from "@tollbit/core";
import type { Page, BrowserContext } from "@browserbasehq/stagehand";

export class StagehandTollbit extends Tollbit {
  constructor(config: TollbitConfig) {
    super(config);
  }

  async attachToContext(context: BrowserContext): Promise<void> {
    if (this.config.debug) {
      console.log("Attaching Tollbit to Stagehand context");
    }

    await context.route("**/*", async (route, request) => {
      const url = new URL(request.url());
      const headers = await this.generateHeaders(url, request.headers());

      // If no Tollbit headers were added, continue as normal
      if (!headers["x-tollbit-token"]) {
        return route.continue();
      }

      try {
        await route.continue({ headers });
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
      const url = new URL(request.url());
      const headers = await this.generateHeaders(url, request.headers());

      // If no Tollbit headers were added, continue as normal
      if (!headers["x-tollbit-token"]) {
        return route.continue();
      }

      try {
        await route.continue({ headers });
      } catch (error) {
        if (this.config.debug) {
          console.error("Failed to handle request:", error);
        }
        await route.continue();
      }
    });
  }
}
