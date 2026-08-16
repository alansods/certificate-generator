CREATE TABLE certificates (
    id               BIGSERIAL PRIMARY KEY,
    code             VARCHAR(20)  NOT NULL UNIQUE,
    recipient_name   VARCHAR(255) NOT NULL,
    recipient_email  VARCHAR(255) NOT NULL,
    course_name      VARCHAR(255) NOT NULL,
    workload_hours   INTEGER      NOT NULL,
    completion_date  DATE         NOT NULL,
    issue_date       DATE         NOT NULL,
    instructor_name  VARCHAR(255) NOT NULL,
    template         VARCHAR(20)  NOT NULL,
    status           VARCHAR(20)  NOT NULL,
    created_by       BIGINT       NOT NULL REFERENCES users (id),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_certificates_status ON certificates (status);
