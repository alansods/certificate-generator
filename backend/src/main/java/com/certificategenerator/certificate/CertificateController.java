package com.certificategenerator.certificate;

import com.certificategenerator.auth.AuthenticatedPrincipal;
import com.certificategenerator.certificate.dto.CertificateRequest;
import com.certificategenerator.certificate.dto.CertificateResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/certificates")
public class CertificateController {

    private final CertificateService certificateService;
    private final CertificateMapper certificateMapper;

    public CertificateController(
            CertificateService certificateService, CertificateMapper certificateMapper) {
        this.certificateService = certificateService;
        this.certificateMapper = certificateMapper;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CertificateResponse create(
            @Valid @RequestBody CertificateRequest request,
            @AuthenticationPrincipal AuthenticatedPrincipal principal) {
        Certificate certificate = certificateService.create(request, principal.userId());
        return certificateMapper.toResponse(certificate);
    }

    @GetMapping
    public Page<CertificateResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) CertificateStatus status,
            @PageableDefault Pageable pageable) {
        return certificateService.list(q, status, pageable).map(certificateMapper::toResponse);
    }

    @GetMapping("/{id}")
    public CertificateResponse get(@PathVariable Long id) {
        return certificateMapper.toResponse(certificateService.get(id));
    }

    @PutMapping("/{id}")
    public CertificateResponse update(
            @PathVariable Long id, @Valid @RequestBody CertificateRequest request) {
        return certificateMapper.toResponse(certificateService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        certificateService.delete(id);
    }
}
