// Blueprint reference: blueprint:javascript_auth_all_persistance
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sendEmail } from "./resend-client";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    throw new Error("Invalid password format");
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('[AUTH] Login attempt for username/email:', username);
        
        // Try to find user by username first, then by email
        let user = await storage.getUserByUsername(username);
        
        if (!user) {
          // Try by email if username not found
          user = await storage.getUserByEmail(username);
        }
        
        if (!user) {
          console.log('[AUTH] User not found:', username);
          return done(null, false, { message: "Pogrešno korisničko ime ili lozinka" });
        }
        
        const passwordMatch = await comparePasswords(password, user.password);
        console.log('[AUTH] Password match:', passwordMatch);
        
        if (!passwordMatch) {
          console.log('[AUTH] Password mismatch for user:', username);
          return done(null, false, { message: "Pogrešno korisničko ime ili lozinka" });
        }
        
        // Check if user is banned
        if (user.banned) {
          console.log('[AUTH] User is banned:', username);
          return done(null, false, { message: "Vaš nalog je banovan" });
        }
        
        console.log('[AUTH] Login successful for user:', user.username);
        return done(null, user);
      } catch (error) {
        console.error('[AUTH] Login error:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate with Zod schema from shared/schema.ts
      const { insertUserSchema } = await import("@shared/schema");
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).send("Korisničko ime već postoji");
      }

      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).send("Email adresa već postoji");
      }

      const user = await storage.createUser({
        ...validatedData,
        password: await hashPassword(validatedData.password),
      });

      // Generate verification code and save it
      const verificationCode = generateVerificationCode();
      await storage.setVerificationCode(user.id, verificationCode);

      console.log(`[AUTH] Attempting to send verification email to: ${validatedData.email}`);
      console.log(`[AUTH] Verification code generated: ${verificationCode}`)

      try {
        const result = await sendEmail({
          to: validatedData.email,
          subject: 'Potvrdite Vašu Email Adresu - Studio LeFlow',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #7c3aed;">Studio LeFlow</h2>
              <h3>Dobrodošli u Studio LeFlow zajednicu!</h3>
              <p>Hvala što ste se registrovali. Da biste završili registraciju, unesite sledeći verifikacioni kod:</p>
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
                <h1 style="color: #7c3aed; font-size: 36px; letter-spacing: 8px; margin: 0;">${verificationCode}</h1>
              </div>
              <p>Ovaj kod ističe za 15 minuta.</p>
              <p>Ako niste kreirali nalog, ignorišite ovaj email.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #666; font-size: 12px;">Studio LeFlow - Profesionalna Muzička Produkcija</p>
            </div>
          `
        });
        console.log(`[AUTH] Verification email sent successfully to ${validatedData.email}. Message ID: ${result.messageId}`);
      } catch (emailError: any) {
        console.error("[AUTH] Failed to send verification email:", emailError);
        console.error("[AUTH] Email error details:", emailError.message);
        
        // Delete the user since we couldn't send the verification email
        await storage.deleteUser(user.id);
        
        return res.status(500).json({ 
          error: "Greška pri slanju verifikacionog email-a. Molimo proverite da li je email adresa ispravna i pokušajte ponovo." 
        });
      }

      // Don't log the user in yet - they need to verify email first
      // SECURITY: Don't expose password hash or verification code
      const { password, verificationCode: _, ...userWithoutSensitiveData } = user;
      res.status(201).json(userWithoutSensitiveData);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      }
      res.status(500).send(error.message);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // SECURITY: Don't expose password hash
    const { password, ...userWithoutPassword } = req.user!;
    res.status(200).json(userWithoutPassword);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // SECURITY: Don't expose password hash
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });
}
