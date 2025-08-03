
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatsTable, messagesTable } from '../db/schema';
import { type GetChatMessagesInput } from '../schema';
import { getChatMessages } from '../handlers/get_chat_messages';

const testUserId = 'user-123';
const otherUserId = 'user-456';

describe('getChatMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return messages for a chat in chronological order', async () => {
    // Create a chat
    const [chat] = await db.insert(chatsTable)
      .values({
        title: 'Test Chat',
        user_id: testUserId
      })
      .returning()
      .execute();

    // Create messages with different timestamps
    const message1 = await db.insert(messagesTable)
      .values({
        chat_id: chat.id,
        role: 'user',
        content: 'First message',
        created_at: new Date('2024-01-01T10:00:00Z')
      })
      .returning()
      .execute();

    const message2 = await db.insert(messagesTable)
      .values({
        chat_id: chat.id,
        role: 'assistant',
        content: 'Second message',
        metadata: {
          tokens_used: 100,
          processing_time_ms: 500
        },
        created_at: new Date('2024-01-01T10:01:00Z')
      })
      .returning()
      .execute();

    const message3 = await db.insert(messagesTable)
      .values({
        chat_id: chat.id,
        role: 'user',
        content: 'Third message',
        created_at: new Date('2024-01-01T10:02:00Z')
      })
      .returning()
      .execute();

    const input: GetChatMessagesInput = {
      chat_id: chat.id,
      user_id: testUserId,
      limit: 100
    };

    const result = await getChatMessages(input);

    expect(result).toHaveLength(3);
    
    // Verify chronological order (oldest first)
    expect(result[0].content).toEqual('First message');
    expect(result[1].content).toEqual('Second message');
    expect(result[2].content).toEqual('Third message');

    // Verify message structure
    expect(result[0].id).toEqual(message1[0].id);
    expect(result[0].chat_id).toEqual(chat.id);
    expect(result[0].role).toEqual('user');
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Verify metadata handling
    expect(result[1].metadata).toEqual({
      tokens_used: 100,
      processing_time_ms: 500
    });
    expect(result[0].metadata).toBeNull();
  });

  it('should respect the limit parameter', async () => {
    // Create a chat
    const [chat] = await db.insert(chatsTable)
      .values({
        title: 'Test Chat',
        user_id: testUserId
      })
      .returning()
      .execute();

    // Create 5 messages
    for (let i = 0; i < 5; i++) {
      await db.insert(messagesTable)
        .values({
          chat_id: chat.id,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i + 1}`,
          created_at: new Date(`2024-01-01T10:0${i}:00Z`)
        })
        .execute();
    }

    const input: GetChatMessagesInput = {
      chat_id: chat.id,
      user_id: testUserId,
      limit: 3
    };

    const result = await getChatMessages(input);

    expect(result).toHaveLength(3);
    expect(result[0].content).toEqual('Message 1');
    expect(result[1].content).toEqual('Message 2');
    expect(result[2].content).toEqual('Message 3');
  });

  it('should return empty array for chat with no messages', async () => {
    // Create a chat with no messages
    const [chat] = await db.insert(chatsTable)
      .values({
        title: 'Empty Chat',
        user_id: testUserId
      })
      .returning()
      .execute();

    const input: GetChatMessagesInput = {
      chat_id: chat.id,
      user_id: testUserId,
      limit: 100
    };

    const result = await getChatMessages(input);

    expect(result).toHaveLength(0);
  });

  it('should throw error when chat does not exist', async () => {
    const input: GetChatMessagesInput = {
      chat_id: '00000000-0000-0000-0000-000000000000', // Valid UUID format that doesn't exist
      user_id: testUserId,
      limit: 100
    };

    expect(getChatMessages(input)).rejects.toThrow(/Chat not found or access denied/i);
  });

  it('should throw error when user does not own the chat', async () => {
    // Create a chat owned by another user
    const [chat] = await db.insert(chatsTable)
      .values({
        title: 'Other User Chat',
        user_id: otherUserId
      })
      .returning()
      .execute();

    // Add a message to the chat
    await db.insert(messagesTable)
      .values({
        chat_id: chat.id,
        role: 'user',
        content: 'Secret message'
      })
      .execute();

    const input: GetChatMessagesInput = {
      chat_id: chat.id,
      user_id: testUserId, // Different user trying to access
      limit: 100
    };

    expect(getChatMessages(input)).rejects.toThrow(/Chat not found or access denied/i);
  });

  it('should handle different message roles correctly', async () => {
    // Create a chat
    const [chat] = await db.insert(chatsTable)
      .values({
        title: 'Role Test Chat',
        user_id: testUserId
      })
      .returning()
      .execute();

    // Create messages with different roles
    await db.insert(messagesTable)
      .values({
        chat_id: chat.id,
        role: 'user',
        content: 'User message'
      })
      .execute();

    await db.insert(messagesTable)
      .values({
        chat_id: chat.id,
        role: 'assistant',
        content: 'Assistant message'
      })
      .execute();

    const input: GetChatMessagesInput = {
      chat_id: chat.id,
      user_id: testUserId,
      limit: 100
    };

    const result = await getChatMessages(input);

    expect(result).toHaveLength(2);
    expect(result[0].role).toEqual('user');
    expect(result[1].role).toEqual('assistant');
    expect(result[0].content).toEqual('User message');
    expect(result[1].content).toEqual('Assistant message');
  });
});
