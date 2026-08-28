import { FormControl, FormGroup } from "@angular/forms";
import { passwordPolicyValidator, passwordsMatchValidator } from "./password-validators";

describe("passwordPolicyValidator", () => {
  it("passes an empty value (not touched yet)", () => {
    const control = new FormControl("");
    expect(passwordPolicyValidator(control)).toBeNull();
  });

  it("fails a password shorter than 8 characters", () => {
    const control = new FormControl("short1");
    expect(passwordPolicyValidator(control)).toEqual({ policy: true });
  });

  it("fails a password with no digit", () => {
    const control = new FormControl("nodigitshere");
    expect(passwordPolicyValidator(control)).toEqual({ policy: true });
  });

  it("passes a password with 8+ characters including a digit", () => {
    const control = new FormControl("correct-horse1");
    expect(passwordPolicyValidator(control)).toBeNull();
  });
});

describe("passwordsMatchValidator", () => {
  function group(password: string, confirmPassword: string): FormGroup {
    return new FormGroup({
      password: new FormControl(password),
      confirmPassword: new FormControl(confirmPassword),
    });
  }

  const validator = passwordsMatchValidator("password", "confirmPassword");

  it("does not report a blank confirmation as a mismatch", () => {
    expect(validator(group("correct-horse1", ""))).toBeNull();
  });

  it("passes when both values match", () => {
    expect(validator(group("correct-horse1", "correct-horse1"))).toBeNull();
  });

  it("fails when the values differ and the confirmation is non-blank", () => {
    expect(validator(group("correct-horse1", "different-horse2"))).toEqual({ mismatch: true });
  });
});
