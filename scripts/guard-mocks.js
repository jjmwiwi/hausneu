#!/usr/bin/env node

/**
 * Guard-Script: Prüft dass keine Mocks in ZaehlerUebersichtPage verwendet werden
 * 
 * Verwendung: node scripts/guard-mocks.js
 * 
 * CI bricht ab, falls Mocks gefunden werden
 */

const fs = require('fs');
const path = require('path');

const ZAEHLER_UEBERSICHT_PATH = path.join(__dirname, '..', 'renderer', 'components', 'ZaehlerUebersichtPage.tsx');

// Wörter die auf Mocks hinweisen
const MOCK_INDICATORS = [
  'mock',
  'fixture',
  'Mock',
  'MockData',
  'mockData',
  'testData',
  'sampleData',
  'dummyData',
  'fakeData'
];

// Lokale Arrays die auf Hardcodings hinweisen
const HARDCODED_INDICATORS = [
  'const mock',
  'const test',
  'const sample',
  'const dummy',
  'const fake',
  'const hardcoded',
  'const local',
  'const static'
];

function checkForMocks() {
  console.log('🔍 Prüfe ZaehlerUebersichtPage auf Mocks...');
  
  if (!fs.existsSync(ZAEHLER_UEBERSICHT_PATH)) {
    console.error('❌ ZaehlerUebersichtPage.tsx nicht gefunden!');
    process.exit(1);
  }
  
  const content = fs.readFileSync(ZAEHLER_UEBERSICHT_PATH, 'utf8');
  const lines = content.split('\n');
  
  let foundIssues = false;
  
  // Prüfe auf Mock-Indikatoren
  MOCK_INDICATORS.forEach(indicator => {
    const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
    const matches = content.match(regex);
    
    if (matches) {
      console.error(`❌ Mock-Indikator gefunden: "${indicator}" (${matches.length}x)`);
      foundIssues = true;
      
      // Zeige Zeilen mit dem Indikator
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          console.error(`   Zeile ${index + 1}: ${line.trim()}`);
        }
      });
    }
  });
  
  // Prüfe auf Hardcodings
  HARDCODED_INDICATORS.forEach(indicator => {
    const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
    const matches = content.match(regex);
    
    if (matches) {
      console.error(`❌ Hardcoded-Indikator gefunden: "${indicator}" (${matches.length}x)`);
      foundIssues = true;
      
      // Zeige Zeilen mit dem Indikator
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          console.error(`   Zeile ${index + 1}: ${line.trim()}`);
        }
      });
    }
  });
  
  // Prüfe auf lokale Arrays die nicht aus dem Context kommen
  const localArrayRegex = /const\s+(\w+)\s*=\s*\[/g;
  let match;
  while ((match = localArrayRegex.exec(content)) !== null) {
    const arrayName = match[1];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    // Ignoriere legitime lokale Arrays
    if (!['zaehler', 'einheiten', 'loading', 'modalOpen', 'editingZaehler', 'currentEinheitId', 'editingNotes', 'savingNotes'].includes(arrayName)) {
      console.error(`❌ Verdächtiges lokales Array gefunden: "${arrayName}" in Zeile ${lineNumber}`);
      foundIssues = true;
    }
  }
  
  if (foundIssues) {
    console.error('\n🚨 MOCKS ODER HARDCODINGS IN ZAEHLER_UEBERSICHT GEFUNDEN!');
    console.error('   Alle Daten müssen aus dem ImmobilienContext oder zaehlerService kommen.');
    console.error('   CI bricht ab.');
    process.exit(1);
  }
  
  console.log('✅ Keine Mocks oder Hardcodings gefunden!');
  console.log('   ZaehlerUebersichtPage verwendet korrekt den ImmobilienContext.');
}

// Führe die Prüfung aus
if (require.main === module) {
  checkForMocks();
}

module.exports = { checkForMocks };
