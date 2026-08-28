import { Routes } from "@angular/router";
import { ProfilePageComponent } from "./features/account/pages/profile-page/profile-page.component";
import { authGuard } from "./features/auth/auth-guard";
import { LoginPageComponent } from "./features/auth/pages/login-page/login-page.component";
import { SignupPageComponent } from "./features/auth/pages/signup-page/signup-page.component";
import { BatchUploadPageComponent } from "./features/certificates/pages/batch-upload-page/batch-upload-page.component";
import { CertificateFormPageComponent } from "./features/certificates/pages/certificate-form-page/certificate-form-page.component";
import { CertificateListPageComponent } from "./features/certificates/pages/certificate-list-page/certificate-list-page.component";
import { CertificatePreviewPageComponent } from "./features/certificates/pages/certificate-preview-page/certificate-preview-page.component";
import { VerifyCodePageComponent } from "./features/verification/pages/verify-code-page/verify-code-page.component";
import { VerifyPageComponent } from "./features/verification/pages/verify-page/verify-page.component";
import { ShellComponent } from "./layout/shell.component";

export const routes: Routes = [
  // Public group: no authenticated shell chrome, no auth guard.
  { path: "verify", component: VerifyPageComponent },
  { path: "verify/:code", component: VerifyPageComponent },
  { path: "login", component: LoginPageComponent },
  { path: "signup", component: SignupPageComponent },

  // Authenticated shell, guarded — see design.md ("Auth guard") for why the guard has to
  // silently refresh rather than just checking for an access token.
  {
    path: "",
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: "", pathMatch: "full", redirectTo: "certificates" },
      { path: "certificates", component: CertificateListPageComponent },
      { path: "verify-code", component: VerifyCodePageComponent },
      { path: "certificates/new", component: CertificateFormPageComponent },
      { path: "certificates/batch", component: BatchUploadPageComponent },
      { path: "certificates/:id/edit", component: CertificateFormPageComponent },
      { path: "certificates/:id/preview", component: CertificatePreviewPageComponent },
      { path: "profile", component: ProfilePageComponent },
    ],
  },
];
