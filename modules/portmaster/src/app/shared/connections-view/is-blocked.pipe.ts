import { Pipe, PipeTransform } from '@angular/core';
import { Connection, IsDenied } from 'src/app/services';

@Pipe({
  name: "isBlocked",
  pure: true
})
export class IsBlockedConnectionPipe implements PipeTransform {
  transform(conn: Connection): boolean {
    return IsDenied(conn?.Verdict);
  }
}
