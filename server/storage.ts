import { 
  type User, type InsertUser,
  type Slate, type InsertSlate,
  type Game, type InsertGame,
  type Framework, type InsertFramework,
  type FrameworkRule, type InsertFrameworkRule,
  type FrameworkVersion, type InsertFrameworkVersion,
  type Evidence, type InsertEvidence,
  type DataSnapshot, type InsertDataSnapshot,
  type WhyFactor, type InsertWhyFactor,
  type AuditLog, type InsertAuditLog,
  users, slates, games, frameworks, frameworkRules, 
  frameworkVersions, evidence, dataSnapshots, whyFactors, auditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getSlates(): Promise<Slate[]>;
  getSlate(id: string): Promise<Slate | undefined>;
  createSlate(slate: InsertSlate): Promise<Slate>;
  updateSlate(id: string, slate: Partial<InsertSlate>): Promise<Slate | undefined>;
  deleteSlate(id: string): Promise<boolean>;

  getGames(slateId: string): Promise<Game[]>;
  getGame(id: string): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  createGames(games: InsertGame[]): Promise<Game[]>;
  updateGame(id: string, game: Partial<InsertGame>): Promise<Game | undefined>;
  deleteGame(id: string): Promise<boolean>;

  getFrameworks(): Promise<Framework[]>;
  getFramework(id: string): Promise<Framework | undefined>;
  getActiveFramework(): Promise<Framework | undefined>;
  createFramework(framework: InsertFramework): Promise<Framework>;
  updateFramework(id: string, framework: Partial<InsertFramework>): Promise<Framework | undefined>;
  deleteFramework(id: string): Promise<boolean>;

  getFrameworkRules(frameworkId: string): Promise<FrameworkRule[]>;
  createFrameworkRule(rule: InsertFrameworkRule): Promise<FrameworkRule>;
  updateFrameworkRule(id: string, rule: Partial<InsertFrameworkRule>): Promise<FrameworkRule | undefined>;
  deleteFrameworkRule(id: string): Promise<boolean>;

  getFrameworkVersions(frameworkId: string): Promise<FrameworkVersion[]>;
  createFrameworkVersion(version: InsertFrameworkVersion): Promise<FrameworkVersion>;

  getEvidence(gameId: string): Promise<Evidence[]>;
  getEvidenceByCategory(gameId: string, category: string): Promise<Evidence[]>;
  createEvidence(ev: InsertEvidence): Promise<Evidence>;
  createEvidenceBatch(items: InsertEvidence[]): Promise<Evidence[]>;

  getDataSnapshots(gameId: string): Promise<DataSnapshot[]>;
  getDataSnapshotsByType(gameId: string, type: string): Promise<DataSnapshot[]>;
  createDataSnapshot(snapshot: InsertDataSnapshot): Promise<DataSnapshot>;

  getWhyFactors(gameId: string): Promise<WhyFactor[]>;
  createWhyFactor(factor: InsertWhyFactor): Promise<WhyFactor>;
  createWhyFactors(factors: InsertWhyFactor[]): Promise<WhyFactor[]>;
  deleteWhyFactors(gameId: string): Promise<boolean>;

  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(entityType: string, entityId: string): Promise<AuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getSlates(): Promise<Slate[]> {
    return db.select().from(slates).orderBy(desc(slates.updatedAt));
  }

  async getSlate(id: string): Promise<Slate | undefined> {
    const [slate] = await db.select().from(slates).where(eq(slates.id, id));
    return slate || undefined;
  }

  async createSlate(insertSlate: InsertSlate): Promise<Slate> {
    const [slate] = await db.insert(slates).values(insertSlate).returning();
    return slate;
  }

  async updateSlate(id: string, updates: Partial<InsertSlate>): Promise<Slate | undefined> {
    const [slate] = await db.update(slates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(slates.id, id))
      .returning();
    return slate || undefined;
  }

  async deleteSlate(id: string): Promise<boolean> {
    const result = await db.delete(slates).where(eq(slates.id, id));
    return true;
  }

  async getGames(slateId: string): Promise<Game[]> {
    return db.select().from(games).where(eq(games.slateId, slateId)).orderBy(games.gameTime);
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game || undefined;
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await db.insert(games).values(insertGame).returning();
    return game;
  }

  async createGames(insertGames: InsertGame[]): Promise<Game[]> {
    if (insertGames.length === 0) return [];
    return db.insert(games).values(insertGames).returning();
  }

  async updateGame(id: string, updates: Partial<InsertGame>): Promise<Game | undefined> {
    const [game] = await db.update(games)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(games.id, id))
      .returning();
    return game || undefined;
  }

  async deleteGame(id: string): Promise<boolean> {
    await db.delete(games).where(eq(games.id, id));
    return true;
  }

  async getFrameworks(): Promise<Framework[]> {
    return db.select().from(frameworks).orderBy(desc(frameworks.updatedAt));
  }

  async getFramework(id: string): Promise<Framework | undefined> {
    const [framework] = await db.select().from(frameworks).where(eq(frameworks.id, id));
    return framework || undefined;
  }

  async getActiveFramework(): Promise<Framework | undefined> {
    const [framework] = await db.select().from(frameworks).where(eq(frameworks.isActive, true));
    return framework || undefined;
  }

  async createFramework(insertFramework: InsertFramework): Promise<Framework> {
    const [framework] = await db.insert(frameworks).values(insertFramework).returning();
    return framework;
  }

  async updateFramework(id: string, updates: Partial<InsertFramework>): Promise<Framework | undefined> {
    const [framework] = await db.update(frameworks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(frameworks.id, id))
      .returning();
    return framework || undefined;
  }

  async deleteFramework(id: string): Promise<boolean> {
    await db.delete(frameworks).where(eq(frameworks.id, id));
    return true;
  }

  async getFrameworkRules(frameworkId: string): Promise<FrameworkRule[]> {
    return db.select().from(frameworkRules)
      .where(eq(frameworkRules.frameworkId, frameworkId))
      .orderBy(frameworkRules.priority);
  }

  async createFrameworkRule(rule: InsertFrameworkRule): Promise<FrameworkRule> {
    const [result] = await db.insert(frameworkRules).values(rule).returning();
    return result;
  }

  async updateFrameworkRule(id: string, updates: Partial<InsertFrameworkRule>): Promise<FrameworkRule | undefined> {
    const [rule] = await db.update(frameworkRules)
      .set(updates)
      .where(eq(frameworkRules.id, id))
      .returning();
    return rule || undefined;
  }

  async deleteFrameworkRule(id: string): Promise<boolean> {
    await db.delete(frameworkRules).where(eq(frameworkRules.id, id));
    return true;
  }

  async getFrameworkVersions(frameworkId: string): Promise<FrameworkVersion[]> {
    return db.select().from(frameworkVersions)
      .where(eq(frameworkVersions.frameworkId, frameworkId))
      .orderBy(desc(frameworkVersions.version));
  }

  async createFrameworkVersion(version: InsertFrameworkVersion): Promise<FrameworkVersion> {
    const [result] = await db.insert(frameworkVersions).values(version).returning();
    return result;
  }

  async getEvidence(gameId: string): Promise<Evidence[]> {
    return db.select().from(evidence)
      .where(eq(evidence.gameId, gameId))
      .orderBy(desc(evidence.fetchedAt));
  }

  async getEvidenceByCategory(gameId: string, category: string): Promise<Evidence[]> {
    return db.select().from(evidence)
      .where(and(eq(evidence.gameId, gameId), eq(evidence.category, category)))
      .orderBy(desc(evidence.fetchedAt));
  }

  async createEvidence(ev: InsertEvidence): Promise<Evidence> {
    const [result] = await db.insert(evidence).values(ev).returning();
    return result;
  }

  async createEvidenceBatch(items: InsertEvidence[]): Promise<Evidence[]> {
    if (items.length === 0) return [];
    return db.insert(evidence).values(items).returning();
  }

  async getDataSnapshots(gameId: string): Promise<DataSnapshot[]> {
    return db.select().from(dataSnapshots)
      .where(eq(dataSnapshots.gameId, gameId))
      .orderBy(desc(dataSnapshots.fetchedAt));
  }

  async getDataSnapshotsByType(gameId: string, type: string): Promise<DataSnapshot[]> {
    return db.select().from(dataSnapshots)
      .where(and(eq(dataSnapshots.gameId, gameId), eq(dataSnapshots.type, type)))
      .orderBy(desc(dataSnapshots.fetchedAt));
  }

  async createDataSnapshot(snapshot: InsertDataSnapshot): Promise<DataSnapshot> {
    const [result] = await db.insert(dataSnapshots).values(snapshot).returning();
    return result;
  }

  async getWhyFactors(gameId: string): Promise<WhyFactor[]> {
    return db.select().from(whyFactors).where(eq(whyFactors.gameId, gameId));
  }

  async createWhyFactor(factor: InsertWhyFactor): Promise<WhyFactor> {
    const [result] = await db.insert(whyFactors).values(factor).returning();
    return result;
  }

  async createWhyFactors(factors: InsertWhyFactor[]): Promise<WhyFactor[]> {
    if (factors.length === 0) return [];
    return db.insert(whyFactors).values(factors).returning();
  }

  async deleteWhyFactors(gameId: string): Promise<boolean> {
    await db.delete(whyFactors).where(eq(whyFactors.gameId, gameId));
    return true;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [result] = await db.insert(auditLog).values(log).returning();
    return result;
  }

  async getAuditLogs(entityType: string, entityId: string): Promise<AuditLog[]> {
    return db.select().from(auditLog)
      .where(and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId)))
      .orderBy(desc(auditLog.createdAt));
  }
}

export const storage = new DatabaseStorage();
