<template>
  <span>

    <div class="ui inline form" v-if="displayDefault">
      <div class="field">
        <textarea rows="2" :value="DefaultValue" readonly></textarea>
      </div>
    </div>

    <div class="ui action input" v-else-if="!editing || successState">
      <div class="ui inline form">
        <div class="field">
          <textarea rows="2" :value="Value" readonly></textarea>
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
    successState: Boolean,
    errorState: Boolean,
    displayDefault: Boolean
  },
  data() {
    return {
      newValue: this.record.hasOwnProperty("Value")
        ? this.record.Value.join(", ")
        : "",
      editing: false
    };
  },
  computed: {
    Value() {
      return this.record.hasOwnProperty("Value")
        ? this.record.Value.join(", ")
        : "";
    },
    DefaultValue() {
      return this.record.DefaultValue.join(", ");
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
