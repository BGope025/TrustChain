CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(50) PRIMARY KEY,
    agent_id VARCHAR(50) REFERENCES agents(id),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'idle',
    total_cost NUMERIC(10, 6) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
