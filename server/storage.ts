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
  type VideoSpot,
  type InsertVideoSpot,
  type UserSong,
  type InsertUserSong,
  type NewsletterSubscriber,
  type InsertNewsletterSubscriber,
  type Conversation,
  type Message,
  type MessageRead,
  type AdminMessageAudit,
  type Contract,
  type InsertContract,
  type Invoice,
  type InsertInvoice,
  type PendingUser,
  type RegistrationAttempt,
  type CommunityMessage,
  type InsertCommunityMessage,
  type SiteAnnouncement,
  type InsertSiteAnnouncement,
  contactSubmissions,
  users,
  projects,
  comments,
  votes,
  settings,
  cmsContent,
  cmsMedia,
  videoSpots,
  userSongs,
  userSongVotes,
  newsletterSubscribers,
  conversations,
  messages,
  messageReads,
  adminMessageAudit,
  contracts,
  invoices,
  pendingUsers,
  registrationAttempts,
  communityMessages,
  siteAnnouncement,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, or, desc, sql, notInArray } from "drizzle-orm";
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
  adminSearchUsers(query: string, limit?: number): Promise<Array<{ id: number; username: string; email: string }>>;
  getAdminUsers(): Promise<User[]>;
  setVerificationCode(userId: number, code: string): Promise<void>;
  verifyEmail(userId: number, code: string): Promise<boolean>;
  setPasswordResetToken(userId: number, token: string): Promise<void>;
  verifyPasswordResetToken(userId: number, token: string): Promise<boolean>;
  updatePassword(userId: number, newPassword: string): Promise<void>;
  clearPasswordResetToken(userId: number): Promise<void>;
  setAdminLoginToken(userId: number, token: string): Promise<void>;
  verifyAdminLoginToken(userId: number, token: string): Promise<boolean>;
  clearAdminLoginToken(userId: number): Promise<void>;
  updateUserProfile(userId: number, data: { username?: string; email?: string }): Promise<void>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  updateUserAvatar(userId: number, avatarUrl: string | null): Promise<void>;
  updateUserLastSeen(userId: number): Promise<void>;

  // Pending Users (for email verification before full registration)
  createPendingUser(data: { email: string; password: string; username: string; verificationCode: string; ipAddress: string; userAgent?: string; termsAccepted: boolean; expiresAt: Date }): Promise<PendingUser>;
  getPendingUserByEmail(email: string): Promise<PendingUser | undefined>;
  getPendingUserByUsername(username: string): Promise<PendingUser | undefined>;
  getPendingUserByCode(code: string): Promise<PendingUser | undefined>;
  deletePendingUser(id: number): Promise<void>;
  movePendingToUsers(pendingUserId: number): Promise<User>;
  cleanupExpiredPendingUsers(): Promise<number>; // Returns count of deleted records

  // Registration Rate Limiting
  createRegistrationAttempt(data: { ipAddress: string; email?: string; userAgent?: string }): Promise<RegistrationAttempt>;
  getRecentRegistrationAttempts(ipAddress: string, minutesAgo: number): Promise<RegistrationAttempt[]>;
  cleanupOldRegistrationAttempts(hoursAgo: number): Promise<number>; // Returns count of deleted records

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
  getMaintenanceMode(): Promise<boolean>;
  setMaintenanceMode(isActive: boolean): Promise<void>;

  // Newsletter
  createNewsletterSubscriber(email: string, confirmationToken: string): Promise<NewsletterSubscriber>;
  getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined>;
  getNewsletterSubscriberByToken(token: string): Promise<NewsletterSubscriber | undefined>;
  confirmNewsletterSubscription(token: string): Promise<boolean>;
  unsubscribeNewsletter(email: string): Promise<boolean>;
  deleteNewsletterSubscriber(id: number): Promise<boolean>;
  getAllNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  getConfirmedNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  getNewsletterStats(): Promise<{ total: number; confirmed: number; pending: number }>;

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

  // Video Spots
  getVideoSpots(): Promise<VideoSpot[]>;
  createVideoSpot(data: InsertVideoSpot): Promise<VideoSpot>;
  updateVideoSpot(id: number, data: InsertVideoSpot): Promise<VideoSpot>;
  deleteVideoSpot(id: number): Promise<void>;
  updateVideoSpotOrder(id: number, order: number): Promise<VideoSpot>;

  // User Songs (User-submitted YouTube songs)
  createUserSong(data: { userId: number; songTitle: string; artistName: string; youtubeUrl: string }): Promise<UserSong>;
  getUserSongById(id: number): Promise<UserSong | undefined>;
  getUserSongs(userId: number): Promise<UserSong[]>;
  getAllUserSongs(): Promise<Array<UserSong & { username: string }>>;
  getApprovedUserSongs(userId?: number): Promise<Array<UserSong & { username: string; hasVoted: boolean }>>;
  deleteUserSong(id: number): Promise<void>;
  approveUserSong(id: number): Promise<void>;
  getUserLastSongSubmissionTime(userId: number): Promise<Date | null>;
  toggleUserSongVote(userId: number, songId: number): Promise<{ voted: boolean; votesCount: number }>;
  hasUserVotedForSong(userId: number, songId: number): Promise<boolean>;

  // Messaging
  searchUsers(query: string, currentUserId: number): Promise<Array<{ id: number; username: string; email: string }>>;
  getOrCreateConversation(user1Id: number, user2Id: number): Promise<Conversation>;
  getConversation(user1Id: number, user2Id: number): Promise<Conversation | undefined>;
  getUserConversations(userId: number): Promise<Array<Conversation & { otherUser: { id: number; username: string; avatarUrl: string | null }; lastMessage?: Message; unreadCount: number }>>;
  sendMessage(senderId: number, receiverId: number, content: string, imageUrl?: string): Promise<Message>;
  getMessageById(messageId: number): Promise<Message | undefined>;
  getConversationMessages(conversationId: number, userId: number): Promise<Message[]>;
  markMessagesAsRead(conversationId: number, userId: number): Promise<void>;
  getUnreadMessageCount(userId: number): Promise<number>;
  deleteMessage(messageId: number, userId: number): Promise<boolean>;
  adminGetAllConversations(): Promise<Array<{ id: number; user1Id: number; user2Id: number; user1Username: string; user2Username: string; user1AvatarUrl: string | null; user2AvatarUrl: string | null; messageCount: number; lastMessageAt: Date | null; lastMessageContent: string | null; lastMessageSenderUsername: string | null; lastMessageDeleted: boolean }>>;
  adminGetConversationMessages(user1Id: number, user2Id: number): Promise<Message[]>;
  adminDeleteMessage(messageId: number): Promise<boolean>;
  adminLogConversationView(adminId: number, viewedUser1Id: number, viewedUser2Id: number): Promise<void>;
  adminGetAuditLogs(): Promise<Array<AdminMessageAudit & { adminUsername: string; user1Username: string; user2Username: string }>>;
  adminExportConversation(user1Id: number, user2Id: number): Promise<string>;
  adminGetMessagingStats(): Promise<{ totalMessages: number; totalConversations: number; deletedMessages: number; activeConversations: number }>;

  // Contracts
  createContract(data: InsertContract): Promise<Contract>;
  getAllContracts(): Promise<Array<Contract & { username: string | null }>>;
  getContractById(id: number): Promise<Contract | undefined>;
  getNextContractNumber(): Promise<string>;
  updateContractUser(contractId: number, userId: number | null): Promise<void>;
  deleteContract(id: number): Promise<void>;

  // Invoices
  createInvoice(data: InsertInvoice): Promise<Invoice>;
  getAllInvoices(): Promise<Invoice[]>;
  getUserInvoices(userId: number): Promise<Array<Invoice & { contractNumber: string | null; contractType: string | null }>>;
  getInvoiceById(id: number): Promise<Invoice | undefined>;
  getNextInvoiceNumber(): Promise<string>;
  updateInvoiceStatus(id: number, status: string, paidDate?: Date): Promise<void>;
  deleteInvoice(id: number): Promise<void>;

  // Community Chat
  createCommunityMessage(userId: number, message: string): Promise<CommunityMessage>;
  getCommunityMessages(limit?: number): Promise<Array<CommunityMessage & { username: string; rank: string; avatarUrl: string | null }>>;
  deleteCommunityMessage(messageId: number, userId: number): Promise<boolean>;
  clearAllCommunityMessages(): Promise<void>;
  canUserSendMessage(userId: number): Promise<boolean>;
  updateUserRank(userId: number, rank: string): Promise<void>;

  // Site Announcement
  getSiteAnnouncement(): Promise<SiteAnnouncement>;
  upsertSiteAnnouncement(data: InsertSiteAnnouncement): Promise<SiteAnnouncement>;

  // Dashboard
  getUserProjects(userId: number): Promise<Array<Project & { username: string }>>;
  getUserContracts(userId: number): Promise<Array<Contract & { username: string }>>;
  getDashboardOverview(userId: number): Promise<{
    totalProjects: number;
    projectsByStatus: Record<string, number>;
    totalContracts: number;
    totalInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalAmountPending: string;
    unreadMessages: number;
  }>;
  updateProjectStatus(projectId: number, status: string): Promise<void>;

  // Analytics
  getNewUsersCount(period: 'today' | 'week' | 'month'): Promise<number>;
  getTopProjects(limit: number): Promise<Array<Project & { username: string; votesCount: number }>>;
  getApprovedSongsCount(period: 'today' | 'week' | 'month'): Promise<number>;
  getContractStats(): Promise<{ total: number; byType: Record<string, number> }>;
  getUnreadConversationsCount(): Promise<number>;

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
    // Case-insensitive email lookup
    const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`);
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Case-insensitive username lookup
    const [user] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${username})`);
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

  async adminSearchUsers(query: string, limit: number = 20): Promise<Array<{ id: number; username: string; email: string }>> {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const results = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
      })
      .from(users)
      .where(
        or(
          sql`LOWER(${users.username}) LIKE ${searchTerm}`,
          sql`LOWER(${users.email}) LIKE ${searchTerm}`
        )
      )
      .orderBy(users.username)
      .limit(limit);

    return results;
  }

  async getAdminUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'admin'));
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

  async setPasswordResetToken(userId: number, token: string): Promise<void> {
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    await db.update(users).set({ 
      passwordResetToken: token, 
      passwordResetExpiry: expiry 
    }).where(eq(users.id, userId));
  }

  async verifyPasswordResetToken(userId: number, token: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.passwordResetToken !== token) {
      return false;
    }
    // Check if token has expired
    if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      return false;
    }
    return true;
  }

  async updatePassword(userId: number, newPassword: string): Promise<void> {
    await db.update(users).set({ password: newPassword }).where(eq(users.id, userId));
  }

  async clearPasswordResetToken(userId: number): Promise<void> {
    await db.update(users).set({ 
      passwordResetToken: null, 
      passwordResetExpiry: null 
    }).where(eq(users.id, userId));
  }

  async setAdminLoginToken(userId: number, token: string): Promise<void> {
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await db.update(users).set({ 
      adminLoginToken: token,
      adminLoginExpiry: expiry
    }).where(eq(users.id, userId));
  }

  async verifyAdminLoginToken(userId: number, token: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user || user.adminLoginToken !== token) {
      return false;
    }
    
    if (!user.adminLoginExpiry || user.adminLoginExpiry < new Date()) {
      return false;
    }
    
    return true;
  }

  async clearAdminLoginToken(userId: number): Promise<void> {
    await db.update(users).set({ 
      adminLoginToken: null, 
      adminLoginExpiry: null 
    }).where(eq(users.id, userId));
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

  async updateUserAvatar(userId: number, avatarUrl: string | null): Promise<void> {
    await db.update(users).set({ avatarUrl }).where(eq(users.id, userId));
  }

  async updateUserLastSeen(userId: number): Promise<void> {
    await db.update(users).set({ lastSeen: sql`now()` }).where(eq(users.id, userId));
  }

  // Pending Users - for email verification before full registration
  async createPendingUser(data: { email: string; password: string; username: string; verificationCode: string; ipAddress: string; userAgent?: string; termsAccepted: boolean; expiresAt: Date }): Promise<PendingUser> {
    const [pendingUser] = await db.insert(pendingUsers).values(data).returning();
    if (!pendingUser) throw new Error("Failed to create pending user");
    return pendingUser;
  }

  async getPendingUserByEmail(email: string): Promise<PendingUser | undefined> {
    const results = await db.select().from(pendingUsers).where(sql`LOWER(${pendingUsers.email}) = LOWER(${email})`).limit(1);
    return results[0];
  }

  async getPendingUserByUsername(username: string): Promise<PendingUser | undefined> {
    const results = await db.select().from(pendingUsers).where(sql`LOWER(${pendingUsers.username}) = LOWER(${username})`).limit(1);
    return results[0];
  }

  async getPendingUserByCode(code: string): Promise<PendingUser | undefined> {
    const results = await db.select().from(pendingUsers).where(eq(pendingUsers.verificationCode, code)).limit(1);
    return results[0];
  }

  async deletePendingUser(id: number): Promise<void> {
    await db.delete(pendingUsers).where(eq(pendingUsers.id, id));
  }

  async movePendingToUsers(pendingUserId: number): Promise<User> {
    // Use transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Get pending user
      const [pendingUser] = await tx.select().from(pendingUsers).where(eq(pendingUsers.id, pendingUserId));
      if (!pendingUser) {
        throw new Error("Pending user not found");
      }

      // Check if email or username already exists in users table (race condition protection)
      const existingByEmail = await tx.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${pendingUser.email})`).limit(1);
      if (existingByEmail.length > 0) {
        throw new Error("Email already registered");
      }

      const existingByUsername = await tx.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${pendingUser.username})`).limit(1);
      if (existingByUsername.length > 0) {
        throw new Error("Username already taken");
      }

      // Create verified user
      const [newUser] = await tx.insert(users).values({
        email: pendingUser.email,
        password: pendingUser.password, // Already hashed
        username: pendingUser.username,
        termsAccepted: pendingUser.termsAccepted,
        emailVerified: true, // They verified via email
        role: "user",
        banned: false,
      }).returning();
      
      if (!newUser) throw new Error("Failed to create user");

      // Delete pending user
      await tx.delete(pendingUsers).where(eq(pendingUsers.id, pendingUserId));

      return newUser;
    });
  }

  async cleanupExpiredPendingUsers(): Promise<number> {
    const result = await db.delete(pendingUsers).where(sql`${pendingUsers.expiresAt} < now()`);
    return result.rowCount || 0;
  }

  // Registration Rate Limiting
  async createRegistrationAttempt(data: { ipAddress: string; email?: string; userAgent?: string }): Promise<RegistrationAttempt> {
    const [attempt] = await db.insert(registrationAttempts).values(data).returning();
    if (!attempt) throw new Error("Failed to create registration attempt");
    return attempt;
  }

  async getRecentRegistrationAttempts(ipAddress: string, minutesAgo: number): Promise<RegistrationAttempt[]> {
    return await db
      .select()
      .from(registrationAttempts)
      .where(
        and(
          eq(registrationAttempts.ipAddress, ipAddress),
          sql`${registrationAttempts.attemptedAt} > now() - interval '${sql.raw(minutesAgo.toString())} minutes'`
        )
      )
      .orderBy(desc(registrationAttempts.attemptedAt));
  }

  async cleanupOldRegistrationAttempts(hoursAgo: number): Promise<number> {
    const result = await db.delete(registrationAttempts).where(
      sql`${registrationAttempts.attemptedAt} < now() - interval '${sql.raw(hoursAgo.toString())} hours'`
    );
    return result.rowCount || 0;
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

  async getMaintenanceMode(): Promise<boolean> {
    const setting = await this.getSetting('maintenance_mode');
    return setting?.value === 'true';
  }

  async setMaintenanceMode(isActive: boolean): Promise<void> {
    await this.setSetting('maintenance_mode', isActive.toString());
  }

  // Newsletter functions
  async createNewsletterSubscriber(email: string, confirmationToken: string): Promise<NewsletterSubscriber> {
    const [subscriber] = await db.insert(newsletterSubscribers)
      .values({
        email: email.toLowerCase(),
        confirmationToken,
        status: 'pending',
      })
      .returning();
    return subscriber!;
  }

  async getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined> {
    const [subscriber] = await db.select()
      .from(newsletterSubscribers)
      .where(sql`LOWER(${newsletterSubscribers.email}) = LOWER(${email})`)
      .limit(1);
    return subscriber;
  }

  async getNewsletterSubscriberByToken(token: string): Promise<NewsletterSubscriber | undefined> {
    const [subscriber] = await db.select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.confirmationToken, token))
      .limit(1);
    return subscriber;
  }

  async confirmNewsletterSubscription(token: string): Promise<boolean> {
    const subscriber = await this.getNewsletterSubscriberByToken(token);
    
    if (!subscriber || subscriber.status === 'confirmed') {
      return false;
    }

    await db.update(newsletterSubscribers)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmationToken: null,
      })
      .where(eq(newsletterSubscribers.id, subscriber.id));

    return true;
  }

  async unsubscribeNewsletter(email: string): Promise<boolean> {
    const subscriber = await this.getNewsletterSubscriberByEmail(email);
    
    if (!subscriber || subscriber.status === 'unsubscribed') {
      return false;
    }

    await db.update(newsletterSubscribers)
      .set({
        status: 'unsubscribed',
        unsubscribedAt: new Date(),
      })
      .where(eq(newsletterSubscribers.id, subscriber.id));

    return true;
  }

  async deleteNewsletterSubscriber(id: number): Promise<boolean> {
    const result = await db.delete(newsletterSubscribers)
      .where(eq(newsletterSubscribers.id, id))
      .returning();
    
    return result.length > 0;
  }

  async getAllNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return await db.select()
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.subscribedAt));
  }

  async getConfirmedNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return await db.select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.status, 'confirmed'))
      .orderBy(desc(newsletterSubscribers.confirmedAt));
  }

  async getNewsletterStats(): Promise<{ total: number; confirmed: number; pending: number }> {
    const allSubscribers = await db.select()
      .from(newsletterSubscribers)
      .where(sql`${newsletterSubscribers.status} != 'unsubscribed'`);

    const total = allSubscribers.length;
    const confirmed = allSubscribers.filter(s => s.status === 'confirmed').length;
    const pending = allSubscribers.filter(s => s.status === 'pending').length;

    return { total, confirmed, pending };
  }

  // Video Spots
  async getVideoSpots(): Promise<VideoSpot[]> {
    return await db
      .select()
      .from(videoSpots)
      .orderBy(videoSpots.order, desc(videoSpots.createdAt));
  }

  async createVideoSpot(data: InsertVideoSpot): Promise<VideoSpot> {
    const [result] = await db
      .insert(videoSpots)
      .values(data)
      .returning();
    return result!;
  }

  async updateVideoSpot(id: number, data: InsertVideoSpot): Promise<VideoSpot> {
    const [result] = await db
      .update(videoSpots)
      .set(data)
      .where(eq(videoSpots.id, id))
      .returning();
    if (!result) throw new Error("Video spot not found");
    return result;
  }

  async deleteVideoSpot(id: number): Promise<void> {
    await db.delete(videoSpots).where(eq(videoSpots.id, id));
  }

  async updateVideoSpotOrder(id: number, order: number): Promise<VideoSpot> {
    const [result] = await db
      .update(videoSpots)
      .set({ order })
      .where(eq(videoSpots.id, id))
      .returning();
    if (!result) throw new Error("Video spot not found");
    return result;
  }

  // User Songs
  async createUserSong(data: { userId: number; songTitle: string; artistName: string; youtubeUrl: string }): Promise<UserSong> {
    const [result] = await db
      .insert(userSongs)
      .values({
        userId: data.userId,
        songTitle: data.songTitle,
        artistName: data.artistName,
        youtubeUrl: data.youtubeUrl,
      })
      .returning();
    return result!;
  }

  async getUserSongById(id: number): Promise<UserSong | undefined> {
    const [result] = await db
      .select()
      .from(userSongs)
      .where(eq(userSongs.id, id));
    return result || undefined;
  }

  async getUserSongs(userId: number): Promise<UserSong[]> {
    return await db
      .select()
      .from(userSongs)
      .where(eq(userSongs.userId, userId))
      .orderBy(desc(userSongs.submittedAt));
  }

  async getAllUserSongs(): Promise<Array<UserSong & { username: string }>> {
    const results = await db
      .select({
        id: userSongs.id,
        userId: userSongs.userId,
        songTitle: userSongs.songTitle,
        artistName: userSongs.artistName,
        youtubeUrl: userSongs.youtubeUrl,
        submittedAt: userSongs.submittedAt,
        approved: userSongs.approved,
        votesCount: userSongs.votesCount,
        username: users.username,
      })
      .from(userSongs)
      .leftJoin(users, eq(userSongs.userId, users.id))
      .orderBy(desc(userSongs.submittedAt));
    
    return results.map(r => ({
      ...r,
      username: r.username || 'Unknown',
    }));
  }

  async deleteUserSong(id: number): Promise<void> {
    await db.delete(userSongs).where(eq(userSongs.id, id));
  }

  async approveUserSong(id: number): Promise<void> {
    await db
      .update(userSongs)
      .set({ approved: true })
      .where(eq(userSongs.id, id));
  }

  async getUserLastSongSubmissionTime(userId: number): Promise<Date | null> {
    const [result] = await db
      .select({ submittedAt: userSongs.submittedAt })
      .from(userSongs)
      .where(eq(userSongs.userId, userId))
      .orderBy(desc(userSongs.submittedAt))
      .limit(1);
    
    if (!result?.submittedAt) {
      return null;
    }
    
    return new Date(result.submittedAt);
  }

  async getApprovedUserSongs(userId?: number): Promise<Array<UserSong & { username: string; hasVoted: boolean }>> {
    const results = await db
      .select({
        id: userSongs.id,
        userId: userSongs.userId,
        songTitle: userSongs.songTitle,
        artistName: userSongs.artistName,
        youtubeUrl: userSongs.youtubeUrl,
        submittedAt: userSongs.submittedAt,
        approved: userSongs.approved,
        votesCount: userSongs.votesCount,
        username: users.username,
        voteId: userId ? userSongVotes.id : sql<number | null>`NULL`,
      })
      .from(userSongs)
      .leftJoin(users, eq(userSongs.userId, users.id))
      .leftJoin(
        userSongVotes,
        userId 
          ? and(eq(userSongVotes.songId, userSongs.id), eq(userSongVotes.userId, userId))
          : sql`false`
      )
      .where(eq(userSongs.approved, true))
      .orderBy(desc(userSongs.votesCount), desc(userSongs.submittedAt));
    
    return results.map(r => ({
      id: r.id,
      userId: r.userId,
      songTitle: r.songTitle,
      artistName: r.artistName,
      youtubeUrl: r.youtubeUrl,
      submittedAt: r.submittedAt,
      approved: r.approved,
      votesCount: r.votesCount,
      username: r.username || "Unknown",
      hasVoted: r.voteId !== null,
    }));
  }

  async toggleUserSongVote(userId: number, songId: number): Promise<{ voted: boolean; votesCount: number }> {
    return await db.transaction(async (tx) => {
      // Check if user has already voted
      const [existingVote] = await tx
        .select()
        .from(userSongVotes)
        .where(and(eq(userSongVotes.userId, userId), eq(userSongVotes.songId, songId)));
      
      if (existingVote) {
        // Remove vote (atomic decrement)
        await tx
          .delete(userSongVotes)
          .where(eq(userSongVotes.id, existingVote.id));
        
        await tx
          .update(userSongs)
          .set({ votesCount: sql`${userSongs.votesCount} - 1` })
          .where(eq(userSongs.id, songId));
        
        const [updated] = await tx
          .select({ votesCount: userSongs.votesCount })
          .from(userSongs)
          .where(eq(userSongs.id, songId));
        
        return { voted: false, votesCount: updated?.votesCount || 0 };
      } else {
        // Add vote (atomic increment)
        await tx
          .insert(userSongVotes)
          .values({ userId, songId });
        
        await tx
          .update(userSongs)
          .set({ votesCount: sql`${userSongs.votesCount} + 1` })
          .where(eq(userSongs.id, songId));
        
        const [updated] = await tx
          .select({ votesCount: userSongs.votesCount })
          .from(userSongs)
          .where(eq(userSongs.id, songId));
        
        return { voted: true, votesCount: updated?.votesCount || 1 };
      }
    });
  }

  async hasUserVotedForSong(userId: number, songId: number): Promise<boolean> {
    const [result] = await db
      .select()
      .from(userSongVotes)
      .where(and(eq(userSongVotes.userId, userId), eq(userSongVotes.songId, songId)));
    
    return !!result;
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

  // Messaging methods
  async searchUsers(query: string, currentUserId: number): Promise<Array<{ id: number; username: string; email: string }>> {
    const results = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          sql`LOWER(${users.username}) LIKE LOWER(${`%${query}%`})`,
          sql`${users.id} != ${currentUserId}`,
          eq(users.banned, false),
          eq(users.emailVerified, true)
        )
      )
      .limit(10);
    return results;
  }

  async getOrCreateConversation(user1Id: number, user2Id: number): Promise<Conversation> {
    const existing = await this.getConversation(user1Id, user2Id);
    if (existing) return existing;

    const [canonicalUser1, canonicalUser2] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];
    
    const [conversation] = await db
      .insert(conversations)
      .values({ user1Id: canonicalUser1, user2Id: canonicalUser2 })
      .returning();
    return conversation!;
  }

  async getConversation(user1Id: number, user2Id: number): Promise<Conversation | undefined> {
    const [canonicalUser1, canonicalUser2] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];
    
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.user1Id, canonicalUser1),
          eq(conversations.user2Id, canonicalUser2)
        )
      );
    return conversation || undefined;
  }

  async getUserConversations(userId: number): Promise<Array<Conversation & { otherUser: { id: number; username: string; avatarUrl: string | null }; lastMessage?: Message; unreadCount: number }>> {
    const userConvos = await db
      .select()
      .from(conversations)
      .where(
        sql`${conversations.user1Id} = ${userId} OR ${conversations.user2Id} = ${userId}`
      )
      .orderBy(desc(conversations.lastMessageAt));

    const results = await Promise.all(
      userConvos.map(async (convo) => {
        const otherUserId = convo.user1Id === userId ? convo.user2Id : convo.user1Id;
        const [otherUser] = await db
          .select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.id, otherUserId));

        const [lastMsg] = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, convo.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        const unreadMsgs = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .leftJoin(
            messageReads,
            and(
              eq(messageReads.messageId, messages.id),
              eq(messageReads.userId, userId)
            )
          )
          .where(
            and(
              eq(messages.conversationId, convo.id),
              sql`${messages.receiverId} = ${userId}`,
              sql`${messageReads.id} IS NULL`
            )
          );

        return {
          ...convo,
          otherUser: otherUser!,
          lastMessage: lastMsg || undefined,
          unreadCount: Number(unreadMsgs[0]?.count ?? 0),
        };
      })
    );

    return results;
  }

  async sendMessage(senderId: number, receiverId: number, content: string, imageUrl?: string): Promise<Message> {
    const conversation = await this.getOrCreateConversation(senderId, receiverId);

    const [message] = await db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        senderId,
        receiverId,
        content,
        imageUrl,
      })
      .returning();

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversation.id));

    return message!;
  }

  async getMessageById(messageId: number): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));
    
    return message || undefined;
  }

  async getConversationMessages(conversationId: number, userId: number): Promise<Message[]> {
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    return msgs;
  }

  async markMessagesAsRead(conversationId: number, userId: number): Promise<void> {
    const unreadMessages = await db
      .select({ id: messages.id })
      .from(messages)
      .leftJoin(
        messageReads,
        and(
          eq(messageReads.messageId, messages.id),
          eq(messageReads.userId, userId)
        )
      )
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.receiverId, userId),
          sql`${messageReads.id} IS NULL`
        )
      );

    for (const msg of unreadMessages) {
      await db.insert(messageReads).values({
        messageId: msg.id,
        userId,
      });
    }
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .leftJoin(
        messageReads,
        and(
          eq(messageReads.messageId, messages.id),
          eq(messageReads.userId, userId)
        )
      )
      .where(
        and(
          eq(messages.receiverId, userId),
          sql`${messageReads.id} IS NULL`
        )
      );

    return Number(result?.count ?? 0);
  }

  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));

    if (!message || message.senderId !== userId) {
      return false;
    }

    await db
      .update(messages)
      .set({ deleted: true })
      .where(eq(messages.id, messageId));

    return true;
  }

  async adminGetAllConversations(): Promise<Array<{ id: number; user1Id: number; user2Id: number; user1Username: string; user2Username: string; user1AvatarUrl: string | null; user2AvatarUrl: string | null; messageCount: number; lastMessageAt: Date | null; lastMessageContent: string | null; lastMessageSenderUsername: string | null; lastMessageDeleted: boolean }>> {
    const allConvos = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt));

    const results = await Promise.all(
      allConvos.map(async (convo) => {
        const [user1] = await db
          .select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.id, convo.user1Id));

        const [user2] = await db
          .select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.id, convo.user2Id));

        const [msgCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(eq(messages.conversationId, convo.id));

        // Get last message with sender info
        const [lastMsg] = await db
          .select({
            content: messages.content,
            senderId: messages.senderId,
            deleted: messages.deleted,
          })
          .from(messages)
          .where(eq(messages.conversationId, convo.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        let lastMessageSenderUsername: string | null = null;
        if (lastMsg) {
          const [sender] = await db
            .select({ username: users.username })
            .from(users)
            .where(eq(users.id, lastMsg.senderId));
          lastMessageSenderUsername = sender?.username || null;
        }

        return {
          id: convo.id,
          user1Id: convo.user1Id,
          user2Id: convo.user2Id,
          user1Username: user1?.username || 'Unknown',
          user2Username: user2?.username || 'Unknown',
          user1AvatarUrl: user1?.avatarUrl || null,
          user2AvatarUrl: user2?.avatarUrl || null,
          messageCount: Number(msgCount?.count ?? 0),
          lastMessageAt: convo.lastMessageAt,
          lastMessageContent: lastMsg?.content || null,
          lastMessageSenderUsername,
          lastMessageDeleted: lastMsg?.deleted || false,
        };
      })
    );

    return results;
  }

  async adminGetConversationMessages(user1Id: number, user2Id: number): Promise<Message[]> {
    const conversation = await this.getConversation(user1Id, user2Id);
    if (!conversation) return [];

    const msgs = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        content: messages.content,
        imageUrl: messages.imageUrl,
        createdAt: messages.createdAt,
        deleted: messages.deleted,
        senderUsername: users.username,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(messages.createdAt);

    return msgs as any;
  }

  async adminDeleteMessage(messageId: number): Promise<boolean> {
    await db
      .update(messages)
      .set({ deleted: true })
      .where(eq(messages.id, messageId));
    return true;
  }

  async adminLogConversationView(adminId: number, viewedUser1Id: number, viewedUser2Id: number): Promise<void> {
    await db.insert(adminMessageAudit).values({
      adminId,
      viewedUser1Id,
      viewedUser2Id,
    });
  }

  async adminGetAuditLogs(): Promise<Array<AdminMessageAudit & { adminUsername: string; user1Username: string; user2Username: string }>> {
    const logs = await db
      .select({
        id: adminMessageAudit.id,
        adminId: adminMessageAudit.adminId,
        viewedUser1Id: adminMessageAudit.viewedUser1Id,
        viewedUser2Id: adminMessageAudit.viewedUser2Id,
        viewedAt: adminMessageAudit.viewedAt,
      })
      .from(adminMessageAudit)
      .orderBy(desc(adminMessageAudit.viewedAt));

    const results = await Promise.all(
      logs.map(async (log) => {
        const [admin] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, log.adminId));

        const [user1] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, log.viewedUser1Id));

        const [user2] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, log.viewedUser2Id));

        return {
          ...log,
          adminUsername: admin?.username ?? 'Unknown',
          user1Username: user1?.username ?? 'Unknown',
          user2Username: user2?.username ?? 'Unknown',
        };
      })
    );

    return results;
  }

  async adminExportConversation(user1Id: number, user2Id: number): Promise<string> {
    const [smallerId, largerId] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

    const conversation = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.user1Id, smallerId),
          eq(conversations.user2Id, largerId)
        )
      )
      .limit(1);

    if (!conversation[0]) {
      throw new Error("Conversation not found");
    }

    const user1 = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, user1Id))
      .limit(1);

    const user2 = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, user2Id))
      .limit(1);

    if (!user1[0] || !user2[0]) {
      throw new Error("Users not found");
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation[0].id))
      .orderBy(messages.createdAt);

    let txtContent = `Konverzacija između: ${user1[0].username} i ${user2[0].username}\n`;
    txtContent += `Datum izvoza: ${new Date().toLocaleString("sr-RS")}\n`;
    txtContent += `Ukupno poruka: ${msgs.length}\n`;
    txtContent += `\n${"=".repeat(60)}\n\n`;

    for (const msg of msgs) {
      const senderUsername = msg.senderId === user1Id ? user1[0].username : user2[0].username;
      const timestamp = new Date(msg.createdAt).toLocaleString("sr-RS");
      const deletedSuffix = msg.deleted ? " (OBRISANA)" : "";
      const content = msg.deleted ? "[Poruka obrisana]" : msg.content;
      
      txtContent += `[${timestamp}] ${senderUsername}: ${content}${deletedSuffix}\n`;
    }

    return txtContent;
  }

  async adminGetMessagingStats(): Promise<{ totalMessages: number; totalConversations: number; deletedMessages: number; activeConversations: number }> {
    const [totalMessagesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages);

    const [totalConversationsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations);

    const [deletedMessagesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.deleted, true));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [activeConversationsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(sql`${conversations.lastMessageAt} >= ${thirtyDaysAgo}`);

    return {
      totalMessages: Number(totalMessagesResult?.count ?? 0),
      totalConversations: Number(totalConversationsResult?.count ?? 0),
      deletedMessages: Number(deletedMessagesResult?.count ?? 0),
      activeConversations: Number(activeConversationsResult?.count ?? 0),
    };
  }

  // Contracts
  async createContract(data: InsertContract): Promise<Contract> {
    const [contract] = await db.insert(contracts).values(data).returning();
    return contract!;
  }

  async getAllContracts(): Promise<Array<Contract & { username: string | null }>> {
    const result = await db
      .select({
        id: contracts.id,
        contractNumber: contracts.contractNumber,
        contractType: contracts.contractType,
        contractData: contracts.contractData,
        pdfPath: contracts.pdfPath,
        clientEmail: contracts.clientEmail,
        createdAt: contracts.createdAt,
        createdBy: contracts.createdBy,
        userId: contracts.userId,
        username: users.username,
      })
      .from(contracts)
      .leftJoin(users, eq(contracts.userId, users.id))
      .orderBy(desc(contracts.createdAt));
    
    return result as Array<Contract & { username: string | null }>;
  }

  async getContractById(id: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract || undefined;
  }

  async getNextContractNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const yearSuffix = `${currentYear}`;
    
    // Get the latest contract for this year (format: NNN/YYYY)
    const [latestContract] = await db
      .select()
      .from(contracts)
      .where(sql`${contracts.contractNumber} LIKE ${'%/' + yearSuffix}`)
      .orderBy(desc(contracts.contractNumber))
      .limit(1);

    if (!latestContract) {
      return `001/${yearSuffix}`;
    }

    // Extract number from format "NNN/YYYY"
    const parts = latestContract.contractNumber.split('/');
    if (parts.length < 2 || !parts[0]) {
      return `001/${yearSuffix}`;
    }
    
    const lastNumber = parseInt(parts[0]);
    const nextNumber = lastNumber + 1;
    
    return `${nextNumber.toString().padStart(3, '0')}/${yearSuffix}`;
  }

  async updateContractUser(contractId: number, userId: number | null): Promise<void> {
    await db.update(contracts).set({ userId }).where(eq(contracts.id, contractId));
  }

  async deleteContract(id: number): Promise<void> {
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  // Get next invoice number
  async getNextInvoiceNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const yearPrefix = `INV-${currentYear}`;
    
    // Get the latest invoice for this year (format: INV-YYYY-NNN)
    const [latestInvoice] = await db
      .select()
      .from(invoices)
      .where(sql`${invoices.invoiceNumber} LIKE ${yearPrefix + '-%'}`)
      .orderBy(desc(invoices.invoiceNumber))
      .limit(1);

    if (!latestInvoice) {
      return `${yearPrefix}-001`;
    }

    // Extract number from format "INV-YYYY-NNN"
    const parts = latestInvoice.invoiceNumber.split('-');
    if (parts.length < 3 || !parts[2]) {
      return `${yearPrefix}-001`;
    }
    
    const lastNumber = parseInt(parts[2]);
    const nextNumber = lastNumber + 1;
    
    return `${yearPrefix}-${nextNumber.toString().padStart(3, '0')}`;
  }

  // Invoices
  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    // Generate invoice number if not provided
    const invoiceNumber = data.invoiceNumber || await this.getNextInvoiceNumber();
    
    // Convert amount to string for numeric column and dates to Date objects
    const invoiceData = {
      ...data,
      invoiceNumber,
      amount: typeof data.amount === 'number' ? data.amount.toString() : data.amount,
      dueDate: typeof data.dueDate === 'string' ? new Date(data.dueDate) : data.dueDate,
      paidDate: data.paidDate ? (typeof data.paidDate === 'string' ? new Date(data.paidDate) : data.paidDate) : null,
    };
    const [invoice] = await db.insert(invoices).values([invoiceData]).returning();
    if (!invoice) throw new Error("Failed to create invoice");
    return invoice;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getUserInvoices(userId: number): Promise<Array<Invoice & { contractNumber: string | null; contractType: string | null }>> {
    const results = await db
      .select({
        id: invoices.id,
        userId: invoices.userId,
        contractId: invoices.contractId,
        invoiceNumber: invoices.invoiceNumber,
        amount: invoices.amount,
        currency: invoices.currency,
        status: invoices.status,
        description: invoices.description,
        notes: invoices.notes,
        issuedDate: invoices.issuedDate,
        dueDate: invoices.dueDate,
        paidDate: invoices.paidDate,
        createdAt: invoices.createdAt,
        createdBy: invoices.createdBy,
        contractNumber: contracts.contractNumber,
        contractType: contracts.contractType,
      })
      .from(invoices)
      .leftJoin(contracts, eq(invoices.contractId, contracts.id))
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.dueDate));
    
    return results.map(r => ({
      id: r.id,
      userId: r.userId,
      contractId: r.contractId,
      invoiceNumber: r.invoiceNumber,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      description: r.description,
      notes: r.notes,
      issuedDate: r.issuedDate,
      dueDate: r.dueDate,
      paidDate: r.paidDate,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      contractNumber: r.contractNumber,
      contractType: r.contractType,
    }));
  }

  async getInvoiceById(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async updateInvoiceStatus(id: number, status: string, paidDate?: Date): Promise<void> {
    await db
      .update(invoices)
      .set({ status: status as any, paidDate: paidDate || null })
      .where(eq(invoices.id, id));
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  // Dashboard
  async getUserProjects(userId: number): Promise<Array<Project & { username: string }>> {
    const results = await db
      .select({
        id: projects.id,
        userId: projects.userId,
        title: projects.title,
        description: projects.description,
        genre: projects.genre,
        mp3Url: projects.mp3Url,
        uploadDate: projects.uploadDate,
        votesCount: projects.votesCount,
        currentMonth: projects.currentMonth,
        approved: projects.approved,
        status: projects.status,
        username: users.username,
      })
      .from(projects)
      .leftJoin(users, eq(projects.userId, users.id))
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.uploadDate));
    
    return results.map(r => ({
      id: r.id,
      userId: r.userId,
      title: r.title,
      description: r.description,
      genre: r.genre,
      mp3Url: r.mp3Url,
      uploadDate: r.uploadDate,
      votesCount: r.votesCount,
      currentMonth: r.currentMonth,
      approved: r.approved,
      status: r.status,
      username: r.username || "Unknown",
    }));
  }

  async getUserContracts(userId: number): Promise<Array<Contract & { username: string }>> {
    // Get user to match contracts by userId or email
    const user = await this.getUser(userId);
    if (!user) return [];
    
    // Get contracts where:
    // 1. userId matches directly (preferred), OR
    // 2. clientEmail matches user's email (fallback for older contracts)
    const results = await db
      .select({
        id: contracts.id,
        contractNumber: contracts.contractNumber,
        contractType: contracts.contractType,
        clientEmail: contracts.clientEmail,
        userId: contracts.userId,
        pdfPath: contracts.pdfPath,
        contractData: contracts.contractData,
        createdAt: contracts.createdAt,
        createdBy: contracts.createdBy,
        username: users.username,
      })
      .from(contracts)
      .leftJoin(users, eq(contracts.clientEmail, users.email))
      .where(
        or(
          eq(contracts.userId, userId),
          eq(contracts.clientEmail, user.email)
        )
      )
      .orderBy(desc(contracts.createdAt));
    
    return results.map(r => ({
      id: r.id,
      contractNumber: r.contractNumber,
      contractType: r.contractType,
      clientEmail: r.clientEmail,
      userId: r.userId,
      pdfPath: r.pdfPath,
      contractData: r.contractData,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      username: r.username || "Unknown",
    }));
  }

  async getDashboardOverview(userId: number): Promise<{
    totalProjects: number;
    projectsByStatus: Record<string, number>;
    totalContracts: number;
    totalInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalAmountPending: string;
    unreadMessages: number;
  }> {
    // Get all user projects
    const userProjects = await this.getUserProjects(userId);
    
    // Count projects by status
    const projectsByStatus = userProjects.reduce((acc, project) => {
      const status = project.status || 'waiting';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get user contracts
    const userContracts = await this.getUserContracts(userId);

    // Get user invoices with dynamic overdue status
    const userInvoices = await db
      .select({
        id: invoices.id,
        status: invoices.status,
        amount: invoices.amount,
        dueDate: invoices.dueDate,
        isOverdue: sql<boolean>`${invoices.dueDate} < now() AND ${invoices.status} = 'pending'`,
      })
      .from(invoices)
      .where(eq(invoices.userId, userId));

    // Count invoices
    const pendingInvoices = userInvoices.filter(inv => 
      inv.status === 'pending' && !inv.isOverdue
    ).length;
    const overdueInvoices = userInvoices.filter(inv => inv.isOverdue).length;

    // Calculate total amount pending (including overdue)
    const totalAmountPending = userInvoices
      .filter(inv => inv.status === 'pending' || inv.isOverdue)
      .reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0)
      .toFixed(2);

    // Get unread message count
    const unreadMessages = await this.getUnreadMessageCount(userId);

    return {
      totalProjects: userProjects.length,
      projectsByStatus,
      totalContracts: userContracts.length,
      totalInvoices: userInvoices.length,
      pendingInvoices,
      overdueInvoices,
      totalAmountPending,
      unreadMessages,
    };
  }

  async updateProjectStatus(projectId: number, status: string): Promise<void> {
    await db
      .update(projects)
      .set({ status: status as any })
      .where(eq(projects.id, projectId));
  }

  // Analytics
  async getNewUsersCount(period: 'today' | 'week' | 'month'): Promise<number> {
    const now = new Date();
    let startDate: Date;

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate = new Date(now.getTime() - diff * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`${users.createdAt} >= ${startDate}`);

    return result[0]?.count || 0;
  }

  async getTopProjects(limit: number): Promise<Array<Project & { username: string; votesCount: number }>> {
    const result = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        genre: projects.genre,
        mp3Url: projects.mp3Url,
        userId: projects.userId,
        votesCount: projects.votesCount,
        currentMonth: projects.currentMonth,
        uploadDate: projects.uploadDate,
        approved: projects.approved,
        status: projects.status,
        username: users.username,
      })
      .from(projects)
      .leftJoin(users, eq(projects.userId, users.id))
      .orderBy(desc(projects.votesCount))
      .limit(limit);

    return result.map(r => ({
      ...r,
      username: r.username || 'Unknown',
    }));
  }

  async getApprovedSongsCount(period: 'today' | 'week' | 'month'): Promise<number> {
    const now = new Date();
    let startDate: Date;

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate = new Date(now.getTime() - diff * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userSongs)
      .where(and(
        eq(userSongs.approved, true),
        sql`${userSongs.submittedAt} >= ${startDate}`
      ));

    return result[0]?.count || 0;
  }

  async getContractStats(): Promise<{ total: number; byType: Record<string, number> }> {
    const allContracts = await db.select().from(contracts);
    const total = allContracts.length;
    
    const byType: Record<string, number> = {};
    allContracts.forEach(contract => {
      const type = contract.contractType || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });

    return { total, byType };
  }

  async getUnreadConversationsCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(DISTINCT ${messages.conversationId})::int` })
      .from(messages)
      .leftJoin(
        messageReads,
        and(
          eq(messages.id, messageReads.messageId),
          sql`${messageReads.userId} = ${messages.receiverId}`
        )
      )
      .where(and(
        eq(messages.deleted, false),
        sql`${messageReads.id} IS NULL`
      ));

    return result[0]?.count || 0;
  }

  // Community Chat
  async canUserSendMessage(userId: number): Promise<boolean> {
    try {
      const [lastMessage] = await db
        .select()
        .from(communityMessages)
        .where(eq(communityMessages.userId, userId))
        .orderBy(desc(communityMessages.createdAt))
        .limit(1);

      if (!lastMessage) {
        return true;
      }

      const result = await db
        .select({ 
          canSend: sql<boolean>`NOW() - INTERVAL '10 seconds' >= ${lastMessage.createdAt}` 
        })
        .from(communityMessages)
        .limit(1);

      return result[0]?.canSend ?? true;
    } catch (error) {
      console.error('Error checking message rate limit:', error);
      return false;
    }
  }

  async createCommunityMessage(userId: number, message: string): Promise<CommunityMessage> {
    try {
      const canSend = await this.canUserSendMessage(userId);
      
      if (!canSend) {
        throw new Error('Možete slati poruke samo jednom na 10 sekundi');
      }

      const newMessage = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(communityMessages)
          .values({ userId, message })
          .returning();

        if (!inserted) {
          throw new Error('Failed to create community message');
        }

        await tx.execute(sql`
          DELETE FROM community_messages
          WHERE id IN (
            SELECT id FROM community_messages
            ORDER BY created_at DESC, id DESC
            OFFSET 20
          )
        `);

        return inserted;
      });

      return newMessage;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create community message');
    }
  }

  async getCommunityMessages(limit?: number): Promise<Array<CommunityMessage & { username: string; rank: string; avatarUrl: string | null }>> {
    try {
      const effectiveLimit = Math.min(limit || 20, 20);

      const results = await db
        .select({
          id: communityMessages.id,
          userId: communityMessages.userId,
          message: communityMessages.message,
          createdAt: communityMessages.createdAt,
          username: users.username,
          rank: users.rank,
          avatarUrl: users.avatarUrl,
        })
        .from(communityMessages)
        .leftJoin(users, eq(communityMessages.userId, users.id))
        .orderBy(desc(communityMessages.createdAt))
        .limit(effectiveLimit);

      return results.map(r => ({
        id: r.id,
        userId: r.userId,
        message: r.message,
        createdAt: r.createdAt,
        username: r.username || 'Unknown',
        rank: r.rank || 'user',
        avatarUrl: r.avatarUrl,
      }));
    } catch (error) {
      console.error('Error fetching community messages:', error);
      return [];
    }
  }

  async deleteCommunityMessage(messageId: number, userId: number): Promise<boolean> {
    try {
      // Get the message to check ownership
      const [message] = await db
        .select()
        .from(communityMessages)
        .where(eq(communityMessages.id, messageId));

      if (!message) {
        return false; // Message not found
      }

      // Get user to check if admin
      const user = await this.getUser(userId);
      if (!user) {
        return false; // User not found
      }

      // Check if user is owner or admin
      const isOwner = message.userId === userId;
      const isAdmin = user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return false; // Not authorized
      }

      // Delete the message
      const result = await db
        .delete(communityMessages)
        .where(eq(communityMessages.id, messageId))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error('Error deleting community message:', error);
      return false;
    }
  }

  async clearAllCommunityMessages(): Promise<void> {
    try {
      await db.delete(communityMessages);
    } catch (error) {
      console.error('Error clearing all community messages:', error);
      throw new Error('Failed to clear all community messages');
    }
  }

  async updateUserRank(userId: number, rank: string): Promise<void> {
    try {
      const validRanks = ['user', 'vip', 'legend', 'admin'];
      
      if (!validRanks.includes(rank)) {
        throw new Error('Nevažeći rank');
      }

      await db
        .update(users)
        .set({ rank: rank as any })
        .where(eq(users.id, userId));
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update user rank');
    }
  }

  // Site Announcement
  async getSiteAnnouncement(): Promise<SiteAnnouncement> {
    try {
      const [announcement] = await db
        .select()
        .from(siteAnnouncement)
        .where(eq(siteAnnouncement.id, 1))
        .limit(1);

      // If no announcement exists, create default one
      if (!announcement) {
        const [newAnnouncement] = await db
          .insert(siteAnnouncement)
          .values({ id: 1, isActive: false, message: '' })
          .returning();
        return newAnnouncement!;
      }

      return announcement;
    } catch (error) {
      console.error('Error getting site announcement:', error);
      throw new Error('Failed to get site announcement');
    }
  }

  async upsertSiteAnnouncement(data: InsertSiteAnnouncement): Promise<SiteAnnouncement> {
    try {
      const [updated] = await db
        .insert(siteAnnouncement)
        .values({ id: 1, ...data, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: siteAnnouncement.id,
          set: { 
            isActive: data.isActive,
            message: data.message,
            updatedAt: new Date()
          }
        })
        .returning();

      return updated!;
    } catch (error) {
      console.error('Error upserting site announcement:', error);
      throw new Error('Failed to update site announcement');
    }
  }
}

export const storage = new DatabaseStorage();
