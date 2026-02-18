DROP TABLE IF EXISTS papers;

CREATE TABLE papers(
  paper_id SERIAL PRIMARY KEY,
  author VARCHAR(255),
  description VARCHAR(255),
  pdf_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  author_id INTEGER REFERENCES users(id)
);

CREATE TABLE users ( 
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, 
  role VARCHAR(50) DEFAULT 'author', 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
  );
CREATE TABLE ratings ( 
  id SERIAL PRIMARY KEY,
  paper_id INTEGER REFERENCES papers(paper_id),
  editor_id INTEGER REFERENCES users(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review TEXT
  );