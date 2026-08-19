import { ChangeDetectionStrategy, Component } from "@angular/core";

/**
 * The sheet every template thumbnail is drawn on. A4 landscape (1.414 wide), matching
 * `@page { size: A4 landscape }` in the Thymeleaf templates — the thumbnails are a preview of a
 * real PDF, so they carry that PDF's orientation rather than a portrait page nobody generates.
 *
 * Purely decorative: the card that owns the thumbnail carries the name and the selected state,
 * so nothing in here is exposed to assistive technology.
 */
@Component({
  selector: "app-template-frame",
  template: `
    <div
      class="relative aspect-[1.414/1] w-full overflow-hidden rounded-sm bg-paper"
      aria-hidden="true"
    >
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateFrameComponent {}
