-- ============================================================
-- MedKura Health — Patient Journey Database Schema
-- PostgreSQL 15+
-- ============================================================
-- Design decisions:
--   1. Patients and Cases are separate tables — one patient
--      can have multiple independent surgery journeys.
--   2. Every stage change is recorded in case_stage_history
--      for a complete audit trail.
--   3. Soft deletes (deleted_at) on core tables to preserve
--      data integrity and audit history.
--   4. Documents use a generic polymorphic table so any entity
--      (case, consultation, lab order) can have files attached.
--   5. All monetary values stored as INTEGER (paise / cents)
--      to avoid float rounding errors.
-- ============================================================


-- ── ENUMS ───────────────────────────────────────────────────

CREATE TYPE case_stage AS ENUM (
  'onboarded',
  'lab_tests_ordered',
  'second_opinion_scheduled',
  'second_opinion_completed',
  'hospital_selected',
  'surgery_scheduled',
  'surgery_completed',
  'closed'
);

CREATE TYPE urgency_level AS ENUM ('normal', 'attention', 'urgent');

CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

CREATE TYPE document_entity_type AS ENUM (
  'case', 'consultation', 'lab_order', 'hospital_referral'
);


-- ── CARE REPRESENTATIVES ─────────────────────────────────────

CREATE TABLE care_representatives (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT        NOT NULL,
  email           TEXT        NOT NULL UNIQUE,
  phone           TEXT        NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

COMMENT ON TABLE care_representatives IS
  'Internal MedKura staff assigned to guide patients through their journey.';


-- ── PATIENTS ────────────────────────────────────────────────

CREATE TABLE patients (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT        NOT NULL,
  date_of_birth   DATE        NOT NULL,
  gender          gender,
  phone           TEXT        NOT NULL,
  email           TEXT,
  city            TEXT        NOT NULL,
  state           TEXT        NOT NULL,
  pincode         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

COMMENT ON TABLE patients IS
  'A patient who has registered on MedKura. Can have multiple cases.';


-- ── CASES ───────────────────────────────────────────────────
-- A "case" represents one complete surgery journey for a patient.
-- A patient needing two different surgeries = two cases.

CREATE TABLE cases (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID          NOT NULL REFERENCES patients(id),
  representative_id   UUID          REFERENCES care_representatives(id),
  condition           TEXT          NOT NULL,  -- e.g. "Knee Replacement"
  current_stage       case_stage    NOT NULL DEFAULT 'onboarded',
  urgency             urgency_level NOT NULL DEFAULT 'normal',
  notes               TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  closed_at           TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ
);

COMMENT ON TABLE cases IS
  'One surgery journey. A patient can have multiple cases over their lifetime.';

-- Index: most common query — all active cases for a rep
-- (e.g. rep dashboard, load all open cases)
CREATE INDEX idx_cases_rep_stage
  ON cases (representative_id, current_stage)
  WHERE deleted_at IS NULL;

-- Index: patient lookup — find all cases for a patient
CREATE INDEX idx_cases_patient_id
  ON cases (patient_id)
  WHERE deleted_at IS NULL;

-- Index: filter by urgency for triaging dashboards
CREATE INDEX idx_cases_urgency
  ON cases (urgency)
  WHERE deleted_at IS NULL AND current_stage != 'closed';


-- ── CASE STAGE HISTORY (Audit Trail) ────────────────────────
-- Every time a case moves to a new stage, one row is inserted here.
-- This gives us full auditability and allows time-in-stage reporting.

CREATE TABLE case_stage_history (
  id              BIGSERIAL   PRIMARY KEY,
  case_id         UUID        NOT NULL REFERENCES cases(id),
  from_stage      case_stage,                       -- NULL for initial onboard
  to_stage        case_stage  NOT NULL,
  changed_by_type TEXT        NOT NULL,             -- 'representative' | 'system' | 'admin'
  changed_by_id   UUID,                             -- FK to whoever triggered change
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE case_stage_history IS
  'Immutable append-only log of every stage transition. Never delete rows here.';

-- Index: fetch history for a single case (most common use)
CREATE INDEX idx_stage_history_case_id
  ON case_stage_history (case_id, created_at DESC);


-- ── DOCTORS ─────────────────────────────────────────────────

CREATE TABLE doctors (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT        NOT NULL,
  specialty       TEXT        NOT NULL,
  city            TEXT        NOT NULL,
  hospital_name   TEXT,
  phone           TEXT,
  email           TEXT,
  is_verified     BOOLEAN     NOT NULL DEFAULT FALSE,
  average_rating  NUMERIC(3,2) CHECK (average_rating BETWEEN 0 AND 5),
  consultation_fee_paise INTEGER NOT NULL DEFAULT 0,  -- stored in paise (₹1 = 100 paise)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: filter doctors by specialty + city (primary search pattern)
CREATE INDEX idx_doctors_specialty_city
  ON doctors (specialty, city)
  WHERE is_verified = TRUE;


-- ── CONSULTATIONS ────────────────────────────────────────────
-- A doctor consultation tied to a specific case.

CREATE TABLE consultations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID        NOT NULL REFERENCES cases(id),
  doctor_id       UUID        NOT NULL REFERENCES doctors(id),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  completed_at    TIMESTAMPTZ,
  type            TEXT        NOT NULL DEFAULT 'second_opinion',
                              -- 'initial' | 'second_opinion' | 'follow_up'
  summary         TEXT,       -- doctor's summary (filled post-consultation)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consultations_case_id
  ON consultations (case_id);


-- ── LAB TEST ORDERS ──────────────────────────────────────────

CREATE TABLE lab_test_orders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID        NOT NULL REFERENCES cases(id),
  test_name       TEXT        NOT NULL,
  lab_name        TEXT,
  ordered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  result_summary  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lab_orders_case_id
  ON lab_test_orders (case_id);


-- ── HOSPITALS ───────────────────────────────────────────────

CREATE TABLE hospitals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  city            TEXT        NOT NULL,
  state           TEXT        NOT NULL,
  is_empanelled   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── HOSPITAL REFERRALS ───────────────────────────────────────

CREATE TABLE hospital_referrals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID        NOT NULL REFERENCES cases(id),
  hospital_id     UUID        NOT NULL REFERENCES hospitals(id),
  referred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  surgery_date    DATE,
  surgery_status  TEXT        DEFAULT 'pending',
                              -- 'pending' | 'scheduled' | 'completed' | 'cancelled'
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hospital_referrals_case_id
  ON hospital_referrals (case_id);


-- ── DOCUMENTS ───────────────────────────────────────────────
-- Generic document upload table. Attaches to any entity via
-- entity_type + entity_id polymorphic pattern.

CREATE TABLE documents (
  id              UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     document_entity_type  NOT NULL,
  entity_id       UUID                  NOT NULL,
  file_name       TEXT                  NOT NULL,
  file_url        TEXT                  NOT NULL,
  mime_type       TEXT,
  size_bytes      BIGINT,
  uploaded_by_id  UUID,
  created_at      TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE documents IS
  'Polymorphic document store. entity_type+entity_id point to parent record.';

CREATE INDEX idx_documents_entity
  ON documents (entity_type, entity_id);


-- ── SAMPLE QUERY 1 ───────────────────────────────────────────
-- "Get all active cases assigned to a specific representative
--  where the case has been in the same stage for more than 5 days."
--
-- Explanation: We join cases with the most recent stage_history entry
-- for each case and filter where that entry is older than 5 days.
--
/*
SELECT
  c.id                    AS case_id,
  p.full_name             AS patient_name,
  c.condition,
  c.current_stage,
  c.urgency,
  h.created_at            AS stage_entered_at,
  NOW() - h.created_at    AS time_in_stage
FROM cases c
JOIN patients p          ON p.id = c.patient_id
-- Latest stage-history row per case
JOIN LATERAL (
  SELECT created_at
  FROM   case_stage_history
  WHERE  case_id = c.id
  ORDER  BY created_at DESC
  LIMIT  1
) h ON TRUE
WHERE
  c.representative_id = :rep_id           -- bind param: target representative UUID
  AND c.deleted_at    IS NULL
  AND c.current_stage NOT IN ('closed', 'surgery_completed')
  AND h.created_at    < NOW() - INTERVAL '5 days'
ORDER BY time_in_stage DESC;
*/


-- ── SAMPLE QUERY 2 ───────────────────────────────────────────
-- "Get the average number of days from case creation to
--  'hospital_selected' stage, grouped by the referring city."
--
-- Explanation: We look for the first time each case reached
-- 'hospital_selected' in the stage history, compute the delta
-- from case creation, and group by patient city.
--
/*
SELECT
  p.city,
  COUNT(*)                                      AS total_cases,
  ROUND(AVG(
    EXTRACT(EPOCH FROM (hs.created_at - c.created_at)) / 86400
  )::NUMERIC, 1)                                AS avg_days_to_hospital_selected
FROM cases c
JOIN patients p  ON p.id = c.patient_id
-- First time this case reached 'hospital_selected'
JOIN LATERAL (
  SELECT created_at
  FROM   case_stage_history
  WHERE  case_id  = c.id
    AND  to_stage = 'hospital_selected'
  ORDER  BY created_at ASC
  LIMIT  1
) hs ON TRUE
WHERE
  c.deleted_at IS NULL
GROUP BY p.city
ORDER BY avg_days_to_hospital_selected ASC;
*/
