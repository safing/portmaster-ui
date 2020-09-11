import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusWidgetSettingsComponent } from './settings';

describe('StatusWidgetFactoryComponent', () => {
  let component: StatusWidgetSettingsComponent;
  let fixture: ComponentFixture<StatusWidgetSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [StatusWidgetSettingsComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StatusWidgetSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
