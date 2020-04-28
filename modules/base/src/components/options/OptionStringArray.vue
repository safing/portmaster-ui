<template>
  <span>
    <div class="ui inline form" v-if="displayDefault">
      <div class="field">
        <textarea rows="2" :value="value" readonly></textarea>
      </div>
    </div>

    <div class="ui action input" v-else-if="!editing || successState">
      <div class="ui inline form">
        <div class="field">
          <textarea rows="2" :value="value" readonly></textarea>
        </div>
      </div>
      <button class="ui icon button" v-on:click="startEdit">
        <i class="edit icon"></i>
      </button>
      <button class="ui icon button" v-on:click="deleteValue">
        <i class="trash icon"></i>
      </button>
    </div>

    <div class="ui action input" v-else>
      <div class="ui inline form">
        <div class="field">
          <textarea rows="2" v-model="newValue"></textarea>
        </div>
      </div>
      <button class="ui icon button" v-on:click="updateValue">
        <i class="check icon"></i>
      </button>
      <button class="ui icon button" v-on:click="endEdit">
        <i class="cancel icon"></i>
      </button>
    </div>
  </span>
</template>

<script>
export default {
  name: "OptionStringArray",
  props: {
    record: Object,
    optionValue: Array,
    displayDefault: Boolean,
    successState: Boolean,
    errorState: Boolean
  },
  data() {
    return {
      newValue: this.value,
      editing: false
    };
  },
  computed: {
    value() {
      return (this.optionValue || []).join(", ");
    }
  },
  methods: {
    updateValue() {
      var splitted = this.newValue.split(",");
      for (var i = 0; i < splitted.length; i++) {
        splitted[i] = splitted[i].trim();
      }
      this.$parent.updateValue(splitted);
    },
    deleteValue() {
      this.$parent.deleteValue();
    },
    startEdit(event) {
      this.$parent.resetState();
      this.editing = true;
      $(event.target)
        .siblings("input")
        .focus();
    },
    endEdit() {
      this.$parent.resetState();
      this.editing = false;
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.no-input {
  pointer-events: none;
}
</style>
