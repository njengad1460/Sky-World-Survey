-- init/01_schema.sql
CREATE DATABASE IF NOT EXISTS sky_survey_db;
USE sky_survey_db;

CREATE TABLE surveys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    survey_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    question_type ENUM('short_text', 'long_text', 'email', 'choice', 'file') NOT NULL,
    question_text TEXT NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    is_multiple_choice BOOLEAN DEFAULT FALSE,
    max_file_size INT NULL,
    max_file_size_unit VARCHAR(10) NULL,
    file_format VARCHAR(50) NULL,
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE question_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    option_value VARCHAR(255) NOT NULL,
    option_text VARCHAR(255) NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    survey_id INT NOT NULL,
    cognito_user_id VARCHAR(255) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    date_responded TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    INDEX idx_email (email_address)
) ENGINE=InnoDB;

CREATE TABLE answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    response_id INT NOT NULL,
    question_id INT NOT NULL,
    answer_text TEXT NULL,
    FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE answer_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    answer_id INT NOT NULL,
    option_id INT NOT NULL,
    FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES question_options(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    answer_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    s3_key VARCHAR(512) NOT NULL,
    FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE
) ENGINE=InnoDB;