import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TemplateFrameComponent } from "./template-frame.component";

/**
 * CLASSIC: a gold double frame (a heavier outer rule and a hairline inner one) around a
 * centered, formal setting.
 *
 * Proportions taken from the rendered template, not from the mockup: the setting is top-weighted
 * inside the frame and the lower part of the page stays empty, which a vertically centered
 * thumbnail would misrepresent.
 */
@Component({
  selector: "app-classic-thumbnail",
  imports: [TemplateFrameComponent],
  template: `
    <app-template-frame>
      <div class="absolute inset-[5%] border-2 border-classic-gold">
        <div class="absolute inset-[3%] border border-classic-gold">
          <div class="absolute inset-0 flex flex-col items-center gap-[2.5%] px-[9%] pt-[6%]">
            <div class="h-[2.5%] w-[40%] rounded-full bg-classic-gold"></div>
            <div class="h-[8%] w-[30%] rounded-sm bg-paper-ink"></div>
            <div class="h-[2%] w-[22%] rounded-full bg-paper-muted"></div>
            <div
              class="mt-[2%] h-[6%] w-[42%] rounded-sm border-b border-paper-rule bg-paper-ink"
            ></div>
            <div class="h-[2.5%] w-[28%] rounded-full bg-paper-muted"></div>
            <div class="h-[3.5%] w-[34%] rounded-sm bg-paper-ink"></div>
            <div class="h-[2%] w-[44%] rounded-full bg-paper-muted"></div>

            <div class="mt-[3%] flex w-full items-end justify-between">
              <div class="flex w-[24%] flex-col gap-1">
                <div class="h-px w-[60%] rounded-full bg-paper-muted"></div>
                <div class="h-1 w-full rounded-full bg-paper-ink"></div>
              </div>
              <div class="flex flex-col items-center gap-1">
                <div class="size-6 bg-paper-ink"></div>
                <div class="h-px w-8 rounded-full bg-classic-gold"></div>
              </div>
              <div class="flex w-[24%] flex-col items-end gap-1">
                <div class="h-px w-[60%] rounded-full bg-paper-muted"></div>
                <div class="h-1 w-full rounded-full bg-paper-ink"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </app-template-frame>
  `,
  host: { class: "block" },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassicThumbnailComponent {}
