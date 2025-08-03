
import { db } from '../db';
import { messagesTable, chatsTable } from '../db/schema';
import { type GetChatMessagesInput, type Message } from '../schema';
import { eq, desc, and } from 'drizzle-orm';

export const getChatMessages = async (input: GetChatMessagesInput): Promise<Message[]> => {
  try {
    // First verify the chat exists and belongs to the user
    const chat = await db.select()
      .from(chatsTable)
      .where(and(
        eq(chatsTable.id, input.chat_id),
        eq(chatsTable.user_id, input.user_id)
      ))
      .limit(1)
      .execute();

    if (chat.length === 0) {
      throw new Error('Chat not found or access denied');
    }

    // Get messages for the chat, ordered chronologically (oldest first)
    const results = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.chat_id, input.chat_id))
      .orderBy(messagesTable.created_at) // Oldest first for chat history
      .limit(input.limit)
      .execute();

    // Return messages with proper typing
    return results.map(message => ({
      id: message.id,
      chat_id: message.chat_id,
      role: message.role as 'user' | 'assistant',
      content: message.content,
      metadata: message.metadata as any,
      created_at: message.created_at
    }));
  } catch (error) {
    console.error('Failed to get chat messages:', error);
    throw error;
  }
};
