<template>
  <div id="app">
    <Cons/>
  </div>
</template>

<script>
import Cons from "./components/Console.vue";

export default {
  name: "app",
  components: {
    Cons
  }
};
</script>

<style>
@import "../../../assets/themed/fomantic/semantic.min.css";
</style>
