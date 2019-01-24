<template>
  <div class="ui internally celled grid" style="min-height: 100vh;">

    <!-- SIDEBAR -->
    <div class="five wide column list-pane-container">
      <div class="title">
        <h1>Monitoring</h1>
      </div>
      <p v-if="op.loading">
        loading...
      </p>
      <div v-else-if="op.error">
        error: {{ op.error }}
      </div>

      <div v-else class="list-pane" :style="list_pane_style">
        <div class="ui one column grid container">
          <div v-for="process in tree" v-bind:key="process.key" class="column process-list-container">
            <div v-on:click="selectProcess(process)" class="process-item">
              <span class="process-name">{{ process.data.Name }}</span> ({{ process.data.Pid }})
              <div class="ui label">
                <i class="stream icon"></i>
                <div class="detail">
                  {{ process.data.ConnectionCount }}
                </div>
              </div>
            </div>

            <div class="ui one column grid container">
              <div v-for="connection in process.children" v-bind:key="connection.key" v-on:click="selectConnection(connection)" class="column connection-item">
                <div>
                  <Verdict :verdict="connection.data.Verdict"></Verdict>
                  <span v-if="connection.data.Domain == 'IH'" class="connection-name">Incoming from Localhost</span>
                  <span v-else-if="connection.data.Domain == 'IL'" class="connection-name">Incoming from the LAN</span>
                  <span v-else-if="connection.data.Domain == 'II'" class="connection-name">Incoming from the Internet</span>
                  <span v-else-if="connection.data.Domain == 'IX'" class="connection-name">Incoming - Invalid</span>
                  <span v-else-if="connection.data.Domain == 'PH'" class="connection-name">Peers on Localhost</span>
                  <span v-else-if="connection.data.Domain == 'PL'" class="connection-name">Peers on the LAN</span>
                  <span v-else-if="connection.data.Domain == 'PI'" class="connection-name">Peers on the Internet</span>
                  <span v-else-if="connection.data.Domain == 'PX'" class="connection-name">Peers - Invalid</span>
                  <span v-else class="connection-name">{{ connection.data.Domain }}</span>
                  <div class="ui label">
                    <i class="project diagram icon"></i>
                    <div class="detail">
                      {{ connection.data.LinkCount }}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
    <!-- END OF SIDEBAR -->

    <!-- CONTENT SPACE -->
    <div v-if="selected == 1" class="eleven wide column container content-pane">
      <h2>{{ selectedProcess.data.Name }} ({{ selectedProcess.data.Pid }})</h2>

      <h4>CmdLine: {{ selectedConnection.parent.data.CmdLine }}</h4>
      <h4>ConnectionCount: {{ selectedConnection.parent.data.ConnectionCount }}</h4>
      <h4>Cwd: {{ selectedConnection.parent.data.Cwd }}</h4>
      <h4>ExecHashes: {{ selectedConnection.parent.data.ExecHashes }}</h4>
      <h4>ExecName: {{ selectedConnection.parent.data.ExecName }}</h4>
      <h4>FirstArg: {{ selectedConnection.parent.data.FirstArg }}</h4>
      <h4>FirstConnectionEstablished: {{ selectedConnection.parent.data.FirstConnectionEstablished|fmt_time }}</h4>
      <h4>Icon: {{ selectedConnection.parent.data.Icon }}</h4>
      <h4>LastConnectionEstablished: {{ selectedConnection.parent.data.LastConnectionEstablished|fmt_time }}</h4>
      <h4>Name: {{ selectedConnection.parent.data.Name }}</h4>
      <h4>ParentPid: {{ selectedConnection.parent.data.ParentPid }}</h4>
      <h4>Path: {{ selectedConnection.parent.data.Path }}</h4>
      <h4>Pid: {{ selectedConnection.parent.data.Pid }}</h4>
      <h4>UserHome: {{ selectedConnection.parent.data.UserHome }}</h4>
      <h4>UserID: {{ selectedConnection.parent.data.UserID }}</h4>
      <h4>UserName: {{ selectedConnection.parent.data.UserName }}</h4>
      <h4>UserProfileKey: {{ selectedConnection.parent.data.UserProfileKey }}</h4>
    </div>
    <div v-else-if="selected == 2" class="eleven wide column container content-pane">
      <h2>{{ selectedConnection.parent.data.Name }} ({{ selectedConnection.parent.data.Pid }}) >
        <span v-if="selectedConnection.data.Domain == 'IH'">Incoming from Localhost</span>
        <span v-else-if="selectedConnection.data.Domain == 'IL'">Incoming from the LAN</span>
        <span v-else-if="selectedConnection.data.Domain == 'II'">Incoming from the Internet</span>
        <span v-else-if="selectedConnection.data.Domain == 'IX'">Incoming - Invalid</span>
        <span v-else-if="selectedConnection.data.Domain == 'PH'">Peers on Localhost</span>
        <span v-else-if="selectedConnection.data.Domain == 'PL'">Peers on the LAN</span>
        <span v-else-if="selectedConnection.data.Domain == 'PI'">Peers on the Internet</span>
        <span v-else-if="selectedConnection.data.Domain == 'PX'">Peers - Invalid</span>
        <span v-else>{{ selectedConnection.data.Domain }}</span>
      </h2>
      <div class="ui one column grid">
        <div class="column">
          <h4>Direction: {{ selectedConnection.data.Direction }}</h4>
          <h4>Domain: {{ selectedConnection.data.Domain }}</h4>
          <h4>FirstLinkEstablished: {{ selectedConnection.data.FirstLinkEstablished|fmt_time }}</h4>
          <h4>Inspect: {{ selectedConnection.data.Inspect }}</h4>
          <h4>Intel: {{ selectedConnection.data.Intel }}</h4>
          <h4>LastLinkEstablished: {{ selectedConnection.data.LastLinkEstablished|fmt_time }}</h4>
          <h4>LinkCount: {{ selectedConnection.data.LinkCount }}</h4>
          <h4>Reason: {{ selectedConnection.data.Reason }}</h4>
          <h4>Verdict: {{ selectedConnection.data.Verdict }}</h4>
        </div>
        <div class="column">
          <div class="ui divider"></div>

          <table v-if="selectedConnection.children.length > 0" class="ui celled table">
            <thead>
              <tr>
                <th>Verdict, Reason</th>
                <th>RemoteAddress</th>
                <th>Started</th>
                <th>Ended</th>
                <th>Inspect</th>
                <th>Tunneled</th>
                <th>VerdictPermanent</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="link in selectedConnection.children" v-bind:key="link.key">
                <td><Verdict :verdict="link.data.Verdict" :reason="link.data.Reason" :long="true"></Verdict></td>
                <td>{{ link.data.RemoteAddress }}</td>
                <td>{{ link.data.Started|fmt_time }}</td>
                <td>{{ link.data.Ended|fmt_time }}</td>
                <td>{{ link.data.Inspect }}</td>
                <td>{{ link.data.Tunneled }}</td>
                <td>{{ link.data.VerdictPermanent }}</td>
              </tr>
            </tbody>
          </table>

          <div v-else class="ui grid middle aligned">
            <div class="row">
              <div class="column">
                <h1>no links</h1>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    <!-- END OF CONTENT SPACE -->

    <div v-else class="eleven wide column content-placeholder">
      <div class="ui grid middle aligned">
        <div class="row">
          <div class="column">
            <h1>select process or connection on the left</h1>
          </div>
        </div>
      </div>
    </div>

  </div>

