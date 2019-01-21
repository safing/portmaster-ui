<template>
  <div v-bind:class="{'edit-glow': editing}">
    <div v-if="editing" class="ui segment edit-menu">
      <div class="ui left floated buttons">
        <button v-on:click="saveProfile()" v-bind:class="['ui green button', {'loading': saveOp.loading}]">Save</button>
        <button v-on:click="endEditing()" class="ui orange button">Discard</button>
      </div>
      <p class="edit-info">
        <span v-if="saveOp.error" class="ui red text">
          Error saving Profile: {{ saveOp.error }}
        </span>
        <span v-else class="ui orange text">
          unsaved changes
        </span>
      </p>
    </div>

    <div class="profile-content">

      <div v-if="profile.error" class="ui red text">
        {{ profile.error }}
      </div>

      <div v-else>
        <!-- Profile Breadcrumbs -->
        <div class="ui center aligned basic segment">
          <div class="ui large breadcrumb">

            <i class="icons">
              <i class="circle icon user-profile-color"></i>
              <i v-if="profile.profileLevel != c.UserProfileLevel" class="large dont icon"></i>
            </i>
            <!-- <i class="circle icon user-profile-color"></i> -->
            <div v-bind:class="[{'active': profile.profileLevel == c.UserProfileLevel}, 'section']">User Profile</div>

            <i class="right chevron icon divider"></i>

            <i class="icons">
              <i class="circle icon global-profile-color"></i>
              <i v-if="profile.profileLevel > c.GlobalProfileLevel" class="large dont icon"></i>
            </i>
            <div v-bind:class="[{'active': profile.profileLevel == c.GlobalProfileLevel}, 'section']">Global Profile</div>

            <i class="right chevron icon divider"></i>

            <i class="icons">
              <i class="circle icon stamp-profile-color"></i>
              <i v-if="profile.profileLevel == c.GlobalProfileLevel || profile.profileLevel == c.FallbackProfileLevel" class="large dont icon"></i>
            </i>
            <div v-bind:class="[{'active': profile.profileLevel == c.StampProfileLevel}, 'section']">Stamp Profile</div>

            <i class="right chevron icon divider"></i>

            <i class="icons">
              <i class="circle icon fallback-profile-color"></i>
              <i v-if="profile.profileLevel == c.StampProfileLevel" class="large dont icon"></i>
            </i>
            <div v-bind:class="[{'active': profile.profileLevel == c.FallbackProfileLevel}, 'section']">Fallback Profile</div>

          </div>
        </div>

        <!-- Help Intro -->
        <div v-if="showHelp" class="ui info message">
          <h3>Profiles Introduction</h3>

          <p>
            When making decisions, the Portmaster merges four profiles together and draws preferences from this set. The following list is displayed in the correct precedence:
          </p>

          <ul>
            <li>User Profiles</li>
            <li>The Global Profile</li>
            <li>Stamp Profiles</li>
            <li>The Fallback Profile</li>
          </ul>

          <p>
            Every application (every executable on the filesystem) automatically gets assigned a new <strong>User Profile</strong> when it interacts with the network the first time.
            At the moment, to create a User Profile, you'll need to run the application first.
          </p>

          <p>
            In addition to the User Profile, the Portmaster tries to fetch a community built profile (well, not yet) for that executable and saves it as the <strong>Stamp Profile</strong>.
          </p>

          <p>
            The “default profile” is the combination of the Global and the Fallback Profile.
            The difference is that the <strong>Global Profile</strong> will overrule the Stamp Profile
            while the <strong>Fallback Profile</strong> may be overridden by Stamp Profile settings.
          </p>
        </div>

        <!-- Title -->
        <div class="ui grid">
          <div class="nine wide column">
            <h1>{{ profile.Name }} <small v-if="profile.Homepage"><a v-bind:href="profile.Homepage"><i class="external alternate icon"></i></a></small></h1>
            <p v-if="profile.Description">
              {{ profile.Description }}
            </p>
            <p v-if="profile.profileLevel == c.UserProfileLevel || profile.profileLevel == c.StampProfileLevel">
              Created: {{ profile.Created|fmt_datetime }}<br>
              Approximately last used: {{ profile.ApproxLastUsed|fmt_datetime }}
            </p>
          </div>

          <div class="seven wide column">
            <div class="ui segments">
              <div class="ui segment">
                <p>Identification</p>
              </div>
              <div class="ui blue segment">
                ID: {{ profileKey|fmtProfileKey }}
              </div>
              <div v-if="profile.LinkedPath || showHelp" class="ui segment">
                LinkedPath:
                <span v-if="profile.LinkedPath">
                  {{ profile.LinkedPath }}
                </span>
                <div v-if="showHelp" class="ui info message">
                  The LinkedPath is only used by User Profiles to fix a certain profile to an executable path.
                </div>
              </div>
              <div v-if="profile.StampProfileID || showHelp" class="ui segment">
                Stamp Profile:
                <span v-if="profile.StampProfileID">
                  {{ profile.StampProfileID }}<br>
                  (assigned: {{ profile.StampProfileAssigned|fmt_datetime }})
                </span>
                <div v-if="showHelp" class="ui info message">
                  User Profiles assign a matched Stamp Profile to themselves. The assigned Stamp Profile is re-evaluated regularly to ensure the best matching Stamp Profile is used.
                </div>
              </div>
              <div v-if="profile.Fingerprints || showHelp" class="ui segment">
                Fingerprints:
                <span v-if="profile.Fingerprints">
                  {{ profile.Fingerprints }}
                </span>
                <div v-if="showHelp" class="ui info message">
                  The Fingerprints are used by Stamp Profiles to intelligently match an executable to profile in Stamp's database and preserves user privacy as much as possible while doing so.
                </div>
              </div>
            </div>
          </div>
        </div>

        <h2>App Security Level</h2>

        <div v-if="showHelp" class="ui info message">
          <p>
            Profiles may define a security level. All security level preference will then correctly be set to the according settings for this profile.<br>
            This enables users to define if an application requires additional security precautions.
          </p>

          <p>
            This option sets the security level, meaning that all other preferences, like the flags below, are viewed with this minimum security level.
          </p>
        </div>

        <div class="ui compact segment" style="padding: 5px;">
          <SecurityLevel name="Minimum Applied Security Level" v-bind:sl="securityLevel"></SecurityLevel>
        </div>

        <h2>Flags</h2>

        <div v-if="showHelp" class="ui info message">
          <p>
            Flags allow for easy and quick settings on a profile.
          </p>
          <p>
            They are grouped into three categories: Profile Mode, Network Locations and Special Flags:
          </p>
        </div>

        <div class="ui three column grid">

          <div class="column">
            <div class="ui segments">
              <div class="ui segment">
                <p>Profile Mode</p>
                <div v-if="showHelp" class="ui info message">
                  The Profile Mode defines how the Endpoint list below should be treated.
                  Whitelist takes precedence before Prompt takes precedence before Blacklist.
                </div>
              </div>
              <div v-bind:class="['ui blue segment flag-segment', {'flag-help': showHelp}]">
                <Flag name="Blacklist" v-bind:flag="flags[this.c.Blacklist]"></Flag>
                <div v-if="showHelp" class="ui info message">
                  Only block denied entries, allow everything else.
                </div>
              </div>
              <div v-bind:class="['ui segment flag-segment', {'flag-help': showHelp}]">
                <Flag name="Prompt" v-bind:flag="flags[this.c.Prompt]"></Flag>
                <div v-if="showHelp" class="ui info message">
                  Ask if endpoint is not found in list.
                </div>
              </div>
              <div v-bind:class="['ui segment flag-segment', {'flag-help': showHelp}]">
                <Flag name="Whitelist" v-bind:flag="flags[this.c.Whitelist]"></Flag>
                <div v-if="showHelp" class="ui info message">
                  Only allow permitted entires, block everything else.
                </div>
              </div>
            </div>
          </div>

          <div class="column">
            <div class="ui segments">
              <div class="ui segment">
                <p>Network Locations</p>
                <div v-if="showHelp" class="ui info message">
                  Define the network scope for this application.
                </div>
              </div>
              <div v-bind:class="['ui blue segment flag-segment', {'flag-help': showHelp}]">
                <Flag name="Internet" v-bind:flag="flags[this.c.Internet]"></Flag>
                <div v-if="showHelp" class="ui info message">
                  Only allow permitted entires, block everything else.
                </div>
              </div>
              <div v-bind:class="['ui segment flag-segment', {'flag-help': showHelp}]">
                <Flag name="LAN" v-bind:flag="flags[this.c.LAN]"></Flag>
                <div v-if="showHelp" class="ui info message">
                  Only allow permitted entires, block everything else.
                </div>
              </div>
              <div v-bind:class="['ui segment flag-segment', {'flag-help': showHelp}]">
                <Flag name="Localhost" v-bind:flag="flags[this.c.Localhost]"></Flag>
                <div v-if="showHelp" class="ui info message">
                  Only allow permitted entires, block everything else.
                </div>
              </div>
            </div>
          </div>

          <div class="column">
            <div class="ui segments">
              <div class="ui segment">
                <p>Special Flags</p>
                <div v-if="showHelp" class="ui info message">
                  Define special behaviour.
                </div>
              </div>
              <div v-bind:class="['ui blue segment flag-segment', {'flag-help': showHelp}]">
                <Flag name="Related" v-bind:flag="flags[this.c.Related]"></Flag>
                <div v-if="showHelp" class="ui info message">
                  When prompting, automatically allow domains that are related to the program.
                </div>
              </div>
              <div v-bind:class="['ui segment flag-segment', {'flag-help': showHelp}]">
                <Flag name="PeerToPeer" v-bind:flag="flags[this.c.PeerToPeer]"></Flag>
                <div v-if="showHelp" class="ui info message">
                  Allow program to directly communicate with peers (ie. anyone in the permitted network scope), without resolving DNS first.
                </div>
              </div>
              <div v-bind:class="['ui segment flag-segment', {'flag-help': showHelp}]">
                <Flag name="Service" v-bind:flag="flags[this.c.Service]"></Flag>
                <div v-if="showHelp" class="ui info message">
                  Allow program to accept incoming connections and act as a server for other devices.
                </div>
              </div>
              <div v-bind:class="['ui segment flag-segment', {'flag-help': showHelp}]">
                <Flag name="Independent" v-bind:flag="flags[this.c.Independent]"></Flag>
                <div v-if="showHelp" class="ui info message">
                  Ignore profile settings coming from the (Stamp) Community.
                </div>
              </div>
              <div v-bind:class="['ui segment flag-segment', {'flag-help': showHelp}]">
                <Flag name="RequireGate17" v-bind:flag="flags[this.c.RequireGate17]"></Flag>
                <div v-if="showHelp" class="ui info message">
                  Require all connections to go over Gate17. (Not quite yet)
                </div>
              </div>
            </div>
          </div>

        </div>

        <h2>Stamp Labels</h2>

        <div v-if="showHelp" class="ui info message">
          Stamp Labels will allow you to block (or permit) domains based on certain security and content-based labels, created by the Stamp Community.
        </div>

        <div class="help-text">
          coming soon...
        </div>

        <h2>Endpoints</h2>

        <div v-if="showHelp" class="ui info message">
          White- or blacklist certain domains or IP addresses.<br>
          If needed, you may also specify a protocol and a port (range).<br>
          Please note, that this list will not be checked for localhost entries.
        </div>

        <table class="ui compact celled definition table">
          <tbody class="sort-container" v-sortable="{onEnd: updateEndpointOrder, filter: '.endpoint-external', handle: '.drag-handle'}" id="profile-endpoints" data-sort-id="out">
            <tr v-for="(entry, index) in endpoints" v-bind:key="index" v-bind:data-id="index" v-bind:class="[{'draggable': editableInLevel(entry.profileLevel), 'endpoint-external': !editableInLevel(entry.profileLevel)}]">
              <td class="collapsing endpoint-drag drag-handle">
                <i class="bars icon"></i>
              </td>
              <td><Endpoint v-bind:entry="entry"></Endpoint></td>
              <td v-on:click="setEndpointDecision(entry, !entry.Permit)" class="collapsing endpoint-permission">
                <i v-if="entry.Permit" class="large check circle icon" style="color: green;"></i>
                <i v-else class="large minus circle icon" style="color: red;"></i>
              </td>
            </tr>
          </tbody>
          <tfoot class="full-width">
            <tr>
              <th colspan="3">
                <div v-on:click="newEndpoint(false)" class="ui right floated small primary labeled icon button">
                  <i class="plus icon"></i> Add Endpoint
                </div>
              </th>
            </tr>
          </tfoot>
        </table>

        <h2>Service Endpoints</h2>

        <div v-if="showHelp" class="ui info message">
          White- or blacklist certain domains or IP addresses for incoming connections.<br>
          If needed, you may also specify a protocol and a port (range).<br>
          This list will also be checked for localhost endpoints.
        </div>

        <table class="ui compact celled definition table">
          <tbody class="sort-container" v-sortable="{onEnd: updateEndpointOrder, filter: '.endpoint-external', handle: '.drag-handle'}" id="profile-service-endpoints" data-sort-id="in">
            <tr v-for="(entry, index) in serviceEndpoints" v-bind:key="index" v-bind:data-id="index" v-bind:class="[{'draggable': editableInLevel(entry.profileLevel), 'endpoint-external': !editableInLevel(entry.profileLevel)}]">
              <td class="collapsing endpoint-drag drag-handle">
                <i class="bars icon"></i>
              </td>
              <td><Endpoint v-bind:entry="entry"></Endpoint></td>
              <td v-on:click="setEndpointDecision(entry, !entry.Permit)" class="collapsing endpoint-permission">
                <i v-if="entry.Permit" class="large check circle icon" style="color: green;"></i>
                <i v-else class="large minus circle icon" style="color: red;"></i>
              </td>
            </tr>
          </tbody>
          <tfoot class="full-width">
            <tr>
              <th colspan="3">
                <div v-on:click="newEndpoint(true)" class="ui right floated small primary labeled icon button">
                  <i class="plus icon"></i> Add Endpoint
                </div>
              </th>
            </tr>
          </tfoot>
        </table>

      </div>

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

