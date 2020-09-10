import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterListComponent } from './filter-list';

describe('FilterListComponent', () => {
  let component: FilterListComponent;
  let fixture: ComponentFixture<FilterListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [FilterListComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FilterListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
