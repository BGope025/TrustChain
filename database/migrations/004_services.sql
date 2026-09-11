CREATE TABLE IF NOT EXISTS providers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255),
    wallet_address VARCHAR(58) REFERENCES wallets(address),
    is_active BOOLEAN DEFAULT true,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(50) PRIMARY KEY,
    provider_id VARCHAR(50) REFERENCES providers(id),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    cost NUMERIC(10, 6) DEFAULT 0.0,
    endpoint_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
