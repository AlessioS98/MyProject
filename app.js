/* ============================================
   Gestione Contratti di Affitto - Supabase
   ============================================ */

// --- Supabase Init ---
const SUPABASE_URL = 'https://djqbrwlbjctloxspepnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqcWJyd2xiamN0bG94c3BlcG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0ODc5NDAsImV4cCI6MjEwMzA2Mzk0MH0.ah9cvekaWwu9PkamgkhlTroy6z5Hd9gGgoo77W4uI3c';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Data Cache ---
var appData = { contratti: [], persone: [], immobili: [], scadenze: [], canoni_annuali: [], contratto_locatori: [], contratto_conduttori: [] };
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
    // Math.round (non Math.ceil): le due mezzanotti locali possono distare
    // 23 o 25 ore quando nel mezzo cade un cambio ora legale/solare; con
    // ceil una scadenza a +30 gg (o negli ultimi 7 gg) verrebbe calcolata
    // come 31 (o 8) giorni e la notifica non scattarebbe.
    return Math.round((t - n) / 864e5);
}
function getStatusLabel(s) {
    return { attivo: 'Attivo', scaduto: 'Scaduto', chiuso: 'Chiuso', sospeso: 'Sospeso', completato: 'Completato', completata: 'Completata', scaduta: 'Scaduta', 'in-attesa': 'In Attesa' }[s] || s;
}

