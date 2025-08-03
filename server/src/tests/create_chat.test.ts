
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatsTable } from '../db/schema';
import { type CreateChatInput } from '../schema';
import { createChat } from '../handlers/create_chat';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateChatInput = {
  title: 'Pediatric Emergency Protocol',
  user_id: 'user123'
};

describe('createChat', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a chat', async () => {
    const result = await createChat(testInput);

    // Basic field validation
    expect(result.title).toEqual('Pediatric Emergency Protocol');
    expect(result.user_id).toEqual('user123');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save chat to database', async () => {
    const result = await createChat(testInput);

    // Query using proper drizzle syntax
    const chats = await db.select()
      .from(chatsTable)
      .where(eq(chatsTable.id, result.id))
      .execute();

    expect(chats).toHaveLength(1);
    expect(chats[0].title).toEqual('Pediatric Emergency Protocol');
    expect(chats[0].user_id).toEqual('user123');
    expect(chats[0].created_at).toBeInstanceOf(Date);
    expect(chats[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple chats for same user', async () => {
    const firstChat = await createChat(testInput);
    const secondChat = await createChat({
      title: 'Drug Dosage Calculation',
      user_id: 'user123'
    });

    expect(firstChat.id).not.toEqual(secondChat.id);
    expect(firstChat.user_id).toEqual(secondChat.user_id);

    // Verify both chats exist in database
    const chats = await db.select()
      .from(chatsTable)
      .where(eq(chatsTable.user_id, 'user123'))
      .execute();

    expect(chats).toHaveLength(2);
    const titles = chats.map(chat => chat.title).sort();
    expect(titles).toEqual(['Drug Dosage Calculation', 'Pediatric Emergency Protocol']);
  });

  it('should handle different user IDs', async () => {
    const user1Chat = await createChat(testInput);
    const user2Chat = await createChat({
      title: 'Nelson Textbook Query',
      user_id: 'user456'
    });

    expect(user1Chat.user_id).toEqual('user123');
    expect(user2Chat.user_id).toEqual('user456');
    expect(user1Chat.id).not.toEqual(user2Chat.id);

    // Verify chats are properly isolated by user
    const user1Chats = await db.select()
      .from(chatsTable)
      .where(eq(chatsTable.user_id, 'user123'))
      .execute();

    const user2Chats = await db.select()
      .from(chatsTable)
      .where(eq(chatsTable.user_id, 'user456'))
      .execute();

    expect(user1Chats).toHaveLength(1);
    expect(user2Chats).toHaveLength(1);
    expect(user1Chats[0].title).toEqual('Pediatric Emergency Protocol');
    expect(user2Chats[0].title).toEqual('Nelson Textbook Query');
  });
});
