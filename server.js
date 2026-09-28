/* ============================================================
   Gestione Contratti di Affitto - Backend MySQL
   ============================================================
   Server Node.js/Express che:
   1. serve i file statici dell'app (index.html, app.js, ...);
   2. espone POST /api/query: un unico endpoint "semi-REST"
      usato da db-client.js (sostituto lato browser del vecchio
      client Supabase). Ogni richiesta viene tradotta in SQL
      parametrizzato eseguito su MySQL (solo le 7 tabelle
      dell'app, colonne validate contro information_schema).

   Avvio:  npm install   poi   npm start
   Configurazione connessione: file .env (vedi .env.example)
   Schema database: importa schema.sql in MySQL.
   ============================================================ */

const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');
// Il file .env viene letto dalla cartella dello script (__dirname), non dalla
// cartella di lavoro corrente: il server funziona cosi' anche se avviato da
// una posizione diversa (scorciatoia, altro terminale, npm start con path
// assoluto, unita' di rete).
require('dotenv').config({ path: path.join(__dirname, '.env') });

const PORT = parseInt(process.env.PORT || '3000', 10);
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'root';
const DB_NAME = (process.env.DB_NAME || 'gestione_contratti_affitto').replace(/`/g, '');

// Tabelle gestite dall'app (whitelist: nessuna altra tabella e' raggiungibile)
const TABLES = new Set([
  'anagrafica_persona',
  'immobili',
  'contratti',
  'scadenze',
  'canoni_annuali',
  'contratto_locatori',
  'contratto_conduttori',
  'contratto_immobili'
]);

// Pool di connessioni verso il database dell'app.
// dateStrings: DATE/DATETIME/TIMESTAMP tornano come stringhe (le date
//   'YYYY-MM-DD' vengono confrontate come stringhe dal frontend);
// decimalNumbers: i DECIMAL tornano come numeri, non stringhe.
const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4',
  dateStrings: true,
  decimalNumbers: true
});

// ------------------------------------------------------------------
// Cache delle colonne reali per tabella (da information_schema)
// ------------------------------------------------------------------
let meta = null; // { nomeTabella: [nomiColonne] }
let metaPromise = null;

async function loadMeta() {
  if (meta) return meta;
  if (!metaPromise) {
    metaPromise = (async () => {
      const [rows] = await pool.query(
        'SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.columns WHERE TABLE_SCHEMA = ?',
        [DB_NAME]
      );
      const m = {};
      rows.forEach((r) => {
        (m[r.TABLE_NAME] = m[r.TABLE_NAME] || []).push(r.COLUMN_NAME);
      });
      meta = m;
      return meta;
    })();
  }
  return metaPromise;
}

// ------------------------------------------------------------------
// Migrazioni leggere: colonne aggiunte dopo la prima versione dello schema
// ------------------------------------------------------------------
// I database gia' in uso non vengono ricreati da schema.sql (che fa DROP):
// le colonne nuove vengono aggiunte automaticamente all'avvio, se mancano.
// La cache delle colonne (meta) viene svuotata dopo un ALTER, cosi' il
// controllo dei nomi di colonna in /api/query vede subito la novita'.
const COLONNE_AGGIUNTE = [
  ['canoni_annuali', 'a_carico_di', "VARCHAR(20) NOT NULL DEFAULT '50'"]
];

// Tabelle introdotte dopo la prima versione dello schema: vengono create
// automaticamente all'avvio, cosi' un database gia' in uso non deve essere
// reinizializzato con schema.sql (che fa DROP di tutto).
const TABELLE_AGGIUNTE = [
  {
    nome: 'contratto_immobili',
    sql: 'CREATE TABLE IF NOT EXISTS `contratto_immobili` (' +
      '  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,' +
      '  `contratto_id` BIGINT UNSIGNED NULL,' +
      '  `immobile_id` BIGINT UNSIGNED NULL,' +
      '  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
      '  PRIMARY KEY (`id`),' +
      '  CONSTRAINT `fk_contratto_immobili_contratto` FOREIGN KEY (`contratto_id`) REFERENCES `contratti` (`id`) ON DELETE CASCADE,' +
      '  CONSTRAINT `fk_contratto_immobili_immobile` FOREIGN KEY (`immobile_id`) REFERENCES `immobili` (`id`) ON DELETE CASCADE' +
      ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  }
];

async function ensureTabella(tabella, sql) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS n FROM information_schema.tables ' +
    'WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    [DB_NAME, tabella]
  );
  if (rows[0] && rows[0].n > 0) return false;
  await pool.query(sql);
  meta = null;
  metaPromise = null;
  return true;
}

async function ensureColonna(tabella, colonna, definizione) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS n FROM information_schema.columns ' +
    'WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [DB_NAME, tabella, colonna]
  );
  if (rows[0] && rows[0].n > 0) return false;
  await pool.query('ALTER TABLE `' + tabella + '` ADD COLUMN `' + colonna + '` ' + definizione);
  meta = null;
  metaPromise = null;
  return true;
}

// ------------------------------------------------------------------
// Errori "amichevoli" (il messaggio arriva al frontend in error.message)
// ------------------------------------------------------------------
function apiErr(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function isConnRefused(e) {
  return /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|PROTOCOL_CONNECTION_LOST|ER_CONN_/i.test(e.code || '') ||
         /ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(e.message || '');
}

function dbError(e) {
  if (isConnRefused(e)) {
    return apiErr(503,
      'Impossibile connettersi a MySQL su ' + DB_HOST + ':' + DB_PORT +
      '. Controlla che il servizio MySQL sia avviato e le credenziali nel file .env.');
  }
  const msg = (e && e.message) ? e.message : String(e);
  if (/ER_BAD_DB_ERROR|Unknown database/i.test(msg)) {
    return apiErr(503,
      'Database "' + DB_NAME + '" non trovato su MySQL. ' +
      'Importa il file schema.sql (crea database, tabelle e dati di esempio), poi riavvia.');
  }
  return apiErr(500, 'Errore database: ' + msg);
}

// ------------------------------------------------------------------
// Costruzione SQL parametrizzata (mai concatenare valori utente)
// ------------------------------------------------------------------
function sanitize(v) {
  if (v === true) return 1;
  if (v === false) return 0;
  return v;
}

function assertColumn(cols, name) {
  if (!cols.includes(name)) {
    throw apiErr(400, 'Colonna non riconosciuta: ' + name);
  }
}

function resolveColumns(cols, columnsStr) {
  const names = (!columnsStr || columnsStr === '*')
    ? cols.slice()
    : String(columnsStr).split(',').map((s) => s.trim()).filter(Boolean);
  if (names.length === 0) names.push(...cols);
  names.forEach((n) => assertColumn(cols, n));
  return names.map((n) => '`' + n + '`').join(', ');
}

function buildWhere(cols, filters) {
  const clauses = [];
  const vals = [];
  (filters || []).forEach((f) => {
    if (!f || typeof f.col !== 'string') {
      throw apiErr(400, 'Filtro non valido nella richiesta');
    }
    assertColumn(cols, f.col);
    if (f.op === 'eq') {
      clauses.push('`' + f.col + '` = ?');
      vals.push(sanitize(f.val));
    } else if (f.op === 'in') {
      const arr = Array.isArray(f.val) ? f.val : [];
      if (arr.length === 0) {
        clauses.push('1 = 0'); // nessun valore: nessuna riga corrisponde
      } else {
        clauses.push('`' + f.col + '` IN (' + arr.map(() => '?').join(', ') + ')');
        arr.forEach((v) => vals.push(sanitize(v)));
      }
    } else {
      throw apiErr(400, 'Operatore di filtro non supportato: ' + f.op);
    }
  });
  return { sql: clauses.length ? ' WHERE ' + clauses.join(' AND ') : '', vals };
}

function toInsertRows(d) {
  if (d == null) return [];
  return Array.isArray(d) ? d : [d];
}

// ------------------------------------------------------------------
// Esecuzione delle operazioni
// ------------------------------------------------------------------
async function tableColumns(table) {
  let m;
  try {
    m = await loadMeta();
  } catch (e) {
    throw dbError(e);
  }
  const cols = m[table];
  if (!cols || cols.length === 0) {
    throw apiErr(503,
      'Tabella "' + table + '" non trovata nel database "' + DB_NAME + '". ' +
      'Importa il file schema.sql in MySQL e riavvia il server.');
  }
  return cols;
}

async function doSelect(table, cols, columnsStr, filters) {
  const colList = resolveColumns(cols, columnsStr);
  const where = buildWhere(cols, filters);
  const sql = 'SELECT ' + colList + ' FROM `' + table + '`' + where.sql + ' ORDER BY `id`';
  const [rows] = await pool.query(sql, where.vals);
  return rows;
}

async function doInsert(table, cols, columnsStr, data) {
  const rowsIn = toInsertRows(data);
  if (rowsIn.length === 0) return [];

  const keys = Array.from(new Set(rowsIn.flatMap((r) => Object.keys(r || {}))))
    .filter(Boolean);
  if (keys.length === 0) {
    throw apiErr(400, 'Nessun campo da inserire');
  }
  keys.forEach((k) => assertColumn(cols, k));

  const colList = keys.map((k) => '`' + k + '`').join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  const values = rowsIn.map((r) => keys.map((k) => sanitize(r[k])));

  const sql = 'INSERT INTO `' + table + '` (' + colList + ') VALUES ' +
    values.map(() => '(' + placeholders + ')').join(', ');
  const [ins] = await pool.query(sql, values.flat());

  // L'inserimento puo' avere colonne calcolate dal trigger (es.
  // prossima_scadenza): rilegge le righe inserite con i dati finali.
  if (!ins.insertId || values.length === 0) return [];
  const first = ins.insertId;
  const last = first + values.length - 1;
  const backCols = resolveColumns(cols, columnsStr);
  const [selRows] = await pool.query(
    'SELECT ' + backCols + ' FROM `' + table + '` WHERE `id` BETWEEN ? AND ? ORDER BY `id`',
    [first, last]
  );
  return selRows;
}

async function doUpdate(table, cols, data, filters) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw apiErr(400, 'Dati di aggiornamento non validi');
  }
  const keys = Object.keys(data).filter(Boolean);
  if (keys.length === 0) {
    throw apiErr(400, 'Nessun campo da aggiornare');
  }
  keys.forEach((k) => assertColumn(cols, k));
  const setSql = keys.map((k) => '`' + k + '` = ?').join(', ');
  const where = buildWhere(cols, filters);
  const sql = 'UPDATE `' + table + '` SET ' + setSql + where.sql;
  const vals = keys.map((k) => sanitize(data[k])).concat(where.vals);
  const [res] = await pool.query(sql, vals);
  return { affectedRows: res.affectedRows };
}

async function doDelete(table, cols, filters) {
  const where = buildWhere(cols, filters);
  const sql = 'DELETE FROM `' + table + '`' + where.sql;
  const [res] = await pool.query(sql, where.vals);
  return { affectedRows: res.affectedRows };
}

async function handleQuery(body) {
  if (!body || typeof body !== 'object') throw apiErr(400, 'Richiesta non valida');
  const table = body.table;
  if (!TABLES.has(table)) throw apiErr(400, 'Tabella non consentita: ' + table);

  const cols = await tableColumns(table);
  const columnsStr = body.columns || '*';
  const filters = body.filters;

  switch (body.op) {
    case 'select':
      return { data: await doSelect(table, cols, columnsStr, filters) };
    case 'insert':
      return { data: await doInsert(table, cols, columnsStr, body.data) };
    case 'update':
      return { data: null, ...(await doUpdate(table, cols, body.data, filters)) };
    case 'delete':
      return { data: null, ...(await doDelete(table, cols, filters)) };
    default:
      throw apiErr(400, 'Operazione non supportata: ' + body.op);
  }
}

// ------------------------------------------------------------------
// Backup del database
// ------------------------------------------------------------------
// Il backup e' un unico file .sql (dump completo: struttura, dati e trigger),
// che il pulsante "Effettua Backup" dell'app scarica dal browser.

function nomeTabella(id) {
  return '`' + String(id).replace(/`/g, '') + '`';
}

// Nome del file scaricato, es. backup_gestione-contratti_2026-09-27_1530.sql
function nomeFileBackup(estensione) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const data = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  const ora = p(d.getHours()) + p(d.getMinutes());
  return 'backup_gestione-contratti_' + data + '_' + ora + '.' + estensione;
}

async function elencoTabelle() {
  const [rows] = await pool.query(
    "SELECT TABLE_NAME FROM information_schema.tables " +
    "WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
    [DB_NAME]
  );
  return rows.map((r) => r.TABLE_NAME);
}

// Valore trasformato in letterale SQL, con l'escape corretto per MySQL.
function letteraleSql(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (Buffer.isBuffer(v)) return '0x' + v.toString('hex');
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return "'" + v.getFullYear() + '-' + p(v.getMonth() + 1) + '-' + p(v.getDate()) + ' ' +
      p(v.getHours()) + ':' + p(v.getMinutes()) + ':' + p(v.getSeconds()) + "'";
  }
  return "'" + String(v)
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z')
    .replace(/'/g, "\\'") + "'";
}

// Dump .sql: per ogni tabella DROP + CREATE (da SHOW CREATE TABLE) + INSERT.
async function buildSqlDump() {
  const tabelle = await elencoTabelle();
  const out = [];

  out.push('-- ============================================================');
  out.push('-- Backup database `' + DB_NAME + '`');
  out.push('-- Generato il ' + new Date().toLocaleString('it-IT'));
  out.push('--');
  out.push('-- Per ripristinare i dati importa questo file in MySQL:');
  out.push('--   riga di comando:  mysql -u root -p < ' + nomeFileBackup('sql'));
  out.push('--   oppure:          phpMyAdmin / MySQL Workbench -> Importa');
  out.push('-- Il database viene creato automaticamente se non esiste.');
  out.push('-- Contiene tutte le tabelle del database con tutti i loro dati e i trigger.');
  out.push('-- ATTENZIONE: le tabelle esistenti vengono sostituite dai dati del backup.');
  out.push('-- ============================================================');
  out.push('');
  out.push('SET NAMES utf8mb4;');
  // Crea (se manca) e seleziona il database: cosi' il file si importa anche
  // su un server nuovo, con un solo comando.
  out.push('CREATE DATABASE IF NOT EXISTS ' + nomeTabella(DB_NAME) +
    ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
  out.push('USE ' + nomeTabella(DB_NAME) + ';');
  out.push('');
  out.push('SET FOREIGN_KEY_CHECKS = 0;');
  out.push('');

  for (const t of tabelle) {
    const [ddlRows] = await pool.query('SHOW CREATE TABLE ' + nomeTabella(t));
    const ddl = ddlRows[0] && (ddlRows[0]['Create Table'] || ddlRows[0]['Create View']);
    if (!ddl) continue;

    out.push('-- ------------------------------------------------------------');
    out.push('-- Tabella `' + t + '`');
    out.push('-- ------------------------------------------------------------');
    out.push('DROP TABLE IF EXISTS ' + nomeTabella(t) + ';');
    out.push(ddl + ';');

    const [righe] = await pool.query('SELECT * FROM ' + nomeTabella(t));
    if (righe.length > 0) {
      const colonne = Object.keys(righe[0]);
      const colList = colonne.map(nomeTabella).join(', ');
      const CHUNK = 100; // blocchi da 100 righe, file piu' leggibile
      for (let i = 0; i < righe.length; i += CHUNK) {
        const blocco = righe.slice(i, i + CHUNK);
        out.push('INSERT INTO ' + nomeTabella(t) + ' (' + colList + ') VALUES');
        out.push(blocco
          .map((r) => '(' + colonne.map((c) => letteraleSql(r[c])).join(', ') + ')')
          .join(',\n') + ';');
      }
    }
    out.push('');
  }

  // Trigger: non sono inclusi in SHOW CREATE TABLE, quindi vanno salvati a
  // parte. Vengono ricreati DOPO i dati, cosi' le INSERT del backup non li
  // fanno scattare (i valori salvati restano quelli del momento del backup).
  let trigger = [];
  try {
    const [rows] = await pool.query('SHOW TRIGGERS FROM ' + nomeTabella(DB_NAME));
    trigger = rows;
  } catch (e) {
    console.warn('Backup: impossibile leggere i trigger (' + (e.message || e) + ')');
  }
  if (trigger.length > 0) {
    out.push('-- ------------------------------------------------------------');
    out.push('-- Trigger (' + trigger.length + ')');
    out.push('-- ------------------------------------------------------------');
    // Il corpo del trigger contiene ';', quindi serve un delimitatore diverso
    // (come fa mysqldump): capito da mysql da riga di comando e da phpMyAdmin.
    out.push('DELIMITER $$');
    for (const t of trigger) {
      // Il nome del trigger puo' arrivare con maiuscole diverse (Trigger/TRIGGER)
      const nome = t.Trigger || t.TRIGGER || t.trigger;
      let crea = t['SQL Original Statement'] || t['Create Trigger'] || t['CREATE TRIGGER'] || '';
      // Il DEFINER (es. `root`@`localhost`) viene tolto: cosi' il backup si
      // importa anche con un utente MySQL diverso da quello che l'ha creato.
      crea = crea.replace(/DEFINER=\S+\s*/i, '');
      if (!nome || !crea) continue;
      out.push('DROP TRIGGER IF EXISTS ' + nomeTabella(nome) + '$$');
      out.push(crea + '$$');
    }
    out.push('DELIMITER ;');
    out.push('');
  }

  out.push('SET FOREIGN_KEY_CHECKS = 1;');
  out.push('');
  return out.join('\n');
}

// ------------------------------------------------------------------
// App Express
// ------------------------------------------------------------------
const app = express();
app.use(express.json({ limit: '1mb' }));

// Health check utile per verificare che MySQL sia raggiungibile
app.get('/api/health', async (req, res) => {
  try {
    const [[r]] = await pool.query('SELECT VERSION() AS v');
    res.json({ ok: true, db: 'mysql', version: r.v, database: DB_NAME });
  } catch (e) {
    res.json({ ok: false, db: 'mysql', error: dbError(e).message });
  }
});

app.post('/api/query', async (req, res) => {
  try {
    const out = await handleQuery(req.body);
    res.json(out);
  } catch (e) {
    if (e.status !== 503 && e.status !== 400) console.error('Errore API /api/query:', e);
    res.status(e.status || 500).json({ error: e.message || String(e) });
  }
});

// Backup: scarica il dump .sql completo del database (struttura + dati)
app.get('/api/backup/sql', async (req, res) => {
  try {
    const dump = await buildSqlDump();
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + nomeFileBackup('sql') + '"');
    res.send(dump);
  } catch (e) {
    console.error('Errore backup SQL:', e);
    const d = dbError(e);
    res.status(d.status || 503).json({ error: d.message });
  }
});

// Errori JSON malformati in ingresso
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'JSON non valido nella richiesta' });
    return;
  }
  next(err);
});

// File statici dell'app (stessa origin: nessun problema di CORS)
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log('==============================================');
  console.log('  Gestione Contratti di Affitto - MySQL');
  console.log('  Apri l\'app su:  http://localhost:' + PORT);
  console.log('==============================================');
});

// All'avvio: crea il database se manca e verifica la connessione
(async () => {
  try {
    const boot = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD
    });
    await boot.query(
      'CREATE DATABASE IF NOT EXISTS `' + DB_NAME + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    await boot.end();
    const [[r]] = await pool.query('SELECT VERSION() AS v');
    console.log('Connesso a MySQL ' + r.v + ' (database: ' + DB_NAME + ')');
    // Aggiunge le colonne introdotte dopo l'importazione iniziale dello schema
    for (const [tabella, colonna, definizione] of COLONNE_AGGIUNTE) {
      try {
        if (await ensureColonna(tabella, colonna, definizione)) {
          console.log('Aggiunta colonna ' + tabella + '.' + colonna + ' al database.');
        }
      } catch (e) {
        console.warn('ATTENZIONE: impossibile aggiungere ' + tabella + '.' + colonna +
          '. Importa lo schema aggiornato (' + (e.message || e) + ')');
      }
    }
    // Crea le tabelle introdotte dopo l'importazione iniziale dello schema
    for (const t of TABELLE_AGGIUNTE) {
      try {
        if (await ensureTabella(t.nome, t.sql)) {
          console.log('Creata tabella ' + t.nome + ' nel database.');
        }
      } catch (e) {
        console.warn('ATTENZIONE: impossibile creare la tabella ' + t.nome +
          '. Importa lo schema aggiornato (' + (e.message || e) + ')');
      }
    }
    try {
      const m = await loadMeta();
      const nTables = Object.keys(m).length;
      if (nTables === 0) {
        console.warn('ATTENZIONE: il database "' + DB_NAME + '" non contiene le tabelle dell\'app.');
        console.warn('Importa il file schema.sql in MySQL, poi riavvia il server.');
      } else {
        console.log('Tabelle trovate (' + nTables + '): l\'app e\' pronta.');
      }
    } catch (metaErr) {
      console.warn('ATTENZIONE: tabelle non verificate (' + metaErr.message + ')');
    }
  } catch (e) {
    console.warn('MySQL non raggiungibile su ' + DB_HOST + ':' + DB_PORT + ' (' + (e.message || e) + ')');
    console.warn('Avvia MySQL e importa il file schema.sql, poi riavvia il server.');
  }
})();
