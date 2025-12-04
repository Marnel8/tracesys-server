import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import colors from "colors";
import path from "path";
import fs from "fs";
import "dotenv/config";
import errorHandlerMiddleware from "./middlewares/error-handler";
import { routes } from "./controllers/routes";

import "./db";

const app = express();

const PORT = process.env.PORT || 5001;

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "50mb" }));

app.use(cookieParser());

app.set("trust proxy", 1);

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://tracesys.mvsoftwares.space"
        : "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// Resolve uploads directory for both dev (src) and prod (dist) without relying on __dirname
const projectRoot = process.cwd();
const candidateUploads = [
  path.join(projectRoot, "uploads"),
  path.join(projectRoot, "src", "uploads"),
  path.join(projectRoot, "dist", "uploads"),
];
const uploadsDir =
  candidateUploads.find((p) => fs.existsSync(p)) || candidateUploads[0];

app.use("/uploads", express.static(uploadsDir));

routes.forEach((route) => {
  app.use("/api/v1", route);
});

app.listen(PORT, () => {
  console.log(colors.cyan(`TRACESYS Server running on port: ${PORT}`));
});

// testing api
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: "API is working",
  });
});

// unknown route
app.use((req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route ${req.originalUrl} not found`) as any;
  err.statusCode = 404;
  next(err);
});
app.use(errorHandlerMiddleware);
