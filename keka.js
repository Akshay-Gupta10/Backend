import { downloadFromS3 } from "./downloadS3.js";

async function closePopupIfPresent(page) {
    try {
        const popup = page.locator('text="Change in tax regime"');

        const isVisible = await popup.isVisible().catch(() => false);

        if (!isVisible) {
            console.log("Popup not visible. Skipping close.");
        }

        console.log("Popup detected. Closing deterministically...");

        const closeSelectors = [
            'button[aria-label="Close"]',
            'button[aria-label="close"]',
            'button:has(svg)',
            '.modal-header button',
            '.close',
            'span[aria-label="Close"]',
            'span[aria-label="close"]'
        ];

        let closed = false;

        for (const selector of closeSelectors) {
            try {
                const btn = page.locator(selector).first();

                const visible = await btn.isVisible().catch(() => false);

                if (visible) {
                    await btn.click({ timeout: 3000 }).catch(() => { });
                    console.log("Popup closed using selector:", selector);
                    closed = true;
                    break;
                }
            } catch (err) {
                console.log(`Selector failed: ${selector}`);
            }
        }

        if (!closed) {
            try {
                const closeBtn = page.locator(
                    `xpath=/html/body/modal-container/div[2]/div/div[1]/span`
                ).first();

                const visible = await closeBtn.isVisible().catch(() => false);

                if (visible) {
                    await closeBtn.click({ timeout: 3000 }).catch(() => { });
                    console.log("Popup closed using XPath fallback.");
                    closed = true;
                }
            } catch (err) {
                console.log("XPath fallback failed.");
            }
        }

        if (closed) {
            await popup.waitFor({ state: "hidden", timeout: 5000 }).catch(() => { });
        }

    } catch (err) {
        console.error("Popup handler crashed safely:", err.message);
    }

    await page.waitForTimeout(1000);
}

async function getPrevMonth(monthNumber){
  if(monthNumber===2){
    return "January"
  }
  else if(monthNumber===3){
    return "February"
  }
  else if(monthNumber===4){
    return "March"
  }
  else if(monthNumber===5){
    return "April"
  }
  else if(monthNumber===6){
    return "May"
  }
  else if(monthNumber===7){
    return "June"
  }
  else if(monthNumber===8){
    return "July"
  }
  else if(monthNumber===9){
    return "August"
  }
  else if(monthNumber===10){
    return "September"
  }
  else if(monthNumber===11){
    return "October"
  }
  else if(monthNumber===12){
    return "November"
  }
}

export async function runAutomationKeka(stagehand, page, sessionId,meta) {
    console.log("Waiting for login...");

    const loginTimeout = 300000;
    const startTime = Date.now();

    while (Date.now() - startTime < loginTimeout) {
        try {
            const url = page.url();
            console.log("url",url)
            if (url.includes("#") && !url.toLowerCase().includes("login")) {
                break;
            }
        } catch { }
        await page.waitForTimeout(1000);
    }

    console.log("Logged in successfully");
    await page.waitForTimeout(7000);

    const res1=await stagehand.act(`Click on the "My Finances" option in the left sidebar`);
    console.log("RES1",res1);
    console.log("res1",res1.cacheStatus);
    
    await page.waitForTimeout(2000);

    await closePopupIfPresent(page)
    await page.waitForTimeout(2000);

    const res2=await stagehand.act("Click on the My Pay tab");
    console.log("res2",res2.cacheStatus);

    await page.waitForTimeout(2000);

    const res3=await stagehand.act(`
            Within the My Pay page content,
            find the horizontal tab list that contains tabs like My Salary and Payslips and Income Tax.
            Click the tab labeled "Payslips".
        `);
    console.log("res3",res3.cacheStatus);
    
    await page.waitForTimeout(2000);

    try {
        const res4=await stagehand.act(`On the Payslips page, locate the text "Payslip has not been released yet by the admin"`);
        console.log("Current month payslip not found. Trying previous month...");
        console.log("res4",res4.cacheStatus);

        const today = new Date();
        const currentMonthNumber = today.getMonth();
        const prevMonth = await getPrevMonth(currentMonthNumber);

        const res5=await stagehand.act(`Click button having text as "${prevMonth}"`);
        console.log("res5",res5.cacheStatus);

        await page.waitForTimeout(2000);

    } 
    catch (err) {
    }
        
    const res6=await stagehand.act(`On the Payslips page, locate the download button having text "Pay Slip", 
      click on that button.`);
    console.log("res6",res6.cacheStatus);
    
    await page.waitForTimeout(5000);

    return downloadFromS3(sessionId,meta)
}