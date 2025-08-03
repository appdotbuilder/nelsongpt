
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatsTable } from '../db/schema';
import { type GetChatHistoryInput } from '../schema';
import { getChatHistory } from '../handlers/get_chat_history';

// Test input
const testInput: GetChatHistoryInput = {
  user_id: 'test_user_123',
  limit: 50
};

describe('getChatHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no chats', async () => {
    const result = await getChatHistory(testInput);
    expect(result).toEqual([]);
  });

  it('should return chats for specific user only', async () => {
    // Create chats for test user
    await db.insert(chatsTable).values([
      {
        title: 'Chat 1',
        user_id: 'test_user_123'
      },
      {
        title: 'Chat 2', 
        user_id: 'test_user_123'
      }
    ]);

    // Create chat for different user
    await db.insert(chatsTable).values({
      title: 'Other User Chat',
      user_id: 'other_user_456'
    });

    const result = await getChatHistory(testInput);

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Chat 1');
    expect(result[0].user_id).toEqual('test_user_123');
    expect(result[1].title).toEqual('Chat 2');
    expect(result[1].user_id).toEqual('test_user_123');
    
    // Verify no other user's chats are returned
    expect(result.every(chat => chat.user_id === 'test_user_123')).toBe(true);
  });

  it('should return chats ordered by updated_at descending', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Insert chats with specific timestamps
    await db.insert(chatsTable).values([
      {
        title: 'Oldest Chat',
        user_id: 'test_user_123',
        created_at: twoHoursAgo,
        updated_at: twoHoursAgo
      },
      {
        title: 'Newest Chat',
        user_id: 'test_user_123',
        created_at: now,
        updated_at: now
      },
      {
        title: 'Middle Chat',
        user_id: 'test_user_123',
        created_at: oneHourAgo,
        updated_at: oneHourAgo
      }
    ]);

    const result = await getChatHistory(testInput);

    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('Newest Chat');
    expect(result[1].title).toEqual('Middle Chat');
    expect(result[2].title).toEqual('Oldest Chat');

    // Verify ordering by timestamps
    expect(result[0].updated_at >= result[1].updated_at).toBe(true);
    expect(result[1].updated_at >= result[2].updated_at).toBe(true);
  });

  it('should respect limit parameter', async () => {
    // Create more chats than the limit
    const chatPromises = [];
    for (let i = 1; i <= 10; i++) {
      chatPromises.push({
        title: `Chat ${i}`,
        user_id: 'test_user_123'
      });
    }
    await db.insert(chatsTable).values(chatPromises);

    // Test with limit of 5
    const limitedInput: GetChatHistoryInput = {
      user_id: 'test_user_123',
      limit: 5
    };

    const result = await getChatHistory(limitedInput);

    expect(result).toHaveLength(5);
    expect(result.every(chat => chat.user_id === 'test_user_123')).toBe(true);
    expect(result.every(chat => chat.id !== undefined)).toBe(true);
    expect(result.every(chat => chat.created_at instanceof Date)).toBe(true);
    expect(result.every(chat => chat.updated_at instanceof Date)).toBe(true);
  });

  it('should include all required chat fields', async () => {
    await db.insert(chatsTable).values({
      title: 'Test Chat',
      user_id: 'test_user_123'
    });

    const result = await getChatHistory(testInput);

    expect(result).toHaveLength(1);
    const chat = result[0];
    expect(chat.id).toBeDefined();
    expect(chat.title).toEqual('Test Chat');
    expect(chat.user_id).toEqual('test_user_123');
    expect(chat.created_at).toBeInstanceOf(Date);
    expect(chat.updated_at).toBeInstanceOf(Date);
  });
});
