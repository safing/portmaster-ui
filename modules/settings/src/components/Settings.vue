<template>
  <div style="padding: 40px;">
    <h1>Settings</h1>
    <p v-if="op.loading">
      loading...
    </p>
    <div v-else-if="op.error">
      error: {{ op.error }}
    </div>
    <div v-else>

      <div class="ui three column center aligned middle aligned grid">
        <div class="row" style="padding: 6px 0;">
          <div class="column" style="text-align: left;">
            <h3>
              <i class="cog icon"></i>
              Section
            </h3>
          </div>
          <div class="column">
            <h4>
              User
            </h4>
          </div>
          <div class="column">
            <h4>
              Default
            </h4>
          </div>
        </div>

        <Option v-for="(record, rKey) in op.records" v-bind:key="rKey" v-bind:rKey="rKey" v-bind:record="record"/>

      </div>
    </div>
  </div>
</template>

<script>
import Option from "./Option.vue";

export default {
  name: "Settings",
  components: {
    Option
  },
  data() {
    return {
      op: this.$api.qsub("query config")
    };
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.grid {
  padding: 40px;
}
</style>
