
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { nelsonContentTable } from '../db/schema';
import { type SearchNelsonContentInput } from '../schema';
import { searchNelsonContent } from '../handlers/search_nelson_content';

// Test input
const testInput: SearchNelsonContentInput = {
  query: 'pediatric fever management',
  limit: 10,
  similarity_threshold: 0.7
};

describe('searchNelsonContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should search Nelson content and return results', async () => {
    // Create test content
    await db.insert(nelsonContentTable)
      .values([
        {
          chapter: 'Chapter 1: Fever in Children',
          section: 'Management of Pediatric Fever',
          page_number: 45,
          content: 'Pediatric fever management involves careful assessment and appropriate treatment strategies for children.',
          metadata: {
            topic: 'fever',
            age_group: 'pediatric',
            medical_specialty: 'general_pediatrics',
            keywords: ['fever', 'management', 'children']
          }
        },
        {
          chapter: 'Chapter 2: Infectious Diseases',
          section: 'Respiratory Infections',
          page_number: 120,
          content: 'Respiratory infections in children require specific diagnostic and treatment approaches.',
          metadata: {
            topic: 'respiratory',
            age_group: 'pediatric',
            medical_specialty: 'infectious_disease'
          }
        },
        {
          chapter: 'Chapter 3: Cardiology',
          section: 'Heart Conditions',
          page_number: 200,
          content: 'Congenital heart disease affects many newborns and requires specialized care.',
          metadata: {
            topic: 'cardiology',
            age_group: 'neonatal'
          }
        }
      ])
      .execute();

    const results = await searchNelsonContent(testInput);

    // Should find at least the fever-related content
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);

    // Results should be ordered by relevance (most relevant first)
    const firstResult = results[0];
    expect(firstResult.id).toBeDefined();
    expect(firstResult.chapter).toBeDefined();
    expect(firstResult.section).toBeDefined();
    expect(firstResult.content).toBeDefined();
    expect(firstResult.created_at).toBeInstanceOf(Date);

    // The fever management content should be most relevant
    expect(firstResult.content).toMatch(/fever/i);
  });

  it('should respect the limit parameter', async () => {
    // Create multiple test entries
    const entries = Array.from({ length: 15 }, (_, i) => ({
      chapter: `Chapter ${i + 1}`,
      section: `Section ${i + 1}`,
      page_number: i + 1,
      content: `This is pediatric content about fever and medical management for entry ${i + 1}.`
    }));

    await db.insert(nelsonContentTable)
      .values(entries)
      .execute();

    const limitedInput: SearchNelsonContentInput = {
      query: 'pediatric fever',
      limit: 5,
      similarity_threshold: 0.7
    };

    const results = await searchNelsonContent(limitedInput);

    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('should return empty array when no matches found', async () => {
    // Create content that won't match the search
    await db.insert(nelsonContentTable)
      .values({
        chapter: 'Chapter 1: Dermatology',
        section: 'Skin Conditions',
        page_number: 100,
        content: 'Eczema and other skin conditions in children require topical treatments.'
      })
      .execute();

    const noMatchInput: SearchNelsonContentInput = {
      query: 'quantum physics',
      limit: 10,
      similarity_threshold: 0.7
    };

    const results = await searchNelsonContent(noMatchInput);

    expect(results).toEqual([]);
  });

  it('should handle metadata correctly', async () => {
    // Create content with detailed metadata
    await db.insert(nelsonContentTable)
      .values({
        chapter: 'Chapter 5: Emergency Medicine',
        section: 'Fever in Emergency Setting',
        page_number: 300,
        content: 'Emergency management of pediatric fever requires rapid assessment and intervention.',
        metadata: {
          topic: 'emergency_fever',
          age_group: 'all_pediatric',
          medical_specialty: 'emergency_medicine',
          keywords: ['emergency', 'fever', 'pediatric', 'assessment']
        }
      })
      .execute();

    const results = await searchNelsonContent(testInput);

    expect(results.length).toBeGreaterThan(0);
    
    const result = results[0];
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.topic).toBeDefined();
    expect(result.metadata?.age_group).toBeDefined();
    expect(result.metadata?.medical_specialty).toBeDefined();
    expect(result.metadata?.keywords).toBeDefined();
  });

  it('should handle content without metadata', async () => {
    // Create content without metadata
    await db.insert(nelsonContentTable)
      .values({
        chapter: 'Chapter 10: Basic Pediatrics',
        section: 'Fever Basics',
        page_number: 50,
        content: 'Basic fever management in pediatric patients includes monitoring and supportive care.'
      })
      .execute();

    const results = await searchNelsonContent(testInput);

    expect(results.length).toBeGreaterThan(0);
    
    const result = results[0];
    expect(result.metadata).toBeUndefined();
    expect(result.embedding).toBeUndefined();
  });
});
