import express from "express";

const app = express();
app.use(express.json({ limit: "50mb" }));

// Health API
app.get("/api/health", (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ status: "ok", app: "ELECTRO MEN Backend" });
});

module.exports = app;
