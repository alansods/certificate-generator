import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TemplateFrameComponent } from "./template-frame.component";

/** MINIMAL: a short rule, then left-aligned setting with a lot of the page left empty. */
@Component({
  selector: "app-minimal-thumbnail",
  imports: [TemplateFrameComponent],
  template: `
    <app-template-frame>
      <div class="flex h-full flex-col justify-center gap-[3.5%] px-[12%]">
        <div class="h-px w-[16%] bg-paper-ink"></div>
        <div class="h-[2.5%] w-[30%] rounded-full bg-paper-muted"></div>
        <div class="mt-[4%] h-[10%] w-[48%] rounded-sm bg-paper-ink"></div>
        <div class="h-[4%] w-[36%] rounded-sm bg-paper-ink"></div>
        <div class="h-[2.5%] w-[26%] rounded-full bg-paper-muted"></div>

        <div class="mt-[8%] flex w-full items-end justify-between">
          <div class="flex w-[26%] flex-col gap-[14%]">
            <div class="h-1 w-full rounded-full bg-paper-muted"></div>
            <div class="h-1 w-[70%] rounded-full bg-paper-muted"></div>
          </div>
          <div class="flex flex-col items-center gap-1">
            <div class="size-5 bg-paper-ink"></div>
            <div class="h-px w-8 rounded-full bg-paper-ink"></div>
          </div>
          <div class="flex w-[26%] flex-col items-end gap-[14%]">
            <div class="h-1 w-full rounded-full bg-paper-muted"></div>
            <div class="h-1 w-[70%] rounded-full bg-paper-muted"></div>
          </div>
        </div>
      </div>
    </app-template-frame>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinimalThumbnailComponent {}
