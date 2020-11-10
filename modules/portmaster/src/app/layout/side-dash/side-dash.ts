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

  /** @private Callback function from the template when a dragged
   *  widget is dropped at it's new position. */
  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.widgets, event.previousIndex, event.currentIndex);
    const order = this.widgets.map(widget => widget.key!);

    this.widgetService.saveOrder(order).subscribe();
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
