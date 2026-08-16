-- Baseline migration proving the Flyway pipeline runs end to end.
-- Business tables (users, refresh_tokens, certificates, batch_imports) arrive
-- in feat/jwt-auth and feat/certificate-crud, each as its own versioned migration.
SELECT 1;
