import { Pipe, PipeTransform } from '@angular/core';
import { Connection, ConnectionType, IsGlobalScope, IsLocalhost, IsLANScope } from 'src/app/services';

@Pipe({
  name: 'connectionLocation',
  pure: true,
})
export class ConnectionLocationPipe implements PipeTransform {
  transform(conn: Connection): string {
    if (conn.Type === ConnectionType.DNSRequest) {
      return '';
    }
    if (!!conn.Entity.Country) {
      return conn.Entity.Country;
    }

    const scope = conn.Entity.IPScope;

    if (IsGlobalScope(scope)) {
      return 'Global'
    }

    if (IsLANScope(scope)) {
      return 'LAN';
    }

    if (IsLocalhost(scope)) {
      return 'Local'
    }

    return '';
  }
}
