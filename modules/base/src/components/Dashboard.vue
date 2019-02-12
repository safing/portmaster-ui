<template>

  <div class="dashboard">

    <div class="ui basic inverted segment status">

      <div v-on:click="showHelp=!showHelp" v-bind:class="['ui button help-button', {'blue': showHelp}]" style="position: absolute; top: 20px; right: 20px;">
        Help
      </div>

      <div class="ui inverted card">
        <div class="content">
          <div class="header">Security Level</div>

          <div class="description">
            Override the security level
            <div v-if="showHelp" class="ui inverted info message">
              <p>
                There are three security levels that enable you to easily adapt to your current threat environment:
                <ul>
                  <li>
                    <img src="/assets/icons/security_levels/level_dynamic.svg" title="Dynamic"></img>
                    Dynamic: The usual operating mode for trusted environments.
                  </li>
                  <li>
                    <img src="/assets/icons/security_levels/level_secure.svg" title="Secure"></img>
                    Secure: For untrusted environments, such as a public WiFi networks.
                  </li>
                  <li>
                    <img src="/assets/icons/security_levels/level_fortress.svg" title="Fortress"></img>
                    Fortress: Emergency mode for when you panic.
                  </li>
                </ul>
              </p>
            </div>
          </div>
        </div>
        <div class="extra content">
          <div v-if="status" class="ui five buttons">
            <div v-on:click="selectSecurityLevel(0)" v-bind:class="['ui wide button', {'blue': status.SelectedSecurityLevel == 0, 'inverted': status.SelectedSecurityLevel != 0}]">
              <i class="rocket icon"></i><br>
              Autopilot
            </div>
            <div v-on:click="selectSecurityLevel(1)" v-bind:class="['ui button img', {'blue': status.SelectedSecurityLevel == 1, 'inverted': status.SelectedSecurityLevel != 1}]">
              <img src="/assets/icons/security_levels/level_dynamic.svg" title="Dynamic"></img>
            </div>
            <div v-on:click="selectSecurityLevel(2)" v-bind:class="['ui button img', {'blue': status.SelectedSecurityLevel == 2, 'inverted': status.SelectedSecurityLevel != 2}]">
              <img src="/assets/icons/security_levels/level_secure.svg" title="Secure"></img>
            </div>
            <div v-on:click="selectSecurityLevel(4)" v-bind:class="['ui button img', {'blue': status.SelectedSecurityLevel == 4, 'inverted': status.SelectedSecurityLevel != 4}]">
              <img src="/assets/icons/security_levels/level_fortress.svg" title="Fortress"></img>
            </div>
          </div>
          <span v-else>loading...</span>
        </div>
      </div>

      <div class="ui fluid inverted card">
        <div class="content">
          <div class="header">Threats</div>

          <div class="description">
            coming soon...<br>
            <div v-if="showHelp" class="ui inverted info message">
              <p>
                Threats are what drive the autopilot.
                Different subsystems of the Portmaster detect threats and will influence the automatic security level.<br>
              </p>
              <p>
                Detected threats will be displayed here.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <div class="versions">
      <div class="ui segment">
        <h3>Versions</h3>
        <div v-if="showHelp" class="ui info message">
          <p>
            The following list displays the current versions of all the portmaster submodules.
            <i>Last Used</i> is the version that was last used since start.
          </p>
          <p>
            Detected threats will be displayed here.
          </p>
        </div>
        <table v-if="versions" class="ui very basic compact table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Last Used</th>
              <th>Local</th>
              <th>Stable</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="vStatus in versions">
              <td>{{ vStatus.identifier }}</td>
              <td>{{ vStatus.LastVersionUsed }}</td>
              <td>{{ vStatus.LocalVersion }}</td>
              <td>{{ vStatus.StableVersion }}</td>
              <td>{{ vStatus.AlphaVersion }}</td>
            </tr>
          </tbody>
        </table>
        <span v-else>loading...</span>
      </div>
    </div>

  </div>

</template>

<script>
export default {
  name: "Dashboard",
  components: {
  },
  data() {
    return {
      // op: this.$api.qsub("query ")
      showHelp: false
    };
  },
  computed: {
    status() {
      return this.$parent.op.records["core:status/status"];
    },
    versions() {
      var status = this.$parent.op.records["core:status/updates"];
      if (status == undefined) {
        return null;
      }

      var sortedVersions = [];
      for (var key in status.Versions){
        status.Versions[key]["identifier"] = key;
        sortedVersions.push(status.Versions[key]);
      }

      sortedVersions.sort(function(a, b) {
        return a.identifier > b.identifier;
      });

      return sortedVersions;
    }
  },
  methods: {
    selectSecurityLevel(level) {
      this.$api.update("core:status/status", {
        SelectedSecurityLevel: level,
      })
      console.log(`selecting new security level: ${level}`)
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.dashboard {
  height: 100vh;
  overflow-y: scroll;
}

.status {
  background-color: #1b1c1df0 !important;
  .inverted.card {
    background-color: #2a2a2a !important;
  }
  // border-left: 2px solid #2185d0 !important;

  .img.button {
    // 53.6×50
    height: 50px;
    width: 53.6px;
    padding: 7px 8.8px;
    img {
      height: 36px;
      width: 36px;
    }
  }
  .wide.button {
    width: 40% !important;
  }

  .info.message {
    margin-top: 15px !important;
    margin: 5px;
    ul {
      padding-left: 20px !important;
    }
    img {
      height: 20px;
    }
  }
}

.versions {
  padding: 10px;
}

// .content-placeholder {
//   position: relative;
//   height: 100%;
//   width: 100%;
//   background-color: #eee;
//   .grid {
//     position: relative;
//     height: 100%;
//   }
//   h1, h2 {
//     text-align: center;
//     font-family: sans-serif;
//     color: #ccc;
//   }
// }
</style>
