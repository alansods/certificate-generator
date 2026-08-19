import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TemplateFrameComponent } from "./template-frame.component";

/**
 * MODERN: a thin blue band across the top over a left-aligned setting, the recipient in blue.
 *
 * The band is 22px of an A4 landscape page in the rendered template, so it reads as a rule rather
 * than the wide color block a thumbnail drawn from the mockup alone would give it.
 */
@Component({
  selector: "app-modern-thumbnail",
  imports: [TemplateFrameComponent],
  template: `
    <app-template-frame>
      <div class="absolute inset-x-0 top-0 h-[3%] bg-modern-blue"></div>

      <div class="absolute inset-0 flex flex-col gap-[1%] px-[8%] pt-[6%]">
        <div class="h-[2.5%] w-[36%] rounded-full bg-modern-blue"></div>
        <div class="h-[7%] w-[26%] rounded-sm bg-paper-ink"></div>
        <div class="mt-[2%] h-[2%] w-[14%] rounded-full bg-paper-muted"></div>
        <div class="h-[5.5%] w-[40%] rounded-sm bg-modern-blue"></div>
        <div class="mt-[1.5%] h-[2%] w-[18%] rounded-full bg-paper-muted"></div>
        <div class="h-[3.5%] w-[28%] rounded-sm bg-paper-ink"></div>
        <div class="h-[2%] w-[40%] rounded-full bg-paper-muted"></div>

        <div class="mt-[1.5%] flex w-full items-end justify-between">
          <div class="flex w-[24%] flex-col gap-1">
            <div class="h-px w-[60%] rounded-full bg-paper-muted"></div>
            <div class="h-1 w-full rounded-full bg-paper-ink"></div>
          </div>
          <div class="flex flex-col items-center gap-1">
            <div class="size-6 bg-paper-ink"></div>
            <div class="h-px w-8 rounded-full bg-modern-blue"></div>
          </div>
          <div class="flex w-[24%] flex-col items-end gap-1">
            <div class="h-px w-[60%] rounded-full bg-paper-muted"></div>
            <div class="h-1 w-full rounded-full bg-paper-ink"></div>
          </div>
        </div>
      </div>
    </app-template-frame>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModernThumbnailComponent {}
