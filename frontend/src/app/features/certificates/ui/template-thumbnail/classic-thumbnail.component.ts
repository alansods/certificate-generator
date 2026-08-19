import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TemplateFrameComponent } from "./template-frame.component";

/** CLASSIC: a gold double frame around centered, formal setting. */
@Component({
  selector: "app-classic-thumbnail",
  imports: [TemplateFrameComponent],
  template: `
    <app-template-frame>
      <div class="absolute inset-[6%] border-2 border-double border-classic-gold">
        <div
          class="absolute inset-[7%] flex flex-col items-center justify-center gap-[3%] border border-classic-gold px-[8%]"
        >
          <div class="h-[3%] w-[38%] rounded-full bg-classic-gold"></div>
          <div class="h-[9%] w-[46%] rounded-sm bg-paper-ink"></div>
          <div class="h-[3%] w-[30%] rounded-full bg-paper-muted"></div>
          <div class="h-[6%] w-[54%] rounded-sm border-b border-paper-rule bg-paper-ink"></div>
          <div class="h-[3%] w-[40%] rounded-full bg-paper-muted"></div>

          <div class="mt-[4%] flex w-full items-end justify-between">
            <div class="flex w-[26%] flex-col gap-[14%]">
              <div class="h-1 w-full rounded-full bg-paper-muted"></div>
              <div class="h-1 w-[70%] rounded-full bg-paper-ink"></div>
            </div>
            <div class="flex flex-col items-center gap-1">
              <div class="size-6 bg-paper-ink"></div>
              <div class="h-px w-8 rounded-full bg-classic-gold"></div>
            </div>
            <div class="flex w-[26%] flex-col items-end gap-[14%]">
              <div class="h-1 w-full rounded-full bg-paper-muted"></div>
              <div class="h-1 w-[70%] rounded-full bg-paper-ink"></div>
            </div>
          </div>
        </div>
      </div>
    </app-template-frame>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassicThumbnailComponent {}
