-- =============================================
-- SCHEMA DATABASE: Gestione Contratti Affitto
-- Versione MySQL 8.x (migrato da Supabase/PostgreSQL)
--
-- Come importarlo:
--   opzione 1 (riga di comando):
--     mysql -u root -p < schema.sql
--   opzione 2 (phpMyAdmin / MySQL Workbench):
--     apri il file ed esegui tutto il contenuto
--
-- ATTENZIONE: il file RICREA da zero le tabelle
-- (DROP + CREATE) e reinserisce i dati di esempio:
-- va eseguito su un database vuoto o da reinizializzare.
-- I dati eventualmente ancora presenti su Supabase non
-- vengono migrati automaticamente.
-- =============================================

CREATE DATABASE IF NOT EXISTS gestione_contratti_affitto
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gestione_contratti_affitto;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS contratto_conduttori;
DROP TABLE IF EXISTS contratto_locatori;
DROP TABLE IF EXISTS canoni_annuali;
DROP TABLE IF EXISTS scadenze;
DROP TABLE IF EXISTS contratti;
DROP TABLE IF EXISTS immobili;
DROP TABLE IF EXISTS anagrafica_persona;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Anagrafica Persona
CREATE TABLE anagrafica_persona (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(255) NOT NULL,
  cognome VARCHAR(255) NOT NULL,
  codice_fiscale VARCHAR(16) NULL,
  ragione_sociale VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Immobili
CREATE TABLE immobili (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  indirizzo VARCHAR(255) NOT NULL,
  citta VARCHAR(255) NOT NULL,
  foglio VARCHAR(16) NULL,
  particella VARCHAR(16) NULL,
  sub VARCHAR(16) NULL,
  ape TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Contratti
-- (la tassazione non vive piu' qui: per OGNI canone annuale in canoni_annuali)
CREATE TABLE contratti (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identificativo VARCHAR(100) NOT NULL,
  data_decorrenza DATE NULL,
  data_scadenza DATE NULL,
  data_scadenza_rinnovo DATE NULL,
  data_chiusura DATE NULL,
  locatore_id BIGINT UNSIGNED NULL,
  conduttore_id BIGINT UNSIGNED NULL,
  immobile_id BIGINT UNSIGNED NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_contratti_locatore  FOREIGN KEY (locatore_id)  REFERENCES anagrafica_persona (id) ON DELETE SET NULL,
  CONSTRAINT fk_contratti_conduttore FOREIGN KEY (conduttore_id) REFERENCES anagrafica_persona (id) ON DELETE SET NULL,
  CONSTRAINT fk_contratti_immobile   FOREIGN KEY (immobile_id)   REFERENCES immobili (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Scadenze
CREATE TABLE scadenze (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contratto_id BIGINT UNSIGNED NULL,
  data_decorrenza DATE NOT NULL,
  prossima_scadenza DATE NULL,
  importo DECIMAL(14,2) NOT NULL DEFAULT 0,
  stato VARCHAR(20) NOT NULL DEFAULT 'in-attesa',
  data_completamento DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_scadenze_contratto FOREIGN KEY (contratto_id) REFERENCES contratti (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Canoni Annuali (legati ai contratti)
CREATE TABLE canoni_annuali (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contratto_id BIGINT UNSIGNED NULL,
  importo DECIMAL(14,2) NOT NULL DEFAULT 0,
  data_inizio DATE NULL,
  data_fine DATE NULL,
  note TEXT NULL,
  tassazione_cedolare_secca TINYINT(1) NOT NULL DEFAULT 0,
  percentuale DECIMAL(14,2) NOT NULL DEFAULT 0,
  valore_assoluto DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_canoni_contratto FOREIGN KEY (contratto_id) REFERENCES contratti (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabelle ponte per Locatori e Conduttori multipli
CREATE TABLE contratto_locatori (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contratto_id BIGINT UNSIGNED NULL,
  persona_id BIGINT UNSIGNED NULL,
  data_decorrenza DATE NULL,
  data_chiusura DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_locatori_contratto FOREIGN KEY (contratto_id) REFERENCES contratti (id) ON DELETE CASCADE,
  CONSTRAINT fk_locatori_persona   FOREIGN KEY (persona_id)   REFERENCES anagrafica_persona (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contratto_conduttori (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contratto_id BIGINT UNSIGNED NULL,
  persona_id BIGINT UNSIGNED NULL,
  data_decorrenza DATE NULL,
  data_chiusura DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_conduttori_contratto FOREIGN KEY (contratto_id) REFERENCES contratti (id) ON DELETE CASCADE,
  CONSTRAINT fk_conduttori_persona   FOREIGN KEY (persona_id)   REFERENCES anagrafica_persona (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Trigger: calcolo automatico di prossima_scadenza
--   prossima_scadenza = data_decorrenza + 1 anno + 30 giorni
-- L'app crea una scadenza per OGNI RICORRENZA ANNUALE della decorrenza del
-- contratto (stesso giorno/mese, di anno in anno) coperta da un canone non a
-- cedolare secca: la data_decorrenza della scadenza e' l'anniversario della
-- decorrenza del contratto e questo trigger produce la prossima_scadenza a
-- +1 anno +30 gg. Cosi' un canone che inizia a meta' anno non spezza il ritmo
-- annuale dei versamenti (es. contratto dal 18/09/21 con canone
-- 18/06/26 -> 17/09/27: le scadenze restano 18/09/26 e 18/06/27 con date di
-- pagamento 18/10/26 e 18/07/27, non 18/06/26 e 18/07/27). Al completamento
-- manuale di una scadenza l'app puo' comunque creare la successiva con
-- data_decorrenza = decorrenza della scadenza completata + 1 anno.
-- =============================================

DELIMITER $$
CREATE TRIGGER trg_scadenze_calc_dates_ins
BEFORE INSERT ON scadenze
FOR EACH ROW
BEGIN
  IF NEW.data_decorrenza IS NOT NULL THEN
    SET NEW.prossima_scadenza = DATE_ADD(DATE_ADD(NEW.data_decorrenza, INTERVAL 1 YEAR), INTERVAL 30 DAY);
  END IF;
END$$

CREATE TRIGGER trg_scadenze_calc_dates_upd
BEFORE UPDATE ON scadenze
FOR EACH ROW
BEGIN
  -- Ricalcola solo se cambia data_decorrenza (come il trigger PostgreSQL
  -- "BEFORE UPDATE OF data_decorrenza"): gli aggiornamenti di stato o di
  -- data_completamento NON devono toccare prossima_scadenza.
  IF NEW.data_decorrenza IS NOT NULL
     AND (OLD.data_decorrenza IS NULL OR NEW.data_decorrenza <> OLD.data_decorrenza) THEN
    SET NEW.prossima_scadenza = DATE_ADD(DATE_ADD(NEW.data_decorrenza, INTERVAL 1 YEAR), INTERVAL 30 DAY);
  END IF;
END$$
DELIMITER ;

-- =============================================
-- Dati di esempio
-- Persone Fisiche: nome + cognome, ragione_sociale = NULL
-- Aziende: nome = '', cognome = '', ragione_sociale = 'Ragione Sociale'
-- =============================================
INSERT INTO anagrafica_persona (nome, cognome, codice_fiscale, ragione_sociale) VALUES
('Roberto', 'Santantonio', 'SNTROT60A01F205Z', NULL),
('Maria', 'Rossi', 'RSSMRA85B42F205X', NULL),
('Luca', 'Bianchi', 'BNCLOC82T15F205W', NULL),
('', '', 'CSLMRC00A01F205K', 'CasaModa SRL'),
('Francesca', 'Colombo', 'CLMFNC88D55F205Y', NULL),
('', '', 'IMMUNI00B01F205P', 'Immobiliare Nord SPA'),
('Giovanni', 'Ferrari', 'FRRGNN80E10F205Z', NULL),
('', '', 'TRDRSG00A01F205M', 'Tridente Gestioni SRL'),
('Elena', 'Romano', 'RMNLEE90F20F205T', NULL),
('', '', 'BLUGRN00A01F205L', 'Blugreen Impianti SRL');

INSERT INTO immobili (indirizzo, citta, foglio, particella, sub, ape) VALUES
('Via Torino 12', 'Milano', '052', '118', '3', 0),
('Corso Vittorio Emanuele 45', 'Torino', '088', '092', '1', 1),
('Via Garibaldi 78', 'Roma', '123', '456', '7', 0),
('Via Mazzini 22', 'Bologna', '035', '078', '2', 0),
('Piazza Maggiore 5', 'Firenze', '150', '300', '5', 1),
('Via Dante 31', 'Napoli', '065', '205', '1', 0),
('Corso Italia 100', 'Milano', '052', '220', '8', 1),
('Via Garibaldi 78', 'Roma', '123', '458', '2', 0),
('Largo Augusto 9', 'Torino', '088', '033', '4', 0);

INSERT INTO contratti (identificativo, data_decorrenza, data_scadenza, data_chiusura, locatore_id, conduttore_id, immobile_id, note) VALUES
('AFF-2025-001', '2025-01-15', '2027-01-14', NULL, 1, 2, 1, 'Trilocale ristrutturato, piano 3 - via Torino'),
('AFF-2025-002', '2025-06-01', '2028-05-31', NULL, 4, 3, 2, 'Locale commerciale angolare, Corso Vittorio Emanuele'),
('AFF-2024-003', '2024-03-01', '2026-02-28', NULL, 5, 7, 3, 'Bilocale arredato, Via Garibaldi'),
('AFF-2025-004', '2025-09-01', '2027-08-31', NULL, 6, 8, 4, 'Magazzino 200mq con rampa, Via Mazzini'),
('AFF-2025-005', '2025-11-01', '2028-10-31', NULL, 6, 9, 5, 'Monolocale centro storico, Piazza Maggiore'),
('AFF-2024-006', '2024-01-01', '2025-12-31', '2025-12-31', 1, 10, 6, 'Box auto coperto, Via Dante'),
('AFF-2025-007', '2025-03-01', '2027-02-28', NULL, 1, 3, 7, 'Trilocale con giardino, Corso Italia - attivo'),
('AFF-2025-008', '2025-08-01', '2026-07-31', NULL, 5, 2, 8, 'Secondo appartamento Via Garibaldi'),
('AFF-2024-009', '2024-06-01', '2025-05-31', NULL, 4, 7, 9, 'Attico Largo Augusto - scaduto');

-- Canoni annuali
INSERT INTO canoni_annuali (contratto_id, importo, data_inizio, data_fine, tassazione_cedolare_secca, percentuale, valore_assoluto) VALUES
(1, 7500, '2025-01-15', '2026-01-14', 0, 10, 750),
(1, 7875, '2026-01-15', '2027-01-14', 1, 0, 0),
(2, 24000, '2025-06-01', '2026-05-31', 1, 0, 0),
(2, 25200, '2026-06-01', '2027-05-31', 1, 0, 0),
(2, 26460, '2027-06-01', '2028-05-31', 1, 0, 0),
(3, 4200, '2024-03-01', '2025-02-28', 0, 15, 420),
(3, 4410, '2025-03-01', '2026-02-28', 0, 15, 420),
(4, 3600, '2025-09-01', '2026-08-31', 0, 12, 300),
(4, 3780, '2026-09-01', '2027-08-31', 0, 12, 300),
(5, 14400, '2025-11-01', '2026-10-31', 1, 0, 0),
(5, 15120, '2026-11-01', '2027-10-31', 1, 0, 0),
(5, 15876, '2027-11-01', '2028-10-31', 1, 0, 0),
(6, 2160, '2024-01-01', '2024-12-31', 0, 8, 180),
(6, 2200, '2025-01-01', '2025-12-31', 0, 8, 180),
(7, 11250, '2025-03-01', '2026-02-28', 0, 15, 1125),
(7, 11812, '2026-03-01', '2027-02-28', 0, 15, 1125),
(8, 6000, '2025-08-01', '2026-07-31', 0, 10, 600),
(9, 4800, '2024-06-01', '2025-05-31', 0, 12, 480);

-- Scadenze di esempio: prossima_scadenza viene calcolata dal trigger
INSERT INTO scadenze (contratto_id, data_decorrenza, importo, stato) VALUES
(1, '2025-01-15', 7500, 'completata'),
(2, '2025-06-01', 24000, 'in-attesa');

-- Dati di esempio per tabelle ponte (locatori/conduttori multipli, con le
-- date di decorrenza/chiusura del legame, pari a quelle del contratto)
INSERT INTO contratto_locatori (contratto_id, persona_id, data_decorrenza, data_chiusura) VALUES
(1, 1, '2025-01-15', NULL),
(2, 4, '2025-06-01', NULL),
(3, 5, '2024-03-01', NULL),
(4, 6, '2025-09-01', NULL),
(5, 6, '2025-11-01', NULL),
(6, 1, '2024-01-01', '2025-12-31'),
(7, 1, '2025-03-01', NULL),
(8, 5, '2025-08-01', NULL),
(9, 4, '2024-06-01', NULL);

INSERT INTO contratto_conduttori (contratto_id, persona_id, data_decorrenza, data_chiusura) VALUES
(1, 2, '2025-01-15', NULL),
(2, 3, '2025-06-01', NULL),
(3, 7, '2024-03-01', NULL),
(4, 8, '2025-09-01', NULL),
(5, 9, '2025-11-01', NULL),
(6, 10, '2024-01-01', '2025-12-31'),
(7, 3, '2025-03-01', NULL),
(8, 2, '2025-08-01', NULL),
(9, 7, '2024-06-01', NULL);
