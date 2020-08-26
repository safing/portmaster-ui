import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UnknownTypeComponent } from './unknown-type.component';

describe('UnknownTypeComponent', () => {
  let component: UnknownTypeComponent;
  let fixture: ComponentFixture<UnknownTypeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UnknownTypeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UnknownTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
