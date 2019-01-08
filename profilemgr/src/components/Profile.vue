<template>
  <div v-bind:class="{'edit-glow': editing}">
    <div v-if="editing" class="edit-info">
      unsaved changes
    </div>

    <div class="profile-content">

      <div class="ui center aligned basic segment">
        <div class="ui large breadcrumb">
          <i class="circle icon user-profile-color"></i><div v-bind:class="[{'active': profileLevel == c.UserProfileLevel}, 'section']">User Profile</div>
          <i class="right chevron icon divider"></i>
          <i class="circle icon global-profile-color"></i><div v-bind:class="[{'active': profileLevel == c.GlobalProfileLevel}, 'section']">Global Profile</div>
          <i class="right chevron icon divider"></i>
          <i class="circle icon stamp-profile-color"></i><div v-bind:class="[{'active': profileLevel == c.StampProfileLevel}, 'section']">Stamp Profile</div>
          <i class="right chevron icon divider"></i>
          <i class="circle icon fallback-profile-color"></i><div v-bind:class="[{'active': profileLevel == c.FallbackProfileLevel}, 'section']">Fallback Profile</div>
        </div>
      </div>

      <div v-if="editing" style="float: right">
        <button v-on:click="endEditing()" class="ui orange button">Discard</button>
        <button v-on:click="saveProfile()" v-bind:class="['ui green button', {'loading': saveOp.loading}]">Save</button>
        <div v-if="saveOp.error" style="color: red;">Error saving Profile: {{ saveOp.error }}</div>
      </div>

      <h1>{{ profile.Name }} (Profile Level {{ profileLevel }})</h1>

      <ul>
        <li>ApproxLastUsed: {{ profile.ApproxLastUsed|fmt_datetime }}</li>
        <li>Created: {{ profile.Created|fmt_datetime }}</li>
        <li>Description: {{ profile.Description }}</li>
        <li>Domains: {{ profile.Domains }}</li>
        <li>Fingerprints: {{ profile.Fingerprints }}</li>
        <li>Flags: {{ profile.Flags }}</li>
        <li>Homepage: {{ profile.Homepage }}</li>
        <li>ID: {{ profile.ID }}</li>
        <li>Icon: {{ profile.Icon }}</li>
        <li>LinkedPath: {{ profile.LinkedPath }}</li>
        <li>Name: {{ profile.Name }}</li>
        <li>Ports: {{ profile.Ports }}</li>
        <li>SecurityLevel: {{ profile.SecurityLevel }}</li>
      </ul>

      assigned flags: {{ flags }}
      <br>
      <br>
      <br>

      <div class="ui three column grid">
      </div>

      <h2>Flags</h2>

      <div class="ui three column grid">

        <div class="column">
          <div class="ui segments">
            <div class="ui segment">
              <p>Profile Mode</p>
            </div>
            <div class="ui blue segment flag-segment">
              <Flag name="Blacklist" v-bind:flag="flags[this.c.Blacklist]"></Flag>
            </div>
            <div class="ui segment flag-segment">
              <Flag name="Prompt" v-bind:flag="flags[this.c.Prompt]"></Flag>
            </div>
            <div class="ui segment flag-segment">
              <Flag name="Whitelist" v-bind:flag="flags[this.c.Whitelist]"></Flag>
            </div>
          </div>
        </div>

        <div class="column">
          <div class="ui segments">
            <div class="ui segment">
              <p>Network Locations</p>
            </div>
            <div class="ui blue segment flag-segment">
              <Flag name="Internet" v-bind:flag="flags[this.c.Internet]"></Flag>
            </div>
            <div class="ui segment flag-segment">
              <Flag name="LAN" v-bind:flag="flags[this.c.LAN]"></Flag>
            </div>
            <div class="ui segment flag-segment">
              <Flag name="Localhost" v-bind:flag="flags[this.c.Localhost]"></Flag>
            </div>
          </div>
        </div>

        <div class="column">
          <div class="ui segments">
            <div class="ui segment">
              <p>Special Flags</p>
            </div>
            <div class="ui blue segment flag-segment">
              <Flag name="Related" v-bind:flag="flags[this.c.Related]"></Flag>
            </div>
            <div class="ui segment flag-segment">
              <Flag name="PeerToPeer" v-bind:flag="flags[this.c.PeerToPeer]"></Flag>
            </div>
            <div class="ui segment flag-segment">
              <Flag name="Service" v-bind:flag="flags[this.c.Service]"></Flag>
            </div>
            <div class="ui segment flag-segment">
              <Flag name="Independent" v-bind:flag="flags[this.c.Independent]"></Flag>
            </div>
            <div class="ui segment flag-segment">
              <Flag name="RequireGate17" v-bind:flag="flags[this.c.RequireGate17]"></Flag>
            </div>
          </div>
        </div>

      </div>

      <h2>Stamp Labels</h2>

      <div class="help-text">
        coming soon...
      </div>

      <h2>Domains</h2>

      <h2>Ports</h2>

    </div>
  </div>
