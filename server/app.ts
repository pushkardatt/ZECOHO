import { type Server } from "node:http";
import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";
import { registerRoutes } from "./routes";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { seedAmenities } from "./seed-amenities";
import { seedDestinations } from "./seed-destinations";
import { seedOwnerAgreement } from "./seed-owner-agreement";
import { seedPolicies } from "./seed-policies";
import { migrateMealOptionNames } from "./migrate-meal-options";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

// ── Security Headers ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled to allow Replit dev tools
    crossOriginEmbedderPolicy: false,
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    "https://zecoho.com",
    "https://www.zecoho.com",
    "https://zecoho.replit.app",
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Add health check endpoints BEFORE any middleware
// These MUST respond immediately without any processing
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.head("/", (_req, res) => {
  res.status(200).send();
});

app.get("/__healthcheck", (_req, res) => {
  res.status(200).send("ok");
});

// Bot blocker - drops junk traffic instantly
app.use((req, res, next) => {
  const blockedPaths = [
    "/wp-login.php",
    "/wp-admin",
    "/xmlrpc.php",
    "/.env",
    "/admin.php",
  ];
  if (blockedPaths.some((path) => req.path.startsWith(path))) {
    return res.status(404).end();
  }
  next();
});

// Rate limiter - max 500 requests per IP per 15 mins
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  skip: (req) => {
    // Skip rate limiting for WebSocket and health check endpoints
    return req.path === "/health" || req.path.startsWith("/ws");
  },
  message: { message: "Too many requests, please try again in a few minutes." },
});
app.use(limiter);
// NOW add middleware after health checks
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

// Request logging middleware - only logs API calls, doesn't affect health checks
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
): Promise<never> {
  const port = parseInt(process.env.PORT || "5000", 10);

  const http = await import("node:http");
  const server = http.createServer(app);

  // Start listening IMMEDIATELY so health checks pass during initialization
  await new Promise<void>((resolve) => {
    server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
      log(`serving on port ${port}`);
      resolve();
    });
  });

  // Now register routes and complete setup (database connections, etc.)
  await registerRoutes(app, server);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  await setup(app, server);

  // Fire-and-forget seeding after server is fully ready
  seedPolicies();
  seedOwnerAgreement();
  migrateMealOptionNames();

  if (process.env.NODE_ENV !== "production") {
    seedAmenities();
    seedDestinations();
  }

  // Return a promise that never resolves - keeping the process alive
  return new Promise(() => {});
}
