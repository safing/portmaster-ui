import { Pipe, PipeTransform } from '@angular/core';
import { Connection, IsDenied, Verdict } from 'src/app/services';

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
