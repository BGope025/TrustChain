CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    owner_id VARCHAR(50) REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'idle',
    capabilities JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
