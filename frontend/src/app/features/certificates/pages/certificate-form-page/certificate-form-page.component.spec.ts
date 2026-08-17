import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { FormControl, FormGroup } from "@angular/forms";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from "@angular/router";
import { TokenStorageService } from "../../../../core/auth/token-storage.service";
import { CertificateFormPageComponent } from "./certificate-form-page.component";

interface FormAccess {
  form: FormGroup<{
    recipientName: FormControl<string>;
    recipientEmail: FormControl<string>;
    courseName: FormControl<string>;
    workloadHours: FormControl<number | null>;
    completionDate: FormControl<string>;
    issueDate: FormControl<string>;
    instructorName: FormControl<string>;
    template: FormControl<string>;
  }>;
}

function getForm(fixture: ComponentFixture<CertificateFormPageComponent>): FormAccess["form"] {
  return (fixture.componentInstance as unknown as FormAccess).form;
}

function fakeJwt(payload: Record<string, unknown>): string {
  const base64url = (value: string) =>
    btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${base64url(JSON.stringify({ alg: "HS256" }))}.${base64url(JSON.stringify(payload))}.sig`;
}

/** See certificate-list-page.component.spec.ts for why this is used instead of fixture.whenStable(). */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const VALID_VALUES = {
  recipientName: "Jane Doe",
  recipientEmail: "jane@example.com",
  courseName: "Advanced Angular",
  workloadHours: 40,
  completionDate: "2026-05-12",
  issueDate: "2026-05-15",
  instructorName: "John Smith",
};

describe("CertificateFormPageComponent", () => {
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorageService;

  function setup(role: string, id: string | null) {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CertificateFormPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
    tokenStorage.setTokens(fakeJwt({ role }), "refresh-1");
    return TestBed.createComponent(CertificateFormPageComponent);
  }

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  function fillValidForm(fixture: ReturnType<typeof setup>) {
    getForm(fixture).setValue({
      ...VALID_VALUES,
      template: "CLASSIC",
    });
  }

  it("create mode submits and navigates to the list on success", async () => {
    const fixture = setup("USER", null);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, "navigateByUrl");
    fixture.detectChanges();

    fillValidForm(fixture);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector("form")?.dispatchEvent(new Event("submit"));

    const req = httpMock.expectOne(
      (r) => r.url.endsWith("/api/v1/certificates") && r.method === "POST",
    );
    expect(req.request.body).toEqual({ ...VALID_VALUES, template: "CLASSIC" });
    req.flush({ id: 1, code: "CERT-AAAA-BBBB" });
    await tick();

    expect(navigateSpy).toHaveBeenCalledWith("/certificates");
  });

  it("edit mode loads and pre-fills the existing certificate", async () => {
    const fixture = setup("USER", "7");
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7") && r.method === "GET")
      .flush({ ...VALID_VALUES, id: 7, code: "CERT-AAAA-BBBB", template: "MODERN", status: "ISSUED" });
    await tick();
    fixture.detectChanges();

    expect(getForm(fixture).controls.recipientName.value).toBe("Jane Doe");
    expect(getForm(fixture).controls.template.value).toBe("MODERN");
  });

  it("shows server-side field errors on the matching controls", async () => {
    const fixture = setup("USER", null);
    fixture.detectChanges();

    fillValidForm(fixture);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector("form")?.dispatchEvent(new Event("submit"));

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates") && r.method === "POST")
      .flush(
        { status: 400, fieldErrors: { recipientEmail: "must be a valid email" } },
        { status: 400, statusText: "Bad Request" },
      );
    await tick();

    expect(getForm(fixture).controls.recipientEmail.errors?.["server"]).toBe(
      "must be a valid email",
    );
  });

  it("blocks submission without a request when the form is invalid", () => {
    const fixture = setup("USER", null);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector("form")?.dispatchEvent(new Event("submit"));

    httpMock.expectNone((r) => r.url.endsWith("/api/v1/certificates"));
    expect(getForm(fixture).controls.recipientName.touched).toBe(true);
  });

  it("hides the delete action for a non-admin role in edit mode", async () => {
    const fixture = setup("USER", "7");
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7"))
      .flush({ ...VALID_VALUES, id: 7, code: "CERT-AAAA-BBBB", template: "CLASSIC", status: "ISSUED" });
    await tick();
    fixture.detectChanges();

    const deleteButton = (fixture.nativeElement as HTMLElement).querySelector("button[color='warn']");
    expect(deleteButton).toBeNull();
  });

  it("shows the delete action for ADMIN in edit mode", async () => {
    const fixture = setup("ADMIN", "7");
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7"))
      .flush({ ...VALID_VALUES, id: 7, code: "CERT-AAAA-BBBB", template: "CLASSIC", status: "ISSUED" });
    await tick();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector("button[color='warn']"),
    ).not.toBeNull();
  });

  it("hides the delete action in create mode even for ADMIN", () => {
    const fixture = setup("ADMIN", null);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector("button[color='warn']")).toBeNull();
  });
});
