<template>
  <span>
    <div class="ui input" v-if="displayDefault">
      <input type="text" :value="optionValue" readonly />
    </div>

    <div class="ui action input" v-else-if="!editing || successState">
      <input type="text" :value="optionValue" readonly />
      <button class="ui icon button" v-on:click="startEdit">
        <i class="edit icon"></i>
      </button>
      <button class="ui icon button" v-on:click="deleteValue">
        <i class="trash icon"></i>
      </button>
    </div>

    <div class="ui action input" v-else>
      <input type="text" v-model="newValue" />
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
  name: "OptionInt",
  props: {
    record: Object,
    optionValue: Number,
    displayDefault: Boolean,
    successState: Boolean,
    errorState: Boolean
  },
  data() {
    return {
      newValue: this.optionValue,
      editing: false
    };
  },
  methods: {
    updateValue() {
      var parsed = parseInt(this.newValue, 10);
      if (isNaN(parsed)) {
        this.$parent.updateValue(parsed, "not a number");
      }
      this.$parent.updateValue(parsed);
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
<style scoped lang="scss"></style>
