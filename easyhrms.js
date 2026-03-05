import { downloadFromS3 } from "./downloadS3.js";

export async function runAutomationEasyHRMS(stagehand, page, sessionId, meta) {
  console.log('Please log in manually in the opened browser window.');

  const loginTimeout = 3000000;
  const startTime = Date.now();
  while (Date.now() - startTime < loginTimeout) {
    try {
      const url = page.url();
      console.log("url", url)

      if (url.includes("dashboard") && !url.toLowerCase().includes("login")) {
        break;
      }
    } catch (e) {

    }
    await page.waitForTimeout(1000);
  }

  console.log('Logged in, continuing workflow...');

  console.log(`Performing action: click the Reports link`);
  await stagehand.act(`click the Reports link`);
  await page.waitForTimeout(1000)

  console.log(
    `Performing action: click the Open button for Attendance — Monthly Summary`,
  );
  await stagehand.act(`click the Open button for Attendance — Monthly Summary`);
  await page.waitForTimeout(1000)


  console.log(
    `Performing action: click the Download button for the recent report`,
  );
  await stagehand.act(`click the Download button for the recent report`);
  await page.waitForTimeout(5000)

  return downloadFromS3(sessionId, meta)

}