import { Pipe, PipeTransform } from '@angular/core';
import { IsGlobalScope, IsLANScope, IsLocalhost, NetqueryConnection } from 'src/app/services';

@Pipe({
  name: 'connectionLocation',
  pure: true,
})
export class ConnectionLocationPipe implements PipeTransform {
  transform(conn: NetqueryConnection): string {
    if (conn.type === 'dns') {
      return '';
    }
    if (!!conn.country) {
      return conn.country;
    }

    const scope = conn.scope;

    if (IsGlobalScope(scope)) {
      return 'Internet'
    }

    if (IsLANScope(scope)) {
      return 'LAN';
    }

    if (IsLocalhost(scope)) {
      return 'Device'
    }

    return '';
  }
}
