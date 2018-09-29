<template>
  <div id="app">
    <h1>Settings</h1>
    <p v-if="op.loading">
      loading...
    </p>
    <div v-else-if="op.error">
      error: {{ op.error }}
    </div>
    <div v-else>
      <div v-for="(record, key) in op.records">
        <h2>{{ record.Name }} ({{ key }})</h2>
        <p>
          {{ record.Description }}
          <input type="text" :value="record.Value"></input>
          <input type="text" :value="record.DefaultValue"></input>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "Settings",
  data: function () {
    return {
      op: this.$api.qsub("query config")
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
