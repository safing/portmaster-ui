<template>
  <div id="app">
    <Monitor/>
  </div>
</template>

<script>
import Monitor from "./components/Monitor.vue";

export default {
  name: "app",
  components: {
    Monitor
  }
};
</script>

<style>
@import "../../../assets/themed/fomantic/semantic.min.css";
</style>
