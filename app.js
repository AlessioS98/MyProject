/* ============================================
   Gestione Contratti di Affitto - Supabase
   ============================================ */

// --- Supabase Init ---
const SUPABASE_URL = 'https://djqbrwlbjctloxspepnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqcWJyd2xiamN0bG94c3BlcG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0ODc5NDAsImV4cCI6MjEwMzA2Mzk0MH0.ah9cvekaWwu9PkamgkhlTroy6z5Hd9gGgoo77W4uI3c';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Data Cache ---
var appData = { contratti: [], persone: [], immobili: [], scadenze: [], canoni_annuali: [], contratto_locatori: [], contratto_conduttori: [] };

// --- Utility Functions ---
function formatCurrency(n) {
    if (n == null) return '€0';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}
function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}
function daysUntil(d) {
    var n = new Date(); n.setHours(0,0,0,0);
    var t = new Date(d); t.setHours(0,0,0,0);
    return Math.ceil((t - n) / 864e5);
}
function getStatusLabel(s) {
    return { attivo: 'Attivo', scaduto: 'Scaduto', chiuso: 'Chiuso', sospeso: 'Sospeso', completato: 'Completato', 'in-attesa': 'In Attesa' }[s] || s;
}
function getTipoLabel(t) {
    return { canone: 'Canone Affitto', imposta: 'Imposta di Registro', bolletta: 'Bolletta/UTenze', sicurezza: 'Sicurezza', rinnovo: 'Rinnovo Contratto', versamento: 'Versamento IMU/TARI', spese: 'Spese Accessorie' }[t] || t;
}
function getScadenzaIcon(t) {
    return { canone: 'fa-euro-sign', imposta: 'fa-file-invoice', bolletta: 'fa-bolt', sicurezza: 'fa-shield-alt', rinnovo: 'fa-sync-alt', versamento: 'fa-landmark' }[t] || 'fa-calendar';
}
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }
function showToast(msg, type) {
    type = type || 'info';
    var c = document.getElementById('toastContainer');
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    var icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    t.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i><span>' + msg + '</span>';
    c.appendChild(t);
    setTimeout(function() { t.remove(); }, 3000);
}

// --- Toggle Locatore Type ---
function toggleLocatoreType(tipo, rowEl) {
    var container = rowEl || document;
    var locNomeEl = container.querySelector('.loc-nome');
    var locCognomeEl = container.querySelector('.loc-cognome');
    var locRsEl = container.querySelector('.loc-rs');
    var locNomeGroup = locNomeEl ? locNomeEl.closest('.form-group') : null;
    var locCognomeGroup = locCognomeEl ? locCognomeEl.closest('.form-group') : null;
    var locRsGroup = locRsEl ? locRsEl.closest('.form-group') : null;
    if (tipo === 'azienda') {
        if (locNomeEl) locNomeEl.disabled = true;
        if (locCognomeEl) locCognomeEl.disabled = true;
        if (locRsEl) locRsEl.disabled = false;
        if (locNomeGroup) locNomeGroup.style.opacity = '0.4';
        if (locCognomeGroup) locCognomeGroup.style.opacity = '0.4';
        if (locRsGroup) locRsGroup.style.opacity = '1';
    } else {
        if (locNomeEl) locNomeEl.disabled = false;
        if (locCognomeEl) locCognomeEl.disabled = false;
        if (locRsEl) locRsEl.disabled = true;
        if (locNomeGroup) locNomeGroup.style.opacity = '1';
        if (locCognomeGroup) locCognomeGroup.style.opacity = '1';
        if (locRsGroup) locRsGroup.style.opacity = '0.4';
    }
}

function toggleCedolarePercentuale() {
    var cedolareSi = document.getElementById('cf_cedolare_si');
    var percentuale = document.getElementById('cf_percentuale');
    if (!cedolareSi || !percentuale) return;
    if (cedolareSi.checked) {
        // Cedolare secca ATTIVA → percentuale NON compilabile
        percentuale.disabled = true;
        percentuale.closest('.form-group').style.opacity = '0.4';
        percentuale.value = '';
    } else {
        // Cedolare secca NON attiva → percentuale compilabile
        percentuale.disabled = false;
        percentuale.closest('.form-group').style.opacity = '1';
    }
}

function toggleConduttoreType(tipo, rowEl) {
    var container = rowEl || document;
    var conNomeEl = container.querySelector('.cond-nome');
    var conCognomeEl = container.querySelector('.cond-cognome');
    var conRsEl = container.querySelector('.cond-rs');
    var conNomeGroup = conNomeEl ? conNomeEl.closest('.form-group') : null;
    var conCognomeGroup = conCognomeEl ? conCognomeEl.closest('.form-group') : null;
    var conRsGroup = conRsEl ? conRsEl.closest('.form-group') : null;
    if (tipo === 'azienda') {
        if (conNomeEl) conNomeEl.disabled = true;
        if (conCognomeEl) conCognomeEl.disabled = true;
        if (conRsEl) conRsEl.disabled = false;
        if (conNomeGroup) conNomeGroup.style.opacity = '0.4';
        if (conCognomeGroup) conCognomeGroup.style.opacity = '0.4';
        if (conRsGroup) conRsGroup.style.opacity = '1';
    } else {
        if (conNomeEl) conNomeEl.disabled = false;
        if (conCognomeEl) conCognomeEl.disabled = false;
        if (conRsEl) conRsEl.disabled = true;
        if (conNomeGroup) conNomeGroup.style.opacity = '1';
        if (conCognomeGroup) conCognomeGroup.style.opacity = '1';
        if (conRsGroup) conRsGroup.style.opacity = '0.4';
    }
}

// --- Resolve names from IDs ---
function getPersona(id) {
    return appData.persone.find(function(p) { return p.id === id; }) || null;
}
function getPersonaLabel(id) {
    var p = getPersona(id);
    if (!p) return 'N/A';
    return getPersonaDisplayLabel(p);
}
function getImmobile(id) {
    return appData.immobili.find(function(i) { return i.id === id; }) || null;
}
function getImmobileLabel(id) {
    var i = getImmobile(id);
    if (!i) return 'N/A';
    return i.indirizzo + ', ' + i.citta;
}

// --- Multi-person helpers (tabelle ponte) ---
function getLocatoriByContratto(contrattoId) {
    var rels = appData.contratto_locatori.filter(function(r) { return r.contratto_id === contrattoId; });
    if (rels.length === 0) {
        // Fallback to old single locatore_id
        var c = appData.contratti.find(function(x) { return x.id === contrattoId; });
        if (c && c.locatore_id) {
            var p = getPersona(c.locatore_id);
            return p ? [p] : [];
        }
        return [];
    }
    return rels.map(function(r) { return getPersona(r.persona_id); }).filter(Boolean);
}
function getConduttoriByContratto(contrattoId) {
    var rels = appData.contratto_conduttori.filter(function(r) { return r.contratto_id === contrattoId; });
    if (rels.length === 0) {
        // Fallback to old single conduttore_id
        var c = appData.contratti.find(function(x) { return x.id === contrattoId; });
        if (c && c.conduttore_id) {
            var p = getPersona(c.conduttore_id);
            return p ? [p] : [];
        }
        return [];
    }
    return rels.map(function(r) { return getPersona(r.persona_id); }).filter(Boolean);
}
function getPersonaDisplayLabel(p) {
    if (!p) return 'N/A';
    // Azienda: ragione_sociale impostata, nome/cognome vuoti
    if (p.ragione_sociale && !p.nome && !p.cognome) return p.ragione_sociale;
    // Persona fisica: nome e cognome
    return p.nome + ' ' + p.cognome;
}
function getLocatoriLabel(contrattoId) {
    var locs = getLocatoriByContratto(contrattoId);
    if (locs.length === 0) return 'N/A';
    return locs.map(function(p) { return getPersonaDisplayLabel(p); }).join(', ');
}
function getConduttoriLabel(contrattoId) {
    var conds = getConduttoriByContratto(contrattoId);
    if (conds.length === 0) return 'N/A';
    return conds.map(function(p) { return getPersonaDisplayLabel(p); }).join(', ');
}
function getPersonaLabelShort(p) {
    if (!p) return 'N/A';
    if (p.ragione_sociale && !p.nome && !p.cognome) return p.ragione_sociale;
    var label = (p.nome || '') + ' ' + (p.cognome || '');
    if (p.ragione_sociale) label += ' (' + p.ragione_sociale + ')';
    return label.trim();
}

