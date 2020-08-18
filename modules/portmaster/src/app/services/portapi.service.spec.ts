import { TestBed } from '@angular/core/testing';

import { PortapiService, PortapiURL } from './portapi.service';
import { WebsocketService } from './websocket.service';
import { TestScheduler } from 'rxjs/testing';
import { ColdObservable } from 'rxjs/internal/testing/ColdObservable';

describe('PortapiService', () => {
  let service: PortapiService;
  let mockSocket: ColdObservable<any>;
  let testScheduler: TestScheduler;
  
  let factorySpy = jasmine.createSpy("createConnection")
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PortapiURL,
          useValue: "ws://testbed",
        },
        {
          provide: WebsocketService,
          useValue: {
            createConnection: factorySpy,
          }
        }
      ]
    });
    
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    })
    
    factorySpy.and.callFake(() => {
      mockSocket = testScheduler.createColdObservable('ab', {
        a: "value1",
        b: "value2",
      })
      return mockSocket;
    })
    
    service = TestBed.inject(PortapiService);
  });
  
  afterEach(() => {
    factorySpy.calls.reset();
  })
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
