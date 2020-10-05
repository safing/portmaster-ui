import { Component, OnInit, ChangeDetectionStrategy, Inject, Injector, INJECTOR, ChangeDetectorRef } from '@angular/core';
import { WidgetService } from '../../widgets/widget.service';
import { WidgetConfig, WidgetDefinition, WIDGET_DEFINTIONS, WIDGET_CONFIG, } from 'src/app/widgets/widget.types';
import { ComponentPortal } from '@angular/cdk/portal';
import { moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import { combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';

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
  widgets: WidgetPortal<any>[] = [];
  private ignoreCount = 0;

  widgetTemplates: {
    [key: string]: WidgetDefinition<any>
  };

  constructor(
    @Inject(WIDGET_DEFINTIONS) definitions: WidgetDefinition<any>[],
    public widgetService: WidgetService,
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(INJECTOR) private injector: Injector,
  ) {
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
          // notifications.
          if (this.ignoreCount === 0) {
            return true;
          }

          this.ignoreCount--;
          return false;
        })
      )
      .subscribe(widgets => {
        this.widgets = widgets
          .map(w => {
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
          })
      })
  }

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
    combineLatest(updates).subscribe({
      error: console.error
    })
  }

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
