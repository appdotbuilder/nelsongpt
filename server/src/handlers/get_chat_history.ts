
import { db } from '../db';
import { chatsTable } from '../db/schema';
import { type GetChatHistoryInput, type Chat } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getChatHistory = async (input: GetChatHistoryInput): Promise<Chat[]> => {
  try {
    // Query chats for the specific user, ordered by most recent first
    const results = await db.select()
      .from(chatsTable)
      .where(eq(chatsTable.user_id, input.user_id))
      .orderBy(desc(chatsTable.updated_at))
      .limit(input.limit)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get chat history:', error);
    throw error;
  }
};
