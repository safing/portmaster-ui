import { Component, Input, OnInit } from '@angular/core';
import { parse } from 'psl';
import { Connection, RiskLevel, ScopeTranslation, Verdict } from 'src/app/services';

interface Group {
  scope: string;
  subdomain?: string;
  domain?: string;
  connections: Connection[];
  blockStatus: RiskLevel;
  distinctIPs: Set<string>;
  distinctCountries: Set<string>;
  distinctASNs: Set<string>;
  firstConn: number;
  lastConn: number;
  countTCP: number;
  countUDP: number;
  countDNS: number;
  countEncrypted: number;
}

@Component({
  selector: 'app-connections-view',
  templateUrl: './connections-view.html',
  styleUrls: ['./connections-view.scss']
})
export class ConnectionsViewComponent implements OnInit {
  readonly scopeTranslation = ScopeTranslation;
  readonly displayedColumns = ['state', 'reason', 'entity', 'started', 'ended'];
  readonly verdict = Verdict;

  groups = new Map<string, Group>();

  @Input()
  set connections(v: Connection[]) {
    this._connections = v;
    this.groupConnections(v);
  }
  get connections() { return this._connections; }
  private _connections: Connection[] = [];

  ngOnInit() {

  }

  private groupConnections(connections: Connection[]) {
    this.groups = new Map();

    connections.forEach(conn => {
      const key = conn.Scope;
      let grp = this.groups.get(key);

      if (!grp) {
        grp = {
          scope: key,
          connections: [],
          blockStatus: RiskLevel.Off,
          firstConn: Infinity,
          lastConn: 0,
          distinctASNs: new Set(),
          distinctCountries: new Set(),
          distinctIPs: new Set(),
          countTCP: 0,
          countUDP: 0,
          countDNS: 0,
          countEncrypted: 0,
        }

        const parsed = parse(key);
        if (parsed.error === undefined) {
          grp.subdomain = parsed.subdomain || '';
          grp.domain = parsed.domain || '';
        }

        this.groups.set(key, grp);
      }

      if (conn.Started < grp.firstConn) {
        grp.firstConn = conn.Started;
      }

      if (conn.Ended > grp.lastConn) {
        grp.lastConn = conn.Ended;
      }

      if (!!conn.Entity) {

        if (!!conn.Entity.ASN) {
          grp.distinctASNs.add(`AS${conn.Entity.ASN}`);
        }

        if (!!conn.Entity.IP) {
          grp.distinctIPs.add(conn.Entity.IP);
        } else {
          // NO ip means that this was a DNS request
          grp.countDNS++;
        }

        if (!!conn.Entity.Country) {
          grp.distinctCountries.add(conn.Entity.Country);
        }
      }


      if (conn.IPProtocol === 17) {
        grp.countUDP++;
      } else if (conn.IPProtocol === 6) {
        grp.countTCP++;
      } // TODO(ppacher): should we count others as well?

      if (conn.Encrypted) {
        grp.countEncrypted++;
      }

      grp.connections.push(conn);
    });

    this.groups.forEach(grp => {
      let hasBlocked = false;
      let hasAccepted = false;

      for (let i = 0; i < grp.connections.length; i++) {
        const conn = grp.connections[i];
        if (conn.Verdict === Verdict.Block || conn.Verdict === Verdict.Drop) {
          hasBlocked = true;
        } else if (conn.Verdict === Verdict.Accept) {
          hasAccepted = true;
        } else {
          console.warn(`Unexpected verdict ${conn.Verdict} (${Verdict[conn.Verdict]}) for connection`, conn);
        }

        if (hasBlocked && hasAccepted) {
          break;
        }
      }

      if (hasBlocked && hasAccepted) {
        grp.blockStatus = RiskLevel.Off;
      } else if (hasBlocked) {
        grp.blockStatus = RiskLevel.Medium;
      } else {
        grp.blockStatus = RiskLevel.Low;
      }
    })
  }
}
