package com.certificategenerator;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableSpringDataWebSupport(pageSerializationMode = PageSerializationMode.VIA_DTO)
// Backs PasswordResetMailDispatcher's @Async method, so the reset email send happens off the
// request thread — see design.md "Always answering 202".
@EnableAsync
public class CertificateGeneratorApplication {

	public static void main(String[] args) {
		SpringApplication.run(CertificateGeneratorApplication.class, args);
	}

}
