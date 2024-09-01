import "./commons/dotenv.js";
import bodyParser from "body-parser";
import { router as appRoutes } from "./routes/routes.js";
import express from "express";
import { initializeOpenAiClient } from "./commons/openaiUtils.js";

const app = express();
app.use(bodyParser.json());

//init the openai client library
initializeOpenAiClient();
// Use the routes from routes.js
app.use(appRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(8080);
