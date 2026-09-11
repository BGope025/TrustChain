CREATE TABLE IF NOT EXISTS wallets (
    address VARCHAR(58) PRIMARY KEY,
    owner_id VARCHAR(50) NOT NULL,
    owner_type VARCHAR(20) NOT NULL, -- 'agent' or 'provider'
    network VARCHAR(20) DEFAULT 'testnet',
    is_funded BOOLEAN DEFAULT false,
    opted_in_assets JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
