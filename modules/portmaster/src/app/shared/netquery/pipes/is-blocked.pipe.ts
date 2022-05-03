import { Pipe, PipeTransform } from '@angular/core';
import { IsDenied, NetqueryConnection } from 'src/app/services';

@Pipe({
  name: "isBlocked",
  pure: true
})
export class IsBlockedConnectionPipe implements PipeTransform {
  transform(conn: NetqueryConnection): boolean {
    return IsDenied(conn?.verdict);
  }
}
