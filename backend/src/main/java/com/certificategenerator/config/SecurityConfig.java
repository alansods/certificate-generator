package com.certificategenerator.config;

import com.certificategenerator.auth.JwtAuthenticationFilter;
import com.certificategenerator.auth.JwtService;
import com.certificategenerator.web.RestAccessDeniedHandler;
import com.certificategenerator.web.RestAuthenticationEntryPoint;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtService jwtService,
            RestAuthenticationEntryPoint authenticationEntryPoint,
            RestAccessDeniedHandler accessDeniedHandler)
            throws Exception {
        http.csrf(csrf -> csrf.disable())
                // Delegates to CorsConfig's WebMvcConfigurer registration (via
                // HandlerMappingIntrospector) rather than a separate CorsConfigurationSource
                // bean. Without this, Spring Security rejects every CORS preflight (OPTIONS)
                // request with 401 before Spring MVC's own CORS handling ever runs — CorsConfig
                // alone is not sufficient once Spring Security is on the classpath.
                .cors(Customizer.withDefaults())
                .httpBasic(httpBasic -> httpBasic.disable())
                .formLogin(formLogin -> formLogin.disable())
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(
                        authorize ->
                                authorize
                                        .requestMatchers(
                                                "/actuator/health",
                                                "/api/v1/auth/register",
                                                "/api/v1/auth/registration-enabled",
                                                "/api/v1/auth/login",
                                                "/api/v1/auth/refresh",
                                                // The refresh token in the body is the credential
                                                // being spent. Requiring an access token as well
                                                // means an expired one sends logout through the
                                                // client's silent-refresh retry, which rotates the
                                                // refresh token and then revokes the superseded
                                                // one — leaving the live token unrevoked.
                                                "/api/v1/auth/logout",
                                                "/api/v1/public/verify/**")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.DELETE, "/api/v1/certificates/**")
                                        .hasRole("ADMIN")
                                        .anyRequest()
                                        .authenticated())
                .exceptionHandling(
                        exceptionHandling ->
                                exceptionHandling
                                        .authenticationEntryPoint(authenticationEntryPoint)
                                        .accessDeniedHandler(accessDeniedHandler))
                .addFilterBefore(
                        new JwtAuthenticationFilter(jwtService),
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
