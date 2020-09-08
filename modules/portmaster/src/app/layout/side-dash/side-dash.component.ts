import { Component, OnInit, ChangeDetectionStrategy, Inject, Injector, INJECTOR } from '@angular/core';
import { WidgetService } from '../../widgets/widget.service';
import { WidgetConfig, WidgetDefinition, WIDGET_DEFINTIONS, WIDGET_CONFIG, } from 'src/app/widgets/widget.types';
import { ComponentPortal } from '@angular/cdk/portal';
import { moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';

interface WidgetPortal<T> extends WidgetConfig<T> {
  portal: ComponentPortal<any>;
}

@Component({
  selector: 'app-side-dash',
  templateUrl: './side-dash.component.html',
  styleUrls: ['./side-dash.component.scss'],
})
export class SideDashComponent implements OnInit {
  widgets: WidgetPortal<any>[] = [];

  widgetTemplates: {
    [key: string]: WidgetDefinition<any>
  };

  constructor(
    @Inject(WIDGET_DEFINTIONS) definitions: WidgetDefinition<any>[],
    public widgetService: WidgetService,
    @Inject(INJECTOR) private injector: Injector,
  ) {
    this.widgetTemplates = {};
    definitions.forEach(def => {
      this.widgetTemplates[def.type] = def;
    })
  }

  ngOnInit(): void {
    this.widgetService.watchWidgets()
      .subscribe(widgets => {
        this.widgets = widgets
          .map(w => {
            const injector = this.createInjector(w);
            return {
              ...w,
              portal: new ComponentPortal(this.widgetTemplates[w.type].widgetComponent, null, injector),
            }
          })
          .sort((a, b) => {
            const aOrder = a.order || 0;
            const bOrder = b.order || 0;
            return aOrder - bOrder;
          })
      })
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.widgets, event.previousIndex, event.currentIndex);

    this.widgets.forEach((widget, idx) => {
      widget.order = idx;

      this.widgetService.createWidget({
        ...widget,
        portal: undefined, // get rid of the component portal before saving it
      } as any)
        .subscribe(() => {
          console.log('saved at position', idx);
        });
    })
  }

  private createInjector(w: WidgetConfig): Injector {
    return Injector.create([{
      provide: WIDGET_CONFIG,
      useValue: w,
    }], this.injector);
  }
}