</template>

<script>
import Vue from "vue";

/* eslint-disable */

// Profile Levels
const UserProfileLevel = 0
const GlobalProfileLevel = 1
const StampProfileLevel = 2
const FallbackProfileLevel = 3

// Security Levels
const SecurityLevelSecure = 1
const SecurityLevelDynamic = 2
const SecurityLevelFortress = 4

// Profile Modes
const Prompt    = 0 // Prompt first-seen connections
const Blacklist = 1 // Allow everything not explicitly denied
const Whitelist = 2 // Only allow everything explicitly allowed

// Network Locations
const Internet  = 16 // Allow connections to the Internet
const LAN       = 17 // Allow connections to the local area network
const Localhost = 18 // Allow connections on the local host

// Specials
const Related       = 32 // If and before prompting, allow domains that are related to the program
const PeerToPeer    = 33 // Allow program to directly communicate with peers, without resolving DNS first
const Service       = 34 // Allow program to accept incoming connections
const Independent   = 35 // Ignore profile settings coming from the Community
const RequireGate17 = 36 // Require all connections to go over Gate17

/* eslint-enable */

function mergeFlags(assignedFlags, profileFlags, profileLevel) {
  if (profileFlags == undefined || profileFlags == null) {
    return;
  }

  for (var flagID in assignedFlags) {
    var flagValue = profileFlags[flagID];
    if (flagValue == undefined) continue;

    assignedFlags[flagID] = {
      ID: flagID,
      IsSet: true,
      SecurityLevels: flagValue,
      ProfileLevel: profileLevel
    }
  }
}

import Flag from "./Flag.vue";

