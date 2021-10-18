import { IsDenied } from ".";
import { Connection, IntelEntity, Verdict } from "./network.types";

export class ConnectionStatistics {
  constructor(
    public distinctIPs: Map<string, number> = new Map(),
    public distinctCountries: Map<string, number> = new Map(),
    public distinctASNs: Map<string, number> = new Map(),
    public firstConn: number = Infinity,
    public lastConn: number = 0,
    public countTCP: number = 0,
    public countUDP: number = 0,
    public countDNS: number = 0,
    public countEncrypted: number = 0,
    public countAccepted: number = 0,
    public countInternal: number = 0,
  ) { }

  /** Quick-access to the very first country in the countries-slice. */
  get firstCountry() {
    // TODO(ppacher): is is very inefficient if used a lot ...
    return Array.from(this.distinctCountries.keys())[0];
  }

  /**
   * Update adds conn to the statistics. If
   * the connection is marked as internal it is
   * ignored.
   *
   * @param conn The connection to add.
   */
  update(conn: Connection) {
    if (conn.Internal) {
      this.countInternal++;
      return;
    }

    if (!!conn.Entity) {
      this.updateEntity(conn.Entity, incMap);

      if (!conn.Entity.IP) {
        this.countDNS++;
      }
    }

    if (conn.Started < this.firstConn) {
      this.firstConn = conn.Started;
    }

    if (conn.Started > this.lastConn) {
      this.lastConn = conn.Started;
    }

    if (!IsDenied(conn.Verdict)) {
      this.countAccepted++;
    }

    if (conn.Encrypted) {
      this.countEncrypted++;
    }

    switch (conn.IPProtocol) {
      case 17:
        this.countUDP++;
        break;
      case 6:
        this.countTCP++;
        break;
      default:
      // this IP protocol is not counted for
      // statistics purposes.
    }
  }

  /**
   * Remove a connction from the statistics. Internal
   * connections are ignored.
   *
   * @param conn The Connection object to remove.
   */
  remove(conn: Connection) {
    if (conn.Internal) {
      this.countInternal--;
      return;
    }

    if (!!conn.Entity) {
      this.updateEntity(conn.Entity, decMap);

      if (!conn.Entity.IP) {
        this.countDNS--;
      }
    }

    if (conn.Verdict === Verdict.Accept) {
      this.countAccepted--;
    }

    if (conn.Encrypted) {
      this.countEncrypted--;
    }

    switch (conn.IPProtocol) {
      case 17:
        this.countUDP--;
        break;
      case 6:
        this.countTCP--;
        break;
      default:
      // this IP protocol is not counted for
      // statistics purposes.
    }
  }

  /** Either add or remove statistic counters for the given entity. */
  private updateEntity(entity: IntelEntity, method: (m: Map<string, number>, k: string) => void) {
    if (!!entity.ASN) {
      method(this.distinctASNs, `AS${entity.ASN}`)
    }

    if (!!entity.IP) {
      method(this.distinctIPs, entity.IP);
    }

    if (!!entity.Country) {
      method(this.distinctCountries, entity.Country);
    }
  }
}

/** Increment the number of key in m, optionally creating the key */
function incMap(m: Map<string, number>, key: string) {
  let value = m.get(key) || 0;
  value++;
  m.set(key, value);
}

/** Decrement the number of key in m and eventually delete the key from m */
function decMap(m: Map<string, number>, key: string) {
  let value = m.get(key) || 1;
  value--;
  if (value === 0) {
    m.delete(key);
  } else {
    m.set(key, value);
  }
}
