import fs from "node:fs";
import path from "node:path";
import { type Server } from "node:http";

import express, { type Express } from "express";
import runApp from "./app";

console.log("[PRODUCTION] Starting server...");
console.log("[PRODUCTION] NODE_ENV:", process.env.NODE_ENV);
console.log("[PRODUCTION] PORT:", process.env.PORT);

export async function serveStatic(app: Express, _server: Server) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files
  app.use(express.static(distPath));

  // SPA catch-all: serve index.html for any route that doesn't match a static file or API
  // This enables client-side routing to work correctly
  app.get("*", (req, res, next) => {
    // Skip API routes - they should have been handled already
    if (req.path.startsWith("/api")) {
      return next();
    }
    
    // Serve index.html for all other routes (SPA routing)
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// Start the server and let it run indefinitely
runApp(serveStatic).catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
