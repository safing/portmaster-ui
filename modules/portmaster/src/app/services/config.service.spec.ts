import { TestBed } from '@angular/core/testing';
import { PartialObserver } from 'rxjs';
import { ConfigService } from './config.service';
import { BoolSetting, ExpertiseLevel, ExternalOptionHint, OptionType, ReleaseLevel, Setting, ExpertiseLevelNumber } from './config.types';
import { MockWebSocketSubject } from './portapi.service.spec';
import { WebsocketService } from './websocket.service';

describe('ConfigService', () => {
  let service: ConfigService;
  let mock: MockWebSocketSubject;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WebsocketService,
          useValue: MockWebSocketSubject,
        }
      ]
    });
    service = TestBed.inject(ConfigService);
    mock = MockWebSocketSubject.lastMock!
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(mock).toBeTruthy();
  });

  it('should support loading a setting', () => {
    let observer = createSpyObserver();
    service.get("updates/disable").subscribe(observer);

    mock.lastMultiplex!.next({
      id: mock.lastRequestId!,
      type: 'ok',
      data: {
        Name: "Disable Updates",
        Key: "updates/disable",
        Value: true,
        DefaultValue: false,
      },
      key: "config:updates/disable",
    })

    mock.expectLastMessage('type').toBe('get')
    mock.expectLastMessage('key').toBe('config:updates/disable')

    expect(observer.complete).toHaveBeenCalled();
    expect(observer.next).toHaveBeenCalledWith({
      Name: "Disable Updates",
      Key: "updates/disable",
      Value: true,
      DefaultValue: false,
    });
    expect(observer.error).not.toHaveBeenCalled();
  });

  it('should support querying settings', () => {
    let observer = createSpyObserver();
    service.query("").subscribe(observer);

    mock.expectLastMessage('type').toBe('query')
    mock.expectLastMessage('query').toBe('config:')

    var settings: Partial<Setting>[] = [ // de can live with partitial data here
      {
        Name: "Disable Updates",
        OptType: OptionType.Bool,
        DefaultValue: false,
        Value: true,
        Key: "updates/disable",
      },
      {
        Name: "Update Server",
        OptType: OptionType.String,
        DefaultValue: "https://updates.safing.io",
        Key: "updates/server"
      }
    ]

    settings.forEach(setting => {
      mock.lastMultiplex!.next({
        id: mock.lastRequestId!,
        type: 'ok',
        data: setting,
        key: "config:" + setting.Key
      })
    })

    // we did not yet send a "done" and since service.query
    // is expected to collect results, nothing has been nexted
    // yet
    expect(observer.next).not.toHaveBeenCalled();

    mock.lastMultiplex!.next({
      id: mock.lastRequestId!,
      type: 'done',
    })

    expect(observer.complete).toHaveBeenCalled();
    expect(observer.error).not.toHaveBeenCalled();
    expect(observer.next).toHaveBeenCalledWith(settings);
  })

  it('should support watching a setting', () => {
    let observer = createSpyObserver();
    service.watch("disable/updates").subscribe(observer);

    mock.expectLastMessage('type').toBe('qsub')
    mock.expectLastMessage('query').toBe('config:disable/updates')

    const stream = mock.lastMultiplex!;

    // qsub requires a query so the backend may send updates
    // for unrelated settings as well. service.watch is expected
    // to filter them out.
    stream.next({
      id: mock.lastRequestId!,
      type: 'ok',
      data: {
        Key: 'disable/updatesSchedule',
        Value: "value"
      },
      key: 'config:disable/updatesSchedule',
    })

    stream.next({
      id: mock.lastRequestId!,
      type: 'ok',
      data: {
        Key: 'disable/updates',
        Value: true
      },
      key: 'config:disable/updates',
    })

    // this one will not be emitted (on purpuse) because
    // the default value is the same as Value and we only want
    // to see changes!
    stream.next({
      id: mock.lastRequestId!,
      type: 'ok',
      data: {
        Key: 'disable/updates',
        DefaultValue: true,
      },
      key: 'config:disable/updates',
    })


    expect(observer.next).toHaveBeenCalledWith(true)
    expect(observer.next).toHaveBeenCalledTimes(1)
    // we are watching so the stream must be open
    expect(observer.complete).not.toHaveBeenCalled();
    expect(observer.error).not.toHaveBeenCalled();

    stream.next({
      id: mock.lastRequestId!,
      type: 'ok',
      data: {
        Key: 'disable/updatesSchedule',
        Value: "value"
      },
      key: 'config:disable/updatesSchedule',
    });

    stream.next({
      id: mock.lastRequestId!,
      type: 'ok',
      data: {
        Key: 'disable/updates',
        Value: false
      },
      key: 'config:disable/updates',
    });

    expect(observer.next).toHaveBeenCalledWith(false)
    expect(observer.next).toHaveBeenCalledTimes(2)
    // we are watching so the stream must be open
    expect(observer.complete).not.toHaveBeenCalled();
    expect(observer.error).not.toHaveBeenCalled();
  });

  it('should support saving a setting by object', () => {
    let setting: BoolSetting = {
      DefaultValue: false,
      Name: "Disable Updates",
      ExpertiseLevel: ExpertiseLevelNumber.developer,
      ExternalOptType: ExternalOptionHint.DisableUpdates,
      Key: "updates/disable",
      OptType: OptionType.Bool,
      Value: true,
      ReleaseLevel: ReleaseLevel.Stable,
    }

    let observer = createSpyObserver()
    service.save(setting).subscribe(observer);

    expect(mock.lastMessageSent).toEqual({
      id: mock.lastRequestId!, // don't expect the request id
      type: 'update',
      data: setting,
      key: 'config:updates/disable'
    })
    mock.lastMultiplex!.next({
      id: mock.lastRequestId!,
      type: 'success',
    })

    expect(observer.complete).toHaveBeenCalled();
    expect(observer.error).not.toHaveBeenCalled();
    expect(observer.next).toHaveBeenCalledWith(undefined);
  })

  it('should support saving a setting by key/value', () => {
    let observer = createSpyObserver()
    service.save("updates/disable", true).subscribe(observer);

    expect(mock.lastMessageSent).toEqual({
      id: mock.lastRequestId!, // don't expect the request id
      type: 'update',
      data: {
        Key: "updates/disable",
        Value: true,
      },
      key: 'config:updates/disable'
    })
    mock.lastMultiplex!.next({
      id: mock.lastRequestId!,
      type: 'success',
    })

    expect(observer.complete).toHaveBeenCalled();
    expect(observer.error).not.toHaveBeenCalled();
    expect(observer.next).toHaveBeenCalledWith(undefined);
  })
});

function createSpyObserver(): PartialObserver<any> {
  return jasmine.createSpyObj("observer", ["next", "error", "complete"])
}
