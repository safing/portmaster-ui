<template>
  <div class="support">
    <div class="ui basic segment">
      <h2>Support</h2>

      <p>
        Community Support is available. As soon as we start with the SPN, customers will receive direct priority
        support.
      </p>

      <h3>Get Help</h3>

      <p>You can ask for help on our <a href="https://www.reddit.com/r/safing">Subreddit r/safing</a>.</p>

      <h3>Report Bugs</h3>

      <p>
        Please report bugs in the User Interface in the
        <a href="https://github.com/safing/portmaster-ui/issues">safing/portmaster-ui Github repo</a>, and bugs in the
        Portmaster Core in the <a href="https://github.com/safing/portmaster/issues">safing/portmaster Github repo</a>.
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: "Support",
  components: {},
  data() {
    return {};
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.support {
  height: 100vh;
  overflow-y: scroll;
  padding: 10px;
}
</style>
