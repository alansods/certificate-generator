package com.certificategenerator.certificate.pdf;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Base64;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Encodes {@code {frontend-base-url}/verify/{code}} as a QR code, embedded in the PDF templates
 * as a base64 PNG data URI, per design.md.
 */
@Component
public class QrCodeGenerator {

    private static final int SIZE_PX = 240;

    private final String frontendBaseUrl;

    public QrCodeGenerator(@Value("${app.frontend-base-url:}") String frontendBaseUrl) {
        this.frontendBaseUrl = frontendBaseUrl;
    }

    public String verifyUrl(String code) {
        return frontendBaseUrl + "/verify/" + code;
    }

    public String dataUriFor(String code) {
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(pngBytesFor(verifyUrl(code)));
    }

    private byte[] pngBytesFor(String content) {
        try {
            BitMatrix matrix =
                    new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, SIZE_PX, SIZE_PX);
            BufferedImage image = MatrixToImageWriter.toBufferedImage(matrix);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (WriterException | IOException e) {
            throw new UncheckedIOException("Failed to generate QR code", wrapIfNeeded(e));
        }
    }

    private static IOException wrapIfNeeded(Exception e) {
        return e instanceof IOException io ? io : new IOException(e);
    }
}
