import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const slates = pgTable("slates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sport: text("sport").notNull().default("NCAAF"),
  status: text("status").notNull().default("draft"),
  gameCount: integer("game_count").notNull().default(0),
  frameworkId: varchar("framework_id"),
  screenshotUrl: text("screenshot_url"),
  ocrRawText: text("ocr_raw_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const slatesRelations = relations(slates, ({ one, many }) => ({
  framework: one(frameworks, {
    fields: [slates.frameworkId],
    references: [frameworks.id],
  }),
  games: many(games),
}));

export const insertSlateSchema = createInsertSchema(slates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSlate = z.infer<typeof insertSlateSchema>;
export type Slate = typeof slates.$inferSelect;

export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slateId: varchar("slate_id").notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  homeTeamCanonical: text("home_team_canonical"),
  awayTeamCanonical: text("away_team_canonical"),
  gameTime: timestamp("game_time"),
  spread: real("spread"),
  spreadTeam: text("spread_team"),
  total: real("total"),
  moneylineHome: integer("moneyline_home"),
  moneylineAway: integer("moneyline_away"),
  status: text("status").notNull().default("pending"),
  pick: text("pick"),
  pickLine: real("pick_line"),
  pickEdge: real("pick_edge"),
  confidenceLow: real("confidence_low"),
  confidenceHigh: real("confidence_high"),
  isLocked: boolean("is_locked").notNull().default(false),
  overrideReason: text("override_reason"),
  notes: text("notes"),
  flaggedForReview: boolean("flagged_for_review").notNull().default(false),
  frameworkVersion: integer("framework_version"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const gamesRelations = relations(games, ({ one, many }) => ({
  slate: one(slates, {
    fields: [games.slateId],
    references: [slates.id],
  }),
  evidence: many(evidence),
  dataSnapshots: many(dataSnapshots),
}));

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export const frameworks = pgTable("frameworks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  weights: jsonb("weights").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const frameworksRelations = relations(frameworks, ({ many }) => ({
  rules: many(frameworkRules),
  versions: many(frameworkVersions),
  slates: many(slates),
}));

