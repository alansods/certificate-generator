import { Routes } from "@angular/router";
import { authGuard } from "./features/auth/auth-guard";
import { LoginPageComponent } from "./features/auth/pages/login-page/login-page.component";
import { CertificateFormPageComponent } from "./features/certificates/pages/certificate-form-page/certificate-form-page.component";
import { CertificateListPageComponent } from "./features/certificates/pages/certificate-list-page/certificate-list-page.component";
import { ShellComponent } from "./layout/shell.component";
import { PlaceholderComponent } from "./shared/placeholder.component";

export const routes: Routes = [
  // Public group: no authenticated shell chrome, no auth guard.
  {
    path: "verify/:code",
    component: PlaceholderComponent,
    data: { label: "Certificate verification" },
  },
  { path: "login", component: LoginPageComponent },

  // Authenticated shell, guarded — see design.md ("Auth guard") for why the guard has to
  // silently refresh rather than just checking for an access token.
  {
    path: "",
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: "", pathMatch: "full", redirectTo: "certificates" },
      { path: "certificates", component: CertificateListPageComponent },
      { path: "certificates/new", component: CertificateFormPageComponent },
      { path: "certificates/:id/edit", component: CertificateFormPageComponent },
    ],
  },
];
