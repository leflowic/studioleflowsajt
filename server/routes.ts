import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSubmissionSchema, insertCmsContentSchema, insertCmsMediaSchema, type CmsContent, type CmsMedia } from "@shared/schema";
import { sendEmail, getLastVerificationCode } from "./resend-client";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import multer from "multer";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { createRouteHandler } from "uploadthing/express";
import { uploadRouter } from "./uploadthing";

// Configure multer for CMS media uploads (disk storage for images)
const multerUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = path.join(process.cwd(), 'attached_assets', 'temp');
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for images
  },
  fileFilter: (_req, file, cb) => {
    // Only accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Samo slike su dozvoljene'));
    }
  },
});

// HTML escape funkcija za bezbednost
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

// Rate limiting za kontakt formu - čuva IP adrese i timestamps
const contactRateLimits = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 sat u milisekundama
const MAX_REQUESTS_PER_HOUR = 3;

// Funkcija za dobijanje prave IP adrese klijenta (koristi Express req.ip koji je siguran)
function getClientIp(req: any): string | null {
  // req.ip je automatski popunjen od Express-a kada je trust proxy omogućen
  // Express ispravno parsira X-Forwarded-For i vraća pravu IP adresu
  const ip = req.ip;
  
  // Ignoriši localhost adrese
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
    return null;
  }
  
  return ip;
}

function checkContactRateLimit(ip: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const timestamps = contactRateLimits.get(ip) || [];
  
  // Ukloni stare timestamps (starije od 1 sata)
  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  
  if (recentTimestamps.length >= MAX_REQUESTS_PER_HOUR) {
    // Izračunaj kada će najstariji timestamp isteći
    const oldestTimestamp = Math.min(...recentTimestamps);
    const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestTimestamp)) / 60000); // u minutima
    return { allowed: false, remainingTime };
  }
  
  // Dodaj novi timestamp
  recentTimestamps.push(now);
  contactRateLimits.set(ip, recentTimestamps);
  
  return { allowed: true };
}

// Middleware to check if user is admin
function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.sendStatus(401);
  }
  
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: "Samo administratori mogu pristupiti ovoj funkcionalnosti" });
  }
  
  next();
}

