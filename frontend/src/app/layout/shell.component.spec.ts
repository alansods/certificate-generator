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

  it("toggles the nav open state", () => {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as { navOpen: () => boolean; toggleNav: () => void };

    const initial = component.navOpen();
    component.toggleNav();

    expect(component.navOpen()).toBe(!initial);
  });
});
