<template>
  <div class="ui internally celled grid" style="min-height: 100vh;">

    <!-- SIDEBAR -->
    <div class="five wide column list-pane-container">
      <div class="title">
        <div v-on:click="showHelp=!showHelp" v-bind:class="['ui button help-button', {'blue': showHelp}]">
          Help
        </div>
        <h1>Profile Manager</h1>
      </div>
      <hr style="margin: 0;">
      <p v-if="op.loading">
        loading...
      </p>
      <div v-else-if="op.error">
        error: {{ op.error }}
      </div>

      <div v-else>
        <!-- <div class="list-pane" :style="list_pane_style">
          <div class="ui one column grid container">
            <div v-for="profile in userProfiles" v-bind:key="profile.dbKey" class="column profile-list-container">
              <div v-on:click="selectUserProfile(profile.dbKey)" class="profile-item">
                <span class="profile-name">{{ profile.Name }}</span>
              </div>
            </div>
          </div>
        </div> -->

        <div class="ui relaxed divided selection list list-pane" :style="list_pane_style">
          <div v-for="profile in userProfiles" v-bind:key="profile.dbKey" v-on:click="selectUserProfile(profile.dbKey)" class="item">
            <i class="large question circle outline middle aligned icon"></i>
            <div class="content">
              <div class="header">{{ profile.Name }}</div>
              <div class="description">Approx. last used: {{ profile.ApproxLastUsed|fmt_datetime }}</div>
            </div>
          </div>
        </div>

        <div class="two ui buttons list-pane-footer">
          <button class="ui button" v-on:click="selectGlobalProfile()"><i class="circle icon global-profile-color"></i> Global Profile</button>
          <button class="ui button" v-on:click="selectFallbackProfile()"><i class="circle icon fallback-profile-color"></i>Fallback Profile</button>
        </div>
      </div>


    </div>
    <!-- END OF SIDEBAR -->

    <!-- CONTENT SPACE -->
    <div v-if="selectedProfileKey != null" class="eleven wide column container content-pane">
      <Profile v-bind:key="selectedProfileKey" v-bind:profileKey="selectedProfileKey" v-bind:profileLevel="selectedProfileLevel" v-bind:editable="true" v-bind:showHelp="showHelp"></Profile>
    </div>
    <!-- END OF CONTENT SPACE -->

    <div v-else class="eleven wide column content-placeholder">
      <div class="ui grid middle aligned">
        <div class="row">
          <div class="column">
            <h1>select profile on the left</h1>
          </div>
        </div>
      </div>
    </div>

  </div>

</template>

<script>
import Profile from "./Profile.vue";

export default {
  name: "Manager",
  components: {
    Profile
  },
  data() {
    return {
      op: this.$api.qsub("query core:profiles/"),
      selectedProfileKey: null,
      selectedProfileLevel: 0,
      showHelp: false,
      globalProfileKey: "core:profiles/special/global",
      fallbackProfileKey: "core:profiles/special/fallback"
    };
  },
  computed: {
    userProfiles() {
      var profiles = [];
      var profile_keys = Object.keys(this.op.records).filter(function(key) {
        return key.startsWith("core:profiles/user/");
      });
      for (var i = 0; i < profile_keys.length; i++) {
        var p = this.op.records[profile_keys[i]]
        p.dbKey = profile_keys[i]
        p.profileLevel = 0
        profiles.push(p);
      }
      return profiles;
    },
    stampProfiles() {
      var profiles = [];
      var profile_keys = Object.keys(this.op.records).filter(function(key) {
        return key.startsWith("core:profiles/stamp/");
      });
      for (var i = 0; i < profile_keys.length; i++) {
        var p = this.op.records[profile_keys[i]]
        p.dbKey = profile_keys[i]
        p.profileLevel = 2
        profiles.push(p);
      }
      return profiles;
    },
    globalProfile() {
      var p = this.op.records[this.globalProfileKey]
      p.dbKey = this.globalProfileKey
      p.profileLevel = 1
      return p
    },
    fallbackProfile() {
      var p = this.op.records[this.fallbackProfileKey]
      p.dbKey = this.globalProfileKey
      p.profileLevel = 3
      return p
    },
    list_pane_style() {
      var h =
        window.innerHeight ||
        document.documentElement.clientHeight ||
        document.body.clientHeight;
      return "height: " + (h - 50 - 40) + "px;";
    }
  },
  methods: {
    selectUserProfile(key) {
      this.help = false;
      this.selectedProfileKey = key;
      this.selectedProfileLevel = 0;
    },
    selectGlobalProfile() {
      this.help = false;
      this.selectedProfileKey = this.globalProfileKey;
      this.selectedProfileLevel = 1;
    },
    selectFallbackProfile() {
      this.help = false;
      this.selectedProfileKey = this.fallbackProfileKey;
      this.selectedProfileLevel = 3;
    }
  },
  filters: {
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
  margin: 6px;
  height: 36px;
  h1 {
    margin: 0 !important;
  }
}
.list-pane {
  margin: 0 !important;
  height: 100vh;
  overflow-y: scroll;
  .item {
    padding: 3px !important;
    padding-left: 10px !important;
  }
}
.list-pane-footer {
  height: 40px;
  .button {
    border-radius: 0 !important;
  }
}

.profile-list-container {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #ccc;
}
.profile-name {
  font-weight: bold;
}
.profile-item {
  padding-top: 5px;
  padding-bottom: 5px;
}
.profile-item:hover,
.connection-item:hover {
  background-color: #eee;
  cursor: pointer;
}
.content-pane {
  padding: 0 !important;
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

.help-button {
  float: right;
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

<style lang="scss">
.user-profile-color,
.profile-level-0-color {
  color: green;
}
.global-profile-color,
.profile-level-1-color {
  color: blue;
}
.stamp-profile-color,
.profile-level-2-color {
  color: purple;
}
.fallback-profile-color,
.profile-level-3-color {
  color: gray;
}
</style>