</template>

<script>
import Verdict from "./Verdict.vue";

function countChar(s, c) {
  var count = 0;
  for (var i = 0; i < s.length; i++) {
    if (s[i] === c) {
      count += 1;
    }
  }
  return count;
}

export default {
  name: "Monitor",
  components: {
    Verdict
  },
  data() {
    return {
      op: this.$api.qsub("query network:tree/"),
      selected: 0,
      selectedProcess: null,
      selectedConnection: null
    };
  },
  computed: {
    tree() {
      var tree = [];

      // level 1
      var l1Keys = Object.keys(this.op.records).filter(function(key) {
        return countChar(key, "/") == 1;
      });
      for (var i = 0; i < l1Keys.length; i++) {
        var process = {
          key: l1Keys[i],
          data: this.op.records[l1Keys[i]],
          children: []
        };
        tree.push(process);

        // level 2
        var l2Keys = Object.keys(this.op.records).filter(function(key) {
          return countChar(key, "/") == 2 && key.startsWith(process.key);
        });
        for (var j = 0; j < l2Keys.length; j++) {
          var connection = {
            key: l2Keys[j],
            data: this.op.records[l2Keys[j]],
            children: [],
            parent: process
          };
          process.children.push(connection);

          // level 3
          var l3Keys = Object.keys(this.op.records).filter(function(key) {
            return countChar(key, "/") == 3 && key.startsWith(connection.key);
          });
          for (var k = 0; k < l3Keys.length; k++) {
            var link = {
              key: l3Keys[k],
              data: this.op.records[l3Keys[k]],
              parent: connection
            };
            connection.children.push(link);
          }

          // order level 3
          connection.children.sort(function(a, b) {
            return a.data.Started - b.data.Started;
          });
        }

        // order level 2
        process.children.sort(function(a, b) {
          return a.data.LastLinkEstablished - b.data.LastLinkEstablished;
        });
      }

      // order level 1
      tree.sort(function(a, b) {
        return a.LastConnectionEstablished - b.LastConnectionEstablished;
      });

      return tree;
    },
    list_pane_style() {
      var h =
        window.innerHeight ||
        document.documentElement.clientHeight ||
        document.body.clientHeight;
      return "height: " + (h - 50) + "px;";
    }
  },
  methods: {
    selectProcess(p) {
      this.selected = 1;
      this.selectedProcess = p;
    },
    selectConnection(c) {
      this.selected = 2;
      this.selectedConnection = c;
    }
  },
  filters: {
    fmt_time(value) {
      if (value == 0) {
        return "Never";
      }

      var date = new Date(value * 1000);
      return date.toLocaleTimeString();
    },
    fmt_datetime(value) {
      if (value == 0) {
        return "Never";
      }

      var date = new Date(value * 1000);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.ui.label {
  float: right;
}
.column {
  padding: 0.2em 0.4em !important;
}

.list-pane-container {
  padding: 0 !important;
}
.title {
  margin: 4px;
  height: 41px;
  border-bottom: 1px #ccc solid;
}
.list-pane {
  height: 100vh;
  overflow-y: scroll;
}

.process-list-container {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #ccc;
}
.process-name {
  font-weight: bold;
}
.process-item {
  padding-top: 5px;
  padding-bottom: 5px;
}
.process-item:hover,
.connection-item:hover {
  background-color: #eee;
  cursor: pointer;
}
.content-pane {
  padding: 50px !important;
  background-color: #eee;
  height: 100vh;
  overflow-y: scroll;
}
.content-placeholder {
  background-color: #eee;
  .grid {
    height: 100vh;
  }
  h1 {
    text-align: center;
    font-family: sans-serif;
    color: #ccc;
  }
}

.status {
  padding: 0 !important;
}
.status2 {
  padding: 0 0 0 1rem !important;
}
.status3 {
  padding: 0 0 0 2rem !important;
}
.list {
  margin-top: 0 !important;
}
h4 {
  margin: 4px 0 !important;
}
#map {
  height: 180px;
}
</style>
