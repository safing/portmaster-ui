import { Component, OnInit, ChangeDetectionStrategy, Inject, Injector, INJECTOR, ChangeDetectorRef } from '@angular/core';
import { WidgetService } from '../../widgets/widget.service';
import { WidgetConfig, WidgetDefinition, WIDGET_DEFINTIONS, WIDGET_CONFIG, } from 'src/app/widgets/widget.types';
import { ComponentPortal } from '@angular/cdk/portal';
import { moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import { combineLatest, forkJoin } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ExpertiseService } from 'src/app/shared/expertise/expertise.service';

interface WidgetPortal<T> extends WidgetConfig<T> {
  portal: ComponentPortal<any>;
  definition: WidgetDefinition<T>;
}

@Component({
  selector: 'app-side-dash',
  templateUrl: './side-dash.html',
  styleUrls: ['./side-dash.scss'],
})
export class SideDashComponent implements OnInit {
  /** All created and rendered widgets */
  widgets: WidgetPortal<any>[] = [];

  /** Number of updates to ingore. Required while saving a new widget order. */
  private ignoreCount = 0;
  private ignoreUpdates = false;

  /** A lookup map for available widget definitions by widget-type key */
  widgetTemplates: {
    [key: string]: WidgetDefinition<any>
  };

  /** Returns the current expertise level */
  get expertise() {
    return this.expertiseService.currentLevel;
  }

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
    this.widgetService.watchWidgets()
      .pipe(
        filter(() => {
          // ignore exactly `ignoreCount` update
          // notifications. Required when we save a
          // new widget order.
          if (this.ignoreCount === 0 && !this.ignoreUpdates) {
            return true;
          }

          this.ignoreCount--;

          console.log(`ingoreCount=${this.ignoreCount} ingoreUpdates=${this.ignoreUpdates};`)

          return !this.ignoreUpdates;
        })
      )
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
          })
          .sort((a, b) => {
            const aOrder = a.order !== undefined ? a.order : 1000;
            const bOrder = b.order !== undefined ? b.order : 1000;

            return aOrder - bOrder;
          });

        this.widgets = widgetsWithMeta;
      });

  }

  /** @private Callback function from the template when a dragged
   *  widget is dropped at it's new position. */
  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.widgets, event.previousIndex, event.currentIndex);

    const updates = this.widgets.map((widget, idx) => {
      widget.order = idx;

      return this.widgetService.createWidget({
        ...widget,
        portal: undefined, // get rid of the component portal and the definition before saving it
        definition: undefined,
      } as any)
    });

    // we'll get an "upd" for each notitification
    // that we need to ignore (we already have the new order
    // saved).
    this.ignoreCount = this.widgets.length;
    this.ignoreUpdates = true;
    forkJoin(updates).subscribe({
      next: () => this.ignoreUpdates = false,
      error: console.error
    })
  }

  /** Creates a new injector providing the widget configuration as WIDGET_CONFIG. */
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
