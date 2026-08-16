package com.certificategenerator;

import org.springframework.boot.SpringApplication;

public class TestCertificateGeneratorApplication {

	public static void main(String[] args) {
		SpringApplication.from(CertificateGeneratorApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
