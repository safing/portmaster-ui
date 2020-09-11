import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ExpertiseLevel, ExpertiseLevelNumber } from 'src/app/services';
import { ExpertiseService } from './expertise.service';

@Directive({
  selector: '[appExpertiseLevel]'
})
export class ExpertiseDirective {
  private attached = false;
  private allowedValue: ExpertiseLevelNumber = ExpertiseLevelNumber.user;

  @Input()
  set appExpertiseLevel(lvl: ExpertiseLevelNumber) {
    this.allowedValue = lvl;
    this.update();
  }

  private update() {
    const current = ExpertiseLevelNumber[this.expertiseService.currentLevel];
    if (current < this.allowedValue) {
      if (this.attached) {
        this.attached = false;
        this.viewContainer.clear();
      }
      return
    }

    if (this.attached) {
      return;
    }

    this.viewContainer.createEmbeddedView(this.templateRef);
    this.attached = true;
  }

  constructor(
    private expertiseService: ExpertiseService,
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef) {
    this.expertiseService.change.subscribe(() => this.update())
  }
}
