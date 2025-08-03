
import { db } from '../db';
import { drugInfoTable, dosageRulesTable } from '../db/schema';
import { type CalculateDosageInput, type DosageCalculationResult } from '../schema';
import { eq, and, lte, gte, or, isNull, SQL } from 'drizzle-orm';

export async function calculateDosage(input: CalculateDosageInput): Promise<DosageCalculationResult> {
  try {
    // Find the drug information
    const drugResults = await db.select()
      .from(drugInfoTable)
      .where(eq(drugInfoTable.drug_name, input.drug_name))
      .execute();

    if (drugResults.length === 0) {
      throw new Error(`Drug not found: ${input.drug_name}`);
    }

    const drug = drugResults[0];

    // Build all conditions for dosage rules query
    const conditions: SQL<unknown>[] = [
      eq(dosageRulesTable.drug_id, drug.id)
    ];

    // Age filtering - patient must be within or overlap with rule age range
    conditions.push(
      or(
        isNull(dosageRulesTable.min_age_months),
        lte(dosageRulesTable.min_age_months, input.patient_age_months)
      )!
    );
    conditions.push(
      or(
        isNull(dosageRulesTable.max_age_months),
        gte(dosageRulesTable.max_age_months, input.patient_age_months)
      )!
    );

    // Weight filtering - patient must be within or overlap with rule weight range
    conditions.push(
      or(
        isNull(dosageRulesTable.min_weight_kg),
        lte(dosageRulesTable.min_weight_kg, input.patient_weight_kg)
      )!
    );
    conditions.push(
      or(
        isNull(dosageRulesTable.max_weight_kg),
        gte(dosageRulesTable.max_weight_kg, input.patient_weight_kg)
      )!
    );

    // Filter by indication if provided
    if (input.indication) {
      conditions.push(eq(dosageRulesTable.indication, input.indication));
    }

    // Execute query with all conditions
    const dosageRules = await db.select()
      .from(dosageRulesTable)
      .where(and(...conditions))
      .execute();

    if (dosageRules.length === 0) {
      throw new Error(`No dosage rules found for ${input.drug_name} for patient age ${input.patient_age_months} months and weight ${input.patient_weight_kg} kg`);
    }

    // Use the first matching rule (in practice, you might want more sophisticated selection)
    const rule = dosageRules[0];

    // Calculate the dose
    const dosePerKg = rule.dose_per_kg || 0;
    const calculatedDose = dosePerKg * input.patient_weight_kg;

    // Generate warnings
    const warnings: string[] = [];

    // Check age restrictions from drug info
    if (drug.age_restrictions) {
      warnings.push(`Age restrictions: ${drug.age_restrictions}`);
    }

    // Check contraindications
    if (drug.contraindications) {
      warnings.push(`Contraindications: ${drug.contraindications}`);
    }

    // Check if calculated dose exceeds maximum limits
    if (rule.max_single_dose && calculatedDose > rule.max_single_dose) {
      warnings.push(`Calculated dose (${calculatedDose.toFixed(2)} ${rule.dose_unit}) exceeds maximum single dose (${rule.max_single_dose} ${rule.dose_unit})`);
    }

    // Add special instructions as warnings
    if (rule.special_instructions) {
      warnings.push(`Special instructions: ${rule.special_instructions}`);
    }

    // Build result
    const result: DosageCalculationResult = {
      drug_name: drug.drug_name,
      recommended_dose: `${calculatedDose.toFixed(2)} ${rule.dose_unit}`,
      dose_per_kg: rule.dose_per_kg ? `${rule.dose_per_kg} ${rule.dose_unit}/kg` : undefined,
      frequency: rule.frequency,
      route: rule.route,
      warnings,
      max_dose: rule.max_single_dose ? `${rule.max_single_dose} ${rule.dose_unit}` : undefined,
      citations: ['Nelson Textbook of Pediatrics - Pediatric Drug Dosing Guidelines']
    };

    return result;

  } catch (error) {
    console.error('Dosage calculation failed:', error);
    throw error;
  }
}
