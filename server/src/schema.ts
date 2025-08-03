
import { z } from 'zod';

// Chat schema
export const chatSchema = z.object({
  id: z.string(),
  title: z.string(),
  user_id: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Chat = z.infer<typeof chatSchema>;

// Message schema
export const messageSchema = z.object({
  id: z.string(),
  chat_id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  metadata: z.object({
    citations: z.array(z.object({
      source: z.string(),
      page: z.number().optional(),
      chapter: z.string().optional(),
      relevance_score: z.number().optional()
    })).optional(),
    tokens_used: z.number().optional(),
    processing_time_ms: z.number().optional(),
    model_used: z.string().optional()
  }).optional(),
  created_at: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;

// Nelson textbook content schema
export const nelsonContentSchema = z.object({
  id: z.string(),
  chapter: z.string(),
  section: z.string(),
  page_number: z.number().optional(),
  content: z.string(),
  embedding: z.array(z.number()).optional(), // Vector embedding
  metadata: z.object({
    topic: z.string().optional(),
    age_group: z.string().optional(),
    medical_specialty: z.string().optional(),
    keywords: z.array(z.string()).optional()
  }).optional(),
  created_at: z.coerce.date()
});

export type NelsonContent = z.infer<typeof nelsonContentSchema>;

// Drug information schema
export const drugInfoSchema = z.object({
  id: z.string(),
  drug_name: z.string(),
  generic_name: z.string().nullable(),
  category: z.string(),
  age_restrictions: z.string().nullable(),
  weight_based_dosing: z.boolean(),
  contraindications: z.string().nullable(),
  side_effects: z.string().nullable(),
  dosage_forms: z.array(z.string()),
  created_at: z.coerce.date()
});

export type DrugInfo = z.infer<typeof drugInfoSchema>;

// Input schemas for API endpoints

// Create new chat
export const createChatInputSchema = z.object({
  title: z.string().min(1).max(255),
  user_id: z.string()
});

export type CreateChatInput = z.infer<typeof createChatInputSchema>;

// Send message and get AI response
export const sendMessageInputSchema = z.object({
  chat_id: z.string(),
  content: z.string().min(1),
  user_id: z.string()
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

// Get chat history
export const getChatHistoryInputSchema = z.object({
  user_id: z.string(),
  limit: z.number().int().positive().optional().default(50)
});

export type GetChatHistoryInput = z.infer<typeof getChatHistoryInputSchema>;

// Get messages for a specific chat
export const getChatMessagesInputSchema = z.object({
  chat_id: z.string(),
  user_id: z.string(),
  limit: z.number().int().positive().optional().default(100)
});

export type GetChatMessagesInput = z.infer<typeof getChatMessagesInputSchema>;

// Search Nelson content
export const searchNelsonContentInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().optional().default(10),
  similarity_threshold: z.number().min(0).max(1).optional().default(0.7)
});

export type SearchNelsonContentInput = z.infer<typeof searchNelsonContentInputSchema>;

// Drug dosage calculation
export const calculateDosageInputSchema = z.object({
  drug_name: z.string(),
  patient_weight_kg: z.number().positive(),
  patient_age_months: z.number().int().nonnegative(),
  indication: z.string().optional()
});

export type CalculateDosageInput = z.infer<typeof calculateDosageInputSchema>;

// Emergency protocol search
export const getEmergencyProtocolInputSchema = z.object({
  condition: z.string(),
  patient_age_months: z.number().int().nonnegative().optional(),
  patient_weight_kg: z.number().positive().optional()
});

export type GetEmergencyProtocolInput = z.infer<typeof getEmergencyProtocolInputSchema>;

// Response schemas

export const aiResponseSchema = z.object({
  message: messageSchema,
  citations: z.array(z.object({
    source: z.string(),
    page: z.number().optional(),
    chapter: z.string().optional(),
    content_snippet: z.string(),
    relevance_score: z.number()
  })),
  processing_time_ms: z.number(),
  tokens_used: z.number()
});

export type AIResponse = z.infer<typeof aiResponseSchema>;

export const dosageCalculationResultSchema = z.object({
  drug_name: z.string(),
  recommended_dose: z.string(),
  dose_per_kg: z.string().optional(),
  frequency: z.string(),
  route: z.string(),
  warnings: z.array(z.string()),
  max_dose: z.string().optional(),
  citations: z.array(z.string())
});

export type DosageCalculationResult = z.infer<typeof dosageCalculationResultSchema>;
