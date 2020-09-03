import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SideDashComponent } from './side-dash.component';

describe('SideDashComponent', () => {
  let component: SideDashComponent;
  let fixture: ComponentFixture<SideDashComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SideDashComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SideDashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
