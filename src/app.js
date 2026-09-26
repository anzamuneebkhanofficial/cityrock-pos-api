import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

// Middlewares
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

// Route Modules
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import tenantRoutes from "./routes/tenantRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxies (Vercel, Render, AWS, Nginx) for accurate client IP in rate limiting & logs
app.set("trust proxy", 1);

// Security headers with cross-origin asset policy for static images
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// High-performance response compression per compression skill
app.use(
  compression({
    level: 6,
    threshold: 1024, // only compress responses > 1KB
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  process.env.FRONTEND_URL ||
  "http://localhost:3000,http://localhost:3001"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Cross-Origin Resource Sharing with intelligent origin verification
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, health probes)
      if (!origin) return callback(null, true);
      if (
        process.env.NODE_ENV !== "production" ||
        allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.startsWith("http://172.") ||
        origin.startsWith("http://192.168.") ||
        origin.startsWith("http://10.") ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS request blocked from unauthorized origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "x-store-id",
      "x-tenant-id",
      "idempotency-key",
    ],
  })
);

// Serve uploads folder statically for avatars, logos, receipts
const uploadsPath = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsPath));

// Body parsing with safety limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Logging in development
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Global API rate limiter (protects against brute-force and DDoS)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests from this IP, please try again later." },
});
app.use("/api/", apiLimiter);

// Root Health Check Route — Cloud & Monitoring Deployment Verification
app.get("/", (req, res) => {
  const isVercel = Boolean(process.env.VERCEL);
  const isRender = Boolean(process.env.RENDER);
  const platform = isVercel
    ? "vercel-serverless"
    : isRender
    ? "render"
    : "standalone";

  res.status(200).json({
    status: "healthy",
    service: "CityRock POS Backend API",
    version: "1.0.0",
    platform,
    environment: process.env.NODE_ENV || "development",
    dbStatus: mongoose.connection.readyState === 1 ? "connected" : "connecting/disconnected",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// System Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: "CityRock POS Backend",
    version: "1.0.0",
    engine: "Express 5",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// API v1 Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/tenant", tenantRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/sales", salesRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/suppliers", supplierRoutes);
app.use("/api/v1/purchase-orders", purchaseOrderRoutes);

// Error Handling (Express 5 compatible)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
