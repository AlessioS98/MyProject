/* ============================================
   Gestione Contratti di Affitto - Supabase
   ============================================ */

// --- Supabase Init ---
const SUPABASE_URL = 'https://djqbrwlbjctloxspepnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqcWJyd2xiamN0bG94c3BlcG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0ODc5NDAsImV4cCI6MjEwMzA2Mzk0MH0.ah9cvekaWwu9PkamgkhlTroy6z5Hd9gGgoo77W4uI3c';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Data Cache ---
var appData = { contratti: [], persone: [], immobili: [], scadenze: [], canoni_annuali: [], contratto_locatori: [], contratto_conduttori: [], impostazioniNotifiche: null };
// Notifiche già mostrate in questa sessione (ricominciano le ripetizioni a ogni ricarica)
var notificationShownWith = new Set();
// Notifiche segnate come lette in questa sessione (schiarite, non eliminate)
var notificationReadThisSession = new Set();

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
    return { attivo: 'Attivo', scaduto: 'Scaduto', chiuso: 'Chiuso', sospeso: 'Sospeso', completato: 'Completato', completata: 'Completata', 'in-attesa': 'In Attesa' }[s] || s;
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
// Etichetta con COGNOME prima del NOME (usata nella lista contratti)
function getPersonaCognomeNomeLabel(p) {
    if (!p) return 'N/A';
    if (p.ragione_sociale && !p.nome && !p.cognome) return p.ragione_sociale;
    return (p.cognome || '') + ' ' + (p.nome || '');
}
function getLocatoriCognomeNomeLabel(contrattoId) {
    var locs = getLocatoriByContratto(contrattoId);
    if (locs.length === 0) return 'N/A';
    return locs.map(function(p) { return getPersonaCognomeNomeLabel(p); }).join(', ');
}
function getConduttoriCognomeNomeLabel(contrattoId) {
    var conds = getConduttoriByContratto(contrattoId);
    if (conds.length === 0) return 'N/A';
    return conds.map(function(p) { return getPersonaCognomeNomeLabel(p); }).join(', ');
}
function getPersonaLabelShort(p) {
    if (!p) return 'N/A';
    if (p.ragione_sociale && !p.nome && !p.cognome) return p.ragione_sociale;
    var label = (p.nome || '') + ' ' + (p.cognome || '');
    if (p.ragione_sociale) label += ' (' + p.ragione_sociale + ')';
    return label.trim();
}

