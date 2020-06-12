<template>
  <div id="app">
    <Base v-bind:basePath="basePath" />
  </div>
</template>

<script>
import Base from "./components/Base.vue";

export default {
  name: "app",
  components: {
    Base,
  },
  data() {
    return {
      basePath: process.env.NODE_ENV === "development" ? "http://127.0.0.1:817" : "",
    };
  },
};
</script>

<style>
@import "../../../assets/themed/fomantic/semantic.min.css";
</style>
