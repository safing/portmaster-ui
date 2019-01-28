import Vue from "vue";

class Operation {
  constructor(name, type) {
    this.name = name;
    this.type = type;
    this.record = null;
    this.records = {};
    this.loading = true;
    this.success = false;
    this.warnings = [];
    this.error = null;
    this.prepFns = {};
  }
  prepFn(keyPrefix, fn) {
    this.prepFns[keyPrefix] = fn;
    return this;
  }
  prepData(key, obj) {
    for (const [keyPrefix, prepFn] of Object.entries(this.prepFns)) {
      if (key.startsWith(keyPrefix)) {
        prepFn(key, obj)
      }
    }
  }
  updateRecord(key, data) {
    var obj = this.parseObject(key, data);
    this.prepData(key, obj);

    console.log(obj)

    if (this.type == "get") {
      this.record = obj;
    } else {
      Vue.set(this.records, key, obj);
    }
  }
  deleteRecord(key) {
    if (this.type == "get") {
      this.record = null;
    } else {
      Vue.delete(this.records, key);
    }
  }
  parseObject(key, data) {
    if (data[0] == "J") {
      try {
        return JSON.parse(data.slice(1));
      } catch (e) {
        console.warn("failed to parse record (JSON) ${key}: ${e.message}")
        return null;
      }
    }
    console.warn("could not parse ${key}: unknown format ${data[0]}")
    return null;
  }
  cleanLowerCase(obj) {
    for (const [key, value] of Object.entries(obj)) {
      if (key.charAt(0) != key.charAt(0).toUpperCase() || value == null) {
        delete obj[key]
      } else if (value instanceof Object) {
        this.cleanLowerCase(value)
      }
    }
  }
  prepObjectForSubmission(obj) {
    // make copy
    var sub = JSON.parse(JSON.stringify(obj));
    // clean
    this.cleanLowerCase(sub)
    // return
    return sub
  }
}