function mergeFlags(assignedFlags, profile) {
  if (profile.Flags == undefined || profile.Flags == null) {
    return;
  }

  for (var flagID in assignedFlags) {
    var flagValue = profile.Flags[flagID];
    if (flagValue == undefined) continue;

    assignedFlags[flagID] = {
      ID: flagID,
      IsSet: true,
      SecurityLevels: flagValue,
      ProfileLevel: profile.profileLevel
    };
  }
}

import SecurityLevel from "./SecurityLevel.vue";
import Flag from "./Flag.vue";
import Endpoint from "./Endpoint.vue";

import Sortable from "../../../assets/js/vue2-sortable.js";
Vue.use(Sortable);

export default {
  name: "Profile",
  components: {
    SecurityLevel,
    Flag,
    Endpoint
  },
  props: {
    profileKey: String,
    editable: Boolean,
    showHelp: Boolean
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
      if (level == this.profile.profileLevel) {
        return true;
      }
      false;
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
      this.saveOp = this.$api.update(this.profileKey, this.modifiedProfile);
    },
    setSecurityLevel(level) {
      this.startEditing();
      this.modifiedProfile.SecurityLevel = level;
    },
    deleteSecurityLevel() {
      this.startEditing();
      this.modifiedProfile.SecurityLevel = 0;
    },
    setFlag(flagID, securityLevels) {
      this.startEditing();
      // eslint-disable-next-line
      if (this.modifiedProfile.Flags == undefined || this.modifiedProfile.Flags == null) {
        this.modifiedProfile.Flags = {};
      }
      Vue.set(this.modifiedProfile.Flags, flagID, securityLevels);
    },
    deleteFlag(flagID) {
      this.startEditing();
      Vue.delete(this.modifiedProfile.Flags, flagID);
    },
    updateEndpoint(key, modifiedEntry) {
      this.startEditing();
      if (modifiedEntry.service) {
        Vue.set(this.modifiedProfile.ServiceEndpoints, key, modifiedEntry);
      } else {
        Vue.set(this.modifiedProfile.Endpoints, key, modifiedEntry);
      }
    },
    setEndpointDecision(modifiedEntry, permit) {
      this.startEditing();
      if (modifiedEntry.service) {
        // eslint-disable-next-line
        this.modifiedProfile.ServiceEndpoints[modifiedEntry.key].Permit = permit;
      } else {
        this.modifiedProfile.Endpoints[modifiedEntry.key].Permit = permit;
      }
    },
    deleteEndpoint(modifiedEntry) {
      this.startEditing();
      if (modifiedEntry.service) {
        Vue.delete(this.modifiedProfile.ServiceEndpoints, modifiedEntry.key);
      } else {
        Vue.delete(this.modifiedProfile.Endpoints, modifiedEntry.key);
      }
    },
    newEndpoint(service) {
      this.startEditing();
      var newEntry = {
        DomainOrIP: "",
        Wildcard: false,
        Protocol: 0,
        StartPort: 0,
        EndPort: 0,
        Permit: true,
        Created: Math.floor((new Date()).getTime() / 1000) // eslint-disable-line
      };

      if (service) {
        // eslint-disable-next-line
        if (this.modifiedProfile.ServiceEndpoints == undefined || this.modifiedProfile.ServiceEndpoints == null) {
          Vue.set(this.modifiedProfile, "ServiceEndpoints", []);
        }
        this.modifiedProfile.ServiceEndpoints.push(newEntry);
      } else {
        // eslint-disable-next-line
        if (this.modifiedProfile.Endpoints == undefined || this.modifiedProfile.Endpoints == null) {
          Vue.set(this.modifiedProfile, "Endpoints", []);
        }
        this.modifiedProfile.Endpoints.push(newEntry);
      }
    },
    updateEndpointOrder(event) {
      this.startEditing();

      // multi-list currently broken, because sortable also moves the object from list to list, so two objects are transferred from one list to the other.
      // sortable conf for multi-list sorting:
      // {onEnd: updateEndpointOrder, group: 'endpoints', filter: '.endpoint-external', handle: '.drag-handle'}

      var movedEntry = {};

      switch (event.from.getAttribute("data-sort-id")) {
        case "out":
          // eslint-disable-next-line
          movedEntry = this.modifiedProfile.Endpoints.splice(event.oldIndex, 1)[0]
          break;
        case "in":
          // eslint-disable-next-line
          movedEntry = this.modifiedProfile.ServiceEndpoints.splice(event.oldIndex, 1)[0]
          break;
        default:
          // eslint-disable-next-line
          console.warn("unknown from id in sort group: ${event.from.getAttribute('data-sort-id')}");
          return;
      }

      switch (event.to.getAttribute("data-sort-id")) {
        case "out":
          // eslint-disable-next-line
          if (this.modifiedProfile.Endpoints == undefined || this.modifiedProfile.Endpoints == null) {
            Vue.set(this.modifiedProfile, "Endpoints", []);
          }
          this.modifiedProfile.Endpoints.splice(event.newIndex, 0, movedEntry);
          break;
        case "in":
          // eslint-disable-next-line
          if (this.modifiedProfile.ServiceEndpoints == undefined || this.modifiedProfile.ServiceEndpoints == null) {
            Vue.set(this.modifiedProfile, "ServiceEndpoints", []);
          }
          // eslint-disable-next-line
          this.modifiedProfile.ServiceEndpoints.splice(event.newIndex, 0, movedEntry);
          break;
        default:
          // eslint-disable-next-line
          console.warn("unknown to id in sort group: ${event.to.getAttribute('data-sort-id')}");
          return;
      }
    }
  },
  computed: {
    originalProfile() {
      var p = this.$parent.op.records[this.profileKey];
      if (p == undefined || p == null) {
        // eslint-disable-next-line
        console.warn("could not load profile ${this.profileKey}");
        return {
          error: "could not load profile ${this.profileKey}"
        };
      }
      return p;
    },
    profile() {
      if (this.editing) {
        return this.modifiedProfile;
      }
      return this.originalProfile;
    },
    stampProfile() {
      return null;
    },
    editing() {
      if (this.saveOp.success) {
        return false;
      }
      if (this.editSwitch) {
        return true;
      }
      return false;
    },
    profileStack() {
      var stack = [];

      if (this.profile.profileLevel >= this.c.StampProfileLevel) {
        // only show current profile, if stamp or fallback profile
        stack.push(this.profile);
      } else if (this.profile.profileLevel == this.c.GlobalProfileLevel) {
        // show global and fallback, if global profile
        stack.push(this.profile);
        stack.push(this.$parent.fallbackProfile);
      } else {
        // full stack
        stack.push(this.profile);
        stack.push(this.$parent.globalProfile);
        if (this.stampProfile != null) {
          stack.push(this.stampProfile);
        }
        stack.push(this.$parent.fallbackProfile);
      }

      return stack;
    },
    securityLevel() {
      var sl = {
        IsSet: false,
        SecurityLevel: 0
      };
      for (var i = 0; i < this.profileStack.length; i++) {
        if (this.profileStack[i].SecurityLevel > 0) {
          sl.SecurityLevel = this.profileStack[i].SecurityLevel;
          sl.IsSet = true;
          sl.ProfileLevel = this.profileStack[i].profileLevel;
          break;
        }
      }
      return sl;
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

      for (var i = this.profileStack.length - 1; i >= 0; i--) {
        mergeFlags(assignedFlags, this.profileStack[i]);
      }
      return assignedFlags;
    },
    endpoints() {
      var entries = [];
      // collect all entries
      for (var i = 0; i < this.profileStack.length; i++) {
        // eslint-disable-next-line
        if (this.profileStack[i].Endpoints == undefined || this.profileStack[i].Endpoints == null) {
          continue;
        }

        // eslint-disable-next-line
        for (const [key, value] of Object.entries(this.profileStack[i].Endpoints)) {
          if (value != null) {
            var e = value;
            e.key = key;
            e.profileLevel = this.profileStack[i].profileLevel;
            e.service = false;
            entries.push(e);
          }
        }
      }
      // return
      return entries;
    },
    serviceEndpoints() {
      var entries = [];
      // collect all entries
      for (var i = 0; i < this.profileStack.length; i++) {
        // eslint-disable-next-line
        if (this.profileStack[i].ServiceEndpoints == undefined || this.profileStack[i].ServiceEndpoints == null) {
          continue;
        }

        // eslint-disable-next-line
        for (const [key, value] of Object.entries(this.profileStack[i].ServiceEndpoints)) {
          if (value != null) {
            var e = value;
            e.key = key;
            e.profileLevel = this.profileStack[i].profileLevel;
            e.service = true;
            entries.push(e);
          }
        }
      }
      // return
      return entries;
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
    },
    fmtProfileKey(key) {
      return key
        .split("/")
        .splice(1)
        .join("/");
    }
  }
};
</script>

