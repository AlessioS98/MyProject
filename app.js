/* ============================================
   Gestione Contratti di Affitto - Supabase
   ============================================ */

// --- Supabase Init ---
const SUPABASE_URL = 'https://djqbrwlbjctloxspepnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqcWJyd2xiamN0bG94c3BlcG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0ODc5NDAsImV4cCI6MjEwMzA2Mzk0MH0.ah9cvekaWwu9PkamgkhlTroy6z5Hd9gGgoo77W4uI3c';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Data Cache ---
var appData = { contratti: [], persone: [], immobili: [], scadenze: [], pagamenti: [], canoni_annuali: [], contratto_locatori: [], contratto_conduttori: [] };

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
    return { attivo: 'Attivo', scaduto: 'Scaduto', sospeso: 'Sospeso', completato: 'Completato', 'in-attesa': 'In Attesa' }[s] || s;
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
    return p.nome + ' ' + p.cognome;
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
    var label = p.nome + ' ' + p.cognome;
    if (p.ragione_sociale) label += ' (' + p.ragione_sociale + ')';
    return label;
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

// --- Locatore / Conduttore Row Helpers ---
var locatoreRowCounter = 0;
function addLocatoreRow(persona) {
    locatoreRowCounter++;
    var container = document.getElementById('locatoriRowsContainer');
    if (!container) return;
    var idx = locatoreRowCounter;
    var p = persona || {};
    var locTipo = (p.ragione_sociale && !p.nome) ? 'azienda' : 'pf';
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
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Codice Fiscale</label><input type="text" class="loc-cf" value="${p.codice_fiscale || ''}"></div>
        <div class="form-group" style="flex:1;min-width:140px;margin:0" ${(locTipo==='pf')?'style="opacity:0.4"':''}><label>Ragione Sociale</label><input type="text" class="loc-rs" value="${p.ragione_sociale || ''}" ${(locTipo==='pf')?'disabled':''}></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0" ${(locTipo==='azienda')?'style="opacity:0.4"':''}><label>Cognome</label><input type="text" class="loc-cognome" value="${p.cognome || ''}" ${(locTipo==='azienda')?'disabled':''}></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0" ${(locTipo==='azienda')?'style="opacity:0.4"':''}><label>Nome</label><input type="text" class="loc-nome" value="${p.nome || ''}" ${(locTipo==='azienda')?'disabled':''}></div>
        </div>
    `;
    container.appendChild(row);
}

var conduttoreRowCounter = 0;
function addConduttoreRow(persona) {
    conduttoreRowCounter++;
    var container = document.getElementById('conduttoriRowsContainer');
    if (!container) return;
    var idx = conduttoreRowCounter;
    var p = persona || {};
    var condTipo = (p.ragione_sociale && !p.nome) ? 'azienda' : 'pf';
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
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Codice Fiscale</label><input type="text" class="cond-cf" value="${p.codice_fiscale || ''}"></div>
        <div class="form-group" style="flex:1;min-width:140px;margin:0" ${(condTipo==='pf')?'style="opacity:0.4"':''}><label>Ragione Sociale</label><input type="text" class="cond-rs" value="${p.ragione_sociale || ''}" ${(condTipo==='pf')?'disabled':''}></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0" ${(condTipo==='azienda')?'style="opacity:0.4"':''}><label>Cognome</label><input type="text" class="cond-cognome" value="${p.cognome || ''}" ${(condTipo==='azienda')?'disabled':''}></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0" ${(condTipo==='azienda')?'style="opacity:0.4"':''}><label>Nome</label><input type="text" class="cond-nome" value="${p.nome || ''}" ${(condTipo==='azienda')?'disabled':''}></div>
        </div>
    `;
    container.appendChild(row);
}

// --- Calculate contract status ---
function  calcContrattoStato(c) {
    if (c.data_chiusura) return 'scaduto';
    var d = daysUntil(c.data_scadenza);
    if (d <= 0) return 'scaduto';
    return 'attivo';
}

// --- Calculate scadenza urgency ---
function calcScadenzaUrgenza(s) {
    var d = daysUntil(s.data);
    if (d <= 7) return 'alta';
    if (d <= 30) return 'media';
    return 'bassa';
}

