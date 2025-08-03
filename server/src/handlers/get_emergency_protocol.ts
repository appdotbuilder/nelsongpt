
import { db } from '../db';
import { emergencyProtocolsTable } from '../db/schema';
import { type GetEmergencyProtocolInput } from '../schema';
import { eq, and, or, isNull, ilike, desc, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function getEmergencyProtocol(input: GetEmergencyProtocolInput) {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Add condition filter (case-insensitive partial match)
    conditions.push(ilike(emergencyProtocolsTable.condition, `%${input.condition}%`));

    // Add age group filter if provided
    if (input.patient_age_months !== undefined) {
      const ageMonths = input.patient_age_months;
      
      // Determine age group based on months
      let ageGroup: string;
      if (ageMonths < 1) {
        ageGroup = 'neonate';
      } else if (ageMonths < 12) {
        ageGroup = 'infant';
      } else if (ageMonths < 144) { // 12 years
        ageGroup = 'child';
      } else {
        ageGroup = 'adolescent';
      }

      // Match specific age group or null (applies to all ages)
      const ageCondition = or(
        eq(emergencyProtocolsTable.age_group, ageGroup),
        isNull(emergencyProtocolsTable.age_group)
      );
      if (ageCondition) {
        conditions.push(ageCondition);
      }
    }

    // Execute query with conditions and custom severity ordering
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    
    const results = await db.select()
      .from(emergencyProtocolsTable)
      .where(whereClause)
      .orderBy(
        sql`CASE 
          WHEN ${emergencyProtocolsTable.severity} = 'critical' THEN 1
          WHEN ${emergencyProtocolsTable.severity} = 'severe' THEN 2
          WHEN ${emergencyProtocolsTable.severity} = 'moderate' THEN 3
          WHEN ${emergencyProtocolsTable.severity} = 'mild' THEN 4
          ELSE 5
        END`,
        emergencyProtocolsTable.protocol_name
      )
      .execute();

    // If no exact matches found, try broader search without age group
    if (results.length === 0 && input.patient_age_months !== undefined) {
      const broadResults = await db.select()
        .from(emergencyProtocolsTable)
        .where(ilike(emergencyProtocolsTable.condition, `%${input.condition}%`))
        .orderBy(
          sql`CASE 
            WHEN ${emergencyProtocolsTable.severity} = 'critical' THEN 1
            WHEN ${emergencyProtocolsTable.severity} = 'severe' THEN 2
            WHEN ${emergencyProtocolsTable.severity} = 'moderate' THEN 3
            WHEN ${emergencyProtocolsTable.severity} = 'mild' THEN 4
            ELSE 5
          END`,
          emergencyProtocolsTable.protocol_name
        )
        .execute();

      return broadResults;
    }

    return results;
  } catch (error) {
    console.error('Emergency protocol retrieval failed:', error);
    throw error;
  }
}
