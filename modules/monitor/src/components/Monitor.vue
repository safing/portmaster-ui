<template>
  <div class="ui internally celled grid" style="min-height: 100vh;">
    <!-- SIDEBAR -->
    <div class="five wide column list-pane-container">
      <div class="title">
        <span
          v-if="tree.unconnectedRecords"
          style="float: right; padding: 8px;"
          data-tooltip="# of records that are missing their parent record, ie. are not displayed (check browser console)"
          data-position="bottom left"
        >
          <i class="yellow exclamation triangle icon"></i>
          {{ tree.unconnectedRecords }}
        </span>
        <span
          v-if="op.warnings.length"
          style="float: right; padding: 8px;"
          data-tooltip="# of records that failed to be delivered or parsed"
          data-position="bottom left"
        >
          <i class="red exclamation circle icon"></i>
          {{ op.warnings.length }}
        </span>
        <h1>Monitoring</h1>
      </div>
      <p v-if="op.loading">
        loading...
      </p>
      <div v-else-if="op.error">error: {{ op.error }}</div>

      <div v-else class="list-pane">
        <div v-if="tree.activeProcesses.length > 0" class="ui one column grid container list-pane-container">
          <div v-for="process in tree.activeProcesses" v-bind:key="process._key" class="column process-list-container">
            <div v-on:click="selectProcess(process)" class="process-item">
              <span class="process-name">{{ process.Name }}</span> ({{ process.Pid }})
              <div class="ui label">
                <i class="stream icon"></i>
                <div class="detail">
                  {{ process._scopes.length }}
                </div>
              </div>
            </div>

            <div class="ui one column grid container list-pane-container">
              <div
                v-for="scope in process._scopes"
                v-bind:key="scope.key"
                v-on:click="selectScope(scope)"
                class="column scope-item"
              >
                <div>
                  <Verdict v-if="scope.connections.length > 0" :verdict="scope.verdictSummary"></Verdict>
                  <Verdict v-else-if="scope.dnsRequest" :verdict="scope.dnsRequest.Verdict"></Verdict>
                  <Verdict v-else :verdict="0"></Verdict>
                  <span class="scope-name">{{ scope.name | fmtScopeName }}</span>
                  <div class="ui label">
                    <i class="project diagram icon"></i>
                    <div v-if="scope.connections.length > 0" class="detail">
                      {{ scope.connections.length }}
                    </div>
                    <div v-else class="detail">
                      0
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="row content-placeholder no-activity">
          <div class="column">
            <h1>no activity</h1>
          </div>
        </div>
      </div>
    </div>
    <!-- END OF SIDEBAR -->

    <!-- CONTENT SPACE -->
    <div v-if="selected == 1 && !selectedProcess._deleted" class="eleven wide column container content-pane">
      <h2>{{ selectedProcess.Name }} ({{ selectedProcess.Pid }})</h2>

      <table class="ui very basic collapsing very compact table">
        <tbody>
          <tr>
            <td>Active</td>
            <td v-if="!selectedProcess.FirstSeen && !selectedProcess.LastSeen">no activity</td>
            <td v-else-if="selectedProcess.FirstSeen == selectedProcess.LastSeen">
              at {{ selectedProcess.FirstSeen | fmt_time }}
            </td>
            <td v-else>{{ selectedProcess.FirstSeen | fmt_time }} - {{ selectedProcess.LastSeen | fmt_time }}</td>
          </tr>
          <tr>
            <td>UserName</td>
            <td>
              {{ selectedProcess.UserName }} <span v-if="selectedProcess.UserID">({{ selectedProcess.UserID }})</span>
            </td>
          </tr>
          <tr>
            <td>Pid</td>
            <td>{{ selectedProcess.Pid }}</td>
          </tr>
          <tr>
            <td>ParentPid</td>
            <td>{{ selectedProcess.ParentPid }}</td>
          </tr>
          <tr>
            <td>Path</td>
            <td>{{ selectedProcess.Path }}</td>
          </tr>
          <tr>
            <td>Paremeters</td>
            <td>{{ selectedProcess.CmdLine }}</td>
          </tr>
          <tr>
            <td>Profile</td>
            <td>{{ selectedProcess.LocalProfileKey }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="selectedProcess._childProcesses">
        <h4>Child Processes:</h4>
        <ChildProcessList :processes="selectedProcess._childProcesses"></ChildProcessList>
      </div>

      <div class="debugging">
        <h3>Debugging <small>...left here intentionally, for now.</small></h3>
        <pre>{{ selectedProcess | cleanObject | fmtObject }}</pre>
      </div>
    </div>
    <div v-else-if="selected == 2" class="eleven wide column container content-pane">
      <h2>
        {{ selectedScope._process.Name }} ({{ selectedScope._process.Pid }}) > {{ selectedScope.name | fmtScopeName }}
      </h2>
      <div class="ui one column grid">
        <div v-if="selectedScope.dnsRequest" class="column">
          <h4>DNS Request</h4>

          <table class="ui very basic collapsing very compact table">
            <tbody>
              <tr>
                <td>Verdict</td>
                <td>
                  <Verdict
                    :verdict="selectedScope.dnsRequest.Verdict"
                    :reason="selectedScope.dnsRequest.Reason"
                    :long="true"
                  ></Verdict>
                </td>
              </tr>
              <tr>
                <td>Active</td>
                <td v-if="selectedScope.dnsRequest.Started == selectedScope.dnsRequest.Ended">
                  at {{ selectedScope.dnsRequest.Started | fmt_time }}
                </td>
                <td v-else>
                  {{ selectedScope.dnsRequest.Started | fmt_time }} - {{ selectedScope.dnsRequest.Ended | fmt_time }}
                </td>
              </tr>
              <tr>
                <td>Entity</td>
                <td>
                  <pre>{{ selectedScope.dnsRequest.Entity | fmtObject }}</pre>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="selectedScope.connections && selectedScope.connections.length > 0" class="column">
          <h4>Connections</h4>

          <table class="ui celled table">
            <thead>
              <tr>
                <th>Verdict, Reason</th>
                <th>Entity</th>
                <th>Started</th>
                <th>Ended</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="conn in selectedScope.connections" v-bind:key="conn.key">
                <td><Verdict :verdict="conn.Verdict" :reason="conn.Reason" :long="true"></Verdict></td>
                <td>{{ conn.Entity.IP }} {{ conn.Entity.Protocol }}/{{ conn.Entity.Port }}</td>
                <td>{{ conn.Started | fmt_time }}</td>
                <td>{{ conn.Ended | fmt_time }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="column">
          <div class="ui grid middle aligned">
            <div class="row">
              <div class="column placeholder-text">
                <h1>no active connections</h1>
                <p>
                  Please note that connections may have been attributed to<br />
                  another domain that shares at least one IP address.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="debugging">
          <h3>Debugging <small>...left here intentionally, for now.</small></h3>
          <pre>{{ selectedScope | cleanObject | fmtObject }}</pre>
        </div>
      </div>
    </div>
    <!-- END OF CONTENT SPACE -->

    <div v-else class="eleven wide column content-placeholder">
      <div class="ui grid middle aligned">
        <div class="row">
          <div class="column">
            <h1>select process or connection scope on the left</h1>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Verdict from "./Verdict.vue";
import ChildProcessList from "./ChildProcessList.vue";

function countChar(s, c) {
  var count = 0;
  for (var i = 0; i < s.length; i++) {
    if (s[i] === c) {
      count += 1;
      if (count >= 3) {
        return count;
      }
    }
  }
  return count;
}

export default {
  name: "Monitor",
  components: {
    Verdict,
    ChildProcessList
  },
  data() {
    return {
      op: this.$api.qsub("query network:tree/ where not Internal is true").prepFn("", function(key, obj) {
        if (!obj._key) {
          obj._key = key;

          if (obj.Virtual) {
            obj._treeLayer = -1; // -1, 1, 2, 3
            obj._processKey = `network:tree/${obj.ParentPid}`;
          } else {
            switch (countChar(key, "/")) {
              case 1:
                // process
                obj._treeLayer = 1;
                obj.lastActivity = 0;
                break;
              case 2:
                // dns connection
                obj._treeLayer = 2;
                obj._processKey = key
                  .split("/")
                  .slice(0, 2)
                  .join("/");
                obj._scopeKey = obj._key;
                obj.lastActivity = 0;
                break;
              case 3:
                // connection
                obj._treeLayer = 3;
                obj._processKey = key
                  .split("/")
                  .slice(0, 2)
                  .join("/");
                obj._scopeKey = key
                  .split("/")
                  .slice(0, 3)
                  .join("/");
                break;
              default:
                console.log(`WARNING: unexpected count of / in key ${key}`);
            }
          }
        }
      }),
      opChanged: this.$api.info().changeCnt,
      treeCache: null,
      selected: 0,
      selectedProcess: null,
      selectedScope: null
    };
  },
  computed: {
    tree() {
      console.log("======== updating tree structure");

      // get changes from api operation
      var changes = this.op.getChanges();

      // initialize object
      var t = this.treeCache;
      if (!t) {
        t = {};
        // simulate deletion on first run
        changes.deleted = 1;
      }

      // reset if something got deleted
      if (changes.deleted > 0) {
        t.activeProcesses = [];
        t.scopes = {};
        t.unconnectedRecords = 0;
        for (const [key, record] of Object.entries(this.op.records)) {
          delete record._inTree;
          delete record._active;
          delete record._parent;
          delete record._scopes;
          delete record._childProcesses;
        }
      }

      // add all missing links
      for (const [key, record] of Object.entries(this.op.records)) {
        if (!record._inTree) {
          switch (record._treeLayer) {
            case -1:
              // virtual process
              var parentRecord = this.op.records[record._processKey];
              if (parentRecord) {
                if (!parentRecord._childProcesses) {
                  parentRecord._childProcesses = [];
                }
                parentRecord._childProcesses.unshift(record);
                record._process = parentRecord;
                record._inTree = true;
              }
              // Do not alert about not being able to connect virtual processes, as they themselves could be a non-matching parent when the Portmaster tries to find the primary process of a connection.
              break;
            case 1:
              // all handling to activeProcesses is done later, when the first connection is added
              // mark as handled
              record._inTree = true;
              break;
            case 2:
            case 3:
              // dns requests & connections:
              // get or create a scope
              var scope = t.scopes[record._scopeKey];
              if (!scope) {
                // create new
                scope = {
                  key: record._scopeKey,
                  name: record.Scope,
                  connections: [],
                  verdictSummary: 0,
                  lastActivity: 0
                };
                // save scope
                t.scopes[scope.key] = scope;
              }

              // add connection to scope
              switch (record._treeLayer) {
                case 2:
                  scope.dnsRequest = record;
                  break;
                case 3:
                  scope.connections.unshift(record);
                  break;
              }

              // update scope's last activity with connection
              if (record.Started > scope.lastActivity) {
                scope.lastActivity = record.Started;
              }

              // summarize connection verdict
              if (record._treeLayer == 3) {
                if (scope.verdictSummary == 0) {
                  // first encounter
                  scope.verdictSummary = record.Verdict;
                } else if (scope.verdictSummary != record.Verdict) {
                  // not the same, set to failed
                  scope.verdictSummary = 1;
                }
              }

              // mark as handled
              record._inTree = true;

              // add scope to process
              if (!scope._process) {
                // add to process
                var process = this.op.records[record._processKey];
                if (process) {
                  // create scopes
                  if (!process._scopes) {
                    process._scopes = [];
                  }
                  // link together
                  process._scopes.unshift(scope);
                  scope._process = process;
                } else {
                  console.log(`could not connect ${record._key} to ${record._processKey}`);
                  t.unconnectedRecords++;
                }
              }

              // mark as in tree if scope is connected
              if (scope._process) {
                // update scope's last activity with connection
                if (scope.lastActivity > scope._process.lastActivity) {
                  scope._process.lastActivity = scope.lastActivity;
                }

                // activate process
                if (!scope._process._active) {
                  t.activeProcesses.unshift(scope._process);
                  scope._process._active = true;
                }
              }
            // end switch
          }
        }
      }

      // unconnected?
      if (t.unconnectedRecords > 0) {
        console.warn(`${t.unconnectedRecords} records could not be connected.`);
      }

      // sort if needed
      if (changes.deleted > 0) {
        this.sortTree(t);
      }

      // silence vue/no-side-effects-in-computed-properties
      // this really seems to the best way, changes are not picked up when using a watcher
      // eslint-disable-next-line
      this.treeCache = t;
      return t;
    }
  },
  methods: {
    sortTree(t) {
      for (const [key, process] of Object.entries(t.activeProcesses)) {
        for (const [key, scope] of Object.entries(process._scopes)) {
          // sort connections
          scope.connections.sort(function(a, b) {
            return a.Started - b.Started;
          });
        }

        // sort scopes
        process._scopes.sort(function(a, b) {
          return a.lastActivity - b.lastActivity;
        });

        // sort child processes
        if (process._childProcesses) {
          process._childProcesses.sort(function(a, b) {
            return b.Pid - a.Pid;
          });
        }
      }

      // sort processes
      t.activeProcesses.sort(function(a, b) {
        return a.lastActivity - b.lastActivity;
      });
    },
    selectProcess(p) {
      this.selected = 1;
      this.selectedProcess = p;
    },
    selectScope(c) {
      this.selected = 2;
      this.selectedScope = c;
    }
  },
  filters: {
    fmt_time(value) {
      if (value == 0) {
        return "ongoing";
      }

      var date = new Date(value * 1000);
      return date.toLocaleTimeString();
    },
    fmt_datetime(value) {
      if (value == 0) {
        return "ongoing";
      }

      var date = new Date(value * 1000);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    },
    fmtScopeName(value) {
      switch (value) {
        case "IH":
          return "Incoming from Localhost";
        case "IL":
          return "Incoming from the LAN";
        case "II":
          return "Incoming from the Internet";
        case "IX":
          return "Incoming - Invalid";
        case "PH":
          return "Peers on Localhost";
        case "PL":
          return "Peers on the LAN";
        case "PI":
          return "Peers on the Internet";
        case "PX":
          return "Peers - Invalid";
        default:
          return value;
      }
    },
    cleanObject(value) {
      // make copy
      var copy = {};
      for (const [key, value] of Object.entries(value)) {
        // don't copy underline values
        if (!key.startsWith("_")) {
          copy[key] = value;
        }
      }
      return copy;
    },
    fmtObject(value) {
      return JSON.stringify(value, null, "    ");
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
  border-bottom: 1px #ccc solid;
  h1 {
    margin: 4px;
    height: 34px;
  }
}
.list-pane {
  height: calc(100vh - 43px);
  overflow-y: scroll;
  overflow-x: hidden;
}

.process-list-container {
  margin-top: 15px;
  padding-bottom: 20px !important;
  border-bottom: 1px solid #ccc;
  padding-left: 0px !important;
  padding-right: 0px !important;
}
.process-name {
  font-weight: bold;
}
.process-item,
.scope-item {
  padding: 4px !important;
}
.scope-item {
  padding-left: 8px !important;
  padding-bottom: 0 !important;
}
.process-item:hover,
.scope-item:hover {
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
    color: #bbb;
  }
}
.no-activity.row {
  padding-top: 50px;
  height: calc(100vh - 43px);
}
.placeholder-text {
  text-align: center;
  font-family: sans-serif;
  color: #999;
}

.debugging {
  margin-top: 200px;
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
