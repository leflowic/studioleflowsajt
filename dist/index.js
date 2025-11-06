var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  cmsContent: () => cmsContent,
  cmsContentTypes: () => cmsContentTypes,
  cmsMedia: () => cmsMedia,
  cmsPages: () => cmsPages,
  cmsSections: () => cmsSections,
  comments: () => comments,
  commentsRelations: () => commentsRelations,
  contactSubmissions: () => contactSubmissions,
  insertCmsContentSchema: () => insertCmsContentSchema,
  insertCmsMediaSchema: () => insertCmsMediaSchema,
  insertCommentSchema: () => insertCommentSchema,
  insertContactSubmissionSchema: () => insertContactSubmissionSchema,
  insertProjectSchema: () => insertProjectSchema,
  insertUserSchema: () => insertUserSchema,
  projects: () => projects,
  projectsRelations: () => projectsRelations,
  session: () => session,
  settings: () => settings,
  users: () => users,
  usersRelations: () => usersRelations,
  votes: () => votes,
  votesRelations: () => votesRelations
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, serial, integer, boolean, unique, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var session, contactSubmissions, insertContactSubmissionSchema, users, projects, votes, comments, settings, cmsPages, cmsSections, cmsContentTypes, cmsContent, cmsMedia, usersRelations, projectsRelations, votesRelations, commentsRelations, insertUserSchema, insertProjectSchema, insertCommentSchema, insertCmsContentSchema, insertCmsMediaSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    session = pgTable("session", {
      sid: varchar("sid").primaryKey(),
      sess: json("sess").notNull(),
      expire: timestamp("expire").notNull()
    });
    contactSubmissions = pgTable("contact_submissions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      email: text("email").notNull(),
      phone: text("phone").notNull(),
      service: text("service").notNull(),
      preferredDate: text("preferred_date"),
      message: text("message").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
      id: true,
      createdAt: true
    }).extend({
      email: z.string().email("Unesite validnu email adresu"),
      phone: z.string().min(6, "Unesite validan broj telefona"),
      name: z.string().min(2, "Ime mora imati najmanje 2 karaktera"),
      message: z.string().min(10, "Poruka mora imati najmanje 10 karaktera"),
      service: z.string().min(1, "Izaberite uslugu")
    });
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      email: text("email").notNull().unique(),
      password: text("password").notNull(),
      username: text("username").notNull().unique(),
      role: text("role").notNull().default("user"),
      // "user" or "admin"
      banned: boolean("banned").notNull().default(false),
      termsAccepted: boolean("terms_accepted").notNull().default(false),
      emailVerified: boolean("email_verified").notNull().default(false),
      verificationCode: text("verification_code"),
      usernameLastChanged: timestamp("username_last_changed"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    projects = pgTable("projects", {
      id: serial("id").primaryKey(),
      title: text("title").notNull(),
      description: text("description").notNull(),
      genre: text("genre").notNull(),
      mp3Url: text("mp3_url").notNull(),
      userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      uploadDate: timestamp("upload_date").defaultNow().notNull(),
      votesCount: integer("votes_count").notNull().default(0),
      currentMonth: text("current_month").notNull(),
      // e.g., "2025-01" to track monthly limit
      approved: boolean("approved").notNull().default(false)
      // Admin must approve before project is visible
    });
    votes = pgTable("votes", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
      ipAddress: text("ip_address").notNull(),
      votedAt: timestamp("voted_at").defaultNow().notNull()
    }, (table) => ({
      // Prevent duplicate votes: user can only vote once per project
      uniqueUserProject: unique().on(table.userId, table.projectId),
      // Also prevent same IP from voting multiple times on same project
      uniqueIpProject: unique().on(table.ipAddress, table.projectId)
    }));
    comments = pgTable("comments", {
      id: serial("id").primaryKey(),
      projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
      userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      text: text("text").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    settings = pgTable("settings", {
      id: serial("id").primaryKey(),
      key: text("key").notNull().unique(),
      value: text("value").notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    cmsPages = ["home", "team"];
    cmsSections = ["hero", "services", "equipment", "cta", "members"];
    cmsContentTypes = ["text", "image", "html"];
    cmsContent = pgTable("cms_content", {
      id: serial("id").primaryKey(),
      page: text("page").notNull(),
      // "home", "team"
      section: text("section").notNull(),
      // "hero", "services", "equipment", "cta", "members"
      contentKey: text("content_key").notNull(),
      // unique identifier e.g. "hero_title", "service_1_title"
      contentValue: text("content_value").notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    }, (table) => ({
      // Unique constraint: one value per page+section+key combination
      uniquePageSectionKey: unique().on(table.page, table.section, table.contentKey)
    }));
    cmsMedia = pgTable("cms_media", {
      id: serial("id").primaryKey(),
      page: text("page").notNull(),
      // "home", "team"
      section: text("section").notNull(),
      // "hero", "services", "equipment", "members"
      assetKey: text("asset_key").notNull(),
      // e.g., "hero_background", "team_member_1"
      filePath: text("file_path").notNull(),
      // relative path: "attached_assets/cms/home/hero_bg.png"
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    }, (table) => ({
      // Unique constraint: one image per page+section+assetKey combination
      uniquePageSectionAsset: unique().on(table.page, table.section, table.assetKey)
    }));
    usersRelations = relations(users, ({ many }) => ({
      projects: many(projects),
      votes: many(votes),
      comments: many(comments)
    }));
    projectsRelations = relations(projects, ({ one, many }) => ({
      user: one(users, {
        fields: [projects.userId],
        references: [users.id]
      }),
      votes: many(votes),
      comments: many(comments)
    }));
    votesRelations = relations(votes, ({ one }) => ({
      user: one(users, {
        fields: [votes.userId],
        references: [users.id]
      }),
      project: one(projects, {
        fields: [votes.projectId],
        references: [projects.id]
      })
    }));
    commentsRelations = relations(comments, ({ one }) => ({
      project: one(projects, {
        fields: [comments.projectId],
        references: [projects.id]
      }),
      user: one(users, {
        fields: [comments.userId],
        references: [users.id]
      })
    }));
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      createdAt: true,
      termsAccepted: true,
      role: true,
      banned: true
    }).extend({
      email: z.string().email("Unesite validnu email adresu"),
      password: z.string().min(8, "Lozinka mora imati najmanje 8 karaktera"),
      username: z.string().min(3, "Korisni\u010Dko ime mora imati najmanje 3 karaktera")
    });
    insertProjectSchema = createInsertSchema(projects).omit({
      id: true,
      uploadDate: true,
      votesCount: true,
      userId: true,
      currentMonth: true
    }).extend({
      title: z.string().min(3, "Naslov mora imati najmanje 3 karaktera"),
      description: z.string(),
      genre: z.string().min(1, "Izaberite \u017Eanr"),
      mp3Url: z.string().url("Neva\u017Ee\u0107i URL")
    });
    insertCommentSchema = createInsertSchema(comments).omit({
      id: true,
      createdAt: true,
      userId: true
    }).extend({
      text: z.string().min(1, "Komentar ne mo\u017Ee biti prazan")
    });
    insertCmsContentSchema = createInsertSchema(cmsContent).omit({
      id: true,
      updatedAt: true
    }).extend({
      page: z.enum(cmsPages),
      section: z.enum(cmsSections),
      contentKey: z.string().min(1, "Content key ne mo\u017Ee biti prazan"),
      contentValue: z.string()
    });
    insertCmsMediaSchema = createInsertSchema(cmsMedia).omit({
      id: true,
      updatedAt: true
    }).extend({
      page: z.enum(cmsPages),
      section: z.enum(cmsSections),
      assetKey: z.string().min(1, "Asset key ne mo\u017Ee biti prazan"),
      filePath: z.string().min(1, "File path ne mo\u017Ee biti prazan")
    });
  }
});

