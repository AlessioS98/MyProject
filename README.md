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
| `Avvia Gestione Contratti.cmd`, `Ferma Gestione Contratti.cmd` | Avvio/arresto con doppio clic (Windows) |
| `Metti in rete.cmd` | Prepara l'uso dagli altri PC (vedi "Uso da più PC") |
| `Installa avvio automatico.cmd`, `Rimuovi avvio automatico.cmd`, `avvio-automatico.ps1` | Attiva/disattiva l'avvio del programma a ogni accesso a Windows |

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

### Avvio con doppio clic (Windows)

Nella cartella dell'app:

| File | Ruolo |
| --- | --- |
| `Avvia Gestione Contratti.cmd` | avvia il servizio MySQL se spento, avvia il server in background **senza finestra visibile** e apre il browser (con `/silent` non apre il browser) |
| `Ferma Gestione Contratti.cmd` | ferma il server (MySQL resta attivo) |
| `Metti in rete.cmd` | prepara i collegamenti nella cartella condivisa e apre la porta nel firewall (vedi sotto) |
| `Installa avvio automatico.cmd` | fa partire il programma da solo a ogni accesso a Windows |
| `Rimuovi avvio automatico.cmd` | toglie l'avvio automatico (stesso effetto di `Installa avvio automatico.cmd rimuovi`) |

Entrambi funzionano **da qualunque posizione della cartella**: se la sposti su
un'altra unità, la copi in un percorso con spazi o la apri da una condivisione
di rete, percorsi e configurazione (`.env`) vengono ricavati dalla cartella
dei file stessi, non dalla cartella di lavoro corrente.

Il server gira in background **senza finestra visibile**: non c'è nessuna
icona da tenere aperta e nessun "X" da chiudere per sbaglio. Per fermarlo usa
sempre `Ferma Gestione Contratti.cmd` (MySQL resta attivo).

Il **log del server** viene scritto fuori dalla cartella dell'app, in:

```
%LOCALAPPDATA%\Gestione Contratti Affitto\server.log
```

così l'avvio funziona anche se l'app sta in una cartella protetta come
`C:\Program Files` (dove un utente normale ha solo lettura e la scrittura del
log nella cartella dell'app farebbe fallire l'avvio del server senza spiegazioni).
Se `%LOCALAPPDATA%` non è disponibile il log finisce in
`%TEMP%\gestione-contratti-server.log`.

> In `C:\Program Files` l'installazione delle dipendenze (`npm install`, serve
> solo la prima volta o se manca la cartella `node_modules`) richiede di
> eseguire il file come amministratore; in alternativa sposta la cartella in
> una posizione utente (es. `C:\Gestione Contratti`), dove tutto funziona
> senza permessi speciali.

All'avvio il server verifica la connessione a MySQL: se il database non
esiste ancora lo crea da solo, ma **senza** lo schema importato (punto 1)
l'app segnalerà che le tabelle mancano.

Per verificare che MySQL sia raggiungibile: **http://localhost:3000/api/health**

## Uso da più PC (ufficio)

Il programma può stare su un solo PC e essere usato da tutti gli altri: il
server risponde già su tutta la rete locale e i PC client non devono
installare niente (basta il browser, sulla stessa rete).

Sul **PC principale** (quello che ospita il programma), una volta sola:

1. esegui `Metti in rete.cmd` — doppio clic, oppure trascina su di esso la
   cartella condivisa. Apre la porta 3000 nel firewall di Windows (serve una
   conferma di amministratore) e crea nella cartella condivisa:
   - `Gestione Contratti.url` → doppio clic: apre la pagina nel browser;
   - `Apri Gestione Contratti.cmd` → il file consigliato: apre la pagina e, se il
     PC principale non risponde, prova a **svegliarlo** (Wake-on-LAN) e
     **aspetta** fino a due minuti che sia pronto, poi apre la pagina da solo;
2. esegui `Installa avvio automatico.cmd` — crea un'attività di Windows che
   avvia MySQL e il server **a ogni accesso a Windows**, senza aprire il browser
   e senza chiedere conferme. Così gli altri PC lo trovano sempre pronto.
   Per toglierla fai **doppio clic su `Rimuovi avvio automatico.cmd`** (oppure,
   da un prompt dei comandi: `"Installa avvio automatico.cmd" rimuovi`).

