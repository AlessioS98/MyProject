/* ============================================================
   db-client.js - Client database (MySQL)
   ============================================================
   Sostituto "drop-in" del vecchio client Supabase per l'insieme
   di operazioni usato da app.js:
     db.from(tabella)
       .select(colonne) | .insert(dati) | .update(dati) | .delete()
       .eq(colonna, valore) | .in(colonna, valori)
       .single()
     -> Promise che risolve { data, error } come supabase-js v2.

   Ogni operazione viene inviata a POST /api/query di server.js,
   che la traduce in SQL parametrizzato eseguito su MySQL.
   ============================================================ */

(function (global) {
  'use strict';

  var API_ENDPOINT = (global.API_BASE || '') + '/api/query';

  // ------------------------------------------------------------
  // QueryBuilder: catena stile supabase, "thenable" (si puo' awaitare)
  // ------------------------------------------------------------
  function QueryBuilder(table) {
    this._table = table;
    this._op = null;        // 'select' | 'insert' | 'update' | 'delete'
    this._columns = '*';    // colonne richieste in uscita
    this._data = null;      // righe da inserire o campi da aggiornare
    this._filters = [];     // [{ col, op: 'eq'|'in', val }]
    this._single = false;   // .single()
  }

  QueryBuilder.prototype.select = function (cols) {
    if (this._op === null) this._op = 'select';
    this._columns = (cols === undefined || cols === null) ? '*' : String(cols);
    return this;
  };

  QueryBuilder.prototype.insert = function (data) {
    this._op = 'insert';
    this._data = data;
    return this;
  };

  QueryBuilder.prototype.update = function (data) {
    this._op = 'update';
    this._data = data;
    return this;
  };

  QueryBuilder.prototype.delete = function () {
    this._op = 'delete';
    this._data = null;
    return this;
  };

  QueryBuilder.prototype.eq = function (col, val) {
    this._filters.push({ col: col, op: 'eq', val: val });
    return this;
  };

  QueryBuilder.prototype.in = function (col, vals) {
    this._filters.push({ col: col, op: 'in', val: vals });
    return this;
  };

  QueryBuilder.prototype.single = function () {
    this._single = true;
    return this;
  };

  // Rimuove i campi undefined (JSON non li trasmetterebbe comunque):
  // evita differenze tra client e server nella lettura dei campi.
  function cleanRow(row) {
    var out = {};
    if (!row) return out;
    Object.keys(row).forEach(function (k) {
      if (row[k] !== undefined) out[k] = row[k];
    });
    return out;
  }

  QueryBuilder.prototype._buildPayload = function () {
    var payload = {
      table: this._table,
      op: this._op,
      columns: this._columns,
      filters: this._filters
    };
    if (this._op === 'insert') {
      var arr = Array.isArray(this._data) ? this._data : [this._data];
      payload.data = arr.filter(Boolean).map(cleanRow);
    } else if (this._op === 'update' && this._data) {
      payload.data = cleanRow(this._data);
    }
    return payload;
  };

  QueryBuilder.prototype._execute = async function () {
    var payload = this._buildPayload();

    var res;
    try {
      res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (netErr) {
      return {
        data: null,
        error: {
          message: 'Impossibile contattare il server: ' + (netErr && netErr.message ? netErr.message : netErr) +
                   '. Avvia il backend con "npm start" e apri http://localhost:3000'
        }
      };
    }

    var json = null;
    try {
      json = await res.json();
    } catch (e) {
      json = null;
    }

    if (!res.ok) {
      if (!json) {
        // Nessuna risposta JSON: l'app e' stata aperta su un server di soli
        // file statici (es. Live Server di VS Code, porta 8080) che non
        // conosce l'endpoint /api/query del backend MySQL.
        return {
          data: null,
          error: {
            message: 'Questa pagina e\' servita da un server che non include il backend ' +
                     '(HTTP ' + res.status + ' su ' + API_ENDPOINT + ').\n' +
                     'Avvia il backend con "npm start" e apri l\'app su http://localhost:3000'
          }
        };
      }
      return { data: null, error: { message: json.error || ('Errore del server (' + res.status + ')') } };
    }
    if (!json) {
      return { data: null, error: { message: 'Risposta non valida dal server' } };
    }
    if (json.error) {
      return { data: null, error: { message: json.error } };
    }

    // update/delete senza .select(): nessun dato in uscita (come supabase)
    if (json.data === null || json.data === undefined) {
      return { data: null, error: null };
    }

    var rows = Array.isArray(json.data) ? json.data : [];
    if (this._single) {
      if (rows.length === 1) return { data: rows[0], error: null };
      if (rows.length === 0) return { data: null, error: { message: 'Nessuna riga trovata' } };
      return { data: null, error: { message: 'Sono state restituite più righe' } };
    }
    return { data: rows, error: null };
  };

  // "Thenable": consente `await db.from(...).select('*')` e l'uso
  // dentro Promise.all, risolvendo { data, error } come supabase-js.
  QueryBuilder.prototype.then = function (onFulfilled, onRejected) {
    return this._execute().then(onFulfilled, onRejected);
  };

  QueryBuilder.prototype.catch = function (onRejected) {
    return this._execute().catch(onRejected);
  };

  // ------------------------------------------------------------
  // Client principale
  // ------------------------------------------------------------
  function MySqlDb() {}

  MySqlDb.prototype.from = function (table) {
    return new QueryBuilder(table);
  };

  global.MySqlDb = MySqlDb;

  if (global.location && global.location.protocol === 'file:') {
    console.error(
      'db-client.js: l\'app non puo\' essere aperta come file locale (' + global.location.href + ').\n' +
      'Avvia il server con "npm start" e apri http://localhost:3000'
    );
  }
})(window);
