import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TemplateFrameComponent } from "./template-frame.component";

/**
 * MINIMAL: a short rule, then a left-aligned setting with most of the page left empty.
 *
 * The emptiness is the template's distinguishing feature, so the setting stays in the top third
 * rather than being spread over the sheet.
 */
@Component({
  selector: "app-minimal-thumbnail",
  imports: [TemplateFrameComponent],
  template: `
    <app-template-frame>
      <div class="absolute inset-0 flex flex-col gap-[1%] px-[10%] pt-[6%]">
        <div class="h-px w-[12%] bg-paper-ink"></div>
        <div class="mt-[2%] h-[2%] w-[32%] rounded-full bg-paper-muted"></div>
        <div class="mt-[2%] h-[7%] w-[44%] rounded-sm bg-paper-ink"></div>
        <div class="mt-[2%] h-[3%] w-[26%] rounded-sm bg-paper-ink"></div>
        <div class="h-[2%] w-[38%] rounded-full bg-paper-muted"></div>

        <div class="mt-[2%] flex w-full items-end justify-between">
          <div class="flex w-[24%] flex-col gap-1">
            <div class="h-px w-[60%] rounded-full bg-paper-muted"></div>
            <div class="h-1 w-full rounded-full bg-paper-muted"></div>
          </div>
          <div class="flex flex-col items-center gap-1">
            <div class="size-5 bg-paper-ink"></div>
            <div class="h-px w-8 rounded-full bg-paper-ink"></div>
          </div>
          <div class="flex w-[24%] flex-col items-end gap-1">
            <div class="h-px w-[60%] rounded-full bg-paper-muted"></div>
            <div class="h-1 w-full rounded-full bg-paper-muted"></div>
          </div>
        </div>
      </div>
    </app-template-frame>
  `,
  host: { class: "block" },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinimalThumbnailComponent {}
