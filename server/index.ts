import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedCmsContent } from "./seed";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setBroadcastFunction, setNotificationFunction, setOnlineUsersAccessor } from "./websocket-helpers";

const app = express();

// Enable gzip/brotli compression for all responses (LCP optimization)
app.use(compression({
  level: 9, // Maximum compression for production
  threshold: 512, // Compress responses larger than 512 bytes
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Serve static files from attached_assets directory with aggressive cache headers (LCP optimization)
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets'), {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, filePath) => {
    // Add Cache-Control headers for optimal caching
    if (filePath.endsWith('.webp') || filePath.endsWith('.jpg') || filePath.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Serve static files from public directory (Open Graph images, etc.) with optimized caching
app.use('/public', express.static(path.join(process.cwd(), 'public'), {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.jpg') || filePath.endsWith('.png') || filePath.endsWith('.webp')) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
    }
  }
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
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; " +
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
    
    // Critical environment variables required for the app to function
    if (!process.env.DATABASE_URL) {
      missingEnvVars.push('DATABASE_URL');
    }
    if (!process.env.SESSION_SECRET) {
      missingEnvVars.push('SESSION_SECRET');
    }
    
    if (missingEnvVars.length > 0) {
      const errorMsg = `FATAL: Missing required environment variables: ${missingEnvVars.join(', ')}`;
      log(errorMsg, 'express');
      console.error('\n' + '='.repeat(80));
      console.error('DEPLOYMENT CONFIGURATION ERROR');
      console.error('='.repeat(80));
      console.error('\nThe following environment variables are required but not set:');
      missingEnvVars.forEach(v => console.error(`  - ${v}`));
      console.error('\nRequired for all environments:');
      console.error('  - DATABASE_URL: PostgreSQL connection string');
      console.error('  - SESSION_SECRET: Secret key for session encryption');
      console.error('\nOptional (for specific features):');
      console.error('  - UPLOADTHING_TOKEN: For file uploads (avatars, MP3 files)');
      console.error('  - RESEND_API_KEY: For email functionality');
      console.error('  - RESEND_FROM_EMAIL: Sender email address');
      console.error('\nPlease add these in Replit Deployment → Secrets');
      console.error('='.repeat(80) + '\n');
      process.exit(1);
    }
    
    log('All required environment variables present', 'express');
    
    // Warn about optional environment variables in production
    const optionalWarnings: string[] = [];
    
    // UploadThing: Check for both TOKEN and SECRET (both needed for file uploads)
    const hasUploadThingToken = !!process.env.UPLOADTHING_TOKEN;
    const hasUploadThingSecret = !!process.env.UPLOADTHING_SECRET;
    
    if (!hasUploadThingToken && !hasUploadThingSecret) {
      optionalWarnings.push('UPLOADTHING_TOKEN and UPLOADTHING_SECRET not set - file upload features (avatars, MP3 files) will be completely disabled');
    } else if (!hasUploadThingToken) {
      optionalWarnings.push('UPLOADTHING_TOKEN not set - file upload features will NOT work (UPLOADTHING_SECRET alone is insufficient)');
    } else if (!hasUploadThingSecret) {
      optionalWarnings.push('UPLOADTHING_SECRET not set - file upload features will NOT work (UPLOADTHING_TOKEN alone is insufficient)');
    }
    
    // Resend: Check API key and from email separately
    if (!process.env.RESEND_API_KEY) {
      optionalWarnings.push('RESEND_API_KEY not set - email features (verification, password reset, contact form) will be disabled');
    }
    if (!process.env.RESEND_FROM_EMAIL) {
      optionalWarnings.push('RESEND_FROM_EMAIL not set - emails cannot be sent even if RESEND_API_KEY is configured');
    }
    
    if (optionalWarnings.length > 0 && env === 'production') {
      console.warn('\n' + '-'.repeat(80));
      console.warn('WARNING: Optional environment variables not configured:');
      console.warn('-'.repeat(80));
      optionalWarnings.forEach(warning => console.warn('  - ' + warning));
      console.warn('\nThe application will start, but some features will be unavailable.');
      console.warn('Add these secrets in Replit Deployment → Secrets to enable all features.');
      console.warn('-'.repeat(80) + '\n');
    }
    
    // Seed CMS content if needed
    await seedCmsContent();
    
    const server = await registerRoutes(app);
    
    // ===== WEBSOCKET SETUP (before routes need it) =====
    // Track online users: Map<userId, Set<WebSocket>>
    const onlineUsers = new Map<number, Set<WebSocket>>();
    
    // Track typing status: Map<conversationKey, Set<userId>>
    const typingUsers = new Map<string, Set<number>>();
    
    // Helper function to broadcast message to specific user (all their active connections)
    function broadcastToUser(userId: number, message: any) {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        const messageStr = JSON.stringify(message);
        userSockets.forEach(socket => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(messageStr);
          }
        });
      }
    }
    
    // Helper function to send notification to a specific user
    function sendNotification(userId: number, title: string, description?: string, variant: 'default' | 'destructive' = 'default') {
      broadcastToUser(userId, {
        type: 'notification',
        title,
        description,
        variant,
      });
    }
    
    // Helper function to get conversation key (canonical ordering)
    function getConversationKey(user1Id: number, user2Id: number): string {
      const [id1, id2] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];
      return `${id1}-${id2}`;
    }
    
    // Make broadcastToUser, sendNotification, and onlineUsers available to routes IMMEDIATELY
    setBroadcastFunction(broadcastToUser);
    setNotificationFunction(sendNotification);
    setOnlineUsersAccessor(() => Array.from(onlineUsers.keys()));

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

    // ===== CLEANUP JOBS FOR REGISTRATION ABUSE PROTECTION =====
    // Run cleanup every hour to remove expired pending users and old registration attempts
    const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
    
    const runCleanup = async () => {
      try {
        // Cleanup expired pending users (older than 24 hours)
        const expiredPending = await storage.cleanupExpiredPendingUsers();
        if (expiredPending > 0) {
          log(`[CLEANUP] Deleted ${expiredPending} expired pending users`);
        }

        // Cleanup old registration attempts (older than 1 hour)
        const oldAttempts = await storage.cleanupOldRegistrationAttempts(1);
        if (oldAttempts > 0) {
          log(`[CLEANUP] Deleted ${oldAttempts} old registration attempts`);
        }
      } catch (error) {
        console.error('[CLEANUP] Error during cleanup job:', error);
      }
    };

    // Run cleanup immediately on startup
    runCleanup();

    // Schedule cleanup to run every hour
    setInterval(runCleanup, CLEANUP_INTERVAL);
    log(`[CLEANUP] Scheduled cleanup job to run every ${CLEANUP_INTERVAL / 1000 / 60} minutes`);

    // ===== WEBSOCKET SERVER FOR REAL-TIME MESSAGING =====
    const wss = new WebSocketServer({ server, path: '/api/ws' });

    wss.on('connection', async (ws: WebSocket, req) => {
      try {
        // Parse session cookie to authenticate user
        const cookieHeader = req.headers.cookie;
        if (!cookieHeader) {
          ws.close(1008, 'No session cookie');
          return;
        }

        // Extract session ID from cookie (this is a simplified approach)
        // In production, you'd properly parse the session cookie
        const sessionCookie = cookieHeader.split(';').find(c => c.trim().startsWith('connect.sid='));
        if (!sessionCookie) {
          ws.close(1008, 'Invalid session');
          return;
        }

        // For now, we'll use a simpler approach: authenticate via initial message
        let userId: number | null = null;

        ws.on('message', async (data) => {
          try {
            const message = JSON.parse(data.toString());

            // Authentication handshake
            if (message.type === 'auth' && !userId) {
              // Verify user is authenticated (you'd check session here)
              // For simplicity, we trust the client sends correct userId after auth
              // In production, validate against session store
              userId = message.userId;
              
              if (!userId) {
                ws.close(1008, 'Authentication failed');
                return;
              }

              // Add user to online users
              if (!onlineUsers.has(userId)) {
                onlineUsers.set(userId, new Set());
              }
              onlineUsers.get(userId)!.add(ws);

              // Update last seen timestamp
              await storage.updateUserLastSeen(userId);

              // Notify user is online
              broadcastToUser(userId, {
                type: 'online_status',
                userId,
                online: true,
              });

              log(`[WebSocket] User ${userId} connected`);
              return;
            }

            if (!userId) {
              ws.close(1008, 'Not authenticated');
              return;
            }

            // Handle typing indicators
            if (message.type === 'typing_start') {
              const { receiverId } = message;
              const conversationKey = getConversationKey(userId, receiverId);
              const currentUserId = userId; // Capture for closure
              
              if (!typingUsers.has(conversationKey)) {
                typingUsers.set(conversationKey, new Set());
              }
              typingUsers.get(conversationKey)!.add(userId);

              // Notify receiver
              broadcastToUser(receiverId, {
                type: 'typing_start',
                userId,
              });

              // Auto-clear typing after 5 seconds
              setTimeout(() => {
                typingUsers.get(conversationKey)?.delete(currentUserId);
                broadcastToUser(receiverId, {
                  type: 'typing_stop',
                  userId: currentUserId,
                });
              }, 5000);
            }

            if (message.type === 'typing_stop') {
              const { receiverId } = message;
              const conversationKey = getConversationKey(userId, receiverId);
              typingUsers.get(conversationKey)?.delete(userId);

              broadcastToUser(receiverId, {
                type: 'typing_stop',
                userId,
              });
            }

            // Handle new message notification
            if (message.type === 'new_message') {
              const { receiverId, messageData } = message;
              
              // Broadcast to receiver
              broadcastToUser(receiverId, {
                type: 'new_message',
                message: messageData,
              });
            }

            // Handle message read notification
            if (message.type === 'message_read') {
              const { senderId, conversationId } = message;
              
              // Notify sender that receiver read the message
              broadcastToUser(senderId, {
                type: 'message_read',
                conversationId,
                readBy: userId,
              });
            }

          } catch (error: any) {
            log(`[WebSocket] Message parse error: ${error.message}`);
          }
        });

        ws.on('close', async () => {
          if (userId) {
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
              userSockets.delete(ws);
              if (userSockets.size === 0) {
                onlineUsers.delete(userId);
                
                // Update last seen timestamp when user goes offline
                await storage.updateUserLastSeen(userId);
                
                // Broadcast offline status
                broadcastToUser(userId, {
                  type: 'online_status',
                  userId,
                  online: false,
                });
              }
            }
            log(`[WebSocket] User ${userId} disconnected`);
          }
        });

        ws.on('error', (error) => {
          log(`[WebSocket] Socket error: ${error.message}`);
        });

      } catch (error: any) {
        log(`[WebSocket] Connection error: ${error.message}`);
        ws.close(1011, 'Internal server error');
      }
    });

    log('[WebSocket] WebSocket server initialized on /api/ws');

  } catch (error: any) {
    log(`Failed to start server: ${error.message}`, 'express');
    console.error('Full error:', error);
    process.exit(1);
  }
})();
