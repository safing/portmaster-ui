<template>
  <span>

    <div class="ui input" v-if="displayDefault">
      <input type="text" :value="record.DefaultValue" readonly>
    </div>

    <div class="ui action input" v-else-if="!editing || successState">
      <input type="text" :value="record.Value" readonly>
      <button class="ui icon button" v-on:click="startEdit">
        <i class="edit icon"></i>
      </button>
      <button class="ui icon button" v-on:click="deleteValue">
        <i class="trash icon"></i>
      </button>
    </div>

    <div class="ui action input" v-else>
      <div :id="dropdownID" class="ui selection dropdown">
        <input type="hidden" v-model="newValue">
        <i class="dropdown icon"></i>
        <div class="default text">{{ newValue }}</div>
        <div class="menu">
          <div v-for="(item, index) in selectList" class="item" :key="index" :data-value="item">{{ item }}</div>
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
  name: "OptionStringSelect",
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
    selectList() {
      var trimmed = this.record.ValidationRegex.replace(/[()^$]/g, "");
      var list = trimmed.split("|");
      return list;
    },
    dropdownID() {
      return this._uid + "_dropdown";
    }
  },
  methods: {
    updateValue() {
      this.newValue = $("#" + this.dropdownID)
        .children("input")
        .first()
        .val();
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
    $("#" + this.dropdownID).dropdown();
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.ui.selection.dropdown {
  margin-left: 5px;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
</style>
