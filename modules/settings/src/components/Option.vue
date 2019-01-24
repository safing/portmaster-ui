<template>

  <div class="row" style="margin-top: 40px;">
    <div class=" column" style="text-align: left;">
      <h5>
        {{ record.Name }}
      </h5>
      {{ record.Description }}
    </div>

    <div v-bind:class="[inactiveState ? 'inactive' : '', 'column']">

      <!-- Status -->
      <span style="width: 10px; margin-right: 10px;">
        <i class="big green check icon" v-if="successState"></i>
        <i class="big red x icon" v-else-if="errorState"></i>
      </span>

      <!-- Value -->
      <div class="ui active inverted dimmer" v-if="loadingState">
        <div class="ui text loader">Loading</div>
      </div>

      <OptionBoolean v-if="record.OptType == optTypeBool" :record="record" :successState="successState" :errorState="errorState"></OptionBoolean>
      <OptionIntSecurityLevel v-else-if="record.ExternalOptType == 'security level'" :record="record" :successState="successState" :errorState="errorState"></OptionIntSecurityLevel>
      <OptionInt v-else-if="record.OptType == optTypeInt" :record="record" :successState="successState" :errorState="errorState"></OptionInt>
      <OptionStringArrayCountries v-else-if="record.ExternalOptType == 'country list'" :record="record" :successState="successState" :errorState="errorState"></OptionStringArrayCountries>
      <OptionStringArray v-else-if="record.OptType == optTypeStringArray" :record="record" :successState="successState" :errorState="errorState"></OptionStringArray>
      <OptionStringSelect v-else-if="record.ExternalOptType == 'string list'" :record="record" :successState="successState" :errorState="errorState"></OptionStringSelect>
      <OptionString v-else :record="record" :successState="successState" :errorState="errorState"></OptionString>

      <div v-if="validationError" class="ui error message">
        <div class="header">Validation failed</div>
        <p>{{ validationError }}</p>
      </div>
      <div v-else-if="request.error" class="ui error message">
        <div class="header">Rejected by Portmaster</div>
        <p>{{ request.error }}</p>
      </div>

    </div>

    <!-- Default Value -->
    <div v-bind:class="[!inactiveState ? 'inactive' : '', 'column']">

      <OptionBoolean v-if="record.OptType == optTypeBool" :record="record" :displayDefault="true"></OptionBoolean>
      <OptionIntSecurityLevel v-else-if="record.ExternalOptType == 'security level'" :record="record" :displayDefault="true"></OptionIntSecurityLevel>
      <OptionInt v-else-if="record.OptType == optTypeInt" :record="record" :displayDefault="true"></OptionInt>
      <OptionStringArray v-else-if="record.OptType == optTypeStringArray" :record="record" :displayDefault="true"></OptionStringArray>
      <OptionString v-else :record="record" :displayDefault="true"></OptionString>

    </div>
  </div>

</template>

<script>
import OptionString from "./OptionString.vue";
import OptionStringSelect from "./OptionStringSelect.vue";
import OptionStringArray from "./OptionStringArray.vue";
import OptionStringArrayCountries from "./OptionStringArrayCountries.vue";
import OptionBoolean from "./OptionBoolean.vue";
import OptionIntSecurityLevel from "./OptionIntSecurityLevel.vue";
import OptionInt from "./OptionInt.vue";

export default {
  name: "Option",
  components: {
    OptionString,
    OptionStringSelect,
    OptionStringArray,
    OptionStringArrayCountries,
    OptionBoolean,
    OptionIntSecurityLevel,
    OptionInt
  },
  props: {
    rKey: String,
    record: Object
  },
  data() {
    return {
      newValue: this.record.Value,
      validationError: "",
      request: {},
      optTypeString: 1,
      optTypeStringArray: 2,
      optTypeInt: 3,
      optTypeBool: 4
    };
  },
  computed: {
    successState() {
      if (this.request.success === true) {
        return true;
      }
      return false;
    },
    errorState() {
      if (this.validationError !== "") {
        return true;
      }
      if (this.request.hasOwnProperty("error") && this.request.error !== "") {
        return true;
      }
      return false;
    },
    loadingState() {
      if (
        this.request.hasOwnProperty("success") &&
        this.request.success === false &&
        this.request.error === ""
      ) {
        return true;
      }
      return false;
    },
    inactiveState() {
      if (this.record.hasOwnProperty("Value") && this.record.Value !== null) {
        return false;
      }
      return true;
    }
  },
  methods: {
    updateValue(newValue, error) {
      if (error != undefined) {
        this.validationError = error;
        return;
      }

      // regex
      if (
        this.record.ValidationRegex != undefined &&
        this.record.ValidationRegex != ""
      ) {
        var re = new RegExp(this.record.ValidationRegex);

        switch (typeof newValue) {
          case "string":
            if (!re.test(newValue)) {
              this.validationError =
                "validation regex `" + this.record.ValidationRegex + "` failed";
              return;
            }
            break;
          case "number":
            if (!re.test(String(newValue))) {
              this.validationError =
                "validation regex `" + this.record.ValidationRegex + "` failed";
              return;
            }
            break;
          case "object":
            var vm = this;
            newValue.forEach(function(val) {
              if (!re.test(val)) {
                vm.validationError =
                  "validation regex `" +
                  vm.record.ValidationRegex +
                  "` failed for value " +
                  val;
                return;
              }
            });
            break;
          case "boolean":
            break;
          default:
            this.validationError = "invalid value (internal error: wrong type)";
            return;
        }
      }
      this.validationError = "";

      var data = {
        Value: newValue
      };
      // var rec = this.record
      // Object.keys(rec).forEach(function(key) {
      //   data[key] = rec[key]
      // });
      // data.Value = newValue

      this.request = this.$api.insert(this.rKey, data);
    },
    deleteValue() {
      this.request = this.$api.insert(this.rKey, { Value: null });
    },
    resetState() {
      this.validationError = "";
      this.request = {};
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.input {
  margin-left: 20px;
}

.inactive.column {
  opacity: 0.6;
}

.row:hover .inactive.column {
  opacity: 1;
}
</style>
