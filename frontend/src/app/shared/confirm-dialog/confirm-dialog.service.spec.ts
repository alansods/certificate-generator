import { Dialog } from "@angular/cdk/dialog";
import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { firstValueFrom } from "rxjs";
import { ConfirmDialogService } from "./confirm-dialog.service";

describe("ConfirmDialogService", () => {
  let service: ConfirmDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    service = TestBed.inject(ConfirmDialogService);
  });

  /** No fixture here, so nothing else drives change detection for the overlay's own view. */
  function render(): void {
    TestBed.inject(ApplicationRef).tick();
  }

  afterEach(() => {
    for (const panel of document.querySelectorAll(".cdk-overlay-container")) {
      panel.remove();
    }
  });

  function dialogButton(label: string): HTMLButtonElement {
    const button = [...document.querySelectorAll<HTMLButtonElement>("app-confirm-dialog button")].find(
      (candidate) => candidate.textContent?.trim() === label,
    );
    if (!button) {
      throw new Error(`Expected a "${label}" button in the dialog`);
    }
    return button;
  }

  it("renders the question and resolves true when confirmed", async () => {
    const closed = firstValueFrom(
      service.confirm({ title: "Delete certificate", message: "Really?", confirmLabel: "Delete" }),
    );

    render();

    expect(document.body.textContent).toContain("Delete certificate");
    expect(document.body.textContent).toContain("Really?");

    dialogButton("Delete").click();

    await expect(closed).resolves.toBe(true);
  });

  it("resolves false when cancelled", async () => {
    const closed = firstValueFrom(service.confirm({ title: "Delete", message: "Really?" }));
    render();

    dialogButton("Cancel").click();

    await expect(closed).resolves.toBe(false);
  });

  it("reads a dismissal as a refusal, never as a confirmation", async () => {
    const closed = firstValueFrom(service.confirm({ title: "Delete", message: "Really?" }));
    render();

    // Dismissing — Escape, a backdrop click — closes with no value. Driving it through the CDK's
    // own API rather than a synthetic key event, which its overlay does not pick up under jsdom.
    TestBed.inject(Dialog).closeAll();

    await expect(closed).resolves.toBe(false);
  });

  it("marks the dialog as modal and names it from its own title", () => {
    void firstValueFrom(service.confirm({ title: "Delete certificate", message: "Really?" }));
    render();

    const panel = document.querySelector("[role='dialog']");

    expect(panel?.getAttribute("aria-modal")).toBe("true");
    expect(panel?.getAttribute("aria-labelledby")).toBe("confirm-dialog-title");
    dialogButton("Confirm").click();
  });
});
