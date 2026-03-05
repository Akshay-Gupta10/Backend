import { downloadFromS3 } from "./downloadS3.js";

export async function runAutomationRapidHR(stagehand, page, sessionId,meta) {
  console.log('Please log in manually in the opened browser window.');

  const loginTimeout = 3000000;
  const startTime = Date.now();
  while (Date.now() - startTime < loginTimeout) {
    try {
      const url = page.url();
      console.log("url", url)

      if (url.includes("home") && !url.toLowerCase().includes("login")) {
        break;
      }
    } catch (e) {

    }
    await page.waitForTimeout(1000);
  }

  console.log('Logged in, continuing workflow...');
  await page.waitForTimeout(1000);


  console.log(
    `Performing action: click the Approvals menu item in the left sidebar`,
  );
  await stagehand.act(`click the Approvals menu item in the left sidebar`);
  await page.waitForTimeout(1000);


  console.log(`Performing action: click the Offer Letters option`);
  await stagehand.act(`click the Offer Letters option`);
  await page.waitForTimeout(1000);

  console.log(`Performing action: click the OFFER LETTERS tab`);
  await stagehand.act(`click the OFFER LETTERS tab`);
  await page.waitForTimeout(1000);

  console.log(`Performing action: click the Approved Requests tab`);
  await stagehand.act(`click the Approved Requests tab`);
  await page.waitForTimeout(1000);

  console.log(`Performing action: click the View Details button`);
  await stagehand.act(`click the View Details button`);
  await page.waitForTimeout(1000);

  console.log(`Performing action: click the Download link for the Offer Letter`);
  await stagehand.act(`click the Download link for the Offer Letter`);
  await page.waitForTimeout(5000);

  return downloadFromS3(sessionId,meta)

}