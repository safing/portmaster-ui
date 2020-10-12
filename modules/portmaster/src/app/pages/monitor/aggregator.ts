import { ConnectionPositionPair } from '@angular/cdk/overlay';
import { Subscription, Observable, ObservableInput, Subject } from 'rxjs';
import { Connection, RiskLevel, Verdict } from '../../services';
import { DataReply } from '../../services/portapi.types';

export interface Profile {
  id: string;
  name: string;
  connections: Set<string>;
  countPermitted: number;
}

interface ProfileMap {
  [profileID: string]: Profile;
}

export class Aggregator {
  private _profiles: ProfileMap = {};
  private _connections: Map<string, [Profile, Verdict]> = new Map();
  private subscription: Subscription = Subscription.EMPTY;
  private _finished = new Subject<void>();

  get ready(): Observable<void> {
    return this._finished;
  }

  get profiles() {
    return this._profiles;
  }

  constructor(private updates: Observable<DataReply<Connection>>) { }

  connect() {
    this.subscription = this.updates.subscribe({
      next: data => this.handleUpdate(data),
      error: console.error,
    });
  }

  private handleUpdate(data: DataReply<Connection>) {
    const conn = data.data;

    if (data.type as any === 'done') {
      this._finished.next();
      return;
    }

    if (data.type === 'upd') {
      // TODO(ppacher): should we handle updates here?
      // it shouldn't make much of a difference
      return;
    }

    if (data.type === 'del') {
      const item = this._connections.get(data.key);
      if (!item) {
        return;
      }
      const [profile, verdict] = item;

      this._connections.delete(data.key);

      if (profile.connections.delete(data.key)) {
        if (!profile.connections.size) {
          delete (this._profiles[profile.id])
        } else if (verdict === Verdict.Accept) {
          profile.countPermitted--;
        }
      }
      return;
    }

    if (!conn?.ProcessContext?.ProfileID) {
      console.error(data);
      return
    }

    if (conn.Internal) {
      return;
    }

    let profile = this._profiles[conn.ProcessContext.ProfileID];
    if (!profile) {
      profile = {
        name: conn.ProcessContext.Name,
        id: conn.ProcessContext.ProfileID,
        connections: new Set(),
        countPermitted: 0,
      }

      this._profiles[profile.id] = profile;
    }

    this._connections.set(data.key, [profile, conn.Verdict]);
    profile.connections.add(data.key);
    if (conn.Verdict === Verdict.Accept) {
      profile.countPermitted++;
    }
  }

  dispose() {
    this.subscription.unsubscribe();
    this._finished.complete();
  }
}
