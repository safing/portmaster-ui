import { ConnectionPositionPair } from '@angular/cdk/overlay';
import { Subscription, Observable, ObservableInput, Subject } from 'rxjs';
import { Connection, RiskLevel, Verdict } from '../../services';
import { DataReply } from '../../services/portapi.types';

export interface Profile {
  id: string;
  name: string;
  connections: Set<string>;
  countPermitted: number;
  distinctPIDs: Set<number>;
}

interface ProfileMap {
  [profileID: string]: Profile;
}

export class Aggregator {
  private profileMap: ProfileMap = {};
  private connections: Map<string, [Profile, Verdict]> = new Map();
  private subscription: Subscription = Subscription.EMPTY;
  private _ready = new Subject<void>();
  private _selectedProfile = new Subject<Profile>();

  get ready(): Observable<void> {
    return this._ready;
  }

  get profiles() {
    return this.profileMap;
  }

  set selected(p: Profile | string | null) {
    if (typeof p === 'string') {
      this._selectedProfileKey = p;
    } else {
      this._selectedProfileKey = !!p ? p.id : '';
    }

    const selected = this.profileMap[this._selectedProfileKey] || null;
    if (!!selected) {
      this._selectedProfile.next(selected);
    }
  }
  private _selectedProfileKey: string = '';

  get selected$() {
    return this._selectedProfile.asObservable();
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
      this._ready.next();
      return;
    }

    if (data.type === 'upd') {
      // TODO(ppacher): should we handle updates here?
      // it shouldn't make much of a difference
      return;
    }

    if (data.type === 'del') {
      const item = this.connections.get(data.key);
      if (!item) {
        return;
      }
      const [profile, verdict] = item;

      this.connections.delete(data.key);

      if (profile.connections.delete(data.key)) {
        if (!profile.connections.size) {
          delete (this.profileMap[profile.id])
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

    let profile = this.profileMap[conn.ProcessContext.ProfileID];
    if (!profile) {
      profile = {
        name: conn.ProcessContext.Name,
        id: conn.ProcessContext.ProfileID,
        connections: new Set(),
        distinctPIDs: new Set(),
        countPermitted: 0,
      }

      this.profileMap[profile.id] = profile;
    }

    this.connections.set(data.key, [profile, conn.Verdict]);
    profile.connections.add(data.key);
    profile.distinctPIDs.add(conn.ProcessContext.PID);
    if (conn.Verdict === Verdict.Accept) {
      profile.countPermitted++;
    }

    // if we just updated the currently selected profile
    // we push an update.
    if (profile.id === this._selectedProfileKey) {
      this._selectedProfile.next({
        ...profile,
      });
    }
  }

  dispose() {
    this.subscription.unsubscribe();
    this._ready.complete();
  }
}
