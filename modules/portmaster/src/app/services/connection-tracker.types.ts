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
  ) { }

  get firstCountry() {
    return Array.from(this.distinctCountries.keys())[0];
  }

  /**
   * Update adds conn to the statistics
   *
   * @param conn The connection to add.
   */
  update(conn: Connection) {
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

    if (conn.Verdict === Verdict.Accept) {
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

  remove(conn: Connection) {
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


function incMap(m: Map<string, number>, key: string) {
  let value = m.get(key) || 0;
  value++;
  m.set(key, value);
}

function decMap(m: Map<string, number>, key: string) {
  let value = m.get(key) || 1;
  value--;
  if (value === 0) {
    m.delete(key);
  } else {
    m.set(key, value);
  }
}
