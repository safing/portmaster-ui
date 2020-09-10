import { Component, OnInit, ChangeDetectionStrategy, Inject, Injector, INJECTOR } from '@angular/core';
import { WidgetService } from '../../widgets/widget.service';
import { WidgetConfig, WidgetDefinition, WIDGET_DEFINTIONS, WIDGET_CONFIG, } from 'src/app/widgets/widget.types';
import { ComponentPortal } from '@angular/cdk/portal';
import { moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import { combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';

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
  private saveInProgress = false;

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
      .pipe(
        // ignore updates while we are saving
        filter(() => !this.saveInProgress)
      )
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
            const aOrder = a.order || Infinity;
            const bOrder = b.order || Infinity;
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
        portal: undefined, // get rid of the component portal before saving it
      } as any)
    });

    this.saveInProgress = true;
    combineLatest(updates).subscribe({
      complete: () => this.saveInProgress = false,
    })
  }

  private createInjector(w: WidgetConfig): Injector {
    return Injector.create([{
      provide: WIDGET_CONFIG,
      useValue: w,
    }], this.injector);
  }
}
