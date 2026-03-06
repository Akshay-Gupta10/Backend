import "dotenv/config";
import { getStagehand } from "./stagehandManager.js";

import { runAutomationKeka } from "./keka.js";
import { runAutomationEasyHRMS } from "./easyhrms.js";
import { runAutomationRapidHR } from "./rapidhr.js";

const KEKA_URL = "https://app.keka.com";
const EASY_HRMS_URL = "https://easyhrms.in/login/";
const RAPID_HR_URL = "https://login.rapidhr.com/";

export async function startIncomeTaxAutomation(type, meta) {
  const stagehand = await getStagehand();
  const page = await stagehand.context.newPage();

  if (type == "keka") {
    await page.goto(KEKA_URL, {
      waitUntil: "domcontentloaded",
    });
  }
  else if (type == "easyhrms") {
    await page.goto(EASY_HRMS_URL, {
      waitUntil: "domcontentloaded",
    });
  }
  else if (type == "rapidhr") {
    await page.goto(RAPID_HR_URL, {
      waitUntil: "domcontentloaded",
    });
  }
  
  const sessionId = stagehand.apiClient.sessionId;

  // 🔥 Get Live Preview URL
  const debugResp = await fetch(
    `https://api.browserbase.com/v1/sessions/${sessionId}/debug`,
    {
      headers: {
        "X-BB-API-Key": process.env.BROWSERBASE_API_KEY
      }
    }
  );

  const debugData = await debugResp.json();
  const realPage = debugData.pages.find(
    p => p.url && p.url !== "about:blank"
  );

  const liveViewUrl = realPage
    ? realPage.debuggerFullscreenUrl
    : debugData.debuggerFullscreenUrl;

  let filePromise = null;
  if (type == "keka") {
    filePromise = runAutomationKeka(stagehand, page, sessionId, meta);
  }
  else if (type == "easyhrms") {
    filePromise = runAutomationEasyHRMS(stagehand, page, sessionId, meta)
  }
  else if (type == "rapidhr") {
    filePromise = runAutomationRapidHR(stagehand, page, sessionId, meta)
  }

  if (filePromise) {
    filePromise = filePromise.finally(async () => {
    try {
      await page.close();
      console.log(`BrowserBase session ${sessionId} closed.`);
    } catch (err) {
      console.error(`Failed to close session ${sessionId}`, err);
    }
  });
}
  return { liveViewUrl, sessionId, filePromise };
}

