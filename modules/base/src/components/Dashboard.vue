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
                <span style="color: #FFFFFF80; padding-right: 30px;">Security Level</span>

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
            { 'sl-selected': status && status.SelectedSecurityLevel === 0 }
          ]"
        >
          <i class="rocket icon autopilot-icon" title="Autopilot"></i>
          <span class="sl-name">Autopilot</span>
          <span class="sl-description">Switch automatically based on environment and threats. (coming soon)</span>
        </div>
        <div
          v-on:click="selectSecurityLevel(1)"
          v-bind:class="[
            'dashboard-element sl-item ui very basic inverted segment',
            { 'sl-selected': status && status.SelectedSecurityLevel === 1 }
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
            { 'sl-selected': status && status.SelectedSecurityLevel === 2 }
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
            { 'sl-selected': status && status.SelectedSecurityLevel === 4 }
          ]"
        >
          <img class="sl-icon" src="/assets/icons/level_extreme.svg" title="Extreme" />
          <span class="sl-name">Extreme</span>
          <span class="sl-description">Emergency mode for when you panic.</span>
        </div>
      </div>
    </div>

    <h3>Subsystems</h3>
    <div class="ui grid">
      <div v-for="subsystem in subsystems" class="five wide column" v-bind:key="subsystem.Name">
        <div class="dashboard-element ui very basic inverted segment">
          <span v-if="subsystem.Modules[0].Status === StatusDead" class="ui grey text" style="float: right;">Dead</span>
          <span v-else-if="subsystem.Modules[0].Status === StatusPreparing" class="ui yellow text" style="float: right;"
            >Preparing</span
          >
          <span v-else-if="subsystem.Modules[0].Status === StatusOffline" class="ui grey text" style="float: right;"
            >Offline</span
          >
          <span v-else-if="subsystem.Modules[0].Status === StatusStopping" class="ui yellow text" style="float: right;"
            >Stopping</span
          >
          <span v-else-if="subsystem.Modules[0].Status === StatusStarting" class="ui yellow text" style="float: right;"
            >Starting</span
          >
          <span v-else-if="subsystem.Modules[0].Status === StatusOnline" class="ui green text" style="float: right;"
            >Online</span
          >

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
            <div class="module-msg">
              {{ subsystem.Modules[0].FailureMsg }}
            </div>
          </div>

          {{ subsystem.Description }}

          <br /><br />
          <strong>Modules</strong>
          <br />
          <!--
            test with:
            update core:status/subsystems/zoo|J{"ID":"zoo","Name":"The UI Zoo","Description":"There are weird animals here...","Modules":[{"Name":"zoo","Enabled":true,"Status":5,"FailureStatus":1,"FailureID":"","FailureMsg":"This, obviously, is for testing purposes."},{"Name":"hippo","Enabled":false,"Status":5,"FailureStatus":2,"FailureID":"","FailureMsg":"Water is running low! Seriously, where has all the water gone? Are you nuts? You can't do that to me!"},{"Name":"rhino","Enabled":false,"Status":2,"FailureStatus":0,"FailureID":"","FailureMsg":""},{"Name":"monkey","Enabled":false,"Status":5,"FailureStatus":1,"FailureID":"","FailureMsg":"Need bananas!"},{"Name":"elephant","Enabled":false,"Status":5,"FailureStatus":0,"FailureID":"","FailureMsg":""},{"Name":"zergs","Enabled":false,"Status":4,"FailureStatus":3,"FailureID":"","FailureMsg":"We don't belong here!"},{"Name":"giraffe","Enabled":false,"Status":4,"FailureStatus":0,"FailureID":"","FailureMsg":""},{"Name":"panda","Enabled":false,"Status":1,"FailureStatus":0,"FailureID":"","FailureMsg":""},{"Name":"ant","Enabled":false,"Status":3,"FailureStatus":0,"FailureID":"","FailureMsg":""},{"Name":"bear","Enabled":false,"Status":0,"FailureStatus":0,"FailureID":"","FailureMsg":""}],"FailureStatus":1,"ToggleOptionKey":"filter/enable","ExpertiseLevel":0,"ReleaseLevel":1,"ConfigKeySpace":"config:filter/"}
          -->

          <!-- Error state -->
          <span v-for="dep in subsystem.Modules.slice(1)" v-bind:key="'notice-' + dep.Name">
            <div
              v-if="dep.FailureStatus != FailureNone"
              v-bind:class="['module-item ui inverted secondary segment', moduleStatusColor(dep)]"
            >
              <div v-bind:class="['ui top attached inverted basic label', moduleStatusColor(dep)]">
                <span class="module-name">{{ dep.Name }}</span>
                <span v-if="dep.FailureStatus === FailureError" style="float: right;">Error</span>
                <span v-else-if="dep.FailureStatus === FailureWarning" style="float: right;">Warning</span>
                <span v-else-if="dep.FailureStatus === FailureHint" style="float: right;">Hint</span>
              </div>
              <div class="module-msg">
                {{ dep.FailureMsg }}
              </div>
            </div>
          </span>

          <!-- Not online -->
          <span v-for="dep in subsystem.Modules.slice(1)" v-bind:key="'status-' + dep.Name">
            <div
              v-if="dep.FailureStatus === FailureNone && dep.Status != StatusOnline"
              v-bind:class="['module-item ui inverted basic label', moduleStatusColor(dep)]"
            >
              <span class="module-name">{{ dep.Name }}</span>
              <div v-if="dep.Status === StatusDead" class="detail">Dead</div>
              <div v-else-if="dep.Status === StatusPreparing" class="detail">Preparing</div>
              <div v-else-if="dep.Status === StatusOffline" class="detail">Offline</div>
              <div v-else-if="dep.Status === StatusStopping" class="detail">Stopping</div>
              <div v-else-if="dep.Status === StatusStarting" class="detail">Starting</div>
            </div>
          </span>

          <!-- Online, no error -->
          <span v-for="dep in subsystem.Modules.slice(1)" v-bind:key="'online-' + dep.Name">
            <div
              v-if="dep.Status === StatusOnline && dep.FailureStatus === FailureNone"
              class="module-item ui black inverted basic label"
            >
              <span class="module-name">{{ dep.Name }}</span>
            </div>
          </span>
        </div>
      </div>
    </div>

    <h3>System Control</h3>
    <div class="ui grid">
      <div class="sixteen wide column">
        <div class="dashboard-element ui very basic inverted segment">
          <div class="ui buttons">
            <button class="ui inverted basic red button" v-on:click="control('module/core/trigger/shutdown')">
              Shutdown
            </button>
            <button class="ui inverted basic orange button" v-on:click="control('module/core/trigger/restart')">
              Restart
            </button>
            <button class="ui inverted basic blue button" v-on:click="reloadUI()">Reload UI</button>
            <button class="ui inverted basic blue button" v-on:click="control('module/updates/trigger/trigger update')">
              Download updates
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
    Notifications
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
      FailureNone: 0,
      FailureHint: 1,
      FailureWarning: 2,
      FailureError: 3
    };
  },
  computed: {
    status() {
      return this.$parent.statusDB.records["core:status/status"];
    },
    subsystems() {
      var all = [];
      for (var [key, record] of Object.entries(this.$parent.statusDB.records)) {
        if (key.startsWith("core:status/subsystems/")) {
          all.push(record);
        }
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
        if (!subsystem.Modules[0].Enabled) {
          return false;
        }
      }
      return true;
    }
  },
  methods: {
    selectSecurityLevel(level) {
      this.$api.update("core:status/status", {
        SelectedSecurityLevel: level
      });
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
    reloadUI() {
      this.beforeOnUnload();
      // add an extra second, in case waiting is broken on a client
      setTimeout(function() {
        location.reload();
      }, 1000);
    },
    beforeOnUnload() {
      this.controlOp = this.$api.get("control:module/ui/trigger/reload");
      this.controlOp.wait();
    }
  },
  beforeMount() {
    window.addEventListener("beforeunload", this.beforeOnUnload);
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.dashboard {
  height: 100vh;
  overflow-y: scroll;
  padding: 2em !important;
  background: #1b1c1df2 !important;
}
.dashboard-element {
  border-radius: 5px !important;
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
</style>
