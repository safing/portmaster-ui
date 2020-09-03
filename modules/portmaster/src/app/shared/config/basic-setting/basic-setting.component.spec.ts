import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicSettingComponent } from './basic-setting.component';

describe('UnknownTypeComponent', () => {
  let component: BasicSettingComponent<any>;
  let fixture: ComponentFixture<BasicSettingComponent<any>>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BasicSettingComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BasicSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
