import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedCmsContent } from "./seed";

const app = express();

// Enable gzip compression for all responses
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Serve static files from attached_assets directory with cache headers
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets'), {
  maxAge: '1y',
  immutable: true,
}));

// Trust proxy - omogućava dobijanje prave IP adrese klijenta
// Postavljamo na 1 jer je Replit iza jednog proxy hop-a
app.set('trust proxy', 1);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Add security headers with relaxed CSP for Vite in production
app.use((req, res, next) => {
  // Allow eval for Vite build chunks (needed for dynamic imports)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "media-src 'self' https://utfs.io https://*.uploadthing.com; " +
    "connect-src 'self' https://*.uploadthing.com https://uploadthing-prod.s3.us-west-2.amazonaws.com; " +
    "frame-ancestors 'none';"
  );
  next();
});

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
  try {
    // Log environment info
    const env = app.get("env");
    log(`Starting server in ${env} mode`);
    log(`PORT: ${process.env.PORT || '5000'}`);
    
    // Check critical environment variables - FAIL FAST if missing
    const missingEnvVars: string[] = [];
    
    if (!process.env.DATABASE_URL) {
      missingEnvVars.push('DATABASE_URL');
    }
    if (!process.env.SESSION_SECRET) {
      missingEnvVars.push('SESSION_SECRET');
    }
    
    // In production, also check for required API keys
    if (env === 'production') {
      if (!process.env.UPLOADTHING_TOKEN && !process.env.UPLOADTHING_SECRET) {
        missingEnvVars.push('UPLOADTHING_TOKEN or UPLOADTHING_SECRET');
      }
    }
    
    if (missingEnvVars.length > 0) {
      const errorMsg = `FATAL: Missing required environment variables: ${missingEnvVars.join(', ')}`;
      log(errorMsg, 'express');
      console.error('\n' + '='.repeat(80));
      console.error('DEPLOYMENT CONFIGURATION ERROR');
      console.error('='.repeat(80));
      console.error('\nThe following environment variables are required but not set:');
      missingEnvVars.forEach(v => console.error(`  - ${v}`));
      console.error('\nPlease add these in Replit Deployment → Secrets');
      console.error('='.repeat(80) + '\n');
      process.exit(1);
    }
    
    log('All required environment variables present', 'express');
    
    // Seed CMS content if needed
    await seedCmsContent();
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      log(`Error: ${message}`, 'express');
      console.error('Full error details:', err);
      
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (env === "development") {
      log('Setting up Vite dev server', 'express');
      await setupVite(app, server);
    } else {
      log('Setting up production static file serving', 'express');
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server successfully started on port ${port}`);
      log(`Environment: ${env}`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      log(`Server error: ${error.message}`, 'express');
      console.error('Full error:', error);
      process.exit(1);
    });

  } catch (error: any) {
    log(`Failed to start server: ${error.message}`, 'express');
    console.error('Full error:', error);
    process.exit(1);
  }
})();
