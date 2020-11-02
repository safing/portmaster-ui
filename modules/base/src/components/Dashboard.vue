<template>
  <div class="dashboard ui very basic inverted segment">
    <div class="ui grid">
      <div class="nine wide column">
        <h3>Status</h3>

        <div class="dashboard-element ui very basic inverted segment" style="padding: 20px;">
          <div class="ui grid">
            <div class="twelve wide column">
              <span v-if="worstFailureStatus === FailureError" class="ui red huge text" style="line-height: 1em;">
                SYSTEM<br />FAILURE
              </span>
              <span
                v-else-if="worstFailureStatus === FailureWarning"
                class="ui yellow huge text"
                style="line-height: 1em;"
              >
                SYSTEM<br />ALERT
              </span>
              <span v-else class="ui blue huge text" style="line-height: 1em;"> YOU ARE<br />PROTECTED </span>
              <div v-if="worstFailureStatus === FailureHint" style="margin-top: 20px;">
                <span class="ui teal large text">
                  <i class="teal info circle icon"></i>
                  Hint available.
                </span>
              </div>

              <p style="padding-top: 20px;">
                <span style="color: #888; padding-right: 30px;">Security Level</span>

                <span v-if="status && status.ActiveSecurityLevel === 1">
                  <img class="sl-icon" src="/assets/icons/level_normal.svg" title="Normal" />
                  <span>Normal</span>
                </span>
                <span v-else-if="status && status.ActiveSecurityLevel === 2">
                  <img class="sl-icon" src="/assets/icons/level_high.svg" title="High" />
                  <span>High</span>
                </span>
                <span v-else-if="status && status.ActiveSecurityLevel === 4">
                  <img class="sl-icon" src="/assets/icons/level_extreme.svg" title="Extreme" />
                  <span>Extreme</span>
                </span>
                <span v-else>loading...</span>
              </p>

              <p v-if="!allSubsystemsEnabled" style="opacity: 0.3;">
                <i class="yellow exclamation triangle icon"></i> Some subsystems are disabled.
              </p>
            </div>

            <div class="four wide column" style="padding: 50px;">
              <i v-if="worstFailureStatus === FailureError" class="red huge times circle icon"></i>
              <i v-else-if="worstFailureStatus === FailureWarning" class="yellow huge warning circle icon"></i>
              <i v-else class="blue huge check circle icon"></i>
            </div>
          </div>
        </div>

        <Notifications />
      </div>
      <div class="seven wide column">
        <h3>Security Level</h3>

        <div
          v-on:click="selectSecurityLevel(0)"
          v-bind:class="[
            'dashboard-element sl-item ui very basic inverted segment',
            { 'sl-selected': status && status.SelectedSecurityLevel === 0 },
          ]"
        >
          <i class="rocket icon autopilot-icon" title="Autopilot"></i>
          <span class="sl-name">Autopilot</span>
          <span class="sl-description">Switch automatically based on environment and threats. (In development)</span>
        </div>
        <div
          v-on:click="selectSecurityLevel(1)"
          v-bind:class="[
            'dashboard-element sl-item ui very basic inverted segment',
            { 'sl-selected': status && status.SelectedSecurityLevel === 1 },
          ]"
        >
          <img class="sl-icon" src="/assets/icons/level_normal.svg" title="Normal" />
          <span class="sl-name">Normal</span>
          <span class="sl-description">For everyday use in trusted environments.</span>
        </div>
        <div
          v-on:click="selectSecurityLevel(2)"
          v-bind:class="[
            'dashboard-element sl-item ui very basic inverted segment',
            { 'sl-selected': status && status.SelectedSecurityLevel === 2 },
          ]"
        >
          <img class="sl-icon" src="/assets/icons/level_high.svg" title="High" />
          <span class="sl-name">High</span>
          <span class="sl-description">For untrusted environments, such as public WiFi networks.</span>
        </div>
        <div
          v-on:click="selectSecurityLevel(4)"
          v-bind:class="[
            'dashboard-element sl-item ui very basic inverted segment',
            { 'sl-selected': status && status.SelectedSecurityLevel === 4 },
          ]"
        >
          <img class="sl-icon" src="/assets/icons/level_extreme.svg" title="Extreme" />
          <span class="sl-name">Extreme</span>
          <span class="sl-description">Emergency mode for when you panic.</span>
        </div>
      </div>
    </div>

    <div v-if="$parent.versions && !$parent.versions.Core.Version.startsWith('0.5.')" class="ui raised center aligned green inverted padded segment">
      <h3>A new version of the app is available! 🎉</h3>
      <h4>Please close the app and reopen it.</h4>
      <p>
        This version of the UI is not compatible to the new Portmaster service.<br>
        If you are still seeing this after restarting the app, please wait a while, the new UI might still be downloading.
      </p>
    </div>

    <h3>
      Modules
      <span v-if="$parent.activeExpertiseLevel > 1" class="ui small grey text"> Subsystems</span>
    </h3>

    <div class="ui grid">
      <div class="doubling four column row">
        <div v-for="subsystem in subsystems" class="column" v-bind:key="subsystem.Name">
          <div
            v-bind:class="['dashboard-element ui very basic inverted segment', { 'subsystem-page': subsystem.pageURL }]"
            v-on:click="selectUIModule(subsystem.pageURL)"
          >
            <span v-if="subsystem.Modules[0].Status === StatusSoon" class="ui grey text" style="float: right;">
              Coming in July
            </span>
            <span v-else v-bind:class="['ui text', moduleStatusColor(subsystem.Modules[0])]" style="float: right;">
              {{ moduleStatusName(subsystem.Modules[0]) }}
            </span>

            <h4 style="margin-top: 0;">
              {{ subsystem.Name }}
            </h4>

            <div
              v-if="subsystem.Modules[0].FailureStatus != FailureNone"
              v-bind:class="['module-item ui inverted secondary segment', moduleStatusColor(subsystem.Modules[0])]"
            >
              <div v-bind:class="['ui top attached inverted basic label', moduleStatusColor(subsystem.Modules[0])]">
                <span v-if="subsystem.Modules[0].FailureStatus === FailureError">Error</span>
                <span v-else-if="subsystem.Modules[0].FailureStatus === FailureWarning">Warning</span>
                <span v-else-if="subsystem.Modules[0].FailureStatus === FailureHint">Hint</span>
              </div>
              <div class="module-msg">{{ subsystem.Modules[0].FailureMsg }}</div>
            </div>

            <span>
              {{ subsystem.Description }}
            </span>

            <span v-if="subsystem.FailureStatus > 0 || $parent.activeExpertiseLevel > 0">
              <br /><br />
              <strong>Components</strong>
              <span v-if="$parent.activeExpertiseLevel > 1" class="ui small grey text"> Modules</span>
              <br />

              <!--
                test with:
                update core:status/subsystems/zoo|J{"ID":"zoo","Name":"The UI Zoo","Description":"There are weird animals here...","Modules":[{"Name":"zoo","Enabled":true,"Status":5,"FailureStatus":1,"FailureID":"","FailureMsg":"This, obviously, is for testing purposes."},{"Name":"hippo","Enabled":true,"Status":5,"FailureStatus":2,"FailureID":"","FailureMsg":"Water is running low! Seriously, where has all the water gone? Are you nuts? You can't do that to me!"},{"Name":"rhino","Enabled":true,"Status":2,"FailureStatus":0,"FailureID":"","FailureMsg":""},{"Name":"monkey","Enabled":true,"Status":5,"FailureStatus":1,"FailureID":"","FailureMsg":"Need bananas!"},{"Name":"elephant","Enabled":true,"Status":5,"FailureStatus":0,"FailureID":"","FailureMsg":""},{"Name":"zergs","Enabled":true,"Status":4,"FailureStatus":3,"FailureID":"","FailureMsg":"We don't belong here!"},{"Name":"giraffe","Enabled":true,"Status":4,"FailureStatus":0,"FailureID":"","FailureMsg":""},{"Name":"panda","Enabled":true,"Status":1,"FailureStatus":0,"FailureID":"","FailureMsg":""},{"Name":"ant","Enabled":true,"Status":3,"FailureStatus":0,"FailureID":"","FailureMsg":""},{"Name":"bear","Enabled":true,"Status":0,"FailureStatus":0,"FailureID":"","FailureMsg":""},{"Name":"cthulhu","Enabled":false,"Status":4,"FailureStatus":0,"FailureID":"","FailureMsg":""},{"Name":"leviathan","Enabled":false,"Status":2,"FailureStatus":0,"FailureID":"","FailureMsg":""}],"FailureStatus":1,"ToggleOptionKey":"filter/enable","ExpertiseLevel":0,"ReleaseLevel":1,"ConfigKeySpace":"config:filter/"}

                remove after testing:
                delete core:status/subsystems/zoo
              -->

              <!-- Error state -->
              <span v-for="dep in subsystem.Modules.slice(1)" v-bind:key="'notice-' + dep.Name">
                <div
                  v-if="moduleStatusOrder(dep) === 1"
                  v-bind:class="['module-item ui inverted secondary segment', moduleStatusColor(dep)]"
                >
                  <div v-bind:class="['ui top attached inverted basic label', moduleStatusColor(dep)]">
                    <span class="module-name">{{ dep.Name }}</span>
                    <span v-if="dep.FailureStatus === FailureError" style="float: right;">Error</span>
                    <span v-else-if="dep.FailureStatus === FailureWarning" style="float: right;">Warning</span>
                    <span v-else-if="dep.FailureStatus === FailureHint" style="float: right;">Hint</span>
                  </div>
                  <div class="module-msg">{{ dep.FailureMsg }}</div>
                </div>
              </span>

              <!-- Not online -->
              <span v-for="dep in subsystem.Modules.slice(1)" v-bind:key="'status-' + dep.Name">
                <div
                  v-if="moduleStatusOrder(dep) === 2"
                  v-bind:class="['module-item ui inverted basic label', moduleStatusColor(dep)]"
                >
                  <span class="module-name">{{ dep.Name }}</span>
                  <div class="detail">{{ moduleStatusName(dep) }}</div>
                </div>
              </span>

              <!-- Online, no error -->
              <span v-for="dep in subsystem.Modules.slice(1)" v-bind:key="'online-' + dep.Name">
                <div v-if="moduleStatusOrder(dep) === 3" class="module-item ui black inverted basic label">
                  <span class="module-name">{{ dep.Name }}</span>
                </div>
              </span>
            </span>
          </div>

          <a v-if="subsystem.ID === 'spn'" href="https://account.safing.io/pricing">
            <div class="dashboard-element support-portmaster ui very basic inverted segment">
              <div class="text">Support the<br />Portmaster</div>
              <div class="button">
                Pre-order SPN
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>

    <h3>Portmaster Controls</h3>
    <div class="ui grid">
      <div class="sixteen wide column">
        <div class="dashboard-element ui very basic inverted segment">
          <div class="ui buttons">
            <button class="ui inverted basic red button" v-on:click="shutdown()">
              Shutdown
            </button>
            <button class="ui inverted basic orange button" v-on:click="restart()">
              Restart
            </button>
            <button class="ui inverted basic blue button" v-on:click="openDataDir()">
              Open Data Directory
            </button>
            <button class="ui inverted basic blue button" v-on:click="reloadUI()">Reload UI</button>
            <button class="ui inverted basic blue button" v-on:click="control('module/updates/trigger/trigger update')">
              Download updates
            </button>
            <button class="ui inverted basic blue button" v-on:click="control('module/resolver/trigger/clear name cache')">
              Clear DNS Cache
            </button>
          </div>
          <span v-if="controlOp" style="padding-left: 20px;">
            <span v-if="controlOp.loading">loading...</span>
            <span v-else-if="controlOp.success">
              <span v-if="controlOp.record.Success">
                <i class="green check circle icon"></i> Success
                <span v-if="controlOp.record.Message">: {{ controlOp.record.Message }}</span>
              </span>
              <span v-else> <i class="red times circle icon"></i> Control Error: {{ controlOp.record.Message }} </span>
            </span>
            <span v-else> <i class="red times circle icon"></i> Communication Error: {{ controlOp.error }} </span>
          </span>
        </div>
      </div>
    </div>

    <div class="coming-soon ui grid middle aligned">
      <div class="sixteen wide column">
        <h1>Work in Progress</h1>
        <h2>Some ducking cool stuff is in the works here...</h2>
      </div>
    </div>
  </div>
