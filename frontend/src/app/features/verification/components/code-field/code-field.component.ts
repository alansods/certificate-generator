import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { CERTIFICATE_CODE_LENGTH } from "../../data/certificate-code";

let nextId = 0;

/**
 * The code entry field and its format message, shared by both verification pages.
 *
 * Renders a submit button, so it must be placed inside a `<form>`; the page owns the form because
 * the two differ in where submitting navigates.
 */
@Component({
  selector: "app-code-field",
  imports: [ReactiveFormsModule],
  templateUrl: "./code-field.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeFieldComponent {
  readonly control = input.required<FormControl<string>>();
  readonly invalid = input(false);
  /** Unique per instance so two fields on one page cannot describe each other. */
  protected readonly errorId = `code-format-error-${nextId++}`;

  protected readonly maxLength = CERTIFICATE_CODE_LENGTH;
}
