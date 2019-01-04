<template>
  <div>

    <div class="ui icon buttons flag-security-levels">
      <button v-bind:class="['ui button', {'active': (flag.SecurityLevels&1) > 0}]"><img src="/assets/icons/security_levels/level_dynamic.svg"></button>
      <button v-bind:class="['ui button', {'active': (flag.SecurityLevels&2) > 0}]"><img src="/assets/icons/security_levels/level_secure.svg"></button>
      <button v-bind:class="['ui button', {'active': (flag.SecurityLevels&4) > 0}]"><img src="/assets/icons/security_levels/level_fortress.svg"></button>
    </div>

    <div class="flag-label">
      <span v-if="flag.IsSet">
        <i v-bind:class="['circle icon', 'profile-level-' + flag.ProfileLevel + '-color']"></i>
      </span>
      <span v-else>
        <i class="circle outline icon"></i>
      </span>

      {{ name }}
    </div>

  </div>
</template>

<script>
export default {
  name: "Flag",
  props: {
    name: String,
    flag: Object
  },
  method: {},
  computed: {}
};
</script>

<style scoped lang="scss">
.flag-label {
  padding: 10px;
}

.flag-security-levels {
  padding: 2px;
  float: right;
  button {

    padding: 5px 8px !important;
  }
  img {
    height: 25px;
  }
}
</style>
