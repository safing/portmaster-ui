<template>
  <ul>
    <li v-for="process in processes">
      <strong>{{ process.data.Pid }}</strong>: {{ process.data.CmdLine }}
      <ChildProcessList v-if="process.childProcesses" v-bind:processes="process.childProcesses"></ChildProcessList>
    </li>
  </ul>
</template>

<script>
export default {
  name: "ChildProcessList",
  props: {
    processes: Array
  }
};
</script>

<style scoped lang="scss">
</style>
