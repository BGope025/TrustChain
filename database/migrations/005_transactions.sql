CREATE TABLE IF NOT EXISTS transactions (
    tx_hash VARCHAR(64) PRIMARY KEY,
    type VARCHAR(20),
    from_address VARCHAR(58),
    to_address VARCHAR(58),
    amount NUMERIC(20, 6),
    asset_id BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    confirmed_round BIGINT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    agent_id VARCHAR(50) REFERENCES agents(id),
    service_id VARCHAR(50) REFERENCES services(id),
    amount NUMERIC(10, 6),
    status VARCHAR(20) DEFAULT 'pending',
    tx_hash VARCHAR(64) REFERENCES transactions(tx_hash),
    receipt_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settled_at TIMESTAMP
);
