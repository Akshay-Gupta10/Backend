import { S3Client } from "@aws-sdk/client-s3";
import AdmZip from "adm-zip";
import { fileTypeFromBuffer } from "file-type";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import "dotenv/config";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const monthRegex = /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/]*\d{4}/i;
const monthMap = {
  JANUARY: 'JAN',
  FEBRUARY: 'FEB',
  MARCH: 'MAR',
  APRIL: 'APR',
  MAY: 'MAY',
  JUNE: 'JUN',
  JULY: 'JUL',
  AUGUST: 'AUG',
  SEPTEMBER: 'SEP',
  OCTOBER: 'OCT',
  NOVEMBER: 'NOV',
  DECEMBER: 'DEC',
};

// helper to normalize month string
function normalizeMonth(monthStr) {
  if (!monthStr) return null;

  // extract the full month part from string
  const match = monthStr.match(monthRegex);
  if (!match) return null;

  let month = match[0].toUpperCase();

  // if full month, map it
  if (monthMap[month]) return monthMap[month];

  // if already short form, just return uppercase
  return month.slice(0, 3);
}

// Example usage
async function detectFile(buffer) {
  let finalBuffer = buffer;
  let contentType = "application/octet-stream";
  let extension = "bin";

  const detected = await fileTypeFromBuffer(buffer);
  if (detected) {
    contentType = detected.mime;
    extension = detected.ext;
  } else {
    const sample = buffer.toString("utf8");
    if (sample.includes(",") && sample.includes("\n")) {
      contentType = "text/csv";
      extension = "csv";
    }
  }

  if (!finalBuffer || finalBuffer.length === 0) {
    throw new Error("File is empty or corrupted");
  }

  return { finalBuffer, contentType, extension };
}

async function extractMonthFromPdfBuffer(buffer) {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(" ");
  }

  const match = text.match(monthRegex);
  if (!match) throw new Error("Month not found in PDF");
  return match[0]; // e.g., "March 2026"
}

export async function downloadFromS3(sessionId, meta) {
  // 1️⃣ Fetch file from Browserbase
  const fileResp = await fetch(
    `https://api.browserbase.com/v1/sessions/${sessionId}/downloads`,
    {
      headers: { "X-BB-API-Key": process.env.BROWSERBASE_API_KEY },
    }
  );

  if (!fileResp.ok) throw new Error("Failed to fetch download file");
  const arrayBuffer = await fileResp.arrayBuffer();
  let fileBuffer = Buffer.from(arrayBuffer);

  // 2️⃣ Detect ZIP / file type
  let finalBuffer = fileBuffer;
  let contentType = "application/octet-stream";
  let extension = "bin";

  if (fileBuffer.slice(0, 2).toString() === "PK") {
    const zip = new AdmZip(fileBuffer);
    const entries = zip.getEntries();
    const pdfEntry = entries.find(e => e.entryName.toLowerCase().endsWith(".pdf"));
    if (pdfEntry) {
      finalBuffer = pdfEntry.getData();
      contentType = "application/pdf";
      extension = "pdf";
    }
    else {
      ({ finalBuffer, contentType, extension } = await detectFile(fileBuffer));
    }
  } else {
    ({ finalBuffer, contentType, extension } = await detectFile(fileBuffer));
  }

  // 3️⃣ Extract month from PDF if PDF
  let month = meta.month; // fallback
  if (extension === "pdf") {
    try {
      const detectedMonth = await extractMonthFromPdfBuffer(finalBuffer);
      month = normalizeMonth(detectedMonth);
      console.log("Detected month from PDF:", month)
      console.log("actaual month from PDF:", meta.month)

    } catch (err) {
      console.warn("Failed to detect month from PDF, using meta:", err.message);
    }
  }

   // 1️⃣ Initiate Upload
  const authHeaders = meta.token
    ? {
        "Content-Type": "application/json",
        Authorization: meta.token,
        token: meta.token,
        userId: meta.userId,
        Source: "web",
      }
    : { "Content-Type": "application/json" };

  const initiateResp = await fetch(
    process.env.INITIATE_UPLOAD_API,
    {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
      document_type: "PAYSLIP",
      owner_of_document: meta.userId,
      uploaded_by: meta.userId,
      financial_year_id: meta.financialYearId,
      file_name: `AutomationPayslip.${extension}`
    })
  }
);

// console.log("hiii",await initiateResp.text())
const initiateText = await initiateResp.text();
console.log("hiiiii",initiateText)

console.log("initiate ho gya")
const initiateData = JSON.parse(initiateText);
const {
  document_identifier,
  pre_signed_s3_url_for_upload
} = initiateData;


console.log("pre signed mil gya")
console.log("pre signed is",pre_signed_s3_url_for_upload)

// 2️⃣ Upload To Presigned URL
await fetch(pre_signed_s3_url_for_upload, {
  method: "PUT",
  headers: {
    "Content-Type": contentType,
  },
  body: finalBuffer
});
console.log("upload kr dia")

// 3️⃣ Finalize Upload
  console.log("metamonth",meta.month)
  const response=await fetch(process.env.FINALIZE_UPLOAD_API, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
    user_id: meta.userId,
    financial_year_id: meta.financialYearId,
    month: meta.month,
    company_id: meta.companyId,
    salary_income_external_id: meta.externalId,
    document_identifier
  })
});

console.log("Status Code:", response.status);

console.log("sb ho gya")
  return {
    success: true,
  };
}