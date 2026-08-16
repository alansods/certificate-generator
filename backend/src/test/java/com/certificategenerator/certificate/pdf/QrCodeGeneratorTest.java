package com.certificategenerator.certificate.pdf;

import static org.assertj.core.api.Assertions.assertThat;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.Result;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.Base64;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class QrCodeGeneratorTest {

    @Test
    void encodesTheFrontendVerifyUrlIntoADecodableQrCode() throws Exception {
        QrCodeGenerator generator = new QrCodeGenerator("https://certificates.example.com");

        String code = "CERT-7K2M-9XQ4";
        String dataUri = generator.dataUriFor(code);

        assertThat(dataUri).startsWith("data:image/png;base64,");
        String decodedContent = decodeQrContent(dataUri);
        assertThat(decodedContent).isEqualTo("https://certificates.example.com/verify/" + code);
    }

    @Test
    void verifyUrlIsJustThePathWhenBaseUrlIsUnset() {
        QrCodeGenerator generator = new QrCodeGenerator("");

        assertThat(generator.verifyUrl("CERT-AAAA-BBBB")).isEqualTo("/verify/CERT-AAAA-BBBB");
    }

    private static String decodeQrContent(String dataUri) throws Exception {
        String base64 = dataUri.substring("data:image/png;base64,".length());
        byte[] pngBytes = Base64.getDecoder().decode(base64);
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(pngBytes));
        BinaryBitmap bitmap =
                new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(image)));
        Result result = new MultiFormatReader().decode(bitmap);
        return result.getText();
    }
}
