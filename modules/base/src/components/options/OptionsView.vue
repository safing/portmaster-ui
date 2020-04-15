<template>
  <div style="padding: 40px;">
    <h2>
      Settings

      <div class="ui right floated icon buttons">
        <button class="ui disabled button">Expertise Level</button>
        <button v-bind:class="[activeExpertiseLevel == 0 ? 'blue' : '', 'ui button']" v-on:click="$parent.selectExpertiseLevel(0)" data-tooltip="User" data-position="bottom center">
            <i class="smile beam outline icon"></i>
        </button>
        <button v-bind:class="[activeExpertiseLevel == 1 ? 'blue' : '', 'ui button']" v-on:click="$parent.selectExpertiseLevel(1)" data-tooltip="Expert" data-position="bottom center">
            <i class="exclamation icon"></i>
        </button>
        <button v-bind:class="[activeExpertiseLevel == 2 ? 'blue' : '', 'ui button']" v-on:click="$parent.selectExpertiseLevel(2)" data-tooltip="Developer" data-position="bottom center">
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
        <div v-if="section.options" class="ui three column center aligned middle aligned grid">
          <div class="row" style="padding-top: 70px;">
            <div class="column" style="text-align: left;">
              <h3>
                <i v-bind:class="[section.icon, 'icon']"></i>
                {{ section.name }}
              </h3>
            </div>
            <div class="column">
              <h4>
                Your Setting
              </h4>
            </div>
            <div class="column">
              <h4>
                Default
              </h4>
            </div>
          </div>

          <Option v-for="(option, optionKey) in section.options" :key="optionKey" :rKey="optionKey" :record="option" />
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
    configLayers: Object,
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
          icon: "certificate",
        },
        dns: {
          name: "Secure DNS",
          scopes: ["dns"],
          icon: "globe",
        },
        filter: {
          name: "Privacy Filter",
          scopes: ["filter"],
          icon: "fire alternate",
        }
      }
    };
  },
  computed: {
    sections() {
      // reset
      for (const section of Object.values(this.sectionTemplate)) {
        section.options = null;
      }
      // add options
      for (const [key, option] of Object.entries(this.configOptions)) {
        if (option.ExpertiseLevel <= this.activeExpertiseLevel && option.ReleaseLevel <= this.activeReleaseLevel) {
          var section = this.getSection(key);
          if (!section.options) {
            section.options = {};
          }
          section.options[key] = option;
        }
      }
      // return
      return this.sectionTemplate;
    }
  },
  methods: {
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
      }
      this.sectionTemplate[sectionKey] = section;
      return section;
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.grid {
  padding: 40px;
}
</style>
