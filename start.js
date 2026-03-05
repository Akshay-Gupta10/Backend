import express from "express";
import cors from "cors";
// import { startIncomeTaxAutomation } from "./index.js";

process.on("exit", (code) => {
  console.log("Process exiting with code:", code);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

const app = express();
app.use(cors());
app.use(express.json());

const sessionResults = new Map();

app.post("/run-income-tax-download", async (req, res) => {
  try {
    const {
      type,
      userId,
      token,
      financialYearId,
      month,
      companyId,
      externalId
    } = req.body;

    const { liveViewUrl, sessionId, filePromise } =
      await startIncomeTaxAutomation(type, {
        userId,
        token,
        financialYearId,
        month,
        companyId,
        externalId
      });

  filePromise
  .then(() => {
    sessionResults.set(sessionId, "uploaded");
  })
  .catch((err) => {
    console.log("hloooooo",filePromise)
    console.error("Automation failed:", err);
  });

    res.json({ liveViewUrl, sessionId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal error" });
  }
});

app.get("/check-status/:sessionId", (req, res) => {
  const status = sessionResults.get(req.params.sessionId);

  if (!status) {
    return res.json({ ready: false });
  }

  res.json({ ready: true });
});

app.listen(4000, () => {
  console.log("Server running on port 4000");
});