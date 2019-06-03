<template>
  <div class="sl">

    <span class="sl-label">
      <span v-if="sl.IsSet">
        <i v-bind:class="['circle icon', 'profile-level-' + sl.ProfileLevel + '-color']"></i>
      </span>
      <span v-else>
        <i class="circle outline icon"></i>
      </span>

      {{ name }}

      <div style="display: inline-block; width: 50px;">
        <span v-if="sl.IsSet && $parent.editableInLevel(sl.ProfileLevel)" class="sl-trash">
          <i v-on:click="$parent.deleteSecurityLevel()" class="trash alternate outline icon"></i>
        </span>
      </div>
    </span>

    <div class="sl-security-levels">
      <div class="ui icon buttons">
        <button v-on:click="$parent.setSecurityLevel(1)" v-bind:class="['ui button', {'active': sl.SecurityLevel == 1}]"><img src="/assets/icons/level_dynamic.svg" title="Dynamic"></button>
        <button v-on:click="$parent.setSecurityLevel(2)" v-bind:class="['ui button', {'active': sl.SecurityLevel == 2}]"><img src="/assets/icons/level_secure.svg" title="Secure"></button>
        <button v-on:click="$parent.setSecurityLevel(4)" v-bind:class="['ui button', {'active': sl.SecurityLevel == 4}]"><img src="/assets/icons/level_fortress.svg" title="Fortress"></button>
      </div>
    </div>

  </div>
</template>

<script>
export default {
  name: "SecurityLevel",
  props: {
    name: String,
    sl: Object
  },
  methods: {},
  computed: {}
};
</script>

<style scoped lang="scss">
.sl {
  overflow: auto;
}

.sl-label {
  padding: 10px;
  line-height: 37px;
}

.sl-trash {
  padding: 10px;
  opacity: 0.5;
  :hover {
    cursor: pointer;
  }
}

.sl-security-levels {
  float: right;
  padding: 2px;
  margin-left: 20px;
  button {
    padding: 5px 8px !important;
  }
  img {
    height: 25px;
  }
}
</style>
