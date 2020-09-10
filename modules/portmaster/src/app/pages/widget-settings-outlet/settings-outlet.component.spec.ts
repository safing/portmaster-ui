import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WidgetSettingsOutletComponent } from './settings-outlet.component';

describe('SettingsOutletComponent', () => {
  let component: WidgetSettingsOutletComponent;
  let fixture: ComponentFixture<WidgetSettingsOutletComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [WidgetSettingsOutletComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WidgetSettingsOutletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
