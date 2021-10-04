import { CdkPortalOutletAttachedRef, ComponentPortal } from '@angular/cdk/portal';
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of, Subscription } from 'rxjs';
import { WidgetService } from '../../widgets/widget.service';
import { WidgetDefinition, WidgetFactory, WIDGET_DEFINTIONS } from '../../widgets/widget.types';
import { deepClone } from '../../shared/utils';
import { map, switchMap, switchMapTo, take, throwIfEmpty } from 'rxjs/operators';

@Component({
  selector: 'app-settings-outlet',
  templateUrl: './widget-settings-outlet.html',
  styleUrls: [
    '../page.scss',
    './widget-settings-outlet.scss'
  ],
})
export class WidgetSettingsOutletComponent<T = any> implements OnInit, OnDestroy {
  /** @private The definition of the selected widget-type. Required for creating and editing widgets. */
  selectedWidget: WidgetDefinition<T> | null = null;

  /** @private The component portal of the widget's factory component. */
  portal: ComponentPortal<WidgetFactory<T>> | null = null;

  /** @private Whether or not the current settings are dirty (changed but not saved). */
  dirty = false;

  /** @private The current widget configuration. */
  config: any | null = null;

  /** @private The key of the current widget being edited, if any. */
  widgetKey: string | null = null;

  /** Subscription to onConfigChange output of the widget's factory
   * component */
  private subscription: Subscription = Subscription.EMPTY;

  /** Subscription to the route parameters. */
  private paramSubscription: Subscription = Subscription.EMPTY;

  /** Whether or not we are in edit-mode rather than create-mode. */
  get isEdit() { return this.widgetKey !== null; }

  constructor(
    private activeRoute: ActivatedRoute,
    private widgetService: WidgetService,
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(WIDGET_DEFINTIONS) public definitions: WidgetDefinition<any>[],
  ) {
    this.definitions = this.definitions.filter(def => !def.disableCustom);
  }

  ngOnInit(): void {
    // Subscribe to changes in the route parameters and
    // update the current configuration and rendered
    // factory component accordingly.
    this.paramSubscription =
      this.activeRoute.paramMap.subscribe(params => {
        // If there's currently an attached portal make
        // sure to remove it first.
        if (this.portal?.isAttached) {
          this.portal.detach();
        }
        this.portal = null;

        this.widgetKey = params.get('widgetId')!;
        if (this.isEdit) {
          // Load the widget to edit and update
          this.widgetService.loadWidget(this.widgetKey)
            .subscribe(
              widget => {
                this.config = widget.config;
                this.changeWidget(widget.type);
              },
              console.error,
              () => {
                // If we did't found a widget with this key
                // navigate back to the previous page.
                if (!this.config || !this.selectedWidget) {
                  window.history.back();
                }
              }
            );
        }
      });
  }

  ngOnDestroy() {
    this.paramSubscription.unsubscribe();
    this.subscription.unsubscribe();
  }

  /**
   * @private
   * Used as a callback in the cdk-portal-outlet and called when
   * a new portal is attached or detached.
   *
   * @param portal - The reference to the attached portal
   */
  portalAttached<T>(portal: CdkPortalOutletAttachedRef) {
    // Type guard because portal could theoretically be a EmbeddedViewRef.
    // We know better (because we don't use TemplateRef). `instance` is only
    // available in ComponentRef so Typescript fill figure out the rest.
    if (!portal || !('instance' in portal)) {
      return;
    }

    // Reset the dirty state and create a deep-clone of the widget's
    // configuration.
    this.dirty = false;
    portal.instance.config = deepClone(this.config);

    // Subscribe to the onConfigChange of the widget's factory
    // component.
    this.subscription = portal.instance.onConfigChange.subscribe((config: T) => {
      // Ingore updates if the configuration has not changed.
      if (JSON.stringify(config) === JSON.stringify(this.config)) {
        return;
      }

      // Store the new configuration and mark as dirty.
      this.dirty = true;
      this.config = config;
    });

    portal.changeDetectorRef.detectChanges();
    this.changeDetectorRef.detectChanges();
  }

  /**
   * @private
   * Save the widget configuration.
   */
  saveWidget() {
    if (!this.config) {
      return;
    }

    this.widgetService.createWidget({
      config: this.config,
      type: this.selectedWidget!.type,
      key: this.widgetKey || undefined, // key will be auto-generated for "creates"
    })
      .subscribe((key) => {
        if (key !== this.widgetKey) {
          // If we created a new widget make sure to update the
          // widget-order and push it at the back.
          this.widgetService.watchOrder()
            .pipe(
              take(1),
              switchMap(order => {
                order.push(key);
                return this.widgetService.saveOrder(order);
              })
            )
            .subscribe(
              // when we're done navigate away from the page.
              () => window.history.back()
            );
        } else {
          // We just saved the edited configuration, navigate back now.
          window.history.back();
        }
      });
  }

  /**
   * @private
   * Delete the currently selected widget and navigate
   * back in history.
   */
  deleteWidget() {
    this.widgetService.deleteWidget(this.widgetKey!)
      .subscribe(() => window.history.back());
  }

  /**
   * @private
   * Abort creating or editing the widget and navigate
   * back in history.
   */
  cancel() {
    window.history.back();
  }

  /**
   * @private
   * Callback for ngModelChange when the user selects a different
   * widget type.
   *
   * @param type The widget type identifier.
   */
  changeWidget(type: string) {
    this.subscription.unsubscribe();
    this.subscription = Subscription.EMPTY;

    this.selectedWidget = this.definitions.find(def => def.type === type) || null;

    if (!this.selectedWidget || !this.selectedWidget.settingsComponent) {
      this.portal = null;
      return;
    }

    this.portal = new ComponentPortal(this.selectedWidget.settingsComponent);
  }
}