// --- Data Loading ---
async function loadAllData() {
    try {
        var [persone, immobili, contratti, scadenze, pagamenti, canoni, locRel, condRel] = await Promise.all([
            db.from('anagrafica_persona').select('*'),
            db.from('immobili').select('*'),
            db.from('contratti').select('*'),
            db.from('scadenze').select('*'),
            db.from('pagamenti').select('*'),
            db.from('canoni_annuali').select('*'),
            db.from('contratto_locatori').select('*'),
            db.from('contratto_conduttori').select('*')
        ]);
        appData.persone = persone.data || [];
        appData.immobili = immobili.data || [];
        appData.contratti = contratti.data || [];
        appData.scadenze = scadenze.data || [];
        appData.pagamenti = pagamenti.data || [];
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
        case 'pagamenti': await renderPagamenti(); break;
        case 'archivio': await renderArchivio(); break;
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
        case 'delete-contratto': deleteContratto(id); break;
        case 'view-contratto': openModal('viewContratto', id); break;
        case 'new-scadenza': openModal('newScadenza'); break;
        case 'edit-scadenza': openModal('editScadenza', id); break;
        case 'delete-scadenza': deleteScadenza(id); break;
        case 'complete-scadenza': openModal('completeScadenza', id); break;
        case 'new-inquilino': openModal('newInquilino'); break;
        case 'new-pagamento': openModal('newPagamento'); break;
        case 'delete-pagamento': deletePagamento(id); break;
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
function openFilterModal() {
    var overlay = document.getElementById('filterModalOverlay');
    overlay.classList.add('active');
    populateFilterDropdowns();
}

function closeFilterModal() {
    document.getElementById('filterModalOverlay').classList.remove('active');
}

function populateFilterDropdowns() {
    var persone = appData.persone;
    var immobili = appData.immobili;
    var contratti = appData.contratti;

    // Helper to populate a select with unique values
    function populate(selectId, values, labelFn) {
        var sel = document.getElementById(selectId);
        var first = sel.options[0];
        sel.innerHTML = '';
        sel.appendChild(first);
        var seen = {};
        values.forEach(function(v) {
            var label = labelFn(v);
            if (label && !seen[label]) {
                seen[label] = true;
                var opt = document.createElement('option');
                opt.value = label;
                opt.textContent = label;
                sel.appendChild(opt);
            }
        });
    }

    // Locatori (via tabelle ponte)
    var locatori = [];
    contratti.forEach(function(c) { getLocatoriByContratto(c.id).forEach(function(p) { locatori.push(p); }); });
    populate('ffLocNome', locatori, function(p) { return p.nome; });
    populate('ffLocCognome', locatori, function(p) { return p.cognome; });
    populate('ffLocCF', locatori, function(p) { return p.codice_fiscale; });
    populate('ffLocRS', locatori, function(p) { return p.ragione_sociale; });

    // Conduttori (via tabelle ponte)
    var conduttori = [];
    contratti.forEach(function(c) { getConduttoriByContratto(c.id).forEach(function(p) { conduttori.push(p); }); });
    populate('ffConNome', conduttori, function(p) { return p.nome; });
    populate('ffConCognome', conduttori, function(p) { return p.cognome; });
    populate('ffConCF', conduttori, function(p) { return p.codice_fiscale; });
    populate('ffConRS', conduttori, function(p) { return p.ragione_sociale; });

    // Immobili
    var immUsed = [];
    contratti.forEach(function(c) { var i = getImmobile(c.immobile_id); if (i) immUsed.push(i); });
    populate('ffIndirizzo', immUsed, function(i) { return i.indirizzo; });
    populate('ffCitta', immUsed, function(i) { return i.citta; });

    // Identificativi
    populate('ffIdentificativo', contratti, function(c) { return c.identificativo; });
}

function resetFilterModal() {
    document.getElementById('ffLocNome').value = '';
    document.getElementById('ffLocCognome').value = '';
    document.getElementById('ffLocCF').value = '';
    document.getElementById('ffLocRS').value = '';
    document.getElementById('ffConNome').value = '';
    document.getElementById('ffConCognome').value = '';
    document.getElementById('ffConCF').value = '';
    document.getElementById('ffConRS').value = '';
    document.getElementById('ffIndirizzo').value = '';
    document.getElementById('ffCitta').value = '';
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
    f = f.filter(function(c) {
        var i = getImmobile(c.immobile_id);
        if (!i) return false;
        return matchField(i.indirizzo, indirizzo) && matchField(i.citta, citta);
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
    } else {
        csv = 'Data,Contratto,Tipo,Importo,Stato\n';
        appData.pagamenti.forEach(function(p) {
            var c = appData.contratti.find(function(x) { return x.id === p.contratto_id; });
            csv += '"' + p.data + '","' + (c ? c.identificativo : '-') + '","' + getTipoLabel(p.tipo) + '",' + p.importo + ',"' + getStatusLabel(p.stato) + '"\n';
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
        html += '<div class="form-section-title full"><i class="fas fa-file-contract"></i> Dati Contratto</div><br>';
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
        html += '<div class="form-group full"><label>Indirizzo</label><input type="text" id="cf_imm_indirizzo" value="' + (imm ? imm.indirizzo : '') + '" required></div>';
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

    } else if (type === 'newScadenza' || type === 'editScadenza') {
        var s = type === 'editScadenza' ? appData.scadenze.find(function(x) { return x.id === id; }) : null;
        title.textContent = s ? 'Modifica Scadenza' : 'Nuova Scadenza';
        var copts = appData.contratti.map(function(c) {
            return '<option value="' + c.id + '"' + (s && s.contratto_id === c.id ? ' selected' : '') + '>' + c.identificativo + ' - ' + getConduttoriLabel(c.id) + '</option>';
        }).join('');
        var tipos = ['canone','imposta','bolletta','sicurezza','rinnovo','versamento'].map(function(t) {
            return '<option value="' + t + '"' + (s && s.tipo === t ? ' selected' : '') + '>' + getTipoLabel(t) + '</option>';
        }).join('');
        html = '<form id="scadenzaForm" class="form-grid">';
        html += '<div class="form-group full"><label>Contratto</label><select id="sf_contratto" required><option value="">Seleziona contratto</option>' + copts + '</select></div>';
        html += '<div class="form-group full"><label>Titolo</label><input type="text" id="sf_titolo" value="' + (s ? s.titolo : '') + '" required></div>';
        html += '<div class="form-group"><label>Tipo</label><select id="sf_tipo">' + tipos + '</select></div>';
        html += '<div class="form-group"><label>Data</label><input type="date" id="sf_data" value="' + (s ? s.data : '') + '" required></div>';
        html += '<div class="form-group full"><label>Descrizione</label><textarea id="sf_descrizione">' + (s ? (s.descrizione || '') : '') + '</textarea></div>';
        html += '<div class="form-actions full"><button type="button" class="btn btn-outline" data-action="close-modal">Annulla</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salva</button></div>';
        html += '</form>';

    } else if (type === 'newPagamento') {
        title.textContent = 'Registra Pagamento';
        var pc = appData.contratti.map(function(c) {
            return '<option value="' + c.id + '">' + c.identificativo + ' - ' + getConduttoriLabel(c.id) + '</option>';
        }).join('');
        var ptipos = ['canone','imposta','bolletta','sicurezza','versamento','spese'].map(function(t) {
            return '<option value="' + t + '">' + getTipoLabel(t) + '</option>';
        }).join('');
        html = '<form id="pagamentoForm" class="form-grid">';
        html += '<div class="form-group full"><label>Contratto</label><select id="pf_contratto" required><option value="">Seleziona contratto</option>' + pc + '</select></div>';
        html += '<div class="form-group"><label>Data</label><input type="date" id="pf_data" required></div>';
        html += '<div class="form-group"><label>Tipo</label><select id="pf_tipo">' + ptipos + '</select></div>';
        html += '<div class="form-group"><label>Importo (EUR)</label><input type="number" id="pf_importo" min="0" step="0.01" required></div>';
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

    } else if (type === 'completeScadenza') {
        var sc = appData.scadenze.find(function(x) { return x.id === id; });
        if (!sc) return;
        var ct = appData.contratti.find(function(x) { return x.id === sc.contratto_id; });
        title.textContent = 'Completa Scadenza';
        html = '<form id="completeScadenzaForm" class="form-grid">';
        html += '<div class="form-group full" style="padding:12px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:8px">';
        html += '<strong>' + sc.titolo + '</strong><br>';
        html += '<span style="color:var(--text-muted)">' + getTipoLabel(sc.tipo) + ' &bull; ' + formatDate(sc.data) + '</span>';
        if (ct) html += '<br><span style="color:var(--text-muted)">' + ct.identificativo + ' - ' + getConduttoriLabel(ct.id) + '</span>';
        html += '</div>';
        html += '<div class="form-group"><label>Data Pagamento</label><input type="date" id="csf_data" value="' + sc.data + '" required></div>';
        html += '<div class="form-group"><label>Importo (EUR)</label><input type="number" id="csf_importo" min="0" step="0.01" required></div>';
        html += '<div class="form-actions full"><button type="button" class="btn btn-outline" data-action="close-modal">Annulla</button><button type="submit" class="btn btn-primary"><i class="fas fa-check"></i> Completa e Registra Pagamento</button></div>';
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
            existingLocs.forEach(function(p) { addLocatoreRow(p); });
            // Populate existing conduttori
            var existingConds = getConduttoriByContratto(id);
            existingConds.forEach(function(p) { addConduttoreRow(p); });
        }
        // If new contract, add one empty row for each section
        if (type === 'newContratto') {
            addCanoneRow();
            addLocatoreRow();
            addConduttoreRow();
        }
    }
    var sf = document.getElementById('scadenzaForm');
    if (sf) sf.addEventListener('submit', function(e) { e.preventDefault(); saveScadenza(id); });
    var pf = document.getElementById('pagamentoForm');
    if (pf) pf.addEventListener('submit', function(e) { e.preventDefault(); savePagamento(); });
    var iqf = document.getElementById('inquilinoForm');
    if (iqf) iqf.addEventListener('submit', function(e) { e.preventDefault(); saveInquilino(); });
    var csf = document.getElementById('completeScadenzaForm');
    if (csf) csf.addEventListener('submit', function(e) { e.preventDefault(); confirmCompleteScadenza(id); });
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

// --- Save Scadenza ---
async function saveScadenza(editId) {
    var d = {
        contratto_id: parseInt(document.getElementById('sf_contratto').value),
        titolo: document.getElementById('sf_titolo').value.trim(),
        tipo: document.getElementById('sf_tipo').value,
        data: document.getElementById('sf_data').value,
        urgenza: calcScadenzaUrgenza({ data: document.getElementById('sf_data').value }),
        descrizione: document.getElementById('sf_descrizione').value.trim(),
        stato: 'in-attesa'
    };
    if (editId) {
        var { error } = await db.from('scadenze').update(d).eq('id', editId);
        if (error) { showToast('Errore', 'error'); return; }
        var idx = appData.scadenze.findIndex(function(s) { return s.id === editId; });
        if (idx >= 0) Object.assign(appData.scadenze[idx], d);
    } else {
        var { data: insData, error } = await db.from('scadenze').insert(d).select('id').single();
        if (error) { showToast('Errore', 'error'); return; }
        d.id = insData.id;
        appData.scadenze.push(d);
    }
    closeModal();
    showToast(editId ? 'Scadenza aggiornata!' : 'Scadenza creata!', 'success');
    await refreshPage('scadenze');
}

// --- Save Pagamento ---
async function savePagamento() {
    var cid = parseInt(document.getElementById('pf_contratto').value);
    var d = {
        contratto_id: cid,
        data: document.getElementById('pf_data').value,
        tipo: document.getElementById('pf_tipo').value,
        importo: parseFloat(document.getElementById('pf_importo').value) || 0,
        stato: 'completato'
    };
    var { data: insData, error } = await db.from('pagamenti').insert(d).select('id').single();
    if (error) { showToast('Errore', 'error'); return; }
    d.id = insData.id;
    appData.pagamenti.push(d);
    closeModal();
    showToast('Pagamento registrato!', 'success');
    await refreshPage('pagamenti');
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
    if (!confirm('Eliminare questo contratto e tutti i dati collegati?')) return;
    var { error } = await db.from('contratti').delete().eq('id', id);
    if (error) { showToast('Errore eliminazione', 'error'); return; }
    appData.contratti = appData.contratti.filter(function(c) { return c.id !== id; });
    appData.scadenze = appData.scadenze.filter(function(s) { return s.contratto_id !== id; });
    appData.pagamenti = appData.pagamenti.filter(function(p) { return p.contratto_id !== id; });
    appData.canoni_annuali = appData.canoni_annuali.filter(function(ca) { return ca.contratto_id !== id; });
    appData.contratto_locatori = appData.contratto_locatori.filter(function(r) { return r.contratto_id !== id; });
    appData.contratto_conduttori = appData.contratto_conduttori.filter(function(r) { return r.contratto_id !== id; });
    showToast('Contratto eliminato', 'info');
    await refreshPage('contratti');
}

async function deleteScadenza(id) {
    if (!confirm('Eliminare questa scadenza?')) return;
    var { error } = await db.from('scadenze').delete().eq('id', id);
    if (error) { showToast('Errore', 'error'); return; }
    appData.scadenze = appData.scadenze.filter(function(s) { return s.id !== id; });
    showToast('Scadenza eliminata', 'info');
    await refreshPage('scadenze');
}

async function confirmCompleteScadenza(scadenzaId) {
    var s = appData.scadenze.find(function(x) { return x.id === scadenzaId; });
    if (!s) return;
    var data = document.getElementById('csf_data').value;
    var importo = parseFloat(document.getElementById('csf_importo').value) || 0;
    if (!data || importo <= 0) { showToast('Inserisci data e importo', 'error'); return; }

    // 1. Mark scadenza as completed
    var { error: err1 } = await db.from('scadenze').update({ stato: 'completata' }).eq('id', scadenzaId);
    if (err1) { showToast('Errore aggiornamento scadenza', 'error'); return; }
    s.stato = 'completata';

    // 2. Create linked payment
    var pagamento = {
        contratto_id: s.contratto_id,
        data: data,
        tipo: s.tipo,
        importo: importo,
        stato: 'completato'
    };
    var { data: insData, error: err2 } = await db.from('pagamenti').insert(pagamento).select('id').single();
    if (err2) { console.error('Errore creazione pagamento:', err2); showToast('Scadenza completata ma errore nel pagamento', 'error'); closeModal(); await refreshPage('scadenze'); return; }
    pagamento.id = insData.id;
    appData.pagamenti.push(pagamento);

    closeModal();
    showToast('Scadenza completata e pagamento registrato!', 'success');
    await refreshPage('scadenze');
    await refreshPage('pagamenti');
}


async function deletePagamento(id) {
    if (!confirm('Eliminare questo pagamento?')) return;
    var { error } = await db.from('pagamenti').delete().eq('id', id);
    if (error) { showToast('Errore', 'error'); return; }
    appData.pagamenti = appData.pagamenti.filter(function(p) { return p.id !== id; });
    showToast('Pagamento eliminato', 'info');
    await refreshPage('pagamenti');
}

// --- View Toggle ---
function setView(view) {
    document.querySelectorAll('.view-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.view === view); });
    document.getElementById('contractsCards').style.display = view === 'cards' ? '' : 'none';
    document.getElementById('contractsTable').style.display = view === 'table' ? '' : 'none';
}

// ============================================
// RENDERING
// ============================================

async function renderDashboard() {
    var attivi = appData.contratti.filter(function(c) { return calcContrattoStato(c) === 'attivo'; });
    var entrate = attivi.reduce(function(s, c) { return s + (getCanoneAttuale(c.id) ? getCanoneAttuale(c.id).importo : 0); }, 0);
    var scadenzeUrgenti = appData.scadenze.filter(function(s) { return s.stato !== 'completata' && daysUntil(s.data) <= 30; });

    document.getElementById('statContratti').textContent = attivi.length;
    document.getElementById('statScadenze').textContent = scadenzeUrgenti.length;

    // Upcoming deadlines
    var upcoming = appData.scadenze.filter(function(s) { return s.stato !== 'completata'; }).sort(function(a, b) { return new Date(a.data) - new Date(b.data); }).slice(0, 5);
    var upEl = document.getElementById('upcomingDeadlines');
    if (upcoming.length === 0) {
        upEl.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>Nessuna scadenza imminente</p></div>';
    } else {
        upEl.innerHTML = upcoming.map(function(s) {
            var d = daysUntil(s.data);
            var dc = d <= 7 ? 'red' : d <= 30 ? 'orange' : 'green';
            var ct = appData.contratti.find(function(x) { return x.id === s.contratto_id; });
            var inqLabel = ct ? getConduttoriLabel(ct.id) : 'N/A';
            return '<div class="upcoming-item"><div class="upcoming-dot ' + dc + '"></div><div class="upcoming-info"><span class="up-title">' + s.titolo + '</span><span class="up-sub">' + inqLabel + '</span></div><span class="upcoming-date">' + formatDate(s.data) + '</span></div>';
        }).join('');
    }

    // Recent activity
    var recent = appData.pagamenti.slice(-5).reverse();
    var actEl = document.getElementById('recentActivity');
    if (recent.length === 0) {
        actEl.innerHTML = '<div class="empty-state"><p>Nessuna attivita recente</p></div>';
    } else {
        actEl.innerHTML = recent.map(function(p) {
            var ct = appData.contratti.find(function(x) { return x.id === p.contratto_id; });
            var inqLabel = ct ? getConduttoriLabel(ct.id) : 'N/A';
            return '<div class="activity-item"><div class="activity-dot"></div><span class="activity-text">' + inqLabel + ' - ' + getTipoLabel(p.tipo) + ' ' + formatCurrency(p.importo) + '</span><span class="activity-time">' + formatDate(p.data) + '</span></div>';
        }).join('');
    }

    // Notifications
    var notifs = [];
    scadenzeUrgenti.forEach(function(s) {
        var ct = appData.contratti.find(function(x) { return x.id === s.contratto_id; });
        var d = daysUntil(s.data);
        notifs.push({
            icon: 'fa-exclamation-triangle',
            iconClass: d <= 7 ? 'danger' : 'warning',
            text: s.titolo + ' - ' + (ct ? getConduttoriLabel(ct.id) : '') + ' (' + d + ' gg)',
            time: formatDate(s.data)
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

    // Scadenze per Priorità
    var prioritaCounts = { Alta: 0, Media: 0, Bassa: 0 };
    appData.scadenze.filter(function(s) { return s.stato !== 'completata'; }).forEach(function(s) {
        var u = calcScadenzaUrgenza(s);
        if (u === 'alta') prioritaCounts.Alta++;
        else if (u === 'media') prioritaCounts.Media++;
        else prioritaCounts.Bassa++;
    });
    var totalScadenze = appData.scadenze.length;
    var completateScadenze = appData.scadenze.filter(function(s) { return s.stato === 'completata'; }).length;
    var allCompleted = totalScadenze > 0 && completateScadenze === totalScadenze;
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
async function renderContratti() { renderContrattiList(appData.contratti); }
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

// --- Render Scadenze ---
async function renderScadenze() {
    var ft = document.getElementById('filterScadenzaTipo').value;
    var fu = document.getElementById('filterScadenzaUrgenza').value;
    var list = appData.scadenze;
    if (ft !== 'all') list = list.filter(function(s) { return s.tipo === ft; });
    if (fu !== 'all') list = list.filter(function(s) { return calcScadenzaUrgenza(s) === fu; });
    list.sort(function(a, b) { return new Date(a.data) - new Date(b.data); });

    var el = document.getElementById('scadenzeTimeline');
    if (list.length === 0) {
        el.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>Nessuna scadenza trovata</p></div>';
        return;
    }
    var html = '', lastDate = '';
    list.forEach(function(s) {
        if (s.data !== lastDate) {
            var d = daysUntil(s.data);
            var dl = d === 0 ? 'OGGI' : d === 1 ? 'DOMANI' : d < 0 ? 'SCADUTO' : 'Tra ' + d + ' giorni';
            var dc = d <= 0 ? 'var(--danger)' : d <= 7 ? 'var(--warning)' : 'var(--text-muted)';
            html += '<div class="scadenza-day"><div class="scadenza-day-header">' + formatDate(s.data) + ' <span style="color:' + dc + ';margin-left:8px">' + dl + '</span></div></div>';
            lastDate = s.data;
        }
        var ct = appData.contratti.find(function(x) { return x.id === s.contratto_id; });
        var ic = s.stato === 'completata';
        var urg = calcScadenzaUrgenza(s);
        var h = '<div class="scadenza-card ' + urg + '" style="' + (ic ? 'opacity:0.5' : '') + '">';
        h += '<div class="scadenza-icon"><i class="fas ' + getScadenzaIcon(s.tipo) + '"></i></div>';
        h += '<div class="scadenza-info"><span class="scadenza-title">' + s.titolo + '</span>';
        h += '<span class="scadenza-sub">' + (ct ? ct.identificativo + ' - ' + getConduttoriLabel(ct.id) : 'N/A') + ' &bull; ' + getTipoLabel(s.tipo) + '</span></div>';
        h += '<div class="scadenza-actions">';
        h += ic ? '<span class="status-badge attivo">Completata</span>' : '<button class="btn btn-sm btn-success" data-action="complete-scadenza" data-id="' + s.id + '" title="Segna completata"><i class="fas fa-check"></i></button>';
        h += '<button class="btn btn-sm btn-outline" data-action="edit-scadenza" data-id="' + s.id + '" title="Modifica"><i class="fas fa-edit"></i></button>';
        h += '<button class="btn btn-sm btn-outline" data-action="delete-scadenza" data-id="' + s.id + '" title="Elimina" style="color:var(--danger)"><i class="fas fa-trash"></i></button>';
        h += '</div></div>';
        html += h;
    });
    el.innerHTML = html;
}

// --- Render Pagamenti ---
async function renderPagamenti() {
    var pagamenti = appData.pagamenti.filter(function(p) { return p.stato === 'completato'; }).sort(function(a, b) { return new Date(b.data) - new Date(a.data); });
    var entrata = pagamenti.reduce(function(s, p) { return s + p.importo; }, 0);


    var tbody = document.getElementById('pagamentiTableBody');
    tbody.innerHTML = pagamenti.map(function(p) {
        var c = appData.contratti.find(function(x) { return x.id === p.contratto_id; });
        var condLabel = c ? getConduttoriLabel(c.id) : 'N/A';
        var locLabel = c ? getLocatoriLabel(c.id) : 'N/A';
        return '<tr><td>' + formatDate(p.data) + '</td><td>' + (c ? c.identificativo : '-') + '</td><td>' + locLabel + '</td><td>' + condLabel + '</td><td>' + getTipoLabel(p.tipo) + '</td><td><strong>' + formatCurrency(p.importo) + '</strong></td><td><span class="status-badge ' + p.stato + '">' + getStatusLabel(p.stato) + '</span></td><td><div class="td-actions"><button class="danger" data-action="delete-pagamento" data-id="' + p.id + '" title="Elimina"><i class="fas fa-trash"></i></button></div></td></tr>';
    }).join('');
}

// --- Filter Listeners ---
document.getElementById('filterScadenzaTipo').addEventListener('change', renderScadenze);
document.getElementById('filterScadenzaUrgenza').addEventListener('change', renderScadenze);

// ============================================
// --- Render Archivio Contratti Chiusi ---
async function renderArchivio() {
    var chiusi = appData.contratti.filter(function(c) {
        var s = calcContrattoStato(c);
        return s === 'scaduto';
    });
    chiusi.sort(function(a, b) {
        // Ordina per data chiusura/scadenza decrescente
        var da = a.data_chiusura || a.data_scadenza || '';
        var db = b.data_chiusura || b.data_scadenza || '';
        return new Date(db) - new Date(da);
    });

    var tbody = document.getElementById('archivioTableBody');
    if (!tbody) return;
    if (chiusi.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-muted)"><i class="fas fa-archive" style="font-size:2rem;display:block;margin-bottom:0.5rem"></i>Nessun contratto chiuso o scaduto</td></tr>';
    } else {
        tbody.innerHTML = chiusi.map(function(c) {
            var stato = calcContrattoStato(c);
            var caArch = getCanoneAttuale(c.id);
            return '<tr><td><strong>' + c.identificativo + '</strong></td><td>' + getLocatoriLabel(c.id) + '</td><td>' + getConduttoriLabel(c.id) + '</td><td>' + getImmobileLabel(c.immobile_id) + '</td><td>' + (caArch ? formatCurrency(caArch.importo) : '-') + '</td><td>' + formatDate(c.data_decorrenza) + '</td><td>' + formatDate(c.data_scadenza) + '</td><td>' + formatDate(c.data_chiusura) + '</td><td><span class="status-badge ' + stato + '">' + getStatusLabel(stato) + '</span></td><td><div class="td-actions"><button data-action="view-contratto" data-id="' + c.id + '" title="Dettagli"><i class="fas fa-eye"></i></button></div></td></tr>';
        }).join('');
    }
}

// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    await loadAllData();
    await renderDashboard();
    renderContratti();
    renderScadenze();
    renderPagamenti();
});
