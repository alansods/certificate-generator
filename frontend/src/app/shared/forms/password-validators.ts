import { AbstractControl, ValidationErrors } from "@angular/forms";

/**
 * Not a built-in Validators option: the rule has to match backend/.../validation/PasswordPolicy
 * exactly, since a client-side pass that's looser than the server's just means the request goes
 * out and comes back with a field error instead of failing locally. Shared between the profile
 * page's password change and the sign-up form — both enforce the same server-side rule.
 */
export function passwordPolicyValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === "string" ? control.value : "";
  if (!value) {
    return null;
  }
  const meetsPolicy = value.length >= 8 && /\d/.test(value);
  return meetsPolicy ? null : { policy: true };
}

/**
 * Set on the group, not on confirmPassword's own errors: a validator that reaches over and calls
 * a sibling control's setErrors() fights that control's own validation run — concretely, an empty
 * confirmPassword ended up with both `required` and `mismatch`, and a field-error lookup reported
 * the wrong one. Read via `form.errors?.["mismatch"]` instead. Skipped while confirmPassword is
 * empty so the plain "required" message wins there. `newPasswordField`/`confirmPasswordField` let
 * the profile page's password-change group and the sign-up form's differently-named controls
 * share this one function.
 */
export function passwordsMatchValidator(
  newPasswordField: string,
  confirmPasswordField: string,
): (group: AbstractControl) => ValidationErrors | null {
  return (group: AbstractControl) => {
    const newPassword = group.get(newPasswordField)?.value;
    const confirmPassword = group.get(confirmPasswordField)?.value;
    if (!confirmPassword) {
      return null;
    }
    return newPassword === confirmPassword ? null : { mismatch: true };
  };
}
