<template>
  <div class="settings">
    <OptionsView
      :editColumnName="'Your Setting'"
      :defaultColumnName="'Default'"
      :configOptions="configOptions"
      :activeReleaseLevel="activeReleaseLevel"
      :activeExpertiseLevel="activeExpertiseLevel"
    />

    <div class="debugging" style="">
      <h3>Debugging <small>...left here intentionally, for now.</small></h3>
      <pre>{{ configOptions | fmtObject }}</pre>
    </div>
  </div>
</template>

<script>
import OptionsView from "./options/OptionsView.vue";

export default {
  name: "Settings",
  components: {
    OptionsView
  },
  data() {
    return {};
  },
  computed: {
    configOptions() {
      return this.$parent.configDB.records;
    },
    activeReleaseLevel() {
      return this.$parent.activeReleaseLevel;
    },
    activeExpertiseLevel() {
      return this.$parent.activeExpertiseLevel;
    }
  },
  methods: {
    setConfig(key, value) {
      // console.log("setting global " + key + " to " + value); // eslint-disable-line
      // add config: prefix to config key
      key = "config:" + key;
      // send to Portmaster
      return this.$api.update(key, { Value: value });
    },
    selectExpertiseLevel(level) {
      this.$parent.selectExpertiseLevel(level);
    }
  },
  filters: {
    fmtObject(value) {
      return JSON.stringify(value, null, "    ");
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.settings {
  height: 100vh;
  overflow-y: scroll;
  padding: 50px;
}

.debugging {
  margin-top: 200px;
}
</style>
