import { animate, AnimationEvent, style, transition, trigger } from "@angular/animations";
import { OverlayRef } from "@angular/cdk/overlay";
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostBinding, Inject, InjectionToken, OnDestroy, TemplateRef } from "@angular/core";

export const SFNG_TOOLTIP_CONTENT = new InjectionToken<string | TemplateRef<any>>('SFNG_TOOLTIP_CONTENT');
export const SFNG_TOOLTIP_OVERLAY = new InjectionToken<OverlayRef>('SFNG_TOOLTIP_OVERLAY');

@Component({
  templateUrl: './tooltip-component.html',
  styleUrls: ['./tooltip-component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger(
      'moveInOut',
      [
        transition(
          ':enter',
          [
            style({ opacity: 0, transform: 'translate{{ what }}({{ value }}) scale(0.75)' }),
            animate('.1s ease-in',
              style({ opacity: 1, transform: 'translate{{ what }}(0%) scale(1)' }))
          ],
          { params: { what: 'Y', value: '-8px' } } // default parameters
        ),
        transition(
          ':leave',
          [
            style({ opacity: 1 }),
            animate('.1s ease-out',
              style({ opacity: 0, transform: 'translate{{ what }}({{ value }}) scale(0.75)' }))
          ],
          { params: { what: 'Y', value: '8px' } } // default parameters
        )
      ]
    )]

})
export class SfngTooltipComponent implements AfterViewInit, OnDestroy {
  /**
   * Adds snfg-tooltip-instance class to the host element.
   * This is used as a selector in the FlexibleConnectedPosition stragegy
   * to set a transform-origin. That origin is then used for the "arrow" anchor
   * placement.
   */
  @HostBinding('class.sfng-tooltip-instance')
  _hostClass = true;

  what = 'Y';
  value = '8px'
  transformOrigin = '';

  _appAnimate = false;

  private observer: MutationObserver | null = null;

  constructor(
    @Inject(SFNG_TOOLTIP_CONTENT) public message: string,
    @Inject(SFNG_TOOLTIP_OVERLAY) public overlayRef: OverlayRef,
    private elementRef: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) { }

  dispose() {
    this._appAnimate = false;
    this.cdr.markForCheck();
  }

  animationDone(event: AnimationEvent) {
    if (event.toState === 'void') {
      this.overlayRef.dispose();
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  ngAfterViewInit(): void {
    this.observer = new MutationObserver(mutations => {
      this.transformOrigin = this.elementRef.nativeElement.style.transformOrigin;
      if (!this.transformOrigin) {
        return;
      }

      const [x, y] = this.transformOrigin.split(" ");
      if (x === 'center') {
        this.what = 'Y'
        if (y === 'top') {
          this.value = '-8px'
        } else {
          this.value = '8px'
        }
      } else {
        this.what = 'X'
        if (x === 'left') {
          this.value = '-8px'
        } else {
          this.value = '8px'
        }
      }

      this._appAnimate = true;
      this.cdr.detectChanges();
    });
    this.observer.observe(this.elementRef.nativeElement, { attributes: true, attributeFilter: ['style'] })
  }
}

