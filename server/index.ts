import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Check for OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  log("WARNING: OPENAI_API_KEY is not set. AI features will not work properly.", "server");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log the complete error for debugging
    log(`ERROR: ${message}`, "server-error");
    if (err.stack) {
      log(`ERROR STACK: ${err.stack}`, "server-error");
    }
    
    // Check for OpenAI API key errors
    if (message.includes("API key") || message.includes("authentication")) {
      return res.status(401).json({ 
        message: "OpenAI API key error. Please check your API key configuration." 
      });
    }
    
    res.status(status).json({ message });
    // Don't throw the error as it will crash the server
    // throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    if (!process.env.OPENAI_API_KEY) {
      log("⚠️ OPENAI_API_KEY is missing or invalid. AI features will not work properly.");
      log("Please set the OPENAI_API_KEY environment variable with a valid API key.");
    }
  });
})();