<style scoped lang="scss">
.profile-content {
  padding: 50px !important;
  position: relative;
}
.breadcrumb {
  .chevron {
    padding-left: 20px;
    padding-right: 30px;
  }
  .section {
    padding: 3px !important;
  }
  .icons {
    padding: 5px;
  }
  .dont.icon {
    color: gray;
  }
}
.flag-segment {
  padding: 0 !important;
  .ui.message {
    margin: 14px 14px 0 14px !important;
  }
}
.flag-segment.flag-help {
  padding: 14px 0 !important;
}

.edit-glow {
  min-height: 100vh;
  box-shadow: inset 20px 0 20px -20px orange;
}
.edit-menu {
  position: fixed !important;
  z-index: 1000;
  top: 0px;
  min-height: 49px;
  width: 100vw;
  padding: 5px !important;
  border-radius: 0 !important;
  .edit-info {
    display: inline-block;
    min-height: 37px;
    padding: 8px;
    padding-left: 16px;
  }
}
.endpoint-drag {
  :hover {
    cursor: grab;
  }
}
.endpoint-permission {
  :hover {
    cursor: pointer;
  }
}
.endpoint-external {
  :hover {
    cursor: default !important;
  }
  .bars.icon {
    opacity: 0.2;
  }
  .endpoint-permission > i {
    opacity: 0.4;
  }
}
</style>
