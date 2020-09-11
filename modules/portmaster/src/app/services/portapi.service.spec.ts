import { TestBed } from '@angular/core/testing';
import { Observable, Observer, PartialObserver, Subject } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { PortapiService } from './portapi.service';
import { MessageType, ReplyMessage, RequestMessage } from './portapi.types';
import { WebsocketService } from './websocket.service';

describe('PortapiService', () => {
  let service: PortapiService;
  let mock: MockWebSocketSubject<ReplyMessage | RequestMessage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WebsocketService,
          useValue: MockWebSocketSubject,
        }
      ]
    });
    service = TestBed.inject(PortapiService);
    mock = MockWebSocketSubject.lastMock!;
  });

  afterEach(() => {
    mock.close();
  })

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('on receiving request types', () => {
    it('should send the request message', () => {
      let messageReceived = false;
      service.get<any>('some/key')
        .subscribe(value => {
          messageReceived = true;
          expect(value).toBe("some-value");
        });

      let stream = mock.lastMultiplex
      expect(stream).toBeTruthy()

      let req = mock.lastMessageSent
      expect(req).toBeTruthy();
      expect(req.type).toBe('get')
      expect(req.key).toBe('some/key')

      mock.expectLastMessage().toBeTruthy()
      mock.expectLastMessage('type').toBe('get')
      mock.expectLastMessage('key').toBe('some/key')

      // send the response
      stream?.next({ id: req.id, type: 'ok', key: req.key, data: 'some-value' })

      expect(messageReceived).toBe(true);
    });

    it('should send a cancel message', () => {
      let observer = createSpyObserver();
      let subscription = service.qsub("config:").subscribe(observer);

      mock.expectLastMessage('type').toBe('qsub');

      // qsub is a cancellable method so unsubscript()
      // should take care of thae
      subscription.unsubscribe();
      mock.expectLastMessage('type').toBe('cancel')
    })

    it('should correctly handle immediate "error"', () => {
      const observer = createSpyObserver();
      service.request('get', {}).subscribe(observer);

      mock.lastMultiplex!.next({
        type: 'error',
        id: mock.lastRequestId!,
        message: 'some message'
      })
      expect(observer.error).toHaveBeenCalled();
      expect(observer.complete).not.toHaveBeenCalled();
      expect(observer.next).not.toHaveBeenCalled();
    })

    it('should correctly handle "error" during stream', () => {
      const observer = createSpyObserver();
      service.request('query', {}).subscribe(observer);

      mock.lastMultiplex!.next({
        type: 'ok',
        id: mock.lastRequestId!,
        key: mock.lastMessageSent?.key,
        data: 'some-data',
      })

      mock.lastMultiplex!.next({
        type: 'error',
        id: mock.lastRequestId!,
        message: 'some message'
      })
      expect(observer.error).toHaveBeenCalled();
      expect(observer.complete).not.toHaveBeenCalled();
      expect(observer.next).toHaveBeenCalledTimes(1);
    })

    it('should correctly handle "success"', () => {
      const observer = createSpyObserver();
      service.request('insert', {}).subscribe(observer);

      mock.lastMultiplex!.next({
        type: 'success',
        id: mock.lastRequestId!,
      })
      expect(observer.error).not.toHaveBeenCalled();
      expect(observer.next).toHaveBeenCalledWith(undefined);
      expect(observer.complete).toHaveBeenCalled();
    })

    it('should correctly handle "done" in query', () => {
      const observer = createSpyObserver();
      service.request('query', {}).subscribe(observer);

      mock.lastMultiplex!.next({
        type: 'done',
        id: mock.lastRequestId!,
      })

      expect(observer.error).not.toHaveBeenCalled();
      expect(observer.next).not.toHaveBeenCalled();
      expect(observer.complete).toHaveBeenCalled();
    })

    it('should correctly handle "done" in qsub', () => {
      const observer = createSpyObserver();
      service.request('qsub', {}).subscribe(observer);

      mock.lastMultiplex!.next({
        type: 'done',
        id: mock.lastRequestId!,
      })

      // done in qsub marks the end of the inital data transfer
      // but does not end the subscription!
      expect(observer.error).not.toHaveBeenCalled();
      expect(observer.next).not.toHaveBeenCalled();
      expect(observer.complete).not.toHaveBeenCalled();
    })

    it('should correctly handle "success"', () => {
      const observer = createSpyObserver();
      service.request('create', {}).subscribe(observer);

      mock.lastMultiplex!.next({
        type: 'success',
        id: mock.lastRequestId!,
      })
      expect(observer.error).not.toHaveBeenCalled();
      expect(observer.next).toHaveBeenCalledWith(undefined);
      expect(observer.complete).toHaveBeenCalled();
    })

    it('should correctly handle "ok" in a stream', () => {
      const observer = createSpyObserver();
      service.request('query', {}).subscribe(observer);

      mock.lastMultiplex!.next({
        type: 'ok',
        id: mock.lastRequestId!,
        data: 'some-value',
        key: 'fake:key'
      })
      expect(observer.error).not.toHaveBeenCalled();
      expect(observer.next).toHaveBeenCalledWith({
        id: mock.lastRequestId!,
        type: 'ok',
        data: 'some-value',
        key: 'fake:key'
      });
      expect(observer.complete).not.toHaveBeenCalled(); // ok does not mark the end of a stream
    })

    it('should correctly handle "ok" in a "get"', () => {
      const observer = createSpyObserver();
      service.request('get', {}).subscribe(observer);

      mock.lastMultiplex!.next({
        type: 'ok',
        id: mock.lastRequestId!,
        data: 'some-value',
        key: 'fake:key'
      })
      expect(observer.error).not.toHaveBeenCalled();
      expect(observer.next).toHaveBeenCalledWith({
        id: mock.lastRequestId!,
        type: 'ok',
        data: 'some-value',
        key: 'fake:key'
      });
      expect(observer.complete).toHaveBeenCalled(); // ok does mark the end in case of a "get"
    })

    it('should correctly handle "warning"', () => {
      const observer = createSpyObserver();
      service.request('query', {}).subscribe(observer);

      mock.lastMultiplex!.next({
        type: 'warning',
        id: mock.lastRequestId!,
        message: 'some message'
      })
      // stream is still active
      expect(observer.error).not.toHaveBeenCalled();
      expect(observer.complete).not.toHaveBeenCalled();
      expect(observer.next).not.toHaveBeenCalled();

      // complete withour error
      mock.lastMultiplex!.next({
        type: 'done',
        id: mock.lastRequestId!,
      })
      expect(observer.error).not.toHaveBeenCalled();
      expect(observer.next).not.toHaveBeenCalled();
      expect(observer.complete).toHaveBeenCalled();
    })
  })

  it("should handle streams", () => {
    const observer = createSpyObserver();
    service.query('config:')
      .pipe(toArray())
      .subscribe(observer);

    const stream = mock.lastMultiplex!;
    expect(mock.lastMessageSent!.type).toBe('query')
    expect(mock.lastMessageSent!.query).toBe('config:')

    let data = [
      "one",
      "two",
      "three",
      "four"
    ];

    data.forEach((element, idx) => {
      stream.next({
        type: 'ok',
        data: element,
        id: mock.lastRequestId!,
        key: "config:" + element,
      })

      if (idx === 1) {
        stream.next({
          type: 'warning',
          message: 'some useless warning',
          id: mock.lastRequestId!,
        })
      }
    });
    expect(observer.next).not.toHaveBeenCalled() // we did not send "done" yet

    stream.next({
      type: 'done',
      id: mock.lastRequestId!
    })

    expect(observer.next).toHaveBeenCalledTimes(1) // we used toArray()
    expect(observer.next).toHaveBeenCalledWith([
      {
        id: mock.lastRequestId!,
        type: 'ok',
        data: "one",
        key: "config:one",
      },
      {
        id: mock.lastRequestId!,
        type: 'ok',
        data: "two",
        key: "config:two",
      },
      {
        id: mock.lastRequestId!,
        type: 'ok',
        data: "three",
        key: "config:three",
      },
      {
        id: mock.lastRequestId!,
        type: 'ok',
        data: "four",
        key: "config:four",
      },
    ])
    expect(observer.error).not.toHaveBeenCalled();
    expect(observer.complete).toHaveBeenCalled();
  });

});