// --- Canoni Annuali helpers ---
function getCanoniByContratto(contrattoId) {
    return appData.canoni_annuali.filter(function(ca) { return ca.contratto_id === contrattoId; });
}
function getCanoneAttuale(contrattoId) {
    var today = new Date().toISOString().slice(0, 10);
    var canoni = getCanoniByContratto(contrattoId);
    return canoni.find(function(ca) {
        return (!ca.data_inizio || ca.data_inizio <= today) && (!ca.data_fine || ca.data_fine >= today);
    }) || canoni[canoni.length - 1] || null;
}
function getTotaleCanoniAnnui(contrattoId) {
    return getCanoniByContratto(contrattoId).reduce(function(s, ca) { return s + (ca.importo || 0); }, 0);
}
var canoneRowCounter = 0;
function addCanoneRow(importo, dataInizio, dataFine, note) {
    canoneRowCounter++;
    var container = document.getElementById('canoniRowsContainer');
    if (!container) return;
    var row = document.createElement('div');
    row.className = 'canone-row';
    row.style.cssText = 'display:flex;gap:8px;align-items:flex-end;margin-bottom:8px;flex-wrap:wrap;';
    row.innerHTML = `
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Importo (EUR)</label><input type="number" class="canone-importo" value="${importo || ''}" min="0" step="0.01" required></div>
        <div class="form-group" style="flex:1;min-width:130px;margin:0"><label>Data Inizio</label><input type="date" class="canone-data-inizio" value="${dataInizio || ''}" required></div>
        <div class="form-group" style="flex:1;min-width:130px;margin:0"><label>Data Fine</label><input type="date" class="canone-data-fine" value="${dataFine || ''}" required></div>
        <button type="button" class="btn btn-sm btn-outline" style="color:var(--danger);margin-bottom:4px" onclick="this.closest('.canone-row').remove()"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(row);
}

// --- CF Autocomplete ---
function setupCfAutocomplete(inputEl, rowEl) {
    var suggestionsEl = document.createElement('div');
    suggestionsEl.className = 'cf-suggestions';
    inputEl.parentNode.style.position = 'relative';
    inputEl.parentNode.appendChild(suggestionsEl);

    inputEl.addEventListener('input', function() {
        var val = inputEl.value.trim().toUpperCase();
        if (val.length < 1) { suggestionsEl.classList.remove('show'); return; }
        // Determina il tipo selezionato (pf o azienda)
        var tipoSel = 'pf';
        var radioChecked = rowEl.querySelector('input[type="radio"]:checked');
        if (radioChecked) tipoSel = radioChecked.value;
        var isAzienda = (tipoSel === 'azienda');
        var seen = {};
        var matches = [];
        appData.persone.forEach(function(p) {
            if (p.codice_fiscale && p.codice_fiscale.toUpperCase().indexOf(val) === 0 && !seen[p.codice_fiscale]) {
                // Filtra per tipo: pf = ha nome/cognome, azienda = ha ragione_sociale
                if (isAzienda) {
                    if (!p.ragione_sociale) return;
                } else {
                    if (!p.nome && !p.cognome) return;
                }
                seen[p.codice_fiscale] = true;
                matches.push(p);
            }
        });
        if (matches.length === 0) { suggestionsEl.classList.remove('show'); return; }
        suggestionsEl.innerHTML = matches.map(function(p, i) {
            var label = p.nome ? (p.cognome + ' ' + p.nome) : (p.ragione_sociale || '-');
            return '<div class="cf-suggestion-item" data-idx="' + i + '"><div class="cf-suggestion-cf">' + p.codice_fiscale + '</div><div class="cf-suggestion-name">' + label + '</div></div>';
        }).join('');
        suggestionsEl.classList.add('show');

        suggestionsEl.querySelectorAll('.cf-suggestion-item').forEach(function(item, i) {
            item.addEventListener('click', function() {
                var p = matches[i];
                inputEl.value = p.codice_fiscale || '';
                suggestionsEl.classList.remove('show');
                if (rowEl.classList.contains('locatore-row')) {
                    var isAzienda = !!(p.ragione_sociale && !p.nome);
                    var tipoRadio = rowEl.querySelector('input[name*="cf_loc_tipo"][value="' + (isAzienda ? 'azienda' : 'pf') + '"]');
                    if (tipoRadio) { tipoRadio.checked = true; toggleLocatoreType(isAzienda ? 'azienda' : 'pf', rowEl); }
                    var rsEl = rowEl.querySelector('.loc-rs');
                    var cogEl = rowEl.querySelector('.loc-cognome');
                    var nomEl = rowEl.querySelector('.loc-nome');
                    if (rsEl) rsEl.value = p.ragione_sociale || '';
                    if (cogEl) cogEl.value = p.cognome || '';
                    if (nomEl) nomEl.value = p.nome || '';
                } else if (rowEl.classList.contains('conduttore-row')) {
                    var isAzienda2 = !!(p.ragione_sociale && !p.nome);
                    var tipoRadio2 = rowEl.querySelector('input[name*="cf_cond_tipo"][value="' + (isAzienda2 ? 'azienda' : 'pf') + '"]');
                    if (tipoRadio2) { tipoRadio2.checked = true; toggleConduttoreType(isAzienda2 ? 'azienda' : 'pf', rowEl); }
                    var rsEl2 = rowEl.querySelector('.cond-rs');
                    var cogEl2 = rowEl.querySelector('.cond-cognome');
                    var nomEl2 = rowEl.querySelector('.cond-nome');
                    if (rsEl2) rsEl2.value = p.ragione_sociale || '';
                    if (cogEl2) cogEl2.value = p.cognome || '';
                    if (nomEl2) nomEl2.value = p.nome || '';
                }
            });
        });
    });

    inputEl.addEventListener('blur', function() {
        setTimeout(function() { suggestionsEl.classList.remove('show'); }, 200);
    });
}

// --- Immobile Field Autocomplete (Foglio / Particella / Sub) ---
function setupImmobileFieldAutocomplete(inputEl, fieldType) {
    var suggestionsEl = document.createElement('div');
    suggestionsEl.className = 'imm-suggestions';
    inputEl.parentNode.style.position = 'relative';
    inputEl.parentNode.appendChild(suggestionsEl);

    inputEl.addEventListener('input', function() {
        var val = inputEl.value.trim().toUpperCase();
        if (val.length < 1) { suggestionsEl.classList.remove('show'); return; }
        var seen = {};
        var matches = [];
        appData.immobili.forEach(function(imm) {
            var fieldVal = (imm[fieldType] || '').toUpperCase();
            if (fieldVal.indexOf(val) === 0 && !seen[fieldVal]) {
                seen[fieldVal] = true;
                matches.push(imm);
            }
        });
        if (matches.length === 0) { suggestionsEl.classList.remove('show'); return; }
        suggestionsEl.innerHTML = matches.map(function(imm, i) {
            var detail = imm.indirizzo + ', ' + imm.citta;
            var foglioPart = imm.foglio ? ('Fg.' + imm.foglio) : '';
            var particellaPart = imm.particella ? ('Part.' + imm.particella) : '';
            var subPart = imm.sub ? ('Sub ' + imm.sub) : '';
            var cadastro = [foglioPart, particellaPart, subPart].filter(Boolean).join(' - ');
            return '<div class="imm-suggestion-item" data-idx="' + i + '"><div class="imm-suggestion-addr">' + detail + '</div><div class="imm-suggestion-cad">' + cadastro + '</div></div>';
        }).join('');
        suggestionsEl.classList.add('show');

        suggestionsEl.querySelectorAll('.imm-suggestion-item').forEach(function(item, idx) {
            item.addEventListener('click', function() {
                var imm = matches[idx];
                document.getElementById('cf_imm_indirizzo').value = imm.indirizzo || '';
                document.getElementById('cf_imm_citta').value = imm.citta || '';
                document.getElementById('cf_imm_foglio').value = imm.foglio || '';
                document.getElementById('cf_imm_particella').value = imm.particella || '';
                document.getElementById('cf_imm_sub').value = imm.sub || '';
                suggestionsEl.classList.remove('show');
            });
        });
    });

    inputEl.addEventListener('blur', function() {
        setTimeout(function() { suggestionsEl.classList.remove('show'); }, 200);
    });
}

// --- Locatore / Conduttore Row Helpers ---
var locatoreRowCounter = 0;
function addLocatoreRow(persona, isEdit) {
    locatoreRowCounter++;
    var container = document.getElementById('locatoriRowsContainer');
    if (!container) return;
    var idx = locatoreRowCounter;
    var p = persona || {};
    var locTipo = (p.ragione_sociale && !p.nome) ? 'azienda' : 'pf';
    var cfReadonly = isEdit ? 'readonly style="background:var(--border-light);cursor:not-allowed"' : '';
    var row = document.createElement('div');
    row.className = 'locatore-row';
    row.style.cssText = 'padding:12px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:8px;position:relative';
    row.innerHTML = `
        <button type="button" class="btn btn-sm btn-outline" style="position:absolute;top:8px;right:8px;color:var(--danger)" onclick="this.closest('.locatore-row').remove()"><i class="fas fa-trash"></i></button>
        <div class="form-group full" style="margin-bottom:8px"><label>Tipo</label>
        <div class="radio-group" style="display:flex;gap:16px;margin-top:6px">
        <label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="cf_loc_tipo_${idx}" value="pf" ${(locTipo==='pf')?'checked':''} onchange="toggleLocatoreType(this.value, this.closest('.locatore-row'))"> Persona Fisica</label>
        <label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="cf_loc_tipo_${idx}" value="azienda" ${(locTipo==='azienda')?'checked':''} onchange="toggleLocatoreType(this.value, this.closest('.locatore-row'))"> Azienda</label>
        </div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Codice Fiscale</label><input type="text" class="loc-cf" value="${p.codice_fiscale || ''}" ${cfReadonly}></div>
        <div class="form-group" style="flex:1;min-width:140px;margin:0" ${(locTipo==='pf')?'style="opacity:0.4"':''}><label>Ragione Sociale</label><input type="text" class="loc-rs" value="${p.ragione_sociale || ''}" ${(locTipo==='pf')?'disabled':''}></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0" ${(locTipo==='azienda')?'style="opacity:0.4"':''}><label>Cognome</label><input type="text" class="loc-cognome" value="${p.cognome || ''}" ${(locTipo==='azienda')?'disabled':''}></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0" ${(locTipo==='azienda')?'style="opacity:0.4"':''}><label>Nome</label><input type="text" class="loc-nome" value="${p.nome || ''}" ${(locTipo==='azienda')?'disabled':''}></div>
        </div>
    `;    container.appendChild(row);
    var cfInput = row.querySelector('.loc-cf');
    if (cfInput && !isEdit) setupCfAutocomplete(cfInput, row);
}


var conduttoreRowCounter = 0;
function addConduttoreRow(persona, isEdit) {
    conduttoreRowCounter++;
    var container = document.getElementById('conduttoriRowsContainer');
    if (!container) return;
    var idx = conduttoreRowCounter;
    var p = persona || {};
    var condTipo = (p.ragione_sociale && !p.nome) ? 'azienda' : 'pf';
    var cfReadonly = isEdit ? 'readonly style="background:var(--border-light);cursor:not-allowed"' : '';
    var row = document.createElement('div');
    row.className = 'conduttore-row';
    row.style.cssText = 'padding:12px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:8px;position:relative';
    row.innerHTML = `
        <button type="button" class="btn btn-sm btn-outline" style="position:absolute;top:8px;right:8px;color:var(--danger)" onclick="this.closest('.conduttore-row').remove()"><i class="fas fa-trash"></i></button>
        <div class="form-group full" style="margin-bottom:8px"><label>Tipo</label>
        <div class="radio-group" style="display:flex;gap:16px;margin-top:6px">
        <label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="cf_cond_tipo_${idx}" value="pf" ${(condTipo==='pf')?'checked':''} onchange="toggleConduttoreType(this.value, this.closest('.conduttore-row'))"> Persona Fisica</label>
        <label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="cf_cond_tipo_${idx}" value="azienda" ${(condTipo==='azienda')?'checked':''} onchange="toggleConduttoreType(this.value, this.closest('.conduttore-row'))"> Azienda</label>
        </div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Codice Fiscale</label><input type="text" class="cond-cf" value="${p.codice_fiscale || ''}" ${cfReadonly}></div>
        <div class="form-group" style="flex:1;min-width:140px;margin:0" ${(condTipo==='pf')?'style="opacity:0.4"':''}><label>Ragione Sociale</label><input type="text" class="cond-rs" value="${p.ragione_sociale || ''}" ${(condTipo==='pf')?'disabled':''}></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0" ${(condTipo==='azienda')?'style="opacity:0.4"':''}><label>Cognome</label><input type="text" class="cond-cognome" value="${p.cognome || ''}" ${(condTipo==='azienda')?'disabled':''}></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0" ${(condTipo==='azienda')?'style="opacity:0.4"':''}><label>Nome</label><input type="text" class="cond-nome" value="${p.nome || ''}" ${(condTipo==='azienda')?'disabled':''}></div>
        </div>
    `;
    container.appendChild(row);
    var cfInput = row.querySelector('.cond-cf');
    if (cfInput && !isEdit) setupCfAutocomplete(cfInput, row);
}

// --- Calculate contract status ---
function calcContrattoStato(c) {
    if (c.data_chiusura) return 'chiuso';
    var d = daysUntil(c.data_scadenza);
    if (d <= 0) return 'scaduto';
    return 'attivo';
}



// --- Helper: formatta data come YYYY-MM-DD nel fuso orario locale ---
function toLocalDateStr(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

// --- Calcola scadenze Imposta di Registro 30gg per un contratto ---
// Ogni anno dalla decorrenza, entro 30 giorni dalla scadenza annuale
// Una volta pagato, il periodo successivo parte dal giorno dopo la deadline
function calcolaScadenzeRegistro(contratto) {
    if (!contratto.data_decorrenza || !contratto.data_scadenza) return [];
    var risultati = [];
    var partsStart = contratto.data_decorrenza.split('-').map(Number);
    var partsEnd = contratto.data_scadenza.split('-').map(Number);
    var periodStart = new Date(partsStart[0], partsStart[1] - 1, partsStart[2]);
    var scadenzaFine = new Date(partsEnd[0], partsEnd[1] - 1, partsEnd[2]);

    // Conta quante scadenze sono state completate per questo contratto
    var numCompletate = appData.scadenze.filter(function(s) {
        return s.contratto_id === contratto.id && s.stato === 'completata';
    }).length;

    var idx = 0;
    while (periodStart <= scadenzaFine) {
        var deadline = new Date(periodStart.getFullYear() + 1, periodStart.getMonth(), periodStart.getDate() + 30);
        var deadlineStr = toLocalDateStr(deadline);
        var isPaid = idx < numCompletate;

        risultati.push({
            periodStart: toLocalDateStr(periodStart),
            deadlineStr: deadlineStr,
            isPaid: isPaid,
            scadenzaId: null
        });

        idx++;
        // Il prossimo periodo inizia il giorno dopo la deadline
        periodStart = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate() + 1);
    }

    return risultati;
}

// --- Data Loading ---
async function loadAllData() {
    try {
        var [persone, immobili, contratti, scadenze, canoni, locRel, condRel] = await Promise.all([
            db.from('anagrafica_persona').select('*'),
            db.from('immobili').select('*'),
            db.from('contratti').select('*'),
            db.from('scadenze').select('*'),
            db.from('canoni_annuali').select('*'),
            db.from('contratto_locatori').select('*'),
            db.from('contratto_conduttori').select('*')
        ]);
        appData.persone = persone.data || [];
        appData.immobili = immobili.data || [];
        appData.contratti = contratti.data || [];
        appData.scadenze = scadenze.data || [];
        appData.canoni_annuali = canoni.data || [];
        appData.contratto_locatori = locRel.data || [];
        appData.contratto_conduttori = condRel.data || [];
    } catch (e) {
        console.error('Errore caricamento dati:', e);
        showToast('Errore nel caricamento dei dati', 'error');
    }
}

// --- Navigation ---
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    var pe = document.getElementById('page-' + page);
    var ne = document.querySelector('[data-page="' + page + '"]');
    if (pe) pe.classList.add('active');
    if (ne) ne.classList.add('active');
    closeSidebar();
    refreshPage(page);
}
async function refreshPage(page) {
    switch (page) {
        case 'dashboard': await renderDashboard(); break;
        case 'contratti': await renderContratti(); break;
        case 'scadenze': await renderScadenze(); break;
    }
}

// --- Event Delegation ---
document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var id = parseInt(btn.getAttribute('data-id')) || 0;
    switch (action) {
        case 'new-contratto': openModal('newContratto'); break;
        case 'edit-contratto': openModal('editContratto', id); break;
        case 'delete-contratto': openModal('deleteContrattoConfirm', id); break;
        case 'view-contratto': openModal('viewContratto', id); break;

        case 'complete-scadenza': var dl = btn.getAttribute('data-deadline'); var cid = btn.getAttribute('data-contratto-id'); openCompleteScadenzaModal(id, dl, cid); break;
        case 'new-inquilino': openModal('newInquilino'); break;

        case 'close-modal': closeModal(); break;
    }
});

// --- Sidebar & Theme ---
document.getElementById('menuToggle').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('open');
});
document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
document.querySelectorAll('.nav-item').forEach(function(item) {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        navigateTo(item.dataset.page);
    });
});
var isDark = localStorage.getItem('theme') === 'dark';
if (isDark) document.documentElement.setAttribute('data-theme', 'dark');
document.getElementById('themeToggle').addEventListener('click', function() {
    isDark = !isDark;
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.querySelector('#themeToggle i').className = 'fas fa-sun';
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.querySelector('#themeToggle i').className = 'fas fa-moon';
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// --- Notifications ---
document.getElementById('notifBtn').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('notifPanel').classList.toggle('show');
});
document.addEventListener('click', function() {
    document.getElementById('notifPanel').classList.remove('show');
});
document.getElementById('notifPanel').addEventListener('click', function(e) {
    e.stopPropagation();
});

// --- Filter Modal ---
function closeFilterModal() {
    document.getElementById('filterModalOverlay').classList.remove('active');
}

// --- Filter Autocomplete ---
function setupFilterAutocomplete(inputEl, getValues, onPick) {
    var suggestionsEl = document.createElement('div');
    suggestionsEl.className = 'imm-suggestions';
    inputEl.parentNode.appendChild(suggestionsEl);

    inputEl.addEventListener('input', function() {
        var val = inputEl.value.trim().toUpperCase();
        if (val.length < 1) { suggestionsEl.classList.remove('show'); return; }
        var items = getValues();
        var seen = {};
        var matches = [];
        items.forEach(function(item) {
            var label = (typeof item === 'string') ? item : item.label;
            if (label && label.toUpperCase().indexOf(val) === 0 && !seen[label.toUpperCase()]) {
                seen[label.toUpperCase()] = true;
                matches.push(item);
            }
        });
        if (matches.length === 0) { suggestionsEl.classList.remove('show'); return; }
        suggestionsEl.innerHTML = matches.map(function(item, i) {
            var label = (typeof item === 'string') ? item : item.label;
            var sub = (typeof item === 'object' && item.sub) ? '<div class="imm-suggestion-cad">' + item.sub + '</div>' : '';
            return '<div class="imm-suggestion-item" data-idx="' + i + '"><div class="imm-suggestion-addr">' + label + '</div>' + sub + '</div>';
        }).join('');
        suggestionsEl.classList.add('show');

        suggestionsEl.querySelectorAll('.imm-suggestion-item').forEach(function(el, idx) {
            el.addEventListener('click', function() {
                var item = matches[idx];
                var label = (typeof item === 'string') ? item : item.label;
                inputEl.value = label;
                suggestionsEl.classList.remove('show');
                if (onPick && typeof item === 'object' && item.data) onPick(item.data);
            });
        });
    });

    inputEl.addEventListener('blur', function() {
        setTimeout(function() { suggestionsEl.classList.remove('show'); }, 200);
    });
}

function openFilterModal() {
    var overlay = document.getElementById('filterModalOverlay');
    overlay.classList.add('active');
    setupFilterInputs();
}

function setupFilterInputs() {
    // Collect persone used as locatori
    var locatori = [];
    var seenLoc = {};
    appData.contratti.forEach(function(c) {
        getLocatoriByContratto(c.id).forEach(function(p) {
            if (!seenLoc[p.id]) { seenLoc[p.id] = true; locatori.push(p); }
        });
    });
    // Collect persone used as conduttori
    var conduttori = [];
    var seenCond = {};
    appData.contratti.forEach(function(c) {
        getConduttoriByContratto(c.id).forEach(function(p) {
            if (!seenCond[p.id]) { seenCond[p.id] = true; conduttori.push(p); }
        });
    });
    // Collect immobili used in contracts
    var immUsed = [];
    var seenImm = {};
    appData.contratti.forEach(function(c) {
        var imm = getImmobile(c.immobile_id);
        if (imm && !seenImm[imm.id]) { seenImm[imm.id] = true; immUsed.push(imm); }
    });

    // Locatore
    setupFilterAutocomplete(document.getElementById('ffLocNome'),
        function() { return locatori.map(function(p) { return { label: p.nome }; }); }, null);
    setupFilterAutocomplete(document.getElementById('ffLocCognome'),
        function() { return locatori.map(function(p) { return { label: p.cognome }; }); }, null);
    setupFilterAutocomplete(document.getElementById('ffLocCF'),
        function() { return locatori.map(function(p) { return p.codice_fiscale ? { label: p.codice_fiscale, sub: getPersonaLabelShort(p) } : null; }).filter(Boolean); }, null);
    setupFilterAutocomplete(document.getElementById('ffLocRS'),
        function() { return locatori.filter(function(p) { return p.ragione_sociale; }).map(function(p) { return { label: p.ragione_sociale }; }); }, null);

    // Conduttore
    setupFilterAutocomplete(document.getElementById('ffConNome'),
        function() { return conduttori.map(function(p) { return { label: p.nome }; }); }, null);
    setupFilterAutocomplete(document.getElementById('ffConCognome'),
        function() { return conduttori.map(function(p) { return { label: p.cognome }; }); }, null);
    setupFilterAutocomplete(document.getElementById('ffConCF'),
        function() { return conduttori.map(function(p) { return p.codice_fiscale ? { label: p.codice_fiscale, sub: getPersonaLabelShort(p) } : null; }).filter(Boolean); }, null);
    setupFilterAutocomplete(document.getElementById('ffConRS'),
        function() { return conduttori.filter(function(p) { return p.ragione_sociale; }).map(function(p) { return { label: p.ragione_sociale }; }); }, null);

    // Immobile
    setupFilterAutocomplete(document.getElementById('ffIndirizzo'),
        function() { return immUsed.map(function(i) { return { label: i.indirizzo, sub: i.citta }; }); }, null);
    setupFilterAutocomplete(document.getElementById('ffCitta'),
        function() { return immUsed.map(function(i) { return { label: i.citta }; }); }, null);

    // Identificativo
    setupFilterAutocomplete(document.getElementById('ffIdentificativo'),
        function() { return appData.contratti.map(function(c) { return { label: c.identificativo }; }); }, null);

    // Immobile - Foglio, Particella, Sub
    setupFilterAutocomplete(document.getElementById('ffFoglio'),
        function() { return immUsed.map(function(i) { return i.foglio ? { label: i.foglio, sub: i.indirizzo + ', ' + i.citta } : null; }).filter(Boolean); }, null);
    setupFilterAutocomplete(document.getElementById('ffParticella'),
        function() { return immUsed.map(function(i) { return i.particella ? { label: i.particella, sub: i.indirizzo + ', ' + i.citta } : null; }).filter(Boolean); }, null);
    setupFilterAutocomplete(document.getElementById('ffSub'),
        function() { return immUsed.map(function(i) { return i.sub ? { label: i.sub, sub: i.indirizzo + ', ' + i.citta } : null; }).filter(Boolean); }, null);
}

function resetFilterModal() {
    document.getElementById('ffLocCF').value = '';
    document.getElementById('ffLocRS').value = '';
    document.getElementById('ffLocCognome').value = '';
    document.getElementById('ffLocNome').value = '';
    document.getElementById('ffConCF').value = '';
    document.getElementById('ffConRS').value = '';
    document.getElementById('ffConCognome').value = '';
    document.getElementById('ffConNome').value = '';
    document.getElementById('ffIndirizzo').value = '';
    document.getElementById('ffCitta').value = '';
    document.getElementById('ffFoglio').value = '';
    document.getElementById('ffParticella').value = '';
    document.getElementById('ffSub').value = '';
    document.getElementById('ffIdentificativo').value = '';
    document.getElementById('ffDecoDa').value = '';
    document.getElementById('ffScadA').value = '';
    document.getElementById('ffDataChiusura').value = '';
}

function applyFilterModal() {
    var f = appData.contratti.slice();

    function matchField(val, filterVal) {
        if (!filterVal) return true;
        return val && val.toLowerCase() === filterVal.toLowerCase();
    }

    // Locatore (check all locatori of the contract)
    var locNome = document.getElementById('ffLocNome').value;
    var locCognome = document.getElementById('ffLocCognome').value;
    var locCF = document.getElementById('ffLocCF').value;
    var locRS = document.getElementById('ffLocRS').value;
    f = f.filter(function(c) {
        var locs = getLocatoriByContratto(c.id);
        if (locs.length === 0) return false;
        return locs.some(function(p) {
            return matchField(p.nome, locNome) && matchField(p.cognome, locCognome) && matchField(p.codice_fiscale, locCF) && matchField(p.ragione_sociale, locRS);
        });
    });

    // Conduttore (check all conduttori of the contract)
    var conNome = document.getElementById('ffConNome').value;
    var conCognome = document.getElementById('ffConCognome').value;
    var conCF = document.getElementById('ffConCF').value;
    var conRS = document.getElementById('ffConRS').value;
    f = f.filter(function(c) {
        var conds = getConduttoriByContratto(c.id);
        if (conds.length === 0) return false;
        return conds.some(function(p) {
            return matchField(p.nome, conNome) && matchField(p.cognome, conCognome) && matchField(p.codice_fiscale, conCF) && matchField(p.ragione_sociale, conRS);
        });
    });

    // Immobile
    var indirizzo = document.getElementById('ffIndirizzo').value;
    var citta = document.getElementById('ffCitta').value;
    var foglio = document.getElementById('ffFoglio').value;
    var particella = document.getElementById('ffParticella').value;
    var sub = document.getElementById('ffSub').value;
    f = f.filter(function(c) {
        var i = getImmobile(c.immobile_id);
        if (!i) return false;
        return matchField(i.indirizzo, indirizzo) && matchField(i.citta, citta) && matchField(i.foglio, foglio) && matchField(i.particella, particella) && matchField(i.sub, sub);
    });

    // Contratto
    var ident = document.getElementById('ffIdentificativo').value;
    var dChi = document.getElementById('ffDataChiusura').value;
    var dDecoDa = document.getElementById('ffDecoDa').value;
    var dScadA = document.getElementById('ffScadA').value;
    f = f.filter(function(c) {
        // Identificativo
        if (!matchField(c.identificativo, ident)) return false;
        // Data chiusura
        if (!matchField(c.data_chiusura, dChi)) return false;
        // Date range
        if (dDecoDa && dScadA) {
            // Entrambi inseriti: mostra tutti i contratti che si sorappongono al range
            if (c.data_decorrenza && c.data_decorrenza > dScadA) return false;
            if (c.data_scadenza && c.data_scadenza < dDecoDa) return false;
            if (!c.data_decorrenza && !c.data_scadenza) return false;
        } else if (dDecoDa) {
            // Solo da decorrenza: contratti con decorrenza >= dDecoDa
            if (c.data_decorrenza && c.data_decorrenza < dDecoDa) return false;
            if (!c.data_decorrenza) return false;
        } else if (dScadA) {
            // Solo a scadenza: contratti con scadenza <= dScadA
            if (c.data_scadenza && c.data_scadenza > dScadA) return false;
            if (!c.data_scadenza) return false;
        }
        return true;
    });

    closeFilterModal();
    renderContrattiList(f);
}

// --- Export ---
function exportData(type) {
    var csv = '';
    if (type === 'contratti') {
        csv = 'Identificativo,Locatore,Conduttore,Immobile,Canone Annuale,Decorrenza,Scadenza,Stato,Cedolare Secca\n';
        appData.contratti.forEach(function(c) {
            var stato = calcContrattoStato(c);
            var caExp = getCanoneAttuale(c.id);
            csv += '"' + c.identificativo + '","' + getLocatoriLabel(c.id) + '","' + getConduttoriLabel(c.id) + '","' + getImmobileLabel(c.immobile_id) + '",' + (caExp ? caExp.importo : 0) + ',"' + (c.data_decorrenza||'') + '","' + (c.data_scadenza||'') + '","' + getStatusLabel(stato) + '",' + (c.tassazione_cedolare_secca ? 'SI' : 'NO') + '\n';
        });
    }
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = type + '_export.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('Esportazione completata!', 'success');
}

// ============================================
// MODALS
// ============================================

function openModal(type, id) {
    var overlay = document.getElementById('modalOverlay');
    var title = document.getElementById('modalTitle');
    var body = document.getElementById('modalBody');
    var html = '';

    if (type === 'newContratto' || type === 'editContratto') {
        var c = type === 'editContratto' ? appData.contratti.find(function(x) { return x.id === id; }) : null;
        title.textContent = c ? 'Modifica Contratto' : 'Nuovo Contratto';

        // Get immobile data for edit
        var imm = c ? getImmobile(c.immobile_id) : null;

        html = '<form id="contrattoForm" class="form-grid">';

        // --- SEZIONE CONTRATTO ---
        html += '<div class="form-section-title full"><i class="fas fa-file-contract"></i> Dati Contratto</div>';
        html += '<div class="form-group"><label>Identificativo</label><input type="text" id="cf_identificativo" value="' + (c ? c.identificativo : '') + '" required></div>';
        var cedChecked = c && c.tassazione_cedolare_secca;
        html += '<div class="form-group"><label>Tassazione Cedolare Secca</label>';
        html += '<div class="radio-group" style="display:flex;gap:16px;margin-top:6px">';
        html += '<label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="cf_cedolare" id="cf_cedolare_si" value="true"' + (!cedChecked ? ' checked' : '') + ' onchange="toggleCedolarePercentuale()"> Sì</label>';
        html += '<label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="cf_cedolare" id="cf_cedolare_no" value="false"' + (cedChecked ? ' checked' : '') + ' onchange="toggleCedolarePercentuale()"> No</label>';
        html += '</div></div>';
        html += '<div class="form-group"><label>Data Decorrenza</label><input type="date" id="cf_decorrenza" value="' + (c ? c.data_decorrenza : '') + '" required></div>';
        html += '<div class="form-group"><label>Data Scadenza</label><input type="date" id="cf_scadenza" value="' + (c ? c.data_scadenza : '') + '" required></div>';
        html += '<div class="form-group"><label>Data Chiusura</label><input type="date" id="cf_chiusura" value="' + (c && c.data_chiusura ? c.data_chiusura : '') + '"></div><br>';
        // --- SEZIONE CANONI ANNUALI ---
        html += '<div class="form-section-title full"><i class="fas fa-euro-sign"></i> Canoni Annuali</div>';
        html += '<div class="form-group full"><div id="canoniRowsContainer"></div>';
        html += '<button type="button" class="btn btn-sm btn-outline" onclick="addCanoneRow()"><i class="fas fa-plus"></i> Aggiungi Canone</button></div>';
        html += '<div class="form-group-box full"><div class="form-group-box-title"><i class="fas fa-file-invoice"></i> Imposta di Registro</div>';
        html += '<div style="display:flex;gap:16px;flex-wrap:wrap">';
        html += '<div class="form-group" style="flex:1;min-width:140px"><label>Percentuale (%)</label><input type="number" id="cf_percentuale" value="' + (c ? c.percentuale : '') + '" min="0" max="100" step="0.01"></div>';
        html += '<div class="form-group" style="flex:1;min-width:140px"><label>Valore Assoluto (EUR)</label><input type="number" id="cf_valore_assoluto" value="' + (c ? c.valore_assoluto : '') + '" min="0" step="0.01"></div>';
        html += '</div></div>';
        html += '<div class="form-group full"><label>Note</label><textarea id="cf_note">' + (c ? (c.note || '') : '') + '</textarea></div>';

        // --- SEZIONE LOCATORI ---
        html += '<div class="form-section-title full"><i class="fas fa-user-tie"></i> Locatori</div>';
        html += '<div class="form-group full"><div id="locatoriRowsContainer"></div>';
        html += '<button type="button" class="btn btn-sm btn-outline" onclick="addLocatoreRow()"><i class="fas fa-plus"></i> Aggiungi Locatore</button></div>';

        // --- SEZIONE CONDUTTORI ---
        html += '<div class="form-section-title full"><i class="fas fa-user"></i> Conduttori</div>';
        html += '<div class="form-group full"><div id="conduttoriRowsContainer"></div>';
        html += '<button type="button" class="btn btn-sm btn-outline" onclick="addConduttoreRow()"><i class="fas fa-plus"></i> Aggiungi Conduttore</button></div>';

        // --- SEZIONE IMMOBILE ---
        html += '<div class="form-section-title full"><i class="fas fa-home"></i> Immobile</div>';
        html += '<div class="form-group"><label>Indirizzo</label><input type="text" id="cf_imm_indirizzo" value="' + (imm ? imm.indirizzo : '') + '" required></div>';
        html += '<div class="form-group"><label>Città</label><input type="text" id="cf_imm_citta" value="' + (imm ? imm.citta : '') + '" required></div>';
        var apeChecked = imm && imm.ape;
        html += '<div class="form-group"><label>APE</label>';
        html += '<div class="radio-group" style="display:flex;gap:16px;margin-top:6px">';
        html += '<label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="cf_imm_ape" value="true"' + (!apeChecked ? ' checked' : '') + '> Sì</label>';
        html += '<label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="cf_imm_ape" value="false"' + (apeChecked ? ' checked' : '') + '> No</label>';
        html += '</div></div>';
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;width:100%">';
        html += '<div class="form-group" style="flex:1;min-width:80px;margin:0"><label>Foglio</label><input type="text" id="cf_imm_foglio" value="' + (imm ? (imm.foglio || '') : '') + '" style="max-width:100px"></div>';
        html += '<div class="form-group" style="flex:1;min-width:80px;margin:0"><label>Particella</label><input type="text" id="cf_imm_particella" value="' + (imm ? (imm.particella || '') : '') + '" style="max-width:100px"></div>';
        html += '<div class="form-group" style="flex:1;min-width:80px;margin:0"><label>Sub</label><input type="text" id="cf_imm_sub" value="' + (imm ? (imm.sub || '') : '') + '" style="max-width:100px"></div>';
        html += '</div>';

        html += '<div class="form-actions full"><button type="button" class="btn btn-outline" data-action="close-modal">Annulla</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salva</button></div>';
        html += '</form>';





    } else if (type === 'newInquilino') {
        title.textContent = 'Nuovo Inquilino';
        html = '<form id="inquilinoForm" class="form-grid">';
        html += '<div class="form-group"><label>Nome</label><input type="text" id="iqf_nome" required></div>';
        html += '<div class="form-group"><label>Cognome</label><input type="text" id="iqf_cognome" required></div>';
        html += '<div class="form-group"><label>Codice Fiscale</label><input type="text" id="iqf_cf"></div>';
        html += '<div class="form-group"><label>Ragione Sociale</label><input type="text" id="iqf_rs"></div>';
        html += '<div class="form-actions full"><button type="button" class="btn btn-outline" data-action="close-modal">Annulla</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salva</button></div>';
        html += '</form>';



    } else if (type === 'viewContratto') {
        var cv = appData.contratti.find(function(x) { return x.id === id; });
        if (!cv) return;
        title.textContent = 'Dettaglio Contratto';
        var stato = calcContrattoStato(cv);
        var dv = daysUntil(cv.data_scadenza);
        var dl = dv > 0 ? dv + ' giorni alla scadenza' : dv === 0 ? 'Scade oggi!' : 'Scaduto da ' + Math.abs(dv) + ' giorni';
        var dc = dv <= 30 ? 'urgent' : '';
        var locs = getLocatoriByContratto(cv.id);
        var conds = getConduttoriByContratto(cv.id);
        var imm = getImmobile(cv.immobile_id);

        html = '<div class="contract-details" style="margin-bottom:16px">';
        html += '<div class="contract-detail"><label>Identificativo</label><span>' + cv.identificativo + '</span></div>';
        html += '<div class="contract-detail"><label>Stato</label><span><span class="status-badge ' + stato + '">' + getStatusLabel(stato) + '</span></span></div>';
        var canoniCv = getCanoniByContratto(cv.id);
        if (canoniCv.length > 0) {
            canoniCv.forEach(function(ca) {
                html += '<div class="contract-detail"><label>Canone ' + formatDate(ca.data_inizio) + ' → ' + formatDate(ca.data_fine) + '</label><span>' + formatCurrency(ca.importo) + '</span></div>';
            });
        } else {
            html += '<div class="contract-detail"><label>Canone Annuale</label><span>-</span></div>';
        }
        html += '<div class="contract-detail"><label>Percentuale</label><span>' + (cv.percentuale || 0) + '%</span></div>';
        html += '<div class="contract-detail"><label>Valore Assoluto</label><span>' + formatCurrency(cv.valore_assoluto) + '</span></div>';
        html += '<div class="contract-detail"><label>Decorrenza</label><span>' + formatDate(cv.data_decorrenza) + '</span></div>';
        html += '<div class="contract-detail"><label>Scadenza</label><span style="' + (dc ? 'color:var(--danger)' : '') + '">' + formatDate(cv.data_scadenza) + '</span></div>';
        html += '<div class="contract-detail"><label>Chiusura</label><span>' + (cv.data_chiusura ? formatDate(cv.data_chiusura) : '-') + '</span></div>';
        html += '<div class="contract-detail"><label>Cedolare Secca</label><span>' + (cv.tassazione_cedolare_secca ? 'SI' : 'NO') + '</span></div>';
        html += '<div class="contract-detail"><label>Rimanenza</label><span class="' + dc + '">' + dl + '</span></div>';
        html += '</div>';

        // Locatori
        html += '<div style="padding:12px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:12px">';
        html += '<strong><i class="fas fa-user-tie"></i> Locatori:</strong><br>';
        if (locs.length > 0) {
            locs.forEach(function(loc) {
                html += '<span style="display:inline-block;margin:4px 0">' + getPersonaLabelShort(loc) + (loc.codice_fiscale ? ' <small>(CF: ' + loc.codice_fiscale + ')</small>' : '') + '</span><br>';
            });
        } else {
            html += 'N/A';
        }
        html += '</div>';

        // Conduttori
        html += '<div style="padding:12px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:12px">';
        html += '<strong><i class="fas fa-user"></i> Conduttori:</strong><br>';
        if (conds.length > 0) {
            conds.forEach(function(cond) {
                html += '<span style="display:inline-block;margin:4px 0">' + getPersonaLabelShort(cond) + (cond.codice_fiscale ? ' <small>(CF: ' + cond.codice_fiscale + ')</small>' : '') + '</span><br>';
            });
        } else {
            html += 'N/A';
        }
        html += '</div>';

        // Immobile
        html += '<div style="padding:12px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:12px">';
        html += '<strong><i class="fas fa-home"></i> Immobile:</strong> ';
        html += imm ? imm.indirizzo + ', ' + imm.citta + (imm.foglio ? ' (Fg. ' + imm.foglio + ', Part. ' + imm.particella + ', Sub ' + imm.sub + ')' : '') + (imm.ape ? ' [APE]' : '') : 'N/A';
        html += '</div>';

        html += '<div style="padding:12px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:16px"><strong>Note:</strong> ' + (cv.note || 'Nessuna nota') + '</div>';
        html += '<div class="form-actions"><button type="button" class="btn btn-outline" data-action="close-modal">Chiudi</button></div>';

    } else if (type === 'deleteContrattoConfirm') {
        var cd = appData.contratti.find(function(x) { return x.id === id; });
        if (!cd) return;
        title.textContent = 'Conferma Eliminazione';
        html = '<div style="padding:16px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:16px;border-left:4px solid var(--danger)">';
        html += '<strong style="color:var(--danger)"><i class="fas fa-exclamation-triangle"></i> Attenzione!</strong><br>';
        html += '<span>Stai per eliminare il contratto <strong>' + cd.identificativo + '</strong> e tutti i dati collegati (locatori, conduttori, canoni, scadenze).</span>';
        html += '</div>';
        html += '<div class="form-group full"><label>Scrivi <strong>CONFERMA</strong> per procedere</label>';
        html += '<input type="text" id="deleteConfirmInput" placeholder="CONFERMA" style="text-transform:uppercase">';
        html += '<div id="deleteConfirmWarning" style="display:none;color:var(--danger);font-size:0.82rem;margin-top:6px"><i class="fas fa-exclamation-circle"></i> Testo non corretto. Scrivi esattamente <strong>CONFERMA</strong></div>';
        html += '</div>';
        html += '<div class="form-actions full">';
        html += '<button type="button" class="btn btn-outline" data-action="close-modal">Annulla</button>';
        html += '<button type="button" class="btn btn-danger" id="deleteConfirmBtn" disabled><i class="fas fa-trash"></i> Elimina</button>';
        html += '</div>';

    }

    body.innerHTML = html;
    overlay.classList.add('show');

    // Attach form listeners
    var cf = document.getElementById('contrattoForm');
    if (cf) {
        cf.addEventListener('submit', function(e) { e.preventDefault(); saveContratto(id); });
        // Apply initial cedolare percentuale toggle
        toggleCedolarePercentuale();
        // Populate existing canoni annuali for edit mode
        if (type === 'editContratto' && id) {
            var existingCanoni = getCanoniByContratto(id);
            existingCanoni.forEach(function(ca) {
                addCanoneRow(ca.importo, ca.data_inizio, ca.data_fine, ca.note || '');
            });
            // Populate existing locatori
            var existingLocs = getLocatoriByContratto(id);
            existingLocs.forEach(function(p) { addLocatoreRow(p, true); });
            // Populate existing conduttori
            var existingConds = getConduttoriByContratto(id);
            existingConds.forEach(function(p) { addConduttoreRow(p, true); });
        }
        // If new contract, add one empty row for each section
        if (type === 'newContratto') {
            addCanoneRow();
            addLocatoreRow();
            addConduttoreRow();
        }
        // Setup immobile field autocomplete
        var foglioEl = document.getElementById('cf_imm_foglio');
        var particellaEl = document.getElementById('cf_imm_particella');
        var subEl = document.getElementById('cf_imm_sub');
        if (foglioEl) setupImmobileFieldAutocomplete(foglioEl, 'foglio');
        if (particellaEl) setupImmobileFieldAutocomplete(particellaEl, 'particella');
        if (subEl) setupImmobileFieldAutocomplete(subEl, 'sub');
    }
    var iqf = document.getElementById('inquilinoForm');
    if (iqf) iqf.addEventListener('submit', function(e) { e.preventDefault(); saveInquilino(); });


    // Delete confirmation modal
    var deleteInput = document.getElementById('deleteConfirmInput');
    var deleteBtn = document.getElementById('deleteConfirmBtn');
    var deleteWarning = document.getElementById('deleteConfirmWarning');
    if (deleteInput && deleteBtn) {
        deleteInput.addEventListener('input', function() {
            var isCorrect = deleteInput.value.trim().toUpperCase() === 'CONFERMA';
            deleteBtn.disabled = !isCorrect;
            if (deleteWarning) deleteWarning.style.display = (deleteInput.value.length > 0 && !isCorrect) ? 'block' : 'none';
        });
        deleteBtn.addEventListener('click', function() {
            if (deleteInput.value.trim().toUpperCase() === 'CONFERMA') {
                closeModal();
                deleteContratto(id);
            }
        });
    }
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
}

// ============================================
// CRUD OPERATIONS (Supabase)
// ============================================

// --- Save/Update Persona ---
async function upsertPersona(dati) {
    // Check if persona with same CF exists
    if (dati.codice_fiscale) {
        var existing = appData.persone.find(function(p) { return p.codice_fiscale === dati.codice_fiscale; });
        if (existing) return existing.id;
    }
    var { data, error } = await db.from('anagrafica_persona').insert({
        nome: dati.nome,
        cognome: dati.cognome,
        codice_fiscale: dati.codice_fiscale || null,
        ragione_sociale: dati.ragione_sociale || null
    }).select('id').single();
    if (error) { console.error('Errore save persona:', error); return null; }
    appData.persone.push({ id: data.id, ...dati });
    return data.id;
}

// --- Save/Update Immobile ---
async function upsertImmobile(dati) {
    var { data, error } = await db.from('immobili').insert({
        indirizzo: dati.indirizzo,
        citta: dati.citta,
        foglio: dati.foglio || null,
        particella: dati.particella || null,
        sub: dati.sub || null,
        ape: dati.ape || false
    }).select('id').single();
    if (error) { console.error('Errore save immobile:', error); return null; }
    appData.immobili.push({ id: data.id, ...dati });
    return data.id;
}

// --- Save/Update Contratto ---
async function saveContratto(editId) {
    // Collect all locatori from dynamic rows
    var locRows = document.querySelectorAll('#locatoriRowsContainer .locatore-row');
    var locIds = [];
    for (var i = 0; i < locRows.length; i++) {
        var row = locRows[i];
        var locTipo = (row.querySelector('input[type="radio"]:checked') || {}).value || 'pf';
        var locId = await upsertPersona({
            nome: locTipo === 'azienda' ? '' : (row.querySelector('.loc-nome') || {}).value.trim(),
            cognome: locTipo === 'azienda' ? '' : (row.querySelector('.loc-cognome') || {}).value.trim(),
            codice_fiscale: (row.querySelector('.loc-cf') || {}).value.trim(),
            ragione_sociale: locTipo === 'pf' ? '' : (row.querySelector('.loc-rs') || {}).value.trim()
        });
        if (locId) locIds.push(locId);
    }

    // Collect all conduttori from dynamic rows
    var condRows = document.querySelectorAll('#conduttoriRowsContainer .conduttore-row');
    var condIds = [];
    for (var j = 0; j < condRows.length; j++) {
        var crow = condRows[j];
        var condTipo = (crow.querySelector('input[type="radio"]:checked') || {}).value || 'pf';
        var condId = await upsertPersona({
            nome: condTipo === 'azienda' ? '' : (crow.querySelector('.cond-nome') || {}).value.trim(),
            cognome: condTipo === 'azienda' ? '' : (crow.querySelector('.cond-cognome') || {}).value.trim(),
            codice_fiscale: (crow.querySelector('.cond-cf') || {}).value.trim(),
            ragione_sociale: condTipo === 'pf' ? '' : (crow.querySelector('.cond-rs') || {}).value.trim()
        });
        if (condId) condIds.push(condId);
    }

    var immId = await upsertImmobile({
        indirizzo: document.getElementById('cf_imm_indirizzo').value.trim(),
        citta: document.getElementById('cf_imm_citta').value.trim(),
        foglio: document.getElementById('cf_imm_foglio').value.trim(),
        particella: document.getElementById('cf_imm_particella').value.trim(),
        sub: document.getElementById('cf_imm_sub').value.trim(),
        ape: document.querySelector('input[name="cf_imm_ape"]:checked').value === 'true'
    });

    var contrattoData = {
        identificativo: document.getElementById('cf_identificativo').value.trim(),
        data_decorrenza: document.getElementById('cf_decorrenza').value || null,
        data_scadenza: document.getElementById('cf_scadenza').value || null,
        data_chiusura: document.getElementById('cf_chiusura').value || null,
        tassazione_cedolare_secca: document.querySelector('input[name="cf_cedolare"]:checked').value === 'true',
        locatore_id: locIds.length > 0 ? locIds[0] : null,
        conduttore_id: condIds.length > 0 ? condIds[0] : null,
        immobile_id: immId,
        percentuale: parseFloat(document.getElementById('cf_percentuale').value) || 0,
        valore_assoluto: parseFloat(document.getElementById('cf_valore_assoluto').value) || 0,
        note: document.getElementById('cf_note').value.trim()
    };

    var targetId = editId;
    if (targetId) {
        var { error } = await db.from('contratti').update(contrattoData).eq('id', targetId);
        if (error) { console.error('Errore update contratto:', error); showToast('Errore salvataggio', 'error'); return; }
        var idx = appData.contratti.findIndex(function(c) { return c.id === targetId; });
        if (idx >= 0) Object.assign(appData.contratti[idx], contrattoData);
    } else {
        var { data, error } = await db.from('contratti').insert(contrattoData).select('id').single();
        if (error) { console.error('Errore insert contratto:', error); showToast('Errore salvataggio', 'error'); return; }
        targetId = data.id;
        contrattoData.id = targetId;
        appData.contratti.push(contrattoData);
    }

    // --- Gestione Canoni Annuali ---
    // Delete existing canoni for this contract
    var oldCanoni = getCanoniByContratto(targetId);
    if (oldCanoni.length > 0) {
        var oldIds = oldCanoni.map(function(ca) { return ca.id; });
        await db.from('canoni_annuali').delete().in('id', oldIds);
        appData.canoni_annuali = appData.canoni_annuali.filter(function(ca) { return ca.contratto_id !== targetId; });
    }
    // Collect rows from form
    var rows = document.querySelectorAll('#canoniRowsContainer .canone-row');
    var newCanoni = [];
    rows.forEach(function(row) {
        var importo = parseFloat(row.querySelector('.canone-importo').value) || 0;
        var dataInizio = row.querySelector('.canone-data-inizio').value || null;
        var dataFine = row.querySelector('.canone-data-fine').value || null;
        var noteCanone = row.querySelector('.canone-note').value.trim() || null;
        newCanoni.push({
            contratto_id: targetId,
            importo: importo,
            data_inizio: dataInizio,
            data_fine: dataFine,
            note: noteCanone
        });
    });
    // Insert new canoni
    if (newCanoni.length > 0) {
        var { data: insCanoni, error: errCanoni } = await db.from('canoni_annuali').insert(newCanoni).select();
        if (!errCanoni && insCanoni) {
            appData.canoni_annuali = appData.canoni_annuali.concat(insCanoni);
        }
    }

    // --- Gestione Locatori/Conduttori (tabelle ponte) ---
    // Delete old relations
    var oldLocRels = appData.contratto_locatori.filter(function(r) { return r.contratto_id === targetId; });
    if (oldLocRels.length > 0) {
        var oldLocIds = oldLocRels.map(function(r) { return r.id; });
        await db.from('contratto_locatori').delete().in('id', oldLocIds);
        appData.contratto_locatori = appData.contratto_locatori.filter(function(r) { return r.contratto_id !== targetId; });
    }
    var oldCondRels = appData.contratto_conduttori.filter(function(r) { return r.contratto_id === targetId; });
    if (oldCondRels.length > 0) {
        var oldCondIds = oldCondRels.map(function(r) { return r.id; });
        await db.from('contratto_conduttori').delete().in('id', oldCondIds);
        appData.contratto_conduttori = appData.contratto_conduttori.filter(function(r) { return r.contratto_id !== targetId; });
    }
    // Insert new relations
    if (locIds.length > 0) {
        var locInserts = locIds.map(function(lid) { return { contratto_id: targetId, persona_id: lid }; });
        var { data: insLoc, error: errLoc } = await db.from('contratto_locatori').insert(locInserts).select();
        if (!errLoc && insLoc) appData.contratto_locatori = appData.contratto_locatori.concat(insLoc);
    }
    if (condIds.length > 0) {
        var condInserts = condIds.map(function(cid) { return { contratto_id: targetId, persona_id: cid }; });
        var { data: insCond, error: errCond } = await db.from('contratto_conduttori').insert(condInserts).select();
        if (!errCond && insCond) appData.contratto_conduttori = appData.contratto_conduttori.concat(insCond);
    }

    closeModal();
    showToast(editId ? 'Contratto aggiornato!' : 'Contratto creato!', 'success');
    await refreshPage('contratti');
}



// --- Save Inquilino (Persona) ---
async function saveInquilino() {
    var d = {
        nome: document.getElementById('iqf_nome').value.trim(),
        cognome: document.getElementById('iqf_cognome').value.trim(),
        codice_fiscale: document.getElementById('iqf_cf').value.trim(),
        ragione_sociale: document.getElementById('iqf_rs').value.trim()
    };
    var { data: insData, error } = await db.from('anagrafica_persona').insert(d).select('id').single();
    if (error) { showToast('Errore', 'error'); return; }
    d.id = insData.id;
    appData.persone.push(d);
    closeModal();
    showToast('Inquilino salvato!', 'success');
}

// --- Delete Operations ---
async function deleteContratto(id) {
    // 1. Elimina prima i record collegati nelle tabelle figlie
    await db.from('contratto_locatori').delete().eq('contratto_id', id);
    await db.from('contratto_conduttori').delete().eq('contratto_id', id);
    await db.from('scadenze').delete().eq('contratto_id', id);
    await db.from('canoni_annuali').delete().eq('contratto_id', id);
    // 2. Elimina il contratto
    var { error } = await db.from('contratti').delete().eq('id', id);
    if (error) { showToast('Errore eliminazione: ' + error.message, 'error'); return; }
    // 3. Aggiorna la cache locale
    appData.contratti = appData.contratti.filter(function(c) { return c.id !== id; });
    appData.scadenze = appData.scadenze.filter(function(s) { return s.contratto_id !== id; });
    appData.canoni_annuali = appData.canoni_annuali.filter(function(ca) { return ca.contratto_id !== id; });
    appData.contratto_locatori = appData.contratto_locatori.filter(function(r) { return r.contratto_id !== id; });
    appData.contratto_conduttori = appData.contratto_conduttori.filter(function(r) { return r.contratto_id !== id; });
    showToast('Contratto eliminato', 'info');
    await refreshPage('contratti');
}



var pendingCompleteData = null;

function openCompleteScadenzaModal(scadenzaId, deadlineStr, contrattoId) {
    pendingCompleteData = { scadenzaId: scadenzaId || null, deadlineStr: deadlineStr, contrattoId: parseInt(contrattoId) };
    var ct = appData.contratti.find(function(x) { return x.id === pendingCompleteData.contrattoId; });
    var title = document.getElementById('modalTitle');
    var body = document.getElementById('modalBody');
    title.textContent = 'Completa Scadenza';
    var html = '<form id="completeScadenzaForm" class="form-grid">';
    html += '<div class="form-group full" style="padding:12px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:8px">';
    html += '<strong>Versamento Imposta di Registro 30gg</strong><br>';
    html += '<span style="color:var(--text-muted)">Scadenza: ' + formatDate(deadlineStr) + '</span>';
    if (ct) html += '<br><span style="color:var(--text-muted)">' + ct.identificativo + ' - ' + getConduttoriLabel(ct.id) + '</span>';
    html += '</div>';
    html += '<div class="form-actions full"><button type="button" class="btn btn-outline" data-action="close-modal">Annulla</button><button type="submit" class="btn btn-primary"><i class="fas fa-check"></i> Segna come Completata</button></div>';
    html += '</form>';
    body.innerHTML = html;
    document.getElementById('modalOverlay').classList.add('show');
    document.getElementById('completeScadenzaForm').addEventListener('submit', function(e) {
        e.preventDefault();
        confirmCompleteScadenzaNew();
    });
}

async function confirmCompleteScadenzaNew() {
    if (!pendingCompleteData) return;

    var scadenzaId = pendingCompleteData.scadenzaId;
    var contrattoId = pendingCompleteData.contrattoId;
    var deadlineDate = pendingCompleteData.deadlineStr;

    // Calcola la prossima deadline: giorno dopo + 1 anno + 30gg
    var parts = deadlineDate.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + 1); // giorno dopo la deadline
    var prossima = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate() + 30);
    var prossimaStr = toLocalDateStr(prossima);

    // Verifica se la prossima deadline supera la data di scadenza del contratto
    var ct = appData.contratti.find(function(x) { return x.id === contrattoId; });
    if (ct && ct.data_scadenza && prossimaStr > ct.data_scadenza) {
        prossimaStr = null; // nessuna prossima scadenza, contratto in scadenza
    }

    // 1. Crea o aggiorna scadenza nel DB
    if (scadenzaId) {
        var { error: err1 } = await db.from('scadenze').update({
            stato: 'completata',
            prossima_scadenza: prossimaStr
        }).eq('id', scadenzaId);
        if (err1) { showToast('Errore aggiornamento scadenza', 'error'); return; }
        var idx = appData.scadenze.findIndex(function(s) { return s.id === scadenzaId; });
        if (idx >= 0) {
            appData.scadenze[idx].stato = 'completata';
            appData.scadenze[idx].prossima_scadenza = prossimaStr;
        }
    } else {
        var { data: insSc, error: errIns } = await db.from('scadenze').insert({
            contratto_id: contrattoId,
            data: deadlineDate,
            prossima_scadenza: prossimaStr,
            stato: 'completata'
        }).select('id').single();
        if (errIns) { console.error(errIns); showToast('Errore', 'error'); return; }
        appData.scadenze.push({ id: insSc.id, contratto_id: contrattoId, data: deadlineDate, prossima_scadenza: prossimaStr, stato: 'completata' });
    }

    pendingCompleteData = null;
    closeModal();
    showToast('Scadenza completata! Prossima scadenza: ' + (prossimaStr ? formatDate(prossimaStr) : 'Nessuna'), 'success');
    await refreshPage('scadenze');
}


// --- View Toggle ---
function setView(view) {
    document.getElementById('page-contratti').querySelectorAll('.view-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.view === view); });
    document.getElementById('contractsCards').style.display = view === 'cards' ? '' : 'none';
    document.getElementById('contractsTable').style.display = view === 'table' ? '' : 'none';
}
function setViewScadenze(view) {
    document.getElementById('page-scadenze').querySelectorAll('.view-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.view === view); });
    document.getElementById('scadenzeCards').style.display = view === 'cards' ? '' : 'none';
    document.getElementById('scadenzeTable').style.display = view === 'table' ? '' : 'none';
}

// ============================================
// RENDERING
// ============================================

async function renderDashboard() {
    var attivi = appData.contratti.filter(function(c) { return calcContrattoStato(c) === 'attivo'; });
    var entrate = attivi.reduce(function(s, c) { return s + (getCanoneAttuale(c.id) ? getCanoneAttuale(c.id).importo : 0); }, 0);

    // Calcola scadenze imminenti dai contratti attivi
    var scadenzeImminenti = [];
    attivi.forEach(function(c) {
        var scadenzeContratto = appData.scadenze
            .filter(function(s) { return s.contratto_id === c.id; })
            .sort(function(a, b) { return (b.data || '').localeCompare(a.data || ''); });
        var ultimaScadenza = scadenzeContratto.length > 0 ? scadenzeContratto[0] : null;

        var deadlineStr = null;
        if (ultimaScadenza && ultimaScadenza.prossima_scadenza) {
            deadlineStr = ultimaScadenza.prossima_scadenza;
        } else {
            var scs = calcolaScadenzeRegistro(c);
            for (var i = 0; i < scs.length; i++) {
                var dbMatch = scadenzeContratto.find(function(s) {
                    return s.data === scs[i].deadlineStr && s.stato === 'completata';
                });
                if (!dbMatch) { deadlineStr = scs[i].deadlineStr; break; }
            }
        }

        if (deadlineStr) {
            var d = daysUntil(deadlineStr);
            if (d <= 30) {
                var urgenza = calcolaUrgenza(d);
                scadenzeImminenti.push({ contratto: c, deadlineStr: deadlineStr, giorni: d, urgenza: urgenza });
            }
        }
    });
    scadenzeImminenti.sort(function(a, b) { return a.deadlineStr.localeCompare(b.deadlineStr); });

    document.getElementById('statContratti').textContent = attivi.length;
    document.getElementById('statScadenze').textContent = scadenzeImminenti.length;

    // Upcoming deadlines (prime 5)
    var upcoming = scadenzeImminenti.slice(0, 5);
    var upEl = document.getElementById('upcomingDeadlines');
    if (upcoming.length === 0) {
        upEl.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>Nessuna scadenza imminente</p></div>';
    } else {
        upEl.innerHTML = upcoming.map(function(s) {
            var dc = s.urgenza === 'alta' ? 'red' : s.urgenza === 'media' ? 'orange' : 'green';
            var inqLabel = getConduttoriLabel(s.contratto.id);
            return '<div class="upcoming-item"><div class="upcoming-dot ' + dc + '"></div><div class="upcoming-info"><span class="up-title">Imposta di Registro 30gg</span><span class="up-sub">' + s.contratto.identificativo + ' - ' + inqLabel + '</span></div><span class="upcoming-date">' + formatDate(s.deadlineStr) + '</span></div>';
        }).join('');
    }

    // Recent activity
    var actEl = document.getElementById('recentActivity');
    actEl.innerHTML = '<div class="empty-state"><p>Nessuna attivita recente</p></div>';

    // Notifications
    var notifs = [];
    scadenzeImminenti.forEach(function(s) {            notifs.push({
                icon: 'fa-exclamation-triangle',
                iconClass: s.urgenza === 'alta' ? 'danger' : 'warning',
                text: 'Imposta di Registro 30gg - ' + s.contratto.identificativo + ' (' + s.giorni + ' gg)',
                time: formatDate(s.deadlineStr)
            });
    });
    document.getElementById('notifBadge').textContent = notifs.length || '';
    document.getElementById('notifList').innerHTML = notifs.map(function(n) {
        return '<div class="notif-item unread"><div class="notif-icon ' + n.iconClass + '"><i class="fas ' + n.icon + '"></i></div><div class="notif-content"><p>' + n.text + '</p><div class="notif-time">' + n.time + '</div></div></div>';
    }).join('') || '<div class="notif-item"><div class="notif-content"><p>Nessuna notifica</p></div></div>';

    renderCharts();
}

// --- Charts ---
var chartTipologie = null, chartScadenzePriorita = null;
function renderCharts() {
    var tipoCounts = {};
    appData.contratti.forEach(function(c) {
        var s = calcContrattoStato(c);
        var l = getStatusLabel(s);
        tipoCounts[l] = (tipoCounts[l] || 0) + 1;
    });
    if (chartTipologie) chartTipologie.destroy();
    chartTipologie = new Chart(document.getElementById('chartTipologie').getContext('2d'), {
        type: 'doughnut', data: { labels: Object.keys(tipoCounts), datasets: [{ data: Object.values(tipoCounts), backgroundColor: ['#ef4444', '#10b981', '#f59e0b'], borderWidth: 0 }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    // Scadenze per Priorità (calcolate dai contratti)
    var prioritaCounts = { Alta: 0, Media: 0, Bassa: 0 };
    attivi.forEach(function(c) {
        calcolaScadenzeRegistro(c).forEach(function(sc) {
            var d = daysUntil(sc.deadlineStr);
            var dbMatch = appData.scadenze.find(function(s) {
                return s.contratto_id === c.id && s.data === sc.deadlineStr && s.stato === 'completata';
            });
            if (!dbMatch) {
                if (d <= 7) prioritaCounts.Alta++;
                else if (d <= 20) prioritaCounts.Media++;
                else prioritaCounts.Bassa++;
            }
        });
    });
    var totalScadenze = prioritaCounts.Alta + prioritaCounts.Media + prioritaCounts.Bassa;
    var allCompleted = totalScadenze === 0;
    var chartCard = document.getElementById('chartScadenzePriorita').closest('.chart-card');
    if (allCompleted) {
        chartCard.style.opacity = '0.35';
    } else {
        chartCard.style.opacity = '1';
    }
    if (chartScadenzePriorita) chartScadenzePriorita.destroy();
    chartScadenzePriorita = new Chart(document.getElementById('chartScadenzePriorita').getContext('2d'), {
        type: 'doughnut', data: { labels: Object.keys(prioritaCounts), datasets: [{ data: Object.values(prioritaCounts), backgroundColor: ['#ef4444', '#f59e0b', '#10b981'], borderWidth: 0 }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

// --- Render Contratti ---
async function renderContratti() {
    var filtroStato = document.getElementById('filterContrattoStato').value;
    var list = appData.contratti;
    if (filtroStato !== 'all') {
        list = list.filter(function(c) { return calcContrattoStato(c) === filtroStato; });
    }
    renderContrattiList(list);
}
function renderContrattiList(list) {
    var filtered = list.slice().sort(function(a, b) {
        return (b.data_decorrenza || '').localeCompare(a.data_decorrenza || '');
    });

    var cardsEl = document.getElementById('contractsCards');
    if (filtered.length === 0) {
        cardsEl.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-file-contract"></i><p>Nessun contratto trovato</p></div>';
    } else {
        cardsEl.innerHTML = filtered.map(function(c) {
            var stato = calcContrattoStato(c);
            var d = daysUntil(c.data_scadenza);
            var dt = d > 0 ? d + ' gg' : 'Scaduto';
            var ds = d <= 30 ? 'color:var(--danger)' : '';
            var locLabel = getLocatoriLabel(c.id);
            var condLabel = getConduttoriLabel(c.id);
            var immLabel = getImmobileLabel(c.immobile_id);
            var h = '<div class="contract-card">';
            h += '<div class="contract-top"><span class="contract-code">' + c.identificativo + '</span><span class="status-badge ' + stato + '">' + getStatusLabel(stato) + '</span></div>';
            h += '<div class="contract-title"><i class="fas fa-user-tie"></i> ' + locLabel + ' → <i class="fas fa-user"></i> ' + condLabel + '</div>';
            h += '<div class="contract-address"><i class="fas fa-map-marker-alt"></i> ' + immLabel + '</div>';
            h += '<div class="contract-details">';
            h += '<div class="contract-detail"><label>Scadenza</label><span style="' + ds + '">' + formatDate(c.data_scadenza) + '</span></div>';
            var caAtt = getCanoneAttuale(c.id);
            h += '<div class="contract-detail"><label>Canone Anno</label><span>' + (caAtt ? formatCurrency(caAtt.importo) : '-') + '</span></div>';
            h += '<div class="contract-detail"><label>Rimanenza</label><span style="' + ds + '">' + dt + '</span></div>';
            h += '</div>';
            h += '<div class="contract-actions">';
            h += '<button class="btn btn-sm btn-outline" data-action="view-contratto" data-id="' + c.id + '"><i class="fas fa-eye"></i> Dettagli</button>';
            h += '<button class="btn btn-sm btn-outline" data-action="edit-contratto" data-id="' + c.id + '"><i class="fas fa-edit"></i></button>';
            h += '<button class="btn btn-sm btn-outline" data-action="delete-contratto" data-id="' + c.id + '" style="color:var(--danger)"><i class="fas fa-trash"></i></button>';
            h += '</div></div>';
            return h;
        }).join('');
    }

    // Table view
    var tbody = document.getElementById('contractsTableBody');
    tbody.innerHTML = filtered.map(function(c) {
        var stato = calcContrattoStato(c);
        var caTab = getCanoneAttuale(c.id);
        return '<tr><td><strong>' + c.identificativo + '</strong></td><td>' + getLocatoriLabel(c.id) + '</td><td>' + getConduttoriLabel(c.id) + '</td><td>' + getImmobileLabel(c.immobile_id) + '</td><td>' + (caTab ? formatCurrency(caTab.importo) : '-') + '</td><td>' + formatDate(c.data_decorrenza) + '</td><td>' + formatDate(c.data_scadenza) + '</td><td><span class="status-badge ' + stato + '">' + getStatusLabel(stato) + '</span></td><td><div class="td-actions"><button data-action="view-contratto" data-id="' + c.id + '" title="Dettagli"><i class="fas fa-eye"></i></button><button data-action="edit-contratto" data-id="' + c.id + '" title="Modifica"><i class="fas fa-edit"></i></button><button class="danger" data-action="delete-contratto" data-id="' + c.id + '" title="Elimina"><i class="fas fa-trash"></i></button></div></td></tr>';
    }).join('');
}

// Calcola urgenza in base ai giorni rimanenti
function calcolaUrgenza(giorniRimanenti) {
    if (giorniRimanenti <= 7) return 'alta';
    if (giorniRimanenti <= 20) return 'media';
    return 'bassa';
}

// --- Render Scadenze ---
async function renderScadenze() {
    var filtroStato = document.getElementById('filterScadenzeStato').value;
    var filtroUrgenza = document.getElementById('filterScadenzeUrgenza').value;

    // Genera la scadenza corrente per ogni contratto attivo
    var tutteLeScadenze = [];
    appData.contratti.forEach(function(c) {
        if (calcContrattoStato(c) === 'chiuso') return;

        // Trova l'ultima scadenza registrata per questo contratto
        var scadenzeContratto = appData.scadenze
            .filter(function(s) { return s.contratto_id === c.id; })
            .sort(function(a, b) { return (b.data || '').localeCompare(a.data || ''); });
        var ultimaScadenza = scadenzeContratto.length > 0 ? scadenzeContratto[0] : null;

        var deadlineStr = null;
        var periodStart = null;
        var scadenzaId = null;
        var isPaid = false;

        if (ultimaScadenza && ultimaScadenza.prossima_scadenza) {
            // La prossima deadline è salvata nel DB
            deadlineStr = ultimaScadenza.prossima_scadenza;
            periodStart = ultimaScadenza.data;
            scadenzaId = ultimaScadenza.id;
            isPaid = false; // in attesa di pagamento
        } else if (ultimaScadenza && ultimaScadenza.stato === 'completata' && !ultimaScadenza.prossima_scadenza) {
            // Tutte le scadenze sono state pagate, contratto in scadenza
            return;
        } else {
            // Nessuna scadenza registrata: calcola la prima deadline
            var scs = calcolaScadenzeRegistro(c);
            if (scs.length > 0) {
                // Trova la prima scadenza non pagata
                for (var i = 0; i < scs.length; i++) {
                    var dbMatch = scadenzeContratto.find(function(s) {
                        return s.data === scs[i].deadlineStr && s.stato === 'completata';
                    });
                    if (!dbMatch) {
                        deadlineStr = scs[i].deadlineStr;
                        periodStart = scs[i].periodStart;
                        break;
                    }
                }
            }
        }

        if (!deadlineStr) return;

        var giorni = daysUntil(deadlineStr);
        var urgenza = calcolaUrgenza(giorni);

        tutteLeScadenze.push({
            contratto_id: c.id,
            contratto: c,
            deadlineStr: deadlineStr,
            periodStart: periodStart,
            isPaid: isPaid,
            scadenzaId: scadenzaId,
            giorni: giorni,
            urgenza: urgenza
        });
    });

    // Applica filtri
    var list = tutteLeScadenze;
    if (filtroStato === 'completata') {
        list = list.filter(function(s) { return s.isPaid; });
    } else if (filtroStato === 'in-attesa') {
        list = list.filter(function(s) { return !s.isPaid; });
    }
    if (filtroUrgenza !== 'all') {
        list = list.filter(function(s) { return s.urgenza === filtroUrgenza; });
    }

    // Sort by deadline ascending
    list.sort(function(a, b) {
        return a.deadlineStr.localeCompare(b.deadlineStr);
    });

    var cardsEl = document.getElementById('scadenzeCards');
    if (!cardsEl) return;

    if (list.length === 0) {
        cardsEl.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-calendar-times"></i><p>Nessuna scadenza trovata</p></div>';
        return;
    }

    cardsEl.innerHTML = list.map(function(s) {
        var ct = s.contratto;
        var locLabel = getLocatoriLabel(ct.id);
        var condLabel = getConduttoriLabel(ct.id);
        var immLabel = getImmobileLabel(ct.immobile_id);
        var ident = ct.identificativo;

        var d = s.giorni;
        var dLabel = d > 0 ? d + ' gg' : (d === 0 ? 'Oggi' : 'Scaduto ' + Math.abs(d) + ' gg');
        var dStyle = d <= 0 ? 'color:var(--danger)' : (d <= 7 ? 'color:var(--danger)' : (d <= 20 ? 'color:var(--warning)' : ''));

        var urgenza = s.urgenza;
        var statoLabel = s.isPaid ? 'Completata' : 'In Attesa';
        var statoBadgeClass = s.isPaid ? 'attivo' : 'in-scadenza';

        var urBg = urgenza === 'alta' ? 'var(--danger-bg)' : urgenza === 'media' ? 'var(--warning-bg)' : 'var(--success-bg)';
        var urColor = urgenza === 'alta' ? 'var(--danger)' : urgenza === 'media' ? 'var(--warning)' : 'var(--success)';

        var h = '<div class="contract-card">';
        h += '<div class="contract-top"><span class="contract-code">Imposta di Registro</span><span class="status-badge ' + statoBadgeClass + '">' + statoLabel + '</span></div>';
        h += '<div class="contract-title"><i class="fas fa-file-invoice"></i> ' + ident + '</div>';
        h += '<div class="contract-address"><i class="fas fa-map-marker-alt"></i> ' + immLabel + '</div>';
        h += '<div class="contract-details">';
        h += '<div class="contract-detail"><label>Scadenza</label><span style="' + dStyle + '">' + formatDate(s.deadlineStr) + '</span></div>';
        h += '<div class="contract-detail"><label>Rimanenza</label><span style="' + dStyle + '">' + dLabel + '</span></div>';
        h += '<div class="contract-detail"><label>Priorità</label><span style="display:inline-block;padding:4px 10px;border-radius:var(--radius-full);font-size:0.7rem;font-weight:600;background:' + urBg + ';color:' + urColor + '">' + urgenza.charAt(0).toUpperCase() + urgenza.slice(1) + '</span></div>';
        h += '<div class="contract-detail"><label>Periodo</label><span>' + formatDate(s.periodStart) + ' → ' + formatDate(s.deadlineStr) + '</span></div>';
        h += '</div>';
        h += '<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:14px">';
        h += '<i class="fas fa-user-tie"></i> ' + locLabel + ' → <i class="fas fa-user"></i> ' + condLabel;
        h += '</div>';
        h += '<div class="contract-actions">';
        if (!s.isPaid) {
            h += '<button class="btn btn-sm btn-primary" data-action="complete-scadenza" data-id="' + (s.scadenzaId || '') + '" data-deadline="' + s.deadlineStr + '" data-contratto-id="' + s.contratto_id + '"><i class="fas fa-check"></i> Completa</button>';
        }
        h += '</div></div>';
        return h;
    }).join('');

    // Table view
    var tbody = document.getElementById('scadenzeTableBody');
    if (tbody) {
        tbody.innerHTML = list.map(function(s) {
            var ct = s.contratto;
            var locLabel = getLocatoriLabel(ct.id);
            var condLabel = getConduttoriLabel(ct.id);
            var immLabel = getImmobileLabel(ct.immobile_id);
            var ident = ct.identificativo;
            var d = s.giorni;
            var dLabel = d > 0 ? d + ' gg' : (d === 0 ? 'Oggi' : 'Scaduto ' + Math.abs(d) + ' gg');
            var dStyle = d <= 0 ? 'color:var(--danger)' : (d <= 7 ? 'color:var(--danger)' : (d <= 20 ? 'color:var(--warning)' : ''));
            var urgenza = s.urgenza;
            var statoLabel = s.isPaid ? 'Completata' : 'In Attesa';
            var statoBadgeClass = s.isPaid ? 'attivo' : 'in-scadenza';
            var urBg = urgenza === 'alta' ? 'var(--danger-bg)' : urgenza === 'media' ? 'var(--warning-bg)' : 'var(--success-bg)';
            var urColor = urgenza === 'alta' ? 'var(--danger)' : urgenza === 'media' ? 'var(--warning)' : 'var(--success)';
            return '<tr>' +
                '<td><strong>' + ident + '</strong></td>' +
                '<td>' + immLabel + '</td>' +
                '<td>' + locLabel + '</td>' +
                '<td>' + condLabel + '</td>' +
                '<td style="' + dStyle + '">' + formatDate(s.deadlineStr) + '</td>' +
                '<td style="' + dStyle + '">' + dLabel + '</td>' +
                '<td><span style="display:inline-block;padding:4px 10px;border-radius:var(--radius-full);font-size:0.7rem;font-weight:600;background:' + urBg + ';color:' + urColor + '">' + urgenza.charAt(0).toUpperCase() + urgenza.slice(1) + '</span></td>' +
                '<td><span class="status-badge ' + statoBadgeClass + '">' + statoLabel + '</span></td>' +
                '<td><div class="td-actions">' +
                (!s.isPaid ? '<button data-action="complete-scadenza" data-id="' + (s.scadenzaId || '') + '" data-deadline="' + s.deadlineStr + '" data-contratto-id="' + s.contratto_id + '" title="Completa"><i class="fas fa-check"></i></button>' : '') +
                '</div></td>' +
                '</tr>';
        }).join('');
    }
}



// --- Filter Listeners ---


// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    await loadAllData();
    try { await renderDashboard(); } catch(e) { console.error('Dashboard error:', e); }
    try { renderContratti(); } catch(e) { console.error('Contratti error:', e); }
    try { renderScadenze(); } catch(e) { console.error('Scadenze error:', e); }
});
