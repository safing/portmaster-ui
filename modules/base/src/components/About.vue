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
        The Portmaster is licensed under the AGPLv3.
      </p>

      <p>
        Here you can find project attribution for Golang libraries and data. We are still working on a way how to display the gazillion dependencies we get through npm. Attribution for filter lists is found where they are displayed.<br />
        Also, this is not yet automated, so it might not be up to date all the time.
      </p>

      <p>
        While not all the licenses listed require attribution, we still want to give it. Additionally, as soon as project funding allows, we will investigate how we can financially support project and library authors we depend on.
      </p>

      <h4>Attribution</h4>
      <table class="ui very basic compact table">
        <thead>
          <tr>
            <th>Name / Project / Library</th>
            <th>License</th>
          </tr>
        </thead>
        <tbody>

          <!-- format is a bit unreadable, but sortable -->
          <tr><td><a href="https://github.com/aead/serpent"> github.com/aead/serpent </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/agext/levenshtein"> github.com/agext/levenshtein </a></td><td> Apache-2.0 </td></tr>
          <tr><td><a href="https://github.com/AndreasBriese/bbloom"> github.com/AndreasBriese/bbloom </a></td><td> MIT / CC0-1.0 </td></tr>
          <tr><td><a href="https://github.com/bluele/gcache"> github.com/bluele/gcache </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/cookieo9/resources-go"> github.com/cookieo9/resources-go </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/coreos/go-iptables"> github.com/coreos/go-iptables </a></td><td> Apache-2.0 </td></tr>
          <tr><td><a href="https://github.com/dgraph-io/badger"> github.com/dgraph-io/badger </a></td><td> Apache-2.0 </td></tr>
          <tr><td><a href="https://github.com/dgryski/go-farm"> github.com/dgryski/go-farm </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/dhaavi/go-notify"> github.com/dhaavi/go-notify </a></td><td> BSD-2-Clause </td></tr>
          <tr><td><a href="https://github.com/dustin/go-humanize"> github.com/dustin/go-humanize </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/etcd-io/bbolt"> go.etcd.io/bbolt </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/getlantern/context"> github.com/getlantern/context </a></td><td> Apache-2.0 </td></tr>
          <tr><td><a href="https://github.com/getlantern/errors"> github.com/getlantern/errors </a></td><td> Apache-2.0 </td></tr>
          <tr><td><a href="https://github.com/getlantern/golog"> github.com/getlantern/golog </a></td><td> Apache-2.0 </td></tr>
          <tr><td><a href="https://github.com/getlantern/hex"> github.com/getlantern/hex </a></td><td> BSD-3-Clause </td></tr>
          <tr><td><a href="https://github.com/getlantern/hidden"> github.com/getlantern/hidden </a></td><td> Apache-2.0 </td></tr>
          <tr><td><a href="https://github.com/getlantern/ops"> github.com/getlantern/ops </a></td><td> Apache-2.0 </td></tr>
          <tr><td><a href="https://github.com/getlantern/systray"> github.com/getlantern/systray </a></td><td> Apache-2.0 </td></tr>
          <tr><td><a href="https://github.com/go-stack/stack"> github.com/go-stack/stack </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/godbus/dbus"> github.com/godbus/dbus </a></td><td> BSD-2-Clause </td></tr>
          <tr><td><a href="https://github.com/golang/go"> Golang with extended stdlibs </a></td><td> BSD-3-Clause </td></tr>
          <tr><td><a href="https://github.com/golang/protobuf"> github.com/golang/protobuf </a></td><td> BSD-3-Clause </td></tr>
          <tr><td><a href="https://github.com/google/gopacket"> github.com/google/gopacket </a></td><td> BSD-3-Clause </td></tr>
          <tr><td><a href="https://github.com/google/renameio"> github.com/google/renameio </a></td><td> Apache-2.0 </td></tr>
          <tr><td><a href="https://github.com/gorilla/mux"> github.com/gorilla/mux </a></td><td> BSD-3-Clause </td></tr>
          <tr><td><a href="https://github.com/gorilla/websocket"> github.com/gorilla/websocket </a></td><td> BSD-2-Clause </td></tr>
          <tr><td><a href="https://github.com/hashicorp/go-version"> github.com/hashicorp/go-version </a></td><td> MPL-2.0 </td></tr>
          <tr><td><a href="https://github.com/kardianos/osext"> github.com/kardianos/osext </a></td><td> BSD-3-Clause </td></tr>
          <tr><td><a href="https://github.com/mattn/go-gtk"> github.com/mattn/go-gtk </a></td><td> BSD-3-Clause </td></tr>
          <tr><td><a href="https://github.com/miekg/dns"> github.com/miekg/dns </a></td><td> BSD-3-Clause </td></tr>
          <tr><td><a href="https://github.com/oschwald/maxminddb-golang"> github.com/oschwald/maxminddb-golang </a></td><td> ISC </td></tr>
          <tr><td><a href="https://github.com/oxtoacart/bpool"> github.com/oxtoacart/bpool </a></td><td> Apache-2.0 </td></tr>
          <tr><td><a href="https://github.com/pkg/errors"> github.com/pkg/errors </a></td><td> BSD-2-Clause </td></tr>
          <tr><td><a href="https://github.com/gofrs/uuid"> github.com/gofrs/uuid </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/seehuhn/fortuna"> github.com/seehuhn/fortuna </a></td><td> GPL-3.0 </td></tr>
          <tr><td><a href="https://github.com/seehuhn/sha256d"> github.com/seehuhn/sha256d </a></td><td> GPL-3.0 </td></tr>
          <tr><td><a href="https://github.com/shirou/gopsutil"> github.com/shirou/gopsutil </a></td><td> BSD-3-Clause </td></tr>
          <tr><td><a href="https://github.com/skratchdot/open-golang"> github.com/skratchdot/open-golang </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/spf13/cobra"> github.com/spf13/cobra </a></td><td> Apache-2.0 </td></tr>
          <tr><td><a href="https://github.com/spf13/pflag"> github.com/spf13/pflag </a></td><td> BSD-3-Clause </td></tr>
          <tr><td><a href="https://github.com/tevino/abool"> github.com/tevino/abool </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/TheTannerRyan/ring"> github.com/TheTannerRyan/ring </a></td><td> BSD-2-Clause </td></tr>
          <tr><td><a href="https://github.com/tidwall/gjson"> github.com/tidwall/gjson </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/tidwall/match"> github.com/tidwall/match </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/tidwall/pretty"> github.com/tidwall/pretty </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/tidwall/sjson"> github.com/tidwall/sjson </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/umahmood/haversine"> github.com/umahmood/haversine </a></td><td> MIT </td></tr>
          <tr><td><a href="https://github.com/zserge/webview"> github.com/zserge/webview </a></td><td> MIT </td></tr>
          <tr><td>IP Geolocation data partly provided by <a href="https://db-ip.com">DB-IP</a> </td><td> CC-BY-4.0 </td></tr>

        </tbody>
      </table>

    </div>
  </div>
</template>

<script>
/* eslint-disable */

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
