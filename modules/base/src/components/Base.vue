<template>
  <div class="main-container">
    <div v-bind:class="['ui basic inverted segment controlbar', {'collapsed': collapsed}]">
      <div>

        <div v-on:click="selectUIModule(0)" class="clickable">
          <i v-if="!status" class="massive question circle outline icon" style="font-size: 12rem; color: #444;"></i>
          <img v-else-if="status.ActiveSecurityLevel == 1" class="img" src="/assets/icons/security_levels/level_dynamic.svg" style="height: 14rem;"></img>
          <img v-else-if="status.ActiveSecurityLevel == 2" class="img" src="/assets/icons/security_levels/level_secure.svg" style="height: 14rem;"></img>
          <img v-else-if="status.ActiveSecurityLevel == 4" class="img" src="/assets/icons/security_levels/level_fortress.svg" style="height: 14rem;"></img>
          <i v-else class="massive question circle outline icon" style="font-size: 12rem; color: #444;"></i>
        </div>

        <div class="ui two column grid">
          <div class="column" style="padding: 0;">
            <div v-on:click="selectUIModule(0)" class="clickable gateButton gate_off">
              <img class='ui circular image' src='/assets/icons/gate17.svg' style='margin:0; height: 4rem; padding: 0 0 0 22px;'></img>
            </div>
          </div>
          <div class="right aligned column" style="padding: 0;">
            <div v-on:click="collapsed = !collapsed" class="ui circular icon button clickable collapseButton" href="#" style="">
              <i v-bind:class="['angle double icon', {'right': collapsed, 'left': !collapsed}]" id="Btn"></i>
            </div>
          </div>
        </div>

        <div v-on:click="selectUIModule(0); collapsed = false;" class="ui basic inverted segment mess center aligned clickable">
          <div v-if="!apiInfo.connected">
            <i class="orange info icon mess"></i>
            <span class="wide-text">Connecting to Portmaster...</span>
          </div>
          <div v-else>
            <i class="green check circle outline icon mess"></i>
            <span class="wide-text">Everything OK.</span>
          </div>
          <!-- <div>
            <i class="red exclamation icon mess"></i>
            <span class="wide-text">Detected ...</span>
          </div>
          <div>
            <i class="orange info icon mess"></i>
            <span class="wide-text">3 Notifications</span>
          </div> -->
        </div>

        <!-- <div class="ui vertical fluid inverted menu"  style=""> -->
        <div class="ui secondary vertical fluid inverted pointing menu"  style="">
          <div v-for="(uiMod, index) in uiModules" v-bind:key="index" v-on:click="selectUIModule(index)" v-bind:class="[{'active': activeModule == uiMod.url}, 'item', 'uiModuleItem']">
            <h4>
              <div v-bind:class="['uiIndicator', {'loaded': uiMod.loaded && uiMod.url != '-'}]">
                <i class="blue tiny circle middle aligned icon loadedIcon"></i>
                <i v-on:click.stop="killUIModule(index)" class="blue times icon killIcon"></i>
              </div>
              <i v-bind:class="[uiMod.icon, 'icon', 'moduleIcon']"></i>
              <span class="wide-text">{{ uiMod.name }}</span>
            </h4>
          </div>
        </div>

      </div>

      <div class="ui list bottom-stats" id="stats" style="width: 100%; padding: 1rem;">
        <div class="ui divider" style=""></div>
        <div class="item" style="text-align: center;">
          <span v-if="apiInfo.connected" class="ui center aligned">
            connected.
          </span>
          <span v-else class="ui red text">
            not connected.
          </span>
        </div>
      </div>

    </div>

    <div class="content-pane">
      <div v-for="uiMod in uiModules" v-bind:key="uiMod.url" v-show="uiMod.url == activeModule" class="content-pane-item">
        <Dashboard v-if="uiMod.url == '-'"></Dashboard>
        <iframe v-else-if="uiMod.loaded" v-bind:src="basePath + uiMod.url"></iframe>
      </div>
    </div>
  </div>

</template>

<script>
import Dashboard from "./Dashboard.vue";

