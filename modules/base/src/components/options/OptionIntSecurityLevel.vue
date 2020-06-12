<template>
  <span>
    <div class="ui selection dropdown no-input" v-if="displayDefault">
      <div class="default text">
        <span v-if="optionValue == 0">OFF</span>
        <img v-if="(optionValue & 1) > 0" src="/assets/icons/level_normal.svg" />
        <img v-if="(optionValue & 2) > 0" src="/assets/icons/level_high.svg" />
        <img v-if="(optionValue & 4) > 0" src="/assets/icons/level_extreme.svg" />
      </div>
    </div>

    <div class="ui action input" v-else-if="!editing || successState">
      <div class="ui selection dropdown no-input">
        <div class="default text">
          <span v-if="optionValue == 0">OFF</span>
          <img v-if="(optionValue & 1) > 0" src="/assets/icons/level_normal.svg" />
          <img v-if="(optionValue & 2) > 0" src="/assets/icons/level_high.svg" />
          <img v-if="(optionValue & 4) > 0" src="/assets/icons/level_extreme.svg" />
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
      <div v-bind:id="dropdownID" class="ui selection dropdown">
        <input type="hidden" v-model="newValue" />
        <i class="dropdown icon"></i>
        <div class="default text">{{ newValue }}</div>
        <div class="menu">
          <div class="item" data-value="7">
            <img src="/assets/icons/level_normal.svg" />
            <img src="/assets/icons/level_high.svg" />
            <img src="/assets/icons/level_extreme.svg" />
          </div>
          <div class="item" data-value="6">
            <img src="/assets/icons/level_high.svg" />
            <img src="/assets/icons/level_extreme.svg" />
          </div>
          <div class="item" data-value="4">
            <img src="/assets/icons/level_extreme.svg" />
          </div>
          <div v-if="record.ValidationRegex.includes('0')" class="item" data-value="0">
            OFF
          </div>
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
  name: "OptionInt",
  props: {
    record: Object,
    optionValue: Number,
    displayDefault: Boolean,
    successState: Boolean,
    errorState: Boolean,
  },
  data() {
    return {
      newValue: this.optionValue,
      editing: false,
    };
  },
  computed: {
    dropdownID() {
      return this._uid + "_dropdown";
    },
  },
  methods: {
    updateValue() {
      this.newValue = $("#" + this.dropdownID)
        .children("input")
        .first()
        .val();

      var parsed = parseInt(this.newValue, 10);
      if (isNaN(parsed)) {
        this.$parent.updateValue(parsed, "not a number");
      }
      this.$parent.updateValue(parsed);
    },
    deleteValue() {
      this.$parent.deleteValue();
    },
    startEdit() {
      this.$parent.resetState();
      this.editing = true;
    },
    endEdit() {
      this.$parent.resetState();
      this.editing = false;
      $(event.target).siblings("input").focus();
    },
    setNewValue(number) {
      this.newValue = number;
    },
  },
  updated() {
    $("#" + this.dropdownID).dropdown();
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.no-input {
  pointer-events: none;
}

.action-buttons {
  margin-left: 10px;
}

.ui.selection.dropdown.no-input {
  text-align: center;
  padding: 0.78571429em 1em;
}
</style>
