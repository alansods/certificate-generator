package com.certificategenerator.certificate.batch.dto;

import java.util.List;

public record BatchImportResponse(
        int totalRows, int successCount, int errorCount, List<BatchRowError> errors) {}
