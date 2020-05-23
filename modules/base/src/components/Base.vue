<template>
  <div class="main-container">
    <SaveWindowSize />

    <div class="ui basic inverted segment controlbar">
      <!-- sidebar header -->
      <div v-on:click="selectUIModule('_about')" class="ui basic inverted segment mess center aligned">
        <div class="centered">
          <h4 style="margin-bottom: 0;">Portmaster</h4>
          <p v-if="versions" class="ui small text">
            <span class="ui small text">
              v{{ versions.Core.Version }} <span class="ui red text">(pre-alpha)</span>
            </span>
          </p>
          <p v-else>
            <span class="ui small text">
              loading core version...
            </span>
          </p>
          <p v-if="!runningInApp">
            <span class="ui small yellow text" style="line-height: 1em;">
              running in browser<br />
              functionality may be impaired
            </span>
          </p>
        </div>
      </div>

      <!-- top menu -->
      <div class="ui secondary vertical fluid inverted pointing menu" style="">
        <div
          v-for="(uiMod, index) in topMenu"
          v-bind:key="index"
          v-on:click="selectUIModule(uiMod.url)"
          v-bind:class="[{ active: activeModule === uiMod.url }, 'item', 'uiModuleItem']"
        >
          <h4>
            <div v-bind:class="['uiIndicator', { loaded: uiMod.loaded && !uiMod.url.startsWith('_') }]">
              <i class="teal tiny circle middle aligned icon loadedIcon"></i>
              <i v-on:click.stop="killUIModule(uiMod.url)" class="red times icon killIcon"></i>
            </div>
            <i v-bind:class="[uiMod.icon, 'icon', 'moduleIcon']"></i>
            <span class="wide-text">{{ uiMod.name }}</span>
          </h4>
        </div>
      </div>

      <!-- bottom menu -->
      <div class="ui secondary vertical fluid inverted pointing menu bottom-section" style="">
        <div
          v-for="(uiMod, index) in bottomMenu"
          v-bind:key="index"
          v-on:click="selectUIModule(uiMod.url)"
          v-bind:class="[{ active: activeModule === uiMod.url }, 'item', 'uiModuleItem']"
        >
          <h4>
            <div v-bind:class="['uiIndicator', { loaded: uiMod.loaded && !uiMod.url.startsWith('_') }]">
              <i class="teal tiny circle middle aligned icon loadedIcon"></i>
              <i v-on:click.stop="killUIModule(uiMod.url)" class="red times icon killIcon"></i>
            </div>
            <i v-bind:class="[uiMod.icon, 'icon', 'moduleIcon']"></i>
            <span class="wide-text">{{ uiMod.name }}</span>
          </h4>
        </div>
        <!-- connection status -->
        <div>
          <div class="ui divider" style="margin-bottom: 0;"></div>
          <div class="item" style="text-align: center;">
            <span v-if="apiInfo.connected" class="ui center aligned" style="color: #888">
              Connected to Core
            </span>
            <span v-else class="ui red text">
              Not connected to Core!<br />
              Retrying...
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="content-pane">
      <div
        v-for="uiMod in uiModules"
        v-bind:key="uiMod.url"
        v-show="uiMod.url === activeModule"
        class="content-pane-item"
      >
        <Dashboard v-if="uiMod.url === '_dashboard'" />
        <Settings v-if="uiMod.url === '_settings'" />
        <AppSettings v-if="uiMod.url === '_app-settings'" />
        <Support v-if="uiMod.url === '_support'" />
        <About v-if="uiMod.url === '_about'" />
        <iframe v-else-if="uiMod.loaded" v-bind:src="basePath + uiMod.url" />
      </div>
    </div>
  </div>
</template>

<script>
import SaveWindowSize from "./SaveWindowSize.vue";
import Dashboard from "./Dashboard.vue";
import Settings from "./Settings.vue";
import AppSettings from "./AppSettings.vue";
import Support from "./Support.vue";
import About from "./About.vue";

