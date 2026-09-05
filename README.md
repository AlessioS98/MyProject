# Gestione Contratti di Affitto

Applicazione web per la gestione dei contratti di affitto, migrata da
**Supabase (PostgreSQL)** a **MySQL**, con un piccolo backend Node.js/Express
che serve l'app e parla con il database.

## Struttura

| File | Ruolo |
| --- | --- |
| `schema.sql` | Schema **MySQL** (crea database, tabelle, trigger e dati di esempio) |
| `server.js` | Backend Express: file statici + API `POST /api/query` verso MySQL |
| `db-client.js` | Sostituto lato browser del vecchio client Supabase |
| `app.js`, `index.html`, `styles.css` | Frontend (invariato nella logica) |
| `.env` | Credenziali di connessione a MySQL |

## Requisiti

- [Node.js](https://nodejs.org) >= 18 (già presente su questa macchina: v22)
- Un server **MySQL** in esecuzione in locale (es. XAMPP, WAMP, MySQL
  standalone, Docker). Il file `schema.sql` è scritto per MySQL 8.x.

## Installazione (una tantum)

1. **Crea il database e le tabelle.** Importa `schema.sql` in MySQL con uno
   di questi metodi:
   - riga di comando: `mysql -u root -p < schema.sql`
   - phpMyAdmin / MySQL Workbench: apri il file ed esegui tutto il contenuto

   Il file crea il database `gestione_contratti_affitto` con le tabelle, i
   trigger e i dati di esempio. **Attenzione:** ricrea le tabelle da zero
   (DROP + CREATE): eseguilo su un database vuoto o da reinizializzare.
   I dati ancora presenti su Supabase non vengono migrati automaticamente.

2. **Configura le credenziali.** Copia `.env.example` in `.env` (il file
   `.env` con i valori predefiniti è già presente) e correggi se necessario
   host, porta, utente, password del tuo MySQL:

   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=gestione_contratti_affitto
   PORT=3000
   ```

3. **Installa le dipendenze** (una volta sola):

   ```bash
   npm install
   ```

## Avvio

```bash
npm start
```

Poi apri il browser su: **http://localhost:3000**

All'avvio il server verifica la connessione a MySQL: se il database non
esiste ancora lo crea da solo, ma **senza** lo schema importato (punto 1)
l'app segnalerà che le tabelle mancano.

Per verificare che MySQL sia raggiungibile: **http://localhost:3000/api/health**

## Note tecniche

- L'app **non** può più essere aperta come semplice file locale
  (`file://`): il browser non può parlare direttamente con MySQL, serve il
  backend (`npm start`).
- `db-client.js` replica, solo per le operazioni usate dall'app
  (`select`/`insert`/`update`/`delete`, filtri `eq`/`in`, `.single()`),
  l'interfaccia di supabase-js: ogni chiamata risolve `{ data, error }`.
- `server.js` accetta solo le 7 tabelle dell'app e valida ogni nome di
  colonna contro `information_schema`; tutti i valori passano da query SQL
  parametrizzate (niente concatenazione di valori utente).
- Il trigger MySQL `trg_scadenze_calc_dates_ins/upd` ricalcola
  `prossima_scadenza = data_decorrenza + 1 anno + 30 giorni`, come il
  vecchio trigger PostgreSQL.
