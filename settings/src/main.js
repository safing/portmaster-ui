import Vue from "vue";
import App from "./App.vue";
import PortAPI from "./portapi.js"

Vue.config.productionTip = false;

Vue.use(PortAPI, {
  url: "ws://127.0.0.1:18/api/database/v1",
  debug: true
});

new Vue({
  render: h => h(App),
  // created() {
  //   console.log(this)
  //   this.$options._base.portapi.connect()
  // }
}).$mount("#app");
