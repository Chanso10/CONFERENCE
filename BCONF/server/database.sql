DROP TABLE IF EXISTS paper_reviews;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS papers;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'author',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE papers(
  paper_id SERIAL PRIMARY KEY,
  author VARCHAR(255),
  description VARCHAR(255),
  pdf_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  author_id INTEGER REFERENCES users(id)
);

CREATE TABLE ratings (
  id SERIAL PRIMARY KEY,
  paper_id INTEGER REFERENCES papers(paper_id),
  editor_id INTEGER REFERENCES users(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
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
