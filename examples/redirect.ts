import { PlaywrightTollbit } from "@tollbit/playwright";
import { chromium } from "@playwright/test";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  const TEST_URL = "http://localhost:3001";

  // Initialize Tollbit with your credentials and known protected sites
  const tollbit = new PlaywrightTollbit({
    secretKey: process.env.TOLLBIT_SECRET_KEY || "your-secret-key",
    userAgent: process.env.TOLLBIT_USER_AGENT || "your-registered-user-agent",
    debug: true,
    forceHeaders: true,
  });

  if (!process.env.TOLLBIT_SECRET_KEY || !process.env.TOLLBIT_USER_AGENT) {
    throw new Error(
      "Missing required environment variables. Please check your .env file"
    );
  }

  // Launch browser and create context
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  // Create a new page before attaching Tollbit
  const page = await context.newPage();

  // Attach Tollbit to the context after our header modification route
  await tollbit.attachToContext(context);

  console.log("Navigating to test page...");
  await page.goto(TEST_URL);

  // Add a longer wait to see the headers in action
  console.log("Waiting to observe the request...");
  await page.waitForTimeout(10000);

  // Don't forget to close the browser when done
  await browser.close();
}

main().catch(console.error);
