import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { API_BASE_URL } from "../../../core/config/api.config";
import { CertificateVerificationResponse } from "./certificate-verification-response";

@Injectable({ providedIn: "root" })
export class VerificationApi {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  verify(code: string): Observable<CertificateVerificationResponse> {
    return this.http.get<CertificateVerificationResponse>(
      `${this.apiBaseUrl}/api/v1/public/verify/${encodeURIComponent(code)}`,
    );
  }
}
