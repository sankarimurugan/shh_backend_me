const connectDB = require("./config/db");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
require("dotenv").config();
const leadmanageRoutes = require("./routes/leadmanageRoutes");
const adminleadRoutes = require("./routes/adminleadRoutes");
const adminRoutes = require("./routes/adminroutes");
const telecallerRoutes = require("./routes/telecallerroutes");
const paymentdetailRoutes = require("./routes/paymentdetailRoutes");
const paymentproofRoutes = require("./routes/paymentproofRoutes");
const telepayRoutes = require("./routes/telepayRoutes");
const sourceRoutes = require("./routes/sourceRoutes");
const modeamountRoutes = require("./routes/modeamountRoutes");
const coursesRoutes = require("./routes/coursesRoutes");
const rolesRoutes = require("./routes/rolesRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const noteRoutes = require("./routes/noteRoutes");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require("compression");
const cache = require("memory-cache");
const { getamountname } = require("./controllers/modeamountController");
const notificationRoutes = require("./routes/notificationRoutes");
// Add this near the top with other route imports
const leadRoutes = require("./routes/leadroutes");
const attendancerRoutes = require("./routes/attendanceRoutes");

connectDB();

// Initialize express app
const app = express();

// Configure CORS properly with specific options
// Build a robust whitelist that supports localhost and your domains
const envOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://localhost:5173", // Vite default
  "http://localhost:4200", // Angular default
  "https://shhcrmtelecallers.netlify.app/",
];
const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envOrigins]));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (like curl/postman) where origin may be undefined
    if (!origin) return callback(null, true);

    const isLocalhost = /^http:\/\/(localhost|127\\.0\\.0\\.1)(:\\d+)?$/.test(origin);
    const isSaiHustleSubdomain = /^https:\/\/([a-z0-9-]+\\.)?saihustlehub\\.com$/.test(origin);

    if (allowedOrigins.includes(origin) || isLocalhost || isSaiHustleSubdomain) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// Explicitly handle preflight requests for all routes
app.options("*", cors(corsOptions));

// Security and optimization middleware
app.use(helmet());
app.use(compression());
app.use(express.json());
// Remove duplicate CORS middleware

// Rate limiting
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increase from 100 to 500
});
app.use("/api/", limiter);

// Session configuration
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      // Allow cross-site cookies when using different domains in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Static files
app.use("/public", express.static(path.join(__dirname, "public")));
// Add this line after the public static files middleware
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
// Routes
app.use("/api/auth", adminRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/lead", leadmanageRoutes);
// app.use('/api/admin', adminleadRoutes);
app.use("/api/telecallers", telecallerRoutes);
app.use("/api/source", sourceRoutes);
app.use("/api/amount", modeamountRoutes);
app.use("/api/course", coursesRoutes);
app.use("/api/payments", paymentdetailRoutes);
app.use("/api/proof", paymentproofRoutes);
app.use("/api/telepay", telepayRoutes);
app.use("/api/role", rolesRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/attendance", attendancerRoutes);
// Add notification routes here, with the other routes
app.use("/api/notifications", notificationRoutes);
app.use('/public', express.static(path.join(__dirname, 'public')));

// Add compression
app.use(compression());

// Add caching middleware
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = "__express__" + req.originalUrl || req.url;
    const cachedBody = cache.get(key);

    if (cachedBody) {
      res.send(cachedBody);
      return;
    } else {
      res.sendResponse = res.send;
      res.send = (body) => {
        cache.put(key, body, duration * 1000);
        res.sendResponse(body);
      };
      next();
    }
  };
};

// Use cache for get requests
app.get("/api/getamount", cacheMiddleware(300), getamountname);

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({
      status: "error",
      message: "Validation Error",
      errors: err.errors,
    });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      status: "error",
      message: "Unauthorized Access",
    });
  }

  // Default error response
  // Default error response
  res.status(err.statusCode || 400).json({
    status: err.statusCode || 400,
    message: err?.message || err?.data?.message || "Internal Server Error",
    data: {
      message: err?.message || err?.data?.message || "Internal Server Error",
      status: "fail",
    },
  });
});
// 404 handler - place this after all routes
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});
// Add notification routes
app.use("/api/notifications", notificationRoutes);
module.exports = app;
