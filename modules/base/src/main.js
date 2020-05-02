import Vue from "vue";
import App from "./App.vue";
import PortAPI from "../../../assets/js/portapi.js";
import jQuery from "jquery";

// load jquery
window.$ = jQuery;
window.jQuery = jQuery;
Vue.config.productionTip = false;

// load css
require("../../../assets/themed/fomantic/semantic.min.js");

// load portbase api
Vue.use(PortAPI, {
  url: "ws://127.0.0.1:817/api/database/v1",
  debug: true
});

// handle URLs via OS
function handleClick(e) {
  var target = e.target || e.srcElement;
  if (target.tagName === "A") {
    // do not navigate
    e.preventDefault();
    // open with OS
    var href = target.getAttribute("href");
    if (typeof openWithOS !== 'undefined') { // eslint-disable-line
      openWithOS(href); // eslint-disable-line
    } else {
      window.location.href = href;
    }
  }
}
// listen for clicks
if (document.addEventListener) {
  document.addEventListener("click", handleClick);
} else if (document.attachEvent) {
  document.attachEvent("onclick", handleClick);
}

// render app
new Vue({
  render: h => h(App)
}).$mount("#app");