// server/index.ts
import express2 from "express";
import compression from "compression";
import path4 from "path";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
init_schema();

// server/db.ts
init_schema();
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var connectionString = process.env.DATABASE_URL;
var pool = new Pool({
  connectionString,
  // Enable SSL for external databases, disable for Replit internal database
  ssl: connectionString.includes("helium") || connectionString.includes("db.internal") ? false : { rejectUnauthorized: false }
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, and, desc, sql as sql2 } from "drizzle-orm";
import session2 from "express-session";
import connectPg from "connect-pg-simple";
var PostgresSessionStore = connectPg(session2);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }
  // Contact Submissions
  async createContactSubmission(insertSubmission) {
    const [submission] = await db.insert(contactSubmissions).values(insertSubmission).returning();
    return submission;
  }
  async getContactSubmission(id) {
    const [submission] = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id));
    return submission || void 0;
  }
  async getAllContactSubmissions() {
    return await db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt));
  }
  // Users
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUserRole(id, role) {
    await db.update(users).set({ role }).where(eq(users.id, id));
  }
  async banUser(id) {
    await db.update(users).set({ banned: true }).where(eq(users.id, id));
  }
  async unbanUser(id) {
    await db.update(users).set({ banned: false }).where(eq(users.id, id));
  }
  async deleteUser(id) {
    const userProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.userId, id));
    const projectIds = userProjects.map((p) => p.id);
    if (projectIds.length > 0) {
      await db.delete(votes).where(sql2`${votes.projectId} IN (${sql2.join(projectIds.map((id2) => sql2`${id2}`), sql2`, `)})`);
      await db.delete(comments).where(sql2`${comments.projectId} IN (${sql2.join(projectIds.map((id2) => sql2`${id2}`), sql2`, `)})`);
    }
    await db.delete(votes).where(eq(votes.userId, id));
    await db.delete(comments).where(eq(comments.userId, id));
    await db.delete(projects).where(eq(projects.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }
  async acceptTerms(id) {
    await db.update(users).set({ termsAccepted: true }).where(eq(users.id, id));
  }
  async getAllUsers() {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }
  async setVerificationCode(userId, code) {
    await db.update(users).set({ verificationCode: code }).where(eq(users.id, userId));
  }
  async verifyEmail(userId, code) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.verificationCode !== code) {
      return false;
    }
    await db.update(users).set({ emailVerified: true, verificationCode: null }).where(eq(users.id, userId));
    return true;
  }
  async updateUserProfile(userId, data) {
    const updateData = {};
    if (data.username) {
      updateData.username = data.username;
      updateData.usernameLastChanged = /* @__PURE__ */ new Date();
    }
    if (data.email) {
      updateData.email = data.email;
    }
    if (Object.keys(updateData).length > 0) {
      await db.update(users).set(updateData).where(eq(users.id, userId));
    }
  }
  async updateUserPassword(userId, hashedPassword) {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
  }
  // Projects
  async createProject(data) {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }
  async getProject(id) {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || void 0;
  }
  async getAllProjects() {
    const result = await db.select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      genre: projects.genre,
      mp3Url: projects.mp3Url,
      userId: projects.userId,
      uploadDate: projects.uploadDate,
      votesCount: projects.votesCount,
      currentMonth: projects.currentMonth,
      approved: projects.approved,
      username: users.username
    }).from(projects).leftJoin(users, eq(projects.userId, users.id)).where(eq(projects.approved, true)).orderBy(desc(projects.uploadDate));
    return result;
  }
  async getAllProjectsForAdmin() {
    const result = await db.select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      genre: projects.genre,
      mp3Url: projects.mp3Url,
      userId: projects.userId,
      uploadDate: projects.uploadDate,
      votesCount: projects.votesCount,
      currentMonth: projects.currentMonth,
      approved: projects.approved,
      username: users.username
    }).from(projects).leftJoin(users, eq(projects.userId, users.id)).orderBy(desc(projects.uploadDate));
    return result;
  }
  async getPendingProjects() {
    const result = await db.select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      genre: projects.genre,
      mp3Url: projects.mp3Url,
      userId: projects.userId,
      uploadDate: projects.uploadDate,
      votesCount: projects.votesCount,
      currentMonth: projects.currentMonth,
      approved: projects.approved,
      username: users.username
    }).from(projects).leftJoin(users, eq(projects.userId, users.id)).where(eq(projects.approved, false)).orderBy(desc(projects.uploadDate));
    return result;
  }
  async approveProject(id) {
    await db.update(projects).set({ approved: true }).where(eq(projects.id, id));
  }
  async getUserProjectsForMonth(userId, month) {
    return await db.select().from(projects).where(
      and(eq(projects.userId, userId), eq(projects.currentMonth, month))
    );
  }
  async deleteProject(id) {
    await db.delete(projects).where(eq(projects.id, id));
  }
  async incrementVoteCount(projectId) {
    await db.update(projects).set({
      votesCount: sql2`${projects.votesCount} + 1`
    }).where(eq(projects.id, projectId));
  }
  // Votes
  async createVote(data) {
    const [vote] = await db.insert(votes).values(data).returning();
    await this.incrementVoteCount(data.projectId);
    return vote;
  }
  async hasUserVoted(userId, projectId) {
    const existingVotes = await db.select().from(votes).where(
      and(eq(votes.userId, userId), eq(votes.projectId, projectId))
    );
    return existingVotes.length > 0;
  }
  async hasIpVoted(ipAddress, projectId) {
    const existingVotes = await db.select().from(votes).where(
      and(eq(votes.ipAddress, ipAddress), eq(votes.projectId, projectId))
    );
    return existingVotes.length > 0;
  }
  async getProjectVotes(projectId) {
    return await db.select().from(votes).where(eq(votes.projectId, projectId));
  }
  async deleteVote(userId, projectId) {
    await db.delete(votes).where(
      and(eq(votes.userId, userId), eq(votes.projectId, projectId))
    );
    await this.decrementVoteCount(projectId);
  }
  async decrementVoteCount(projectId) {
    await db.update(projects).set({
      votesCount: sql2`${projects.votesCount} - 1`
    }).where(eq(projects.id, projectId));
  }
  // Comments
  async createComment(data) {
    const [comment] = await db.insert(comments).values(data).returning();
    return comment;
  }
  async getProjectComments(projectId) {
    const result = await db.select({
      id: comments.id,
      projectId: comments.projectId,
      userId: comments.userId,
      text: comments.text,
      createdAt: comments.createdAt,
      username: users.username
    }).from(comments).leftJoin(users, eq(comments.userId, users.id)).where(eq(comments.projectId, projectId)).orderBy(desc(comments.createdAt));
    return result;
  }
  async deleteComment(id) {
    await db.delete(comments).where(eq(comments.id, id));
  }
  async getAllComments() {
    const result = await db.select({
      id: comments.id,
      projectId: comments.projectId,
      projectTitle: projects.title,
      userId: comments.userId,
      username: users.username,
      text: comments.text,
      createdAt: comments.createdAt
    }).from(comments).leftJoin(users, eq(comments.userId, users.id)).leftJoin(projects, eq(comments.projectId, projects.id)).orderBy(desc(comments.createdAt));
    return result;
  }
  // Settings
  async getSetting(key) {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || void 0;
  }
  async setSetting(key, value) {
    const existing = await this.getSetting(key);
    if (existing) {
      await db.update(settings).set({ value, updatedAt: /* @__PURE__ */ new Date() }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }
  // CMS Content
  async getCmsContent(page, section, contentKey) {
    const [content] = await db.select().from(cmsContent).where(
      and(
        eq(cmsContent.page, page),
        eq(cmsContent.section, section),
        eq(cmsContent.contentKey, contentKey)
      )
    );
    return content || void 0;
  }
  async setCmsContent(page, section, contentType, contentKey, contentValue) {
    const existing = await this.getCmsContent(page, section, contentKey);
    if (existing) {
      await db.update(cmsContent).set({ contentValue, updatedAt: /* @__PURE__ */ new Date() }).where(
        and(
          eq(cmsContent.page, page),
          eq(cmsContent.section, section),
          eq(cmsContent.contentKey, contentKey)
        )
      );
    } else {
      await db.insert(cmsContent).values({ page, section, contentKey, contentValue });
    }
  }
  async getAllCmsContent() {
    return await db.select().from(cmsContent);
  }
  async listCmsContent(page) {
    if (page) {
      return await db.select().from(cmsContent).where(eq(cmsContent.page, page)).orderBy(cmsContent.page, cmsContent.section, cmsContent.contentKey);
    }
    return await db.select().from(cmsContent).orderBy(cmsContent.page, cmsContent.section, cmsContent.contentKey);
  }
  async upsertCmsContent(data) {
    const [result] = await db.insert(cmsContent).values(data).onConflictDoUpdate({
      target: [cmsContent.page, cmsContent.section, cmsContent.contentKey],
      set: {
        contentValue: sql2`EXCLUDED.content_value`,
        updatedAt: sql2`NOW()`
      }
    }).returning();
    return result;
  }
  async deleteCmsContentByPattern(page, section, keyPattern) {
    await db.delete(cmsContent).where(
      and(
        eq(cmsContent.page, page),
        eq(cmsContent.section, section),
        sql2`${cmsContent.contentKey} LIKE ${keyPattern + "%"}`
      )
    );
  }
  async listCmsMedia(page) {
    if (page) {
      return await db.select().from(cmsMedia).where(eq(cmsMedia.page, page)).orderBy(cmsMedia.page, cmsMedia.section, cmsMedia.assetKey);
    }
    return await db.select().from(cmsMedia).orderBy(cmsMedia.page, cmsMedia.section, cmsMedia.assetKey);
  }
  async upsertCmsMedia(data) {
    const [result] = await db.insert(cmsMedia).values(data).onConflictDoUpdate({
      target: [cmsMedia.page, cmsMedia.section, cmsMedia.assetKey],
      set: {
        filePath: sql2`EXCLUDED.file_path`,
        updatedAt: sql2`NOW()`
      }
    }).returning();
    return result;
  }
  async deleteCmsMedia(id) {
    await db.delete(cmsMedia).where(eq(cmsMedia.id, id));
  }
  async getGiveawaySettings() {
    const setting = await this.getSetting("giveaway_active");
    return { isActive: setting?.value === "true" };
  }
  // Admin methods
  async getAdminStats() {
    const [userCount] = await db.select({ count: sql2`count(*)` }).from(users);
    const [projectCount] = await db.select({ count: sql2`count(*)` }).from(projects);
    const [voteCount] = await db.select({ count: sql2`count(*)` }).from(votes);
    const [commentCount] = await db.select({ count: sql2`count(*)` }).from(comments);
    return {
      totalUsers: Number(userCount?.count ?? 0),
      totalProjects: Number(projectCount?.count ?? 0),
      totalVotes: Number(voteCount?.count ?? 0),
      totalComments: Number(commentCount?.count ?? 0)
    };
  }
  async toggleAdminRole(userId) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    const newRole = user.role === "admin" ? "user" : "admin";
    await db.update(users).set({ role: newRole }).where(eq(users.id, userId));
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
init_schema();

// server/resend-client.ts
import { Resend } from "resend";
var cachedCredentials = null;
var lastVerificationCode = null;
function getLastVerificationCode() {
  return lastVerificationCode;
}
async function getCredentials() {
  if (cachedCredentials) {
    console.log("[RESEND] Using cached credentials");
    return cachedCredentials;
  }
  const directApiKey = process.env.RESEND_API_KEY;
  if (directApiKey) {
    console.log("[RESEND] Using RESEND_API_KEY from environment variables");
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!fromEmail) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[RESEND] RESEND_FROM_EMAIL not set, using test domain (development only)");
        cachedCredentials = {
          apiKey: directApiKey,
          fromEmail: "onboarding@resend.dev"
        };
        return cachedCredentials;
      }
      console.error("[RESEND] RESEND_FROM_EMAIL environment variable is required in production");
      throw new Error("RESEND_FROM_EMAIL is not configured. Add it to secrets with your verified domain email (e.g., no-reply@mail.studioleflow.com)");
    }
    cachedCredentials = {
      apiKey: directApiKey,
      fromEmail
    };
    return cachedCredentials;
  }
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY : process.env.WEB_REPL_RENEWAL ? "depl " + process.env.WEB_REPL_RENEWAL : null;
  if (!xReplitToken) {
    console.error("[RESEND] X_REPLIT_TOKEN not found and no direct API key");
    throw new Error("Resend API key not configured");
  }
  console.log("[RESEND] Fetching connection settings from:", hostname);
  const response = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        "Accept": "application/json",
        "X_REPLIT_TOKEN": xReplitToken
      }
    }
  );
  const data = await response.json();
  const connectionSettings = data.items?.[0];
  if (!connectionSettings || !connectionSettings.settings?.api_key) {
    console.error("[RESEND] Connection settings invalid:", connectionSettings);
    throw new Error("Resend not connected");
  }
  if (!connectionSettings.settings.from_email) {
    console.error("[RESEND] Missing from_email in connection settings");
    throw new Error("Resend from_email not configured");
  }
  console.log("[RESEND] Successfully retrieved API key from connector");
  cachedCredentials = {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email
  };
  return cachedCredentials;
}
async function getResendClient() {
  try {
    const credentials = await getCredentials();
    console.log("[RESEND] Creating Resend client with fromEmail:", credentials.fromEmail);
    return {
      client: new Resend(credentials.apiKey),
      fromEmail: credentials.fromEmail
    };
  } catch (error) {
    console.error("[RESEND] Error getting Resend client:", error);
    throw error;
  }
}
function extractVerificationCode(html) {
  const codeMatch = html.match(/\b(\d{6})\b/);
  return codeMatch?.[1] ?? null;
}
async function sendEmail({
  to,
  subject,
  html
}) {
  const isDevelopment = process.env.NODE_ENV === "development";
  console.log("[RESEND] Sending email to:", to);
  console.log("[RESEND] Subject:", subject);
  const { client, fromEmail } = await getResendClient();
  console.log("[RESEND] From email:", fromEmail);
  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html
    });
    if (error) {
      const isTestModeError = error.message?.includes("only send testing emails") || error.message?.includes("verify a domain");
      if (isDevelopment && isTestModeError) {
        console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
        console.log("\u{1F527} [RESEND] TEST MODE DETECTED - Using Development Fallback");
        console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
        console.log("\u{1F4E7} Recipient:", to);
        console.log("\u{1F4E8} Subject:", subject);
        const code = extractVerificationCode(html);
        if (code) {
          console.log("\u{1F511} VERIFICATION CODE:", code);
          lastVerificationCode = {
            email: to,
            code,
            subject,
            timestamp: Date.now()
          };
          console.log("\u{1F4A1} Use GET /api/debug/verification-code to retrieve this code");
        } else {
          console.log("\u{1F4C4} Email content (first 200 chars):", html.substring(0, 200));
        }
        console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
        console.log("\u2139\uFE0F  To enable real emails, verify your domain at resend.com/domains");
        console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
        return {
          success: true,
          messageId: "dev-mode-" + Date.now(),
          data: { id: "dev-mode-" + Date.now() }
        };
      }
      console.error("[RESEND] Failed to send email:", error);
      throw new Error(error.message);
    }
    console.log("[RESEND] Email sent successfully. ID:", data?.id);
    return {
      success: true,
      messageId: data?.id,
      data
    };
  } catch (error) {
    console.error("[RESEND] Unexpected error sending email:", error);
    throw error;
  }
}

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session3 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    throw new Error("Invalid password format");
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function generateVerificationCode() {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore
  };
  app2.set("trust proxy", 1);
  app2.use(session3(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("[AUTH] Login attempt for username/email:", username);
        let user = await storage.getUserByUsername(username);
        if (!user) {
          user = await storage.getUserByEmail(username);
        }
        if (!user) {
          console.log("[AUTH] User not found:", username);
          return done(null, false, { message: "Pogre\u0161no korisni\u010Dko ime ili lozinka" });
        }
        const passwordMatch = await comparePasswords(password, user.password);
        console.log("[AUTH] Password match:", passwordMatch);
        if (!passwordMatch) {
          console.log("[AUTH] Password mismatch for user:", username);
          return done(null, false, { message: "Pogre\u0161no korisni\u010Dko ime ili lozinka" });
        }
        if (user.banned) {
          console.log("[AUTH] User is banned:", username);
          return done(null, false, { message: "Va\u0161 nalog je banovan" });
        }
        console.log("[AUTH] Login successful for user:", user.username);
        return done(null, user);
      } catch (error) {
        console.error("[AUTH] Login error:", error);
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const { insertUserSchema: insertUserSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertUserSchema2.parse(req.body);
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).send("Korisni\u010Dko ime ve\u0107 postoji");
      }
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).send("Email adresa ve\u0107 postoji");
      }
      const user = await storage.createUser({
        ...validatedData,
        password: await hashPassword(validatedData.password)
      });
      const verificationCode = generateVerificationCode();
      await storage.setVerificationCode(user.id, verificationCode);
      console.log(`[AUTH] Attempting to send verification email to: ${validatedData.email}`);
      console.log(`[AUTH] Verification code generated: ${verificationCode}`);
      try {
        const result = await sendEmail({
          to: validatedData.email,
          subject: "Potvrdite Va\u0161u Email Adresu - Studio LeFlow",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #7c3aed;">Studio LeFlow</h2>
              <h3>Dobrodo\u0161li u Studio LeFlow zajednicu!</h3>
              <p>Hvala \u0161to ste se registrovali. Da biste zavr\u0161ili registraciju, unesite slede\u0107i verifikacioni kod:</p>
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
                <h1 style="color: #7c3aed; font-size: 36px; letter-spacing: 8px; margin: 0;">${verificationCode}</h1>
              </div>
              <p>Ovaj kod isti\u010De za 15 minuta.</p>
              <p>Ako niste kreirali nalog, ignori\u0161ite ovaj email.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #666; font-size: 12px;">Studio LeFlow - Profesionalna Muzi\u010Dka Produkcija</p>
            </div>
          `
        });
        console.log(`[AUTH] Verification email sent successfully to ${validatedData.email}. Message ID: ${result.messageId}`);
      } catch (emailError) {
        console.error("[AUTH] Failed to send verification email:", emailError);
        console.error("[AUTH] Email error details:", emailError.message);
        await storage.deleteUser(user.id);
        return res.status(500).json({
          error: "Gre\u0161ka pri slanju verifikacionog email-a. Molimo proverite da li je email adresa ispravna i poku\u0161ajte ponovo."
        });
      }
      const { password, verificationCode: _, ...userWithoutSensitiveData } = user;
      res.status(201).json(userWithoutSensitiveData);
    } catch (error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      }
      res.status(500).send(error.message);
    }
  });
  app2.post("/api/login", passport.authenticate("local"), (req, res) => {
    const { password, ...userWithoutPassword } = req.user;
    res.status(200).json(userWithoutPassword);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}

// server/routes.ts
import multer from "multer";
import fs from "fs";
import path from "path";
import { z as z2 } from "zod";
import { createRouteHandler } from "uploadthing/express";

// server/uploadthing.ts
import { createUploadthing } from "uploadthing/express";
var f = createUploadthing();
var auth = (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    throw new Error("Neautorizovan pristup");
  }
  const user = req.user;
  if (!user.emailVerified) {
    throw new Error("Morate verifikovati email adresu");
  }
  return { userId: user.id, username: user.username };
};
var uploadRouter = {
  // Audio file uploader for giveaway submissions - Only MP3 files allowed
  audioUploader: f({
    "audio/mpeg": {
      maxFileSize: "16MB",
      maxFileCount: 1
    }
  }).middleware(async ({ req, res }) => {
    const userMetadata = auth(req, res);
    return userMetadata;
  }).onUploadComplete(async ({ metadata, file }) => {
    console.log("MP3 upload complete!");
    console.log("User ID:", metadata.userId);
    console.log("File URL:", file.url);
    console.log("File name:", file.name);
    console.log("File type:", file.type);
    if (file.type !== "audio/mpeg" && !file.name.toLowerCase().endsWith(".mp3")) {
      throw new Error("Dozvoljeni su samo MP3 fajlovi");
    }
    return {
      uploadedBy: metadata.userId,
      fileUrl: file.url,
      fileName: file.name
    };
  })
};

// server/routes.ts
var multerUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = path.join(process.cwd(), "attached_assets", "temp");
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB max for images
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Samo slike su dozvoljene"));
    }
  }
});
function escapeHtml(text2) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return text2.replace(/[&<>"']/g, (m) => map[m] || m);
}
var contactRateLimits = /* @__PURE__ */ new Map();
var RATE_LIMIT_WINDOW = 60 * 60 * 1e3;
var MAX_REQUESTS_PER_HOUR = 3;
function getClientIp(req) {
  const ip = req.ip;
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1") {
    return null;
  }
  return ip;
}
function checkContactRateLimit(ip) {
  const now = Date.now();
  const timestamps = contactRateLimits.get(ip) || [];
  const recentTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW);
  if (recentTimestamps.length >= MAX_REQUESTS_PER_HOUR) {
    const oldestTimestamp = Math.min(...recentTimestamps);
    const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestTimestamp)) / 6e4);
    return { allowed: false, remainingTime };
  }
  recentTimestamps.push(now);
  contactRateLimits.set(ip, recentTimestamps);
  return { allowed: true };
}
function requireAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.sendStatus(401);
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Samo administratori mogu pristupiti ovoj funkcionalnosti" });
  }
  next();
}
function requireVerifiedEmail(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.sendStatus(401);
  }
  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: "Morate verifikovati email adresu da biste pristupili ovoj funkcionalnosti",
      requiresVerification: true
    });
  }
  next();
}
async function registerRoutes(app2) {
  setupAuth(app2);
  app2.get("/api/debug/verification-code", (req, res) => {
    if (process.env.NODE_ENV !== "development") {
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
      age: Math.round((Date.now() - lastCode.timestamp) / 1e3) + " seconds ago"
    });
  });
  app2.use(
    "/api/uploadthing",
    createRouteHandler({
      router: uploadRouter,
      config: {
        token: process.env.UPLOADTHING_SECRET || process.env.UPLOADTHING_TOKEN
      }
    })
  );
  app2.post("/api/upload-image", requireAdmin, multerUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Fajl nije prilo\u017Een" });
      }
      const tempPath = req.file.path;
      const fileName = req.file.filename;
      const permanentDir = path.join(process.cwd(), "attached_assets", "cms_images");
      fs.mkdirSync(permanentDir, { recursive: true });
      const permanentPath = path.join(permanentDir, fileName);
      fs.renameSync(tempPath, permanentPath);
      const url = `/attached_assets/cms_images/${fileName}`;
      res.json({ url });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ error: "Gre\u0161ka pri upload-u slike" });
    }
  });
  app2.post("/api/verify-email", async (req, res) => {
    try {
      const { userId, code } = req.body;
      if (!userId || !code) {
        return res.status(400).json({ error: "userId i kod su obavezni" });
      }
      const isValid = await storage.verifyEmail(userId, code);
      if (!isValid) {
        return res.status(400).json({ error: "Neva\u017Ee\u0107i ili istekao verifikacioni kod" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Korisnik nije prona\u0111en" });
      }
      if (user.banned) {
        return res.status(403).json({ error: "Va\u0161 nalog je banovan" });
      }
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Gre\u0161ka pri prijavljivanju" });
        }
        const { password, verificationCode, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
      });
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.post("/api/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email je obavezan" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "Korisnik sa ovim emailom nije prona\u0111en" });
      }
      if (user.emailVerified) {
        return res.status(400).json({ error: "Email je ve\u0107 verifikovan" });
      }
      const verificationCode = Math.floor(1e5 + Math.random() * 9e5).toString();
      await storage.setVerificationCode(user.id, verificationCode);
      try {
        await sendEmail({
          to: email,
          subject: "Novi Verifikacioni Kod - Studio LeFlow",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #7c3aed;">Studio LeFlow</h2>
              <h3>Novi Verifikacioni Kod</h3>
              <p>Ovde je Va\u0161 novi verifikacioni kod:</p>
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
                <h1 style="color: #7c3aed; font-size: 36px; letter-spacing: 8px; margin: 0;">${verificationCode}</h1>
              </div>
              <p>Ovaj kod isti\u010De za 15 minuta.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #666; font-size: 12px;">Studio LeFlow - Profesionalna Muzi\u010Dka Produkcija</p>
            </div>
          `
        });
        return res.json({ success: true, message: "Novi verifikacioni kod je poslat" });
      } catch (emailError) {
        console.error("Gre\u0161ka pri slanju emaila:", emailError);
        return res.status(500).json({ error: "Gre\u0161ka pri slanju emaila" });
      }
    } catch (error) {
      return res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.post("/api/contact", async (req, res) => {
    try {
      const clientIp = getClientIp(req);
      if (clientIp) {
        const rateLimitCheck = checkContactRateLimit(clientIp);
        if (!rateLimitCheck.allowed) {
          return res.status(429).json({
            error: `Poslali ste previ\u0161e upita. Molimo poku\u0161ajte ponovo za ${rateLimitCheck.remainingTime} minuta.`
          });
        }
      }
      const validatedData = insertContactSubmissionSchema.parse(req.body);
      const submission = await storage.createContactSubmission(validatedData);
      try {
        await sendEmail({
          to: "business@studioleflow.com",
          subject: `Novi upit - ${escapeHtml(validatedData.service)}`,
          html: `
            <h2>Novi upit sa Studio LeFlow sajta</h2>
            <p><strong>Usluga:</strong> ${escapeHtml(validatedData.service)}</p>
            <p><strong>Ime:</strong> ${escapeHtml(validatedData.name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(validatedData.email)}</p>
            <p><strong>Telefon:</strong> ${escapeHtml(validatedData.phone)}</p>
            ${validatedData.preferredDate ? `<p><strong>\u017Deljeni termin:</strong> ${escapeHtml(validatedData.preferredDate)}</p>` : ""}
            <p><strong>Poruka:</strong></p>
            <p>${escapeHtml(validatedData.message).replace(/\n/g, "<br>")}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Poslato automatski sa Studio LeFlow sajta</p>
          `
        });
      } catch (emailError) {
        console.error("Gre\u0161ka pri slanju email-a:", emailError);
      }
      res.json(submission);
    } catch (error) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Gre\u0161ka na serveru" });
      }
    }
  });
  app2.get("/api/contact", async (_req, res) => {
    try {
      const submissions = await storage.getAllContactSubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.post("/api/user/accept-terms", requireVerifiedEmail, async (req, res) => {
    try {
      await storage.acceptTerms(req.user.id);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.put("/api/user/update-profile", requireVerifiedEmail, async (req, res) => {
    try {
      const { username, email } = req.body;
      const userId = req.user.id;
      if (username && username.trim().length < 3) {
        return res.status(400).json({ error: "Korisni\u010Dko ime mora imati najmanje 3 karaktera" });
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Unesite validnu email adresu" });
      }
      if (username && username !== req.user.username) {
        const user = await storage.getUser(userId);
        if (user?.usernameLastChanged) {
          const daysSinceLastChange = Math.floor(
            (Date.now() - new Date(user.usernameLastChanged).getTime()) / (1e3 * 60 * 60 * 24)
          );
          if (daysSinceLastChange < 30) {
            return res.status(400).json({
              error: `Mo\u017Eete promeniti korisni\u010Dko ime tek za ${30 - daysSinceLastChange} dana`
            });
          }
        }
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Korisni\u010Dko ime je ve\u0107 zauzeto" });
        }
      }
      if (email && email !== req.user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Email adresa je ve\u0107 zauzeta" });
        }
      }
      await storage.updateUserProfile(userId, { username, email });
      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: error.message || "Gre\u0161ka na serveru" });
    }
  });
  app2.put("/api/user/change-password", requireVerifiedEmail, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Trenutna i nova lozinka su obavezne" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Nova lozinka mora imati najmanje 6 karaktera" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Korisnik nije prona\u0111en" });
      }
      const isValidPassword = await comparePasswords(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: "Trenutna lozinka nije ta\u010Dna" });
      }
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, hashedPassword);
      res.json({ message: "Lozinka je uspe\u0161no promenjena" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: error.message || "Gre\u0161ka na serveru" });
    }
  });
  app2.get("/api/giveaway/settings", async (_req, res) => {
    try {
      const settings2 = await storage.getGiveawaySettings();
      res.json(settings2);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.get("/api/giveaway/projects", async (_req, res) => {
    try {
      const projects2 = await storage.getAllProjects();
      res.json(projects2);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.post("/api/giveaway/projects", requireVerifiedEmail, async (req, res) => {
    if (!req.user.termsAccepted) {
      return res.status(403).json({ error: "Morate prihvatiti pravila pre u\u010De\u0161\u0107a u giveaway-u" });
    }
    try {
      if (!req.body.mp3Url) {
        return res.status(400).json({ error: "MP3 URL je obavezan" });
      }
      const currentMonth = (/* @__PURE__ */ new Date()).toISOString().substring(0, 7);
      const userProjects = await storage.getUserProjectsForMonth(req.user.id, currentMonth);
      if (userProjects.length > 0) {
        return res.status(400).json({ error: "Ve\u0107 ste uploadovali projekat ovog meseca. Mo\u017Eete uploadovati samo 1 projekat mese\u010Dno." });
      }
      const { insertProjectSchema: insertProjectSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertProjectSchema2.parse({
        title: req.body.title,
        description: req.body.description || "",
        genre: req.body.genre,
        mp3Url: req.body.mp3Url
        // Use the URL from UploadThing
      });
      const project = await storage.createProject({
        ...validatedData,
        userId: req.user.id,
        currentMonth
      });
      res.status(201).json(project);
    } catch (error) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        console.error("Project upload error:", error);
        res.status(500).json({ error: error.message || "Gre\u0161ka na serveru" });
      }
    }
  });
  app2.post("/api/giveaway/vote", requireVerifiedEmail, async (req, res) => {
    if (!req.user.termsAccepted) {
      return res.status(403).json({ error: "Morate prihvatiti pravila pre glasanja" });
    }
    try {
      const { projectId } = req.body;
      if (!projectId || typeof projectId !== "number") {
        return res.status(400).json({ error: "ID projekta je obavezan" });
      }
      const ipAddress = req.socket.remoteAddress || "unknown";
      const userAlreadyVoted = await storage.hasUserVoted(req.user.id, projectId);
      if (userAlreadyVoted) {
        await storage.deleteVote(req.user.id, projectId);
        return res.json({ action: "removed" });
      } else {
        const votes2 = await storage.getProjectVotes(projectId);
        const ipVoteByDifferentUser = votes2.find(
          (vote) => vote.ipAddress === ipAddress && vote.userId !== req.user.id
        );
        if (ipVoteByDifferentUser) {
          return res.status(400).json({ error: "Sa ove IP adrese je ve\u0107 glasano za ovaj projekat (drugi korisnik)" });
        }
        await storage.createVote({
          userId: req.user.id,
          projectId,
          ipAddress
        });
        return res.json({ action: "added" });
      }
    } catch (error) {
      console.error("Vote toggle error:", error);
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.get("/api/giveaway/projects/:id/comments", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Neva\u017Ee\u0107i ID projekta" });
      }
      const comments2 = await storage.getProjectComments(projectId);
      res.json(comments2);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.post("/api/giveaway/comments", requireVerifiedEmail, async (req, res) => {
    if (!req.user.termsAccepted) {
      return res.status(403).json({ error: "Morate prihvatiti pravila pre komentarisanja" });
    }
    try {
      const { insertCommentSchema: insertCommentSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertCommentSchema2.parse(req.body);
      const comment = await storage.createComment({
        ...validatedData,
        userId: req.user.id
      });
      res.status(201).json(comment);
    } catch (error) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Gre\u0161ka na serveru" });
      }
    }
  });
  app2.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json(users2);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.post("/api/admin/users/:id/ban", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Neva\u017Ee\u0107i ID korisnika" });
      }
      await storage.banUser(userId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.post("/api/admin/users/:id/unban", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Neva\u017Ee\u0107i ID korisnika" });
      }
      await storage.unbanUser(userId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Neva\u017Ee\u0107i ID korisnika" });
      }
      if (userId === req.user.id) {
        return res.status(400).json({ error: "Ne mo\u017Eete obrisati sami sebe" });
      }
      await storage.deleteUser(userId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.post("/api/admin/users/:id/toggle-admin", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Neva\u017Ee\u0107i ID korisnika" });
      }
      if (userId === req.user.id) {
        return res.status(400).json({ error: "Ne mo\u017Eete ukloniti sebi admin privilegije" });
      }
      await storage.toggleAdminRole(userId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.get("/api/admin/all-projects", requireAdmin, async (_req, res) => {
    try {
      const projects2 = await storage.getAllProjectsForAdmin();
      res.json(projects2);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.get("/api/admin/pending-projects", requireAdmin, async (_req, res) => {
    try {
      const projects2 = await storage.getPendingProjects();
      res.json(projects2);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.post("/api/admin/projects/:id/approve", requireAdmin, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Neva\u017Ee\u0107i ID projekta" });
      }
      await storage.approveProject(projectId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.delete("/api/admin/projects/:id", requireAdmin, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Neva\u017Ee\u0107i ID projekta" });
      }
      await storage.deleteProject(projectId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.get("/api/admin/comments", requireAdmin, async (_req, res) => {
    try {
      const comments2 = await storage.getAllComments();
      res.json(comments2);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.delete("/api/admin/comments/:id", requireAdmin, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: "Neva\u017Ee\u0107i ID komentara" });
      }
      await storage.deleteComment(commentId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.post("/api/admin/giveaway/toggle", requireAdmin, async (req, res) => {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ error: "isActive mora biti boolean" });
      }
      await storage.setSetting("giveaway_active", isActive.toString());
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.get("/api/cms/content", async (req, res) => {
    try {
      const page = req.query.page;
      const content = await storage.listCmsContent(page);
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.post("/api/cms/content", requireAdmin, async (req, res) => {
    try {
      const schema = z2.array(insertCmsContentSchema);
      const validated = schema.parse(req.body);
      const results = [];
      for (const item of validated) {
        const result = await storage.upsertCmsContent(item);
        results.push(result);
      }
      res.json(results);
    } catch (error) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Gre\u0161ka na serveru" });
      }
    }
  });
  app2.put("/api/cms/content/single", requireAdmin, async (req, res) => {
    try {
      const validated = insertCmsContentSchema.parse(req.body);
      const result = await storage.upsertCmsContent(validated);
      res.json(result);
    } catch (error) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Gre\u0161ka na serveru" });
      }
    }
  });
  app2.delete("/api/cms/team-member/:memberIndex", requireAdmin, async (req, res) => {
    try {
      const memberIndex = parseInt(req.params.memberIndex);
      if (isNaN(memberIndex)) {
        return res.status(400).json({ error: "Neva\u017Ee\u0107i member index" });
      }
      await storage.deleteCmsContentByPattern("team", "members", `member_${memberIndex}_`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ error: "Gre\u0161ka pri brisanju \u010Dlana tima" });
    }
  });
  app2.get("/api/cms/media", async (req, res) => {
    try {
      const page = req.query.page;
      const media = await storage.listCmsMedia(page);
      res.json(media);
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.post("/api/cms/media", requireAdmin, multerUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const metadata = insertCmsMediaSchema.omit({ filePath: true }).parse({
        page: req.body.page,
        section: req.body.section,
        assetKey: req.body.assetKey
      });
      const cmsDir = path.join(process.cwd(), "attached_assets", "cms", metadata.page);
      await fs.promises.mkdir(cmsDir, { recursive: true });
      const ext = path.extname(req.file.originalname);
      const filename = `${metadata.page}-${metadata.section}-${metadata.assetKey}-${Date.now()}${ext}`;
      const filePath = `attached_assets/cms/${metadata.page}/${filename}`;
      const fullPath = path.join(process.cwd(), filePath);
      await fs.promises.rename(req.file.path, fullPath);
      const mediaEntry = await storage.upsertCmsMedia({
        ...metadata,
        filePath
      });
      res.json(mediaEntry);
    } catch (error) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Gre\u0161ka na serveru" });
      }
    }
  });
  app2.delete("/api/cms/media/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Neva\u017Ee\u0107i ID" });
      }
      await storage.deleteCmsMedia(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Gre\u0161ka na serveru" });
    }
  });
  app2.get("/robots.txt", (req, res) => {
    const host = req.get("host") || "localhost:5000";
    const protocol = req.protocol || "https";
    const siteUrl = `${protocol}://${host}`;
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
    res.type("text/plain");
    res.send(robotsTxt);
  });
  app2.get("/sitemap.xml", (req, res) => {
    const host = req.get("host") || "localhost:5000";
    const protocol = req.protocol || "https";
    const siteUrl = `${protocol}://${host}`;
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/kontakt</loc>
    <lastmod>${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/tim</loc>
    <lastmod>${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteUrl}/giveaway</loc>
    <lastmod>${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${siteUrl}/pravila</loc>
    <lastmod>${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${siteUrl}/usluge</loc>
    <lastmod>${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;
    res.type("application/xml");
    res.send(sitemap);
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger as createLogger2 } from "vite";

// vite.config.ts
import { defineConfig, createLogger } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import { fileURLToPath } from "url";
import runtimeErrorModal from "@replit/vite-plugin-runtime-error-modal";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var logger = createLogger();
var originalWarning = logger.warn;
logger.warn = (msg, options) => {
  if (msg.includes("did not pass the `from` option")) return;
  originalWarning(msg, options);
};
var vite_config_default = defineConfig({
  customLogger: logger,
  plugins: [
    react(),
    runtimeErrorModal()
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer()
      ]
    }
  },
  resolve: {
    alias: {
      "@": path2.resolve(__dirname, "client", "src"),
      "@shared": path2.resolve(__dirname, "shared"),
      "@assets": path2.resolve(__dirname, "attached_assets")
    }
  },
  root: path2.resolve(__dirname, "client"),
  build: {
    outDir: path2.resolve(__dirname, "dist", "public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "wouter"],
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-toast"],
          "vendor-animation": ["framer-motion"],
          "vendor-query": ["@tanstack/react-query"]
        }
      }
    },
    cssMinify: true,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5e3,
    allowedHosts: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger2();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  log(`Looking for static files in: ${distPath}`, "express");
  if (!fs2.existsSync(distPath)) {
    log(`ERROR: Build directory not found at ${distPath}`, "express");
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  const indexPath = path3.resolve(distPath, "index.html");
  if (!fs2.existsSync(indexPath)) {
    log(`ERROR: index.html not found at ${indexPath}`, "express");
    throw new Error(
      `Could not find index.html in the build directory: ${indexPath}`
    );
  }
  log(`Serving static files from: ${distPath}`, "express");
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(indexPath);
  });
}

// server/seed.ts
init_schema();
var defaultCmsContent = [
  // Hero section
  { page: "home", section: "hero", contentKey: "title", contentValue: "Studio LeFlow" },
  { page: "home", section: "hero", contentKey: "subtitle", contentValue: "Profesionalna Muzi\u010Dka Produkcija" },
  { page: "home", section: "hero", contentKey: "description", contentValue: "Mix \u2022 Master \u2022 Instrumentali \u2022 Video Produkcija" },
  // Services
  { page: "home", section: "services", contentKey: "service_1_title", contentValue: "Snimanje & Mix/Master" },
  { page: "home", section: "services", contentKey: "service_1_description", contentValue: "Profesionalno snimanje vokala i instrumenata u akusti\u010Dki tretiranom studiju" },
  { page: "home", section: "services", contentKey: "service_1_image", contentValue: "/client/src/assets/generated_images/Apollo_Twin_X_audio_interface_8905cd94.png" },
  { page: "home", section: "services", contentKey: "service_2_title", contentValue: "Instrumentali & Gotove Pesme" },
  { page: "home", section: "services", contentKey: "service_2_description", contentValue: "Kreiranje originalnih bitova i kompletna produkcija va\u0161ih pesama" },
  { page: "home", section: "services", contentKey: "service_2_image", contentValue: "/client/src/assets/generated_images/Synthesizer_keyboard_with_controls_c7b4f573.png" },
  { page: "home", section: "services", contentKey: "service_3_title", contentValue: "Video Produkcija" },
  { page: "home", section: "services", contentKey: "service_3_description", contentValue: "Snimanje i editing profesionalnih muzi\u010Dkih spotova" },
  { page: "home", section: "services", contentKey: "service_3_image", contentValue: "/client/src/assets/generated_images/Video_camera_production_setup_199f7c64.png" },
  // Equipment section
  { page: "home", section: "equipment", contentKey: "equipment_image", contentValue: "/client/src/assets/generated_images/Yamaha_HS8_studio_monitors_d1470a56.png" },
  // CTA section
  { page: "home", section: "cta", contentKey: "title", contentValue: "Spremni za Va\u0161u Slede\u0107u Produkciju?" },
  { page: "home", section: "cta", contentKey: "description", contentValue: "Zaka\u017Eite besplatnu konsultaciju i razgovarajmo o va\u0161oj muzi\u010Dkoj viziji" }
];
async function seedCmsContent() {
  try {
    console.log("\u{1F331} Checking CMS content...");
    const existingContent = await db.select().from(cmsContent).limit(1);
    if (existingContent.length > 0) {
      console.log("\u2705 CMS content already exists, skipping seed");
      return;
    }
    console.log("\u{1F4DD} Seeding CMS content...");
    await db.insert(cmsContent).values(defaultCmsContent);
    console.log(`\u2705 Successfully seeded ${defaultCmsContent.length} CMS content entries`);
  } catch (error) {
    console.error("\u274C Error seeding CMS content:", error);
    throw error;
  }
}

// server/index.ts
var app = express2();
app.use(compression({
  level: 6,
  threshold: 1024,
  // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
app.use("/attached_assets", express2.static(path4.join(process.cwd(), "attached_assets"), {
  maxAge: "1y",
  immutable: true
}));
app.set("trust proxy", 1);
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; media-src 'self' https://utfs.io https://*.uploadthing.com; connect-src 'self' https://*.uploadthing.com https://uploadthing-prod.s3.us-west-2.amazonaws.com; frame-ancestors 'none';"
  );
  next();
});
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    const env = app.get("env");
    log(`Starting server in ${env} mode`);
    log(`PORT: ${process.env.PORT || "5000"}`);
    const missingEnvVars = [];
    if (!process.env.DATABASE_URL) {
      missingEnvVars.push("DATABASE_URL");
    }
    if (!process.env.SESSION_SECRET) {
      missingEnvVars.push("SESSION_SECRET");
    }
    if (env === "production") {
      if (!process.env.UPLOADTHING_TOKEN && !process.env.UPLOADTHING_SECRET) {
        missingEnvVars.push("UPLOADTHING_TOKEN or UPLOADTHING_SECRET");
      }
    }
    if (missingEnvVars.length > 0) {
      const errorMsg = `FATAL: Missing required environment variables: ${missingEnvVars.join(", ")}`;
      log(errorMsg, "express");
      console.error("\n" + "=".repeat(80));
      console.error("DEPLOYMENT CONFIGURATION ERROR");
      console.error("=".repeat(80));
      console.error("\nThe following environment variables are required but not set:");
      missingEnvVars.forEach((v) => console.error(`  - ${v}`));
      console.error("\nPlease add these in Replit Deployment \u2192 Secrets");
      console.error("=".repeat(80) + "\n");
      process.exit(1);
    }
    log("All required environment variables present", "express");
    await seedCmsContent();
    const server = await registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${message}`, "express");
      console.error("Full error details:", err);
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });
    if (env === "development") {
      log("Setting up Vite dev server", "express");
      await setupVite(app, server);
    } else {
      log("Setting up production static file serving", "express");
      serveStatic(app);
    }
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true
    }, () => {
      log(`Server successfully started on port ${port}`);
      log(`Environment: ${env}`);
    });
    server.on("error", (error) => {
      log(`Server error: ${error.message}`, "express");
      console.error("Full error:", error);
      process.exit(1);
    });
  } catch (error) {
    log(`Failed to start server: ${error.message}`, "express");
    console.error("Full error:", error);
    process.exit(1);
  }
})();
