<template>
  <div style="padding: 40px;">
    <h2>
      Settings
      <div class="ui right floated icon buttons">
        <button class="ui disabled button">Expertise Level</button>
        <button v-bind:class="[activeExpertiseLevel == 1 ? 'blue' : '', 'ui button']" v-on:click="activeExpertiseLevel = 1" data-tooltip="User" data-position="bottom center">
            <i class="smile beam outline icon"></i>
        </button>
        <button v-bind:class="[activeExpertiseLevel == 2 ? 'blue' : '', 'ui button']" v-on:click="activeExpertiseLevel = 2" data-tooltip="Expert" data-position="bottom center">
            <i class="exclamation icon"></i>
        </button>
        <button v-bind:class="[activeExpertiseLevel == 3 ? 'blue' : '', 'ui button']" v-on:click="activeExpertiseLevel = 3" data-tooltip="Developer" data-position="bottom center">
            <i class="radiation icon"></i>
        </button>
      </div>
    </h2>
    <div style="padding-top: 10px;"></div> <!-- padding alignment fix -->
    <p v-if="op.loading">
      loading...
    </p>
    <div v-else-if="op.error">
      error: {{ op.error }}
    </div>
    <div v-else>

      <div v-for="section in sections" v-bind:key="section.key">
        <div v-if="section.expertiseLevel <= activeExpertiseLevel" class="ui three column center aligned middle aligned grid">
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

          <Option v-for="(record, rKey) in section.options" v-bind:key="rKey" v-bind:rKey="rKey" v-bind:record="record"/>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import Option from "./Option.vue";

export default {
  name: "Settings",
  components: {
    Option
  },
  data() {
    return {
      op: this.$api.qsub("query config"),
      activeExpertiseLevel: 2,
      sectionTemplate: {
        core: {
          name: "Universal",
          icon: "certificate",
          options: {}
        },
        intel: {
          name: "DNS / Intel",
          icon: "globe",
          options: {}
        },
        firewall: {
          name: "Firewall",
          icon: "fire alternate",
          options: {}
        },
        api: {
          name: "API / App Interface",
          icon: "sitemap",
          options: {}
        },
        random: {
          name: "Cryptography (RNG)",
          icon: "blender",
          options: {}
        }
      }
    };
  },
  computed: {
    sections() {
      // reset
      for (const [key, section] of Object.entries(this.sectionTemplate)) {
        section.options = {};
      }
      // add options
      for (const [key, record] of Object.entries(this.op.records)) {
        var section = this.getSectionInfo(key);
        section.options[key] = record;
      }
      // calculate minimum exp level for sections
      for (const [key, section] of Object.entries(this.sectionTemplate)) {
        section.expertiseLevel = 3
        for (const [key, option] of Object.entries(section.options)) {
          if (section.expertiseLevel > option.ExpertiseLevel) {
            section.expertiseLevel = option.ExpertiseLevel
          }
        }
      }
      // return
      return this.sectionTemplate;
    }
  },
  methods: {
    getSectionInfo(key) {
      var sectionKey = key.split("/", 1)[0].substring(7);
      var section = this.sectionTemplate[sectionKey];
      if (section) {
        section.key = sectionKey;
        return section;
      }
      section = {
        key: sectionKey,
        name: sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
        icon: "code",
        options: {}
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