export const insertFrameworkSchema = createInsertSchema(frameworks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFramework = z.infer<typeof insertFrameworkSchema>;
export type Framework = typeof frameworks.$inferSelect;

export const frameworkRules = pgTable("framework_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  frameworkId: varchar("framework_id").notNull(),
  name: text("name").notNull(),
  condition: jsonb("condition").notNull(),
  action: jsonb("action").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const frameworkRulesRelations = relations(frameworkRules, ({ one }) => ({
  framework: one(frameworks, {
    fields: [frameworkRules.frameworkId],
    references: [frameworks.id],
  }),
}));

export const insertFrameworkRuleSchema = createInsertSchema(frameworkRules).omit({
  id: true,
  createdAt: true,
});

export type InsertFrameworkRule = z.infer<typeof insertFrameworkRuleSchema>;
export type FrameworkRule = typeof frameworkRules.$inferSelect;

export const frameworkVersions = pgTable("framework_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  frameworkId: varchar("framework_id").notNull(),
  version: integer("version").notNull(),
  weights: jsonb("weights").notNull(),
  rules: jsonb("rules").notNull(),
  changelog: text("changelog"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const frameworkVersionsRelations = relations(frameworkVersions, ({ one }) => ({
  framework: one(frameworks, {
    fields: [frameworkVersions.frameworkId],
    references: [frameworks.id],
  }),
}));

export const insertFrameworkVersionSchema = createInsertSchema(frameworkVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertFrameworkVersion = z.infer<typeof insertFrameworkVersionSchema>;
export type FrameworkVersion = typeof frameworkVersions.$inferSelect;

export const evidence = pgTable("evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  headline: text("headline"),
  snippet: text("snippet"),
  fullContent: text("full_content"),
  citations: jsonb("citations"),
  relevanceScore: real("relevance_score"),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const evidenceRelations = relations(evidence, ({ one }) => ({
  game: one(games, {
    fields: [evidence.gameId],
    references: [games.id],
  }),
}));

export const insertEvidenceSchema = createInsertSchema(evidence).omit({
  id: true,
  fetchedAt: true,
  createdAt: true,
});

export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type Evidence = typeof evidence.$inferSelect;

export const dataSnapshots = pgTable("data_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull(),
  type: text("type").notNull(),
  source: text("source").notNull(),
  data: jsonb("data").notNull(),
  previousData: jsonb("previous_data"),
  hasChanged: boolean("has_changed").notNull().default(false),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const dataSnapshotsRelations = relations(dataSnapshots, ({ one }) => ({
  game: one(games, {
    fields: [dataSnapshots.gameId],
    references: [games.id],
  }),
}));

export const insertDataSnapshotSchema = createInsertSchema(dataSnapshots).omit({
  id: true,
  fetchedAt: true,
  createdAt: true,
});

export type InsertDataSnapshot = z.infer<typeof insertDataSnapshotSchema>;
export type DataSnapshot = typeof dataSnapshots.$inferSelect;

export const whyFactors = pgTable("why_factors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull(),
  category: text("category").notNull(),
  featureValue: real("feature_value"),
  contribution: real("contribution"),
  description: text("description"),
  keyFacts: jsonb("key_facts"),
  uncertaintyFlags: jsonb("uncertainty_flags"),
  citations: jsonb("citations"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const whyFactorsRelations = relations(whyFactors, ({ one }) => ({
  game: one(games, {
    fields: [whyFactors.gameId],
    references: [games.id],
  }),
}));

export const insertWhyFactorSchema = createInsertSchema(whyFactors).omit({
  id: true,
  createdAt: true,
});

export type InsertWhyFactor = z.infer<typeof insertWhyFactorSchema>;
export type WhyFactor = typeof whyFactors.$inferSelect;

export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  action: text("action").notNull(),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  userId: varchar("user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;

export const weightsSchema = z.object({
  qbRating: z.number().min(0).max(100).default(20),
  defense: z.number().min(0).max(100).default(20),
  strengthOfSchedule: z.number().min(0).max(100).default(15),
  motivation: z.number().min(0).max(100).default(15),
  marketMovement: z.number().min(0).max(100).default(10),
  homeField: z.number().min(0).max(100).default(10),
  injuries: z.number().min(0).max(100).default(10),
});

export type Weights = z.infer<typeof weightsSchema>;

export const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum(["equals", "notEquals", "greaterThan", "lessThan", "contains", "in"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});

export type Condition = z.infer<typeof conditionSchema>;

export const actionSchema = z.object({
  type: z.enum(["adjustConfidence", "addNote", "flag", "override"]),
  value: z.union([z.string(), z.number()]),
});

export type Action = z.infer<typeof actionSchema>;

export const ruleSchema = z.object({
  name: z.string(),
  condition: conditionSchema,
  action: actionSchema,
  isEnabled: z.boolean().default(true),
  priority: z.number().default(0),
});

export type Rule = z.infer<typeof ruleSchema>;

export const gameStatusEnum = z.enum(["pending", "enriching", "ready", "locked", "override"]);
export type GameStatus = z.infer<typeof gameStatusEnum>;

export const slateStatusEnum = z.enum(["draft", "enriching", "ready", "exported"]);
export type SlateStatus = z.infer<typeof slateStatusEnum>;

export const evidenceTypeEnum = z.enum(["news", "stats", "injury", "portal", "coaching"]);
export type EvidenceType = z.infer<typeof evidenceTypeEnum>;

export const evidenceCategoryEnum = z.enum(["qb", "defense", "sos", "motivation", "market", "injury", "portal"]);
export type EvidenceCategory = z.infer<typeof evidenceCategoryEnum>;

export const snapshotTypeEnum = z.enum(["odds", "stats", "injuries", "portal"]);
export type SnapshotType = z.infer<typeof snapshotTypeEnum>;

export const whyCategoryEnum = z.enum(["qb", "defense", "sos", "motivation", "market"]);
export type WhyCategory = z.infer<typeof whyCategoryEnum>;
