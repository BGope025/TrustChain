-- TrustChain: Master Schema
-- This script runs all migrations in order to build the complete database schema.

\i migrations/001_users.sql
\i migrations/002_agents.sql
\i migrations/003_wallets.sql
\i migrations/004_services.sql
\i migrations/005_transactions.sql
\i migrations/006_reputation.sql
\i migrations/007_tasks.sql
