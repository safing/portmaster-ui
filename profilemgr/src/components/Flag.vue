<template>
  <div class="flag">

    <span class="flag-label">
      <span v-if="flag.IsSet">
        <i v-bind:class="['circle icon', 'profile-level-' + flag.ProfileLevel + '-color']"></i>
      </span>
      <span v-else>
        <i class="circle outline icon"></i>
      </span>

      {{ name }}

      <span v-if="flag.IsSet && $parent.editableInLevel(flag.ProfileLevel)" class="flag-trash">
        <i v-on:click="$parent.deleteFlag(flag.ID)" class="trash alternate outline icon"></i>
      </span>
    </span>

    <div class="flag-security-levels">

      <div class="ui icon buttons">
        <button v-on:click="$parent.setFlag(flag.ID, flag.SecurityLevels^1)" v-bind:class="['ui button', {'active': (flag.SecurityLevels&1) > 0}]"><img src="/assets/icons/security_levels/level_dynamic.svg" title="Dynamic"></button>
        <button v-on:click="$parent.setFlag(flag.ID, flag.SecurityLevels^2)" v-bind:class="['ui button', {'active': (flag.SecurityLevels&2) > 0}]"><img src="/assets/icons/security_levels/level_secure.svg" title="Secure"></button>
        <button v-on:click="$parent.setFlag(flag.ID, flag.SecurityLevels^4)" v-bind:class="['ui button', {'active': (flag.SecurityLevels&4) > 0}]"><img src="/assets/icons/security_levels/level_fortress.svg" title="Fortress"></button>
      </div>
    </div>

  </div>
</template>

<script>
export default {
  name: "Flag",
  props: {
    name: String,
    flag: Object,
  },
  methods: {},
  computed: {}
};
</script>

<style scoped lang="scss">
.flag {
  overflow: auto;
}

.flag-label {
  padding: 10px;
  line-height: 37px;
}

.flag-trash {
  padding: 10px;
  opacity: 0.5;
  :hover {
    cursor: pointer;
  }
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