// --- Dedup anagrafiche: le stesse persone/immobili non vanno ripetute nelle liste ---
function dedupPersone(list) {
    var seen = {};
    return list.filter(function(p) {
        var key = ((p.codice_fiscale || '').trim().toUpperCase()) ||
                  getPersonaDisplayLabel(p).trim().toUpperCase();
        if (!key || seen[key]) return false;
        seen[key] = true;
        return true;
    });
}
function dedupImmobili(list) {
    var seen = {};
    return list.filter(function(i) {
        // Chiave catastale (foglio/particella/sub) se presente, altrimenti indirizzo+città
        var key = '';
        if (i.foglio && i.particella) key = 'C:' + i.foglio + '|' + i.particella + '|' + (i.sub || '');
        if (!key) key = 'A:' + (i.indirizzo + '|' + i.citta).trim().toLowerCase();
        if (!key || seen[key]) return false;
        seen[key] = true;
        return true;
    });
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
function toggleCanoneCedolare(el) {
    if (!el) return;
    var row = el.closest('.canone-row');
    // Legge sempre lo stato della radio "Sì" della riga, indipendentemente da
    // quale radio (Sì o No) ha scatenato l'evento.
    var siEl = row.querySelector('.canone-cedolare-si');
    var active = !!(siEl && siEl.checked);
    var percentuale = row.querySelector('.canone-percentuale');
    var valoreAssoluto = row.querySelector('.canone-valore-assoluto');
    [percentuale, valoreAssoluto].forEach(function(field) {
        if (!field) return;
        var group = field.closest('.form-group');
        if (active) {
            // Cedolare secca ATTIVA → percentuale e valore assoluto NON compilabili
            field.disabled = true;
            field.value = '';
            if (group) group.style.opacity = '0.4';
        } else {
            // Cedolare secca NON attiva → campi compilabili
            field.disabled = false;
            if (group) group.style.opacity = '1';
        }
    });
}
function addCanoneRow(importo, dataInizio, dataFine, note, cedolare, percentuale, valoreAssoluto) {
    canoneRowCounter++;
    var container = document.getElementById('canoniRowsContainer');
    if (!container) return;
    var row = document.createElement('div');
    row.className = 'canone-row';
    var cedChecked = cedolare ? ' checked' : '';
    var cedNoChecked = cedolare ? '' : ' checked';
    row.innerHTML = `
        <div class="canone-header">
            <span class="canone-label"><i class="fas fa-euro-sign"></i> Canone ${canoneRowCounter}</span>
            <button type="button" class="btn btn-sm btn-outline canone-remove" onclick="this.closest('.canone-row').remove()"><i class="fas fa-trash"></i></button>
        </div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Importo (EUR)</label><input type="number" class="canone-importo" value="${importo || ''}" min="0" step="0.01" required></div>
        <div class="form-group" style="flex:1;min-width:130px;margin:0"><label>Data Inizio</label><input type="date" class="canone-data-inizio" value="${dataInizio || ''}" required></div>
        <div class="form-group" style="flex:1;min-width:130px;margin:0"><label>Data Fine</label><input type="date" class="canone-data-fine" value="${dataFine || ''}" required></div>
        <div class="form-group" style="flex:1;min-width:100%;margin:0"><label>Cedolare Secca</label>
            <div class="radio-group" style="display:flex;gap:16px;margin-top:6px">
                <label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" class="canone-cedolare-si" name="canone_cedolare_${canoneRowCounter}" value="true"${cedChecked} onchange="toggleCanoneCedolare(this)"> Sì</label>
                <label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" class="canone-cedolare-no" name="canone_cedolare_${canoneRowCounter}" value="false"${cedNoChecked} onchange="toggleCanoneCedolare(this)"> No</label>
            </div>
        </div>
        <div class="form-group" style="flex:1;min-width:130px;margin:0"><label>Imposta di Registro (%)</label><input type="number" class="canone-percentuale" value="${percentuale || ''}" min="0" max="100" step="0.01"></div>
        <div class="form-group" style="flex:1;min-width:130px;margin:0"><label>Valore Assoluto (EUR)</label><input type="number" class="canone-valore-assoluto" value="${valoreAssoluto || ''}" min="0" step="0.01"></div>
    `;
    container.appendChild(row);
    // Applica il toggle iniziale in base alla cedolare secca scelta
    toggleCanoneCedolare(row.querySelector('.canone-cedolare-si'));
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
// Suggerimenti campo-per-campo (stessa logica usata nella finestra Cerca Contratto):
// digitando in Nome/Cognome/Ragione Sociale appaiono i valori presenti nell'anagrafica.
function setupPersonFieldAutocomplete(inputEl, fieldKey) {
    if (!inputEl) return;
    inputEl.parentNode.style.position = 'relative';
    setupFilterAutocomplete(inputEl, function() {
        var seen = {};
        var out = [];
        appData.persone.forEach(function(p) {
            var v = p[fieldKey];
            if (!v) return;
            var label = String(v).trim();
            if (label && !seen[label]) { seen[label] = true; out.push(label); }
        });
        return out;
    }, null);
}

var locatoreRowCounter = 0;
function addLocatoreRow(persona, isEdit, rel) {
    locatoreRowCounter++;
    var container = document.getElementById('locatoriRowsContainer');
    if (!container) return;
    var idx = locatoreRowCounter;
    var p = persona || {};
    rel = rel || {};
    var locTipo = (p.ragione_sociale && !p.nome) ? 'azienda' : 'pf';
    var cfReadonly = isEdit ? 'readonly style="background:var(--border-light);cursor:not-allowed"' : '';
    // Date del legame locatore-contratto:
    // - in modifica si usano i valori salvati (se presenti)
    // - in creazione si precompilano con le date del contratto (modificabili)
    var rowDeco = '', rowChius = '', decoUserSet = '', chiusUserSet = '';
    if (isEdit) {
        rowDeco = rel.data_decorrenza || '';
        rowChius = rel.data_chiusura || '';
        if (rowDeco) decoUserSet = ' data-user-set="1"';
        if (rowChius) chiusUserSet = ' data-user-set="1"';
    } else {
        var cfd = document.getElementById('cf_decorrenza');
        var cfc = document.getElementById('cf_chiusura');
        rowDeco = cfd ? cfd.value : '';
        rowChius = cfc ? cfc.value : '';
    }
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
        <div class="form-group" style="flex:1;min-width:140px;margin:0"><label>Ragione Sociale</label><input type="text" class="loc-rs" value="${p.ragione_sociale || ''}"></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Cognome</label><input type="text" class="loc-cognome" value="${p.cognome || ''}"></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Nome</label><input type="text" class="loc-nome" value="${p.nome || ''}"></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <div class="form-group" style="flex:1;min-width:150px;margin:0"><label>Data Decorrenza</label><input type="date" class="loc-data-decorrenza" value="${rowDeco}"${decoUserSet}></div>
        <div class="form-group" style="flex:1;min-width:150px;margin:0"><label>Data Chiusura</label><input type="date" class="loc-data-chiusura" value="${rowChius}"${chiusUserSet}></div>
        </div>
    `;
    container.appendChild(row);
    // Applica lo stato (disabled + opacità) in base al tipo selezionato (PF / Azienda)
    toggleLocatoreType(locTipo, row);
    // Una data compilata manualmente dall'utente non viene più sovrascritta
    row.querySelectorAll('input[type="date"]').forEach(function(el) {
        el.addEventListener('input', function() { el.dataset.userSet = '1'; });
    });
    var cfInput = row.querySelector('.loc-cf');
    if (cfInput && !isEdit) setupCfAutocomplete(cfInput, row);
    // Suggerimenti campo-per-campo (stessa logica della finestra Cerca Contratto)
    setupPersonFieldAutocomplete(row.querySelector('.loc-nome'), 'nome');
    setupPersonFieldAutocomplete(row.querySelector('.loc-cognome'), 'cognome');
    setupPersonFieldAutocomplete(row.querySelector('.loc-rs'), 'ragione_sociale');
}


var conduttoreRowCounter = 0;
function addConduttoreRow(persona, isEdit, rel) {
    conduttoreRowCounter++;
    var container = document.getElementById('conduttoriRowsContainer');
    if (!container) return;
    var idx = conduttoreRowCounter;
    var p = persona || {};
    rel = rel || {};
    var condTipo = (p.ragione_sociale && !p.nome) ? 'azienda' : 'pf';
    var cfReadonly = isEdit ? 'readonly style="background:var(--border-light);cursor:not-allowed"' : '';
    // Date del legame conduttore-contratto (stessa logica dei locatori)
    var rowDeco = '', rowChius = '', decoUserSet = '', chiusUserSet = '';
    if (isEdit) {
        rowDeco = rel.data_decorrenza || '';
        rowChius = rel.data_chiusura || '';
        if (rowDeco) decoUserSet = ' data-user-set="1"';
        if (rowChius) chiusUserSet = ' data-user-set="1"';
    } else {
        var cfd = document.getElementById('cf_decorrenza');
        var cfc = document.getElementById('cf_chiusura');
        rowDeco = cfd ? cfd.value : '';
        rowChius = cfc ? cfc.value : '';
    }
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
        <div class="form-group" style="flex:1;min-width:140px;margin:0"><label>Ragione Sociale</label><input type="text" class="cond-rs" value="${p.ragione_sociale || ''}"></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Cognome</label><input type="text" class="cond-cognome" value="${p.cognome || ''}"></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Nome</label><input type="text" class="cond-nome" value="${p.nome || ''}"></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <div class="form-group" style="flex:1;min-width:150px;margin:0"><label>Data Decorrenza</label><input type="date" class="cond-data-decorrenza" value="${rowDeco}"${decoUserSet}></div>
        <div class="form-group" style="flex:1;min-width:150px;margin:0"><label>Data Chiusura</label><input type="date" class="cond-data-chiusura" value="${rowChius}"${chiusUserSet}></div>
        </div>
    `;
    container.appendChild(row);
    // Applica lo stato (disabled + opacità) in base al tipo selezionato (PF / Azienda)
    toggleConduttoreType(condTipo, row);
    // Una data compilata manualmente dall'utente non viene più sovrascritta
    row.querySelectorAll('input[type="date"]').forEach(function(el) {
        el.addEventListener('input', function() { el.dataset.userSet = '1'; });
    });
    var cfInput = row.querySelector('.cond-cf');
    if (cfInput && !isEdit) setupCfAutocomplete(cfInput, row);
    // Suggerimenti campo-per-campo (stessa logica della finestra Cerca Contratto)
    setupPersonFieldAutocomplete(row.querySelector('.cond-nome'), 'nome');
    setupPersonFieldAutocomplete(row.querySelector('.cond-cognome'), 'cognome');
    setupPersonFieldAutocomplete(row.querySelector('.cond-rs'), 'ragione_sociale');
}

// --- Sincronizza le date di locatori/conduttori con quelle del contratto ---
// La decorrenza e la chiusura di ogni riga vengono riempite in automatico con
// quelle del contratto, ma restano modificabili: se l'utente compila il campo
// a mano (data-user-set), il suo valore non viene sovrascritto.
function syncPersonaDateFields() {
    var decoVal = document.getElementById('cf_decorrenza') ? document.getElementById('cf_decorrenza').value : '';
    var chiusVal = document.getElementById('cf_chiusura') ? document.getElementById('cf_chiusura').value : '';
    document.querySelectorAll('.loc-data-decorrenza, .cond-data-decorrenza').forEach(function(el) {
        if (!el.dataset.userSet) el.value = decoVal;
    });
    document.querySelectorAll('.loc-data-chiusura, .cond-data-chiusura').forEach(function(el) {
        if (!el.dataset.userSet) el.value = chiusVal;
    });
}

// --- Scadenza effettiva del contratto ---
// Se è stata impostata una data di rinnovo (in fase di modifica), questa
// diventa la nuova scadenza; altrimenti si usa la data_scadenza originale.
function getContrattoScadenzaEffettiva(c) {
    return c.data_scadenza_rinnovo || c.data_scadenza;
}

// --- Calculate contract status ---
function calcContrattoStato(c) {
    if (c.data_chiusura) return 'chiuso';
    var d = daysUntil(getContrattoScadenzaEffettiva(c));
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

// --- Data Loading ---
async function loadAllData() {
    try {
        var [persone, immobili, contratti, scadenze, canoni, locRel, condRel, impost] = await Promise.all([
            db.from('anagrafica_persona').select('*'),
            db.from('immobili').select('*'),
            db.from('contratti').select('*'),
            db.from('scadenze').select('*'),
            db.from('canoni_annuali').select('*'),
            db.from('contratto_locatori').select('*'),
            db.from('contratto_conduttori').select('*'),
            db.from('impostazioni_notifiche').select('*').limit(1)
        ]);
        appData.persone = persone.data || [];
        appData.immobili = immobili.data || [];
        appData.contratti = contratti.data || [];
        appData.scadenze = scadenze.data || [];
        appData.canoni_annuali = canoni.data || [];
        appData.contratto_locatori = locRel.data || [];
        appData.contratto_conduttori = condRel.data || [];
        appData.impostazioniNotifiche = (impost.data && impost.data.length > 0) ? impost.data[0] : null;
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

        case 'new-inquilino': openModal('newInquilino'); break;
        case 'complete-scadenza': openModal('completaScadenza', id); break;
        case 'generate-f24': generateF24Pdf(id); break;

        case 'new-persona': openModal('newPersona'); break;
        case 'edit-persona': openModal('editPersona', id); break;
        case 'delete-persona': openModal('deletePersonaConfirm', id); break;
        case 'confirm-delete-persona': deletePersona(id); break;
        case 'new-immobile': openModal('newImmobile'); break;
        case 'edit-immobile': openModal('editImmobile', id); break;
        case 'delete-immobile': openModal('deleteImmobileConfirm', id); break;
        case 'confirm-delete-immobile': deleteImmobile(id); break;

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
document.getElementById('notifClear').addEventListener('click', function() {
    var now = Date.now();
    appData.scadenze.forEach(function(s) { localStorage.setItem('notifSeen_scadenza_' + s.id, String(now)); });
    appData.contratti.forEach(function(c) { localStorage.setItem('notifSeen_contratto_' + c.id, String(now)); });
    notificationShownWith.clear();
    notificationReadThisSession.clear();
    renderNotifications();
});
document.addEventListener('click', function() {
    document.getElementById('notifPanel').classList.remove('show');
});
document.getElementById('notifPanel').addEventListener('click', function(e) {
    e.stopPropagation();
});

// --- Sidebar Shortcuts: Anagrafiche & Immobili ---
document.getElementById('btnAnagrafiche').addEventListener('click', function() {
    openModal('listaPersone');
});
document.getElementById('btnImmobili').addEventListener('click', function() {
    openModal('listaImmobili');
});

// --- Filter Modal ---
function closeFilterModal() {
    document.getElementById('filterModalOverlay').classList.remove('active');
}

// --- Filter Autocomplete ---
function setupFilterAutocomplete(inputEl, getValues, onPick) {
    // Idempotent binding: remove a previously attached handler and the old
    // suggestions container so reopening the modal never stacks listeners.
    if (inputEl.__filterHandler) inputEl.removeEventListener('input', inputEl.__filterHandler);
    if (inputEl.__blurHandler) inputEl.removeEventListener('blur', inputEl.__blurHandler);
    var existing = inputEl.parentNode.querySelector('.imm-suggestions');
    if (existing) existing.remove();

    var suggestionsEl = document.createElement('div');
    suggestionsEl.className = 'imm-suggestions';
    inputEl.parentNode.appendChild(suggestionsEl);

    // Escape text so DB values can't break the innerHTML markup.
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function toLabel(item) {
        return String((typeof item === 'string') ? item : (item ? item.label : '')).trim();
    }

    inputEl.__blurHandler = function() {
        setTimeout(function() { suggestionsEl.classList.remove('show'); }, 200);
    };
    inputEl.addEventListener('blur', inputEl.__blurHandler);

    inputEl.__filterHandler = function() {
        var val = inputEl.value.trim().toUpperCase();
        if (val.length < 1) { suggestionsEl.classList.remove('show'); return; }
        var items = getValues() || [];
        var seen = {};
        var matches = [];
        items.forEach(function(item) {
            var label = toLabel(item);
            var upper = label.toUpperCase();
            // Dedupe by the displayed value so identical texts appear once.
            if (label.length > 0 && upper.indexOf(val) === 0 && !seen[upper]) {
                seen[upper] = true;
                matches.push(item);
            }
        });
        if (matches.length === 0) { suggestionsEl.classList.remove('show'); return; }
        suggestionsEl.innerHTML = matches.map(function(item, i) {
            var label = toLabel(item);
            var sub = (typeof item === 'object' && item.sub) ? '<div class="imm-suggestion-cad">' + esc(item.sub) + '</div>' : '';
            return '<div class="imm-suggestion-item" data-idx="' + i + '"><div class="imm-suggestion-addr">' + esc(label) + '</div>' + sub + '</div>';
        }).join('');
        suggestionsEl.classList.add('show');

        suggestionsEl.querySelectorAll('.imm-suggestion-item').forEach(function(el, idx) {
            el.addEventListener('click', function() {
                var item = matches[idx];
                inputEl.value = toLabel(item);
                suggestionsEl.classList.remove('show');
                if (onPick && typeof item === 'object' && item.data) onPick(item.data);
            });
        });
    };
    inputEl.addEventListener('input', inputEl.__filterHandler);
}

function openFilterModal() {
    var overlay = document.getElementById('filterModalOverlay');
    overlay.classList.add('active');
    setupFilterInputs();
}

function setupFilterInputs() {
    // The suggestions draw from the FULL tables, not only the people/immobili
    // already attached to a contract. This way any record present in the
    // anagrafica / immobili is always suggested, even if it is not yet used
    // by a contract.
    var persone = appData.persone;
    var immobili = appData.immobili;
    var contratti = appData.contratti;

    // Person field factories (used for both locatore and conduttore)
    function nomi()     { return persone.map(function(p) { return { label: p.nome }; }); }
    function cognomi()  { return persone.map(function(p) { return { label: p.cognome }; }); }
    function cfList()   { return persone.map(function(p) { return p.codice_fiscale ? { label: p.codice_fiscale, sub: getPersonaLabelShort(p) } : null; }).filter(Boolean); }
    function rsList()   { return persone.filter(function(p) { return p.ragione_sociale; }).map(function(p) { return { label: p.ragione_sociale }; }); }

    // Locatore
    setupFilterAutocomplete(document.getElementById('ffLocNome'), nomi, null);
    setupFilterAutocomplete(document.getElementById('ffLocCognome'), cognomi, null);
    setupFilterAutocomplete(document.getElementById('ffLocCF'), cfList, null);
    setupFilterAutocomplete(document.getElementById('ffLocRS'), rsList, null);

    // Conduttore
    setupFilterAutocomplete(document.getElementById('ffConNome'), nomi, null);
    setupFilterAutocomplete(document.getElementById('ffConCognome'), cognomi, null);
    setupFilterAutocomplete(document.getElementById('ffConCF'), cfList, null);
    setupFilterAutocomplete(document.getElementById('ffConRS'), rsList, null);

    // Immobile
    setupFilterAutocomplete(document.getElementById('ffIndirizzo'),
        function() { return immobili.map(function(i) { return { label: i.indirizzo, sub: i.citta }; }); }, null);
    setupFilterAutocomplete(document.getElementById('ffCitta'),
        function() { return immobili.map(function(i) { return { label: i.citta }; }); }, null);
    setupFilterAutocomplete(document.getElementById('ffFoglio'),
        function() { return immobili.map(function(i) { return i.foglio ? { label: i.foglio, sub: i.indirizzo + ', ' + i.citta } : null; }).filter(Boolean); }, null);
    setupFilterAutocomplete(document.getElementById('ffParticella'),
        function() { return immobili.map(function(i) { return i.particella ? { label: i.particella, sub: i.indirizzo + ', ' + i.citta } : null; }).filter(Boolean); }, null);
    setupFilterAutocomplete(document.getElementById('ffSub'),
        function() { return immobili.map(function(i) { return i.sub ? { label: i.sub, sub: i.indirizzo + ', ' + i.citta } : null; }).filter(Boolean); }, null);

    // Identificativo
    setupFilterAutocomplete(document.getElementById('ffIdentificativo'),
        function() { return contratti.map(function(c) { return { label: c.identificativo }; }); }, null);
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
        // Date range (la scadenza considerata è quella effettiva, rinnovo se presente)
        var scadF = getContrattoScadenzaEffettiva(c);
        if (dDecoDa && dScadA) {
            // Entrambi inseriti: mostra tutti i contratti che si sorappongono al range
            if (c.data_decorrenza && c.data_decorrenza > dScadA) return false;
            if (scadF && scadF < dDecoDa) return false;
            if (!c.data_decorrenza && !scadF) return false;
        } else if (dDecoDa) {
            // Solo da decorrenza: contratti con decorrenza >= dDecoDa
            if (c.data_decorrenza && c.data_decorrenza < dDecoDa) return false;
            if (!c.data_decorrenza) return false;
        } else if (dScadA) {
            // Solo a scadenza: contratti con scadenza <= dScadA
            if (scadF && scadF > dScadA) return false;
            if (!scadF) return false;
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
            csv += '"' + c.identificativo + '","' + getLocatoriLabel(c.id) + '","' + getConduttoriLabel(c.id) + '","' + getImmobileLabel(c.immobile_id) + '",' + (caExp ? caExp.importo : 0) + ',"' + (c.data_decorrenza||'') + '","' + (getContrattoScadenzaEffettiva(c)||'') + '","' + getStatusLabel(stato) + '",' + (caExp && caExp.tassazione_cedolare_secca ? 'SI' : 'NO') + '\n';
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
    var modal = document.getElementById('modal');
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
        html += '<div class="form-group"><label>Data Decorrenza</label><input type="date" id="cf_decorrenza" value="' + (c ? c.data_decorrenza : '') + '" required></div>';
        html += '<div class="form-group"><label>Data Scadenza</label><input type="date" id="cf_scadenza" value="' + (c ? c.data_scadenza : '') + '" required></div>';
        // Data Scadenza Rinnovo: inseribile solo in fase di modifica del contratto
        if (type === 'editContratto') {
            html += '<div class="form-group"><label>Data Scadenza Rinnovo</label><input type="date" id="cf_scadenza_rinnovo" title="Nuova data di scadenza dopo il rinnovo del contratto" value="' + (c ? (c.data_scadenza_rinnovo || '') : '') + '"></div>';
        }
        html += '<div class="form-group"><label>Data Chiusura</label><input type="date" id="cf_chiusura" value="' + (c && c.data_chiusura ? c.data_chiusura : '') + '"></div><br>';
        // --- SEZIONE CANONI ANNUALI ---
        html += '<div class="form-section-title full"><i class="fas fa-euro-sign"></i> Canoni Annuali</div>';
        html += '<div class="form-group full"><div id="canoniRowsContainer"></div>';
        html += '<button type="button" class="btn btn-sm btn-outline" onclick="addCanoneRow()"><i class="fas fa-plus"></i> Aggiungi Canone</button></div>';
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
        var scadEffCv = getContrattoScadenzaEffettiva(cv);
        var dv = daysUntil(scadEffCv);
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
                var caTax;
                if (ca.tassazione_cedolare_secca) {
                    caTax = 'Cedolare Secca';
                } else if (parseFloat(ca.percentuale) > 0 || parseFloat(ca.valore_assoluto) > 0) {
                    caTax = 'Imposta di Registro ' + (parseFloat(ca.percentuale) || 0) + '%' + (parseFloat(ca.valore_assoluto) > 0 ? ' + ' + formatCurrency(ca.valore_assoluto) : '');
                } else {
                    caTax = 'Ordinaria';
                }
                html += '<div class="contract-detail"><label>Canone ' + formatDate(ca.data_inizio) + ' → ' + formatDate(ca.data_fine) + '</label><span>' + formatCurrency(ca.importo) + '</span></div>';
                html += '<div class="contract-detail"><label>Tassazione</label><span>' + caTax + '</span></div>';
            });
        } else {
            html += '<div class="contract-detail"><label>Canone Annuale</label><span>-</span></div>';
        }
        html += '<div class="contract-detail"><label>Decorrenza</label><span>' + formatDate(cv.data_decorrenza) + '</span></div>';
        var dcColor = dc ? 'color:var(--danger)' : '';
        html += '<div class="contract-detail"><label>Scadenza</label><span style="' + (!cv.data_scadenza_rinnovo ? dcColor : '') + '">' + formatDate(cv.data_scadenza) + '</span></div>';
        html += '<div class="contract-detail"><label>Scadenza Rinnovo</label><span style="' + (cv.data_scadenza_rinnovo ? dcColor : '') + '">' + (cv.data_scadenza_rinnovo ? formatDate(cv.data_scadenza_rinnovo) : '–') + '</span></div>';
        html += '<div class="contract-detail"><label>Chiusura</label><span>' + (cv.data_chiusura ? formatDate(cv.data_chiusura) : '-') + '</span></div>';
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

    } else if (type === 'notifSettings') {
        title.textContent = 'Impostazioni Notifiche';
        var st = getNotifSettings();
        html = '<form id="notifSettingsForm" class="form-grid">';
        html += '<div class="form-section-title full"><i class="fas fa-hourglass-half"></i> Scadenze di Pagamento</div>';
        html += '<div class="form-group"><label>Avvisami quando mancano (giorni)</label><input type="number" id="ns_scadenze_anticipo" min="1" max="365" value="' + st.scadenzeAnticipo + '"></div>';
        html += '<div class="form-group"><label>Ripeti la notifica ogni (giorni)</label><input type="number" id="ns_scadenze_ripeti" min="1" max="365" value="' + st.scadenzeRipeti + '"></div>';
        html += '<div class="form-section-title full"><i class="fas fa-file-contract"></i> Contratti in Scadenza</div>';
        html += '<div class="form-group"><label>Avvisami quando mancano (giorni)</label><input type="number" id="ns_contratti_anticipo" min="1" max="365" value="' + st.contrattiAnticipo + '"></div>';
        html += '<div class="form-group"><label>Ripeti la notifica ogni (giorni)</label><input type="number" id="ns_contratti_ripeti" min="1" max="365" value="' + st.contrattiRipeti + '"></div>';
        html += '<div class="form-actions full"><button type="button" class="btn btn-outline" data-action="close-modal">Annulla</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salva</button></div>';
        html += '</form>';

    } else if (type === 'listaPersone') {
        var personeList = dedupPersone(appData.persone).slice().sort(function(a, b) {
            // Cognome prima del nome
            var ka = (getPersonaCognomeNomeLabel(a)).toLowerCase();
            var kb = (getPersonaCognomeNomeLabel(b)).toLowerCase();
            return ka < kb ? -1 : ka > kb ? 1 : 0;
        });
        title.textContent = 'Anagrafiche Persone (' + personeList.length + ')';
        html = '<div style="display:flex;justify-content:flex-end;margin-bottom:12px">';
        html += '<button type="button" class="btn btn-primary btn-sm" data-action="new-persona"><i class="fas fa-plus"></i> Nuova Persona</button></div>';
        if (personeList.length === 0) {
            html += '<div class="empty-state"><i class="fas fa-users"></i><p>Nessuna anagrafica presente</p></div>';
        } else {
            html += '<div class="table-container" style="overflow-y:auto;max-height:55vh">';
            html += '<table class="list-table"><thead><tr><th>Cognome / Ragione Sociale</th><th>Nome</th><th>Codice Fiscale</th><th>Tipo</th><th>Azioni</th></tr></thead><tbody>';
            personeList.forEach(function(p) {
                var isAzienda = p.ragione_sociale && !p.nome && !p.cognome;
                html += '<tr><td><strong>' + getPersonaCognomeNomeLabel(p) + '</strong></td>' +
                    '<td>' + (isAzienda ? '-' : (p.nome || '-')) + '</td>' +
                    '<td>' + (p.codice_fiscale || '-') + '</td>' +
                    '<td><span class="status-badge ' + (isAzienda ? 'tipo-azienda' : 'tipo-fisica') + '">' + (isAzienda ? 'Azienda' : 'Persona Fisica') + '</span></td>' +
                    '<td><div class="td-actions">' +
                    '<button type="button" data-action="edit-persona" data-id="' + p.id + '" title="Modifica"><i class="fas fa-pen"></i></button>' +
                    '<button type="button" class="danger" data-action="delete-persona" data-id="' + p.id + '" title="Elimina"><i class="fas fa-trash"></i></button>' +
                    '</div></td></tr>';
            });
            html += '</tbody></table></div>';
        }
        html += '<div class="form-actions"><button type="button" class="btn btn-outline" data-action="close-modal">Chiudi</button></div>';

    } else if (type === 'newPersona' || type === 'editPersona') {
        var pe = type === 'editPersona' ? appData.persone.find(function(x) { return x.id === id; }) : null;
        // Azienda = ragione sociale presente senza nome/cognome; altrimenti persona fisica.
        // In MODIFICA il tipo è fisso: una persona fisica resta tale, un'azienda resta tale.
        var torrePersona = pe ? (pe.ragione_sociale && !pe.nome && !pe.cognome) : false;
        title.textContent = pe ? 'Modifica Persona' : 'Nuova Persona';
        html = '<form id="personaForm" class="form-grid">';
        if (type === 'newPersona') {
            html += '<div class="form-section-title full"><i class="fas fa-user-tag"></i> Tipo Anagrafica</div>';
            html += '<div class="form-group full"><div class="radio-group" style="display:flex;gap:16px">';
            html += '<label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="pf_tipo" value="pf" onchange="togglePersonaType()"' + (!torrePersona ? ' checked' : '') + '> Persona Fisica</label>';
            html += '<label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="pf_tipo" value="azienda" onchange="togglePersonaType()"' + (torrePersona ? ' checked' : '') + '> Azienda</label>';
            html += '</div></div>';
        } else {
            // Campo nascosto: memorizza il tipo esistente (da non modificare)
            html += '<input type="hidden" id="pf_tipo" value="' + (torrePersona ? 'azienda' : 'pf') + '">';
            html += '<div class="form-section-title full"><i class="fas fa-user-tag"></i> Tipo: ' + (torrePersona ? 'Azienda' : 'Persona Fisica') + '</div>';
        }
        html += '<div class="form-group" id="pfGrpCognome"><label>Cognome</label><input type="text" id="pf_cognome" value="' + (pe ? (pe.cognome || '') : '') + '"></div>';
        html += '<div class="form-group" id="pfGrpNome"><label>Nome</label><input type="text" id="pf_nome" value="' + (pe ? (pe.nome || '') : '') + '"></div>';
        html += '<div class="form-group"><label>Codice Fiscale</label><input type="text" id="pf_cf" value="' + (pe ? (pe.codice_fiscale || '') : '') + '"></div>';
        html += '<div class="form-group" id="pfGrpRs"><label>Ragione Sociale</label><input type="text" id="pf_rs" value="' + (pe ? (pe.ragione_sociale || '') : '') + '"></div>';
        html += '<div class="form-actions full"><button type="button" class="btn btn-outline" data-action="close-modal">Annulla</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salva</button></div>';
        html += '</form>';
        modal._returnToList = 'listaPersone';

    } else if (type === 'listaImmobili') {
        var immobiliList = dedupImmobili(appData.immobili).slice().sort(function(a, b) {
            var ka = (a.citta + ' ' + a.indirizzo).toLowerCase();
            var kb = (b.citta + ' ' + b.indirizzo).toLowerCase();
            return ka < kb ? -1 : ka > kb ? 1 : 0;
        });
        title.textContent = 'Immobili (' + immobiliList.length + ')';
        html = '<div style="display:flex;justify-content:flex-end;margin-bottom:12px">';
        html += '<button type="button" class="btn btn-primary btn-sm" data-action="new-immobile"><i class="fas fa-plus"></i> Nuovo Immobile</button></div>';
        if (immobiliList.length === 0) {
            html += '<div class="empty-state"><i class="fas fa-building"></i><p>Nessun immobile presente</p></div>';
        } else {
            html += '<div class="table-container" style="overflow-y:auto;max-height:55vh">';
            html += '<table class="list-table"><thead><tr><th>Indirizzo</th><th>Città</th><th>Foglio</th><th>Particella</th><th>Sub</th><th>APE</th><th>Azioni</th></tr></thead><tbody>';
            immobiliList.forEach(function(i) {
                html += '<tr><td><strong>' + i.indirizzo + '</strong></td>' +
                    '<td>' + i.citta + '</td>' +
                    '<td>' + (i.foglio || '-') + '</td>' +
                    '<td>' + (i.particella || '-') + '</td>' +
                    '<td>' + (i.sub || '-') + '</td>' +
                    '<td>' + (i.ape ? '<span class="status-badge attivo">SI</span>' : '<span class="status-badge chiuso">NO</span>') + '</td>' +
                    '<td><div class="td-actions">' +
                    '<button type="button" data-action="edit-immobile" data-id="' + i.id + '" title="Modifica"><i class="fas fa-pen"></i></button>' +
                    '<button type="button" class="danger" data-action="delete-immobile" data-id="' + i.id + '" title="Elimina"><i class="fas fa-trash"></i></button>' +
                    '</div></td></tr>';
            });
            html += '</tbody></table></div>';
        }
        html += '<div class="form-actions"><button type="button" class="btn btn-outline" data-action="close-modal">Chiudi</button></div>';

    } else if (type === 'newImmobile' || type === 'editImmobile') {
        var ie = type === 'editImmobile' ? appData.immobili.find(function(x) { return x.id === id; }) : null;
        title.textContent = ie ? 'Modifica Immobile' : 'Nuovo Immobile';
        html = '<form id="immobileForm" class="form-grid">';
        html += '<div class="form-group"><label>Indirizzo</label><input type="text" id="if_indirizzo" value="' + (ie ? (ie.indirizzo || '') : '') + '" required></div>';
        html += '<div class="form-group"><label>Città</label><input type="text" id="if_citta" value="' + (ie ? (ie.citta || '') : '') + '" required></div>';
        html += '<div class="form-group"><label>Foglio</label><input type="text" id="if_foglio" value="' + (ie ? (ie.foglio || '') : '') + '"></div>';
        html += '<div class="form-group"><label>Particella</label><input type="text" id="if_particella" value="' + (ie ? (ie.particella || '') : '') + '"></div>';
        html += '<div class="form-group"><label>Sub</label><input type="text" id="if_sub" value="' + (ie ? (ie.sub || '') : '') + '"></div>';
        html += '<div class="form-group"><label>APE</label><div class="radio-group" style="display:flex;gap:16px;margin-top:6px">';
        html += '<label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="if_ape" value="true"' + (!(ie && ie.ape) ? ' checked' : '') + '> Sì</label>';
        html += '<label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="if_ape" value="false"' + ((ie && ie.ape) ? ' checked' : '') + '> No</label></div></div>';
        html += '<div class="form-actions full"><button type="button" class="btn btn-outline" data-action="close-modal">Annulla</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salva</button></div>';
        html += '</form>';
        modal._returnToList = 'listaImmobili';

    } else if (type === 'deletePersonaConfirm') {
        var pd = appData.persone.find(function(x) { return x.id === id; });
        title.textContent = 'Elimina Persona';
        html = '<div style="padding:16px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:16px;border-left:4px solid var(--danger)">';
        html += '<strong style="color:var(--danger)"><i class="fas fa-exclamation-triangle"></i> Attenzione!</strong><br>';
        html += '<span>Stai per eliminare la persona <strong>' + (pd ? getPersonaCognomeNomeLabel(pd) : 'N/A') + '</strong>.</span><br>';
        html += '<small>Verrà rimossa anche dai contratti in cui compare.</small>';
        html += '</div>';
        html += '<div class="form-actions full">';
        html += '<button type="button" class="btn btn-outline" data-action="close-modal">Annulla</button>';
        html += '<button type="button" class="btn btn-danger" data-action="confirm-delete-persona" data-id="' + id + '"><i class="fas fa-trash"></i> Elimina</button>';
        html += '</div>';

    } else if (type === 'deleteImmobileConfirm') {
        var idel = appData.immobili.find(function(x) { return x.id === id; });
        title.textContent = 'Elimina Immobile';
        html = '<div style="padding:16px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:16px;border-left:4px solid var(--danger)">';
        html += '<strong style="color:var(--danger)"><i class="fas fa-exclamation-triangle"></i> Attenzione!</strong><br>';
        html += '<span>Stai per eliminare l\'immobile <strong>' + (idel ? idel.indirizzo + ', ' + idel.citta : 'N/A') + '</strong>.</span><br>';
        html += '<small>Verrà rimosso anche dai contratti in cui è associato.</small>';
        html += '</div>';
        html += '<div class="form-actions full">';
        html += '<button type="button" class="btn btn-outline" data-action="close-modal">Annulla</button>';
        html += '<button type="button" class="btn btn-danger" data-action="confirm-delete-immobile" data-id="' + id + '"><i class="fas fa-trash"></i> Elimina</button>';
        html += '</div>';

    } else if (type === 'completaScadenza') {
        var sc = appData.scadenze.find(function(x) { return x.id === id; });
        if (!sc) return;
        var scC = getContrattoById(sc.contratto_id);
        title.textContent = 'Completa Scadenza';
        html = '<form id="completaScadenzaForm" class="form-grid">';
        html += '<div style="grid-column:1/-1;padding:14px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:4px">';
        html += '<div class="contract-detail"><label>Contratto</label><span><strong>' + (scC ? scC.identificativo : 'Contratto #' + sc.contratto_id) + '</strong></span></div>';
        html += '<div class="contract-detail" style="margin-top:8px"><label>Importo</label><span><strong>' + formatCurrency(sc.importo) + '</strong></span></div>';
        html += '</div>';
        html += '<div class="form-group full"><label>Data di completamento</label><input type="date" id="scadDataCompletamento" value="' + toLocalDateStr(new Date()) + '" required></div>';
        html += '<div class="form-actions full"><button type="button" class="btn btn-outline" data-action="close-modal">Annulla</button><button type="submit" class="btn btn-success"><i class="fas fa-check"></i> Conferma Completamento</button></div>';
        html += '</form>';

    }

    body.innerHTML = html;
    overlay.classList.add('show');

    // Attach form listeners
    var cf = document.getElementById('contrattoForm');
    if (cf) {
        cf.addEventListener('submit', function(e) { e.preventDefault(); saveContratto(id); });
        // Populate existing canoni annuali for edit mode
        if (type === 'editContratto' && id) {
            var existingCanoni = getCanoniByContratto(id);
            existingCanoni.forEach(function(ca) {
                addCanoneRow(ca.importo, ca.data_inizio, ca.data_fine, ca.note || '', ca.tassazione_cedolare_secca, ca.percentuale, ca.valore_assoluto);
            });
            // Populate existing locatori (con le date salvate nel legame)
            var existingLocRels = appData.contratto_locatori.filter(function(r) { return r.contratto_id === id; });
            getLocatoriByContratto(id).forEach(function(p) {
                var rel = existingLocRels.find(function(r) { return r.persona_id === p.id; }) || null;
                addLocatoreRow(p, true, rel);
            });
            // Populate existing conduttori (con le date salvate nel legame)
            var existingCondRels = appData.contratto_conduttori.filter(function(r) { return r.contratto_id === id; });
            getConduttoriByContratto(id).forEach(function(p) {
                var rel = existingCondRels.find(function(r) { return r.persona_id === p.id; }) || null;
                addConduttoreRow(p, true, rel);
            });
        }
        // If new contract, add one empty row for each section
        if (type === 'newContratto') {
            addCanoneRow();
            addLocatoreRow();
            addConduttoreRow();
        }
        // Le date di locatori/conduttori seguono quelle del contratto in tempo reale
        var decoInput = document.getElementById('cf_decorrenza');
        var chiusInput = document.getElementById('cf_chiusura');
        if (decoInput) decoInput.addEventListener('input', syncPersonaDateFields);
        if (chiusInput) chiusInput.addEventListener('input', syncPersonaDateFields);
        syncPersonaDateFields();
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

    var nsf = document.getElementById('notifSettingsForm');
    if (nsf) nsf.addEventListener('submit', function(e) { e.preventDefault(); saveNotifSettings(); });

    var perf = document.getElementById('personaForm');
    if (perf) {
        perf.addEventListener('submit', function(e) { e.preventDefault(); savePersona(id); });
        togglePersonaType();
    }

    var immf = document.getElementById('immobileForm');
    if (immf) immf.addEventListener('submit', function(e) { e.preventDefault(); saveImmobile(id); });

    var csf = document.getElementById('completaScadenzaForm');
    if (csf) csf.addEventListener('submit', function(e) { e.preventDefault(); salvaCompletamentoScadenza(id); });


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
    // Collect all locatori from dynamic rows (con le date del legame)
    var locRows = document.querySelectorAll('#locatoriRowsContainer .locatore-row');
    var locData = [];
    for (var i = 0; i < locRows.length; i++) {
        var row = locRows[i];
        var locTipo = (row.querySelector('input[type="radio"]:checked') || {}).value || 'pf';
        var locId = await upsertPersona({
            nome: locTipo === 'azienda' ? '' : (row.querySelector('.loc-nome') || {}).value.trim(),
            cognome: locTipo === 'azienda' ? '' : (row.querySelector('.loc-cognome') || {}).value.trim(),
            codice_fiscale: (row.querySelector('.loc-cf') || {}).value.trim(),
            ragione_sociale: locTipo === 'pf' ? '' : (row.querySelector('.loc-rs') || {}).value.trim()
        });
        if (locId) {
            locData.push({
                persona_id: locId,
                data_decorrenza: (row.querySelector('.loc-data-decorrenza') || {}).value || null,
                data_chiusura: (row.querySelector('.loc-data-chiusura') || {}).value || null
            });
        }
    }
    var locIds = locData.map(function(d) { return d.persona_id; });

    // Collect all conduttori from dynamic rows (con le date del legame)
    var condRows = document.querySelectorAll('#conduttoriRowsContainer .conduttore-row');
    var condData = [];
    for (var j = 0; j < condRows.length; j++) {
        var crow = condRows[j];
        var condTipo = (crow.querySelector('input[type="radio"]:checked') || {}).value || 'pf';
        var condId = await upsertPersona({
            nome: condTipo === 'azienda' ? '' : (crow.querySelector('.cond-nome') || {}).value.trim(),
            cognome: condTipo === 'azienda' ? '' : (crow.querySelector('.cond-cognome') || {}).value.trim(),
            codice_fiscale: (crow.querySelector('.cond-cf') || {}).value.trim(),
            ragione_sociale: condTipo === 'pf' ? '' : (crow.querySelector('.cond-rs') || {}).value.trim()
        });
        if (condId) {
            condData.push({
                persona_id: condId,
                data_decorrenza: (crow.querySelector('.cond-data-decorrenza') || {}).value || null,
                data_chiusura: (crow.querySelector('.cond-data-chiusura') || {}).value || null
            });
        }
    }
    var condIds = condData.map(function(d) { return d.persona_id; });

    var immId = await upsertImmobile({
        indirizzo: document.getElementById('cf_imm_indirizzo').value.trim(),
        citta: document.getElementById('cf_imm_citta').value.trim(),
        foglio: document.getElementById('cf_imm_foglio').value.trim(),
        particella: document.getElementById('cf_imm_particella').value.trim(),
        sub: document.getElementById('cf_imm_sub').value.trim(),
        ape: document.querySelector('input[name="cf_imm_ape"]:checked').value === 'true'
    });

    var scadRinnovoEl = document.getElementById('cf_scadenza_rinnovo');

    var contrattoData = {
        identificativo: document.getElementById('cf_identificativo').value.trim(),
        data_decorrenza: document.getElementById('cf_decorrenza').value || null,
        data_scadenza: document.getElementById('cf_scadenza').value || null,
        data_scadenza_rinnovo: scadRinnovoEl ? (scadRinnovoEl.value || null) : null,
        data_chiusura: document.getElementById('cf_chiusura').value || null,
        locatore_id: locIds.length > 0 ? locIds[0] : null,
        conduttore_id: condIds.length > 0 ? condIds[0] : null,
        immobile_id: immId,
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
        var noteEl = row.querySelector('.canone-note');
        var noteCanone = noteEl ? (noteEl.value.trim() || null) : null;
        var cedolareSi = row.querySelector('.canone-cedolare-si');
        var taxCedolare = cedolareSi ? cedolareSi.checked : false;
        var taxPercentuale = parseFloat(row.querySelector('.canone-percentuale').value) || 0;
        var taxValoreAssoluto = parseFloat(row.querySelector('.canone-valore-assoluto').value) || 0;
        newCanoni.push({
            contratto_id: targetId,
            importo: importo,
            data_inizio: dataInizio,
            data_fine: dataFine,
            note: noteCanone,
            tassazione_cedolare_secca: taxCedolare,
            percentuale: taxPercentuale,
            valore_assoluto: taxValoreAssoluto
        });
    });
    // Insert new canoni
    if (newCanoni.length > 0) {
        var { data: insCanoni, error: errCanoni } = await db.from('canoni_annuali').insert(newCanoni).select();
        if (!errCanoni && insCanoni) {
            appData.canoni_annuali = appData.canoni_annuali.concat(insCanoni);
        }
    }

    // --- Creazione automatica scadenza per i nuovi contratti ---
    // La scadenza eredita la decorrenza del contratto; il trigger del DB
    // calcola automaticamente prossima_scadenza e prossima_decorrenza.
    if (!editId) {
        var primoCanone = newCanoni.length > 0 ? newCanoni[0] : null;
        var { data: insScad, error: errScad } = await db.from('scadenze').insert({
            contratto_id: targetId,
            data_decorrenza: contrattoData.data_decorrenza,
            importo: primoCanone ? (primoCanone.importo || 0) : 0,
            stato: 'in-attesa'
        }).select();
        if (errScad) {
            console.error('Errore creazione scadenza:', errScad);
            showToast('Contratto creato, ma errore nella creazione della scadenza', 'error');
        } else if (insScad) {
            appData.scadenze = appData.scadenze.concat(insScad);
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
    // Insert new relations (con le date di decorrenza/chiusura del legame)
    if (locData.length > 0) {
        var locInserts = locData.map(function(d) {
            return { contratto_id: targetId, persona_id: d.persona_id, data_decorrenza: d.data_decorrenza, data_chiusura: d.data_chiusura };
        });
        var { data: insLoc, error: errLoc } = await db.from('contratto_locatori').insert(locInserts).select();
        if (!errLoc && insLoc) appData.contratto_locatori = appData.contratto_locatori.concat(insLoc);
    }
    if (condData.length > 0) {
        var condInserts = condData.map(function(d) {
            return { contratto_id: targetId, persona_id: d.persona_id, data_decorrenza: d.data_decorrenza, data_chiusura: d.data_chiusura };
        });
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

// Mostra/nasconde i campi in base al tipo di anagrafica selezionato
// Legge il tipo dell'anagrafica (radio in creazione, campo nascosto in modifica)
function getPersonaFormType() {
    var radio = document.querySelector('input[name="pf_tipo"]:checked');
    if (radio) return radio.value;
    var hidden = document.getElementById('pf_tipo');
    if (hidden) return hidden.value;
    return 'pf';
}

function togglePersonaType() {
    var isAzienda = getPersonaFormType() === 'azienda';
    var grpCog = document.getElementById('pfGrpCognome');
    var grpNom = document.getElementById('pfGrpNome');
    var grpRs = document.getElementById('pfGrpRs');
    if (grpCog) grpCog.style.display = isAzienda ? 'none' : '';
    if (grpNom) grpNom.style.display = isAzienda ? 'none' : '';
    if (grpRs) grpRs.style.display = isAzienda ? '' : 'none';
}

// --- Save/Update Persona (dalla lista anagrafiche) ---
async function savePersona(id) {
    var isAzienda = getPersonaFormType() === 'azienda';
    var d;
    if (isAzienda) {
        d = {
            nome: '',
            cognome: '',
            codice_fiscale: document.getElementById('pf_cf').value.trim() || null,
            ragione_sociale: document.getElementById('pf_rs').value.trim() || null
        };
    } else {
        d = {
            nome: document.getElementById('pf_nome').value.trim(),
            cognome: document.getElementById('pf_cognome').value.trim(),
            codice_fiscale: document.getElementById('pf_cf').value.trim() || null,
            ragione_sociale: null
        };
    }

    if (id) {
        var { error } = await db.from('anagrafica_persona').update(d).eq('id', id);
        if (error) { console.error('Errore update persona:', error); showToast('Errore salvataggio', 'error'); return; }
        var idx = appData.persone.findIndex(function(x) { return x.id === id; });
        if (idx >= 0) Object.assign(appData.persone[idx], d);
    } else {
        var { data, error } = await db.from('anagrafica_persona').insert(d).select('id').single();
        if (error) { console.error('Errore insert persona:', error); showToast('Errore salvataggio', 'error'); return; }
        appData.persone.push({ id: data.id, ...d });
    }
    closeModal();
    openModal(document.getElementById('modal')._returnToList || 'listaPersone');
    showToast('Persona salvata!', 'success');
}

// --- Save/Update Immobile (dalla lista immobili) ---
async function saveImmobile(id) {
    var d = {
        indirizzo: document.getElementById('if_indirizzo').value.trim(),
        citta: document.getElementById('if_citta').value.trim(),
        foglio: document.getElementById('if_foglio').value.trim() || null,
        particella: document.getElementById('if_particella').value.trim() || null,
        sub: document.getElementById('if_sub').value.trim() || null,
        ape: document.querySelector('input[name="if_ape"]:checked').value === 'true'
    };
    if (id) {
        var { error } = await db.from('immobili').update(d).eq('id', id);
        if (error) { console.error('Errore update immobile:', error); showToast('Errore salvataggio', 'error'); return; }
        var idx = appData.immobili.findIndex(function(x) { return x.id === id; });
        if (idx >= 0) Object.assign(appData.immobili[idx], d);
    } else {
        var { data, error } = await db.from('immobili').insert(d).select('id').single();
        if (error) { console.error('Errore insert immobile:', error); showToast('Errore salvataggio', 'error'); return; }
        appData.immobili.push({ id: data.id, ...d });
    }
    closeModal();
    openModal(document.getElementById('modal')._returnToList || 'listaImmobili');
    showToast('Immobile salvato!', 'success');
}

// --- Delete Operations ---
async function deletePersona(id) {
    var { error } = await db.from('anagrafica_persona').delete().eq('id', id);
    if (error) { showToast('Errore eliminazione: ' + error.message, 'error'); return; }
    appData.persone = appData.persone.filter(function(p) { return p.id !== id; });
    appData.contratto_locatori = appData.contratto_locatori.filter(function(r) { return r.persona_id !== id; });
    appData.contratto_conduttori = appData.contratto_conduttori.filter(function(r) { return r.persona_id !== id; });
    closeModal();
    openModal('listaPersone');
    showToast('Persona eliminata', 'info');
}

async function deleteImmobile(id) {
    var { error } = await db.from('immobili').delete().eq('id', id);
    if (error) { showToast('Errore eliminazione: ' + error.message, 'error'); return; }
    appData.immobili = appData.immobili.filter(function(i) { return i.id !== id; });
    closeModal();
    openModal('listaImmobili');
    showToast('Immobile eliminato', 'info');
}

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




// --- View Toggle ---
function setView(view) {
    document.getElementById('page-contratti').querySelectorAll('.view-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.view === view); });
    document.getElementById('contractsCards').style.display = view === 'cards' ? '' : 'none';
    document.getElementById('contractsTable').style.display = view === 'table' ? '' : 'none';
}


// --- Decorrenza filter (range da oggi a oggi+N giorni) ---
function openDecorrenzaModal() {
    document.getElementById('decorrenzaDays').value = '';
    renderContratti(); // torna alla lista completa
    document.getElementById('decorrenzaModalOverlay').classList.add('active');
    setTimeout(function() { document.getElementById('decorrenzaDays').focus(); }, 50);
}
function closeDecorrenzaModal() {
    document.getElementById('decorrenzaModalOverlay').classList.remove('active');
}
function applyDecorrenzaFilter() {
    var days = parseInt(document.getElementById('decorrenzaDays').value, 10);
    if (!days || days < 1) {
        showToast('Inserisci un numero di giorni valido (almeno 1)', 'error');
        return;
    }
    var oggi = new Date();
    function toISO(d) {
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var g = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + g;
    }
    var da = toISO(oggi);
    var fine = new Date(oggi);
    fine.setDate(fine.getDate() + days);
    var a = toISO(fine);

    var filtered = appData.contratti.filter(function(c) {
        if (!c.data_decorrenza) return false;
        return c.data_decorrenza >= da && c.data_decorrenza <= a;
    });
    closeDecorrenzaModal();
    renderContrattiList(filtered);
}

// ============================================
// RENDERING
// ============================================

async function renderDashboard() {
    var attivi = appData.contratti.filter(function(c) { return calcContrattoStato(c) === 'attivo'; });

    document.getElementById('statContratti').textContent = attivi.length;

    // Notifications (scadenze entro 7 giorni dalla prossima scadenza)
    renderNotifications();

    renderCharts();
    renderScadenzeChart();
}

// --- Charts ---
var chartTipologie = null;
var chartScadenze = null;
function renderCharts() {
    var tipoCounts = {};
    appData.contratti.forEach(function(c) {
        var s = calcContrattoStato(c);
        var l = getStatusLabel(s);
        tipoCounts[l] = (tipoCounts[l] || 0) + 1;
    });
    var colorMapContratti = { 'Attivo': '#10b981', 'Scaduto': '#ef4444', 'Chiuso': '#d1d5db', 'Sospeso': '#94a3b8' };
    var colorsContratti = Object.keys(tipoCounts).map(function(l) { return colorMapContratti[l] || '#94a3b8'; });
    if (chartTipologie) chartTipologie.destroy();
    chartTipologie = new Chart(document.getElementById('chartTipologie').getContext('2d'), {
        type: 'doughnut', data: { labels: Object.keys(tipoCounts), datasets: [{ data: Object.values(tipoCounts), backgroundColor: colorsContratti, borderWidth: 0 }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

// --- Chart Scadenze (in attesa / completate) ---
function renderScadenzeChart() {
    var statoCounts = {};
    appData.scadenze.forEach(function(s) {
        var l = getStatusLabel(s.stato);
        statoCounts[l] = (statoCounts[l] || 0) + 1;
    });
    var colorMapScadenze = { 'In Attesa': '#f59e0b', 'Completata': '#10b981', 'Completato': '#10b981' };
    var colorsScadenze = Object.keys(statoCounts).map(function(l) { return colorMapScadenze[l] || '#94a3b8'; });
    if (chartScadenze) chartScadenze.destroy();
    chartScadenze = new Chart(document.getElementById('chartScadenze').getContext('2d'), {
        type: 'doughnut', data: { labels: Object.keys(statoCounts), datasets: [{ data: Object.values(statoCounts), backgroundColor: colorsScadenze, borderWidth: 0 }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

// --- Render Contratti ---
async function renderContratti() {
    renderContrattiList(appData.contratti);
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
            var scadC = getContrattoScadenzaEffettiva(c);
            var d = daysUntil(scadC);
            var dt = d > 0 ? d + ' gg' : 'Scaduto';
            var ds = d <= 30 ? 'color:var(--danger)' : '';
            var locLabel = getLocatoriCognomeNomeLabel(c.id);
            var condLabel = getConduttoriCognomeNomeLabel(c.id);
            var immLabel = getImmobileLabel(c.immobile_id);
            var h = '<div class="contract-card">';
            h += '<div class="contract-title"><i class="fas fa-user-tie"></i> ' + locLabel + ' → <i class="fas fa-user"></i> ' + condLabel + '</div>';
            h += '<div class="contract-address"><i class="fas fa-map-marker-alt"></i> ' + immLabel + '</div>';
            h += '<div class="contract-details">';
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
        return '<tr><td>' + getLocatoriCognomeNomeLabel(c.id) + '</td><td>' + getConduttoriCognomeNomeLabel(c.id) + '</td><td>' + getImmobileLabel(c.immobile_id) + '</td><td><div class="td-actions"><button data-action="view-contratto" data-id="' + c.id + '" title="Dettagli"><i class="fas fa-eye"></i></button><button data-action="edit-contratto" data-id="' + c.id + '" title="Modifica"><i class="fas fa-edit"></i></button><button class="danger" data-action="delete-contratto" data-id="' + c.id + '" title="Elimina"><i class="fas fa-trash"></i></button></div></td></tr>';
    }).join('');
}






// --- Urgenza scadenze: notifica entro 7 giorni dalla prossima scadenza ---
function getScadenzaUrgenza(s) {
    if (s.stato === 'completata' || s.stato === 'completato') return null;
    if (!s.prossima_scadenza) return null;
    var c = getContrattoById(s.contratto_id);
    if (!c) return null;
    var canone = getCanonePerScadenza(c.id, s.data_decorrenza);
    if (!canone || !canone.tassazione_cedolare_secca) return null;
    var gg = daysUntil(s.prossima_scadenza);
    if (gg <= 0) return { type: 'scaduta', label: 'Scaduta', days: gg };
    if (gg <= getNotifSettings().scadenzeAnticipo) return { type: 'in-scadenza', label: 'In scadenza', days: gg };
    return null;
}
function getNotifSettings() {
    var s = appData.impostazioniNotifiche || {};
    return {
        scadenzeAnticipo: parseInt(s.scadenze_anticipo, 10) || 7,
        scadenzeRipeti: parseInt(s.scadenze_ripeti, 10) || 1,
        contrattiAnticipo: parseInt(s.contratti_anticipo, 10) || 30,
        contrattiRipeti: parseInt(s.contratti_ripeti, 10) || 1
    };
}
function renderNotifications() {
    var sett = getNotifSettings();
    var items = [];

    // Scadenze di pagamento entro l'anticipo configurato (solo contratti con cedolare secca)
    appData.scadenze.filter(function(s) { return getScadenzaUrgenza(s); }).forEach(function(s) {
        var c = getContrattoById(s.contratto_id);
        var cod = c ? c.identificativo : 'Contratto #' + s.contratto_id;
        var urg = getScadenzaUrgenza(s);
        var isScaduta = urg.type === 'scaduta';
        items.push({
            key: 'scadenza_' + s.id,
            ripeti: sett.scadenzeRipeti,
            date: s.prossima_scadenza,
            icon: isScaduta ? 'fa-exclamation-circle' : 'fa-hourglass-half',
            cls: isScaduta ? 'danger' : 'warning',
            txt: isScaduta ? 'Scadenza passata · ' + cod : (urg.days === 1 ? 'Scadenza domani · ' + cod : 'Scadenza tra ' + urg.days + ' giorni · ' + cod),
            meta: formatDate(s.prossima_scadenza) + ' · ' + formatCurrency(s.importo)
        });
    });

    // Contratti in scadenza entro l'anticipo configurato.
    // La data di riferimento è la scadenza effettiva: la data di rinnovo se
    // impostata (in fase di modifica), altrimenti la data_scadenza originale.
    appData.contratti.forEach(function(c) {
        if (c.data_chiusura) return;
        var refDate = getContrattoScadenzaEffettiva(c);
        if (!refDate) return;
        var gg = daysUntil(refDate);
        if (gg <= 0 || gg > sett.contrattiAnticipo) return;
        items.push({
            key: 'contratto_' + c.id,
            ripeti: sett.contrattiRipeti,
            date: refDate,
            icon: 'fa-file-contract',
            cls: 'info',
            txt: gg === 1 ? 'Contratto ' + c.identificativo + ' scade domani' : 'Contratto ' + c.identificativo + ' scade tra ' + gg + ' giorni',
            meta: formatDate(refDate)
        });
    });

    // Snooze: mostra solo le notifiche non eliminate
    var now = Date.now();
    var daMostrare = [];
    items.forEach(function(it) {
        if (isNotificationDismissed(it.key)) return false;
        // Se la notifica è già stata mostrata in questa sessione,
        // visualizzala sempre: solo markNotificationRead può rimuoverla
        // (rimuovendola da notificationShownWith).
        if (notificationShownWith.has(it.key)) {
            daMostrare.push(it);
            return;
        }
        // Notifica nuova: applica lo snooze
        // Nell'ultima settimana di scadenza, notifica ogni giorno
        var ripeti = it.ripeti;
        if (it.days != null && it.days <= 7) ripeti = 1;
        var last = parseInt(localStorage.getItem('notifSeen_' + it.key) || '0', 10);
        if ((now - last) < (ripeti * 86400000)) return false;
        daMostrare.push(it);
        notificationShownWith.add(it.key);
        localStorage.setItem('notifSeen_' + it.key, String(now));
    });

    daMostrare.sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });

    var badge = document.getElementById('notifBadge');
    var list = document.getElementById('notifList');
    badge.textContent = daMostrare.length > 0 ? daMostrare.length : '';
    if (daMostrare.length === 0) {
        list.innerHTML = '<div class="notif-item"><div class="notif-content"><p>Nessuna notifica</p></div></div>';
        return;
    }
    list.innerHTML = daMostrare.map(function(it) {
        var isRead = notificationReadThisSession.has(it.key);
        var itemClass = isRead ? 'notif-item notif-read' : 'notif-item unread';
        return '<div class="' + itemClass + '">' +
            '<div class="notif-icon ' + it.cls + '"><i class="fas ' + it.icon + '"></i></div>' +
            '<div class="notif-content"><p>' + it.txt + '</p>' +
            '<div class="notif-time">' + it.meta + '</div></div>' +
            '<div class="notif-actions">' +
            '<button class="notif-action" title="Segna come letta" onclick="markNotificationRead(\'' + it.key + '\')"><i class="fas fa-check"></i></button>' +
            '<button class="notif-action notif-action-delete" title="Elimina" onclick="deleteNotification(\'' + it.key + '\')"><i class="fas fa-times"></i></button>' +
            '</div></div>';
    }).join('');
}

// Segna una singola notifica come letta (non verrà più mostrata fino alla prossima ripetizione)
function markNotificationRead(key) {
    notificationReadThisSession.add(key);
    localStorage.setItem('notifSeen_' + key, String(Date.now()));
    renderNotifications();
}

// Elimina definitivamente una notifica (non verrà mai più mostrata)
function deleteNotification(key) {
    localStorage.removeItem('notifSeen_' + key);
    localStorage.setItem('notifDismissed_' + key, '1');
    renderNotifications();
}

function isNotificationDismissed(key) {
    return localStorage.getItem('notifDismissed_' + key) === '1';
}
async function saveNotifSettings() {
    var dati = {
        scadenze_anticipo: parseInt(document.getElementById('ns_scadenze_anticipo').value, 10) || 7,
        scadenze_ripeti: parseInt(document.getElementById('ns_scadenze_ripeti').value, 10) || 1,
        contratti_anticipo: parseInt(document.getElementById('ns_contratti_anticipo').value, 10) || 30,
        contratti_ripeti: parseInt(document.getElementById('ns_contratti_ripeti').value, 10) || 1
    };
    var target = appData.impostazioniNotifiche;
    var res = (target && target.id)
        ? await db.from('impostazioni_notifiche').update(dati).eq('id', target.id).select().single()
        : await db.from('impostazioni_notifiche').insert(dati).select().single();
    if (res.error) { console.error('Errore salvataggio impostazioni:', res.error); showToast('Errore salvataggio impostazioni', 'error'); return; }
    appData.impostazioniNotifiche = res.data;
    closeModal();
    showToast('Impostazioni notifiche salvate!', 'success');
    renderNotifications();
}

// --- Bottone Completa: apre una finestra per inserire la data di completamento ---
function scadenzaDoneBtn(s) {
    var isDone = (s.stato === 'completata' || s.stato === 'completato');
    if (isDone) {
        return '<span class="status-badge attivo"><i class="fas fa-check"></i> ' + (s.data_completamento ? formatDate(s.data_completamento) : 'Completata') + '</span>';
    }
    return '<button class="btn btn-sm btn-success scadenza-completa-btn"' +
        ' data-action="complete-scadenza" data-id="' + s.id + '" title="Inserisci data di completamento"><i class="fas fa-check"></i> Completa</button>';
}

// --- Bottone Modello F24: genera il PDF del versamento ---
function scadenzaF24Btn(s) {
    var isDone = (s.stato === 'completata' || s.stato === 'completato');
    return '<button class="btn btn-sm btn-outline scadenza-f24-btn"' +
        (isDone ? ' disabled' : '') +
        ' data-action="generate-f24" data-id="' + s.id + '" title="' + (isDone ? 'Scadenza già completata' : 'Genera PDF Modello F24') + '"><i class="fas fa-file-alt"></i> Modello F24</button>';
}

// Completa la scadenza salvando la data di completamento scelta dall'utente
async function salvaCompletamentoScadenza(id) {
    var s = appData.scadenze.find(function(x) { return x.id === id; });
    if (!s) return;
    var data = document.getElementById('scadDataCompletamento').value;
    if (!data) {
        showToast('Inserisci la data di completamento', 'error');
        return;
    }
    var { error } = await db.from('scadenze').update({ stato: 'completata', data_completamento: data }).eq('id', id);
    if (error) {
        console.error('Errore aggiornamento scadenza:', error);
        showToast('Errore aggiornamento stato', 'error');
        return;
    }
    s.stato = 'completata';
    s.data_completamento = data;
    closeModal();
    showToast('Scadenza completata per il ' + formatDate(data), 'success');
    renderScadenze();
    renderNotifications();
}

// --- Generazione PDF Modello F24 ---
function getCanonePerScadenza(contrattoId, dataDecorrenza) {
    var canoni = getCanoniByContratto(contrattoId);
    if (canoni.length === 0) return null;
    if (dataDecorrenza) {
        var match = canoni.find(function(ca) {
            return (!ca.data_inizio || ca.data_inizio <= dataDecorrenza) &&
                   (!ca.data_fine || ca.data_fine >= dataDecorrenza);
        });
        if (match) return match;
    }
    return getCanoneAttuale(contrattoId) || canoni[canoni.length - 1];
}

function getPersonaF24Nome(p) {
    if (!p) return 'N/A';
    if (p.ragione_sociale && !p.nome && !p.cognome) return p.ragione_sociale;
    return ((p.cognome || '') + ' ' + (p.nome || '')).trim() || 'N/A';
}

function getPersonaF24TipoLabel(p) {
    return (p && p.ragione_sociale && !p.nome && !p.cognome) ? 'Ragione Sociale' : 'Cognome / Nome';
}

// Data di chiusura del legame persona-contratto (tabelle ponte);
// fallback alla data di chiusura del contratto se non ci sono legami specifici.
function getPersonaRelDataChiusura(contrattoId, personaId, tipo) {
    var rels = tipo === 'loc' ? appData.contratto_locatori : appData.contratto_conduttori;
    var rel = rels.find(function(r) { return r.contratto_id === contrattoId && r.persona_id === personaId; });
    if (rel && rel.data_chiusura) return rel.data_chiusura;
    var c = getContrattoById(contrattoId);
    return c ? c.data_chiusura : null;
}

function generateF24Pdf(scadenzaId) {
    if (typeof jspdf === 'undefined') { showToast('Libreria PDF non disponibile, ricarica la pagina', 'error'); return; }
    var s = appData.scadenze.find(function(x) { return x.id === scadenzaId; });
    if (!s) return;
    var c = getContrattoById(s.contratto_id);
    if (!c) { showToast('Contratto non trovato', 'error'); return; }

    // Nel Modello F24 vanno elencati solo locatori/conduttori ancora attivi (senza data di chiusura)
    var locs = getLocatoriByContratto(c.id).filter(function(p) { return !getPersonaRelDataChiusura(c.id, p.id, 'loc'); });
    var conds = getConduttoriByContratto(c.id).filter(function(p) { return !getPersonaRelDataChiusura(c.id, p.id, 'cond'); });
    var canone = getCanonePerScadenza(c.id, s.data_decorrenza);

    // Importo: se il canone ha una percentuale, = percentuale sul canone annuo
    var percentuale = canone ? (parseFloat(canone.percentuale) || 0) : 0;
    var importo;
    if (percentuale > 0 && canone) {
        importo = Math.round((percentuale / 100) * (parseFloat(canone.importo) || 0) * 100) / 100;
    } else if (canone && parseFloat(canone.valore_assoluto) > 0) {
        importo = parseFloat(canone.valore_assoluto);
    } else {
        importo = parseFloat(s.importo) || 0;
    }

    var annoVersamento = new Date().getFullYear();
    var doc = new jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    var W = doc.internal.pageSize.getWidth();
    var M = 42;
    var y = 0;
    var DARK = [15, 23, 42], GRAY = [100, 116, 139], LIGHT = [241, 245, 249];

    function ensureSpace(h) { if (y + h > 800) { doc.addPage(); y = 64; } }

    function sectionTitle(title) {
        ensureSpace(46);
        y += 12;
        doc.setFillColor(79, 70, 229);
        doc.rect(M, y - 11, 5, 13, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        doc.text(title, M + 12, y);
        y += 8;
    }

    function field(label, value) {
        ensureSpace(46);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
        doc.text(String(label).toUpperCase(), M, y);
        doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
        doc.roundedRect(M, y + 4, W - 2 * M, 26, 3, 3, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        doc.text(String(value), M + 8, y + 21);
        y += 42;
    }

    // Header
    doc.setFillColor(DARK[0], DARK[1], DARK[2]);
    doc.rect(0, 0, W, 96, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(25);
    doc.text('MODELLO F24', M, 48);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(203, 213, 225);
    doc.text('Versamento Imposta di Registro - Contratti di Locazione', M, 68);
    doc.text('Scadenza: ' + formatDate(s.data_decorrenza) + '  -  Contratto: ' + (c.identificativo || '#' + c.id), M, 84);
    y = 120;

    // Locatore
    sectionTitle('LOCATORE');
    if (locs.length === 0) {
        field('Cognome / Nome', 'N/A');
    } else {
        locs.forEach(function(p, i) {
            if (i > 0) y += 8;
            field(getPersonaF24TipoLabel(p), getPersonaF24Nome(p));
            field('Codice Fiscale', p.codice_fiscale || 'N/A');
        });
    }

    // Conduttore
    sectionTitle('CONDUTTORE');
    if (conds.length === 0) {
        field('Cognome / Nome', 'N/A');
    } else {
        conds.forEach(function(p, i) {
            if (i > 0) y += 8;
            field(getPersonaF24TipoLabel(p), getPersonaF24Nome(p));
            field('Codice Fiscale', p.codice_fiscale || 'N/A');
        });
    }

    // Dati versamento (griglia stile F24)
    sectionTitle('DATI VERSAMENTO');
    var boxW = (W - 2 * M - 14) / 2;
    var boxH = 54;
    var boxY = y;
    function f24box(label, value, x) {
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(1);
        doc.roundedRect(x, boxY, boxW, boxH, 3, 3, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
        doc.text(String(label).toUpperCase(), x + 9, boxY + 15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        doc.text(String(value), x + 9, boxY + boxH - 15);
    }
    ensureSpace(2 * boxH + 24);
    f24box('Controparte', '63', M);
    f24box('Contratto', c.identificativo || '#' + c.id, M + boxW + 14);
    boxY += boxH + 10;
    f24box('Anno di versamento', annoVersamento, M);
    f24box('Importo a debito', formatCurrency(importo), M + boxW + 14);
    y = boxY + boxH + 18;

    // Dettaglio calcolo
    if (canone) {
        var annoCanone = canone.data_inizio ? new Date(canone.data_inizio).getFullYear() : '';
        var periodo = (canone.data_inizio ? formatDate(canone.data_inizio) : '-') + ' / ' + (canone.data_fine ? formatDate(canone.data_fine) : '-');
        sectionTitle('DETTAGLIO CALCOLO');
        field('Canone annuo di riferimento' + (annoCanone ? ' - Anno ' + annoCanone : ''), formatCurrency(canone.importo) + '   (' + periodo + ')');
        if (percentuale > 0) {
            field('Percentuale applicata sul canone', percentuale + '%  =  ' + formatCurrency(importo));
        } else {
            field('Importo versamento', formatCurrency(importo));
        }
    }

    // Footer
    ensureSpace(40);
    y += 10;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.text('Documento generato automaticamente il ' + formatDate(new Date().toISOString().slice(0, 10)) + ' - Studio Santantonio', M, y);

    // Nel nome file includiamo l'anno del canone di riferimento così scadenze
    // diverse dello stesso contratto generano file distinti
    var annoRif = canone && canone.data_inizio ? new Date(canone.data_inizio).getFullYear() : (s.data_decorrenza ? new Date(s.data_decorrenza).getFullYear() : '');
    var nomeFile = 'F24_' + (c.identificativo || 'contratto-' + c.id).replace(/[^a-zA-Z0-9_-]+/g, '-') + (annoRif ? '_' + annoRif : '') + '.pdf';
    doc.save(nomeFile);
    showToast('PDF Modello F24 generato', 'success');
}

// --- Render Scadenze ---
function getContrattoById(id) {
    return appData.contratti.find(function(c) { return c.id === id; }) || null;
}
async function renderScadenze() {
    var filtroStato = document.getElementById('filterScadenzaStato').value;

    var list = appData.scadenze.slice().sort(function(a, b) {
        return (a.data_decorrenza || '').localeCompare(b.data_decorrenza || '');
    });
    if (filtroStato !== 'all') list = list.filter(function(s) { return s.stato === filtroStato; });

    // Stats
    var inAttesa = appData.scadenze.filter(function(s) { return s.stato === 'in-attesa'; });
    document.getElementById('statScadenzeInAttesa').textContent = inAttesa.length;

    var cardsEl = document.getElementById('scadenzeCards');
    var tbody = document.getElementById('scadenzeTableBody');
    if (list.length === 0) {
        cardsEl.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-calendar"></i><p>Nessuna scadenza trovata</p></div>';
        tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-calendar"></i><p>Nessuna scadenza trovata</p></div></td></tr>';
    } else {
        cardsEl.innerHTML = list.map(function(s) {
            var c = getContrattoById(s.contratto_id);
            var cod = c ? c.identificativo : 'Contratto #' + s.contratto_id;
            var locLabel = c ? getLocatoriCognomeNomeLabel(c.id) : 'N/A';
            var condLabel = c ? getConduttoriCognomeNomeLabel(c.id) : 'N/A';
            var urg = getScadenzaUrgenza(s);
            var proxHtml = formatDate(s.prossima_scadenza);
            if (urg) proxHtml += ' <span class="status-badge ' + urg.type + '">' + urg.label + (urg.days > 0 ? ' · ' + urg.days + ' gg' : '') + '</span>';
            return '<div class="contract-card' + (urg ? ' alert-' + urg.type : '') + '">' +
                '<div class="contract-top"><span class="contract-code">' + cod + '</span></div>' +
                '<div class="contract-title"><i class="fas fa-user-tie"></i> ' + locLabel + ' → <i class="fas fa-user"></i> ' + condLabel + '</div>' +
                '<div class="contract-details">' +
                '<div class="contract-detail"><label>Decorrenza</label><span>' + formatDate(s.data_decorrenza) + '</span></div>' +
                '<div class="contract-detail"><label>Importo</label><span>' + formatCurrency(s.importo) + '</span></div>' +
                '<div class="contract-detail"><label>Stato</label><span><span class="status-badge ' + s.stato + '">' + getStatusLabel(s.stato) + '</span></span></div>' +
                '<div class="contract-detail"><label>Prossima Scadenza</label><span>' + proxHtml + '</span></div>' +
                '<div class="contract-detail"><label>Prossima Decorrenza</label><span>' + formatDate(s.prossima_decorrenza) + '</span></div>' +
                '</div>' +
                '<div class="contract-actions">' + scadenzaF24Btn(s) + scadenzaDoneBtn(s) + '</div></div>';
        }).join('');
        tbody.innerHTML = list.map(function(s) {
            var c = getContrattoById(s.contratto_id);
            var cod = c ? c.identificativo : 'Contratto #' + s.contratto_id;
            var urg = getScadenzaUrgenza(s);
            var proxHtml = formatDate(s.prossima_scadenza);
            if (urg) proxHtml += ' <span class="status-badge ' + urg.type + '">' + urg.label + (urg.days > 0 ? ' · ' + urg.days + ' gg' : '') + '</span>';
            return '<tr' + (urg ? ' class="alert-' + urg.type + '"' : '') + '>' +
                '<td><strong>' + cod + '</strong></td>' +
                '<td>' + formatDate(s.data_decorrenza) + '</td>' +
                '<td>' + formatCurrency(s.importo) + '</td>' +
                '<td><span class="status-badge ' + s.stato + '">' + getStatusLabel(s.stato) + '</span></td>' +
                '<td>' + proxHtml + '</td>' +
                '<td>' + formatDate(s.prossima_decorrenza) + '</td>' +
                '<td><div class="scadenza-actions">' + scadenzaF24Btn(s) + scadenzaDoneBtn(s) + '</div></td>' +
                '</tr>';
        }).join('');
    }
}

// --- View Toggle Scadenze ---
function setScadenzeView(view) {
    document.getElementById('page-scadenze').querySelectorAll('.view-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.view === view); });
    document.getElementById('scadenzeCards').style.display = view === 'cards' ? '' : 'none';
    document.getElementById('scadenzeTable').style.display = view === 'table' ? '' : 'none';
}

// --- Filter Listeners ---


// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    await loadAllData();
    try { await renderDashboard(); } catch(e) { console.error('Dashboard error:', e); }
    try { renderContratti(); } catch(e) { console.error('Contratti error:', e); }

});
