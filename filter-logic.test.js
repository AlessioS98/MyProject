// Test della logica di filtro "per data scadenza" in applyFilterModal (app.js).
// Replica esattamente le condizioni di confronto: la scadenza considerata è
// getContrattoScadenzaEffettiva(c) = data_scadenza_rinnovo || data_scadenza.
const assert = require('assert');

// Copia fedele del ramo "date" di applyFilterModal
function filterContract(c, dDecoDa, dScadA) {
    const scadF = c.data_scadenza_rinnovo || c.data_scadenza;
    if (dDecoDa && dScadA) {
        if (c.data_decorrenza && c.data_decorrenza > dScadA) return false;
        if (scadF && scadF < dDecoDa) return false;
        if (!c.data_decorrenza && !scadF) return false;
    } else if (dDecoDa) {
        if (c.data_decorrenza && c.data_decorrenza < dDecoDa) return false;
        if (!c.data_decorrenza) return false;
    } else if (dScadA) {
        if (scadF && scadF > dScadA) return false;
        if (!scadF) return false;
    }
    return true;
}

// Contratto SENZA rinnovo
const senzaRinnovo = { data_decorrenza: '2024-01-01', data_scadenza: '2026-12-31', data_scadenza_rinnovo: null };
// Contratto CON rinnovo (scadenza effettiva = 2025-06-30)
const conRinnovo = { data_decorrenza: '2024-01-01', data_scadenza: '2026-12-31', data_scadenza_rinnovo: '2025-06-30' };

console.log('Test 1 — filtro solo "alla data scadenza" <= 2025-07-01');
assert.strictEqual(filterContract(senzaRinnovo, '', '2025-07-01'), false,
    'SENZA rinnovo: deve usare la scadenza originale (2026-12-31) e quindi NON passare');
assert.strictEqual(filterContract(conRinnovo, '', '2025-07-01'), true,
    'CON rinnovo: deve usare la data rinnovo (2025-06-30) e quindi passare');
console.log('  OK — solo la data rinnovo fa passare il contratto con rinnovo');

console.log('Test 2 — filtro solo "alla data scadenza" <= 2025-07-01 grande NESSUN passaggio per originale');
assert.strictEqual(filterContract(senzaRinnovo, '', '2024-06-01'), false,
    'scadenza originale fuori range => escluso');
assert.strictEqual(filterContract(conRinnovo, '', '2024-06-01'), false,
    'rinnovo (2025-06-30) fuori range => escluso');
console.log('  OK');

console.log('Test 3 — intervallo decorrenza(scadenza), verificata scadenza effettiva come estremo');
assert.strictEqual(filterContract(conRinnovo, '2025-07-01', '2026-01-01'), false,
    'decorrenza(2024-01-01) dentro il range ma scadenza effettiva (2025-06-30) < decorrenzaDa => escluso');
assert.strictEqual(filterContract(senzaRinnovo, '2025-07-01', '2026-01-01'), true,
    'con scadenza originale (2026-12-31) l\'intervallo è coperto => incluso');
console.log('  OK');

console.log('\nTutti i test superati ✓');