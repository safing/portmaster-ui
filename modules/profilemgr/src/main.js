import Vue from "vue";
import App from "./App.vue";
import PortAPI from "../../../assets/js/portapi.js";
import jQuery from "jquery";

window.$ = jQuery;
window.jQuery = jQuery;
Vue.config.productionTip = false;

require("../../../assets/themed/fomantic/semantic.min.js");

Vue.use(PortAPI, {
  url: "ws://127.0.0.1:817/api/database/v1",
  debug: true
});

new Vue({
  render: h => h(App)
  // created() {
  //   console.log(this)
  //   this.$options._base.portapi.connect()
  // }
}).$mount("#app");
