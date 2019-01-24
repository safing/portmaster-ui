<template>
  <span>

    <div class="ui toggle checkbox no-input" v-if="displayDefault">
      <input tabindex="0" class="hidden" type="checkbox" v-model="record.DefaultValue">
      <label>{{ record.Name }}</label>
    </div>

    <div v-else-if="!editing || successState">
      <div class="ui toggle checkbox no-input">
        <input tabindex="0" class="hidden" type="checkbox" v-model="record.Value">
        <label>{{ record.Name }}</label>
      </div>

      <div class="ui icon buttons">
        <button class="ui button" v-on:click="startEdit">
          <i class="edit icon"></i>
        </button>
        <button class="ui button" v-on:click="deleteValue">
          <i class="trash icon"></i>
        </button>
      </div>
    </div>

    <div v-else>
      <div :id="checkboxID" class="ui toggle checkbox">
        <input tabindex="0" class="hidden" type="checkbox" v-model="newValue">
        <label>{{ record.Name }}</label>
      </div>
      
      <div class="ui icon buttons">
        <button class="ui button" v-on:click="updateValue">
          <i class="check icon"></i>
        </button>
        <button class="ui button" v-on:click="endEdit">
          <i class="cancel icon"></i>
        </button>
      </div>
    </div>

  </span>
</template>

<script>
export default {
  name: "OptionBoolean",
  props: {
    record: Object,
    successState: Boolean,
    errorState: Boolean,
    displayDefault: Boolean
  },
  data() {
    return {
      newValue: this.record.Value,
      editing: false
    };
  },
  computed: {
    checkboxID() {
      return this._uid + "_checkbox";
    }
  },
  methods: {
    updateValue() {
      this.$parent.updateValue(this.newValue);
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
  },
  updated() {
    $("#" + this.checkboxID).checkbox();
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.ui.icon.buttons {
  margin-left: 40px;
}

.no-input {
  pointer-events: none;
}
</style>
