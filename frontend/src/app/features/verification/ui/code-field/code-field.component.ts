import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { CERTIFICATE_CODE_LENGTH } from "../../data/certificate-code";

/** The code entry field and its format message, shared by both verification pages. */
@Component({
  selector: "app-code-field",
  imports: [ReactiveFormsModule],
  templateUrl: "./code-field.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeFieldComponent {
  readonly control = input.required<FormControl<string>>();
  readonly invalid = input(false);
  readonly errorId = input.required<string>();

  protected readonly maxLength = CERTIFICATE_CODE_LENGTH;
}
