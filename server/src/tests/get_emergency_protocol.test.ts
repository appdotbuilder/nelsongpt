
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { emergencyProtocolsTable } from '../db/schema';
import { type GetEmergencyProtocolInput } from '../schema';
import { getEmergencyProtocol } from '../handlers/get_emergency_protocol';

describe('getEmergencyProtocol', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should find protocols by condition name', async () => {
    // Create test protocol
    await db.insert(emergencyProtocolsTable).values({
      condition: 'Anaphylaxis',
      protocol_name: 'Severe Allergic Reaction Protocol',
      age_group: 'child',
      severity: 'critical',
      steps: ['Step 1', 'Step 2'],
      medications: [{ name: 'Epinephrine', dose: '0.15mg' }],
      equipment: ['Auto-injector'],
      contraindications: 'None in emergency',
      nelson_references: ['Chapter 154']
    }).execute();

    const input: GetEmergencyProtocolInput = {
      condition: 'anaphylaxis'
    };

    const results = await getEmergencyProtocol(input);

    expect(results).toHaveLength(1);
    expect(results[0].condition).toEqual('Anaphylaxis');
    expect(results[0].protocol_name).toEqual('Severe Allergic Reaction Protocol');
    expect(results[0].severity).toEqual('critical');
    expect(results[0].steps).toEqual(['Step 1', 'Step 2']);
    expect(results[0].medications).toEqual([{ name: 'Epinephrine', dose: '0.15mg' }]);
  });

  it('should filter by age group when patient age is provided', async () => {
    // Create protocols for different age groups
    await db.insert(emergencyProtocolsTable).values([
      {
        condition: 'Seizure',
        protocol_name: 'Neonatal Seizure Protocol',
        age_group: 'neonate',
        severity: 'severe',
        steps: ['Neonatal steps'],
        medications: [{ name: 'Phenobarbital', dose: '20mg/kg' }],
        equipment: ['NICU monitor']
      },
      {
        condition: 'Seizure',
        protocol_name: 'Infant Seizure Protocol',
        age_group: 'infant',
        severity: 'severe',
        steps: ['Infant steps'],
        medications: [{ name: 'Lorazepam', dose: '0.05mg/kg' }],
        equipment: ['Infant monitor']
      },
      {
        condition: 'Seizure',
        protocol_name: 'Pediatric Seizure Protocol',
        age_group: 'child',
        severity: 'severe',
        steps: ['Pediatric steps'],
        medications: [{ name: 'Lorazepam', dose: '0.1mg/kg' }],
        equipment: ['Standard monitor']
      },
      {
        condition: 'Seizure',
        protocol_name: 'General Seizure Protocol',
        age_group: null, // Applies to all ages
        severity: 'moderate',
        steps: ['General steps'],
        medications: [{ name: 'Diazepam', dose: 'Weight-based' }],
        equipment: ['Basic equipment']
      }
    ]).execute();

    // Test infant age (6 months)
    const infantInput: GetEmergencyProtocolInput = {
      condition: 'seizure',
      patient_age_months: 6
    };

    const infantResults = await getEmergencyProtocol(infantInput);
    
    // Should return infant-specific and general protocols
    expect(infantResults.length).toBeGreaterThan(0);
    const ageGroups = infantResults.map(p => p.age_group);
    expect(ageGroups).toContain('infant');
    expect(ageGroups).toContain(null); // General protocol
    expect(ageGroups).not.toContain('neonate');
    expect(ageGroups).not.toContain('child');

    // Test child age (5 years = 60 months)
    const childInput: GetEmergencyProtocolInput = {
      condition: 'seizure',
      patient_age_months: 60
    };

    const childResults = await getEmergencyProtocol(childInput);
    
    const childAgeGroups = childResults.map(p => p.age_group);
    expect(childAgeGroups).toContain('child');
    expect(childAgeGroups).toContain(null); // General protocol
  });

  it('should perform case-insensitive partial matching', async () => {
    await db.insert(emergencyProtocolsTable).values({
      condition: 'Respiratory Distress',
      protocol_name: 'Breathing Emergency Protocol',
      severity: 'moderate',
      steps: ['Assess airway'],
      medications: [],
      equipment: ['Oxygen']
    }).execute();

    const input: GetEmergencyProtocolInput = {
      condition: 'RESPIRATORY'
    };

    const results = await getEmergencyProtocol(input);

    expect(results).toHaveLength(1);
    expect(results[0].condition).toEqual('Respiratory Distress');
  });

  it('should return empty array when no protocols match', async () => {
    const input: GetEmergencyProtocolInput = {
      condition: 'nonexistent condition'
    };

    const results = await getEmergencyProtocol(input);

    expect(results).toHaveLength(0);
  });

  it('should fall back to broader search when age-specific search fails', async () => {
    // Create protocol without age group restriction
    await db.insert(emergencyProtocolsTable).values({
      condition: 'Cardiac Arrest',
      protocol_name: 'CPR Protocol',
      age_group: null, // No age restriction
      severity: 'critical',
      steps: ['Start CPR'],
      medications: [{ name: 'Epinephrine', dose: '0.01mg/kg' }],
      equipment: ['Defibrillator']
    }).execute();

    const input: GetEmergencyProtocolInput = {
      condition: 'cardiac arrest',
      patient_age_months: 24 // 2 years old
    };

    const results = await getEmergencyProtocol(input);

    expect(results).toHaveLength(1);
    expect(results[0].condition).toEqual('Cardiac Arrest');
    expect(results[0].age_group).toBeNull();
  });

  it('should order results by severity and protocol name', async () => {
    await db.insert(emergencyProtocolsTable).values([
      {
        condition: 'Trauma',
        protocol_name: 'Z Protocol',
        severity: 'mild',
        steps: ['Step 1'],
        medications: [],
        equipment: []
      },
      {
        condition: 'Trauma',
        protocol_name: 'A Protocol',
        severity: 'critical',
        steps: ['Step 1'],
        medications: [],
        equipment: []
      },
      {
        condition: 'Trauma',
        protocol_name: 'B Protocol',
        severity: 'critical',
        steps: ['Step 1'],
        medications: [],
        equipment: []
      }
    ]).execute();

    const input: GetEmergencyProtocolInput = {
      condition: 'trauma'
    };

    const results = await getEmergencyProtocol(input);

    expect(results).toHaveLength(3);
    // Should be ordered by severity first (critical first), then protocol name (asc)
    expect(results[0].severity).toEqual('critical');
    expect(results[1].severity).toEqual('critical');
    expect(results[2].severity).toEqual('mild');
    // Within same severity, ordered by protocol name
    expect(results[0].protocol_name).toEqual('A Protocol');
    expect(results[1].protocol_name).toEqual('B Protocol');
  });
});
