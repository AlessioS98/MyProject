// ============================================================
//  Gestione Contratti di Affitto - svuota il database (Windows)
//
//  Lo lancia "Svuota database.cmd" (doppio clic su quel file):
//  non serve eseguirlo a mano.
//
//  Cosa fa: elimina TUTTI i dati delle tabelle dell'app con
//  TRUNCATE, lasciando intatti struttura, colonne, indici,
//  vincoli, trigger e viste. Gli AUTO_INCREMENT ripartono da 1.
//
//  Come si connette: legge lo stesso file .env (e gli stessi
//  valori predefiniti) di server.js, quindi non c'e' niente da
//  configurare qui.
//
//  Uso:
//    node svuota-db.js          mostra le righe e chiede conferma
//                               (si deve scrivere SVUOTA)
//    node svuota-db.js --yes    nessuna domanda (per script)
//
//  Esiti restituiti al file .cmd:
//    0 = database svuotato (o gia' vuoto)
//    1 = errore
//    2 = annullato dall'utente
// ============================================================
require('dotenv').config();

const mysql = require('mysql2/promise');
const readline = require('node:readline');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'root';
const DB_NAME = (process.env.DB_NAME || 'gestione_contratti_affitto').replace(/`/g, '');

const CONFERMA = 'SVUOTA';

function nomeTabella(nome) {
    return '`' + String(nome).replace(/`/g, '') + '`';
}

function chiediConferma() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(function (resolve) {
        rl.question('  Per confermare scrivi ' + CONFERMA + ' e premi Invio: ', function (risposta) {
            rl.close();
            resolve(String(risposta || '').trim().toUpperCase());
        });
    });
}

async function main() {
    const senzaDomande = process.argv.includes('--yes') || process.argv.includes('-y');

    let conn;
    try {
        conn = await mysql.createConnection({
            host: DB_HOST,
            port: DB_PORT,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME
        });
    } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        if (/ECONNREFUSED/i.test(msg)) {
            console.error('  [ERRORE] MySQL non risponde su ' + DB_HOST + ':' + DB_PORT + '.');
            console.error('  Avvia MySQL (oppure "Avvia Gestione Contratti.cmd") e riprova.');
        } else if (/ER_BAD_DB_ERROR|Unknown database/i.test(msg)) {
            console.error('  [ERRORE] Il database "' + DB_NAME + '" non esiste.');
            console.error('  Importa schema.sql una volta, poi riprova.');
        } else if (/ER_ACCESS_DENIED/i.test(msg)) {
            console.error('  [ERRORE] Utente o password di MySQL non validi: controlla il file .env.');
        } else {
            console.error('  [ERRORE] Connessione a MySQL fallita: ' + msg);
        }
        process.exit(1);
    }

    try {
        // Solo le tabelle vere: le viste non si toccano.
        const [tabelle] = await conn.query(
            'SELECT TABLE_NAME AS nome FROM information_schema.TABLES ' +
            'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = ? ORDER BY TABLE_NAME',
            ['BASE TABLE']
        );

        if (tabelle.length === 0) {
            console.error('  [ERRORE] Il database "' + DB_NAME + '" non contiene tabelle.');
            console.error('  Importa schema.sql una volta, poi riprova.');
            await conn.end();
            process.exit(1);
        }

        const conteggi = [];
        let totale = 0;
        for (const t of tabelle) {
            const [r] = await conn.query('SELECT COUNT(*) AS n FROM ' + nomeTabella(t.nome));
            const n = Number(r[0].n) || 0;
            totale += n;
            conteggi.push({ nome: t.nome, righe: n });
        }

        console.log('  Database: ' + DB_NAME + '  (' + DB_HOST + ':' + DB_PORT + ')');
        console.log('');
        console.log('  Tabelle: ' + conteggi.length + '   Righe da eliminare: ' + totale);
        conteggi.forEach(function (c) {
            console.log('    - ' + c.nome + ': ' + c.righe + ' righe');
        });
        console.log('');

        if (totale === 0) {
            console.log('  Il database e\' gia\' vuoto: nessuna modifica.');
            await conn.end();
            process.exit(0);
        }

        if (!senzaDomande) {
            console.log('  ATTENZIONE: i dati vengono eliminati e non si possono recuperare.');
            console.log('  Se non hai ancora fatto un backup, annulla e usa il pulsante');
            console.log('  "Effettua Backup" nell\'app: scarica un file .sql con tutti i dati.');
            console.log('');
            const risposta = await chiediConferma();
            if (risposta !== CONFERMA) {
                console.log('');
                console.log('  Annullato: nessuna modifica al database.');
                await conn.end();
                process.exit(2);
            }
            console.log('');
        }

        // I controlli di chiave esterna bloccherebbero TRUNCATE sulle tabelle
        // collegate: si spengono per questa connessione e si riaccendono dopo.
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const c of conteggi) {
            try {
                await conn.query('TRUNCATE TABLE ' + nomeTabella(c.nome));
                console.log('  [OK] ' + c.nome + ': ' + c.righe + ' righe eliminate');
            } catch (e) {
                throw new Error('tabella ' + c.nome + ': ' + ((e && e.message) ? e.message : e));
            }
        }
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('');
        console.log('  Fatto: ' + conteggi.length + ' tabelle svuotate, struttura intatta.');
        console.log('  Se l\'app e\' aperta nel browser, ricarica la pagina con Ctrl+F5.');
        await conn.end();
        process.exit(0);

    } catch (e) {
        // Rete di sicurezza: la connessione viene chiusa subito dopo.
        try { await conn.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (e2) { /* niente */ }
        try { await conn.end(); } catch (e2) { /* niente */ }
        console.error('');
        console.error('  [ERRORE] Svuotamento interrotto (' + ((e && e.message) ? e.message : e) + ').');
        console.error('  La struttura delle tabelle e\' intatta: rilancia il file per completare.');
        process.exit(1);
    }
}

main();
