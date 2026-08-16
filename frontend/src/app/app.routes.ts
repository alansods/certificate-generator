import { Routes } from "@angular/router";
import { ShellComponent } from "./layout/shell.component";
import { PlaceholderComponent } from "./shared/placeholder.component";

export const routes: Routes = [
  // Public group: no authenticated shell chrome, no auth guard. `/login` joins this group in 2.2.
  {
    path: "verify/:code",
    component: PlaceholderComponent,
    data: { label: "Certificate verification" },
  },

  // Authenticated shell. No canActivate guard yet — added in 2.2 alongside the login page it
  // protects (design.md: "shaped so adding the guard later is a one-line addition").
  {
    path: "",
    component: ShellComponent,
    children: [],
  },
];
