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
  tipo text NOT NULL,
  titolo text NOT NULL,
  data date NOT NULL,
  urgenza text DEFAULT 'media',
  stato text DEFAULT 'in-attesa',
  descrizione text,
  created_at timestamptz DEFAULT now()
);

-- 5. Pagamenti
CREATE TABLE IF NOT EXISTS pagamenti (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contratto_id bigint REFERENCES contratti(id) ON DELETE CASCADE,
  data date NOT NULL,
  tipo text NOT NULL,
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

ALTER TABLE canoni_annuali DISABLE ROW LEVEL SECURITY;

-- Disabilita RLS (single-user app)
ALTER TABLE anagrafica_persona DISABLE ROW LEVEL SECURITY;
ALTER TABLE immobili DISABLE ROW LEVEL SECURITY;
ALTER TABLE contratti DISABLE ROW LEVEL SECURITY;
ALTER TABLE scadenze DISABLE ROW LEVEL SECURITY;
ALTER TABLE pagamenti DISABLE ROW LEVEL SECURITY;

-- Dati di esempio
INSERT INTO anagrafica_persona (nome, cognome, codice_fiscale, ragione_sociale) VALUES
('Mario', 'Bianchi', 'BNCMRA80A01F205Z', NULL),
('Laura', 'Verdi', 'VRDLRA85B42F205X', NULL),
('Giovanni', 'Neri', 'NRIGVN82T15F205W', NULL),
('Società', 'Rossi SRL', 'RSSSRL00A01F205K', 'Rossi Immobili SRL'),
('Anna', 'Colombo', 'CLMNNN88D55F205Y', NULL),
('Paolo', 'Ferrari', 'FRRPLA80E10F205Z', NULL);

INSERT INTO immobili (indirizzo, citta, foglio, particella, sub, ape) VALUES
('Via Roma 15', 'Milano', '123', '456', '7', false),
('Corso Italia 42', 'Roma', '200', '118', '3', true),
('Via Napoli 8', 'Torino', '88', '92', '1', false),
('Via Garibaldi 22', 'Firenze', '150', '300', '5', true),
('Piazza Dante 5', 'Bologna', '65', '78', '2', false),
('Viale Mazzini 31', 'Napoli', '110', '205', '1', false);

INSERT INTO contratti (identificativo, data_decorrenza, data_scadenza, data_chiusura, tassazione_cedolare_secca, locatore_id, conduttore_id, immobile_id, note) VALUES
('LOC-2024-001', '2024-01-15', '2026-01-14', NULL, false, 1, 2, 1, 'Trilocale ristrutturato, piano 3'),
('LOC-2024-002', '2023-06-01', '2025-05-31', NULL, true, 3, 4, 2, 'Locale commerciale angolare'),
('LOC-2024-003', '2024-03-01', '2027-02-28', NULL, false, 5, 6, 3, 'Bilocale arredato'),
('LOC-2024-004', '2022-09-01', '2025-08-31', NULL, false, 1, 4, 4, 'Magazzino 200mq con rampa'),
('LOC-2024-005', '2023-11-01', '2026-10-31', NULL, true, 3, 5, 5, 'Monolocale centro storico'),
('LOC-2023-006', '2023-01-01', '2024-12-31', '2024-12-31', false, 1, 6, 6, 'Box auto coperto');

-- Canoni annuali per i contratti di esempio
INSERT INTO canoni_annuali (contratto_id, importo, data_inizio, data_fine) VALUES
(1, 14400, '2024-01-15', '2025-01-14'),
(1, 15000, '2025-01-15', '2026-01-14'),
(2, 30000, '2023-06-01', '2024-05-31'),
(2, 31500, '2024-06-01', '2025-05-31'),
(3, 10200, '2024-03-01', '2025-02-28'),
(3, 10710, '2025-03-01', '2026-02-28'),
(3, 11245, '2026-03-01', '2027-02-28'),
(4, 21600, '2022-09-01', '2023-08-31'),
(4, 22000, '2023-09-01', '2024-08-31'),
(4, 22400, '2024-09-01', '2025-08-31'),
(5, 11400, '2023-11-01', '2024-10-31'),
(5, 12000, '2024-11-01', '2025-10-31'),
(5, 12600, '2025-11-01', '2026-10-31'),
(6, 2400, '2023-01-01', '2024-12-31');

INSERT INTO scadenze (contratto_id, tipo, titolo, data, urgenza, stato, descrizione) VALUES
(1, 'canone', 'Versamento canone gennaio', '2025-01-05', 'media', 'completata', 'Canone mensile via Roma'),
(2, 'imposta', 'Imposta di registro annuale', '2025-06-01', 'alta', 'in-attesa', 'Registrazione contratto commerciale'),
(3, 'canone', 'Canone mensile febbraio', '2025-02-05', 'media', 'in-attesa', 'Canone apartamento Torino'),
(4, 'versamento', 'Versamento IMU Q1', '2025-06-16', 'alta', 'in-attesa', 'Prima rata IMU magazzino'),
(1, 'rinnovo', 'Verifica rinnovo contratto', '2025-12-15', 'bassa', 'in-attesa', 'Controllare clausola di rinnovo'),
(5, 'bolletta', 'Bolletta elettricita', '2025-02-20', 'media', 'in-attesa', 'Scadenza bolletta monolocale'),
(2, 'sicurezza', 'Controllo antincendio', '2025-03-10', 'alta', 'in-attesa', 'Controllo locale commerciale'),
(3, 'canone', 'Canone mensile marzo', '2025-03-05', 'media', 'in-attesa', 'Canone mensile Torino');

INSERT INTO pagamenti (contratto_id, data, tipo, importo, stato) VALUES
(1, '2025-01-05', 'canone', 1200, 'completato'),
(2, '2024-12-01', 'canone', 2500, 'completato'),
(3, '2025-01-05', 'canone', 850, 'completato'),
(5, '2025-01-05', 'canone', 950, 'completato'),
(4, '2024-12-01', 'canone', 1800, 'completato'),
(1, '2025-01-10', 'spese', 150, 'completato'),
(2, '2025-02-01', 'canone', 2500, 'in-attesa');

-- Contratti fittizzi di esempio
INSERT INTO contratti (identificativo, data_decorrenza, data_scadenza, data_chiusura, tassazione_cedolare_secca, locatore_id, conduttore_id, immobile_id, percentuale, valore_assoluto, note) VALUES
('LOC-2025-010', '2025-01-01', '2026-09-10', NULL, false, 2, 1, 5, 15, 1125, 'Bilocale centro - in scadenza a breve'),
('LOC-2025-011', '2023-03-01', '2025-07-31', NULL, false, 4, 3, 2, 10, 1500, 'Locale commerciale - scaduto'),
('LOC-2025-012', '2025-06-01', '2028-05-31', NULL, true, 6, 5, 4, 20, 2200, 'Trilocale con giardino - attivo');

-- Canoni annuali per i contratti fittizzi
INSERT INTO canoni_annuali (contratto_id, importo, data_inizio, data_fine) VALUES
(7, 9000, '2025-01-01', '2025-12-31'),
(7, 9450, '2026-01-01', '2026-09-10'),
(8, 18000, '2023-03-01', '2024-02-28'),
(8, 18500, '2024-03-01', '2025-07-31'),
(9, 13200, '2025-06-01', '2026-05-31'),
(9, 13860, '2026-06-01', '2027-05-31'),
(9, 14553, '2027-06-01', '2028-05-31');
