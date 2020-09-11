import { CdkPortalOutletAttachedRef, ComponentPortal } from '@angular/cdk/portal';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { WidgetService } from '../../widgets/widget.service';
import { WidgetDefinition, WidgetFactory, WIDGET_DEFINTIONS } from '../../widgets/widget.types';

@Component({
  selector: 'app-settings-outlet',
  templateUrl: './widget-settings-outlet.html',
  styleUrls: ['./widget-settings-outlet.scss'],
})
export class WidgetSettingsOutletComponent<T = any> implements OnInit, OnDestroy {
  selectedWidget: WidgetDefinition<T> | null = null;
  portal: ComponentPortal<WidgetFactory<T>> | null = null;
  subscription: Subscription = Subscription.EMPTY;
  config: any | null = null;
  widgetKey: string | null = null;
  private _order?: number;

  isEdit: boolean = false;

  constructor(
    private activeRoute: ActivatedRoute,
    private widgetService: WidgetService,
    @Inject(WIDGET_DEFINTIONS) public definitions: WidgetDefinition<any>[],
  ) { }

  ngOnInit(): void {
    this.activeRoute.paramMap.subscribe(params => {
      if (this.portal?.isAttached) {
        this.portal.detach();
      }
      this.portal = null;

      this.isEdit = params.get('widgetId') !== null;

      if (this.isEdit) {
        this.widgetKey = params.get('widgetId')!;
        this.widgetService.loadWidget(this.widgetKey)
          .subscribe(
            widget => {
              this.config = widget.config;
              this._order = widget.order;
              this.changeWidget(widget.type);
            },
            console.error,
            () => {
              if (!this.config || !this.selectedWidget) {
                window.history.back();
              }
            }
          )
      }
    })
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  portalAttached<T>(portal: CdkPortalOutletAttachedRef) {
    if (!portal || !('instance' in portal)) {
      return;
    }

    portal.instance.config = this.config;
    this.subscription = portal.instance.onConfigChange.subscribe((config: T) => {
      this.config = config;
    });
    portal.changeDetectorRef.detectChanges();
  }

  saveWidget() {
    if (!this.config) {
      return;
    }

    this.widgetService.createWidget({
      config: this.config,
      type: this.selectedWidget!.type,
      order: this._order,
      key: this.widgetKey || undefined,
    }).subscribe(() => {
      window.history.back();
    })
  }

  deleteWidget() {
    this.widgetService.deleteWidget(this.widgetKey!)
      .subscribe(() => window.history.back());
  }

  changeWidget(type: string) {
    this.subscription.unsubscribe();
    this.subscription = Subscription.EMPTY;

    this.selectedWidget = this.definitions.find(def => def.type === type) || null;

    if (!this.selectedWidget) {
      this.portal = null;
      return;
    }
    this.portal = new ComponentPortal(this.selectedWidget.settingsComponent);
  }
}
