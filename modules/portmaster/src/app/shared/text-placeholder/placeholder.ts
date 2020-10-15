import { AfterContentChecked, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostBinding, Input, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-text-placeholder',
  template: `
    <span class="text-placeholder" *ngIf="showLoader">
      <div class="background" [style.width]="width" ></div>
    </span>
    <ng-content *ngIf="mode === 'auto' || !showLoader"></ng-content>
  `,
  styleUrls: ['./placeholder.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderComponent implements AfterContentChecked {
  @Input()
  set width(v: string | number) {
    if (typeof v === 'number') {
      this._width = `${v}px`;
      return
    }

    switch (v) {
      case 'small':
        this._width = '5rem';
        break;
      case 'medium':
        this._width = '10rem';
        break;
      case 'large':
        this._width = '15rem';
        break
      default:
        this._width = v;
    }
  }
  get width() { return this._width; }
  private _width: string = '10rem';

  @Input()
  mode: 'auto' | 'input' = 'auto';

  @Input('loading')
  showLoader = true;

  constructor(
    private elementRef: ElementRef,
    private changeDetector: ChangeDetectorRef,
  ) { }

  ngAfterContentChecked() {
    if (this.mode === 'input') {
      return;
    }

    const show = this.elementRef.nativeElement.innerText === '';
    if (this.showLoader != show) {
      this.showLoader = show;
      this.changeDetector.detectChanges();
    }
  }
}
