import { Stagehand } from "@browserbasehq/stagehand";
import { StagehandTollbit } from "@tollbit/stagehand";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  // Initialize Stagehand
  const stagehand = new Stagehand({
    env: "LOCAL",
    headless: false /* Run browser in headless mode */,
  });

  await stagehand.init();

  // Initialize Tollbit with your configuration
  const tollbit = new StagehandTollbit({
    secretKey: process.env.TOLLBIT_SECRET_KEY!,
    userAgent: "TestBot/1.0",
    debug: true, // Enable debug logging
    forceHeaders: true, // Use redirect-based behavior
  });

  // Get the browser context
  const context = stagehand.context;

  // Attach Tollbit to the browser context
  await tollbit.attachToContext(context);

  // Create a new page
  const page = stagehand.page;

  // Navigate to your protected page
  await page.goto("http://localhost:3001/");

  await page.act("click on the glasses");

  // Close the browser
  await stagehand.close();
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
