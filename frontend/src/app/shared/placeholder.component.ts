import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/** Temporary stand-in for a route whose real component lands in a later change. */
@Component({
  selector: "app-placeholder",
  template: `<p>{{ label() }} — coming soon.</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderComponent {
  readonly label = input("This page");
}
