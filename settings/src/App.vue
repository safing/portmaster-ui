<template>
  <div id="app">
    <Settings/>
  </div>
</template>

<script>
import Settings from "./components/Settings.vue";

export default {
  name: "app",
  components: {
    Settings
  }
};
</script>

<style>
@import "../../assets/themed/fomantic/semantic.min.css";
</style>
