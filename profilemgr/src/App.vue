<template>
  <div id="app">
    <Manager/>
  </div>
</template>

<script>
import Manager from "./components/Manager.vue";

export default {
  name: "app",
  components: {
    Manager
  }
};
</script>

<style>
@import "./assets/themed/fomantic/semantic.min.css";
</style>
