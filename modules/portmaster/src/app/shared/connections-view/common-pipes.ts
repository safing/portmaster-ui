import { Pipe, PipeTransform } from '@angular/core';
import { Connection, ExpertiseLevel, ExpertiseLevelNumber, IsDenied, Verdict } from 'src/app/services';

// the following settings are stronger than rules
// and cannot be "fixed" by creating a new allow/deny
// rule.
let optionKeys = new Set([
  "filter/blockInternet",
  "filter/blockLAN",
  "filter/blockLocal",
  "filter/blockP2P",
  "filter/blockInbound"
])

@Pipe({
  name: "canUseRules",
  pure: true,
})
export class CanUseRulesPipe implements PipeTransform {
  transform(conn: Connection): boolean {
    if (conn.Reason.OptionKey != "" && IsDenied(conn.Verdict)) {
      return !optionKeys.has(conn.Reason.OptionKey);
    }
    return true;
  }
}

@Pipe({
  name: "canShowConnection",
  pure: true,
})
export class CanShowConnection implements PipeTransform {
  transform(conn: Connection, level: ExpertiseLevel) {
    if (level === ExpertiseLevel.Developer) {
      // we show all connections for developers
      return true;
    }
    // if we are in advanced or simple mode we should
    // hide internal connections.
    return !conn.Internal;
  }
}

@Pipe({
  name: "isBlocked",
  pure: true
})
export class IsBlockedConnectionPipe implements PipeTransform {
  transform(conn: Connection): boolean {
    return IsDenied(conn?.Verdict);
  }
}
