<template>
  <div class="ui internally celled grid" style="min-height: 100vh;">
    <!-- SIDEBAR -->
    <div class="three wide column list-pane-container">
      <div class="title">
        <h1>App Settings</h1>
      </div>
      <p v-if="profileDB.loading">
        loading...
      </p>
      <div v-else-if="profileDB.error">error: {{ profileDB.error }}</div>

      <div v-else class="list-pane">
        <div class="ui relaxed divided selection list">
          <div
            v-for="profile in profiles"
            v-bind:key="profile.dbKey"
            v-on:click="selectProfile(profile.dbKey)"
            v-bind:class="[{ active: selectedProfileKey == profile.dbKey }, 'item']"
          >
            <i class="large question circle outline middle aligned icon"></i>
            <div class="content">
              <div class="header">{{ profile.Name }}</div>
              <div class="description">
                Approx. last used:<br />
                {{ profile.ApproxLastUsed | fmtDatetime }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- END OF SIDEBAR -->

    <!-- CONTENT SPACE -->
    <div v-if="selectedProfileKey" class="thirteen wide column container content-pane">
      <h2>
        {{ selectedProfile.Name }}
      </h2>
      <table class="ui celled table">
        <tbody>
          <tr>
            <td>ID</td>
            <td>{{ selectedProfile.ID }}</td>
          </tr>
          <tr>
            <td>Source</td>
            <td>{{ selectedProfile.Source }}</td>
          </tr>
          <tr>
            <td>Name</td>
            <td>{{ selectedProfile.Name }}</td>
          </tr>
          <tr>
            <td>Linked Path</td>
            <td>{{ selectedProfile.LinkedPath }}</td>
          </tr>
          <tr>
            <td>ApproxLastUsed</td>
            <td>{{ selectedProfile.ApproxLastUsed | fmtDatetime }}</td>
          </tr>
          <tr>
            <td>Created</td>
            <td>{{ selectedProfile.Created | fmtDatetime }}</td>
          </tr>
        </tbody>
      </table>

      <div class="ui segment">
        <OptionsView
          :editColumnName="'App Setting'"
          :defaultColumnName="'Global Setting'"
          :configLayer="selectedProfile.Config"
          :configLayerID="selectedProfile.ID"
          :configOptions="configOptions"
          :activeReleaseLevel="activeReleaseLevel"
          :activeExpertiseLevel="activeExpertiseLevel"
        />
      </div>

      <div class="debugging">
        <h3>Debugging <small>...left here intentionally, for now.</small></h3>
        <pre>{{ selectedProfile | fmtObject }}</pre>
      </div>
    </div>
    <!-- END OF CONTENT SPACE -->

    <div v-else class="thirteen wide column content-placeholder">
      <div class="ui grid middle aligned">
        <div class="row">
          <div class="column">
            <h1>select app on the left</h1>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import OptionsView from "./options/OptionsView.vue";

export default {
  name: "AppSettings",
  components: {
    OptionsView,
  },
  data() {
    return {
      profileDB: this.$api.qsub("query core:profiles/").prepFn("", function (key, obj) {
        obj.dbKey = key;
      }),
      selectedProfileKey: null,
    };
  },
  computed: {
    profiles() {
      var all = [];
      // collect into array
      for (var profile of Object.values(this.profileDB.records)) {
        all.push(profile);
      }
      // sort
      all.sort(function (a, b) {
        return b.ApproxLastUsed - a.ApproxLastUsed;
      });
      return all;
    },
    perAppGlobalConfig() {
      var globalProfile = this.profileDB.records["core:profiles/special/global-config"];
      var perApp = {};
      this.flattenConfigObject(perApp, globalProfile.Config);
      return perApp;
    },
    configOptions() {
      var appOptions = {};
      for (var [key, option] of Object.entries(this.$parent.configDB.records)) {
        if (this.perAppGlobalConfig[option.Key] !== undefined) {
          appOptions[key] = option;
        }
      }
      return appOptions;
    },
    activeReleaseLevel() {
      return this.$parent.activeReleaseLevel;
    },
    activeExpertiseLevel() {
      return this.$parent.activeExpertiseLevel;
    },
    selectedProfile() {
      return this.profileDB.records[this.selectedProfileKey];
    },
  },
  methods: {
    selectProfile(key) {
      this.selectedProfileKey = key;
    },
    setConfig(key, value) {
      // console.log("setting profile " + key + " to " + value); // eslint-disable-line
      // add to config
      if (!this.selectedProfile.Config) {
        this.selectedProfile.Config = {};
      }
      this.addToConfig(key, value);
      // console.log("new profile config:"); // eslint-disable-line
      // console.log(this.selectedProfile.Config); // eslint-disable-line
      // send to Portmaster
      return this.$api.update(this.selectedProfile.dbKey, this.selectedProfile);
    },
    addToConfig(key, value) {
      // create root object if not exists
      if (!this.selectedProfile.Config) {
        this.selectedProfile.Config = {};
      }
      // find child object
      var path = key.split("/");
      var config = this.selectedProfile.Config;
      for (var i = 0; i < path.length - 1; i++) {
        var pathElement = path[i];
        if (!config[pathElement]) {
          config[pathElement] = {};
        }
        config = config[pathElement];
      }
      // set to last element
      if (value) {
        config[path[path.length - 1]] = value;
      } else {
        delete config[path[path.length - 1]];
      }
    },
    selectExpertiseLevel(level) {
      this.$parent.selectExpertiseLevel(level);
    },
    flattenConfigObject(rootMap, subMap, subKey) {
      for (const [key, entry] of Object.entries(subMap)) {
        // get next level key
        var subbedKey = key;
        if (subKey) {
          subbedKey = subKey + "/" + key;
        }
        // check for next subMap
        if (entry.constructor === Object) {
          this.flattenConfigObject(rootMap, entry, subbedKey);
        } else {
          rootMap[subbedKey] = entry;
        }
      }
    },
  },
  filters: {
    fmtDatetime(value) {
      if (value == 0) {
        return "Never";
      }

      var date = new Date(value * 1000);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    },
    fmtObject(value) {
      return JSON.stringify(value, null, "    ");
    },
  },
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

.profile-list-container {
  margin-top: 15px;
  padding-bottom: 20px !important;
  border-bottom: 1px solid #ccc;
  padding-left: 0px !important;
  padding-right: 0px !important;
}
.profile-name {
  font-weight: bold;
}
.profile-item {
  padding: 4px !important;
}
.profile-item:hover {
  background-color: #eee;
  cursor: pointer;
}
.content-pane {
  padding: 25px !important;
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
