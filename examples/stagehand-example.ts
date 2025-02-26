import { Stagehand } from "@browserbasehq/stagehand";
import { TollbitStagehandPlugin } from "@tollbit/stagehand";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  // Initialize Stagehand
  const stagehand = new Stagehand({
    env: "LOCAL",
    headless: false /* Run browser in headless mode */,
    modelName: "gpt-4o",
  });

  await stagehand.init();

  // Initialize Tollbit with your configuration
  const tollbit = TollbitStagehandPlugin.fromConfig({
    clientConfig: {
      tollbitHost: "edge.preproduction.tollbit.com",
      apiKey: process.env.TOLLBIT_API_KEY!,
      userAgent: "TestBot/1.0",
      // debug: true,
    },
  });

  // Get the browser context
  const context = stagehand.context;

  // Attach Tollbit to the browser context
  await tollbit.attachToContext(context);

  // Create a new page
  const page = stagehand.page;

  // Navigate to your protected page
  await page.goto("https://tollbit.0b1000101.com/");

  await page.act("click on the glasses");

  await page.act("click add to cart");

  // Close the browser
  await stagehand.close();
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
