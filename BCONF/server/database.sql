DROP TABLE IF EXISTS best_paper_votes CASCADE;
DROP TABLE IF EXISTS paper_assignment_feedback CASCADE;
DROP TABLE IF EXISTS paper_assignments CASCADE;
DROP TABLE IF EXISTS paper_bids CASCADE;
DROP TABLE IF EXISTS paper_reviews CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS papers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS conference_settings CASCADE;
DROP TABLE IF EXISTS conference_review_directions CASCADE;
DROP TABLE IF EXISTS paper_meta_reviews CASCADE;


CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  institution VARCHAR(150),
  pronouns VARCHAR(100),
  allergies TEXT,
  phone VARCHAR(50),
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'author',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE papers(
  paper_id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  author VARCHAR(255),
  description VARCHAR(255),
  pdf_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  author_id INTEGER REFERENCES users(id),
  approval VARCHAR(50) DEFAULT 'Pending'
);

CREATE TABLE ratings (
  id SERIAL PRIMARY KEY,
  paper_id INTEGER REFERENCES papers(paper_id),
  editor_id INTEGER REFERENCES users(id),
  rating VARCHAR(50),
  review TEXT
);

CREATE TABLE paper_reviews (
  review_id BIGSERIAL PRIMARY KEY,
  paper_id INTEGER NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_review_id BIGINT REFERENCES paper_reviews(review_id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  visibility_scope VARCHAR(32) NOT NULL DEFAULT 'paper_access',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX paper_reviews_paper_created_idx
  ON paper_reviews (paper_id, created_at, review_id);

CREATE INDEX paper_reviews_paper_parent_idx
  ON paper_reviews (paper_id, parent_review_id, created_at, review_id);

CREATE INDEX paper_reviews_author_idx
  ON paper_reviews (author_id, created_at DESC);

CREATE TABLE paper_bids (
  bid_id BIGSERIAL PRIMARY KEY,
  paper_id INTEGER NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at TIMESTAMP,
  UNIQUE (paper_id, reviewer_id)
);

CREATE INDEX paper_bids_paper_idx
  ON paper_bids (paper_id, created_at DESC);

CREATE INDEX paper_bids_reviewer_idx
  ON paper_bids (reviewer_id, created_at DESC);

CREATE TABLE paper_assignments (
  assignment_id BIGSERIAL PRIMARY KEY,
  paper_id INTEGER NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (paper_id, reviewer_id)
);

CREATE INDEX paper_assignments_paper_idx
  ON paper_assignments (paper_id, created_at DESC);

CREATE INDEX paper_assignments_reviewer_idx
  ON paper_assignments (reviewer_id, created_at DESC);

CREATE TABLE paper_assignment_feedback (
  feedback_id BIGSERIAL PRIMARY KEY,
  paper_id INTEGER NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anti_bid BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (paper_id, reviewer_id)
);

CREATE INDEX paper_assignment_feedback_paper_idx
  ON paper_assignment_feedback (paper_id, updated_at DESC);

CREATE INDEX paper_assignment_feedback_reviewer_idx
  ON paper_assignment_feedback (reviewer_id, updated_at DESC);

CREATE TABLE conference_settings (
  id SERIAL PRIMARY KEY,
  review_type VARCHAR(20)
    CHECK (review_type IN ('single_blind', 'double_blind', 'open'))
    NOT NULL DEFAULT 'double_blind',
  landing_page_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  landing_page_updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  landing_page_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conference_review_directions (
  id SERIAL PRIMARY KEY,
  directions TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE paper_meta_reviews (
  meta_review_id BIGSERIAL PRIMARY KEY,
  paper_id INTEGER NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (paper_id)
);

CREATE TABLE best_paper_votes (
  vote_id BIGSERIAL PRIMARY KEY,
  paper_id INTEGER NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (paper_id, reviewer_id)
);

CREATE INDEX best_paper_votes_paper_idx
  ON best_paper_votes (paper_id);

CREATE INDEX best_paper_votes_reviewer_idx
  ON best_paper_votes (reviewer_id);
