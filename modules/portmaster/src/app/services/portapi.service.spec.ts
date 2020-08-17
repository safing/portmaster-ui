import { TestBed } from '@angular/core/testing';

import { PortapiService } from './portapi.service';

describe('PortapiService', () => {
  let service: PortapiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PortapiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
