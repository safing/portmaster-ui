<template>
  <div class="settings">
    <OptionsView
      :configLayers="configLayers"
      :configOptions="configOptions"
      :activeReleaseLevel="activeReleaseLevel"
      :activeExpertiseLevel="activeExpertiseLevel"
    />
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
    return {
      configLayers: {}
    };
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
      // TODO
      console.log("setting " + key + " to " + value); // eslint-disable-line
    },
    selectExpertiseLevel(level) {
      this.$parent.selectExpertiseLevel(level);
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.settings {
  height: 100vh;
  overflow-y: scroll;
  padding: 10px;
}
</style>
