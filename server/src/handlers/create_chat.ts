
import { db } from '../db';
import { chatsTable } from '../db/schema';
import { type CreateChatInput, type Chat } from '../schema';

export const createChat = async (input: CreateChatInput): Promise<Chat> => {
  try {
    // Insert chat record
    const result = await db.insert(chatsTable)
      .values({
        title: input.title,
        user_id: input.user_id
      })
      .returning()
      .execute();

    // Return the created chat
    const chat = result[0];
    return {
      id: chat.id,
      title: chat.title,
      user_id: chat.user_id,
      created_at: chat.created_at,
      updated_at: chat.updated_at
    };
  } catch (error) {
    console.error('Chat creation failed:', error);
    throw error;
  }
};
