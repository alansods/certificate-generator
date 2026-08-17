import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { API_BASE_URL } from "../../../core/config/api.config";
import { BatchImportResponse } from "./batch-import-response";
import { CertificatePageResponse, CertificateResponse, CertificateStatus } from "./certificate-page-response";
import { CertificateRequest } from "./certificate-request";

export interface CertificateListParams {
  page: number;
  size: number;
  q: string;
  status: CertificateStatus | null;
}

@Injectable({ providedIn: "root" })
export class CertificatesApi {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  list(params: CertificateListParams): Observable<CertificatePageResponse> {
    let httpParams = new HttpParams().set("page", params.page).set("size", params.size);
    if (params.q) {
      httpParams = httpParams.set("q", params.q);
    }
    if (params.status) {
      httpParams = httpParams.set("status", params.status);
    }
    return this.http.get<CertificatePageResponse>(`${this.apiBaseUrl}/api/v1/certificates`, {
      params: httpParams,
    });
  }

  get(id: number): Observable<CertificateResponse> {
    return this.http.get<CertificateResponse>(`${this.apiBaseUrl}/api/v1/certificates/${id}`);
  }

  create(request: CertificateRequest): Observable<CertificateResponse> {
    return this.http.post<CertificateResponse>(`${this.apiBaseUrl}/api/v1/certificates`, request);
  }

  update(id: number, request: CertificateRequest): Observable<CertificateResponse> {
    return this.http.put<CertificateResponse>(`${this.apiBaseUrl}/api/v1/certificates/${id}`, request);
  }

  deleteById(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/api/v1/certificates/${id}`);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiBaseUrl}/api/v1/certificates/${id}/pdf`, { responseType: "blob" });
  }

  uploadBatch(file: File): Observable<BatchImportResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post<BatchImportResponse>(`${this.apiBaseUrl}/api/v1/certificates/batch`, formData);
  }

  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiBaseUrl}/api/v1/certificates/batch/template.csv`, {
      responseType: "blob",
    });
  }
}
