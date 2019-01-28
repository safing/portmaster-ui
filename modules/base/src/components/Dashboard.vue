<template>

  <div class="content-placeholder">
    <div class="ui grid middle aligned">
      <div class="row">
        <div class="column">
          <h1>Dashboard coming soon</h1>
          <h2>select item on the left</h2>
        </div>
      </div>
    </div>
  </div>

</template>

<script>
export default {
  name: "Dashboard",
  components: {
  },
  data() {
    return {
      // op: this.$api.qsub("query config")
    };
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.content-placeholder {
  position: relative;
  height: 100%;
  width: 100%;
  background-color: #eee;
  .grid {
    position: relative;
    height: 100%;
  }
  h1, h2 {
    text-align: center;
    font-family: sans-serif;
    color: #ccc;
  }
}
</style>