// Middleware to check if email is verified
function requireVerifiedEmail(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.sendStatus(401);
  }
  
  if (!req.user!.emailVerified) {
    return res.status(403).json({ 
      error: "Morate verifikovati email adresu da biste pristupili ovoj funkcionalnosti",
      requiresVerification: true 
    });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes: /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Development debug endpoint for verification codes (only in development mode)
  app.get("/api/debug/verification-code", (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ error: "Not found" });
    }

    const lastCode = getLastVerificationCode();
    
    if (!lastCode) {
      return res.json({ 
        message: "No verification code available yet. Register a new user to generate one." 
      });
    }

    return res.json({
      email: lastCode.email,
      code: lastCode.code,
      subject: lastCode.subject,
      timestamp: new Date(lastCode.timestamp).toISOString(),
      age: Math.round((Date.now() - lastCode.timestamp) / 1000) + ' seconds ago'
    });
  });

  // Setup UploadThing routes for file uploads
  // Use UPLOADTHING_SECRET (same as UPLOADTHING_TOKEN, just different name)
  app.use(
    "/api/uploadthing",
    createRouteHandler({
      router: uploadRouter,
      config: {
        token: process.env.UPLOADTHING_SECRET || process.env.UPLOADTHING_TOKEN,
      },
    })
  );

  // Image upload endpoint for CMS
  app.post("/api/upload-image", requireAdmin, multerUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Fajl nije priložen" });
      }

      // Move file from temp to permanent location
      const tempPath = req.file.path;
      const fileName = req.file.filename;
      const permanentDir = path.join(process.cwd(), 'attached_assets', 'cms_images');
      fs.mkdirSync(permanentDir, { recursive: true });
      const permanentPath = path.join(permanentDir, fileName);

      fs.renameSync(tempPath, permanentPath);

      // Return relative URL
      const url = `/attached_assets/cms_images/${fileName}`;
      res.json({ url });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ error: "Greška pri upload-u slike" });
    }
  });

  // Email verification endpoint
  app.post("/api/verify-email", async (req, res) => {
    try {
      const { userId, code } = req.body;
      
      if (!userId || !code) {
        return res.status(400).json({ error: "userId i kod su obavezni" });
      }
      
      const isValid = await storage.verifyEmail(userId, code);
      
      if (!isValid) {
        return res.status(400).json({ error: "Nevažeći ili istekao verifikacioni kod" });
      }
      
      // Now log the user in after successful verification
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }
      
      // SECURITY: Check if user is banned before logging them in
      if (user.banned) {
        return res.status(403).json({ error: "Vaš nalog je banovan" });
      }
      
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Greška pri prijavljivanju" });
        }
        
        // SECURITY: Don't expose password hash
        const { password, verificationCode, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
      });
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Resend verification code
  app.post("/api/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email je obavezan" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "Korisnik sa ovim emailom nije pronađen" });
      }
      
      if (user.emailVerified) {
        return res.status(400).json({ error: "Email je već verifikovan" });
      }
      
      // Generate new verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      await storage.setVerificationCode(user.id, verificationCode);
      
      // Send verification email
      try {
        await sendEmail({
          to: email,
          subject: 'Novi Verifikacioni Kod - Studio LeFlow',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #7c3aed;">Studio LeFlow</h2>
              <h3>Novi Verifikacioni Kod</h3>
              <p>Ovde je Vaš novi verifikacioni kod:</p>
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
                <h1 style="color: #7c3aed; font-size: 36px; letter-spacing: 8px; margin: 0;">${verificationCode}</h1>
              </div>
              <p>Ovaj kod ističe za 15 minuta.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #666; font-size: 12px;">Studio LeFlow - Profesionalna Muzička Produkcija</p>
            </div>
          `
        });
        return res.json({ success: true, message: "Novi verifikacioni kod je poslat" });
      } catch (emailError) {
        console.error("Greška pri slanju emaila:", emailError);
        return res.status(500).json({ error: "Greška pri slanju emaila" });
      }
    } catch (error) {
      return res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      // Proveri rate limit samo ako možemo da odredimo IP adresu
      const clientIp = getClientIp(req);
      if (clientIp) {
        const rateLimitCheck = checkContactRateLimit(clientIp);
        
        if (!rateLimitCheck.allowed) {
          return res.status(429).json({ 
            error: `Poslali ste previše upita. Molimo pokušajte ponovo za ${rateLimitCheck.remainingTime} minuta.` 
          });
        }
      }
      
      const validatedData = insertContactSubmissionSchema.parse(req.body);
      const submission = await storage.createContactSubmission(validatedData);
      
      // Šalji email notifikaciju
      try {
        await sendEmail({
          to: 'business@studioleflow.com',
          subject: `Novi upit - ${escapeHtml(validatedData.service)}`,
          html: `
            <h2>Novi upit sa Studio LeFlow sajta</h2>
            <p><strong>Usluga:</strong> ${escapeHtml(validatedData.service)}</p>
            <p><strong>Ime:</strong> ${escapeHtml(validatedData.name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(validatedData.email)}</p>
            <p><strong>Telefon:</strong> ${escapeHtml(validatedData.phone)}</p>
            ${validatedData.preferredDate ? `<p><strong>Željeni termin:</strong> ${escapeHtml(validatedData.preferredDate)}</p>` : ''}
            <p><strong>Poruka:</strong></p>
            <p>${escapeHtml(validatedData.message).replace(/\n/g, '<br>')}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Poslato automatski sa Studio LeFlow sajta</p>
          `
        });
      } catch (emailError) {
        console.error("Greška pri slanju email-a:", emailError);
        // Nastavi sa odgovorom čak i ako email ne uspe
      }
      
      res.json(submission);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Greška na serveru" });
      }
    }
  });

  app.get("/api/contact", async (_req, res) => {
    try {
      const submissions = await storage.getAllContactSubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // ==================== GIVEAWAY API ROUTES ====================
  
  // Accept terms of service
  app.post("/api/user/accept-terms", requireVerifiedEmail, async (req, res) => {
    
    try {
      await storage.acceptTerms(req.user!.id);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Update user profile (username, email)
  app.put("/api/user/update-profile", requireVerifiedEmail, async (req, res) => {
    try {
      const { username, email } = req.body;
      const userId = req.user!.id;

      // Validation
      if (username && username.trim().length < 3) {
        return res.status(400).json({ error: "Korisničko ime mora imati najmanje 3 karaktera" });
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Unesite validnu email adresu" });
      }

      // Check if username can be changed (once per month)
      if (username && username !== req.user!.username) {
        const user = await storage.getUser(userId);
        if (user?.usernameLastChanged) {
          const daysSinceLastChange = Math.floor(
            (Date.now() - new Date(user.usernameLastChanged).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLastChange < 30) {
            return res.status(400).json({ 
              error: `Možete promeniti korisničko ime tek za ${30 - daysSinceLastChange} dana` 
            });
          }
        }

        // Check if username is already taken
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Korisničko ime je već zauzeto" });
        }
      }

      // Check if email is already taken
      if (email && email !== req.user!.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Email adresa je već zauzeta" });
        }
      }

      // Update profile
      await storage.updateUserProfile(userId, { username, email });
      
      // Return updated user
      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: error.message || "Greška na serveru" });
    }
  });

  // Change password
  app.put("/api/user/change-password", requireVerifiedEmail, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Trenutna i nova lozinka su obavezne" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Nova lozinka mora imati najmanje 6 karaktera" });
      }

      // Verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }

      const isValidPassword = await comparePasswords(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: "Trenutna lozinka nije tačna" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update password
      await storage.updateUserPassword(userId, hashedPassword);
      
      res.json({ message: "Lozinka je uspešno promenjena" });
    } catch (error: any) {
      console.error("Change password error:", error);
      res.status(500).json({ error: error.message || "Greška na serveru" });
    }
  });

  // Get giveaway settings
  app.get("/api/giveaway/settings", async (_req, res) => {
    try {
      const settings = await storage.getGiveawaySettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Get all projects
  app.get("/api/giveaway/projects", async (_req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Upload a project - now using UploadThing for file hosting
  app.post("/api/giveaway/projects", requireVerifiedEmail, async (req, res) => {
    // SECURITY: Enforce terms acceptance on server side
    if (!req.user!.termsAccepted) {
      return res.status(403).json({ error: "Morate prihvatiti pravila pre učešća u giveaway-u" });
    }
    
    try {
      // Check if mp3Url was provided (uploaded via UploadThing)
      if (!req.body.mp3Url) {
        return res.status(400).json({ error: "MP3 URL je obavezan" });
      }
      
      // Check if user has already uploaded this month
      const currentMonth = new Date().toISOString().substring(0, 7); // "2025-01"
      const userProjects = await storage.getUserProjectsForMonth(req.user!.id, currentMonth);
      
      if (userProjects.length > 0) {
        return res.status(400).json({ error: "Već ste uploadovali projekat ovog meseca. Možete uploadovati samo 1 projekat mesečno." });
      }
      
      // Parse and validate project data from request body
      const { insertProjectSchema } = await import("@shared/schema");
      const validatedData = insertProjectSchema.parse({
        title: req.body.title,
        description: req.body.description || '',
        genre: req.body.genre,
        mp3Url: req.body.mp3Url, // Use the URL from UploadThing
      });
      
      const project = await storage.createProject({
        ...validatedData,
        userId: req.user!.id,
        currentMonth,
      });
      
      res.status(201).json(project);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        console.error("Project upload error:", error);
        res.status(500).json({ error: error.message || "Greška na serveru" });
      }
    }
  });

  // Vote on a project (toggle functionality - add or remove vote)
  app.post("/api/giveaway/vote", requireVerifiedEmail, async (req, res) => {
    // SECURITY: Enforce terms acceptance on server side
    if (!req.user!.termsAccepted) {
      return res.status(403).json({ error: "Morate prihvatiti pravila pre glasanja" });
    }
    
    try {
      const { projectId } = req.body;
      
      if (!projectId || typeof projectId !== "number") {
        return res.status(400).json({ error: "ID projekta je obavezan" });
      }
      
      // SECURITY: Get IP address
      const ipAddress = req.socket.remoteAddress || 'unknown';
      
      // Check if user already voted - if yes, remove vote (toggle off)
      const userAlreadyVoted = await storage.hasUserVoted(req.user!.id, projectId);
      
      if (userAlreadyVoted) {
        // Remove vote (toggle off)
        await storage.deleteVote(req.user!.id, projectId);
        return res.json({ action: 'removed' });
      } else {
        // Check if a DIFFERENT user from this IP has voted
        // This prevents multiple accounts from same IP, but allows same user to toggle
        const votes = await storage.getProjectVotes(projectId);
        const ipVoteByDifferentUser = votes.find(
          vote => vote.ipAddress === ipAddress && vote.userId !== req.user!.id
        );
        
        if (ipVoteByDifferentUser) {
          return res.status(400).json({ error: "Sa ove IP adrese je već glasano za ovaj projekat (drugi korisnik)" });
        }
        
        // Add vote (toggle on)
        await storage.createVote({
          userId: req.user!.id,
          projectId,
          ipAddress,
        });
        return res.json({ action: 'added' });
      }
    } catch (error: any) {
      console.error("Vote toggle error:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Get comments for a project
  app.get("/api/giveaway/projects/:id/comments", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Nevažeći ID projekta" });
      }
      
      const comments = await storage.getProjectComments(projectId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Add a comment to a project
  app.post("/api/giveaway/comments", requireVerifiedEmail, async (req, res) => {
    // SECURITY: Enforce terms acceptance on server side
    if (!req.user!.termsAccepted) {
      return res.status(403).json({ error: "Morate prihvatiti pravila pre komentarisanja" });
    }
    
    try {
      const { insertCommentSchema } = await import("@shared/schema");
      const validatedData = insertCommentSchema.parse(req.body);
      
      const comment = await storage.createComment({
        ...validatedData,
        userId: req.user!.id,
      });
      
      res.status(201).json(comment);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Greška na serveru" });
      }
    }
  });

  // ==================== ADMIN API ROUTES ====================
  
  // Get dashboard statistics
  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Get all users
  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Ban a user
  app.post("/api/admin/users/:id/ban", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Nevažeći ID korisnika" });
      }
      
      await storage.banUser(userId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Unban a user
  app.post("/api/admin/users/:id/unban", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Nevažeći ID korisnika" });
      }
      
      await storage.unbanUser(userId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Delete a user
  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Nevažeći ID korisnika" });
      }
      
      // Don't allow deleting yourself
      if (userId === req.user!.id) {
        return res.status(400).json({ error: "Ne možete obrisati sami sebe" });
      }
      
      await storage.deleteUser(userId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Toggle admin role
  app.post("/api/admin/users/:id/toggle-admin", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Nevažeći ID korisnika" });
      }
      
      // Don't allow removing your own admin role
      if (userId === req.user!.id) {
        return res.status(400).json({ error: "Ne možete ukloniti sebi admin privilegije" });
      }
      
      await storage.toggleAdminRole(userId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Get all projects (approved and pending) for admin
  app.get("/api/admin/all-projects", requireAdmin, async (_req, res) => {
    try {
      const projects = await storage.getAllProjectsForAdmin();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Get pending (unapproved) projects
  app.get("/api/admin/pending-projects", requireAdmin, async (_req, res) => {
    try {
      const projects = await storage.getPendingProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Approve a project
  app.post("/api/admin/projects/:id/approve", requireAdmin, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Nevažeći ID projekta" });
      }
      
      await storage.approveProject(projectId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Delete a project
  app.delete("/api/admin/projects/:id", requireAdmin, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Nevažeći ID projekta" });
      }
      
      await storage.deleteProject(projectId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Get all comments
  app.get("/api/admin/comments", requireAdmin, async (_req, res) => {
    try {
      const comments = await storage.getAllComments();
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Delete a comment
  app.delete("/api/admin/comments/:id", requireAdmin, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: "Nevažeći ID komentara" });
      }
      
      await storage.deleteComment(commentId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Toggle giveaway active status
  app.post("/api/admin/giveaway/toggle", requireAdmin, async (req, res) => {
    try {
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: "isActive mora biti boolean" });
      }
      
      await storage.setSetting('giveaway_active', isActive.toString());
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // ==================== CMS API ROUTES ====================

  // GET /api/cms/content?page=home - PUBLIC (for Home/Team pages to read content)
  app.get("/api/cms/content", async (req, res) => {
    try {
      const page = req.query.page as string | undefined;
      const content = await storage.listCmsContent(page);
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // POST /api/cms/content - batch upsert multiple content entries
  app.post("/api/cms/content", requireAdmin, async (req, res) => {
    try {
      const schema = z.array(insertCmsContentSchema);
      const validated = schema.parse(req.body);
      
      const results = [];
      for (const item of validated) {
        const result = await storage.upsertCmsContent(item);
        results.push(result);
      }
      res.json(results);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Greška na serveru" });
      }
    }
  });

  // PUT /api/cms/content/single - update single content item
  app.put("/api/cms/content/single", requireAdmin, async (req, res) => {
    try {
      const validated = insertCmsContentSchema.parse(req.body);
      const result = await storage.upsertCmsContent(validated);
      res.json(result);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Greška na serveru" });
      }
    }
  });

  // DELETE /api/cms/team-member/:memberIndex - delete team member
  app.delete("/api/cms/team-member/:memberIndex", requireAdmin, async (req, res) => {
    try {
      const memberIndex = parseInt(req.params.memberIndex);
      if (isNaN(memberIndex)) {
        return res.status(400).json({ error: "Nevažeći member index" });
      }

      // Delete all entries for this team member
      await storage.deleteCmsContentByPattern("team", "members", `member_${memberIndex}_`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ error: "Greška pri brisanju člana tima" });
    }
  });

  // GET /api/cms/media?page=home - PUBLIC (for frontend to read media paths)
  app.get("/api/cms/media", async (req, res) => {
    try {
      const page = req.query.page as string | undefined;
      const media = await storage.listCmsMedia(page);
      res.json(media);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // POST /api/cms/media - upload image and save to database
  app.post("/api/cms/media", requireAdmin, multerUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validacija metadata iz req.body
      const metadata = insertCmsMediaSchema.omit({ filePath: true }).parse({
        page: req.body.page,
        section: req.body.section,
        assetKey: req.body.assetKey,
      });

      // Create CMS directory if doesn't exist
      const cmsDir = path.join(process.cwd(), "attached_assets", "cms", metadata.page);
      await fs.promises.mkdir(cmsDir, { recursive: true });

      // Generate filename: page-section-assetKey-timestamp.ext
      const ext = path.extname(req.file.originalname);
      const filename = `${metadata.page}-${metadata.section}-${metadata.assetKey}-${Date.now()}${ext}`;
      const filePath = `attached_assets/cms/${metadata.page}/${filename}`;
      const fullPath = path.join(process.cwd(), filePath);

      // Move uploaded file to CMS directory
      await fs.promises.rename(req.file.path, fullPath);

      // Save to database
      const mediaEntry = await storage.upsertCmsMedia({
        ...metadata,
        filePath,
      });

      res.json(mediaEntry);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Greška na serveru" });
      }
    }
  });

  // DELETE /api/cms/media/:id
  app.delete("/api/cms/media/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Nevažeći ID" });
      }
      await storage.deleteCmsMedia(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // SEO routes - robots.txt
  app.get("/robots.txt", (req, res) => {
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'https';
    const siteUrl = `${protocol}://${host}`;
    
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
    res.type("text/plain");
    res.send(robotsTxt);
  });

  // SEO routes - sitemap.xml
  app.get("/sitemap.xml", (req, res) => {
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'https';
    const siteUrl = `${protocol}://${host}`;
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/kontakt</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/tim</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteUrl}/giveaway</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${siteUrl}/pravila</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${siteUrl}/usluge</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;
    res.type("application/xml");
    res.send(sitemap);
  });

  const httpServer = createServer(app);

  return httpServer;
}
