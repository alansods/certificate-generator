import { Dialog } from "@angular/cdk/dialog";
import { inject, Injectable } from "@angular/core";
import { map, Observable } from "rxjs";
import { ConfirmDialogComponent, ConfirmDialogData } from "./confirm-dialog.component";

/** One place that knows how a confirmation is opened, so call sites only describe the question. */
@Injectable({ providedIn: "root" })
export class ConfirmDialogService {
  private readonly dialog = inject(Dialog);

  /** Emits once: `true` when confirmed, `false` when cancelled, dismissed or closed with Escape. */
  confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open<boolean>(ConfirmDialogComponent, {
        data,
        ariaLabelledBy: "confirm-dialog-title",
        ariaDescribedBy: "confirm-dialog-message",
        // The CDK leaves this false by default, which tells assistive technology the rest of the
        // page is still available while a modal is trapping focus.
        ariaModal: true,
        // The backdrop is styled here rather than in the panel so the panel stays a plain card.
        // `blur-xs` (4px) rather than the design note's 2px: it is the smallest step on the
        // scale, and a raw value in a class list is what the style guide rules out.
        backdropClass: ["bg-neutral-900/60", "backdrop-blur-xs"],
        panelClass: "outline-none",
      })
      .closed.pipe(map((confirmed) => confirmed === true));
  }
}
