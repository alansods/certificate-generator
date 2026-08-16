import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { ShellComponent } from "./shell.component";

describe("ShellComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [provideRouter([])],
    });
  });

  it("renders without error", () => {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it("closes the nav when the toggle button is clicked, and reopens it on a second click", () => {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;
    const toggleButton = nativeElement.querySelector<HTMLButtonElement>(
      'button[aria-label="Toggle navigation"]',
    );
    const sidenav = () => nativeElement.querySelector("mat-sidenav");

    expect(sidenav()?.classList.contains("mat-drawer-opened")).toBe(true);

    toggleButton?.click();
    fixture.detectChanges();
    expect(sidenav()?.classList.contains("mat-drawer-opened")).toBe(false);

    toggleButton?.click();
    fixture.detectChanges();
    expect(sidenav()?.classList.contains("mat-drawer-opened")).toBe(true);
  });
});
