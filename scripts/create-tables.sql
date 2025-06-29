-- Create users table to store wallet addresses and game data
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    total_lives INTEGER DEFAULT 5,
    last_life_lost TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table to track all payments
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) NOT NULL,
    transaction_hash VARCHAR(88) UNIQUE NOT NULL,
    block_number BIGINT NOT NULL,
    amount_sol DECIMAL(18, 9),
    amount_mwor DECIMAL(18, 9),
    payment_type VARCHAR(20) NOT NULL, -- 'SOL' or 'MWOR'
    lives_added INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_address) REFERENCES users(wallet_address)
);

-- Create game_sessions table to track gameplay
CREATE TABLE IF NOT EXISTS game_sessions (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) NOT NULL,
    score INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    lines_cleared INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    FOREIGN KEY (wallet_address) REFERENCES users(wallet_address)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_payments_wallet ON payments(wallet_address);
CREATE INDEX IF NOT EXISTS idx_payments_hash ON payments(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_wallet ON game_sessions(wallet_address);