export default {
  name: "Profile",
  components: {
    Flag
  },
  props: {
    profileKey: String,
    profileLevel: Number,
    editable: Boolean
  },
  data() {
    return {
      modifiedProfile: null,
      editSwitch: false,
      saveOp: {},
      c: {
        /* eslint-disable */
        // Profile Levels
        UserProfileLevel:     0,
        GlobalProfileLevel:   1,
        StampProfileLevel:    2,
        FallbackProfileLevel: 3,

        // Security Levels
        SecurityLevelSecure:   1,
        SecurityLevelDynamic:  2,
        SecurityLevelFortress: 4,

        // Profile Modes
        Prompt:    0, // Prompt first-seen connections
        Blacklist: 1, // Allow everything not explicitly denied
        Whitelist: 2, // Only allow everything explicitly allowed

        // Network Locations
        Internet:  16, // Allow connections to the Internet
        LAN:       17, // Allow connections to the local area network
        Localhost: 18, // Allow connections on the local host

        // Specials
        Related:       32, // If and before prompting, allow domains that are related to the program
        PeerToPeer:    33, // Allow program to directly communicate with peers, without resolving DNS first
        Service:       34, // Allow program to accept incoming connections
        Independent:   35, // Ignore profile settings coming from the Community
        RequireGate17: 36  // Require all connections to go over Gate17
        /* eslint-enable */
      }
    };
  },
  methods: {
    editableInLevel(level) {
      if (level == this.profileLevel) {
        return true
      }
      false
    },
    startEditing() {
      if (!this.editing) {
        this.editSwitch = true;
        this.modifiedProfile = JSON.parse(JSON.stringify(this.originalProfile));
        this.saveOp = {};
      }
    },
    endEditing() {
      this.editSwitch = false;
      this.modifiedProfile = null;
      this.saveOp = {};
    },
    saveProfile() {
      this.saveOp = this.$api.update(this.profileKey, this.modifiedProfile)
    },
    setFlag(flagID, securityLevels) {
      this.startEditing()
      if (this.modifiedProfile.Flags == undefined || this.modifiedProfile.Flags == null) {
        this.modifiedProfile.Flags = {}
      }
      Vue.set(this.modifiedProfile.Flags, flagID, securityLevels);
    },
    deleteFlag(flagID) {
      this.startEditing()
      Vue.delete(this.modifiedProfile.Flags, flagID);
    }
  },
  computed: {
    originalProfile() {
      return this.$parent.op.records[this.profileKey]
    },
    profile() {
      if (this.editing) {
        return this.modifiedProfile
      }
      return this.originalProfile
    },
    stampProfile() {
      return null;
    },
    editing() {
      if (this.saveOp.success) {
        return false
      }
      if (this.editSwitch) {
        return true
      }
      return false
    },
    flags() {
      /* eslint-disable */
      var assignedFlags = {
        [this.c.Prompt]:        {IsSet:false, SecurityLevels: 0, ProfileLevel: 0, ID: this.c.Prompt},
        [this.c.Blacklist]:     {IsSet:false, SecurityLevels: 0, ProfileLevel: 0, ID: this.c.Blacklist},
        [this.c.Whitelist]:     {IsSet:false, SecurityLevels: 0, ProfileLevel: 0, ID: this.c.Whitelist},
        [this.c.Internet]:      {IsSet:false, SecurityLevels: 0, ProfileLevel: 0, ID: this.c.Internet},
        [this.c.LAN]:           {IsSet:false, SecurityLevels: 0, ProfileLevel: 0, ID: this.c.LAN},
        [this.c.Localhost]:     {IsSet:false, SecurityLevels: 0, ProfileLevel: 0, ID: this.c.Localhost},
        [this.c.Related]:       {IsSet:false, SecurityLevels: 0, ProfileLevel: 0, ID: this.c.Related},
        [this.c.PeerToPeer]:    {IsSet:false, SecurityLevels: 0, ProfileLevel: 0, ID: this.c.PeerToPeer},
        [this.c.Service]:       {IsSet:false, SecurityLevels: 0, ProfileLevel: 0, ID: this.c.Service},
        [this.c.Independent]:   {IsSet:false, SecurityLevels: 0, ProfileLevel: 0, ID: this.c.Independent},
        [this.c.RequireGate17]: {IsSet:false, SecurityLevels: 0, ProfileLevel: 0, ID: this.c.RequireGate17}
      }
      /* eslint-enable */

      if (this.profileLevel >= this.c.StampProfileLevel) {
        // only show current profile, if stamp or fallback profile
        mergeFlags(assignedFlags, this.profile.Flags, this.profileLevel);
      } else if (this.profileLevel == this.c.GlobalProfileLevel) {
        // show global and fallback, if global profile
        mergeFlags(assignedFlags, this.$parent.fallbackProfile.Flags, this.c.FallbackProfileLevel); // eslint-disable-line
        mergeFlags(assignedFlags, this.profile.Flags, this.profileLevel);
      } else {
        // full merge
        mergeFlags(assignedFlags, this.$parent.fallbackProfile.Flags, this.c.FallbackProfileLevel); // eslint-disable-line
        if (this.stampProfile != undefined && this.stampProfile != null) {
          mergeFlags(assignedFlags, this.stampProfile.Flags, this.c.StampProfileLevel); // eslint-disable-line
        }
        mergeFlags(assignedFlags, this.$parent.globalProfile.Flags, this.c.GlobalProfileLevel); // eslint-disable-line
        mergeFlags(assignedFlags, this.profile.Flags, this.c.UserProfileLevel);
      }
      return assignedFlags;
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

<style scoped lang="scss">
.breadcrumb .chevron {
  padding-left: 20px;
  padding-right: 30px;
}
.flag-segment {
  padding: 0 !important;
}
.edit-glow {
  min-height: 100vh;
  box-shadow: inset 20px 0 20px -20px orange;
}
.edit-info {
  position: fixed;
  top: 50%;
  margin-top: 50px;
  transform: rotate(-90deg);
	transform-origin: left top 0;
  color: orange;
}
.profile-content {
  padding: 50px !important;
}
</style>