// --- Stati archiviati delle scadenze ---
// 'completata': versamento effettuato, completato manualmente dall'utente
// ('completato' resta accettato per compatibilita' con vecchi record).
// 'scaduta': scadenza gia' passata archiviata in automatico dal sistema,
// NON pagata: viene mostrata nelle liste come "Scaduta", non come "Completata".
function isScadenzaCompletata(s) {
    return s.stato === 'completata' || s.stato === 'completato';
}
function isScadenzaScaduta(s) {
    return s.stato === 'scaduta';
}
// Archiviata = completata manualmente OPPURE scaduta e archiviata in automatico.
function isScadenzaArchiviata(s) {
    return isScadenzaCompletata(s) || isScadenzaScaduta(s);
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
// Persone + data di inizio (decorrenza) del legame con il contratto.
// In fase di creazione la data viene precompilata con quella del contratto
// (modificabile): qui restituisce il valore salvato, con fallback su quella
// del contratto per i record creati prima delle date per singola persona.
function getLocatoriRelsByContratto(contrattoId) {
    var c = appData.contratti.find(function(x) { return x.id === contrattoId; });
    var rels = appData.contratto_locatori.filter(function(r) { return r.contratto_id === contrattoId; });
    if (rels.length === 0 && c && c.locatore_id) {
        var p = getPersona(c.locatore_id);
        return p ? [{ persona: p, data_decorrenza: c.data_decorrenza, data_chiusura: c.data_chiusura }] : [];
    }
    return rels.map(function(r) {
        return { persona: getPersona(r.persona_id), data_decorrenza: r.data_decorrenza, data_chiusura: r.data_chiusura };
    }).filter(function(x) { return x.persona; });
}
function getConduttoriRelsByContratto(contrattoId) {
    var c = appData.contratti.find(function(x) { return x.id === contrattoId; });
    var rels = appData.contratto_conduttori.filter(function(r) { return r.contratto_id === contrattoId; });
    if (rels.length === 0 && c && c.conduttore_id) {
        var p = getPersona(c.conduttore_id);
        return p ? [{ persona: p, data_decorrenza: c.data_decorrenza, data_chiusura: c.data_chiusura }] : [];
    }
    return rels.map(function(r) {
        return { persona: getPersona(r.persona_id), data_decorrenza: r.data_decorrenza, data_chiusura: r.data_chiusura };
    }).filter(function(x) { return x.persona; });
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
// Versione con il COGNOME prima del NOME (usata nel PDF riepilogo contratto,
// in coerenza con l'etichetta "Cognome / Nome" dei campi)
function getPersonaLabelCognomeNome(p) {
    if (!p) return 'N/A';
    if (p.ragione_sociale && !p.nome && !p.cognome) return p.ragione_sociale;
    var label = (p.cognome || '') + ' ' + (p.nome || '');
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
// Etichetta di tassazione di un canone (usata nel dettaglio e nel PDF riepilogo)
function getCanoneTaxLabel(ca) {
    if (!ca) return '-';
    if (ca.tassazione_cedolare_secca) return 'Cedolare Secca';
    if (parseFloat(ca.percentuale) > 0 || parseFloat(ca.valore_assoluto) > 0) {
        return 'Imposta di Registro ' + (parseFloat(ca.percentuale) || 0) + '%' + (parseFloat(ca.valore_assoluto) > 0 ? ' + ' + formatCurrency(ca.valore_assoluto) : '');
    }
    return 'Ordinaria';
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

// --- Helper: aggiunge anni a una data 'YYYY-MM-DD' (senza problemi di fuso) ---
// Il 29 febbraio viene riportato al 28/02 negli anni non bisestili.
function addYearsToDateStr(dateStr, years) {
    if (!dateStr) return null;
    var d = new Date(dateStr + 'T00:00:00');
    d.setFullYear(d.getFullYear() + years);
    return toLocalDateStr(d);
}

// --- Crea le scadenze di pagamento per ogni canone del contratto ---
// Le scadenze sono ancorate alle RICORRENZE ANNUALI della decorrenza del
// contratto (stesso giorno/mese, di anno in anno), NON agli inizi delle
// annualità dei singoli canoni: così un canone che inizia a metà anno non
// spezza il ritmo annuale dei versamenti. La decorrenza della scadenza è
// l'anniversario della decorrenza del contratto; il trigger del DB calcola
// prossima_scadenza (+1 anno +30 gg). Esempio: contratto dal 18/09/21 con
// canoni 18/09/21->17/06/26 (€4000) e 18/06/26->17/09/27 (€4500): le
// scadenze restano ancorate ai 18/09 di ogni anno (18/09/21 ... 18/09/25 a
// €4000 e 18/09/26 a €4500, pagamenti 18/10/22 ... 18/10/26 e 18/10/27);
// la vecchia logica a catena avrebbe invece ripartito il ritmo dall'inizio
// del secondo canone generando 18/06/26 e 18/06/27 (pagamenti 18/07/27 e
// 18/07/28). Un canone a cedolare secca non genera scadenze: il canone che
// copre l'anniversario è quello che determina il versamento, e se è a
// cedolare non c'è imposta da versare (la DATA di pagamento può invece
// cadere in un periodo a cedolare successivo: l'imposta dell'annualità va
// comunque versata entro +1 anno +30 gg). Non duplica le scadenze già
// presenti (controllo sulla data_decorrenza dell'anniversario) e RIPARA
// quelle sbagliate: le scadenze in attesa che non corrispondono a un
// anniversario del contratto vengono eliminate e rigenerate (quelle
// archiviate non vengono toccate).
async function syncScadenzePerCanoni(contrattoId, canoni, decorrenzaFallback) {
    if (!canoni || canoni.length === 0) {
        // Nessun canone definito: scadenza unica con la decorrenza del contratto
        if (!decorrenzaFallback) return;
        var haGia = appData.scadenze.some(function(s) { return s.contratto_id === contrattoId; });
        if (haGia) return;
        var { data: insLegacy, error: errLegacy } = await db.from('scadenze').insert({
            contratto_id: contrattoId,
            data_decorrenza: decorrenzaFallback,
            importo: 0,
            stato: 'in-attesa'
        }).select();
        if (errLegacy) {
            console.error('Errore creazione scadenza:', errLegacy);
            showToast('Errore nella creazione della scadenza', 'error');
        } else if (insLegacy) {
            appData.scadenze = appData.scadenze.concat(insLegacy);
        }
        return;
    }
    // Termine oltre il quale non si generano scadenze: la chiusura del
    // contratto se presente, altrimenti la sua scadenza (o il rinnovo).
    var cLimite = getContrattoById(contrattoId);
    var limite = cLimite ? (cLimite.data_chiusura || getContrattoScadenzaEffettiva(cLimite)) : null;
    // Ancoraggio: la decorrenza del contratto è il giorno/mese di cui si
    // seguono le ricorrenze annuali (fallback: il primo canone).
    var ancora = (cLimite && cLimite.data_decorrenza) || canoni[0].data_inizio;

    // --- Autoriparazione: elimina le scadenze IN ATTESA sbagliate ---
    // Sono sbagliate le scadenze la cui decorrenza NON è un anniversario
    // dell'ancoraggio (es. 18/06/26 e 18/06/27 generate dalla vecchia logica
    // a catena che ripartiva dall'inizio di un canone a metà anno). Le
    // archiviate (scadute/completate) restano: rappresentano versamenti già
    // riconosciuti dall'utente nelle liste.
    // Una decorrenza è un anniversario dell'ancoraggio se cade nello stesso
    // giorno/mese di un anno successivo (il 29/02 viene riportato al 28/02
    // negli anni non bisestili, come in addYearsToDateStr). Nessun elenco
    // predefinito di anni: contratti più lunghi di 12 anni (es. 4+4+4) hanno
    // anniversari oltre il +12° anno e non vanno considerati sbagliati.
    var isAnniversario = function(deco) {
        if (!ancora || !deco || deco < ancora) return false;
        var dAncora = new Date(ancora + 'T00:00:00');
        var dDeco = new Date(deco + 'T00:00:00');
        return addYearsToDateStr(ancora, dDeco.getFullYear() - dAncora.getFullYear()) === deco;
    };
    var daRiparare = appData.scadenze.filter(function(s) {
        return s.contratto_id === contrattoId && s.stato === 'in-attesa' && !isAnniversario(s.data_decorrenza);
    });
    for (var r = 0; r < daRiparare.length; r++) {
        var { error: errDel } = await db.from('scadenze').delete().eq('id', daRiparare[r].id);
        if (!errDel) {
            appData.scadenze = appData.scadenze.filter(function(x) { return x.id !== daRiparare[r].id; });
        }
    }

    var esistenti = appData.scadenze.filter(function(s) { return s.contratto_id === contrattoId; });
    var daInserire = [];
    // Una scadenza per ogni RICORRENZA ANNUALE della decorrenza del contratto
    // (ancora, +1 anno, +2 anni, ...) la cui DATA DI PAGAMENTO cade ancora
    // entro il termine del contratto (chiusura se presente, altrimenti
    // scadenza o scadenza del rinnovo): il pagamento avviene all'anniversario
    // successivo + 30 giorni (prossima_scadenza, calcolata dal trigger del
    // DB) e deve essere <= limite. Così anche i contratti più lunghi di 12
    // anni (es. 4+4+4) ricevono tutte le scadenze fino al termine, senza
    // generare pagamenti oltre la fine del contratto. Senza un termine ci si
    // ferma comunque entro un orizzonte di 12 anni per non creare scadenze
    // illimitate nel futuro. Il canone che copre il giorno dell'anniversario
    // ne determina l'importo e se è a cedolare secca la scadenza non viene
    // generata (non ci sono imposte da versare). Le scadenze già presenti
    // (archiviate o create in precedenza) non vengono duplicate.
    var orizzonteMax = 12;
    if (limite && ancora) {
        var annoAncora = parseInt(ancora.slice(0, 4), 10);
        var annoLimite = parseInt(limite.slice(0, 4), 10);
        if (!isNaN(annoAncora) && !isNaN(annoLimite)) {
            orizzonteMax = Math.max(orizzonteMax, annoLimite - annoAncora + 1);
        }
    }
    for (var annoIdx = 0; annoIdx <= orizzonteMax; annoIdx++) {
        var anniversario = annoIdx === 0 ? ancora : addYearsToDateStr(ancora, annoIdx);
        if (!anniversario) break;
        // Data di pagamento dell'annualità (stessa formula del trigger del DB)
        var dataPagamento = addDaysToDateStr(addYearsToDateStr(anniversario, 1), 30);
        if (limite && dataPagamento > limite) break;  // pagamento oltre la fine del contratto
        // Canone che copre il giorno dell'anniversario: il suo importo è
        // quello del versamento. Nessun canone = nessun versamento; canone
        // a cedolare secca = nessun versamento da effettuare.
        var canoneAnn = getCanoneCheCopre(contrattoId, anniversario);
        if (!canoneAnn || canoneAnn.tassazione_cedolare_secca) continue;
        var coperto = esistenti.some(function(s) {
            return s.data_decorrenza === anniversario;
        });
        if (!coperto) {
            daInserire.push({
                contratto_id: contrattoId,
                data_decorrenza: anniversario,
                importo: canoneAnn.importo || 0,
                stato: 'in-attesa'
            });
        }
    }
    if (daInserire.length === 0) return;
    var { data: insScad, error: errScad } = await db.from('scadenze').insert(daInserire).select();
    if (errScad) {
        console.error('Errore creazione scadenze:', errScad);
        showToast('Errore nella creazione delle scadenze', 'error');
    } else if (insScad) {
        appData.scadenze = appData.scadenze.concat(insScad);
    }
}

// --- Ricalcolo delle scadenze dopo una modifica al contratto ---
// Se l'utente modifica qualcosa che intacca le scadenze (decorrenza, scadenza,
// rinnovo, chiusura, canoni, tassazione), le scadenze in attesa che non sono
// più valide vengono eliminate e gli importi disallineati vengono corretti:
// - canone del periodo a cedolare secca: nessun versamento da effettuare;
// - data della scadenza oltre il termine del contratto (chiusura se presente,
//   altrimenti scadenza o scadenza del rinnovo): non ci sono più versamenti;
// - importo diverso da quello del canone che copre la decorrenza: allineato.
// Le scadenze completate NON vengono toccate (rappresentano versamenti
// effettivamente effettuati). Le scadenze con decorrenza fuori dal ritmo
// annuale del contratto vengono riparate da syncScadenzePerCanoni, che va
// chiamata DOPO questa funzione.
async function ricalcolaScadenzeContratto(contrattoId) {
    var c = getContrattoById(contrattoId);
    if (!c) return;
    var limite = c.data_chiusura || getContrattoScadenzaEffettiva(c);
    var scadenzeContratto = appData.scadenze.filter(function(s) { return s.contratto_id === contrattoId; });
    for (var i = 0; i < scadenzeContratto.length; i++) {
        var s = scadenzeContratto[i];
        if (isScadenzaArchiviata(s)) continue;
        // Canone del periodo della scadenza (nessun fallback: senza un canone
        // che copre la decorrenza l'importo resta invariato).
        var canone = getCanoneCheCopre(contrattoId, s.data_decorrenza);
        var importoOk = !canone || parseFloat(s.importo) === parseFloat(canone.importo || 0);
        var daEliminare = (canone && canone.tassazione_cedolare_secca) ||
                          (limite && s.prossima_scadenza && s.prossima_scadenza > limite) ||
                          !importoOk;
        if (daEliminare) {
            var { error } = await db.from('scadenze').delete().eq('id', s.id);
            if (error) {
                console.error('Errore eliminazione scadenza non valida:', error);
            } else {
                appData.scadenze = appData.scadenze.filter(function(x) { return x.id !== s.id; });
            }
        }
    }
}

// --- Auto-archiviazione scadenze passate ---
// Le scadenze con prossima_scadenza prima della data odierna vengono archiviate
// automaticamente con stato 'scaduta' (NON 'completata': non e' stato effettuato
// alcun versamento), così la sezione Scadenze mostra solo le scadenze da oggi
// in poi (es. contratti inseriti con decorrenza nel passato). Con il filtro
// "Archiviate" compaiono come "Scaduta" e possono essere ripristinate tra le
// scadenze da pagare.
async function autoCompleteScadenzePassate() {
    var oggi = toLocalDateStr(new Date());
    var daScadere = appData.scadenze.filter(function(s) {
        return s.stato === 'in-attesa' && s.prossima_scadenza && s.prossima_scadenza < oggi;
    });
    if (daScadere.length === 0) return;
    for (var i = 0; i < daScadere.length; i++) {
        var s = daScadere[i];
        var { error } = await db.from('scadenze').update({
            stato: 'scaduta',
            data_completamento: null
        }).eq('id', s.id);
        if (!error) {
            s.stato = 'scaduta';
            s.data_completamento = null;
        }
    }
    renderNotifications();
}

// --- Migrazione one-time dei vecchi record auto-completati ---
// La vecchia logica archiviava le scadenze passate come 'completata' con
// data_completamento uguale alla prossima_scadenza (l'utente non puo' aver
// inserito una data futura al completamento, quindi data_completamento ==
// prossima_scadenza significa archiviazione automatica). Questi record
// vengono convertiti in 'scaduta' una sola volta (flag in localStorage).
async function migrateScadenzeAutoCompletate() {
    if (localStorage.getItem('migrate_scadute_v1') === '1') return;
    var daMigrare = appData.scadenze.filter(function(s) {
        return isScadenzaCompletata(s) && s.data_completamento && s.prossima_scadenza &&
               s.data_completamento === s.prossima_scadenza;
    });
    for (var i = 0; i < daMigrare.length; i++) {
        var s = daMigrare[i];
        var { error } = await db.from('scadenze').update({
            stato: 'scaduta',
            data_completamento: null
        }).eq('id', s.id);
        if (!error) {
            s.stato = 'scaduta';
            s.data_completamento = null;
        }
    }
    localStorage.setItem('migrate_scadute_v1', '1');
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
// --- Copertura del periodo del contratto da parte dei canoni ---
// Restituisce un messaggio di avviso se i canoni non coprono l'intero
// periodo del contratto (dalla decorrenza alla scadenza): manca il primo
// canone all'inizio, l'ultimo non arriva alla scadenza, oppure c'è un buco
// tra due canoni consecutivi. Restituisce null se la copertura è completa.
// Se è stata inserita la data di scadenza rinnovo, la copertura richiesta
// arriva fino a quella data (stessa logica di getContrattoScadenzaEffettiva).
function getCanoniCoverageWarning() {
    var deco = document.getElementById('cf_decorrenza').value;
    var scad = document.getElementById('cf_scadenza').value;
    var scadRinnovoEl = document.getElementById('cf_scadenza_rinnovo');
    var scadRinnovo = scadRinnovoEl ? scadRinnovoEl.value : '';
    var scadEffettiva = scadRinnovo || scad;
    if (!deco || !scadEffettiva) return null; // senza le date del contratto non c'è verifica

    var rows = document.querySelectorAll('#canoniRowsContainer .canone-row');
    var canoni = [];
    rows.forEach(function(row) {
        var inizio = row.querySelector('.canone-data-inizio').value;
        var fine = row.querySelector('.canone-data-fine').value;
        if (inizio && fine) canoni.push({ inizio: inizio, fine: fine });
    });
    canoni.sort(function(a, b) { return a.inizio.localeCompare(b.inizio); });

    if (canoni.length === 0) {
        return 'Nessun canone inserito: aggiungi i canoni per coprire l\'intero periodo del contratto.';
    }

    if (canoni[0].inizio > deco) {
        return 'Il primo canone inizia il ' + formatDate(canoni[0].inizio) + ', ma la decorrenza del contratto è ' + formatDate(deco) + ': manca la copertura iniziale.';
    }
    var last = canoni[canoni.length - 1];
    if (last.fine < scadEffettiva) {
        var refLabel = scadRinnovo ? 'la scadenza rinnovo ' : 'la scadenza ';
        return 'L\'ultimo canone termina il ' + formatDate(last.fine) + ', ma ' + refLabel + 'del contratto è ' + formatDate(scadEffettiva) + ': manca la copertura finale.';
    }
    for (var i = 1; i < canoni.length; i++) {
        var attesa = addDaysToDateStr(canoni[i - 1].fine, 1);
        if (canoni[i].inizio > attesa) {
            return 'Manca la copertura tra il ' + formatDate(canoni[i - 1].fine) + ' e il ' + formatDate(canoni[i].inizio) + ': i canoni devono essere consecutivi.';
        }
    }
    return null;
}

// Mostra/nasconde il banner di avviso sotto la sezione Canoni Annuali
function updateCanoniCoverageWarning() {
    var el = document.getElementById('canoniCoverageWarning');
    if (!el) return;
    var msg = getCanoniCoverageWarning();
    if (msg) {
        el.textContent = msg;
        el.style.display = '';
    } else {
        el.textContent = '';
        el.style.display = 'none';
    }
}

// Rimuove una riga canone e aggiorna l'avviso di copertura
function removeCanoneRow(btn) {
    var row = btn.closest('.canone-row');
    if (row) row.remove();
    updateCanoniCoverageWarning();
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
            <button type="button" class="btn btn-sm btn-outline canone-remove" onclick="removeCanoneRow(this)"><i class="fas fa-trash"></i></button>
        </div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Importo (EUR) <span class="req">*</span></label><input type="text" inputmode="decimal" class="canone-importo" value="${formatImportoInput(parseImporto(importo))}" required></div>
        <div class="form-group" style="flex:1;min-width:130px;margin:0"><label>Data Inizio <span class="req">*</span></label><input type="date" class="canone-data-inizio" value="${dataInizio || ''}" required></div>
        <div class="form-group" style="flex:1;min-width:130px;margin:0"><label>Data Fine <span class="req">*</span></label><input type="date" class="canone-data-fine" value="${dataFine || ''}" required></div>
        <div class="form-group" style="flex:1;min-width:100%;margin:0"><label>Cedolare Secca</label>
            <div class="radio-group" style="display:flex;gap:16px;margin-top:6px">
                <label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" class="canone-cedolare-si" name="canone_cedolare_${canoneRowCounter}" value="true"${cedChecked} onchange="toggleCanoneCedolare(this)"> Sì</label>
                <label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" class="canone-cedolare-no" name="canone_cedolare_${canoneRowCounter}" value="false"${cedNoChecked} onchange="toggleCanoneCedolare(this)"> No</label>
            </div>
        </div>
        <div class="form-group" style="flex:1;min-width:130px;margin:0"><label>Percentuale (%) <span class="req">*</span></label><input type="number" class="canone-percentuale" value="${percentuale || ''}" min="0" max="100" step="0.01" required></div>
        <div class="form-group" style="flex:1;min-width:130px;margin:0"><label>Valore Assoluto (EUR) <span class="req">*</span></label><input type="text" inputmode="decimal" class="canone-valore-assoluto" value="${formatImportoInput(parseImporto(valoreAssoluto))}" required></div>
    `;
    container.appendChild(row);
    // Applica il toggle iniziale in base alla cedolare secca scelta
    toggleCanoneCedolare(row.querySelector('.canone-cedolare-si'));

    // Inserendo la percentuale, il valore assoluto viene calcolato in automatico
    // (percentuale applicata al canone annuo della riga). Anche la modifica
    // dell'importo ricalcola il valore se la percentuale è già compilata.
    var pctInput = row.querySelector('.canone-percentuale');
    var importoInput = row.querySelector('.canone-importo');
    if (pctInput) {
        pctInput.addEventListener('input', function() { syncCanoneValoreAssoluto(pctInput); });
    }
    if (importoInput) {
        // Formattazione live con separatore delle migliaia (es. 1500 -> 1.500)
        importoInput.addEventListener('input', function() {
            formatImportoOnInput(importoInput);
            if (pctInput && parseFloat(pctInput.value) > 0) syncCanoneValoreAssoluto(pctInput);
        });
        // All'uscita dal campo l'importo viene formattato con ,00
        importoInput.addEventListener('blur', function() { formatImportoOnBlur(importoInput); });
    }
    var valAssBlur = row.querySelector('.canone-valore-assoluto');
    if (valAssBlur) {
        valAssBlur.addEventListener('input', function() { formatImportoOnInput(valAssBlur); });
        valAssBlur.addEventListener('blur', function() { formatImportoOnBlur(valAssBlur); });
    }
    // L'avviso di copertura si aggiorna quando cambiano le date del canone
    var dataInizioEl = row.querySelector('.canone-data-inizio');
    var dataFineEl = row.querySelector('.canone-data-fine');
    if (dataInizioEl) dataInizioEl.addEventListener('input', updateCanoniCoverageWarning);
    if (dataFineEl) dataFineEl.addEventListener('input', updateCanoniCoverageWarning);
    updateCanoniCoverageWarning();
}

// Quando si inserisce la percentuale di un canone, il valore assoluto
// (imposta di registro) viene ricalcolato in automatico sul canone annuo.
function syncCanoneValoreAssoluto(pctInput) {
    if (!pctInput) return;
    var row = pctInput.closest('.canone-row');
    if (!row) return;
    var importoEl = row.querySelector('.canone-importo');
    var valAssEl = row.querySelector('.canone-valore-assoluto');
    if (!importoEl || !valAssEl) return;
    var pct = parseFloat(pctInput.value);
    var importo = parseImporto(importoEl.value);
    if (isNaN(pct) || pct <= 0 || importo <= 0) return;
    valAssEl.value = formatImportoInput(Math.round((pct / 100) * importo * 100) / 100);
}

// --- Importi: parsing e formattazione italiana (virgola decimale, punto migliaia) ---
function parseImporto(str) {
    if (str == null) return 0;
    if (typeof str === 'number') return str;
    var s = String(str).trim();
    if (s === '') return 0;
    if (s.indexOf(',') !== -1) {
        // Virgola decimale: i punti sono separatori delle migliaia
        s = s.replace(/\./g, '').replace(',', '.');
    } else {
        // Senza virgola un punto può essere separatore migliaia (1.500) oppure
        // decimale (2.5, es. campo percentuale): lo rimuovo solo se seguito
        // esattamente da 3 cifre finali.
        s = s.replace(/\.(?=\d{3}(?!\d))/g, '');
    }
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}
function formatImportoInput(n, keepZero) {
    if (n == null || isNaN(n)) return '';
    if (n === 0 && !keepZero) return '';
    var s = n.toFixed(2);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
}
function formatImportoOnBlur(el) {
    if (!el) return;
    if (el.value.trim() === '') return;
    el.value = formatImportoInput(parseImporto(el.value), true);
}

// Formattazione live mentre si digita: inserisce i punti come separatori
// delle migliaia (es. 1500 -> 1.500, 1500000 -> 1.500.000) mantenendo la
// posizione del cursore. La virgola resta il separatore decimale (max 2 cifre).
function formatImportoOnInput(el) {
    if (!el) return;
    var val = el.value;
    var caret = el.selectionStart;

    // Cifre presenti prima del cursore nel valore originale
    var digitsBefore = 0;
    for (var i = 0; i < caret && i < val.length; i++) {
        if (/\d/.test(val[i])) digitsBefore++;
    }
    var cursoreDopoVirgola = caret > 0 && val[caret - 1] === ',';

    // Normalizza: solo cifre e una sola virgola
    var raw = val.replace(/[^\d,]/g, '');
    var commaIdx = raw.indexOf(',');
    var intRaw = commaIdx === -1 ? raw : raw.slice(0, commaIdx);
    var decRaw = commaIdx === -1 ? '' : raw.slice(commaIdx + 1).replace(/[^\d]/g, '').slice(0, 2);

    var intFmt = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    var formatted = commaIdx === -1 ? intFmt : intFmt + ',' + decRaw;
    el.value = formatted;

    // Ripristina il cursore dopo lo stesso numero di cifre
    var newCaret = 0, seen = 0;
    while (newCaret < formatted.length && seen < digitsBefore) {
        if (/\d/.test(formatted[newCaret])) seen++;
        newCaret++;
    }
    if (digitsBefore >= intRaw.length + decRaw.length) {
        newCaret = formatted.length;
    } else if (cursoreDopoVirgola) {
        newCaret = formatted.indexOf(',') + 1;
    }
    try { el.setSelectionRange(newCaret, newCaret); } catch (e) {}
}

// --- CF Autocomplete ---
function setupCfAutocomplete(inputEl, rowEl) {
    // Disabilita i suggerimenti nativi del browser (es. Firefox) che si
    // sovrappongono a quelli del programma.
    inputEl.setAttribute('autocomplete', 'off');
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
        // Suggerimenti in ordine alfabetico per il NOME mostrato sotto il CF
        // (cognome + nome per le persone fisiche, ragione sociale per le aziende)
        matches.sort(function(a, b) {
            var la = a.nome ? ((a.cognome || '') + ' ' + (a.nome || '')) : (a.ragione_sociale || '');
            var lb = b.nome ? ((b.cognome || '') + ' ' + (b.nome || '')) : (b.ragione_sociale || '');
            return la.localeCompare(lb, 'it', { sensitivity: 'base' });
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

// --- Ordinamento indirizzi ---
// I suggerimenti degli indirizzi vengono ordinati in base al nome della
// strada, ignorando il tipo iniziale (Via, Piazza, Corso, ...): così
// "Via Torino 12" e "Piazza Maggiore 5" compaiono ordinati per "Torino"
// e "Maggiore".
var STREET_PREFIX_RE = /^(via|viale|piazza|piazzale|corso|vicolo|vico|largo|borgo|strada|contrada|salita|calle|galleria|piazzetta|rotonda|lungomare|lungolago)\s+/i;
function indirizzoSortLabel(s) {
    return String(s == null ? '' : s).replace(STREET_PREFIX_RE, '').trim();
}

// --- Immobile Suggestions nel form contratto (stessa logica dei campi persona) ---
// Digitando in Indirizzo/Città/Foglio/Particella/Sub compaiono i valori degli
// immobili già presenti; la scelta compila l'intero blocco immobile.
function setupImmobileSuggestions(inputEl, fieldKey) {
    inputEl.parentNode.style.position = 'relative';
    setupFilterAutocomplete(inputEl, function() {
        var seen = {};
        var out = [];
        appData.immobili.forEach(function(imm) {
            var v = imm[fieldKey];
            if (v == null || String(v).trim() === '') return;
            var label = String(v).trim();
            if (seen[label]) return;
            seen[label] = true;
            var cad = [imm.foglio ? ('Fg.' + imm.foglio) : '', imm.particella ? ('Part.' + imm.particella) : '', imm.sub ? ('Sub ' + imm.sub) : ''].filter(Boolean).join(' - ');
            var ind = imm.indirizzo ? imm.indirizzo : '';
            var cit = imm.citta ? imm.citta : '';
            var sub = ind + (ind && cit ? ', ' : '') + cit;
            if (sub && cad) sub += ' · ' + cad;
            if (!sub) sub = cad;
            out.push({ label: label, sub: sub, data: imm });
        });
        return out;
    }, function(imm) {
        document.getElementById('cf_imm_indirizzo').value = imm.indirizzo || '';
        document.getElementById('cf_imm_citta').value = imm.citta || '';
        document.getElementById('cf_imm_foglio').value = imm.foglio || '';
        document.getElementById('cf_imm_particella').value = imm.particella || '';
        document.getElementById('cf_imm_sub').value = imm.sub || '';
    }, fieldKey === 'indirizzo' ? { sortLabel: indirizzoSortLabel } : undefined);
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
        // La data della riga è considerata scelta dall'utente solo se diversa
        // da quella del contratto: se coincide (o manca) è stata compilata in
        // automatico e continua a seguire il contratto quando questo cambia.
        if (rowDeco && rowDeco !== (document.getElementById('cf_decorrenza') || {}).value) decoUserSet = ' data-user-set="1"';
        if (rowChius && rowChius !== (document.getElementById('cf_chiusura') || {}).value) chiusUserSet = ' data-user-set="1"';
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
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Codice Fiscale <span class="req">*</span></label><input type="text" class="loc-cf" value="${p.codice_fiscale || ''}" ${cfReadonly} required></div>
        <div class="form-group" style="flex:1;min-width:140px;margin:0"><label>Ragione Sociale <span class="req">*</span></label><input type="text" class="loc-rs" value="${p.ragione_sociale || ''}" required></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Cognome <span class="req">*</span></label><input type="text" class="loc-cognome" value="${p.cognome || ''}" required></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Nome <span class="req">*</span></label><input type="text" class="loc-nome" value="${p.nome || ''}" required></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <div class="form-group" style="flex:1;min-width:150px;margin:0"><label>Data Decorrenza</label><input type="date" class="loc-data-decorrenza" value="${rowDeco}"${decoUserSet}></div>
        <div class="form-group" style="flex:1;min-width:150px;margin:0"><label>Data Chiusura</label><input type="date" class="loc-data-chiusura" value="${rowChius}"${chiusUserSet}></div>
        </div>
    `;
    container.appendChild(row);
    // Campi di testo della riga inclusi nel toggle maiuscolo/minuscolo
    setupContrattoCaseFields(row);
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
        // La data della riga è considerata scelta dall'utente solo se diversa
        // da quella del contratto: se coincide (o manca) è stata compilata in
        // automatico e continua a seguire il contratto quando questo cambia.
        if (rowDeco && rowDeco !== (document.getElementById('cf_decorrenza') || {}).value) decoUserSet = ' data-user-set="1"';
        if (rowChius && rowChius !== (document.getElementById('cf_chiusura') || {}).value) chiusUserSet = ' data-user-set="1"';
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
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Codice Fiscale <span class="req">*</span></label><input type="text" class="cond-cf" value="${p.codice_fiscale || ''}" ${cfReadonly} required></div>
        <div class="form-group" style="flex:1;min-width:140px;margin:0"><label>Ragione Sociale <span class="req">*</span></label><input type="text" class="cond-rs" value="${p.ragione_sociale || ''}" required></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Cognome <span class="req">*</span></label><input type="text" class="cond-cognome" value="${p.cognome || ''}" required></div>
        <div class="form-group" style="flex:1;min-width:120px;margin:0"><label>Nome <span class="req">*</span></label><input type="text" class="cond-nome" value="${p.nome || ''}" required></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <div class="form-group" style="flex:1;min-width:150px;margin:0"><label>Data Decorrenza</label><input type="date" class="cond-data-decorrenza" value="${rowDeco}"${decoUserSet}></div>
        <div class="form-group" style="flex:1;min-width:150px;margin:0"><label>Data Chiusura</label><input type="date" class="cond-data-chiusura" value="${rowChius}"${chiusUserSet}></div>
        </div>
    `;
    container.appendChild(row);
    // Campi di testo della riga inclusi nel toggle maiuscolo/minuscolo
    setupContrattoCaseFields(row);
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

// --- Toggle globale maiuscolo/minuscolo per il form contratto ---
// Un solo pulsante accanto al titolo del modale: premuto scrive tutti i campi
// di testo del contratto in MAIUSCOLO, premuto di nuovo in minuscolo.
// Preferenza salvata: la modalità maiuscolo/minuscolo scelta con il pulsante
// viene ricordata tra un'apertura del form e l'altra (e tra le sessioni).
var contrattoCaseMode = 'lower';
try {
    var savedCaseMode = localStorage.getItem('contrattoCaseMode');
    if (savedCaseMode === 'upper' || savedCaseMode === 'lower') contrattoCaseMode = savedCaseMode;
} catch (e) {}

function setupContrattoCaseFields(container) {
    if (!container) return;
    container.querySelectorAll('input[type="text"], textarea').forEach(function(input) {
        if (input.dataset.caseFieldDone) return;
        input.dataset.caseFieldDone = '1';
        input.classList.add('case-field');
    });
}

function updateCaseToggleBtn() {
    var btn = document.getElementById('caseToggleBtn');
    if (!btn) return;
    var label = btn.querySelector('.case-toggle-label') || btn;
    label.textContent = contrattoCaseMode === 'upper' ? 'A' : 'a';
    btn.classList.toggle('active', contrattoCaseMode === 'upper');
    btn.title = contrattoCaseMode === 'upper' ? 'Passa a minuscolo' : 'Passa a maiuscolo';
}

function applyContrattoCase() {
    document.querySelectorAll('#modalBody .case-field').forEach(function(input) {
        input.value = contrattoCaseMode === 'upper' ? input.value.toUpperCase() : input.value.toLowerCase();
    });
}

function toggleContrattoCase() {
    contrattoCaseMode = contrattoCaseMode === 'upper' ? 'lower' : 'upper';
    try { localStorage.setItem('contrattoCaseMode', contrattoCaseMode); } catch (e) {}
    updateCaseToggleBtn();
    applyContrattoCase();
}

// Collega il pulsante accanto al titolo del modale
var caseToggleBtnEl = document.getElementById('caseToggleBtn');
if (caseToggleBtnEl) {
    caseToggleBtnEl.addEventListener('click', toggleContrattoCase);
}

// Applica maiuscolo/minuscolo in tempo reale mentre si digita
document.addEventListener('input', function(e) {
    var t = e.target;
    if (!t || !t.classList || !t.classList.contains('case-field')) return;
    if (contrattoCaseMode !== 'upper' && contrattoCaseMode !== 'lower') return;
    var start = t.selectionStart, end = t.selectionEnd;
    var nv = contrattoCaseMode === 'upper' ? t.value.toUpperCase() : t.value.toLowerCase();
    if (nv !== t.value) {
        t.value = nv;
        try { t.setSelectionRange(start, end); } catch (err) {}
    }
});

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

// --- Helper: aggiunge giorni a una data 'YYYY-MM-DD' (senza problemi di fuso) ---
function addDaysToDateStr(dateStr, days) {
    if (!dateStr) return null;
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return toLocalDateStr(d);
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

        // Backfill: per ogni contratto crea la scadenza di ogni canone senza
        // cedolare secca che manca (es. contratti creati prima di questa
        // logica, come quelli con più canoni che mostravano una sola scadenza).
        for (var ci = 0; ci < appData.contratti.length; ci++) {
            var c = appData.contratti[ci];
            await syncScadenzePerCanoni(c.id, getCanoniByContratto(c.id), c.data_decorrenza);
        }
        // Migrazione one-time: i vecchi record auto-archiviati come
        // 'completata' diventano 'scaduta'.
        await migrateScadenzeAutoCompletate();
        // Le scadenze con data nel passato vengono archiviate automaticamente
        // come scadute: la sezione mostra solo le scadenze da oggi in poi.
        await autoCompleteScadenzePassate();
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
        case 'contratti': await renderContratti(); break;
        case 'scadenze': await renderScadenze(); break;

    }
    // Le notifiche vengono ricalcolate a ogni navigazione/aggiornamento:
    // dopo una modifica al contratto (es. nuova data di scadenza) il badge
    // del campanello si aggiorna subito, senza dover ricaricare la pagina.
    renderNotifications();
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
        case 'pdf-contratto': generateContrattoPdf(id); break;

        case 'new-inquilino': openModal('newInquilino'); break;
        case 'complete-scadenza': openModal('completaScadenza', id); break;
        case 'generate-f24': generateF24Pdf(id); break;
        case 'restore-scadenza': openModal('ripristinaScadenzaConfirm', id); break;
        case 'confirm-restore-scadenza': ripristinaScadenza(id); break;

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
function setupFilterAutocomplete(inputEl, getValues, onPick, opts) {
    // Disabilita i suggerimenti nativi del browser (es. Firefox) che si
    // sovrappongono a quelli del programma.
    inputEl.setAttribute('autocomplete', 'off');
    // Ancoraggio corretto della lista suggerimenti sotto il campo
    inputEl.parentNode.style.position = 'relative';
    opts = opts || {};
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
            // Dedupe by the displayed value (o da una chiave personalizzata
            // come l'id del record) così ogni anagrafica/immobile diverso
            // compare anche se ha lo stesso testo di un altro.
            if (label.length > 0 && label.toUpperCase().indexOf(val) === 0) {
                var key = opts.dedupeKey ? opts.dedupeKey(item) : label.toUpperCase();
                if (!seen[key]) {
                    seen[key] = true;
                    matches.push(item);
                }
            }
        });
        // Suggerimenti in ordine alfabetico (ignora maiuscole e accenti).
        // Per gli indirizzi opts.sortLabel rimuove il tipo di strada iniziale
        // (Via, Piazza, Corso, ...) così l'ordine segue il nome della strada.
        matches.sort(function(a, b) {
            var la = opts.sortLabel ? opts.sortLabel(toLabel(a)) : toLabel(a);
            var lb = opts.sortLabel ? opts.sortLabel(toLabel(b)) : toLabel(b);
            return la.localeCompare(lb, 'it', { sensitivity: 'base' });
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
    // La finestrella si apre sempre dall'inizio (scroll in alto)
    var fm = overlay.querySelector('.filter-modal');
    if (fm) fm.scrollTop = 0;
    var fmb = overlay.querySelector('.filter-modal-body');
    if (fmb) fmb.scrollTop = 0;
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

    // Suggerimenti "a blocco" come nella sezione Immobile del form contratto:
    // digitando in un campo compaiono TUTTE le anagrafiche/immobili che
    // corrispondono a quel campo; selezionandone una si compilano tutti i
    // campi della sezione.

    // --- Persone (Locatore / Conduttore) ---
    // Ogni suggerimento è una persona: etichetta = valore del campo digitato,
    // sottotitolo = nome completo + codice fiscale.
    function personeSugg(fieldKey) {
        return persone.map(function(p) {
            var v = p[fieldKey];
            if (v == null || String(v).trim() === '') return null;
            var label = String(v).trim();
            var parts = [];
            var full = getPersonaLabelShort(p);
            if (full && full !== label) parts.push(full);
            if (p.codice_fiscale) parts.push('CF: ' + p.codice_fiscale);
            return { label: label, sub: parts.join(' · '), data: p };
        }).filter(Boolean);
    }
    function setupPersonFilter(inputId, fieldKey, onPick) {
        setupFilterAutocomplete(document.getElementById(inputId), function() { return personeSugg(fieldKey); }, onPick, {
            dedupeKey: function(item) { return item.data.id; },
            // Ordina per il nome completo mostrato sotto il valore del campo
            // (es. digitando nel Cognome, per "Maria Rossi" e "Luca Rossi")
            sortLabel: function(item) { return getPersonaLabelShort(item.data); }
        });
    }
    function fillLocatoreFilter(p) {
        document.getElementById('ffLocNome').value = p.nome || '';
        document.getElementById('ffLocCognome').value = p.cognome || '';
        document.getElementById('ffLocCF').value = p.codice_fiscale || '';
        document.getElementById('ffLocRS').value = p.ragione_sociale || '';
    }
    function fillConduttoreFilter(p) {
        document.getElementById('ffConNome').value = p.nome || '';
        document.getElementById('ffConCognome').value = p.cognome || '';
        document.getElementById('ffConCF').value = p.codice_fiscale || '';
        document.getElementById('ffConRS').value = p.ragione_sociale || '';
    }

    // Locatore
    setupPersonFilter('ffLocNome', 'nome', fillLocatoreFilter);
    setupPersonFilter('ffLocCognome', 'cognome', fillLocatoreFilter);
    setupPersonFilter('ffLocCF', 'codice_fiscale', fillLocatoreFilter);
    setupPersonFilter('ffLocRS', 'ragione_sociale', fillLocatoreFilter);

    // Conduttore
    setupPersonFilter('ffConNome', 'nome', fillConduttoreFilter);
    setupPersonFilter('ffConCognome', 'cognome', fillConduttoreFilter);
    setupPersonFilter('ffConCF', 'codice_fiscale', fillConduttoreFilter);
    setupPersonFilter('ffConRS', 'ragione_sociale', fillConduttoreFilter);

    // --- Immobile ---
    // Ogni suggerimento è un immobile: etichetta = valore del campo digitato,
    // sottotitolo = indirizzo completo + dati catastali; selezionandolo si
    // compila l'intero blocco immobile.
    function immobileSugg(fieldKey) {
        return immobili.map(function(i) {
            var v = i[fieldKey];
            if (v == null || String(v).trim() === '') return null;
            var cad = [i.foglio ? ('Fg.' + i.foglio) : '', i.particella ? ('Part.' + i.particella) : '', i.sub ? ('Sub ' + i.sub) : ''].filter(Boolean).join(' - ');
            var ind = i.indirizzo ? i.indirizzo : '';
            var cit = i.citta ? i.citta : '';
            var sub = ind + (ind && cit ? ', ' : '') + cit;
            if (sub && cad) sub += ' · ' + cad;
            if (!sub) sub = cad;
            return { label: String(v).trim(), sub: sub, data: i };
        }).filter(Boolean);
    }
    function setupImmobileFilter(inputId, fieldKey) {
        // Ogni valore compare una sola volta nei suggerimenti (stesso indirizzo,
        // città, foglio, particella o sub anche se appartiene a più immobili):
        // si deduplica sul valore mostrato, non sul singolo immobile.
        var opts = {};
        // Per il campo indirizzo ordina per nome della strada (senza il tipo iniziale)
        if (fieldKey === 'indirizzo') opts.sortLabel = indirizzoSortLabel;
        setupFilterAutocomplete(document.getElementById(inputId), function() { return immobileSugg(fieldKey); }, fillImmobileFilter, opts);
    }
    function fillImmobileFilter(i) {
        document.getElementById('ffIndirizzo').value = i.indirizzo || '';
        document.getElementById('ffCitta').value = i.citta || '';
        document.getElementById('ffFoglio').value = i.foglio || '';
        document.getElementById('ffParticella').value = i.particella || '';
        document.getElementById('ffSub').value = i.sub || '';
    }
    setupImmobileFilter('ffIndirizzo', 'indirizzo');
    setupImmobileFilter('ffCitta', 'citta');
    setupImmobileFilter('ffFoglio', 'foglio');
    setupImmobileFilter('ffParticella', 'particella');
    setupImmobileFilter('ffSub', 'sub');

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
        html += '<div class="form-group"><label>Identificativo <span class="req">*</span></label><input type="text" id="cf_identificativo" autocomplete="off" value="' + (c ? c.identificativo : '') + '" required></div>';
        html += '<div class="form-group"><label>Data Decorrenza <span class="req">*</span></label><input type="date" id="cf_decorrenza" autocomplete="off" value="' + (c ? c.data_decorrenza : '') + '" required></div>';
        html += '<div class="form-group"><label>Data Scadenza <span class="req">*</span></label><input type="date" id="cf_scadenza" autocomplete="off" value="' + (c ? c.data_scadenza : '') + '" required></div>';
        // Data Scadenza Rinnovo: inseribile solo in fase di modifica del contratto
        if (type === 'editContratto') {
            html += '<div class="form-group"><label>Data Scadenza Rinnovo</label><input type="date" id="cf_scadenza_rinnovo" autocomplete="off" title="Nuova data di scadenza dopo il rinnovo del contratto" value="' + (c ? (c.data_scadenza_rinnovo || '') : '') + '"></div>';
        }
        html += '<div class="form-group"><label>Data Chiusura</label><input type="date" id="cf_chiusura" autocomplete="off" value="' + (c && c.data_chiusura ? c.data_chiusura : '') + '"></div><br>';
        // --- SEZIONE CANONI ANNUALI ---
        html += '<div class="form-section-title full"><i class="fas fa-euro-sign"></i> Canoni Annuali</div>';
        html += '<div class="form-group full"><div id="canoniRowsContainer"></div>';
        html += '<button type="button" class="btn btn-sm btn-outline" onclick="addCanoneRow()"><i class="fas fa-plus"></i> Aggiungi Canone</button>';
        html += '<div id="canoniCoverageWarning" class="canoni-warning" style="display:none"></div></div>';
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
        html += '<div class="form-group"><label>Indirizzo <span class="req">*</span></label><input type="text" id="cf_imm_indirizzo" value="' + (imm ? imm.indirizzo : '') + '" required></div>';
        html += '<div class="form-group"><label>Città <span class="req">*</span></label><input type="text" id="cf_imm_citta" value="' + (imm ? imm.citta : '') + '" required></div>';
        var apeChecked = imm && imm.ape;
        html += '<div class="form-group"><label>APE</label>';
        html += '<div class="radio-group" style="display:flex;gap:16px;margin-top:6px">';
        html += '<label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="cf_imm_ape" value="true"' + (!apeChecked ? ' checked' : '') + '> Sì</label>';
        html += '<label class="radio-label" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="cf_imm_ape" value="false"' + (apeChecked ? ' checked' : '') + '> No</label>';
        html += '</div></div>';
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;width:100%">';
        html += '<div class="form-group" style="flex:1;min-width:80px;margin:0"><label>Foglio <span class="req">*</span></label><input type="text" id="cf_imm_foglio" value="' + (imm ? (imm.foglio || '') : '') + '" style="max-width:100px" required></div>';
        html += '<div class="form-group" style="flex:1;min-width:80px;margin:0"><label>Particella <span class="req">*</span></label><input type="text" id="cf_imm_particella" value="' + (imm ? (imm.particella || '') : '') + '" style="max-width:100px" required></div>';
        html += '<div class="form-group" style="flex:1;min-width:80px;margin:0"><label>Sub <span class="req">*</span></label><input type="text" id="cf_imm_sub" value="' + (imm ? (imm.sub || '') : '') + '" style="max-width:100px" required></div>';
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
        var scadEffCv = getContrattoScadenzaEffettiva(cv);
        var dv = daysUntil(scadEffCv);
        var dl = dv > 0 ? dv + ' giorni alla scadenza' : dv === 0 ? 'Scade oggi!' : 'Scaduto da ' + Math.abs(dv) + ' giorni';
        var dc = dv <= 30 ? 'urgent' : '';
        // Mostra tutti i locatori/conduttori del contratto (la data di
        // chiusura del legame, se presente, viene indicata accanto al nome)
        var locRels = getLocatoriRelsByContratto(cv.id);
        var condRels = getConduttoriRelsByContratto(cv.id);
        var imm = getImmobile(cv.immobile_id);

        html = '<div class="contract-details" style="margin-bottom:16px">';
        html += '<div class="contract-detail"><label>Identificativo</label><span>' + cv.identificativo + '</span></div>';
        // Mostra solo i canoni in corso alla data di sistema
        // (data_inizio <= oggi <= data_fine; date mancanti = estremi aperti)
        var oggiCanoni = new Date().toISOString().slice(0, 10);
        var canoniCv = getCanoniByContratto(cv.id).filter(function(ca) {
            return (!ca.data_inizio || ca.data_inizio <= oggiCanoni) && (!ca.data_fine || ca.data_fine >= oggiCanoni);
        });
        if (canoniCv.length > 0) {
            canoniCv.forEach(function(ca) {
                html += '<div class="contract-detail"><label>Canone ' + formatDate(ca.data_inizio) + ' → ' + formatDate(ca.data_fine) + '</label><span>' + formatCurrency(ca.importo) + '</span></div>';
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
        if (locRels.length > 0) {
            locRels.forEach(function(lr) {
                var loc = lr.persona;
                html += '<span style="display:inline-block;margin:4px 0">' + getPersonaLabelShort(loc) + (loc.codice_fiscale ? ' <small>(CF: ' + loc.codice_fiscale + ')</small>' : '') + ' <small style="color:var(--text-muted)">— Data Inizio: ' + formatDate(lr.data_decorrenza || cv.data_decorrenza) + (lr.data_chiusura ? ' · Data Chiusura: ' + formatDate(lr.data_chiusura) : '') + '</small></span><br>';
            });
        } else {
            html += 'N/A';
        }
        html += '</div>';

        // Conduttori
        html += '<div style="padding:12px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:12px">';
        html += '<strong><i class="fas fa-user"></i> Conduttori:</strong><br>';
        if (condRels.length > 0) {
            condRels.forEach(function(cr) {
                var cond = cr.persona;
                html += '<span style="display:inline-block;margin:4px 0">' + getPersonaLabelShort(cond) + (cond.codice_fiscale ? ' <small>(CF: ' + cond.codice_fiscale + ')</small>' : '') + ' <small style="color:var(--text-muted)">— Data Inizio: ' + formatDate(cr.data_decorrenza || cv.data_decorrenza) + (cr.data_chiusura ? ' · Data Chiusura: ' + formatDate(cr.data_chiusura) : '') + '</small></span><br>';
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

    } else if (type === 'ripristinaScadenzaConfirm') {
        var rs = appData.scadenze.find(function(x) { return x.id === id; });
        if (!rs) return;
        var rsC = getContrattoById(rs.contratto_id);
        title.textContent = 'Ripristina Scadenza';
        html = '<div style="padding:16px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:16px;border-left:4px solid var(--primary)">';
        html += '<strong><i class="fas fa-undo"></i> Conferma ripristino</strong><br>';
        html += '<span>La scadenza <strong>' + (rs.prossima_scadenza ? formatDate(rs.prossima_scadenza) : '-') + '</strong>' +
            (rsC ? ' del contratto <strong>' + rsC.identificativo + '</strong>' : '') +
            ' (' + formatCurrency(rs.importo) + ') tornerà tra le scadenze <strong>da pagare</strong>.</span><br>';
        html += '</div>';
        html += '<div class="form-actions full">';
        html += '<button type="button" class="btn btn-outline" data-action="close-modal">Annulla</button>';
        html += '<button type="button" class="btn btn-primary" data-action="confirm-restore-scadenza" data-id="' + id + '"><i class="fas fa-undo"></i> Ripristina</button>';
        html += '</div>';

    } else if (type === 'completaScadenza') {
        var sc = appData.scadenze.find(function(x) { return x.id === id; });
        if (!sc) return;
        var scC = getContrattoById(sc.contratto_id);
        title.textContent = 'Completa Scadenza';
        html = '<form id="completaScadenzaForm" class="form-grid">';
        html += '<div style="grid-column:1/-1;padding:14px;background:var(--bg);border-radius:var(--radius-md);margin-bottom:4px">';
        html += '<div class="contract-detail"><label>Contratto</label><span><strong>' + (scC ? scC.identificativo : 'Contratto #' + sc.contratto_id) + '</strong></span></div>';
        html += '</div>';
        html += '<div class="form-group full"><label>Data di completamento</label><input type="date" id="scadDataCompletamento" value="' + toLocalDateStr(new Date()) + '" required></div>';
        html += '<div class="form-actions full"><button type="button" class="btn btn-outline" data-action="close-modal">Annulla</button><button type="submit" class="btn btn-success"><i class="fas fa-check"></i> Conferma Completamento</button></div>';
        html += '</form>';

    }

    body.innerHTML = html;
    overlay.classList.add('show');
    // La finestrella si apre sempre dall'inizio: azzera lo scroll interno
    // (modal-body), così non riparte dal punto in cui si era arrivati
    // nell'ultima apertura del form.
    modal.scrollTop = 0;
    body.scrollTop = 0;

    // Pulsante maiuscolo/minuscolo: visibile solo nel form contratto,
    // accanto al titolo del modale
    var caseBtn = document.getElementById('caseToggleBtn');
    var isContrattoForm = !!document.getElementById('contrattoForm');
    if (caseBtn) caseBtn.hidden = !isContrattoForm;
    if (isContrattoForm) {
        setupContrattoCaseFields(body);
        updateCaseToggleBtn();
    }

    // Attach form listeners
    var cf = document.getElementById('contrattoForm');
    if (cf) {
        cf.addEventListener('submit', function(e) { e.preventDefault(); saveContratto(id); });
        // I contatori delle righe ripartono sempre da 1 a ogni apertura del form
        canoneRowCounter = 0;
        locatoreRowCounter = 0;
        conduttoreRowCounter = 0;
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
        // Applica la modalità salvata (maiuscolo/minuscolo) anche ai valori
        // già presenti nel form, così la preferenza vale a ogni apertura
        applyContrattoCase();
        // Avviso quando i canoni non coprono l'intero periodo del contratto
        // (fino alla scadenza o, se presente, alla scadenza rinnovo)
        var scadInput = document.getElementById('cf_scadenza');
        var scadRinnovoInput = document.getElementById('cf_scadenza_rinnovo');
        if (decoInput) decoInput.addEventListener('input', updateCanoniCoverageWarning);
        if (scadInput) scadInput.addEventListener('input', updateCanoniCoverageWarning);
        if (scadRinnovoInput) scadRinnovoInput.addEventListener('input', updateCanoniCoverageWarning);
        updateCanoniCoverageWarning();
        // Setup immobile field autocomplete (stessa logica dei campi persona)
        ['indirizzo', 'citta', 'foglio', 'particella', 'sub'].forEach(function(f) {
            var immFieldEl = document.getElementById('cf_imm_' + f);
            if (immFieldEl) setupImmobileSuggestions(immFieldEl, f);
        });
    }
    var iqf = document.getElementById('inquilinoForm');
    if (iqf) iqf.addEventListener('submit', function(e) { e.preventDefault(); saveInquilino(); });

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
    // Blocca il salvataggio se i canoni non coprono l'intero periodo del contratto
    var coverageWarn = getCanoniCoverageWarning();
    if (coverageWarn) {
        updateCanoniCoverageWarning();
        showToast(coverageWarn, 'error');
        return;
    }

    // Obbligo di almeno un locatore e almeno un conduttore compilati
    // (una riga vuota, senza nome/cognome/CF/ragione sociale, non conta)
    function rowHasData(row, prefix) {
        var els = row.querySelectorAll('.' + prefix + '-nome, .' + prefix + '-cognome, .' + prefix + '-cf, .' + prefix + '-rs');
        for (var i = 0; i < els.length; i++) {
            if (els[i].value.trim() !== '') return true;
        }
        return false;
    }
    var locRowsCheck = document.querySelectorAll('#locatoriRowsContainer .locatore-row');
    var condRowsCheck = document.querySelectorAll('#conduttoriRowsContainer .conduttore-row');
    var hasLocatore = false, hasConduttore = false;
    locRowsCheck.forEach(function(r) { if (rowHasData(r, 'loc')) hasLocatore = true; });
    condRowsCheck.forEach(function(r) { if (rowHasData(r, 'cond')) hasConduttore = true; });
    if (!hasLocatore || !hasConduttore) {
        var missing = [];
        if (!hasLocatore) missing.push('almeno un locatore');
        if (!hasConduttore) missing.push('almeno un conduttore');
        showToast('Inserisci ' + missing.join(' e ') + ' per salvare il contratto.', 'error');
        return;
    }

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
        var vecchioContratto = appData.contratti.find(function(c) { return c.id === targetId; });
        var { error } = await db.from('contratti').update(contrattoData).eq('id', targetId);
        if (error) { console.error('Errore update contratto:', error); showToast('Errore salvataggio', 'error'); return; }
        var idx = appData.contratti.findIndex(function(c) { return c.id === targetId; });
        if (idx >= 0) Object.assign(appData.contratti[idx], contrattoData);
        // Se cambia la data di scadenza (o la scadenza rinnovo), lo stato
        // della notifica del contratto viene azzerato (snooze del giorno ed
        // eventuale 'Elimina'): la notifica per la NUOVA data viene
        // considerata nuova e torna visibile anche lo stesso giorno, a
        // qualunque data si passi (anche tornando a una data già provata).
        if (vecchioContratto &&
            (vecchioContratto.data_scadenza !== contrattoData.data_scadenza ||
             vecchioContratto.data_scadenza_rinnovo !== contrattoData.data_scadenza_rinnovo)) {
            var notifKey = 'contratto_' + targetId;
            localStorage.removeItem('notifSeen_' + notifKey);
            localStorage.removeItem('notifDismissed_' + notifKey);
        }
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
        var importo = parseImporto(row.querySelector('.canone-importo').value);
        var dataInizio = row.querySelector('.canone-data-inizio').value || null;
        var dataFine = row.querySelector('.canone-data-fine').value || null;
        var noteEl = row.querySelector('.canone-note');
        var noteCanone = noteEl ? (noteEl.value.trim() || null) : null;
        var cedolareSi = row.querySelector('.canone-cedolare-si');
        var taxCedolare = cedolareSi ? cedolareSi.checked : false;
        var taxPercentuale = parseImporto(row.querySelector('.canone-percentuale').value);
        var taxValoreAssoluto = parseImporto(row.querySelector('.canone-valore-assoluto').value);
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

    // --- Creazione scadenze di pagamento per i canoni ---
    // Una scadenza per ogni canone senza cedolare secca (prima il canone 1,
    // poi il canone 2, ...): la decorrenza è la data di inizio del canone e il
    // trigger del DB calcola prossima_scadenza. In modifica le scadenze non
    // più valide (cedolare, oltre il termine del contratto, importo cambiato)
    // vengono prima ricalcolate/eliminate, poi quelle mancanti vengono
    // aggiunte senza duplicare quelle già presenti.
    if (editId) await ricalcolaScadenzeContratto(targetId);
    await syncScadenzePerCanoni(targetId, newCanoni, contrattoData.data_decorrenza);
    // Le scadenze appena create con data nel passato (es. contratto vecchio)
    // vengono subito archiviate come scadute.
    await autoCompleteScadenzePassate();

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







// --- Filtro per scadenza (contratti che scadono esattamente tra N giorni) ---
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
    // Data di scadenza cercata = oggi + N giorni
    var target = new Date(oggi);
    target.setDate(target.getDate() + days);
    var targetISO = toISO(target);

    // Mostra i contratti (non chiusi) la cui scadenza effettiva
    // (rinnovo se presente, altrimenti scadenza) coincide con tale data
    var filtered = appData.contratti.filter(function(c) {
        if (c.data_chiusura) return false;
        var scad = getContrattoScadenzaEffettiva(c);
        if (!scad) return false;
        return scad === targetISO;
    });
    closeDecorrenzaModal();
    renderContrattiList(filtered);
}

// --- Reset filtro contratti: svuota i campi del filtro e mostra di nuovo la lista completa ---
function resetContrattiFilter() {
    resetFilterModal();
    renderContratti();
    showToast('Lista contratti ripristinata', 'success');
}

// ============================================
// RENDERING
// ============================================

// --- Render Contratti ---
async function renderContratti() {
    renderContrattiList(appData.contratti);
}
function renderContrattiList(list) {
    // Ordinamento alfabetico per locatore (cognome prima del nome) e, a
    // parità di locatore, per conduttore
    var filtered = list.slice().sort(function(a, b) {
        var cmp = (getLocatoriCognomeNomeLabel(a.id) || '').localeCompare(getLocatoriCognomeNomeLabel(b.id) || '', 'it');
        if (cmp !== 0) return cmp;
        return (getConduttoriCognomeNomeLabel(a.id) || '').localeCompare(getConduttoriCognomeNomeLabel(b.id) || '', 'it');
    });

    // Table view
    var tbody = document.getElementById('contractsTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><i class="fas fa-file-contract"></i><p>Nessun contratto trovato</p></div></td></tr>';
    } else {
        tbody.innerHTML = filtered.map(function(c) {
            return '<tr><td>' + getLocatoriCognomeNomeLabel(c.id) + '</td><td>' + getConduttoriCognomeNomeLabel(c.id) + '</td><td>' + getImmobileLabel(c.immobile_id) + '</td><td><div class="td-actions"><button data-action="pdf-contratto" data-id="' + c.id + '" title="PDF Completo"><i class="fas fa-file-pdf"></i></button><button data-action="view-contratto" data-id="' + c.id + '" title="Dettagli"><i class="fas fa-eye"></i></button><button data-action="edit-contratto" data-id="' + c.id + '" title="Modifica"><i class="fas fa-edit"></i></button><button class="danger" data-action="delete-contratto" data-id="' + c.id + '" title="Elimina"><i class="fas fa-trash"></i></button></div></td></tr>';
        }).join('');
    }
}






// --- Urgenza scadenze (usata dalla pagina Scadenze, non dalle notifiche) ---
// Anticipo fisso: 7 giorni prima della prossima scadenza
function getScadenzaUrgenza(s) {
    if (isScadenzaArchiviata(s)) return null;
    if (!s.prossima_scadenza) return null;
    var c = getContrattoById(s.contratto_id);
    if (!c) return null;
    var canone = getCanonePerScadenza(c.id, s.data_decorrenza);
    if (!canone || !canone.tassazione_cedolare_secca) return null;
    var gg = daysUntil(s.prossima_scadenza);
    if (gg <= 0) return { type: 'scaduta', label: 'Scaduta', days: gg };
    if (gg <= 7) return { type: 'in-scadenza', label: 'In scadenza', days: gg };
    return null;
}

// --- Notifiche: scadenze di pagamento ---
// Il calendario è identico a quello dei contratti: una notifica 30 giorni
// prima della scadenza di pagamento, una 15 giorni prima e poi ogni giorno
// negli ultimi 7 giorni (da 7 a 1 giorno prima). A scadenza avvenuta non
// vengono più inviate notifiche, TRANNE se il contratto ha una data di
// chiusura: la scadenza continua a essere notificata (anche dopo la sua
// data) fino alla data di chiusura del contratto. I contratti invece si
// fermano appena viene inserita la data di chiusura.
function getScadenzaNotifica(s) {
    if (isScadenzaArchiviata(s)) return null;
    if (!s.prossima_scadenza) return null;
    var c = getContrattoById(s.contratto_id);
    if (!c) return null;
    // Nessun versamento da effettuare nei periodi a cedolare secca
    if (isScadenzaCedolare(s)) return null;
    // Chiusura già passata: oltre il termine non si notifica più
    if (c.data_chiusura && daysUntil(c.data_chiusura) < 0) return null;
    var gg = daysUntil(s.prossima_scadenza);
    // Finestra identica ai contratti: 30 gg prima, 15 gg prima e ogni
    // giorno negli ultimi 7 gg prima della scadenza.
    if (gg === 30 || gg === 15 || (gg >= 1 && gg <= 7)) return { days: gg };
    // Differenza dai contratti: con una data di chiusura la scadenza di
    // pagamento continua a essere notificata fino alla chiusura del
    // contratto, anche dopo la sua data.
    if (c.data_chiusura && gg <= 0) return { days: gg };
    return null;                              // oltre la scadenza: stop
}

// --- Notifiche: contratti in scadenza ---
// La notifica anticipata segue la data di scadenza del contratto (o la data
// di scadenza rinnovo, se presente): una notifica 30 giorni prima, una 15
// giorni prima e poi ogni giorno negli ultimi 7 giorni (da 7 a 1 giorno
// prima della scadenza). A scadenza avvenuta, o con una data di chiusura
// inserita, non viene inviata nessuna notifica.
function getContrattoNotifica(c) {
    if (c.data_chiusura) return null;
    var refDate = getContrattoScadenzaEffettiva(c);
    if (!refDate) return null;
    var gg = daysUntil(refDate);
    if (gg <= 0) return null;            // scaduto o scade oggi: nessuna notifica
    if (gg === 30 || gg === 15 || gg <= 7) return { days: gg };
    return null;                         // fuori dalle finestre (31+, 29..16, 14..8)
}

// Lo snooze salva la data odierna insieme alla DATA DI RIFERIMENTO della
// notifica (scadenza del contratto / prossima_scadenza di pagamento): se la
// data cambia (es. modifica della scadenza del contratto) la notifica si
// considera NUOVA e torna subito visibile lo stesso giorno, così si può
// testare più volte al giorno senza svuotare localStorage.
function markNotifSeen(key, deadline) {
    var v = toLocalDateStr(new Date());
    if (deadline) v += '|' + deadline;
    localStorage.setItem('notifSeen_' + key, v);
}

// True se la notifica è già stata segnata come letta OGGI con la stessa
// data di riferimento. Formati salvati da markNotifSeen: 'YYYY-MM-DD'
// (solo data, vecchio formato o 'Segna come letta') oppure
// 'YYYY-MM-DD|YYYY-MM-DD' (data odierna + data di riferimento).
function isNotifSeenToday(key, deadline) {
    var v = localStorage.getItem('notifSeen_' + key);
    if (!v) return false;
    var parts = v.split('|');
    if (parts[0] !== toLocalDateStr(new Date())) return false;
    // Senza data di riferimento (es. 'Segna come letta'): vale lo snooze del giorno.
    if (!deadline) return true;
    // Vecchio formato (solo data) oppure scadenza cambiata: notifica nuova.
    return parts[1] === deadline;
}

function renderNotifications() {
    var items = [];

    // Scadenze di pagamento: calendario identico ai contratti (30 gg prima,
    // 15 gg prima e ogni giorno negli ultimi 7 gg prima della scadenza).
    // Con una data di chiusura la scadenza continua a essere notificata,
    // anche dopo la sua data, fino alla chiusura del contratto.
    appData.scadenze.forEach(function(s) {
        var n = getScadenzaNotifica(s);
        if (!n) return;
        var c = getContrattoById(s.contratto_id);
        var cod = c ? c.identificativo : 'Contratto #' + s.contratto_id;
        var gg = n.days;
        var txt;
        if (gg > 1) txt = 'Scadenza tra ' + gg + ' giorni · ' + cod;
        else if (gg === 1) txt = 'Scadenza domani · ' + cod;
        else if (gg === 0) txt = 'Scadenza oggi · ' + cod;
        else txt = 'Scadenza da ' + (-gg) + ' giorni · ' + cod;
        items.push({
            key: 'scadenza_' + s.id,
            date: s.prossima_scadenza,
            icon: gg > 0 ? 'fa-hourglass-half' : 'fa-exclamation-circle',
            cls: gg > 0 ? 'warning' : 'danger',
            txt: txt,
            meta: formatDate(s.prossima_scadenza) + ' · ' + formatCurrency(s.importo)
        });
    });

    // Contratti in scadenza: una notifica 30 giorni prima, una 15 giorni
    // prima e poi ogni giorno negli ultimi 7 giorni (da 7 a 1 giorno prima
    // della scadenza).
    appData.contratti.forEach(function(c) {
        if (!getContrattoNotifica(c)) return;
        var refDate = getContrattoScadenzaEffettiva(c);
        items.push({
            key: 'contratto_' + c.id,
            date: refDate,
            icon: 'fa-file-contract',
            cls: 'info',
            txt: 'In data ' + formatDate(refDate) + ' scade il contratto tra ' +
                 getLocatoriLabel(c.id) + ' e ' + getConduttoriLabel(c.id),
            meta: 'Contratto ' + c.identificativo
        });
    });

    // Filtro: mostra le notifiche non eliminate che oggi non sono ancora
    // state segnate come lette (con la stessa data di riferimento). Una
    // notifica NON viene marcata come vista al solo rendering: resta nella
    // campanella anche dopo un refresh finché l'utente non la segna come
    // letta o non la elimina. Segnandola come letta sparisce per il resto
    // della giornata; il giorno successivo, se il calendario prevede
    // ancora una notifica (es. ultimi 7 giorni prima della scadenza),
    // torna a comparire. Se la data di riferimento cambia (es. nuova
    // scadenza del contratto) lo snooze si azzera e la notifica ricompare
    // subito, anche lo stesso giorno.
    var daMostrare = [];
    items.forEach(function(it) {
        if (isNotificationDismissed(it.key)) return false;
        // Letta oggi con la stessa data di riferimento: nascosta per oggi
        if (isNotifSeenToday(it.key, it.date)) return false;
        daMostrare.push(it);
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
            '<button class="notif-action" title="Segna come letta" onclick="markNotificationRead(\'' + it.key + '\',\'' + (it.date || '') + '\')"><i class="fas fa-check"></i></button>' +
            '<button class="notif-action notif-action-delete" title="Elimina" onclick="deleteNotification(\'' + it.key + '\')"><i class="fas fa-times"></i></button>' +
            '</div></div>';
    }).join('');
}

// Segna una singola notifica come letta: sparisce per il resto della
// giornata e ricompare il giorno successivo se il calendario prevede
// ancora una notifica (o subito, se la data di riferimento cambia).
function markNotificationRead(key, deadline) {
    notificationReadThisSession.add(key);
    markNotifSeen(key, deadline);
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

// --- Bottone Completa: apre una finestra per inserire la data di completamento ---
function scadenzaDoneBtn(s) {
    var isDone = isScadenzaCompletata(s);
    if (isDone) {
        return '<span class="status-badge attivo"><i class="fas fa-check"></i> ' + (s.data_completamento ? formatDate(s.data_completamento) : 'Completata') + '</span>';
    }
    return '<button class="btn btn-sm btn-success scadenza-completa-btn"' +
        ' data-action="complete-scadenza" data-id="' + s.id + '" title="Inserisci data di completamento"><i class="fas fa-check"></i> Completa</button>';
}

// --- Bottone Modello F24: genera il PDF del versamento ---
function scadenzaF24Btn(s) {
    var isDone = isScadenzaCompletata(s);
    return '<button class="btn btn-sm btn-outline scadenza-f24-btn"' +
        (isDone ? ' disabled' : '') +
        ' data-action="generate-f24" data-id="' + s.id + '" title="' + (isDone ? 'Scadenza già completata' : 'Genera PDF Modello F24') + '"><i class="fas fa-file-alt"></i> Modello F24</button>';
}

// --- Bottone Ripristina: riporta una scadenza archiviata tra quelle da pagare ---
// Visibile sia per le completate manualmente sia per le scadute archiviate in
// automatico: una scadenza scaduta può essere ripristinata per essere pagata.
function scadenzaRestoreBtn(s) {
    if (!isScadenzaArchiviata(s)) return '';
    return '<button class="btn btn-sm btn-outline scadenza-restore-btn"' +
        ' data-action="restore-scadenza" data-id="' + s.id + '" title="Ripristina la scadenza tra quelle da pagare"><i class="fas fa-undo"></i> Ripristina</button>';
}

// Ripristina una scadenza archiviata (completata per sbaglio oppure scaduta e
// ancora da saldare): torna 'in-attesa' senza data di completamento, quindi
// ricompare nella lista "Da pagare" per poter essere pagata. Le scadenze
// successive restano invariate: ognuna rappresenta il proprio versamento.
async function ripristinaScadenza(id) {
    var s = appData.scadenze.find(function(x) { return x.id === id; });
    if (!s) return;
    if (!isScadenzaArchiviata(s)) {
        showToast('Questa scadenza non è archiviata', 'error');
        return;
    }

    var { error } = await db.from('scadenze').update({ stato: 'in-attesa', data_completamento: null }).eq('id', id);
    if (error) {
        console.error('Errore ripristino scadenza:', error);
        showToast('Errore ripristino scadenza', 'error');
        return;
    }
    s.stato = 'in-attesa';
    s.data_completamento = null;

    closeModal();
    renderScadenze();
    renderNotifications();
    showToast('Scadenza ripristinata tra quelle da pagare', 'success');
}

// Completa la scadenza salvando la data di completamento scelta dall'utente.
// Al completamento genera automaticamente la scadenza successiva: la nuova
// decorrenza è la decorrenza della scadenza appena completata + 1 anno
// (stesso giorno/mese), così il ritmo annuale dei versamenti resta ancorato
// alla decorrenza del contratto anche quando l'utente paga in anticipo o in
// ritardo. La generazione si ferma quando la nuova decorrenza supera il
// termine del contratto: la data di chiusura se presente, altrimenti la data
// di scadenza (o la data di rinnovo, se impostata).
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

    // --- Creazione automatica della scadenza successiva ---
    var nextDeco = s.data_decorrenza ? addYearsToDateStr(s.data_decorrenza, 1) : null;
    var nextScad = null;
    if (nextDeco) {
        var c = getContrattoById(s.contratto_id);
        // Termine di riferimento: la data di chiusura se presente, altrimenti
        // la data di scadenza del contratto (o la data di rinnovo, se impostata).
        var limite = c ? (c.data_chiusura || getContrattoScadenzaEffettiva(c)) : null;
        var giaInAttesa = appData.scadenze.some(function(x) {
            return x.contratto_id === s.contratto_id && x.stato === 'in-attesa';
        });
        var canone = c ? getCanonePerScadenza(c.id, nextDeco) : null;
        // Con la cedolare secca sul canone del periodo successivo non c'è
        // versamento: la scadenza non viene creata. La DATA della prossima
        // scadenza può invece cadere in un periodo a cedolare: l'imposta
        // dell'annualità va comunque versata entro +1 anno +30 giorni.
        // Come nella generazione delle scadenze, la scadenza successiva si
        // crea solo se il suo pagamento (decorrenza + 1 anno + 30 giorni)
        // cade entro il termine del contratto.
        var nextPagamento = addDaysToDateStr(addYearsToDateStr(nextDeco, 1), 30);
        var valida = c && !giaInAttesa && !(canone && canone.tassazione_cedolare_secca) &&
                     (!limite || (nextPagamento && nextPagamento <= limite));
        if (valida) {
            var { data: insScad, error: errScad } = await db.from('scadenze').insert({
                contratto_id: c.id,
                data_decorrenza: nextDeco,
                importo: canone ? (parseFloat(canone.importo) || 0) : (parseFloat(s.importo) || 0),
                stato: 'in-attesa'
            }).select();
            if (errScad) {
                console.error('Errore creazione scadenza successiva:', errScad);
                showToast('Scadenza completata, ma errore nella creazione della prossima scadenza', 'error');
            } else if (insScad) {
                appData.scadenze = appData.scadenze.concat(insScad);
                nextScad = insScad[0];
            }
        }
    }

    closeModal();
    showToast('Scadenza completata per il ' + formatDate(data) +
        (nextScad && nextScad.prossima_scadenza ? ' · Prossima scadenza: ' + formatDate(nextScad.prossima_scadenza) : ''), 'success');
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

// Canone che copre ESATTAMENTE una data (il cui periodo la contiene).
// A differenza di getCanonePerScadenza non ha fallback: se la data cade in
// un buco tra canoni (o prima del primo / dopo l'ultimo) restituisce null.
function getCanoneCheCopre(contrattoId, data) {
    if (!data) return null;
    return getCanoniByContratto(contrattoId).find(function(ca) {
        return (!ca.data_inizio || ca.data_inizio <= data) &&
               (!ca.data_fine || ca.data_fine >= data);
    }) || null;
}

// Canone di riferimento di una scadenza di pagamento: il canone il cui
// periodo contiene la DATA DI PAGAMENTO della scadenza (prossima_scadenza),
// cioè quello stampato sotto la data nella lista Scadenze e quello su cui il
// Modello F24 basa importo e Dettaglio Calcolo. Solo se nessun canone copre
// quella data (es. buco tra canoni) si usa il canone che copre la decorrenza
// dell'annualità (l'anniversario del contratto), infine il fallback storico
// (canone attuale / ultimo canone).
function getCanoneRiferimentoScadenza(s) {
    var c = getContrattoById(s.contratto_id);
    if (!c) return null;
    // Canone che copre la data di pagamento: riferimento del versamento
    var canone = getCanoneCheCopre(c.id, s.prossima_scadenza);
    if (!canone) canone = getCanoneCheCopre(c.id, s.data_decorrenza);
    return canone || getCanonePerScadenza(c.id, s.data_decorrenza);
}

// Una scadenza di pagamento non compare nelle liste quando il canone che
// copre la sua DATA DI PAGAMENTO (prossima_scadenza) è a cedolare secca,
// in coerenza con il canone stampato sotto la scadenza nella lista: se la
// data di pagamento cade in un periodo a cedolare secca non c'è un
// versamento da effettuare in quel periodo. Es. imposta dell'annualità
// 18/09/27 -> 17/09/28 da pagare il 18/10/28: la data di pagamento cade nel
// canone a cedolare successivo (18/09/28 -> 17/09/31) e la scadenza non
// compare in lista. Fallback alla decorrenza se la data di pagamento non è
// disponibile.
function isScadenzaCedolare(s) {
    var c = getContrattoById(s.contratto_id);
    if (!c) return false;
    var canone = getCanoneCheCopre(c.id, s.prossima_scadenza) || getCanoneCheCopre(c.id, s.data_decorrenza);
    return !!(canone && canone.tassazione_cedolare_secca);
}

// Una scadenza che va oltre il termine del contratto non deve essere elencata:
// il termine è la data di chiusura se presente, altrimenti la data di scadenza
// del contratto (o la data di scadenza del rinnovo, se impostata). Es. scadenza
// 14/02/28 di un contratto scaduto il 30/09/27: non ci sono più versamenti da
// effettuare e la scadenza non compare in lista.
function isScadenzaOltreTermine(s) {
    var c = getContrattoById(s.contratto_id);
    if (!c || !s.prossima_scadenza) return false;
    var limite = c.data_chiusura || getContrattoScadenzaEffettiva(c);
    return !!limite && s.prossima_scadenza > limite;
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
    // Canone di riferimento: quello stampato sotto la data nella lista Scadenze,
    // cioè quello il cui periodo contiene la DATA DI PAGAMENTO (prossima_scadenza)
    var canone = getCanoneRiferimentoScadenza(s);

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

    // L'anno di versamento deve corrispondere all'anno della scadenza
    // (prossima_scadenza = data di pagamento), non all'anno corrente.
    var annoVersamento = s.prossima_scadenza ? new Date(s.prossima_scadenza).getFullYear()
        : (s.data_decorrenza ? new Date(s.data_decorrenza).getFullYear()
        : new Date().getFullYear());
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

// --- PDF riepilogo completo contratto ---
// Genera un PDF con tutte le informazioni del contratto: dati generali,
// immobile, tutti i locatori e conduttori (anche con data di chiusura),
// tutti i canoni annuali e le note.
function generateContrattoPdf(contrattoId) {
    if (typeof jspdf === 'undefined') { showToast('Libreria PDF non disponibile, ricarica la pagina', 'error'); return; }
    var c = getContrattoById(contrattoId);
    if (!c) { showToast('Contratto non trovato', 'error'); return; }

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

    // Riga di campi affiancati (1 o più colonne) nello stile del Modello F24
    function fieldRow(labels, values) {
        ensureSpace(46);
        var n = labels.length;
        var gap = 14;
        var w = (W - 2 * M - gap * (n - 1)) / n;
        for (var i = 0; i < n; i++) {
            var fx = M + i * (w + gap);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
            doc.text(String(labels[i]).toUpperCase(), fx, y);
            doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
            doc.roundedRect(fx, y + 4, w, 26, 3, 3, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(DARK[0], DARK[1], DARK[2]);
            doc.text(String(values[i]), fx + 8, y + 21);
        }
        y += 42;
    }

    function field(label, value) { fieldRow([label], [value]); }

    // Header
    doc.setFillColor(DARK[0], DARK[1], DARK[2]);
    doc.rect(0, 0, W, 96, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('RIEPILOGO CONTRATTO', M, 46);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(203, 213, 225);
    doc.text('Contratto: ' + (c.identificativo || '#' + c.id), M, 66);
    doc.text('Generato il ' + formatDate(new Date().toISOString().slice(0, 10)) + ' - Studio Santantonio', M, 82);
    y = 120;

    // Dati generali
    sectionTitle('DATI GENERALI');
    fieldRow(['Identificativo', 'Stato'], [c.identificativo || 'N/A', getStatusLabel(calcContrattoStato(c))]);
    fieldRow(['Decorrenza', 'Scadenza'], [formatDate(c.data_decorrenza), formatDate(c.data_scadenza)]);
    fieldRow(['Scadenza Rinnovo', 'Chiusura'], [c.data_scadenza_rinnovo ? formatDate(c.data_scadenza_rinnovo) : '-', c.data_chiusura ? formatDate(c.data_chiusura) : '-']);
    var scadEffPdf = getContrattoScadenzaEffettiva(c);
    var dlPdf = scadEffPdf ? daysUntil(scadEffPdf) : null;
    var rimanenzaPdf = c.data_chiusura ? 'Chiuso' : (dlPdf === null ? '-' : (dlPdf > 0 ? dlPdf + ' giorni alla scadenza' : (dlPdf === 0 ? 'Scade oggi' : 'Scaduto da ' + Math.abs(dlPdf) + ' giorni')));
    field('Rimanenza', rimanenzaPdf);

    // Immobile
    sectionTitle('IMMOBILE');
    var immPdf = getImmobile(c.immobile_id);
    if (immPdf) {
        field('Indirizzo', immPdf.indirizzo + ', ' + immPdf.citta);
        fieldRow(['Foglio', 'Particella', 'Sub'], [immPdf.foglio || '-', immPdf.particella || '-', immPdf.sub || '-']);
        field('APE', immPdf.ape ? 'Presente' : 'Non presente');
    } else {
        field('Immobile', 'N/A');
    }

    // Locatori (tutti, anche cessati)
    sectionTitle('LOCATORI');
    var locRelsPdf = getLocatoriRelsByContratto(c.id);
    if (locRelsPdf.length === 0) {
        field('Locatori', 'N/A');
    } else {
        locRelsPdf.forEach(function(lr) {
            var p = lr.persona;
            // Nome e cognome (o ragione sociale) in un riquadro azzurrino,
            // come il codice fiscale
            field(getPersonaF24TipoLabel(p), getPersonaLabelCognomeNome(p));
            field('Codice Fiscale', p.codice_fiscale || 'N/A');
            fieldRow(['Data Inizio', 'Data Chiusura'], [lr.data_decorrenza ? formatDate(lr.data_decorrenza) : '-', lr.data_chiusura ? formatDate(lr.data_chiusura) : '-']);
        });
    }

    // Conduttori (tutti, anche cessati)
    sectionTitle('CONDUTTORI');
    var condRelsPdf = getConduttoriRelsByContratto(c.id);
    if (condRelsPdf.length === 0) {
        field('Conduttori', 'N/A');
    } else {
        condRelsPdf.forEach(function(cr) {
            var p = cr.persona;
            // Nome e cognome (o ragione sociale) in un riquadro azzurrino,
            // come il codice fiscale
            field(getPersonaF24TipoLabel(p), getPersonaLabelCognomeNome(p));
            field('Codice Fiscale', p.codice_fiscale || 'N/A');
            fieldRow(['Data Inizio', 'Data Chiusura'], [cr.data_decorrenza ? formatDate(cr.data_decorrenza) : '-', cr.data_chiusura ? formatDate(cr.data_chiusura) : '-']);
        });
    }

    // Canoni annuali (tutti), ordinati per data di inizio
    sectionTitle('CANONI ANNUALI');
    var canoniPdf = getCanoniByContratto(c.id).slice().sort(function(a, b) {
        return (a.data_inizio || '9999-12-31').localeCompare(b.data_inizio || '9999-12-31');
    });
    if (canoniPdf.length === 0) {
        field('Canone Annuale', '-');
    } else {
        canoniPdf.forEach(function(ca) {
            var periodoPdf = (ca.data_inizio ? formatDate(ca.data_inizio) : '-') + ' → ' + (ca.data_fine ? formatDate(ca.data_fine) : '-');
            field('Canone', periodoPdf);
            fieldRow(['Importo', 'Tassazione'], [formatCurrency(ca.importo), getCanoneTaxLabel(ca)]);
            if (parseFloat(ca.percentuale) > 0 || parseFloat(ca.valore_assoluto) > 0) {
                fieldRow(['Percentuale', 'Valore Assoluto'], [(parseFloat(ca.percentuale) || 0) + '%', parseFloat(ca.valore_assoluto) > 0 ? formatCurrency(ca.valore_assoluto) : '-']);
            }
        });
    }

    // Note
    sectionTitle('NOTE');
    ensureSpace(46);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    var noteLines = doc.splitTextToSize(c.note || 'Nessuna nota', W - 2 * M);
    doc.text(noteLines, M, y);
    y += noteLines.length * 14 + 8;

    // Footer
    ensureSpace(30);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.text('Documento generato automaticamente - Studio Santantonio', M, y);

    var nomeFilePdf = 'Contratto_' + (c.identificativo || 'contratto-' + c.id).replace(/[^a-zA-Z0-9_-]+/g, '-') + '.pdf';
    doc.save(nomeFilePdf);
    showToast('PDF riepilogo contratto generato', 'success');
}

// --- Render Scadenze ---
function getContrattoById(id) {
    return appData.contratti.find(function(c) { return c.id === id; }) || null;
}
// Urgenza scadenza di un contratto: scaduto o in scadenza entro 30 giorni (anticipo fisso)
function getContrattoUrgenza(c) {
    var scad = getContrattoScadenzaEffettiva(c);
    if (!scad || c.data_chiusura) return null;
    var gg = daysUntil(scad);
    if (gg <= 0) return { type: 'scaduta', label: 'Scaduta', days: gg };
    if (gg <= 30) return { type: 'in-scadenza', label: 'In scadenza', days: gg };
    return null;
}

async function renderScadenze() {
    var tipo = document.getElementById('filterScadenzaTipo').value;

    // Stats: scadenze da pagare, scadute e completate; contratti non scaduti e scaduti.
    // Le scadenze il cui canone di riferimento (quello che copre la data di
    // pagamento) è a cedolare secca non vengono contate.
    var inAttesa = appData.scadenze.filter(function(s) { return s.stato === 'in-attesa' && !isScadenzaCedolare(s) && !isScadenzaOltreTermine(s); });
    document.getElementById('statScadenzeInAttesa').textContent = inAttesa.length;

    var elScadute = document.getElementById('statScadenzeScadute');
    var elCompletate = document.getElementById('statScadenzeCompletate');
    if (elScadute) {
        // Scadute = scadenze archiviate in automatico (stato 'scaduta');
        // quelle ancora in attesa con data nel passato vengono contate comunque.
        elScadute.textContent = appData.scadenze.filter(function(s) {
            if (isScadenzaCedolare(s)) return false;
            if (s.stato === 'scaduta') return true;
            return s.stato === 'in-attesa' && !isScadenzaOltreTermine(s) && s.prossima_scadenza && daysUntil(s.prossima_scadenza) <= 0;
        }).length;
    }
    if (elCompletate) {
        // Completate = solo i versamenti effettuati manualmente dall'utente.
        elCompletate.textContent = appData.scadenze.filter(function(s) {
            return isScadenzaCompletata(s) && !isScadenzaCedolare(s);
        }).length;
    }

    var elCNS = document.getElementById('statContrattiNonScaduti');
    var elCS = document.getElementById('statContrattiScaduti');
    if (elCNS) {
        elCNS.textContent = appData.contratti.filter(function(c) {
            return !c.data_chiusura && getContrattoScadenzaEffettiva(c) && daysUntil(getContrattoScadenzaEffettiva(c)) > 0;
        }).length;
    }
    if (elCS) {
        elCS.textContent = appData.contratti.filter(function(c) {
            return !c.data_chiusura && getContrattoScadenzaEffettiva(c) && daysUntil(getContrattoScadenzaEffettiva(c)) <= 0;
        }).length;
    }
    var elCChiusi = document.getElementById('statContrattiChiusi');
    if (elCChiusi) {
        elCChiusi.textContent = appData.contratti.filter(function(c) {
            return !!c.data_chiusura;
        }).length;
    }

    // Sottotitolo in base alla lista scelta
    var subEl = document.getElementById('scadenzeSubtitle');
    if (subEl) subEl.textContent = tipo === 'contratti' ? 'Scadenza dei contratti di locazione' : 'Versamento Imposta di Registro 30gg';

    // Filtro di stato: per i pagamenti "Da pagare / Archiviate" (scadute +
    // completate), per i contratti "Non scaduti / Scaduti". Le voci si adattano.
    var statoSel = document.getElementById('filterScadenzaStato');
    var statoFiltro = statoSel ? statoSel.value : 'tutti';
    if (statoSel) {
        var optStato = tipo === 'pagamenti'
            ? [{ v: 'tutti', l: 'Da pagare' }, { v: 'archiviate', l: 'Archiviate' }]
            : [{ v: 'non-scaduti', l: 'Non scaduti' }, { v: 'scaduti', l: 'Scaduti/Chiusi' }];
        statoSel.innerHTML = optStato.map(function(o) { return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('');
        statoSel.value = optStato.some(function(o) { return o.v === statoFiltro; }) ? statoFiltro : optStato[0].v;
        statoFiltro = statoSel.value;
    }

    // Intestazione della colonna: per i contratti scaduti/chiusi la colonna
    // mostra l'esito (Scaduto il / Chiuso il) invece della prossima scadenza.
    var prossimaTh = document.getElementById('scadenzeProssimaTh');
    if (prossimaTh) prossimaTh.textContent = (tipo === 'contratti' && statoFiltro === 'scaduti') ? 'Esito' : 'Prossima Scadenza';

    // Normalizza gli elementi da mostrare in voci comuni. La lista è ordinata
    // per data di scadenza: la più vicina per prima (le date mancanti in fondo).
    var items = [];
    if (tipo === 'contratti') {
        var contrattiFiltro = appData.contratti.filter(function(c) { return getContrattoScadenzaEffettiva(c); });
        if (statoFiltro === 'scaduti') {
            // Scaduti = scadenza effettiva passata oppure contratto chiuso
            // (con data di chiusura): i chiusi compaiono solo qui.
            contrattiFiltro = contrattiFiltro.filter(function(c) {
                return c.data_chiusura || daysUntil(getContrattoScadenzaEffettiva(c)) <= 0;
            });
        } else {
            contrattiFiltro = contrattiFiltro.filter(function(c) {
                return !c.data_chiusura && daysUntil(getContrattoScadenzaEffettiva(c)) > 0;
            });
        }
        // Ordinamento per data: i non scaduti dalla più vicina a oggi in
        // avanti, i Scaduti/Chiusi dalla più recente a oggi all'indietro.
        // Per i chiusi la data di riferimento è la data di chiusura, per gli
        // altri la scadenza effettiva. A parità di data, ordine alfabetico
        // per locatore e poi conduttore.
        items = contrattiFiltro
            .sort(function(a, b) {
                var dataRif = function(c) {
                    return c.data_chiusura || getContrattoScadenzaEffettiva(c) || '9999-12-31';
                };
                var cmp = (statoFiltro === 'scaduti')
                    ? dataRif(b).localeCompare(dataRif(a))
                    : dataRif(a).localeCompare(dataRif(b));
                if (cmp !== 0) return cmp;
                var la = getLocatoriCognomeNomeLabel(a.id);
                var lb = getLocatoriCognomeNomeLabel(b.id);
                cmp = la.localeCompare(lb, 'it');
                if (cmp !== 0) return cmp;
                return getConduttoriCognomeNomeLabel(a.id).localeCompare(getConduttoriCognomeNomeLabel(b.id), 'it');
            })
            .map(function(c) {
                return {
                    locLabel: getLocatoriCognomeNomeLabel(c.id),
                    condLabel: getConduttoriCognomeNomeLabel(c.id),
                    scadenza: getContrattoScadenzaEffettiva(c),
                    urg: getContrattoUrgenza(c),
                    // Stato per la colonna esito: chiuso (data di chiusura) o
                    // scaduto (scadenza effettiva passata)
                    chiuso: !!c.data_chiusura,
                    scaduto: !c.data_chiusura && daysUntil(getContrattoScadenzaEffettiva(c)) <= 0,
                    dataChiusura: c.data_chiusura,
                    actions: '<button class="btn btn-sm btn-outline" data-action="view-contratto" data-id="' + c.id + '"><i class="fas fa-eye"></i> Dettagli</button>'
                };
            });
    } else {
        var scadenzeFiltro = appData.scadenze.slice();
        // Le scadenze il cui canone di riferimento (quello che copre la data
        // di pagamento) è a cedolare secca non vengono mai listate: non ci
        // sono versamenti da effettuare in quel periodo.
        // Le scadenze oltre il termine del contratto (chiusura, scadenza o
        // scadenza del rinnovo) non vengono mai listate: non ci sono più
        // versamenti da effettuare.
        if (statoFiltro === 'archiviate') {
            // Archiviate = completate manualmente + scadute (archiviate in automatico)
            scadenzeFiltro = scadenzeFiltro.filter(function(s) {
                if (isScadenzaCedolare(s)) return false;
                if (s.stato === 'scaduta') return true;
                if (s.stato === 'completata' || s.stato === 'completato') return true;
                return s.stato === 'in-attesa' && !isScadenzaOltreTermine(s) && s.prossima_scadenza && daysUntil(s.prossima_scadenza) <= 0;
            });
        } else {
            scadenzeFiltro = scadenzeFiltro.filter(function(s) { return s.stato === 'in-attesa' && !isScadenzaCedolare(s) && !isScadenzaOltreTermine(s); });
        }
        // Ordinamento alfabetico per locatore e poi per conduttore (come nella
        // lista contratti); a parità di locatore e conduttore si ordina per
        // prossima scadenza.
        items = scadenzeFiltro
            .sort(function(a, b) {
                var ca = getContrattoById(a.contratto_id);
                var cb = getContrattoById(b.contratto_id);
                var la = ca ? getLocatoriCognomeNomeLabel(ca.id) : 'N/A';
                var lb = cb ? getLocatoriCognomeNomeLabel(cb.id) : 'N/A';
                var cmp = la.localeCompare(lb, 'it');
                if (cmp !== 0) return cmp;
                var coa = ca ? getConduttoriCognomeNomeLabel(ca.id) : 'N/A';
                var cob = cb ? getConduttoriCognomeNomeLabel(cb.id) : 'N/A';
                cmp = coa.localeCompare(cob, 'it');
                if (cmp !== 0) return cmp;
                return (a.prossima_scadenza || '9999-12-31').localeCompare(b.prossima_scadenza || '9999-12-31');
            })
            .map(function(s) {
                var c = getContrattoById(s.contratto_id);
                // Riferimento al canone: numero, periodo e importo della scadenza
                var canoneInfo = null;
                if (c) {
                    // Riferimento al canone: quello il cui periodo contiene la DATA DI
                    // PAGAMENTO della scadenza (prossima_scadenza), lo stesso usato dal
                    // Modello F24 nel Dettaglio Calcolo. Es. la scadenza del 18/10/2026
                    // riporta il canone 18/09/2026 -> 17/09/2027 perché quella data
                    // rientra in quel periodo.
                    var canone = getCanoneRiferimentoScadenza(s);
                    if (canone) {
                        var canoniC = getCanoniByContratto(c.id);
                        var idx = canoniC.indexOf(canone);
                        canoneInfo = 'Canone ' + (idx >= 0 ? (idx + 1) : '') +
                            ' · ' + formatDate(canone.data_inizio) + ' → ' + formatDate(canone.data_fine) +
                            ' · ' + formatCurrency(canone.importo);
                    }
                }
                var isCompletata = isScadenzaCompletata(s);
                return {
                    locLabel: c ? getLocatoriCognomeNomeLabel(c.id) : 'N/A',
                    condLabel: c ? getConduttoriCognomeNomeLabel(c.id) : 'N/A',
                    scadenza: s.prossima_scadenza,
                    urg: getScadenzaUrgenza(s),
                    completata: isCompletata,
                    scaduta: s.stato === 'scaduta',
                    dataCompletamento: s.data_completamento,
                    canoneInfo: canoneInfo,
                    actions: scadenzaF24Btn(s) + scadenzaDoneBtn(s),
                    restoreBtn: scadenzaRestoreBtn(s)
                };
            });
    }

    // La colonna Azioni (Completa / F24) esiste solo per le scadenze di
    // pagamento non archiviate; nella lista "Archiviate" c'è solo la colonna
    // Ripristina per riportare tra quelle da pagare una scadenza completata
    // per errore o scaduta e ancora da saldare.
    var hasAzioni = tipo === 'pagamenti' && statoFiltro !== 'archiviate';
    var hasRestore = tipo === 'pagamenti' && statoFiltro === 'archiviate';
    var azioniTh = document.getElementById('scadenzeAzioniTh');
    if (azioniTh) azioniTh.style.display = (hasAzioni || hasRestore) ? '' : 'none';

    function badgeHtml(it) {
        // Contratti scaduti/chiusi: al posto della prossima scadenza la
        // colonna mostra l'esito, in rosso per gli scaduti e in grigio per i
        // chiusi.
        if (tipo === 'contratti') {
            if (it.chiuso) {
                return '<span class="status-badge contratto-chiuso"><i class="fas fa-lock"></i> Chiuso il ' + formatDate(it.dataChiusura) + '</span>';
            }
            if (it.scaduto) {
                return '<span class="status-badge scaduto"><i class="fas fa-exclamation-circle"></i> Scaduto il ' + formatDate(it.scadenza) + '</span>';
            }
        }
        var proxHtml = formatDate(it.scadenza);
        if (it.completata) {
            // Scadenza archiviata e completata: badge verde con data di completamento
            proxHtml += ' <span class="status-badge attivo"><i class="fas fa-check"></i> Completata' +
                (it.dataCompletamento ? ' · ' + formatDate(it.dataCompletamento) : '') + '</span>';
        } else if (it.scaduta) {
            // Scadenza archiviata in automatico perché passata: badge rosso "Scaduta"
            proxHtml += ' <span class="status-badge scaduto"><i class="fas fa-exclamation-circle"></i> Scaduta</span>';
        } else if (it.urg) {
            proxHtml += ' <span class="status-badge ' + it.urg.type + '">' + it.urg.label + (it.urg.days > 0 ? ' · ' + it.urg.days + ' gg' : '') + '</span>';
        }
        if (it.canoneInfo) proxHtml += '<div class="scadenza-canone">' + it.canoneInfo + '</div>';
        return proxHtml;
    }

    var tbody = document.getElementById('scadenzeTableBody');
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="' + ((hasAzioni || hasRestore) ? 4 : 3) + '"><div class="empty-state"><i class="fas fa-calendar"></i><p>Nessuna scadenza trovata</p></div></td></tr>';
    } else {
        tbody.innerHTML = items.map(function(it) {
            var rowCls = it.urg ? ' alert-' + it.urg.type : (it.chiuso ? ' alert-chiusa' : (it.completata ? ' alert-completata' : (it.scaduta ? ' alert-scaduta' : '')));
            return '<tr' + (rowCls ? ' class="' + rowCls.trim() + '"' : '') + '>' +
                '<td>' + it.locLabel + '</td>' +
                '<td>' + it.condLabel + '</td>' +
                '<td>' + badgeHtml(it) + '</td>' +
                (hasAzioni ? '<td><div class="scadenza-actions">' + it.actions + '</div></td>' : '') +
                (hasRestore ? '<td><div class="scadenza-actions">' + (it.restoreBtn || '') + '</div></td>' : '') +
                '</tr>';
        }).join('');
    }
}



// --- Filter Listeners ---


// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    await loadAllData();
    renderNotifications();
    try { renderContratti(); } catch(e) { console.error('Contratti error:', e); }
});
