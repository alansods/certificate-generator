package com.certificategenerator.certificate.batch;

public class BatchTooManyRowsException extends RuntimeException {

    public BatchTooManyRowsException(int rowCount, int maxRows) {
        super("Batch has " + rowCount + " rows, exceeding the maximum of " + maxRows);
    }
}
