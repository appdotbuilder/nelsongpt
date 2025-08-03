
import { db } from '../db';
import { nelsonContentTable } from '../db/schema';
import { type SearchNelsonContentInput, type NelsonContent } from '../schema';
import { sql } from 'drizzle-orm';

export async function searchNelsonContent(input: SearchNelsonContentInput): Promise<NelsonContent[]> {
  try {
    // For now, use PostgreSQL's full-text search since pgvector is not set up yet
    // In the future, this should be replaced with vector similarity search
    // using embeddings stored in the embedding column
    
    const results = await db.select()
      .from(nelsonContentTable)
      .where(
        sql`to_tsvector('english', ${nelsonContentTable.content}) @@ plainto_tsquery('english', ${input.query})`
      )
      .orderBy(
        sql`ts_rank(to_tsvector('english', ${nelsonContentTable.content}), plainto_tsquery('english', ${input.query})) DESC`
      )
      .limit(input.limit)
      .execute();

    // Convert the database results to match the schema format
    return results.map(result => ({
      ...result,
      page_number: result.page_number ?? undefined, // Convert null to undefined
      embedding: result.embedding ? (result.embedding as number[]) : undefined,
      metadata: result.metadata ? (result.metadata as any) : undefined
    }));
  } catch (error) {
    console.error('Nelson content search failed:', error);
    throw error;
  }
}
