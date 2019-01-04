<template>
  <div class="ui internally celled grid" style="min-height: 100vh;">

    <!-- SIDEBAR -->
    <div class="five wide column list-pane-container">
      <div class="title">
        <div v-on:click="help=true" class="ui button help-button">
          Help
        </div>
        <h1>Profile Manager</h1>
      </div>
      <p v-if="op.loading">
        loading...
      </p>
      <div v-else-if="op.error">
        error: {{ op.error }}
      </div>

      <div v-else>
        <div class="list-pane" :style="list_pane_style">
          <div class="ui one column grid container">
            <div v-for="profile in user_profiles" v-bind:key="profile.key" class="column profile-list-container">
              <div v-on:click="selectUserProfile(profile)" class="profile-item">
                <span class="profile-name">{{ profile.Name }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="two ui buttons list-pane-footer">
          <button class="ui button" v-on:click="selectGlobalProfile"><i class="circle icon global-profile-color"></i> Global Profile</button>
          <button class="ui button" v-on:click="selectFallbackProfile"><i class="circle icon fallback-profile-color"></i>Fallback Profile</button>
        </div>
      </div>


    </div>
    <!-- END OF SIDEBAR -->

    <!-- CONTENT SPACE -->
    <div v-if="help" class="eleven wide column container content-pane">
      <Help></Help>
    </div>
    <div v-else-if="selectedProfile != null" class="eleven wide column container content-pane">
      <Profile v-bind:profile="selectedProfile" v-bind:profileLevel="selectedProfileLevel"></Profile>
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
import Help from "./Help.vue";

export default {
  name: "Manager",
  components: {
    Profile,
    Help
  },
  data() {
    return {
      op: this.$api.qsub("query core:profiles/"),
      selectedProfile: null,
      selectedProfileLevel: 0,
      help: false
    };
  },
  computed: {
    user_profiles() {
      var profiles = [];
      var profile_keys = Object.keys(this.op.records).filter(function(key) {
        return key.startsWith("core:profiles/user/");
      });
      for (var i = 0; i < profile_keys.length; i++) {
        profiles.push(this.op.records[profile_keys[i]]);
      }
      return profiles;
    },
    stamp_profiles() {
      var profiles = [];
      var profile_keys = Object.keys(this.op.records).filter(function(key) {
        return key.startsWith("core:profiles/stamp/");
      });
      for (var i = 0; i < profile_keys.length; i++) {
        profiles.push(this.op.records[profile_keys[i]]);
      }
      return profiles;
    },
    global_profile() {
      return this.op.records["core:profiles/special/global"];
    },
    fallback_profile() {
      return this.op.records["core:profiles/special/fallback"];
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
    selectUserProfile(p) {
      this.help = false;
      this.selectedProfile = p;
      this.selectedProfileLevel = 0;
    },
    selectGlobalProfile() {
      this.help = false;
      this.selectedProfile = this.global_profile;
      this.selectedProfileLevel = 1;
    },
    selectFallbackProfile() {
      this.help = false;
      this.selectedProfile = this.fallback_profile;
      this.selectedProfileLevel = 3;
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
  h1 {
    margin: 0 !important;
  }
}
.list-pane {
  height: 100vh;
  overflow-y: scroll;
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
