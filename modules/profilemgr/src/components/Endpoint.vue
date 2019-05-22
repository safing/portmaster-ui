<template>

    <div v-if="editing">
      <div v-bind:class="['ui labeled input', {'error': !endpointIsValid}, {'active': endpointIsValid}]" style="width: 30%">
        <div class="ui center aligned label" style="width: 105px;">
          &nbsp;{{ endpointType|fmt_type }}&nbsp; <!-- dirty fix -->
        </div>
        <input type="text" v-model="modifiedEntry.Value" placeholder="Domain, IP/Range, ASN or Country">
      </div>
      <div v-bind:class="['ui input', {'error': !protocolIsValid}]" style="width: 15%">
        <input type="text" v-model="modifiedEntry.protocol" placeholder="any protocol">
      </div>
      <div v-bind:class="['ui input', {'error': !portsAreValid}]" style="width: 15%">
        <input type="text" v-model="modifiedEntry.ports" placeholder="any port">
      </div>

      <div class="ui icon buttons" style="float: right;">
        <button v-on:click="save()" class="ui button"><i class="check icon"></i></button>
        <button v-on:click="cancel()" class="ui button"><i class="cancel icon"></i></button>
      </div>

      <p v-if="error">
        <span style="color: red;">Error: {{ error }}</span>
      </p>
    </div>

    <div v-else>
      <i v-bind:class="['circle icon', 'profile-level-' + entry.profileLevel + '-color']"></i>

      <span class="endpoint-entity" title="Domain, IP/Range, ASN or Country">
        <strong>{{ entry.Type|fmt_type }}</strong>
        &nbsp;
        {{ entry.Value }}
      </span>

      <span v-if="entry.Type == 5" class="ui orange text">Type IPv4 Range not yet implemented, will deny all.</span>
      <span v-if="entry.Type == 6" class="ui orange text">Type IPv6 Range not yet implemented, will deny all.</span>
      <span v-if="entry.Type == 7" class="ui orange text">Type ASN not yet implemented, will deny all.</span>
      <span v-if="entry.Type == 8" class="ui orange text">Type Country not yet implemented, will deny all.</span>

      <span v-if="humanProtocol || humanPort" class="endpoint-detail" title="Protocol / Ports">
        <span v-if="humanProtocol">{{ humanProtocol }}</span>
        <span v-else>
          <sup><i class="small asterisk icon"></i></sup>
        </span>
        /
        <span v-if="humanPort">{{ humanPort }}</span>
        <span v-else>
          <sup><i class="small asterisk icon"></i></sup>
        </span>
      </span>

      <div v-if="$parent.editableInLevel(entry.profileLevel)" class="ui icon buttons" style="float: right;">
        <button v-on:click="edit()" class="ui button"><i class="edit icon"></i></button>
        <button v-on:click="remove()" class="ui button"><i class="trash alternate outline icon"></i></button>
      </div>

    </div>

</template>

<script>

const EptUnknown   = 0;
const EptAny       = 1;
const EptDomain    = 2;
const EptIPv4      = 3;
const EptIPv6      = 4;
const EptIPv4Range = 5;
const EptIPv6Range = 6;
const EptASN       = 7;
const EptCountry   = 8;

const endpointTypeNames = {
  0: "Unknown",
  1: "Any",
  2: "Domain",
  3: "IPv4",
  4: "IPv6",
  5: "IPv4 Range",
  6: "IPv6 Range",
  7: "AS",
  8: "Country"
};

// prettier-ignore
const protocolNumbers = {
  "ICMP": 1,
  "IGMP": 2,
  "TCP": 6,
  "UDP": 17,
  "RDP": 27,
  "DCCP": 33,
  "ICMPV6": 58,
  "UDPLITE": 136
};

const protocolNames = {
  1: "ICMP",
  2: "IGMP",
  6: "TCP",
  17: "UDP",
  27: "RDP",
  33: "DCCP",
  58: "ICMPV6",
  136: "UDPLITE"
};

// TODO: add these
// 20-21	 FPT
// 135-139	 NetBIOS
// 161-162	 SNMP

// prettier-ignore
const portNumbers = {
  "SSH": 22,
  "TELNET": 23,
  "SMTP": 25,
  "DNS": 53,
  "HTTP": 80,
  "POP": 110,
  "NTP": 123,
  "IMAP": 143,
  "LDAP": 389,
  "HTTPS": 443,
  "SMTP-ALT": 587,
  "SMTP-SSL": 465,
  "IMAP-SSL": 993,
  "POP-SSL": 995
};

