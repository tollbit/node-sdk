import { TollbitPlaywrightPlugin } from "@tollbit/playwright";
import { chromium } from "@playwright/test";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  const TEST_URL = "https://www.whatismybrowser.com";

  if (!process.env.TOLLBIT_API_KEY || !process.env.TOLLBIT_USER_AGENT) {
    throw new Error(
      "Missing required environment variables. Please check your .env file"
    );
  }

  // Initialize Tollbit with your credentials and known protected sites
  const plugin = TollbitPlaywrightPlugin.fromConfig({
    clientConfig: {
      apiKey: process.env.TOLLBIT_API_KEY || "your-api-key",
      userAgent: process.env.TOLLBIT_USER_AGENT || "your-registered-user-agent",
      tollbitHost: "edge.preproduction.tollbit.com",
      debug: true,
    },
    debug: true,
  });

  // Launch browser and create context
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  // Create a new page
  const page = await context.newPage();

  // Attach Tollbit to the context
  await plugin.attachToContext(context);

  console.log("Navigating to test page...");
  await page.goto(
    `${TEST_URL}/detect/what-http-headers-is-my-browser-sending`,
    {
      waitUntil: "networkidle",
    }
  );

  // Add a longer wait to see the headers in action
  console.log("Waiting to observe the request...");
  await page.waitForTimeout(10000);

  // Don't forget to close the browser when done
  await browser.close();
}

main().catch(console.error);