export function createSpyObserver(): jasmine.SpyObj<PartialObserver<any>> {
  return jasmine.createSpyObj("observer", ["next", "error", "complete"])
}

export class MockWebSocketSubject<T = ReplyMessage | RequestMessage> extends Subject<T> {
  sent: any[] = [];
  multiplexStreams: Observer<T>[] = [];

  multiplex(subMsg: () => any, unsubMsg: () => any, messageFilter: (value: T) => boolean): Observable<T> {
    return new Observable((observer) => {
      this.next(subMsg());

      this.multiplexStreams.push(observer);

      return () => {
        if (unsubMsg() !== undefined) {
          this.next(unsubMsg());
        }
      }
    })
  }

  static subjects: MockWebSocketSubject[] = [];

  static createConnection(opts: any): MockWebSocketSubject {
    const sub = new MockWebSocketSubject();
    MockWebSocketSubject.subjects.push(sub);
    return sub
  }

  static get lastMock(): MockWebSocketSubject | undefined {
    const mocks = MockWebSocketSubject.subjects;
    const length = mocks.length;
    return length > 0 ? mocks[length - 1] : undefined;
  }

  next(msg: T) {
    this.sent.push(msg);
  }

  clearSent() {
    this.sent.length = 0;
  }

  close() {
    this.multiplexStreams.forEach(obs => obs.complete())
    this.multiplexStreams.length = 0;
  }

  get lastMessageSent(): any | undefined {
    const sent = this.sent;
    const length = this.sent.length;
    return length > 0 ? sent[length - 1] : undefined;
  }

  expectLastMessage<M extends MessageType>(key?: string) {
    if (key === undefined) {
      return expect(this.lastMessageSent)
    }
    return expect(this.lastMessageSent![key])
  }

  get lastRequestId(): string | undefined {
    return this.lastMessageSent?.id;
  }

  get lastMultiplex(): Observer<T> | undefined {
    const obs = this.multiplexStreams;
    const length = this.multiplexStreams.length;
    return length > 0 ? obs[length - 1] : undefined;
  }
}
