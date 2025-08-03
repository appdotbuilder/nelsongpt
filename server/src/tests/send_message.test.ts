
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatsTable, messagesTable, nelsonContentTable } from '../db/schema';
import { type SendMessageInput } from '../schema';
import { sendMessage } from '../handlers/send_message';
import { eq, and } from 'drizzle-orm';

describe('sendMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testUserId = 'test-user-123';
  let testChatId: string;

  beforeEach(async () => {
    // Create test chat
    const chatResult = await db.insert(chatsTable)
      .values({
        title: 'Test Chat',
        user_id: testUserId
      })
      .returning()
      .execute();
    
    testChatId = chatResult[0].id;

    // Create some Nelson content for search testing
    await db.insert(nelsonContentTable)
      .values([
        {
          chapter: 'Respiratory Disorders',
          section: 'Asthma Management',
          page_number: 245,
          content: 'Pediatric asthma management requires careful consideration of age-appropriate medications and dosing. Bronchodilators are first-line treatment.',
          metadata: {
            topic: 'asthma',
            age_group: 'pediatric',
            medical_specialty: 'pulmonology',
            keywords: ['asthma', 'bronchodilator', 'pediatric']
          }
        },
        {
          chapter: 'Cardiology',
          section: 'Congenital Heart Disease',
          page_number: 156,
          content: 'Congenital heart defects are the most common birth defects, affecting approximately 1% of newborns.',
          metadata: {
            topic: 'cardiology',
            age_group: 'neonatal',
            medical_specialty: 'cardiology',
            keywords: ['heart', 'congenital', 'defects']
          }
        }
      ])
      .execute();
  });

  const testInput: SendMessageInput = {
    chat_id: '', // Will be set in tests
    content: 'What are the treatment options for pediatric asthma?',
    user_id: testUserId
  };

  it('should save user message and generate AI response', async () => {
    const input = { ...testInput, chat_id: testChatId };
    const result = await sendMessage(input);

    // Verify response structure
    expect(result.message).toBeDefined();
    expect(result.message.role).toEqual('assistant');
    expect(result.message.chat_id).toEqual(testChatId);
    expect(result.message.content).toContain('placeholder response');
    expect(result.citations).toBeInstanceOf(Array);
    expect(result.processing_time_ms).toBeGreaterThan(0);
    expect(result.tokens_used).toBeGreaterThan(0);

    // Verify metadata
    expect(result.message.metadata).toBeDefined();
    expect(result.message.metadata?.model_used).toEqual('mistral-large');
    expect(result.message.metadata?.tokens_used).toBeGreaterThan(0);
  });

  it('should save both user and assistant messages to database', async () => {
    const input = { ...testInput, chat_id: testChatId };
    await sendMessage(input);

    // Check messages were saved
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.chat_id, testChatId))
      .execute();

    expect(messages).toHaveLength(2);
    
    // User message
    const userMessage = messages.find(m => m.role === 'user');
    expect(userMessage).toBeDefined();
    expect(userMessage?.content).toEqual(input.content);
    expect(userMessage?.created_at).toBeInstanceOf(Date);

    // Assistant message
    const assistantMessage = messages.find(m => m.role === 'assistant');
    expect(assistantMessage).toBeDefined();
    expect(assistantMessage?.content).toContain('placeholder response');
    expect(assistantMessage?.metadata).toBeDefined();
  });

  it('should reject message for non-existent chat', async () => {
    const input = { 
      ...testInput, 
      chat_id: crypto.randomUUID() // Non-existent chat
    };

    await expect(sendMessage(input)).rejects.toThrow(/chat not found/i);
  });

  it('should reject message for chat not owned by user', async () => {
    // Create chat for different user
    const otherChatResult = await db.insert(chatsTable)
      .values({
        title: 'Other User Chat',
        user_id: 'other-user-456'
      })
      .returning()
      .execute();

    const input = { 
      ...testInput, 
      chat_id: otherChatResult[0].id 
    };

    await expect(sendMessage(input)).rejects.toThrow(/chat not found/i);
  });

  it('should handle empty content search gracefully', async () => {
    const input = { 
      ...testInput, 
      chat_id: testChatId,
      content: 'hi' // Short content with no meaningful search terms
    };

    const result = await sendMessage(input);

    expect(result.message).toBeDefined();
    expect(result.message.content).toContain('placeholder response');
    expect(result.citations).toBeInstanceOf(Array);
  });

  it('should return citations when content matches Nelson textbook', async () => {
    const input = { 
      ...testInput, 
      chat_id: testChatId,
      content: 'Tell me about asthma treatment in children'
    };

    const result = await sendMessage(input);

    expect(result.message).toBeDefined();
    expect(result.citations).toBeInstanceOf(Array);
    expect(result.message.metadata?.citations).toBeInstanceOf(Array);
  });

  it('should calculate processing time correctly', async () => {
    const input = { ...testInput, chat_id: testChatId };
    const result = await sendMessage(input);

    expect(result.processing_time_ms).toBeGreaterThan(0);
    expect(result.processing_time_ms).toBeLessThan(5000); // Should complete within 5 seconds
    expect(result.message.metadata?.processing_time_ms).toEqual(result.processing_time_ms);
  });
});