const portNames = {
  22: "SSH",
  23: "TELNET",
  25: "SMTP",
  53: "DNS",
  80: "HTTP",
  110: "POP",
  123: "NTP",
  143: "IMAP",
  389: "LDAP",
  443: "HTTPS",
  587: "SMTP-ALT",
  465: "SMTP-SSL",
  993: "IMAP-SSL",
  995: "POP-SSL"
};

// eslint-disable-next-line
const countryRegex = new RegExp("^[A-Z]{2}$");
const domainRegex  = new RegExp("^\\*?(([A-z0-9][A-z0-9-]{0,61}[A-z0-9])?\\.)*[A-z]{2,}\\.$");
const altDomainRegex = new RegExp("^\\*?[A-z0-9\\.-]+\\*$");
const asnRegex = new RegExp("^(AS)?[0-9]+$");

const { IP } = require("@hownetworks/ipv46");
import { IPv4 } from "ip-num";
import { IPv6 } from "ip-num";
import { IPv4Range } from "ip-num";
import { IPv6Range } from "ip-num";
import { Validator } from "ip-num";

export default {
  name: "Endpoint",
  props: {
    entry: Object
  },
  data() {
    return {
      editing: false,
      modifiedEntry: null,
      error: ""
    };
  },
  methods: {
    edit() {
      this.editing = true;
      this.modifiedEntry = JSON.parse(JSON.stringify(this.entry));
      this.modifiedEntry.protocol = this.humanProtocol;
      this.modifiedEntry.ports = this.humanPort;
      if (this.modifiedEntry.Type == EptAny) {
        this.modifiedEntry.Value = "*";
      }
    },
    save() {
      var error = this.clean();
      if (error != null) {
        this.error = error;
        return;
      }
      this.$parent.updateEndpoint(this.entry.key, this.modifiedEntry);
      this.cancel();
    },
    cancel() {
      this.editing = false;
      this.modifiedEntry = null;
      this.error = "";
    },
    remove() {
      this.$parent.deleteEndpoint(this.entry);
    },
    getProtocolNumber(text) {
      text = text.trim().toUpperCase();
      var number = protocolNumbers[text];
      if (number != undefined) {
        return number;
      }
      return text;
    },
    getPortNumber(text) {
      text = text.trim().toUpperCase();
      var number = portNumbers[text];
      if (number != undefined) {
        return number;
      }
      return text;
    },
    clean() {
      var cleanedEP = this.cleanedEndpoint;
      if (!cleanedEP[2]) {
        return "invalid endpoint";
      }

      var cleanedProtocol = this.cleanedProtocol;
      if (!cleanedProtocol[1]) {
        return "invalid protocol";
      }

      var cleanedPorts = this.cleanedPorts;
      if (!cleanedPorts[2]) {
        return "invalid port(s)";
      }

      this.modifiedEntry.Type = cleanedEP[0];
      this.modifiedEntry.Value = cleanedEP[1];
      this.modifiedEntry.Protocol = cleanedProtocol[0];
      this.modifiedEntry.StartPort = cleanedPorts[0];
      this.modifiedEntry.EndPort = cleanedPorts[1];

      return null;
    },
    parsePort(port) {
      // first check if port is a name
      if (typeof port === "string" || port instanceof String) {
        port = this.getPortNumber(port);
      }

      // convert if still a string
      if (typeof port === "string" || port instanceof String) {
        port = Number.parseInt(port);
        if (isNaN(port)) {
          return [65535, false];
        }
      }

      // check if its in a valid range
      if (port < 1 || port > 65535) {
        return [65535, false];
      }

      return [port, true];
    }
  },
  computed: {
    humanPort() {
      if (this.entry.StartPort == 0) {
        return "";
      }
      if (this.entry.StartPort == this.entry.EndPort) {
        var name = portNames[this.entry.StartPort];
        if (name != undefined) {
          return name;
        }
        return this.entry.StartPort;
      }
      return this.entry.StartPort + "-" + this.entry.EndPort;
    },
    humanProtocol() {
      if (this.entry.Protocol == 0) {
        return "";
      }
      var name = protocolNames[this.entry.Protocol];
      if (name != undefined) {
        return name;
      }
      return this.entry.Protocol;
    },
    cleanedEndpoint() {
      // returns: newType, newValue, ok

      if (this.modifiedEntry == null) {
        return [EptUnknown, "ERROR", false];
      }

      var endpoint = this.modifiedEntry.Value.trim();

      // Any
      if (endpoint == "*") {
        return [EptAny, "", true];
      }

      // IPv4
      if (Validator.isValidIPv4String(endpoint)[0]) {
        return [EptIPv4, IPv4.fromDecimalDottedString(endpoint).toString(), true];
      }

      // IPv6
      if (Validator.isValidIPv6String(endpoint)[0]) {
        return [EptIPv6, IP.parse(endpoint).toString(), true];
      }

      // IPv4 Network
      if (Validator.isValidIPv4CidrNotation(endpoint)[0]) {
        return [EptIPv4Range, IPv4Range.fromCidr(endpoint).toCidrString(), true];
      }

      // IPv6 Network
      if (Validator.isValidIPv6CidrNotation(endpoint)[0]) {
        var range = IPv6Range.fromCidr(endpoint)
        var s = IP.parse(range.ipv6.toString()).toString() + "/" + range.cidrPrefix
        return [EptIPv6Range, s, true];
      }

      // ASN
      if (asnRegex.test(endpoint)) {
        if (endpoint.startsWith("AS")) {
          return [EptASN, endpoint.substring(2), true];
        }
        return [EptASN, endpoint, true];
      }

      // country
      if (countryRegex.test(endpoint)) {
        return [EptCountry, endpoint.toUpperCase(), true];
      }

      // domain
      if (domainRegex.test(endpoint)) {
        return [EptDomain, endpoint.toLowerCase(), true];
      }

      // try fixing domain
      var fixed = endpoint + ".";
      if (domainRegex.test(fixed)) {
        return [EptDomain, fixed.toLowerCase(), true];
      }

      // try domain with wildcard at end
      if (altDomainRegex.test(endpoint)) {
        return [EptDomain, endpoint.toLowerCase(), true];
      }

      // invalid
      this.modifiedEntry.Type = EptUnknown;
      return [EptUnknown, "ERROR", false];
    },
    endpointType() {
      return this.cleanedEndpoint[0];
    },
    endpointIsValid() {
      return this.cleanedEndpoint[2];
    },
    cleanedProtocol() {
      // returns: newValue, ok

      if (this.modifiedEntry == null) {
        return [255, false];
      }

      var protocol = this.modifiedEntry.protocol.trim().toLowerCase();
      // eslint-disable-next-line

      if (protocol == "" || protocol == "*") {
        return [0, true];
      }

      // check if value is protocl name
      if (typeof protocol === "string" || protocol instanceof String) {
        protocol = this.getProtocolNumber(protocol);
      }

      // convert if still a string
      if (typeof protocol === "string" || protocol instanceof String) {
        protocol = Number.parseInt(protocol);
        if (isNaN(protocol)) {
          return [255, false];
        }
      }

      // check if its in a valid range
      if (protocol < 1 || protocol > 255) {
        return [255, false];
      }

      return [protocol, true];
    },
    protocolIsValid() {
      return this.cleanedProtocol[1];
    },
    cleanedPorts() {
      // returns: newStartValue, newEndValue, ok

      if (this.modifiedEntry == null) {
        return [65535, 65535, false];
      }

      var ports = this.modifiedEntry.ports.trim().toUpperCase();

      if (ports == "" || ports == "*") {
        return [0, 0, true];
      }

      // eslint-disable-next-line
      var splittedPorts = ports.match(/^([0-9A-Za-z]+(-[A-Za-z]+)?)(-([0-9]+))?$/);
      if (splittedPorts == null) {
        return [65535, 65535, false];
      }
      var startPort = this.parsePort(splittedPorts[1]);
      if (!startPort[1]) {
        return [65535, 65535, false];
      }

      var endPort = startPort;
      if (splittedPorts[4] != undefined) {
        endPort = this.parsePort(splittedPorts[4]);
        if (!endPort[1]) {
          return [65535, 65535, false];
        }
      }

      if (endPort < startPort) {
        return [65535, 65535, false];
      }

      return [startPort[0], endPort[0], true];
    },
    portsAreValid() {
      return this.cleanedPorts[2];
    }
  },
  filters: {
    fmt_type(value) {
      return endpointTypeNames[value];
    }
  }
};
</script>

<style scoped lang="scss">
.endpoint {
  overflow: auto;
  .ui.input {
    padding-right: 5px !important;
  }
}

.endpoint-entity {
  padding: 10px;
  line-height: 37px;
}

.endpoint-detail {
  padding: 5px 8px;
  background-color: #e0e1e2;
  border-radius: 0.28571429rem;
  i {
    font-size: 0.9rem;
  }
}

.ui.labeled.input > .ui.label {
  border-left: 1px solid #e8e8e8;
  border-top: 1px solid #e8e8e8;
  border-bottom: 1px solid #e8e8e8;
}

.type-button:hover {
  cursor: auto;
}
</style>
