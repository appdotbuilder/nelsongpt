
import { pgTable, text, timestamp, jsonb, boolean, integer, uuid, real, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Chats table
export const chatsTable = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  user_id: text('user_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('chats_user_id_idx').on(table.user_id),
  createdAtIdx: index('chats_created_at_idx').on(table.created_at)
}));

// Messages table
export const messagesTable = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chat_id: uuid('chat_id').notNull().references(() => chatsTable.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' or 'assistant'
  content: text('content').notNull(),
  metadata: jsonb('metadata'), // For citations, tokens, processing time, etc.
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  chatIdIdx: index('messages_chat_id_idx').on(table.chat_id),
  createdAtIdx: index('messages_created_at_idx').on(table.created_at)
}));

// Nelson Textbook of Pediatrics content table
// Note: Using jsonb for embedding until pgvector is properly set up
export const nelsonContentTable = pgTable('nelson_book_of_pediatrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  chapter: text('chapter').notNull(),
  section: text('section').notNull(),
  page_number: integer('page_number'),
  content: text('content').notNull(),
  embedding: jsonb('embedding'), // Store as jsonb array until pgvector is available
  metadata: jsonb('metadata'), // For topic, age_group, medical_specialty, keywords
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  chapterIdx: index('nelson_content_chapter_idx').on(table.chapter),
  pageIdx: index('nelson_content_page_idx').on(table.page_number),
  contentSearchIdx: index('nelson_content_search_idx').using('gin', sql`to_tsvector('english', ${table.content})`)
}));

// Pediatric drug information table
export const drugInfoTable = pgTable('pediatric_drug_info', {
  id: uuid('id').primaryKey().defaultRandom(),
  drug_name: text('drug_name').notNull(),
  generic_name: text('generic_name'),
  category: text('category').notNull(),
  age_restrictions: text('age_restrictions'),
  weight_based_dosing: boolean('weight_based_dosing').default(false).notNull(),
  contraindications: text('contraindications'),
  side_effects: text('side_effects'),
  dosage_forms: jsonb('dosage_forms').notNull(), // Array of dosage forms
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  drugNameIdx: index('drug_info_name_idx').on(table.drug_name),
  categoryIdx: index('drug_info_category_idx').on(table.category),
  nameSearchIdx: index('drug_info_search_idx').using('gin', sql`to_tsvector('english', ${table.drug_name} || ' ' || coalesce(${table.generic_name}, ''))`)
}));

// Dosage calculation rules table
export const dosageRulesTable = pgTable('dosage_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  drug_id: uuid('drug_id').notNull().references(() => drugInfoTable.id, { onDelete: 'cascade' }),
  indication: text('indication').notNull(),
  min_age_months: integer('min_age_months'),
  max_age_months: integer('max_age_months'),
  min_weight_kg: real('min_weight_kg'),
  max_weight_kg: real('max_weight_kg'),
  dose_per_kg: real('dose_per_kg'), // mg/kg or units/kg
  dose_unit: text('dose_unit').notNull(), // 'mg', 'mcg', 'units', etc.
  frequency: text('frequency').notNull(), // 'BID', 'TID', 'Q8H', etc.
  route: text('route').notNull(), // 'PO', 'IV', 'IM', etc.
  max_single_dose: real('max_single_dose'),
  max_daily_dose: real('max_daily_dose'),
  special_instructions: text('special_instructions'),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  drugIdIdx: index('dosage_rules_drug_id_idx').on(table.drug_id),
  indicationIdx: index('dosage_rules_indication_idx').on(table.indication),
  ageRangeIdx: index('dosage_rules_age_range_idx').on(table.min_age_months, table.max_age_months),
  weightRangeIdx: index('dosage_rules_weight_range_idx').on(table.min_weight_kg, table.max_weight_kg)
}));

// Emergency protocols table
export const emergencyProtocolsTable = pgTable('emergency_protocols', {
  id: uuid('id').primaryKey().defaultRandom(),
  condition: text('condition').notNull(),
  protocol_name: text('protocol_name').notNull(),
  age_group: text('age_group'), // 'neonate', 'infant', 'child', 'adolescent'
  severity: text('severity'), // 'mild', 'moderate', 'severe', 'critical'
  steps: jsonb('steps').notNull(), // Array of protocol steps
  medications: jsonb('medications'), // Emergency medications and dosages
  equipment: jsonb('equipment'), // Required equipment
  contraindications: text('contraindications'),
  nelson_references: jsonb('nelson_references'), // References to Nelson textbook
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  conditionIdx: index('emergency_protocols_condition_idx').on(table.condition),
  ageGroupIdx: index('emergency_protocols_age_group_idx').on(table.age_group),
  severityIdx: index('emergency_protocols_severity_idx').on(table.severity),
  protocolSearchIdx: index('emergency_protocols_search_idx').using('gin', sql`to_tsvector('english', ${table.condition} || ' ' || ${table.protocol_name})`)
}));

// Relations
export const chatsRelations = relations(chatsTable, ({ many }) => ({
  messages: many(messagesTable)
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  chat: one(chatsTable, {
    fields: [messagesTable.chat_id],
    references: [chatsTable.id]
  })
}));

export const drugInfoRelations = relations(drugInfoTable, ({ many }) => ({
  dosageRules: many(dosageRulesTable)
}));

export const dosageRulesRelations = relations(dosageRulesTable, ({ one }) => ({
  drug: one(drugInfoTable, {
    fields: [dosageRulesTable.drug_id],
    references: [drugInfoTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  chats: chatsTable,
  messages: messagesTable,
  nelsonContent: nelsonContentTable,
  drugInfo: drugInfoTable,
  dosageRules: dosageRulesTable,
  emergencyProtocols: emergencyProtocolsTable
};

// TypeScript types for the table schemas
export type Chat = typeof chatsTable.$inferSelect;
export type NewChat = typeof chatsTable.$inferInsert;

export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;

export type NelsonContent = typeof nelsonContentTable.$inferSelect;
export type NewNelsonContent = typeof nelsonContentTable.$inferInsert;

export type DrugInfo = typeof drugInfoTable.$inferSelect;
export type NewDrugInfo = typeof drugInfoTable.$inferInsert;

export type DosageRule = typeof dosageRulesTable.$inferSelect;
export type NewDosageRule = typeof dosageRulesTable.$inferInsert;

export type EmergencyProtocol = typeof emergencyProtocolsTable.$inferSelect;
export type NewEmergencyProtocol = typeof emergencyProtocolsTable.$inferInsert;
