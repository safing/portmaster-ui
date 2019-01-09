<template>
  <div class="domain">

    <span class="domain-label">
      <span>
        <i v-if="entry.domain == ''" class="circle outline icon"></i>
        <i v-else v-bind:class="['circle icon', 'profile-level-' + entry.profileLevel + '-color']"></i>
      </span>

      <div class="ui left action input">
        <button v-on:click="$parent.setDomainIncludeSubs(entry.domain, !entry.IncludeSubdomains)" v-bind:class="['ui icon button domain-include-subs', {'blue': entry.IncludeSubdomains, 'disabled': !$parent.editableInLevel(entry.profileLevel)}]">
          <i class="large ellipsis horizontal icon"></i>
        </button>
        <input type="text" v-model="entry.domain" placeholder="Add domain..." v-on:blur="$parent.updateDomain(originalDomain, entry.domain)">
      </div>

      <span v-if="$parent.editableInLevel(entry.profileLevel)" class="domain-trash">
        <i v-on:click="$parent.deleteDomain(entry.domain)" class="trash alternate outline icon"></i>
      </span>

      <div class="domain-decision">
        <button v-on:click="$parent.setDomainDecision(entry.domain, !entry.Permit)" class="ui icon button">
          <i v-if="entry.Permit" class="large check circle icon" style="color: green;"></i>
          <i v-else class="large minus circle icon" style="color: red;"></i>
        </button>
      </div>
    </span>

  </div>
</template>

<script>
export default {
  name: "Domain",
  props: {
    entry: Object
  },
  data() {
    return {
      originalDomain: this.entry.domain
    }
  },
  methods: {},
  computed: {}
};
</script>

<style scoped lang="scss">
.domain {
  overflow: auto;
}

.domain-label {
  padding: 10px;
  line-height: 37px;
}

.domain-include-subs {
  :hover {
    cursor: pointer !important;
  }
}

.domain-trash {
  padding: 10px;
  opacity: 0.5;
  :hover {
    cursor: pointer;
  }
}

.domain-decision {
  float: right;
  .yes {
    color: green;
  }
  .no {
    color: red;
  }
}
</style>
