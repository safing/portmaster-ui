import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, AfterViewInit, ChangeDetectorRef, isDevMode, OnDestroy, EmbeddedViewRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ExpertiseLevel, ExpertiseLevelNumber } from 'src/app/services';
import { ExpertiseService } from './expertise.service';

@Directive({
  selector: '[appExpertiseLevel]'
})
export class ExpertiseDirective implements OnInit, OnDestroy {
  private allowedValue: ExpertiseLevelNumber = ExpertiseLevelNumber.user;
  private subscription = Subscription.EMPTY;
  private view: EmbeddedViewRef<any> | null = null;

  @Input()
  set appExpertiseLevel(lvl: ExpertiseLevelNumber | string) {
    if (typeof lvl === 'string') {
      lvl = ExpertiseLevelNumber[lvl as any];
    }

    if (lvl === undefined) {
      if (isDevMode()) {
        throw new Error(`[appExpertiseLevel] got undefined expertise-level value`);
      }
      return;
    }

    this.allowedValue = lvl as ExpertiseLevelNumber;
    this.update();
  }

  private update() {
    const current = ExpertiseLevelNumber[this.expertiseService.currentLevel];
    if (current < this.allowedValue) {
      if (!!this.view) {
        this.view.destroy();
        this.viewContainer.clear();
        this.view = null;
      }
      return
    }

    if (!!this.view) {
      this.view.markForCheck();
      return;
    }

    this.view = this.viewContainer.createEmbeddedView(this.templateRef);
    this.view.detectChanges();
  }

  constructor(
    private expertiseService: ExpertiseService,
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) { }

  ngOnInit() {
    this.subscription = this.expertiseService.change.subscribe(() => this.update())
  }

  ngOnDestroy() {
    this.viewContainer.clear();
    this.subscription.unsubscribe();
  }
}
