import { Stagehand } from "@browserbasehq/stagehand";

let stagehandInstance = null;

export async function getStagehand() {
  if (!stagehandInstance) {
    console.log("Initializing Stagehand...");

    stagehandInstance = new Stagehand({
      env: "BROWSERBASE",
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      model: {
        modelName: "google/gemini-2.5-flash",
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
      },
    });

    await stagehandInstance.init();

    console.log("Stagehand ready");
  }

  return stagehandInstance;
}