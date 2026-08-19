import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TemplateFrameComponent } from "./template-frame.component";

/** MODERN: a blue band across the top over left-aligned setting, the recipient in blue. */
@Component({
  selector: "app-modern-thumbnail",
  imports: [TemplateFrameComponent],
  template: `
    <app-template-frame>
      <div class="h-[7%] w-full bg-modern-blue"></div>

      <div class="flex h-[93%] flex-col justify-center gap-[3%] px-[10%]">
        <div class="h-[3%] w-[34%] rounded-full bg-modern-blue"></div>
        <div class="h-[10%] w-[42%] rounded-sm bg-paper-ink"></div>
        <div class="h-[2.5%] w-[20%] rounded-full bg-paper-muted"></div>
        <div class="h-[7%] w-[50%] rounded-sm bg-modern-blue"></div>
        <div class="h-[2.5%] w-[24%] rounded-full bg-paper-muted"></div>
        <div class="h-[4%] w-[44%] rounded-sm bg-paper-ink"></div>

        <div class="mt-[4%] flex w-full items-end justify-between">
          <div class="flex w-[26%] flex-col gap-[14%]">
            <div class="h-1 w-full rounded-full bg-paper-muted"></div>
            <div class="h-1 w-[70%] rounded-full bg-paper-ink"></div>
          </div>
          <div class="flex flex-col items-center gap-1">
            <div class="size-6 bg-paper-ink"></div>
            <div class="h-px w-8 rounded-full bg-modern-blue"></div>
          </div>
          <div class="flex w-[26%] flex-col items-end gap-[14%]">
            <div class="h-1 w-full rounded-full bg-paper-muted"></div>
            <div class="h-1 w-[70%] rounded-full bg-paper-ink"></div>
          </div>
        </div>
      </div>
    </app-template-frame>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModernThumbnailComponent {}