Dagli altri PC l'indirizzo è:

```
http://NOME-DEL-PC:3000        (es. http://ALESSIO:3000)
```

Cose da tenere presenti:

- il server resta attivo finché il PC principale è acceso e l'utente collegato;
  con l'avvio automatico non serve più avviarlo a mano la mattina;
- se il PC principale si è solo **addormentato**, il file degli altri PC invia un
  segnale di risveglio. Perché funzioni il risveglio deve essere abilitato sul PC
  principale (Windows: scheda di rete → "Risveglio su LAN"; nel BIOS/UEFI:
  "Wake on LAN"), e in genere richiede la **rete via cavo** (spesso non funziona
  in Wi-Fi). Se non è abilitato, il file aspetta fino a due minuti e poi lo dice;
- se il PC è **proprio spento** nessuno può avviarlo da fuori: va acceso a mano
  (dopo pochi secondi la pagina si apre). L'alternativa è lasciarlo acceso negli
  orari di ufficio, con la sospensione disattivata almeno "solo a batteria";
- quando si apre `Apri Gestione Contratti.cmd` dalla cartella condivisa (percorso
  di rete) Windows può mostrare un avviso di cmd sui percorsi UNC: è normale e
  lo script funziona comunque;
- se il nome del PC non viene risolto dalla rete, usa l'indirizzo IP: lo script
  lo mostra alla fine (`http://192.168.x.x:3000`);
- i dati restano tutti sul PC principale (MySQL è lì): non c'è niente da
  sincronizzare tra i PC;
- la regola del firewall vale per qualsiasi tipo di rete, come richiesto: se il
  PC principale viene collegato a una rete pubblica (bar, hotel), i dispositivi
  di quella rete potrebbero raggiungere l'app, che non ha login. Per limitarla
  alle reti di casa/ufficio, sostituisci `profile=any` con `profile=private,domain`
  nella riga della regola dentro `Metti in rete.cmd`;
- per togliere l'apertura della porta, da un prompt come amministratore:
  `netsh advfirewall firewall delete rule name="Gestione Contratti Affitto - TCP 3000"`.

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
- I database già in uso **non** vanno ricreati da `schema.sql` (che fa DROP):
  le colonne aggiunte dopo la prima versione dello schema (oggi
  `canoni_annuali.a_carico_di`, il soggetto su cui grava l'imposta di
  registro: Locatore, Conduttore o 50%) vengono aggiunte automaticamente dal
  server all'avvio, se mancano.
- Il trigger MySQL `trg_scadenze_calc_dates_ins/upd` ricalcola
  `prossima_scadenza = data_decorrenza + 1 anno + 30 giorni`, come il
  vecchio trigger PostgreSQL.
- La colonna "Prossima Scadenza" della lista **Pagamenti** della pagina
  Scadenze mostra, per scelta, il giorno **prima** della scadenza effettiva
  (es. scadenza 11/11 mostrata come 10/11): il calcolo memorizzato nel
  database resta invariato (`getScadenzaDataMostrata`). Questa data è il
  riferimento anche per le **notifiche** della campanella e per la data in
  alto nel Modello F24, quindi il conto alla rovescia dei promemoria arriva
  fino al giorno mostrato in lista; i badge di urgenza della lista
  (`getScadenzaUrgenza`) continuano invece a usare la data effettiva del
  database. La lista **Contratti** non ha questo scarto: la colonna mostra la
  scadenza effettiva del contratto, la stessa usata dalle notifiche dei
  contratti.
- Le notifiche della campanella (promemoria a 30 giorni, 15 giorni e ultimi
  7 giorni, sia per le scadenze di pagamento sia per quelle dei contratti)
  non hanno pulsanti: si apre il pannello, si leggono e alla **chiusura del
  pannello** le notifiche mostrate vengono eliminate automaticamente.
  L'eliminazione resta legata alla data di riferimento e alla fascia: se la
  scadenza cambia, la notifica per la nuova data arriva regolarmente.
