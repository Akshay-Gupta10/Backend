import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import AdmZip from "adm-zip";
import { fileTypeFromBuffer } from "file-type";
import "dotenv/config";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function detectFile(buffer) {
  let finalBuffer = buffer;
  let contentType = "application/octet-stream";
  let extension = "bin";

  const detected = await fileTypeFromBuffer(buffer);

  if (detected) {
    finalBuffer = buffer;
    contentType = detected.mime;
    extension = detected.ext;
  }

  else {
    const sample = buffer.toString("utf8");
    if (sample.includes(",") && sample.includes("\n")) {
      finalBuffer = buffer;
      contentType = "text/csv";
      extension = "csv";
    }
  }

  if (!finalBuffer || finalBuffer.length === 0) {
    throw new Error("File is empty or corrupted");
  }

  return { finalBuffer, contentType, extension };
}

export async function downloadFromS3(sessionId,meta) {
  // 🔥 1. Get downloads list
  // 🔥 Fetch ZIP directly
  const fileResp = await fetch(
    `https://api.browserbase.com/v1/sessions/${sessionId}/downloads`,
    {
      headers: {
        "X-BB-API-Key": process.env.BROWSERBASE_API_KEY,
      },
    }
  );

  if (!fileResp.ok) {
    throw new Error("Failed to fetch download file");
  }

  // 🔥 IMPORTANT: read as binary (NOT json, NOT text)
  const arrayBuffer = await fileResp.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  // 🔥 Detect file type
  let finalBuffer = fileBuffer;
  let contentType = "application/octet-stream";
  let extension = "bin";

  // ZIP detection
  if (fileBuffer.slice(0, 2).toString() === "PK") {
    const zip = new AdmZip(fileBuffer);
    const entries = zip.getEntries();

    const pdfEntry = entries.find(e =>
      e.entryName.toLowerCase().endsWith(".pdf")
    );
    const csvEntry = entries.find(e =>
      e.entryName.toLowerCase().endsWith(".csv")
    );
    const xlsEntry = entries.find(e =>
      e.entryName.toLowerCase().endsWith(".xls")
    );
    const xlsxEntry = entries.find(e =>
      e.entryName.toLowerCase().endsWith(".xlsx")
    );

    if (pdfEntry) {
      finalBuffer = pdfEntry.getData();
      contentType = "application/pdf";
      extension = "pdf";
    }
    else if (csvEntry) {
      finalBuffer = csvEntry.getData();
      contentType = "text/csv";
      extension = "csv";
    }
    else if (xlsxEntry) {
      finalBuffer = xlsxEntry.getData();
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      extension = "xlsx";
    }
    else if (xlsEntry) {
      finalBuffer = xlsEntry.getData();
      contentType = "application/vnd.ms-excel";
      extension = "xls";
    }
  }
  else {
    ({ finalBuffer, contentType, extension } = await detectFile(fileBuffer))
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
  await fetch(process.env.FINALIZE_UPLOAD_API, {
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

console.log("sb ho gya")
  return {
    success: true,
  };
}