import { ReplyMessage, RequestMessage } from "@safing/portmaster-api";
import { Observable, Observer, Subject } from "rxjs";

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

  get lastRequestId(): string | undefined {
    return this.lastMessageSent?.id;
  }

  get lastMultiplex(): Observer<T> | undefined {
    const obs = this.multiplexStreams;
    const length = this.multiplexStreams.length;
    return length > 0 ? obs[length - 1] : undefined;
  }
}
