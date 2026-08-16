package com.certificategenerator.certificate.pdf;

import com.certificategenerator.certificate.Certificate;
import com.openhtmltopdf.extend.FSSupplier;
import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

/**
 * Renders a certificate to PDF bytes entirely in memory (Thymeleaf -> XHTML string -> OpenHTMLtoPDF),
 * per openspec/specs/certificate-pdf/spec.md and the free-tier "no persistent disk" constraint.
 */
@Service
public class CertificatePdfService {

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.US);
    private static final ClassPathResource FONT_REGULAR =
            new ClassPathResource("fonts/OpenSans-Regular.ttf");
    private static final ClassPathResource FONT_BOLD = new ClassPathResource("fonts/OpenSans-Bold.ttf");

    private final TemplateEngine templateEngine;
    private final QrCodeGenerator qrCodeGenerator;

    public CertificatePdfService(TemplateEngine templateEngine, QrCodeGenerator qrCodeGenerator) {
        this.templateEngine = templateEngine;
        this.qrCodeGenerator = qrCodeGenerator;
    }

    public byte[] render(Certificate certificate) {
        String html = templateEngine.process(templateNameFor(certificate), contextFor(certificate));
        return toPdf(html);
    }

    private static String templateNameFor(Certificate certificate) {
        return "certificates/" + certificate.getTemplate().name().toLowerCase(Locale.ROOT);
    }

    private Context contextFor(Certificate certificate) {
        Context context = new Context();
        context.setVariable("recipientName", certificate.getRecipientName());
        context.setVariable("courseName", certificate.getCourseName());
        context.setVariable("workloadHours", certificate.getWorkloadHours());
        context.setVariable("completionDate", DATE_FORMAT.format(certificate.getCompletionDate()));
        context.setVariable("issueDate", DATE_FORMAT.format(certificate.getIssueDate()));
        context.setVariable("instructorName", certificate.getInstructorName());
        context.setVariable("code", certificate.getCode());
        context.setVariable("qrDataUri", qrCodeGenerator.dataUriFor(certificate.getCode()));
        context.setVariable("verifyUrl", qrCodeGenerator.verifyUrl(certificate.getCode()));
        return context;
    }

    private byte[] toPdf(String html) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFont(fontSupplier(FONT_REGULAR), "Open Sans");
            builder.useFont(fontSupplier(FONT_BOLD), "Open Sans", 700, FontStyle.NORMAL, true);
            builder.withHtmlContent(html, null);
            builder.toStream(out);
            builder.run();
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to render certificate PDF", e);
        }
    }

    private static FSSupplier<InputStream> fontSupplier(ClassPathResource resource) {
        return () -> {
            try {
                return resource.getInputStream();
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        };
    }
}
