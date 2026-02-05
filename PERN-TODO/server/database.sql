CREATE DATABASE perntodo:

CREATE TABLE todo(
    todo_id SERIAL PRIMARY KEY,
    author VARCHAR(255),
    description VARCHAR(255),
    pdf_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);