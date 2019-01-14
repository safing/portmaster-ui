<template>

    <div v-if="editing">
      <button v-on:click="modifiedEntry.IncludeSubdomains = !modifiedEntry.IncludeSubdomains" v-bind:class="['ui icon button', {'blue': modifiedEntry.IncludeSubdomains}]" title="Include Subdomains">
        <i class="small asterisk icon"></i>
      </button>

      <div class="ui input" style="width: 30%">
        <input type="text" v-model="modifiedEntry.DomainOrIP" placeholder="Domain Or IP">
      </div>
      <div class="ui input" style="width: 15%">
        <input type="text" v-model="modifiedEntry.protocol" placeholder="any protocol">
      </div>
      <div class="ui input" style="width: 15%">
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

      <span class="endpoint-entity" title="Domain or IP">
        <span v-if="entry.IncludeSubdomains" class="endpoint-subdomains" title="Include Subdomains">
          <sup><i class="small asterisk icon"></i></sup>
        </span>
        {{ entry.DomainOrIP }}
      </span>

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
      this.$parent.deleteEndpoint(this.entry.key);
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
      var protocol = 0;
      this.modifiedEntry.protocol = this.modifiedEntry.protocol.trim();
      // eslint-disable-next-line
      if (this.modifiedEntry.protocol != "" && this.modifiedEntry.protocol != "*") {
        protocol = this.modifiedEntry.protocol;
        // first check if its a name
        if (typeof protocol === "string" || protocol instanceof String) {
          protocol = this.getProtocolNumber(protocol);
        }
        // then convert if necessary
        if (typeof protocol === "string" || protocol instanceof String) {
          protocol = Number.parseInt(protocol);
          if (isNaN(protocol)) {
            return "invalid protocol";
          }
        }
        // check if its in a valid range
        if (protocol < 1 || protocol > 255) {
          return "invalid protocol";
        }
      }

      // get and separate ports
      var startPort = 0;
      var endPort = 0;
      this.modifiedEntry.ports = this.modifiedEntry.ports.trim();
      // eslint-disable-next-line
      if (this.modifiedEntry.ports != "" && this.modifiedEntry.protocol != "*") {
        // eslint-disable-next-line
        var ports = this.modifiedEntry.ports.match(/^([0-9A-Za-z]+(-[A-Za-z]+)?)(-([0-9]+))?$/);
        startPort = ports[1];
        // first check if startPort is a name
        if (typeof startPort === "string" || startPort instanceof String) {
          startPort = this.getPortNumber(startPort);
        }
        // then convert if necessary
        if (typeof startPort === "string" || startPort instanceof String) {
          startPort = Number.parseInt(startPort);
          if (isNaN(startPort)) {
            return "invalid port";
          }
        }
        // check if its in a valid range
        if (startPort < 1 || startPort > 65535) {
          return "invalid port";
        }

        endPort = startPort;
        if (ports[4] != undefined) {
          endPort = ports[4];
          // first check if startPort is a name
          if (typeof endPort === "string" || endPort instanceof String) {
            endPort = this.getPortNumber(endPort);
          }
          // then convert if necessary
          if (typeof endPort === "string" || endPort instanceof String) {
            endPort = Number.parseInt(endPort);
            if (isNaN(endPort)) {
              return "invalid port";
            }
          }
          // check if its in a valid range
          if (endPort < 1 || endPort > 65535) {
            return "invalid port";
          }
        }
      }

      this.modifiedEntry.Protocol = protocol;
      this.modifiedEntry.StartPort = startPort;
      this.modifiedEntry.EndPort = endPort;

      return null;
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
</style>