export default {
  name: "Base",
  components: {
    Dashboard
  },
  props: {
    basePath: String
  },
  data() {
    return {
      op: this.$api.qsub("query core:status/"),
      activeModule: "-",
      collapsed: false,
      apiInfo: this.$api.info(),
      uiModules: [
        {
          name: "Dashboard",
          url: "-",
          icon: "table",
          loaded: true
        },
        {
          name: "Profile Manager",
          url: "/ui/modules/profilemgr/",
          icon: "user",
          loaded: false
        },
        {
          name: "Monitor",
          url: "/ui/modules/monitor/",
          icon: "eye",
          loaded: false
        },
        {
          name: "Settings",
          url: "/ui/modules/settings/",
          icon: "cog",
          loaded: false
        }
      ]
    };
  },
  computed: {
    status() {
      return this.op.records["core:status/status"];
    }
  },
  methods: {
    selectUIModule(index) {
      this.uiModules[index].loaded = true;
      this.activeModule = this.uiModules[index].url;
    },
    killUIModule(index) {
      this.uiModules[index].loaded = false;
      if (this.activeModule == this.uiModules[index].url) {
        this.activeModule = "-";
      }
    },
    updateModuleHelpFlag() {
//       function getIframeWindow(iframe_object) {
//   var doc;
//
//   if (iframe_object.contentWindow) {
//     return iframe_object.contentWindow;
//   }
//
//   if (iframe_object.window) {
//     return iframe_object.window;
//   }
//
//   if (!doc && iframe_object.contentDocument) {
//     doc = iframe_object.contentDocument;
//   }
//
//   if (!doc && iframe_object.document) {
//     doc = iframe_object.document;
//   }
//
//   if (doc && doc.defaultView) {
//    return doc.defaultView;
//   }
//
//   if (doc && doc.parentWindow) {
//     return doc.parentWindow;
//   }
// 
//   return undefined;
// }
// and
//
// ...
// var el = document.getElementById('targetFrame');
//
// var frame_win = getIframeWindow(el);
//
// if (frame_win) {
//   frame_win.reset();
//   ...
// }
// ...
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.main-container {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.uiModuleItem {
  padding-left: 6px !important;

  :hover {
    cursor: pointer;
  }

  .uiIndicator {
    width: 22px;
    // display: inline-flex;
    // align-items: center;
    display: inline-block;
    text-align: center;

    .loadedIcon {
      display: none;
    }
    .killIcon {
      display: none;
    }
  }

  .uiIndicator.loaded {
    .loadedIcon {
      display: inline-block;
    }
  }

  .uiIndicator.loaded:hover {
    cursor: pointer;

    .loadedIcon {
      display: none;
    }
    .killIcon {
      display: inline-block;
      cursor: pointer;
    }
  }

}

.controlbar {
  width: 195px;
  // transition: 0.5s ease-in-out;
  height: 100vh;
  margin: 0 !important;
  padding: 0 !important;
  overflow: inherit !important;
  overflow-x: show !important;
  position: relative !important;
}
.controlbar .menu {
  border-radius: 0;
}
.controlbar .menu .active {
  border-radius: 0;
}
.controlbar.collapsed .wide-text {
  display: none;
}
.controlbar.collapsed .moduleIcon {
  font-size: 1.4rem;
}
.controlbar .collapseButton {
  font-size: 1.3rem;
  margin: 4px 20px 0 0;
}
.controlbar.collapsed .collapseButton {
  font-size: 0.82rem;
  // margin: 0 0 0 25px;
}
.controlbar.collapsed .img {
  height: 5.6rem !important;
}
.controlbar.collapsed .gateButton img {
  height: 2.5rem !important;
  margin: 0 0 0 19px !important;
  padding: 0 !important;
}
.controlbar.collapsed #stats {
  display: none;
}

.bottom-stats{
  position: absolute;
  bottom: 0;
}
.controlbar.collapsed {
  width: 80px;

}
.controlbar.collapsed .mess{
  padding: 4px 0;
  text-align: center;
}
.controlbar.collapsed .menu{
  text-align: center;
}
.active{
  border-color: #2185d0 !important;
  border-right-width: 4px !important;
}
.gate_off {
  -webkit-filter: grayscale(1);
  filter: grayscale(1);
}
.clickable:hover {
  cursor: pointer;
}

.content-pane {
  position: absolute;
  height: 100vh;
  top: 0;
  left: 195px;
  right: 0;
  overflow: hidden;

  .content-pane-item {
    position: relative;
    height: 100%;
    width: 100%;
  }
}
iframe {
  position: relative;
  height: 100%;
  width: 100%;
  border: none;
  margin: 0;
  padding: 0;
}
</style>
