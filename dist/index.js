"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const colors_1 = __importDefault(require("colors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
require("dotenv/config");
const node_cron_1 = __importDefault(require("node-cron"));
const error_handler_1 = __importDefault(require("./middlewares/error-handler.js"));
const routes_1 = require("./controllers/routes.js");
const attendance_scheduler_1 = require("./services/attendance-scheduler.js");
require("./db/index.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json({ limit: "50mb" }));
app.use((0, cookie_parser_1.default)());
app.set("trust proxy", 1);
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === "production"
        ? "https://tracesys.mvsoftwares.space"
        : "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
}));
// Resolve uploads directory for both dev (src) and prod (dist) without relying on __dirname
const projectRoot = process.cwd();
const candidateUploads = [
    path_1.default.join(projectRoot, "uploads"),
    path_1.default.join(projectRoot, "src", "uploads"),
    path_1.default.join(projectRoot, "dist", "uploads"),
];
const uploadsDir = candidateUploads.find((p) => fs_1.default.existsSync(p)) || candidateUploads[0];
app.use("/uploads", express_1.default.static(uploadsDir));
routes_1.routes.forEach((route) => {
    app.use("/api/v1", route);
});
app.listen(PORT, () => {
    console.log(colors_1.default.cyan(`TRACESYS Server running on port: ${PORT}`));
    // Set up daily cron job to create absent records
    // Runs every day at 1:00 AM (server time)
    // This checks the previous day for missing attendance records
    node_cron_1.default.schedule("0 1 * * *", async () => {
        console.log(colors_1.default.yellow("[Cron Job] Starting daily absent records check..."));
        try {
            await (0, attendance_scheduler_1.createAbsentRecordsForDate)();
            console.log(colors_1.default.green("[Cron Job] Daily absent records check completed"));
        }
        catch (error) {
            console.error(colors_1.default.red(`[Cron Job] Error: ${error.message}`));
        }
    }, {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    console.log(colors_1.default.green("[Cron Job] Daily absent records scheduler initialized (runs at 1:00 AM daily)"));
});
// testing api
app.get("/test", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    console.log(res.getHeaderNames());
    res.status(200).json({
        success: true,
        message: "API is working",
    });
});
// unknown route
app.use((req, res, next) => {
    const err = new Error(`Route ${req.originalUrl} not found`);
    err.statusCode = 404;
    next(err);
});
app.use(error_handler_1.default);
