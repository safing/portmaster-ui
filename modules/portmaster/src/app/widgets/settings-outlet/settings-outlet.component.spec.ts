import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsOutletComponent } from './settings-outlet.component';

describe('SettingsOutletComponent', () => {
  let component: SettingsOutletComponent;
  let fixture: ComponentFixture<SettingsOutletComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SettingsOutletComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingsOutletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
