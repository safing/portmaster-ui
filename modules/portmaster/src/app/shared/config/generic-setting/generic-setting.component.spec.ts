import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericSettingComponent } from './generic-setting.component';

describe('GenericSettingComponent', () => {
  let component: GenericSettingComponent;
  let fixture: ComponentFixture<GenericSettingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GenericSettingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GenericSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