function install(vue, options) {
  if (!options.hasOwnProperty("url")) {
    console.error("PortAPI requires option 'url'.");
    return;
  }

  // vue.prototype.$queries = {}
  vue.prototype.$api = {
    get(key, name) {
      // 123|get|<key>
      //    123|ok|<key>|<data>
      //    123|error|<message>
      return vue.portapi.newRequest(name, "get", key);
    },
    query(query, name) {
      // 124|query|<query>
      //    124|ok|<key>|<data>
      //    124|done
      //    124|error|<message>
      //    124|warning|<message> // error with single record, operation continues
      return vue.portapi.newRequest(name, "query", query);
    },
    sub(query, name) {
      // 125|sub|<query>
      //    125|upd|<key>|<data>
      //    125|new|<key>|<data>
      //    125|delete|<key>|<data>
      //    125|warning|<message> // error with single record, operation continues
      return vue.portapi.newRequest(name, "sub", query);
    },
    qsub(query, name) {
      // 127|qsub|<query>
      //    127|ok|<key>|<data>
      //    127|done
      //    127|error|<message>
      //    127|upd|<key>|<data>
      //    127|new|<key>|<data>
      //    127|delete|<key>|<data>
      //    127|warning|<message> // error with single record, operation continues
      return vue.portapi.newRequest(name, "qsub", query);
    },

    create(key, data, name) {
      // 128|create|<key>|<data>
      //    128|success
      //    128|error|<message>
      return vue.portapi.newRequest(name, "create", key, data);
    },
    update(key, data, name) {
      // 129|update|<key>|<data>
      //    129|success
      //    129|error|<message>
      return vue.portapi.newRequest(name, "update", key, data);
    },
    insert(key, data, name) {
      // 130|insert|<key>|<data>
      //    130|success
      //    130|error|<message>
      return vue.portapi.newRequest(name, "insert", key, data);
    },
    delete(key, name) {
      // 131|delete|<key>
      //    131|success
      //    131|error|<message>
      return vue.portapi.newRequest(name, "delete", key);
    },
    info() {
      return vue.portapi.info;
    }
  };
  vue.portapi = {
    debug: options.debug == true ? true : false,
    conn: null,
    connected: false,
    requestQueue: [],
    url: options.url,
    requests: {},
    info: {
      connected: false,
    },
    requestCnt: 0,
    connect() {
      vue.portapi.ws = new WebSocket(vue.portapi.url);

      vue.portapi.ws.onopen = function() {
        if (vue.portapi.debug) console.log("connection to api established");

        vue.portapi.connected = true;
        vue.set(vue.portapi.info, 'connected', true);

        // send queued requests
        vue.portapi.requestQueue.forEach(function(requestText) {
          vue.portapi.ws.send(requestText);
          if (vue.portapi.debug)
            console.log("sending queued request: " + requestText);
        });
        vue.portapi.requestQueue = [];
      };

      vue.portapi.ws.onclose = function(event) {
        if (vue.portapi.debug) {
          console.log("connection closed:");
          console.log(event);
        }

        vue.portapi.connected = false;
        vue.set(vue.portapi.info, 'connected', false);

        console.log("lost connection, waiting...");
        setTimeout(function() {
          console.log("reconnecting...");
          vue.portapi.connect();
        }, 1000);
      };

      vue.portapi.ws.onmessage = function(e) {
        var reader = new FileReader();
        reader.onload = function(e) {
          // console.log("DEBUG: recv: " + e.target.result);
          var splitted = e.target.result.split("|");

          // dirty hack :(
          if (splitted.length > 4) {
            splitted[3] = splitted.slice(3).join("|");
          }

          if (splitted.length < 2) {
            console.log("received invalid message: " + e.target.result);
            return;
          }

          var opID = splitted[0];
          var op = vue.portapi.requests[opID];
          if (op == undefined) {
            console.log("no op with ID " + opID);
            return;
          }

          var msgType = splitted[1];
          switch (msgType) {
            case "ok":
              //    127|ok|<key>|<data>
              op.updateRecord(splitted[2], splitted[3])
              console.log(opID + ": ok " + splitted[2]);
              break;
            case "done":
              //    127|done
              op.loading = false;
              break;
            case "success":
              //    127|success
              op.success = true;
              op.loading = false;
              break;
            case "error":
              //    127|error|<message>
              op.error = splitted[2];
              op.loading = false;
              break;
            case "upd":
              //    127|upd|<key>|<data>
              op.updateRecord(splitted[2], splitted[3])
              console.log(opID + ": update " + splitted[2]);
              break;
            case "new":
              //    127|new|<key>|<data>
              op.updateRecord(splitted[2], splitted[3])
              console.log(opID + ": new " + splitted[2]);
              break;
            case "del":
              //    127|del|<key>
              op.deleteRecord(splitted[2])
              console.log(opID + ": delete " + splitted[2]);
              break;
            case "warning":
              //    127|warning|<message> // error with single record, operation continues
              op.warnings.append(splitted[2]);
              break;
            default:
              console.log("received invalid message type: " + e.target.result);
              return;
          }

          // console.log("updated " + opID);
          // console.log(op);
        };
        reader.readAsText(e.data);
      };
    },
    newRequest(name, msgType, msgText, data) {
      if (name == undefined || name == null || name == "") {
        name = "#" + vue.portapi.requestCnt++;
      }
      var op = new Operation(name, msgType);
      vue.portapi.requests[name] = op;

      var requestText = name + "|" + msgType + "|" + msgText;
      if (data != undefined) {
        var cleanedData = op.prepObjectForSubmission(data)
        requestText += "|" + JSON.stringify(cleanedData);
      }

      if (vue.portapi.connected) {
        if (vue.portapi.debug) console.log("sending request: " + requestText);
        vue.portapi.ws.send(requestText);
      } else {
        if (vue.portapi.debug) console.log("queueing request: " + requestText);
        vue.portapi.requestQueue.push(requestText);
      }

      console.log("added " + name);
      return op;
    }
  };

  vue.portapi.connect();
  // setTimeout(function(){
  //   vue.portapi.ws.send("#0|qsub|query config");
  // }, 3000);
}

const PortAPI = {
  install: install
};

export default PortAPI;
