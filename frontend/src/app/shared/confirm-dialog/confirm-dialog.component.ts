import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { DIALOG_DATA, DialogRef } from "@angular/cdk/dialog";

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  /** Destructive actions get the revoked treatment; everything else stays neutral. */
  destructive?: boolean;
}

/**
 * Built on the CDK's `Dialog` rather than Angular Material's: the CDK gives the focus trap,
 * the Escape handling, the `aria-modal` semantics and the focus restoration, and brings no
 * Material styling with it.
 */
@Component({
  selector: "app-confirm-dialog",
  templateUrl: "./confirm-dialog.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);

  protected readonly data = inject<ConfirmDialogData>(DIALOG_DATA);

  protected close(confirmed: boolean): void {
    this.dialogRef.close(confirmed);
  }
}
