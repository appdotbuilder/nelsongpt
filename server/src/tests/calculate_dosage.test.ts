
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { drugInfoTable, dosageRulesTable } from '../db/schema';
import { type CalculateDosageInput } from '../schema';
import { calculateDosage } from '../handlers/calculate_dosage';

describe('calculateDosage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test input
  const testInput: CalculateDosageInput = {
    drug_name: 'Amoxicillin',
    patient_weight_kg: 15,
    patient_age_months: 36, // 3 years old
    indication: 'respiratory_infection'
  };

  it('should calculate dosage for valid drug and patient', async () => {
    // Create test drug
    const drugResult = await db.insert(drugInfoTable)
      .values({
        drug_name: 'Amoxicillin',
        generic_name: 'amoxicillin',
        category: 'antibiotic',
        weight_based_dosing: true,
        dosage_forms: ['oral suspension', 'tablets'],
        contraindications: 'Penicillin allergy'
      })
      .returning()
      .execute();

    const drug = drugResult[0];

    // Create dosage rule
    await db.insert(dosageRulesTable)
      .values({
        drug_id: drug.id,
        indication: 'respiratory_infection',
        min_age_months: 12,
        max_age_months: 144, // 12 years
        min_weight_kg: 10,
        max_weight_kg: 40,
        dose_per_kg: 20, // 20 mg/kg
        dose_unit: 'mg',
        frequency: 'BID',
        route: 'PO',
        max_single_dose: 500,
        max_daily_dose: 1000,
        special_instructions: 'Take with food'
      })
      .execute();

    const result = await calculateDosage(testInput);

    expect(result.drug_name).toEqual('Amoxicillin');
    expect(result.recommended_dose).toEqual('300.00 mg'); // 15 kg * 20 mg/kg
    expect(result.dose_per_kg).toEqual('20 mg/kg');
    expect(result.frequency).toEqual('BID');
    expect(result.route).toEqual('PO');
    expect(result.max_dose).toEqual('500 mg');
    expect(result.warnings).toContain('Contraindications: Penicillin allergy');
    expect(result.warnings).toContain('Special instructions: Take with food');
    expect(result.citations).toHaveLength(1);
  });

  it('should include warning when dose exceeds maximum', async () => {
    // Create test drug
    const drugResult = await db.insert(drugInfoTable)
      .values({
        drug_name: 'Amoxicillin',
        generic_name: 'amoxicillin',
        category: 'antibiotic',
        weight_based_dosing: true,
        dosage_forms: ['oral suspension']
      })
      .returning()
      .execute();

    const drug = drugResult[0];

    // Create dosage rule with low max dose to trigger warning
    await db.insert(dosageRulesTable)
      .values({
        drug_id: drug.id,
        indication: 'respiratory_infection',
        dose_per_kg: 20,
        dose_unit: 'mg',
        frequency: 'BID',
        route: 'PO',
        max_single_dose: 200 // Lower than calculated dose (15kg * 20mg/kg = 300mg)
      })
      .execute();

    const result = await calculateDosage(testInput);

    expect(result.warnings.some(w => w.includes('exceeds maximum single dose'))).toBe(true);
  });

  it('should work with optional age and weight ranges', async () => {
    // Create test drug
    const drugResult = await db.insert(drugInfoTable)
      .values({
        drug_name: 'Amoxicillin',
        generic_name: 'amoxicillin',
        category: 'antibiotic',
        weight_based_dosing: true,
        dosage_forms: ['oral suspension']
      })
      .returning()
      .execute();

    const drug = drugResult[0];

    // Create dosage rule with no age/weight restrictions
    await db.insert(dosageRulesTable)
      .values({
        drug_id: drug.id,
        indication: 'respiratory_infection',
        dose_per_kg: 15,
        dose_unit: 'mg',
        frequency: 'TID',
        route: 'PO'
      })
      .execute();

    const result = await calculateDosage(testInput);

    expect(result.recommended_dose).toEqual('225.00 mg'); // 15 kg * 15 mg/kg
    expect(result.frequency).toEqual('TID');
  });

  it('should work without indication filter', async () => {
    // Create test drug
    const drugResult = await db.insert(drugInfoTable)
      .values({
        drug_name: 'Amoxicillin',
        generic_name: 'amoxicillin',
        category: 'antibiotic',
        weight_based_dosing: true,
        dosage_forms: ['oral suspension']
      })
      .returning()
      .execute();

    const drug = drugResult[0];

    // Create dosage rule
    await db.insert(dosageRulesTable)
      .values({
        drug_id: drug.id,
        indication: 'general',
        dose_per_kg: 25,
        dose_unit: 'mg',
        frequency: 'BID',
        route: 'PO'
      })
      .execute();

    // Test without indication
    const inputWithoutIndication: CalculateDosageInput = {
      drug_name: 'Amoxicillin',
      patient_weight_kg: 10,
      patient_age_months: 24
    };

    const result = await calculateDosage(inputWithoutIndication);

    expect(result.recommended_dose).toEqual('250.00 mg'); // 10 kg * 25 mg/kg
  });

  it('should throw error for non-existent drug', async () => {
    expect(calculateDosage({
      drug_name: 'NonExistentDrug',
      patient_weight_kg: 15,
      patient_age_months: 36
    })).rejects.toThrow(/Drug not found/i);
  });

  it('should throw error when no dosage rules match', async () => {
    // Create drug but no dosage rules
    await db.insert(drugInfoTable)
      .values({
        drug_name: 'Amoxicillin',
        generic_name: 'amoxicillin',
        category: 'antibiotic',
        weight_based_dosing: true,
        dosage_forms: ['oral suspension']
      })
      .execute();

    expect(calculateDosage(testInput)).rejects.toThrow(/No dosage rules found/i);
  });

  it('should filter by age ranges correctly', async () => {
    // Create test drug
    const drugResult = await db.insert(drugInfoTable)
      .values({
        drug_name: 'Amoxicillin',
        generic_name: 'amoxicillin',
        category: 'antibiotic',
        weight_based_dosing: true,
        dosage_forms: ['oral suspension']
      })
      .returning()
      .execute();

    const drug = drugResult[0];

    // Create dosage rule for older children only
    await db.insert(dosageRulesTable)
      .values({
        drug_id: drug.id,
        indication: 'respiratory_infection',
        min_age_months: 60, // 5 years minimum
        dose_per_kg: 20,
        dose_unit: 'mg',
        frequency: 'BID',
        route: 'PO'
      })
      .execute();

    // Test with younger patient (36 months < 60 months minimum)
    expect(calculateDosage(testInput)).rejects.toThrow(/No dosage rules found/i);
  });
});
