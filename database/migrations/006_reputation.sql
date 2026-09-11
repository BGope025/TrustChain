CREATE TABLE IF NOT EXISTS reputation (
    service_id VARCHAR(50) PRIMARY KEY REFERENCES services(id),
    trust_score NUMERIC(5, 2) DEFAULT 50.0,
    successful_calls INT DEFAULT 0,
    failed_calls INT DEFAULT 0,
    disputes INT DEFAULT 0,
    average_latency_ms INT DEFAULT 500,
    grade VARCHAR(2) DEFAULT 'C',
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