export default {
  name: "Base",
  components: {
    SaveWindowSize,
    Dashboard,
    Settings,
    AppSettings,
    Support,
    About
  },
  props: {
    basePath: String
  },
  data() {
    return {
      statusDB: this.$api.qsub("query core:status/"),
      configDB: this.$api.qsub("query config"),
      activeModule: "_dashboard",
      apiInfo: this.$api.info(),
      uiModules: [
        {
          name: "Dashboard",
          url: "_dashboard",
          icon: "table",
          loaded: true
        },
        {
          name: "Monitor",
          url: "/ui/modules/monitor/",
          icon: "eye",
          loaded: false
        },
        {
          name: "Settings",
          url: "_settings",
          icon: "cog",
          loaded: false
        },
        {
          name: "App Settings",
          url: "_app-settings",
          icon: "user",
          loaded: false
        },
        {
          name: "Support",
          url: "_support",
          icon: "help",
          loaded: false,
          bottom: true
        },
        {
          name: "About",
          url: "_about",
          icon: "info",
          loaded: false,
          bottom: true
        },
        {
          name: "Dev Console",
          url: "/ui/modules/console/",
          icon: "terminal",
          loaded: false,
          bottom: true
        }
      ],
      selectedExpertiseLevel: -1
    };
  },
  computed: {
    versions() {
      return this.statusDB.records["core:status/versions"];
    },
    topMenu() {
      return this.uiModules.filter(value => {
        return !value.bottom;
      });
    },
    bottomMenu() {
      return this.uiModules.filter(value => {
        return value.bottom;
      });
    },
    activeReleaseLevel() {
      // get db record
      var record = this.configDB.records["config:core/releaseLevel"];
      if (!record) {
        return 0; // ReleaseLevelStable
      }

      // get active value
      var value = record.DefaultValue;
      if (record.hasOwnProperty("Value") && record.Value !== null) {
        value = record.Value;
      }

      switch (value) {
        case "stable": // ReleaseLevelNameStable
          return 0; // ReleaseLevelStable
        case "beta": // ReleaseLevelNameBeta
          return 1; // ReleaseLevelBeta
        case "experimental": // ReleaseLevelNameExperimental
          return 2; // ReleaseLevelExperimental
        default:
          return 0; // ReleaseLevelStable
      }
    },
    activeExpertiseLevel() {
      if (this.selectedExpertiseLevel >= 0) {
        return this.selectedExpertiseLevel;
      }

      // get db record
      var record = this.configDB.records["config:core/expertiseLevel"];
      if (!record) {
        return 0; // ExpertiseLevelUser
      }

      // get active value
      var value = record.DefaultValue;
      if (record.hasOwnProperty("Value") && record.Value !== null) {
        value = record.Value;
      }

      switch (value) {
        case "user": // ExpertiseLevelNameUser
          return 0; // ExpertiseLevelUser
        case "expert": // ExpertiseLevelNameExpert
          return 1; // ExpertiseLevelExpert
        case "developer": // ExpertiseLevelNameDeveloper
          return 2; // ReleaseLevelExperimental
        default:
          return 0; // ExpertiseLevelUser
      }
    }
  },
  methods: {
    selectUIModule(url) {
      for (const index in this.uiModules) {
        if (this.uiModules[index].url === url) {
          this.uiModules[index].loaded = true;
          this.activeModule = this.uiModules[index].url;
          return;
        }
      }
      this.selectHome();
    },
    killUIModule(url) {
      for (const index in this.uiModules) {
        if (this.uiModules[index].url === url) {
          this.uiModules[index].loaded = false;
          if (this.activeModule === this.uiModules[index].url) {
            this.selectHome();
          }
          return;
        }
      }
      this.selectHome();
    },
    selectHome() {
      this.uiModules[0].loaded = true;
      this.activeModule = this.uiModules[0].url;
    },
    selectExpertiseLevel(level) {
      this.selectedExpertiseLevel = level;
    },
    runningInApp() {
      return typeof system !== 'undefined' // eslint-disable-line
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.main-container {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.uiModuleItem {
  padding-left: 6px !important;

  :hover {
    cursor: pointer;
  }

  .uiIndicator {
    width: 22px;
    // display: inline-flex;
    // align-items: center;
    display: inline-block;
    text-align: center;

    .loadedIcon {
      display: none;
    }
    .killIcon {
      display: none;
    }
  }

  .uiIndicator.loaded {
    .loadedIcon {
      display: inline-block;
    }
  }

  .uiIndicator.loaded:hover {
    cursor: pointer;

    .loadedIcon {
      display: none;
    }
    .killIcon {
      display: inline-block;
      cursor: pointer;
    }
  }
}

.controlbar {
  width: 195px;
  // transition: 0.5s ease-in-out;
  height: 100vh;
  margin: 0 !important;
  padding: 0 !important;
  overflow: inherit !important;
  overflow-x: show !important;
  position: relative !important;
}
.controlbar .menu {
  border-radius: 0;
}
.controlbar .menu .active {
  border-radius: 0;
}

.bottom-section {
  position: absolute;
  bottom: 0;
}
.active {
  border-color: #2185d0 !important;
  border-right-width: 4px !important;
}
.gate_off {
  -webkit-filter: grayscale(1);
  filter: grayscale(1);
}
.clickable:hover {
  cursor: pointer;
}

.content-pane {
  position: absolute;
  height: 100vh;
  top: 0;
  left: 195px;
  right: 0;
  overflow: hidden;

  .content-pane-item {
    position: relative;
    height: 100%;
    width: 100%;
  }
}
iframe {
  position: relative;
  height: 100%;
  width: 100%;
  border: none;
  margin: 0;
  padding: 0;
}
</style>
