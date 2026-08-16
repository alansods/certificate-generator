package com.certificategenerator.certificate.batch;

import java.util.List;

public class BatchInvalidHeaderException extends RuntimeException {

    public BatchInvalidHeaderException(List<String> expected, List<String> actual) {
        super("Expected CSV header " + expected + " but got " + actual);
    }
}
