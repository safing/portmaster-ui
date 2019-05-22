<template>
  <div style="padding: 40px;">
    <h2>Settings</h2>
    <p v-if="op.loading">
      loading...
    </p>
    <div v-else-if="op.error">
      error: {{ op.error }}
    </div>
    <div v-else>

      <div v-for="section in sections">
        <div class="ui three column center aligned middle aligned grid">
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
      sectionTemplate: {
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
      return this.sectionTemplate;
    }
  },
  methods: {
    getSectionInfo(key) {
      var sectionKey = key.split("/", 1)[0].substring(7);
      var section = this.sectionTemplate[sectionKey];
      if (section) {
        return section;
      }
      section = {
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
