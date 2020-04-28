<template>
  <div>
    <h2>
      Settings

      <div class="ui right floated icon buttons">
        <button class="ui disabled button">Expertise Level</button>
        <button
          v-bind:class="[activeExpertiseLevel == 0 ? 'blue' : '', 'ui button']"
          v-on:click="$parent.selectExpertiseLevel(0)"
          data-tooltip="User"
          data-position="bottom center"
        >
          <i class="smile beam outline icon"></i>
        </button>
        <button
          v-bind:class="[activeExpertiseLevel == 1 ? 'blue' : '', 'ui button']"
          v-on:click="$parent.selectExpertiseLevel(1)"
          data-tooltip="Expert"
          data-position="bottom center"
        >
          <i class="exclamation icon"></i>
        </button>
        <button
          v-bind:class="[activeExpertiseLevel == 2 ? 'blue' : '', 'ui button']"
          v-on:click="$parent.selectExpertiseLevel(2)"
          data-tooltip="Developer"
          data-position="bottom center"
        >
          <i class="radiation icon"></i>
        </button>
      </div>
    </h2>
    <span class="ui small text">
      <i class="green circle icon"></i>
      means active
    </span>

    <!-- padding alignment fix -->
    <div style="padding-top: 10px;"></div>

    <p v-if="!configOptions">
      loading...
    </p>
    <div v-else>
      <div v-for="section in sections" v-bind:key="section.key">
        <div v-if="section.layeredOptions" class="ui three column center aligned middle aligned grid">
          <div class="row" style="padding-top: 70px;">
            <div class="column" style="text-align: left;">
              <h3>
                <i v-bind:class="[section.icon, 'icon']"></i>
                {{ section.name }}
              </h3>
            </div>
            <div class="column">
              <h4>
                {{ editColumnName }}
              </h4>
            </div>
            <div class="column">
              <h4>
                {{ defaultColumnName }}
              </h4>
            </div>
          </div>

          <Option
            v-for="layeredOption in section.layeredOptions"
            :key="layeredOption.key"
            :option="layeredOption.option"
            :optionValue="layeredOption.value"
            :optionDefaultValue="layeredOption.defaultValue"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Option from "./Option.vue";

export default {
  name: "OptionsView",
  components: {
    Option
  },
  props: {
    editColumnName: String,
    defaultColumnName: String,
    configLayer: Object,
    configLayerID: String,
    configOptions: Object,
    activeReleaseLevel: Number,
    activeExpertiseLevel: Number
  },
  data() {
    return {
      sectionTemplate: {
        core: {
          name: "Core",
          scopes: ["core", "api"],
          icon: "certificate"
        },
        dns: {
          name: "Secure DNS",
          scopes: ["dns"],
          icon: "globe"
        },
        filter: {
          name: "Privacy Filter",
          scopes: ["filter"],
          icon: "fire alternate"
        }
      }
    };
  },
  computed: {
    sections() {
      // reset
      for (const section of Object.values(this.sectionTemplate)) {
        section.layeredOptions = null;
      }
      // add options
      for (const [key, option] of Object.entries(this.configOptions)) {
        if (option.ExpertiseLevel <= this.activeExpertiseLevel && option.ReleaseLevel <= this.activeReleaseLevel) {
          var section = this.getSection(key);
          if (!section.layeredOptions) {
            section.layeredOptions = [];
          }
          section.layeredOptions.push(this.createLayeredOption(option));
        }
      }
      // sort
      for (const section of Object.values(this.sectionTemplate)) {
        if (section.layeredOptions) {
          section.layeredOptions.sort(function(a, b) {
            return a.option.Order - b.option.Order;
          });
        }
      }
      // return
      return this.sectionTemplate;
    },
    flattenedConfigLayer() {
      var flattened = {};
      if (this.configLayer) {
        this.flattenConfigObject(flattened, this.configLayer);
      }
      return flattened;
    }
  },
  methods: {
    flattenConfigObject(rootMap, subMap, subKey) {
      for (const [key, entry] of Object.entries(subMap)) {
        // get next level key
        var subbedKey = key;
        if (subKey) {
          subbedKey = subKey + "/" + key;
        }
        // check for next subMap
        if (entry.constructor === Object) {
          this.flattenConfigObject(rootMap, entry, subbedKey);
        } else {
          rootMap[subbedKey] = entry;
        }
      }
    },
    createLayeredOption(option) {
      // check if we have a layer
      if (this.configLayer) {
        return {
          key: this.configLayerID + ":" + option.Key,
          option: option,
          value: this.flattenedConfigLayer[option.Key],
          defaultValue: option.Value ? option.Value : option.DefaultValue
        };
      }
      // else return the global version
      return {
        key: "global:" + option.Key,
        option: option,
        value: option.Value,
        defaultValue: option.DefaultValue
      };
    },
    setConfig(key, value) {
      // proxy to parent
      return this.$parent.setConfig(key, value);
    },
    getSection(key) {
      var sectionKey = key.split("/", 1)[0].substring(7); // take first part, remove "config:"
      var section = null;
      // search for section
      for (const s of Object.values(this.sectionTemplate)) {
        if (s.scopes.includes(sectionKey)) {
          section = s;
          break;
        }
      }
      // return found section
      if (section) {
        section.key = sectionKey;
        return section;
      }
      // auto-create section
      section = {
        key: sectionKey,
        scopes: [sectionKey],
        name: sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
        icon: "code"
      };
      this.sectionTemplate[sectionKey] = section;
      return section;
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
.grid {
  padding-bottom: 10px !important;
  // experiment with row backgrounds
  .row:nth-of-type(2n+3) {
    background-color: #00000008;
  }
}
</style>
