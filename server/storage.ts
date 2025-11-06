// Blueprint reference: blueprint:javascript_database, blueprint:javascript_auth_all_persistance
import { 
  type ContactSubmission, 
  type InsertContactSubmission,
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type Comment,
  type InsertComment,
  type Vote,
  type Setting,
  type CmsContent,
  type InsertCmsContent,
  type CmsMedia,
  type InsertCmsMedia,
  contactSubmissions,
  users,
  projects,
  comments,
  votes,
  settings,
  cmsContent,
  cmsMedia,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Store } from "express-session";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Contact submissions
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;
  getContactSubmission(id: string): Promise<ContactSubmission | undefined>;
  getAllContactSubmissions(): Promise<ContactSubmission[]>;

  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUserRole(id: number, role: string): Promise<void>;
  banUser(id: number): Promise<void>;
  unbanUser(id: number): Promise<void>;
  acceptTerms(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  setVerificationCode(userId: number, code: string): Promise<void>;
  verifyEmail(userId: number, code: string): Promise<boolean>;

  // Projects
  createProject(data: { title: string; description: string; genre: string; mp3Url: string; userId: number; currentMonth: string }): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getAllProjects(): Promise<Array<Project & { username: string }>>;
  getUserProjectsForMonth(userId: number, month: string): Promise<Project[]>;
  deleteProject(id: number): Promise<void>;
  incrementVoteCount(projectId: number): Promise<void>;

  // Votes
  createVote(data: { userId: number; projectId: number; ipAddress: string }): Promise<Vote>;
  deleteVote(userId: number, projectId: number): Promise<void>;
  hasUserVoted(userId: number, projectId: number): Promise<boolean>;
  getProjectVotes(projectId: number): Promise<Vote[]>;
  decrementVoteCount(projectId: number): Promise<void>;

  // Comments
  createComment(data: { text: string; projectId: number; userId: number }): Promise<Comment>;
  getProjectComments(projectId: number): Promise<Array<Comment & { username: string }>>;
  deleteComment(id: number): Promise<void>;
  getAllComments(): Promise<Array<Comment & { username: string; projectTitle: string }>>;

  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  getGiveawaySettings(): Promise<{ isActive: boolean }>;

  // CMS Content
  getCmsContent(page: string, section: string, contentKey: string): Promise<CmsContent | undefined>;
  setCmsContent(page: string, section: string, contentType: string, contentKey: string, contentValue: string): Promise<void>;
  getAllCmsContent(): Promise<CmsContent[]>;
  listCmsContent(page?: string): Promise<CmsContent[]>;
  upsertCmsContent(data: InsertCmsContent): Promise<CmsContent>;
  deleteCmsContentByPattern(page: string, section: string, keyPattern: string): Promise<void>;

  // CMS Media
  listCmsMedia(page?: string): Promise<CmsMedia[]>;
  upsertCmsMedia(data: InsertCmsMedia): Promise<CmsMedia>;
  deleteCmsMedia(id: number): Promise<void>;

  // Session store
  sessionStore: Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  // Contact Submissions
  async createContactSubmission(insertSubmission: InsertContactSubmission): Promise<ContactSubmission> {
    const [submission] = await db.insert(contactSubmissions).values(insertSubmission).returning();
    return submission!;
  }

  async getContactSubmission(id: string): Promise<ContactSubmission | undefined> {
    const [submission] = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id));
    return submission || undefined;
  }

  async getAllContactSubmissions(): Promise<ContactSubmission[]> {
    return await db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt));
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user!;
  }

  async updateUserRole(id: number, role: string): Promise<void> {
    await db.update(users).set({ role }).where(eq(users.id, id));
  }

  async banUser(id: number): Promise<void> {
    await db.update(users).set({ banned: true }).where(eq(users.id, id));
  }

  async unbanUser(id: number): Promise<void> {
    await db.update(users).set({ banned: false }).where(eq(users.id, id));
  }

  async deleteUser(id: number): Promise<void> {
    // Get all user's projects to delete votes and comments on them
    const userProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.userId, id));
    const projectIds = userProjects.map(p => p.id);
    
    // Delete votes and comments on user's projects from other users
    if (projectIds.length > 0) {
      await db.delete(votes).where(sql`${votes.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`);
      await db.delete(comments).where(sql`${comments.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`);
    }
    
    // Delete user's own votes (on other projects)
    await db.delete(votes).where(eq(votes.userId, id));
    
    // Delete user's own comments (on other projects)
    await db.delete(comments).where(eq(comments.userId, id));
    
    // Delete user's projects (now safe - all votes and comments are gone)
    await db.delete(projects).where(eq(projects.userId, id));
    
    // Finally delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  async acceptTerms(id: number): Promise<void> {
    await db.update(users).set({ termsAccepted: true }).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async setVerificationCode(userId: number, code: string): Promise<void> {
    await db.update(users).set({ verificationCode: code }).where(eq(users.id, userId));
  }

  async verifyEmail(userId: number, code: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.verificationCode !== code) {
      return false;
    }
    await db.update(users).set({ emailVerified: true, verificationCode: null }).where(eq(users.id, userId));
    return true;
  }

  async updateUserProfile(userId: number, data: { username?: string; email?: string }): Promise<void> {
    const updateData: any = {};
    
    if (data.username) {
      updateData.username = data.username;
      updateData.usernameLastChanged = new Date();
    }
    
    if (data.email) {
      updateData.email = data.email;
    }
    
    if (Object.keys(updateData).length > 0) {
      await db.update(users).set(updateData).where(eq(users.id, userId));
    }
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
  }

  // Projects
  async createProject(data: { title: string; description: string; genre: string; mp3Url: string; userId: number; currentMonth: string }): Promise<Project> {
    const [project] = await db.insert(projects).values(data).returning();
    return project!;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getAllProjects(): Promise<Array<Project & { username: string }>> {
    const result = await db
      .select({
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
        username: users.username,
      })
      .from(projects)
      .leftJoin(users, eq(projects.userId, users.id))
      .where(eq(projects.approved, true)) // Only show approved projects to regular users
      .orderBy(desc(projects.uploadDate));
    
    return result as Array<Project & { username: string }>;
  }

  async getAllProjectsForAdmin(): Promise<Array<Project & { username: string }>> {
    const result = await db
      .select({
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
        username: users.username,
      })
      .from(projects)
      .leftJoin(users, eq(projects.userId, users.id))
      .orderBy(desc(projects.uploadDate));
    
    return result as Array<Project & { username: string }>;
  }

  async getPendingProjects(): Promise<Array<Project & { username: string }>> {
    const result = await db
      .select({
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
        username: users.username,
      })
      .from(projects)
      .leftJoin(users, eq(projects.userId, users.id))
      .where(eq(projects.approved, false)) // Only show pending (unapproved) projects
      .orderBy(desc(projects.uploadDate));
    
    return result as Array<Project & { username: string }>;
  }

  async approveProject(id: number): Promise<void> {
    await db.update(projects).set({ approved: true }).where(eq(projects.id, id));
  }

  async getUserProjectsForMonth(userId: number, month: string): Promise<Project[]> {
    return await db.select().from(projects).where(
      and(eq(projects.userId, userId), eq(projects.currentMonth, month))
    );
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async incrementVoteCount(projectId: number): Promise<void> {
    await db.update(projects).set({
      votesCount: sql`${projects.votesCount} + 1`
    }).where(eq(projects.id, projectId));
  }

  // Votes
  async createVote(data: { userId: number; projectId: number; ipAddress: string }): Promise<Vote> {
    const [vote] = await db.insert(votes).values(data).returning();
    
    // Increment vote count
    await this.incrementVoteCount(data.projectId);
    
    return vote!;
  }

  async hasUserVoted(userId: number, projectId: number): Promise<boolean> {
    const existingVotes = await db.select().from(votes).where(
      and(eq(votes.userId, userId), eq(votes.projectId, projectId))
    );
    return existingVotes.length > 0;
  }

  async hasIpVoted(ipAddress: string, projectId: number): Promise<boolean> {
    const existingVotes = await db.select().from(votes).where(
      and(eq(votes.ipAddress, ipAddress), eq(votes.projectId, projectId))
    );
    return existingVotes.length > 0;
  }

  async getProjectVotes(projectId: number): Promise<Vote[]> {
    return await db.select().from(votes).where(eq(votes.projectId, projectId));
  }

  async deleteVote(userId: number, projectId: number): Promise<void> {
    await db.delete(votes).where(
      and(eq(votes.userId, userId), eq(votes.projectId, projectId))
    );
    
    // Decrement vote count
    await this.decrementVoteCount(projectId);
  }

  async decrementVoteCount(projectId: number): Promise<void> {
    await db.update(projects).set({
      votesCount: sql`${projects.votesCount} - 1`
    }).where(eq(projects.id, projectId));
  }

  // Comments
  async createComment(data: { text: string; projectId: number; userId: number }): Promise<Comment> {
    const [comment] = await db.insert(comments).values(data).returning();
    return comment!;
  }

  async getProjectComments(projectId: number): Promise<Array<Comment & { username: string }>> {
    const result = await db
      .select({
        id: comments.id,
        projectId: comments.projectId,
        userId: comments.userId,
        text: comments.text,
        createdAt: comments.createdAt,
        username: users.username,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.projectId, projectId))
      .orderBy(desc(comments.createdAt));
    
    return result as Array<Comment & { username: string }>;
  }

  async deleteComment(id: number): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  async getAllComments(): Promise<Array<Comment & { username: string; projectTitle: string }>> {
    const result = await db
      .select({
        id: comments.id,
        projectId: comments.projectId,
        projectTitle: projects.title,
        userId: comments.userId,
        username: users.username,
        text: comments.text,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .leftJoin(projects, eq(comments.projectId, projects.id))
      .orderBy(desc(comments.createdAt));
    
    return result as Array<Comment & { username: string; projectTitle: string }>;
  }

  // Settings
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const existing = await this.getSetting(key);
    if (existing) {
      await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }

  // CMS Content
  async getCmsContent(page: string, section: string, contentKey: string): Promise<CmsContent | undefined> {
    const [content] = await db.select().from(cmsContent).where(
      and(
        eq(cmsContent.page, page),
        eq(cmsContent.section, section),
        eq(cmsContent.contentKey, contentKey)
      )
    );
    return content || undefined;
  }

  async setCmsContent(page: string, section: string, contentType: string, contentKey: string, contentValue: string): Promise<void> {
    const existing = await this.getCmsContent(page, section, contentKey);
    if (existing) {
      await db.update(cmsContent).set({ contentValue, updatedAt: new Date() }).where(
        and(
          eq(cmsContent.page, page),
          eq(cmsContent.section, section),
          eq(cmsContent.contentKey, contentKey)
        )
      );
    } else {
      await db.insert(cmsContent).values({ page, section, contentKey, contentValue } as any);
    }
  }

  async getAllCmsContent(): Promise<CmsContent[]> {
    return await db.select().from(cmsContent);
  }

  async listCmsContent(page?: string): Promise<CmsContent[]> {
    if (page) {
      return await db
        .select()
        .from(cmsContent)
        .where(eq(cmsContent.page, page))
        .orderBy(cmsContent.page, cmsContent.section, cmsContent.contentKey);
    }
    return await db
      .select()
      .from(cmsContent)
      .orderBy(cmsContent.page, cmsContent.section, cmsContent.contentKey);
  }

  async upsertCmsContent(data: InsertCmsContent): Promise<CmsContent> {
    const [result] = await db
      .insert(cmsContent)
      .values(data)
      .onConflictDoUpdate({
        target: [cmsContent.page, cmsContent.section, cmsContent.contentKey],
        set: {
          contentValue: sql`EXCLUDED.content_value`,
          updatedAt: sql`NOW()`,
        },
      })
      .returning();
    return result!;
  }

  async deleteCmsContentByPattern(page: string, section: string, keyPattern: string): Promise<void> {
    await db.delete(cmsContent).where(
      and(
        eq(cmsContent.page, page),
        eq(cmsContent.section, section),
        sql`${cmsContent.contentKey} LIKE ${keyPattern + '%'}`
      )
    );
  }

  async listCmsMedia(page?: string): Promise<CmsMedia[]> {
    if (page) {
      return await db
        .select()
        .from(cmsMedia)
        .where(eq(cmsMedia.page, page))
        .orderBy(cmsMedia.page, cmsMedia.section, cmsMedia.assetKey);
    }
    return await db
      .select()
      .from(cmsMedia)
      .orderBy(cmsMedia.page, cmsMedia.section, cmsMedia.assetKey);
  }

  async upsertCmsMedia(data: InsertCmsMedia): Promise<CmsMedia> {
    const [result] = await db
      .insert(cmsMedia)
      .values(data)
      .onConflictDoUpdate({
        target: [cmsMedia.page, cmsMedia.section, cmsMedia.assetKey],
        set: {
          filePath: sql`EXCLUDED.file_path`,
          updatedAt: sql`NOW()`,
        },
      })
      .returning();
    return result!;
  }

  async deleteCmsMedia(id: number): Promise<void> {
    await db.delete(cmsMedia).where(eq(cmsMedia.id, id));
  }

  async getGiveawaySettings(): Promise<{ isActive: boolean }> {
    const setting = await this.getSetting('giveaway_active');
    return { isActive: setting?.value === 'true' };
  }

  // Admin methods
  async getAdminStats(): Promise<{
    totalUsers: number;
    totalProjects: number;
    totalVotes: number;
    totalComments: number;
  }> {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [projectCount] = await db.select({ count: sql<number>`count(*)` }).from(projects);
    const [voteCount] = await db.select({ count: sql<number>`count(*)` }).from(votes);
    const [commentCount] = await db.select({ count: sql<number>`count(*)` }).from(comments);
    
    return {
      totalUsers: Number(userCount?.count ?? 0),
      totalProjects: Number(projectCount?.count ?? 0),
      totalVotes: Number(voteCount?.count ?? 0),
      totalComments: Number(commentCount?.count ?? 0),
    };
  }

  async toggleAdminRole(userId: number): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    await db.update(users).set({ role: newRole }).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
