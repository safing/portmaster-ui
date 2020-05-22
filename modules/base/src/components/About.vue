<template>
  <div class="about">
    <div class="ui basic segment">

      <h3>Core Version Info</h3>

      <div v-if="$parent.versions">
        <p style="padding: 5px;">
          <strong>Name</strong>: {{ $parent.versions.Core.Name }}<br />
          <strong>Version</strong>: {{ $parent.versions.Core.Version }}<br />
          <strong>Commit</strong>: {{ $parent.versions.Core.Commit }}<br />
          <strong>Build Options</strong>: {{ $parent.versions.Core.BuildOptions }}<br />
          <strong>Build User</strong>: {{ $parent.versions.Core.BuildUser }}<br />
          <strong>Build Host</strong>: {{ $parent.versions.Core.BuildHost }}<br />
          <strong>Build Date</strong>: {{ $parent.versions.Core.BuildDate }}<br />
          <strong>Build Source</strong>: {{ $parent.versions.Core.BuildSource }}<br />
        </p>
      </div>
      <span v-else>loading...</span>

      <h3>Resource Versions</h3>

      <table v-if="$parent.versions" class="ui very basic compact table">
        <thead>
          <tr>
            <th>Resource</th>
            <th>Active Version</th>
            <th>Latest/Selected Version</th>
            <th>Downloaded</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="resource in $parent.versions.Resources" v-bind:key="resource.Identifier">
            <td>{{ resource.Identifier }}</td>
            <td v-if="resource.ActiveVersion">{{ resource.ActiveVersion.VersionNumber }}</td>
            <td v-else></td>
            <td>{{ resource.SelectedVersion.VersionNumber }}</td>
            <td>{{ resource.SelectedVersion.Available }}</td>
          </tr>
        </tbody>
      </table>
      <span v-else>loading...</span>

      <h3>License</h3>

      <p>
        The Portmaster is licensed under the AGPLv3.<br />
        More attribution to other projects and their licenses coming soon.
      </p>

      <h4>Attribution</h4>
      <table class="ui very basic compact table">
        <thead>
          <tr>
            <th>Name</th>
            <th>License</th>
            <th>Notice</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>github.com/tevino/abool</td>
            <td>MIT</td>
          </tr>
          <tr>
            <td>github.com/spf13/cobra</td>
            <td>Apache-2.0</td>
          </tr>
          <tr>
            <td>github.com/godbus/dbus</td>
            <td>BSD-2-Clause</td>
          </tr>
          <tr>
            <td>github.com/miekg/dns</td>
            <td>BSD-3-Clause</td>
          </tr>
          <tr>
            <td>github.com/golang/go</td>
            <td>BSD-3-Clause</td>
          </tr>
          <tr>
            <td>github.com/coreos/go-iptables</td>
            <td>Apache-2.0</td>
          </tr>
          <tr>
            <td>github.com/hashicorp/go-version</td>
            <td>MPL-2.0-no-copyleft-exception</td>
          </tr>
          <tr>
            <td>github.com/satori/go.uuid</td>
            <td>MIT</td>
          </tr>
          <tr>
            <td>github.com/google/gopacket</td>
            <td>BSD-3-Clause</td>
          </tr>
          <tr>
            <td>github.com/shirou/gopsutil</td>
            <td>BSD-3-Clause</td>
          </tr>
          <tr>
            <td>github.com/umahmood/haversine</td>
            <td>MIT</td>
          </tr>
          <tr>
            <td>github.com/agext/levenshtein</td>
            <td>Apache-2.0</td>
          </tr>
          <tr>
            <td>github.com/oschwald/maxminddb-golang</td>
            <td>MIT</td>
          </tr>
          <tr>
            <td>github.com/google/renameio</td>
            <td>Apache-2.0</td>
          </tr>
          <tr>
            <td>github.com/cookieo9/resources-go</td>
            <td>MIT</td>
          </tr>
          <tr>
            <td>github.com/TheTannerRyan/ring</td>
            <td>BSD-2-Clause</td>
          </tr>
          <tr>
            <td>github.com/stretchr/testify</td>
            <td>MIT</td>
          </tr>
        </tbody>
      </table>

    </div>
  </div>
</template>

<script>
export default {
  name: "About",
  components: {},
  data() {
    return {};
  },
  computed: {
    coreInfo() {
      var status = this.$parent.statusDB.records["core:status/versions"];
      if (this.$parent.versions) {
        return this.$parent.versions.Core;
      }

      return status.Core;
    },
    resourcesInfo() {
      var status = this.$parent.statusDB.records["core:status/versions"];
      if (status === undefined) {
        return null;
      }

      return status.Resources;
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.about {
  height: 100vh;
  overflow-y: scroll;
  padding: 10px;
}
</style>
