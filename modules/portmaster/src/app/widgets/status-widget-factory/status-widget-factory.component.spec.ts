import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusWidgetFactoryComponent } from './status-widget-factory.component';

describe('StatusWidgetFactoryComponent', () => {
  let component: StatusWidgetFactoryComponent;
  let fixture: ComponentFixture<StatusWidgetFactoryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StatusWidgetFactoryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StatusWidgetFactoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
