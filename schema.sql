-- =============================================
-- SCHEMA DATABASE: Gestione Contratti Affitto
-- Esegui questo nello SQL Editor di Supabase
-- =============================================

-- 1. Anagrafica Persona
CREATE TABLE IF NOT EXISTS anagrafica_persona (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome text NOT NULL,
  cognome text NOT NULL,
  codice_fiscale text,
  ragione_sociale text,
  created_at timestamptz DEFAULT now()
);

-- 2. Immobili
CREATE TABLE IF NOT EXISTS immobili (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  indirizzo text NOT NULL,
  citta text NOT NULL,
  foglio text,
  particella text,
  sub text,
  ape boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. Contratti
CREATE TABLE IF NOT EXISTS contratti (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identificativo text NOT NULL,
  data_decorrenza date,
  data_scadenza date,
  data_chiusura date,
  tassazione_cedolare_secca boolean DEFAULT false,
  locatore_id bigint REFERENCES anagrafica_persona(id) ON DELETE SET NULL,
  conduttore_id bigint REFERENCES anagrafica_persona(id) ON DELETE SET NULL,
  immobile_id bigint REFERENCES immobili(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

-- 4. Scadenze
CREATE TABLE IF NOT EXISTS scadenze (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contratto_id bigint REFERENCES contratti(id) ON DELETE CASCADE,
  data_decorrenza date NOT NULL,
  prossima_scadenza date,
  prossima_decorrenza date,
  priorita text DEFAULT 'media' CHECK (priorita IN ('alta', 'media', 'bassa')),
  importo numeric DEFAULT 0,
  stato text DEFAULT 'in-attesa',
  created_at timestamptz DEFAULT now()
);

-- 6. Aggiunta colonne percentuale e valore_assoluto
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS percentuale numeric DEFAULT 0;
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS valore_assoluto numeric DEFAULT 0;

-- 7. Tabella Canoni Annuali (legata ai contratti)
CREATE TABLE IF NOT EXISTS canoni_annuali (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contratto_id bigint REFERENCES contratti(id) ON DELETE CASCADE,
  importo numeric DEFAULT 0,
  data_inizio date,
  data_fine date,
  note text,
  created_at timestamptz DEFAULT now()
);

-- Colonna importo (importo da pagare) per le scadenze
ALTER TABLE scadenze ADD COLUMN IF NOT EXISTS importo numeric DEFAULT 0;

-- Rinomina urgenza in priorita (Alta / Media / Bassa) se esiste ancora
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'scadenze' AND column_name = 'urgenza') THEN
    ALTER TABLE scadenze RENAME COLUMN urgenza TO priorita;
  END IF;
END $$;

-- Vincolo sui valori di priorita (Postgres non supporta IF NOT EXISTS su ADD CONSTRAINT)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scadenze_priorita_check') THEN
    ALTER TABLE scadenze ADD CONSTRAINT scadenze_priorita_check
      CHECK (priorita IN ('alta', 'media', 'bassa'));
  END IF;
END $$;

-- Rinomina data in data_decorrenza (decorrenza del contratto) se esiste ancora
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'scadenze' AND column_name = 'data') THEN
    ALTER TABLE scadenze RENAME COLUMN data TO data_decorrenza;
  END IF;
END $$;

-- Colonna prossima_decorrenza: nuova decorrenza a cui farà riferimento il contratto
ALTER TABLE scadenze ADD COLUMN IF NOT EXISTS prossima_decorrenza date;

-- Calcolo automatico:
--   prossima_scadenza    = data_decorrenza + 1 anno + 30 giorni
--   prossima_decorrenza  = prossima_scadenza + 1 giorno
CREATE OR REPLACE FUNCTION calc_scadenze_dates()
RETURNS trigger AS $$
BEGIN
  IF NEW.data_decorrenza IS NOT NULL THEN
    NEW.prossima_scadenza := (NEW.data_decorrenza + INTERVAL '1 year' + INTERVAL '30 days')::date;
    NEW.prossima_decorrenza := (NEW.prossima_scadenza + INTERVAL '1 day')::date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scadenze_calc_dates ON scadenze;
CREATE TRIGGER trg_scadenze_calc_dates
  BEFORE INSERT OR UPDATE OF data_decorrenza ON scadenze
  FOR EACH ROW
  EXECUTE FUNCTION calc_scadenze_dates();

-- Ricalcola le date per le righe esistenti che non le hanno ancora
UPDATE scadenze SET data_decorrenza = data_decorrenza
WHERE prossima_scadenza IS NULL OR prossima_decorrenza IS NULL;

ALTER TABLE canoni_annuali DISABLE ROW LEVEL SECURITY;

-- 8. Tabelle ponte per Locatori e Conduttori multipli
CREATE TABLE IF NOT EXISTS contratto_locatori (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contratto_id bigint REFERENCES contratti(id) ON DELETE CASCADE,
  persona_id bigint REFERENCES anagrafica_persona(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contratto_conduttori (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contratto_id bigint REFERENCES contratti(id) ON DELETE CASCADE,
  persona_id bigint REFERENCES anagrafica_persona(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contratto_locatori DISABLE ROW LEVEL SECURITY;
ALTER TABLE contratto_conduttori DISABLE ROW LEVEL SECURITY;

-- Disabilita RLS (single-user app)
ALTER TABLE anagrafica_persona DISABLE ROW LEVEL SECURITY;
ALTER TABLE immobili DISABLE ROW LEVEL SECURITY;
ALTER TABLE contratti DISABLE ROW LEVEL SECURITY;
ALTER TABLE scadenze DISABLE ROW LEVEL SECURITY;

-- Dati di esempio
-- Persone Fisiche: nome + cognome, ragione_sociale = NULL
-- Aziende: nome = '', cognome = '', ragione_sociale = 'Ragione Sociale'
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
('Via Torino 12', 'Milano', '052', '118', '3', false),
('Corso Vittorio Emanuele 45', 'Torino', '088', '092', '1', true),
('Via Garibaldi 78', 'Roma', '123', '456', '7', false),
('Via Mazzini 22', 'Bologna', '035', '078', '2', false),
('Piazza Maggiore 5', 'Firenze', '150', '300', '5', true),
('Via Dante 31', 'Napoli', '065', '205', '1', false),
('Corso Italia 100', 'Milano', '052', '220', '8', true),
('Via Garibaldi 78', 'Roma', '123', '458', '2', false),
('Largo Augusto 9', 'Torino', '088', '033', '4', false);

INSERT INTO contratti (identificativo, data_decorrenza, data_scadenza, data_chiusura, tassazione_cedolare_secca, locatore_id, conduttore_id, immobile_id, percentuale, valore_assoluto, note) VALUES
('AFF-2025-001', '2025-01-15', '2027-01-14', NULL, false, 1, 2, 1, 10, 750, 'Trilocale ristrutturato, piano 3 - via Torino'),
('AFF-2025-002', '2025-06-01', '2028-05-31', NULL, true, 4, 3, 2, 0, 0, 'Locale commerciale angolare, Corso Vittorio Emanuele'),
('AFF-2024-003', '2024-03-01', '2026-02-28', NULL, false, 5, 7, 3, 15, 420, 'Bilocale arredato, Via Garibaldi'),
('AFF-2025-004', '2025-09-01', '2027-08-31', NULL, false, 6, 8, 4, 12, 300, 'Magazzino 200mq con rampa, Via Mazzini'),
('AFF-2025-005', '2025-11-01', '2028-10-31', NULL, true, 6, 9, 5, 0, 0, 'Monolocale centro storico, Piazza Maggiore'),
('AFF-2024-006', '2024-01-01', '2025-12-31', '2025-12-31', false, 1, 10, 6, 8, 180, 'Box auto coperto, Via Dante'),
('AFF-2025-007', '2025-03-01', '2027-02-28', NULL, false, 1, 3, 7, 15, 1125, 'Trilocale con giardino, Corso Italia - attivo'),
('AFF-2025-008', '2025-08-01', '2026-07-31', NULL, false, 5, 2, 8, 10, 600, 'Secondo appartamento Via Garibaldi'),
('AFF-2024-009', '2024-06-01', '2025-05-31', NULL, false, 4, 7, 9, 12, 480, 'Attico Largo Augusto - scaduto');

-- Canoni annuali
INSERT INTO canoni_annuali (contratto_id, importo, data_inizio, data_fine) VALUES
(1, 7500, '2025-01-15', '2026-01-14'),
(1, 7875, '2026-01-15', '2027-01-14'),
(2, 24000, '2025-06-01', '2026-05-31'),
(2, 25200, '2026-06-01', '2027-05-31'),
(2, 26460, '2027-06-01', '2028-05-31'),
(3, 4200, '2024-03-01', '2025-02-28'),
(3, 4410, '2025-03-01', '2026-02-28'),
(4, 3600, '2025-09-01', '2026-08-31'),
(4, 3780, '2026-09-01', '2027-08-31'),
(5, 14400, '2025-11-01', '2026-10-31'),
(5, 15120, '2026-11-01', '2027-10-31'),
(5, 15876, '2027-11-01', '2028-10-31'),
(6, 2160, '2024-01-01', '2024-12-31'),
(6, 2200, '2025-01-01', '2025-12-31'),
(7, 11250, '2025-03-01', '2026-02-28'),
(7, 11812, '2026-03-01', '2027-02-28'),
(8, 6000, '2025-08-01', '2026-07-31'),
(9, 4800, '2024-06-01', '2025-05-31');

-- prossima_scadenza e prossima_decorrenza vengono calcolate automaticamente dal trigger
INSERT INTO scadenze (contratto_id, data_decorrenza, priorita, importo, stato) VALUES
(1, '2025-01-15', 'media', 7500, 'completata'),
(2, '2025-06-01', 'alta', 24000, 'in-attesa');

-- Dati di esempio per tabelle ponte (locatori/conduttori multipli)
INSERT INTO contratto_locatori (contratto_id, persona_id) VALUES
(1, 1), (2, 4), (3, 5), (4, 6), (5, 6), (6, 1), (7, 1), (8, 5), (9, 4);

INSERT INTO contratto_conduttori (contratto_id, persona_id) VALUES
(1, 2), (2, 3), (3, 7), (4, 8), (5, 9), (6, 10), (7, 3), (8, 2), (9, 7);