</template>

<script>
import Notifications from "./Notifications.vue";

export default {
  name: "Dashboard",
  components: {
    Notifications,
  },
  data() {
    return {
      controlOp: null,
      StatusDead: 0, // not prepared, not started
      StatusPreparing: 1,
      StatusOffline: 2, // prepared, not started
      StatusStopping: 3,
      StatusStarting: 4,
      StatusOnline: 5, // online and running
      StatusSoon: 6, // UI only status
      FailureNone: 0,
      FailureHint: 1,
      FailureWarning: 2,
      FailureError: 3,
      SubsystemTemplates: {
        "core:status/subsystems/spn": {
          pageURL: "_spn",
        },
      },
    };
  },
  computed: {
    status() {
      return this.$parent.statusDB.records["core:status/status"];
    },
    subsystems() {
      let all = [];
      let foundSPN = false; // TODO: remove when SPN is released
      for (var [key, record] of Object.entries(this.$parent.statusDB.records)) {
        if (key.startsWith("core:status/subsystems/")) {
          // apply template
          let template = this.SubsystemTemplates[key];
          if (template) {
            Object.assign(record, template);
          }
          // add to subsystems
          all.push(record);
          // check if we already have the SPN module - TODO: remove when SPN is released
          if (key === "core:status/subsystems/spn") {
            foundSPN = true;
          }
        }
      }
      // fake SPN module - TODO: remove when SPN is released
      if (!foundSPN) {
        // fake subsystem
        let record = {
          ID: "spn",
          Name: "SPN",
          Description: "Safing Privacy Network",
          Modules: [
            {
              Name: "spn",
              Enabled: false,
              Status: this.StatusSoon,
              FailureStatus: 0,
              FailureID: "",
              FailureMsg: "",
            },
          ],
          FailureStatus: 0,
          ToggleOptionKey: "",
          ExpertiseLevel: 0,
          ReleaseLevel: 0,
          ConfigKeySpace: "config:spn/",
        };
        // apply template
        let template = this.SubsystemTemplates["core:status/subsystems/spn"];
        if (template) {
          Object.assign(record, template);
        }
        // add to subsystems
        all.push(record);
      }
      return all;
    },
    worstFailureStatus() {
      var worstStatus = 0;
      for (var subsystem of this.subsystems) {
        if (subsystem.FailureStatus > worstStatus) {
          worstStatus = subsystem.FailureStatus;
        }
      }
      return worstStatus;
    },
    allSubsystemsEnabled() {
      for (var subsystem of this.subsystems) {
        // TODO: remove SPN exception when SPN reaches beta/stable
        if (subsystem.ID !== "spn" && !subsystem.Modules[0].Enabled) {
          return false;
        }
      }
      return true;
    },
  },
  methods: {
    selectSecurityLevel(level) {
      this.$api.update("core:status/status", {
        SelectedSecurityLevel: level,
      });
    },
    moduleStatusOrder(moduleStatus) {
      // Failing
      if (moduleStatus.FailureStatus !== this.FailureNone) {
        return 1;
      }
      // Unusual Status
      if (
        (moduleStatus.Enabled && moduleStatus.Status !== this.StatusOnline) ||
        (!moduleStatus.Enabled && moduleStatus.Status !== this.StatusOffline)
      ) {
        return 2;
      }
      // Usual Status
      return 3;
    },
    moduleStatusName(moduleStatus) {
      // Define status names
      let statusName = "";
      let statusTechnical = "";
      switch (moduleStatus.Status) {
        case this.StatusDead:
          statusName = "Waiting";
          statusTechnical = "Dead";
          break;
        case this.StatusPreparing:
          statusName = "Preparing";
          break;
        case this.StatusOffline:
          statusName = "Waiting";
          statusTechnical = "Offline";
          break;
        case this.StatusStopping:
          statusName = "Stopping";
          break;
        case this.StatusStarting:
          statusName = "Starting";
          break;
        case this.StatusOnline:
          statusName = "Active";
          // This would be correct, but is awful in terms of UX:
          // statusTechnical = "Online";
          break;
      }

      // Enabled
      if (moduleStatus.Enabled) {
        if (this.$parent.activeExpertiseLevel > 0 && statusTechnical !== "") {
          return `${statusName} (</> ${statusTechnical})`;
        } else {
          return statusName;
        }
      }

      // Disabled
      if (moduleStatus.Status === this.StatusOffline) {
        // Desired state for disabled module
        if (this.$parent.activeExpertiseLevel > 0) {
          return `Disabled (${statusTechnical})`;
        } else {
          return "Disabled";
        }
      } else {
        // Undesired state for disabled module
        if (this.$parent.activeExpertiseLevel > 0 && statusTechnical !== "") {
          return `Disabled (${statusName} </> ${statusTechnical})`;
        } else {
          return `Disabled (${statusName})`;
        }
      }
    },
    moduleStatusColor(moduleStatus) {
      switch (moduleStatus.FailureStatus) {
        case this.FailureError:
          return "red";
        case this.FailureWarning:
          return "yellow";
        case this.FailureHint:
          return "teal";
        default:
          switch (moduleStatus.Status) {
            case this.StatusDead:
              return "yellow";
            case this.StatusPreparing:
              return "teal";
            case this.StatusOffline:
              return "grey";
            case this.StatusStopping:
              return "yellow";
            case this.StatusStarting:
              return "teal";
            case this.StatusOnline:
              return "green";
          }
      }
    },
    control(value) {
      this.controlOp = this.$api.get("control:" + value);
    },
    shutdown() {
      if (
        confirm(
          "Are you sure you want to shutdown the Portmaster? You will have to reboot your device to start it again!"
        )
      ) {
        this.control("module/core/trigger/shutdown");
      }
    },
    restart() {
      this.control("module/core/trigger/restart");
      setTimeout(function () {
        location.reload();
      }, 1000);
    },
    openDataDir() {
      if (typeof system !== 'undefined') { // eslint-disable-line
        system.openDataDir(); // eslint-disable-line
      } else {
        console.warn("cannot open data dir, running in browser");
      }
    },
    reloadUI() {
      this.beforeOnUnload();
      // add an extra second, in case waiting is broken on a client
      setTimeout(function () {
        location.reload();
      }, 1000);
    },
    beforeOnUnload() {
      this.controlOp = this.$api.get("control:module/ui/trigger/reload");
      this.controlOp.wait();
    },
    selectUIModule(url) {
      this.$parent.selectUIModule(url);
    },
  },
  beforeMount() {
    window.addEventListener("beforeunload", this.beforeOnUnload);
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.dashboard {
  height: 100vh;
  overflow-y: scroll;
  padding: 2em !important;
  background: #242526 !important;
}
.dashboard-element {
  border-radius: 5px !important;
  &.subsystem-page {
    cursor: pointer;
  }
}

.autopilot-icon {
  margin-right: 15px;
}
.sl-item {
  cursor: pointer;
}
.sl-icon {
  height: 20px;
  margin-bottom: -5px;
  margin-right: 13px;
}
.sl-name {
  font-weight: bold;
  display: inline-block;
  width: 90px;
}
.sl-description {
  display: inline-block;
  margin-top: -20px;
  margin-left: 130px;
}
.sl-selected {
  -webkit-box-shadow: 0px 0px 5px 1px rgba(0, 120, 212, 1) !important;
  -moz-box-shadow: 0px 0px 5px 1px rgba(0, 120, 212, 1) !important;
  box-shadow: 0px 0px 5px 1px rgba(0, 120, 212, 1) !important;
}

.module-item {
  margin: 1px !important;
  .module-msg {
    margin-top: 28px;
    color: #000;
    white-space: pre-wrap; // respect \n
  }
}
.module-item.segment {
  margin-top: 5px !important;
  margin-bottom: 10px !important;
}

.coming-soon {
  height: 300px;
  width: 100%;
  .grid {
    position: relative;
    height: 100%;
  }
  h1,
  h2 {
    text-align: center;
    color: #111;
  }
}

.support-portmaster {
  margin-top: -7px !important;
  background-image: url("/assets/img/plants1-br.png") !important;
  background-position: bottom right !important;
  background-repeat: no-repeat !important;
  background-size: 40% !important;

  .text {
    margin: 10px;
    display: inline-block;
    font-family: Roboto;
    font-weight: 800;
  }

  .button {
    margin: 10px;
    font-family: Roboto;
    color: #fff;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    background-color: #6188ff;
    border-radius: 10rem;
    padding: 0.42rem 2.5rem 0.42rem 2.5rem;
    display: inline-block;
    align-items: center;
    transition: all 0.1s ease-in-out;

    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    .icon {
      padding-right: 0.75rem;
      font-size: 1.5rem;
    }

    .wiggle {
      animation: wiggle 0.6s infinite alternate;
    }

    @keyframes wiggle {
      0% {
        transform: rotate(4deg);
      }
      100% {
        transform: rotate(10deg);
      }
    }
  }
}
</style>
