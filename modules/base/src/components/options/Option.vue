<template>
  <div class="row" style="margin-top: 0px;">
    <div class=" column" style="text-align: left;">
      <h5>
        <span
          v-if="record.ExpertiseLevel == 1"
          data-tooltip="Changing this setting may impair or break Portmaster functionality."
          data-position="right center"
        >
          <i class="ui yellow exclamation icon"></i>
        </span>
        <span
          v-if="record.ExpertiseLevel == 2"
          data-tooltip="Changing this setting may have a disastrous impact on Portmaster. Only change if you really know what you are doing."
          data-position="right center"
        >
          <i class="ui red radiation icon"></i>
        </span>
        {{ record.Name }}
        <span
          v-if="record.RequiresRestart"
          data-tooltip="Requires (manually) restarting the Portmaster in order to take effect."
          data-position="right center"
        >
          <i class="ui blue redo icon"></i>
        </span>
        <div
          v-if="record.ReleaseLevel == 1"
          data-tooltip="This feature/setting is in beta and changing it might not work as expected."
          class="ui yellow tiny label"
        >
          Beta
        </div>
        <div
          v-if="record.ReleaseLevel == 2"
          data-tooltip="This feature/setting is experimental and changing it might not work as expected or have an unforeseen, potentially disastrous impact."
          class="ui red tiny label"
        >
          Experimental
        </div>
      </h5>
      {{ record.Description }}
      <div v-if="record.Help" v-on:click="showHelp = !showHelp" class="ui small button">
        Input Help
      </div>
      <!-- TODO: replace with interactive version -->
      <div v-else-if="rKey == 'config:filter/lists'" v-on:click="showHelp = !showHelp" class="ui small button">
        Show Available Filter Lists
      </div>
    </div>

    <div v-bind:class="[activeState() ? 'active' : 'inactive', 'column']">
      <i v-bind:class="[activeState() ? 'green' : 'grey outline', 'circle icon']"></i>

      <!-- Status -->
      <span style="width: 10px; margin-right: 10px;">
        <i class="big green check icon" v-if="successState"></i>
        <i class="big red x icon" v-else-if="errorState"></i>
      </span>

      <!-- Value -->
      <div class="ui active inverted dimmer" v-if="loadingState">
        <div class="ui text loader">Loading</div>
      </div>

      <OptionBoolean
        v-if="record.OptType == optTypeBool"
        :record="record"
        :successState="successState"
        :errorState="errorState"
      ></OptionBoolean>
      <OptionIntSecurityLevel
        v-else-if="record.ExternalOptType == 'security level'"
        :record="record"
        :successState="successState"
        :errorState="errorState"
      ></OptionIntSecurityLevel>
      <OptionInt
        v-else-if="record.OptType == optTypeInt"
        :record="record"
        :successState="successState"
        :errorState="errorState"
      ></OptionInt>
      <OptionStringArray
        v-else-if="record.ExternalOptType == 'endpoint list'"
        :record="record"
        :successState="successState"
        :errorState="errorState"
      ></OptionStringArray>
      <OptionStringArray
        v-else-if="record.ExternalOptType == 'filter list'"
        :record="record"
        :successState="successState"
        :errorState="errorState"
      ></OptionStringArray>
      <OptionStringArrayCountries
        v-else-if="record.ExternalOptType == 'country list'"
        :record="record"
        :successState="successState"
        :errorState="errorState"
      ></OptionStringArrayCountries>
      <OptionStringArray
        v-else-if="record.OptType == optTypeStringArray"
        :record="record"
        :successState="successState"
        :errorState="errorState"
      ></OptionStringArray>
      <OptionStringSelect
        v-else-if="record.ExternalOptType == 'string list'"
        :record="record"
        :successState="successState"
        :errorState="errorState"
      ></OptionStringSelect>
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
    <div v-bind:class="[!activeState() ? 'active' : 'inactive', 'column']">
      <i v-bind:class="[!activeState() ? 'green' : 'grey outline', 'circle icon']"></i>

      <OptionBoolean v-if="record.OptType == optTypeBool" :record="record" :displayDefault="true"></OptionBoolean>
      <OptionIntSecurityLevel
        v-else-if="record.ExternalOptType == 'security level'"
        :record="record"
        :displayDefault="true"
      ></OptionIntSecurityLevel>
      <OptionInt v-else-if="record.OptType == optTypeInt" :record="record" :displayDefault="true"></OptionInt>
      <OptionStringArray
        v-else-if="record.OptType == optTypeStringArray"
        :record="record"
        :displayDefault="true"
      ></OptionStringArray>
      <OptionString v-else :record="record" :displayDefault="true"></OptionString>
    </div>

    <div v-if="showHelp" class="sixteen wide column">
      <div v-if="record.Help" class="ui raised segment help-popup">
        <div class="ui top left attached label">Input Help for {{ record.Name }}</div>
        <div v-on:click="showHelp = false" class="ui top right attached label" style="cursor: pointer;">
          <i class="times icon"></i>
        </div>
        <p>
          {{ record.Help }}
        </p>
      </div>

      <!-- TODO: replace with interactive version -->
      <div v-else-if="rKey == 'config:filter/lists'" class="ui raised segment help-popup">
        <div class="ui top left attached label">Input Help for {{ record.Name }}</div>
        <div v-on:click="showHelp = false" class="ui top right attached label" style="cursor: pointer;">
          <i class="times icon"></i>
        </div>
        <p>
          Categories:<br /><br />
          <strong>TRAC</strong>: Ads & Trackers<br />
          Services that track and profile people online.<br />
          <span style="margin-left: 20px;"></span><strong>ADS</strong>: Ads<br />
          <span style="margin-left: 20px;"></span>Services that serve ads and track their audiences.<br />
          <span style="margin-left: 20px;"></span><strong>ALYTC</strong>: Analytics<br />
          <span style="margin-left: 20px;"></span>Services that provide visitor analysis/profiling.<br />
          <span style="margin-left: 20px;"></span><strong>TELEM</strong>: Telemetry<br />
          <span style="margin-left: 20px;"></span>Services that collect application telemetry.<br />
          <span style="margin-left: 20px;"></span><strong>TRACO</strong>: Other<br />
          <span style="margin-left: 20px;"></span>Services that are believed to serve ads or track use but their exact
          use is unknown or not categorized.<br />
          <strong>MAL</strong>: Malware<br />
          Services that are (ab)used for attacking devices through technical means.<br />
          <strong>DECEP</strong>: Deception<br />
          Services that trick humans into thinking the service is genuine, while it is not. There is no malware
          involved.<br />
          <span style="margin-left: 20px;"></span><strong>PHISH</strong>: Phishing<br />
          <span style="margin-left: 20px;"></span>Services that engage in password fishing.<br />
          <span style="margin-left: 20px;"></span><strong>FAKEN</strong>: Fake News<br />
          <span style="margin-left: 20px;"></span>Services that deliberately provide wrong information.<br />
          <span style="margin-left: 20px;"></span><strong>FRAUD</strong>: Fraud<br />
          <span style="margin-left: 20px;"></span>Services that scam people.<br />
          <strong>BAD</strong>: Bad Stuff (Mixed)<br />
          Miscellaneous services that are believed to be harmful to security or privacy, but their exact use is unknown,
          not categorized, or lists <br />have mixed categories. See individual descriptions for more information.<br />
          <strong>NSFW</strong>: NSFW<br />
          Services that are generally not accepted in work environments.<br />
        </p>
      </div>
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
      optTypeBool: 4,
      showHelp: false
    };
  },
  computed: {
    successState() {
return this.request.success;
    },
    errorState() {
      if (this.validationError !== "") {
        return true;
      }
      if (this.request.hasOwnProperty("error") && !!this.request.error) {
        return true;
      }
      return false;
    },
    loadingState() {
      if (this.request.hasOwnProperty("success") && this.request.success === false && this.request.error === "") {
        return true;
      }
      return false;
    }
  },
  methods: {
    activeState() {
      if (this.record.hasOwnProperty("Value") && this.record.Value !== null) {
        return true;
      }
      return false;
    },
    updateValue(newValue, error) {
      if (error != undefined) {
        this.validationError = error;
        return;
      }

      // regex
      if (this.record.ValidationRegex != undefined && this.record.ValidationRegex != "") {
        var re = new RegExp(this.record.ValidationRegex);

        switch (typeof newValue) {
          case "string":
            if (!re.test(newValue)) {
              this.validationError = "validation regex `" + this.record.ValidationRegex + "` failed";
              return;
            }
            break;
          case "number":
            if (!re.test(String(newValue))) {
              this.validationError = "validation regex `" + this.record.ValidationRegex + "` failed";
              return;
            }
            break;
          case "object":
            var vm = this;
            newValue.forEach(function(val) {
              if (!re.test(val)) {
                vm.validationError = "validation regex `" + vm.record.ValidationRegex + "` failed for value " + val;
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
      this.request = this.$api.update(this.rKey, data);
    },
    deleteValue() {
      this.request = this.$api.update(this.rKey, { Value: null });
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

.active.column {
  // background-color: rgb(48, 219, 148);
  border-radius: 4px;
  padding: 4px;
  .status {
    // color: white;
  }
}
.inactive.column {
  // background-color: rgb(43, 43, 43);
  border-radius: 4px;
  padding: 4px;
  .status {
    // color: grey;
  }
}

.help-popup {
  margin: 20px !important;
  p {
    text-align: left;
    white-space: pre-wrap;
  }
}
</style>
