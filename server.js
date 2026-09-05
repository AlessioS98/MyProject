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
require('dotenv').config();

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
  'contratto_conduttori'
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
