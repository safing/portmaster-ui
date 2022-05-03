
// the following settings are stronger than rules
// and cannot be "fixed" by creating a new allow/deny

import { Pipe, PipeTransform } from "@angular/core";
import { Connection, IsDenied, NetqueryConnection } from "src/app/services";

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
  transform(conn: NetqueryConnection): boolean {
    // FIXME:
    return false;
    /*
    if (!conn) {
      return false;
    }
    if (conn.Reason.OptionKey != "" && IsDenied(conn.Verdict)) {
      return !optionKeys.has(conn.Reason.OptionKey);
    }
    return true;
    */
  }
}

