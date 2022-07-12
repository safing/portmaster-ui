import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, Inject, Injector, INJECTOR, OnDestroy, OnInit, TrackByFunction } from '@angular/core';
import { Subscription } from 'rxjs';
import { ExpertiseService } from 'src/app/shared/expertise/expertise.service';
import { WidgetConfig, WidgetDefinition, WIDGET_CONFIG, WIDGET_DEFINTIONS } from 'src/app/widgets/widget.types';
import { WidgetService } from '../../widgets/widget.service';

/**
 * WidgetPortal extends the normal widget configuration by adding
 * the widget-definition and the component portal to create the
 * widget.
 */
interface WidgetPortal<T> extends WidgetConfig<T> {
  // Portal used to create a new instance of the widget.
  portal: ComponentPortal<any>;
  // The definition of the widget.
  definition: WidgetDefinition<T>;
}

@Component({
  selector: 'app-side-dash',
  templateUrl: './side-dash.html',
  styleUrls: ['./side-dash.scss'],
})
export class SideDashComponent implements OnInit, OnDestroy {
  /** All created and rendered widgets */
  widgets: WidgetPortal<any>[] = [];

  /** A lookup map for available widget definitions by widget-type key */
  widgetTemplates: {
    [key: string]: WidgetDefinition<any>
  };

  /** The subscription for widget updates */
  private subscription = Subscription.EMPTY;

  /** Returns the current expertise level */
  get expertise() {
    return this.expertiseService.currentLevel;
  }

  trackBy: TrackByFunction<WidgetPortal<any>> = this.widgetService.trackBy

  constructor(
    @Inject(WIDGET_DEFINTIONS) definitions: WidgetDefinition<any>[],
    public widgetService: WidgetService,
    private expertiseService: ExpertiseService,
    @Inject(INJECTOR) private injector: Injector,
  ) {
    // Build up a new widget-template lookup map.
    this.widgetTemplates = {};
    definitions.forEach(def => {
      this.widgetTemplates[def.type] = def;
    })
  }

  ngOnInit(): void {
    this.subscription = this.widgetService.watchWidgets()
      .subscribe(widgets => {
        // From each widget configuration we are going to create a new WidgetPortal.
        // The portal holds a widget-specific dependency injector that provides the
        // widget configuration.
        // Finally, the widgets are sorted by the user-configured order.
        const widgetsWithMeta = widgets
          .map(w => {
            const existing = this.widgets.find(e => e.key === w.key);

            if (!!existing && JSON.stringify(existing.config) === JSON.stringify(w.config)) {
              return existing;
            }

            const injector = this.createInjector(w);
            return {
              ...w,
              definition: this.widgetTemplates[w.type],
              portal: new ComponentPortal(this.widgetTemplates[w.type].widgetComponent, null, injector),
            }
          });

        this.widgets = widgetsWithMeta;
      });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * @private
   * Callback function from the template when a dragged
   * widget is dropped at it's new position.
   */
  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.widgets, event.previousIndex, event.currentIndex);
    const order = this.widgets.map(widget => widget.key!);

    this.widgetService.saveOrder(order).subscribe();
  }

  /**
   * Creates a new injector providing the widget configuration as WIDGET_CONFIG.
   *
   * @param w The {@type WidgetConfig} that is provided via dependency injection.
   */
  private createInjector(w: WidgetConfig): Injector {
    return Injector.create({
      providers: [{
        provide: WIDGET_CONFIG,
        useValue: w,
      }],
      parent: this.injector
    });
  }
}
