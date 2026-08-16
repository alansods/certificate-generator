CREATE TABLE batch_imports (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users (id),
    filename      VARCHAR(255) NOT NULL,
    total_rows    INTEGER      NOT NULL,
    success_count INTEGER      NOT NULL,
    error_count   INTEGER      NOT NULL,
    errors_json   TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_batch_imports_user_id ON batch_imports (user_id);
