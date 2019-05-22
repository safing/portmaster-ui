<template>
  <div class="ui internally celled grid" style="min-height: 100vh;">

    <!-- SIDEBAR -->
    <div class="five wide column list-pane-container">
      <div class="title">
        <span v-if="unconnectedRecords" style="float: right; padding: 8px;" data-tooltip="# of records that are missing their parent record, ie. are not displayed (check browser console)" data-position="bottom left">
          <i class="yellow exclamation triangle icon"></i>
          {{ unconnectedRecords }}
        </span>
        <span v-if="op.warnings.length" style="float: right; padding: 8px;" data-tooltip="# of records that failed to be delivered or parsed" data-position="bottom left">
          <i class="red exclamation circle icon"></i>
          {{ op.warnings.length }}
        </span>
        <h1>Monitoring</h1>
      </div>
      <p v-if="op.loading">
        loading...
      </p>
      <div v-else-if="op.error">
        error: {{ op.error }}
      </div>

      <div v-else class="list-pane">
        <div v-if="anyActivity" class="ui one column grid container list-pane-container">
          <div v-for="process in tree" v-bind:key="process._key" v-if="process._children && process._children.length > 0" class="column process-list-container">
            <div v-on:click="selectProcess(process)" class="process-item">
              <span class="process-name">{{ process.Name }}</span> ({{ process.Pid }})
              <div class="ui label">
                <i class="stream icon"></i>
                <div class="detail">
                  {{ process._children.length }}
                </div>
              </div>
            </div>

            <div class="ui one column grid container list-pane-container">
              <div v-for="communication in process._children" v-bind:key="communication._key" v-on:click="selectCommunication(communication)" class="column communication-item">
                <div>
                  <Verdict :verdict="communication.Verdict"></Verdict>
                  <span v-if="communication.Domain == 'IH'" class="communication-name">Incoming from Localhost</span>
                  <span v-else-if="communication.Domain == 'IL'" class="communication-name">Incoming from the LAN</span>
                  <span v-else-if="communication.Domain == 'II'" class="communication-name">Incoming from the Internet</span>
                  <span v-else-if="communication.Domain == 'IX'" class="communication-name">Incoming - Invalid</span>
                  <span v-else-if="communication.Domain == 'PH'" class="communication-name">Peers on Localhost</span>
                  <span v-else-if="communication.Domain == 'PL'" class="communication-name">Peers on the LAN</span>
                  <span v-else-if="communication.Domain == 'PI'" class="communication-name">Peers on the Internet</span>
                  <span v-else-if="communication.Domain == 'PX'" class="communication-name">Peers - Invalid</span>
                  <span v-else class="communication-name">{{ communication.Domain }}</span>
                  <div class="ui label">
                    <i class="project diagram icon"></i>
                    <div v-if="communication._children" class="detail">
                      {{ communication._children.length }}
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
            <td v-if="!selectedProcess.FirstCommEstablished && !selectedProcess.LastCommEstablished">no activity</td>
            <td v-else-if="selectedProcess.FirstCommEstablished == selectedProcess.LastCommEstablished">at {{ selectedProcess.FirstCommEstablished|fmt_time }}</td>
            <td v-else>{{ selectedProcess.FirstCommEstablished|fmt_time }} - {{ selectedProcess.LastCommEstablished|fmt_time }}</td>
          </tr>
          <tr>
            <td>UserName</td>
            <td>{{ selectedProcess.UserName }} <span v-if="selectedProcess.UserID">({{ selectedProcess.UserID }})</span></td>
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
            <td>{{ selectedProcess.UserProfileKey }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="selectedProcess._childProcesses">
        <h4>childProcesses:</h4>
        <ChildProcessList v-bind:processes="selectedProcess._childProcesses"></ChildProcessList>
      </div>

    </div>
    <div v-else-if="selected == 2 && !selectedCommunication._deleted" class="eleven wide column container content-pane">
      <h2>{{ selectedCommunication._parent.Name }} ({{ selectedCommunication._parent.Pid }}) >
        <span v-if="selectedCommunication.Domain == 'IH'">Incoming from Localhost</span>
        <span v-else-if="selectedCommunication.Domain == 'IL'">Incoming from the LAN</span>
        <span v-else-if="selectedCommunication.Domain == 'II'">Incoming from the Internet</span>
        <span v-else-if="selectedCommunication.Domain == 'IX'">Incoming - Invalid</span>
        <span v-else-if="selectedCommunication.Domain == 'PH'">Peers on Localhost</span>
        <span v-else-if="selectedCommunication.Domain == 'PL'">Peers on the LAN</span>
        <span v-else-if="selectedCommunication.Domain == 'PI'">Peers on the Internet</span>
        <span v-else-if="selectedCommunication.Domain == 'PX'">Peers - Invalid</span>
        <span v-else>{{ selectedCommunication.Domain }}</span>
      </h2>
      <div class="ui one column grid">
        <div class="column">

          <table class="ui very basic collapsing very compact table">
            <tbody>
              <tr>
                <td>Verdict</td>
                <td><Verdict :verdict="selectedCommunication.Verdict" :reason="selectedCommunication.Reason" :long="true"></Verdict></td>
              </tr>
              <tr>
                <td>Inspecting</td>
                <td v-if="selectedCommunication.Inspect">yes</td><td v-else>no</td>
              </tr>
              <!-- <tr>
                <td>Intel</td>
                <td>{{ selectedCommunication.Intel }}</td>
              </tr> -->
              <tr>
                <td>Active</td>
                <td v-if="!selectedCommunication.FirstLinkEstablished && !selectedCommunication.LastLinkEstablished">no activity</td>
                <td v-else-if="selectedCommunication.FirstLinkEstablished == selectedCommunication.LastLinkEstablished">at {{ selectedCommunication.FirstLinkEstablished|fmt_time }}</td>
                <td v-else>{{ selectedCommunication.FirstLinkEstablished|fmt_time }} - {{ selectedCommunication.LastLinkEstablished|fmt_time }}</td>
              </tr>
            </tbody>
          </table>

        </div>
        <div class="column">
          <div class="ui divider"></div>

          <table v-if="selectedCommunication._children && selectedCommunication._children.length > 0" class="ui celled table">
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
              <tr v-for="link in selectedCommunication._children" v-bind:key="link.key">
                <td><Verdict :verdict="link.Verdict" :reason="link.Reason" :long="true"></Verdict></td>
                <td>{{ link.RemoteAddress }}</td>
                <td>{{ link.Started|fmt_time }}</td>
                <td>{{ link.Ended|fmt_time }}</td>
                <td v-if="link.Inspect">yes</td><td v-else>no</td>
                <td>{{ link.Tunneled }}</td>
                <td>{{ link.VerdictPermanent }}</td>
              </tr>
            </tbody>
          </table>

          <div v-else class="ui grid middle aligned">
            <div class="row">
              <div class="column placeholder-text">
                <h1>no active links</h1>
                <p>
                  Please note that Links may have been attributed to<br>
                  another domain that shares at least one IP address.
                </p>
                <p>
                  Also, no activity could mean that the process only<br>
                  queried DNS and in fact did not open a connection.
                </p>
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
            <h1>select process or communication on the left</h1>
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
      op: this.$api.qsub("query network:tree/").prepFn("", function(key, obj) {
        if (!obj._key) {
          obj._key = key;

          if (obj.VirtualProcess) {
            obj._treeLayer = -1; // -1, 1, 2, 3
            obj._parentKey = `network:tree/${obj.ParentPid}`;
          } else {
            switch (countChar(key, "/")) {
              case 1:
                // process
                obj._treeLayer = 1;
                break;
              case 2:
                // communication
                obj._treeLayer = 2;
                obj._parentKey = key.split("/").slice(0, 2).join("/");
                break;
              case 3:
                // link
                obj._treeLayer = 3;
                obj._parentKey = key.split("/").slice(0, 3).join("/");
                break;
              default:
                console.log(`WARNING: unexpected count of / in key ${key}`);
            }
          }
        }
      }),
      selected: 0,
      selectedProcess: null,
      selectedCommunication: null,
      treeCache: [],
      unconnectedRecords: 0,
      firstRun: true
    };
  },
  computed: {
    anyActivity() {
      for (var i = 0; i < this.tree.length; i++) {
        if (this.tree[i]._children && this.tree[i]._children.length > 0) {
          return true;
        }
      }
      return false;
    },
    tree() {
      console.log("======== updating tree structure");

      var changes = this.op.getChanges();
      // reset if something got deleted
      if (changes.deleted > 0) {
        this.resetTreeCache();
      }
      this.unconnectedRecords = 0;

      // add all missing links
      for (const [key, record] of Object.entries(this.op.records)) {
        if (!record._parent) {
          // console.log(`processing ${key}: layer ${record._treeLayer}`);
          switch (record._treeLayer) {
            case -1:
              // virtual process
              var parentRecord = this.op.records[record._parentKey];
              if (parentRecord) {
                if (!parentRecord._childProcesses) {
                  parentRecord._childProcesses = [];
                }
                parentRecord._childProcesses.push(record);
                record._parent = parentRecord;
              } else {
                console.log(`could not connect to ${record._parentKey}`)
                this.unconnectedRecords++;
              }
              break;
            case 1:
              // process
              this.treeCache.push(record);
              record._parent = true;
              break;
            case 2:
            case 3:
              // communication, link
              var parentRecord = this.op.records[record._parentKey];
              if (parentRecord) {
                if (!parentRecord._children) {
                  parentRecord._children = [];
                }
                parentRecord._children.push(record);
                record._parent = parentRecord;
              } else {
                console.log(`could not connect to ${record._parentKey}`)
                this.unconnectedRecords++;
              }
              break;
          }
        }
      }

      if (this.unconnectedRecords > 0) {
        console.warn(`${this.unconnectedRecords} records could not be connected.`)
      }

      this.sortTreeCache()
      return this.treeCache;
    }
  },
  methods: {
    resetTreeCache() {
      this.treeCache = [];
      for (const [key, record] of Object.entries(this.op.records)) {
        delete record._parent
        delete record._children
        delete record._childProcesses
      }
    },
    sortTreeCache() {
      // order level 1
      this.treeCache.sort(function(a, b) {
        return b.LastCommEstablished - a.LastCommEstablished;
      });

      for (const [key, process] of Object.entries(this.treeCache)) {
        // order level 2
        if (process._children) {
          process._children.sort(function(a, b) {
            return b.LastLinkEstablished - a.LastLinkEstablished;
          });

          for (const [key, communication] of Object.entries(process._children)) {
            // order level 3
            if (communication._children) {
              communication._children.sort(function(a, b) {
                return b.Started - a.Started;
              });
            }
          }
        }

        // order level -1
        if (process._childProcesses) {
          process._childProcesses.sort(function(a, b) {
            return a.Pid - b.Pid;
          });
        }
      }
    },
    selectProcess(p) {
      this.selected = 1;
      this.selectedProcess = p;
    },
    selectCommunication(c) {
      this.selected = 2;
      this.selectedCommunication = c;
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
.communication-item {
  padding: 4px !important;
}
.communication-item {
  padding-left: 8px !important;
  padding-bottom: 0 !important;
}
.process-item:hover,
.communication-item:hover {
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
