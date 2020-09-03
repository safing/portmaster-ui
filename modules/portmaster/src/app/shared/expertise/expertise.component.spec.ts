import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpertiseComponent } from './expertise.component';

describe('ExpertiseComponent', () => {
  let component: ExpertiseComponent;
  let fixture: ComponentFixture<ExpertiseComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ExpertiseComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExpertiseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
