import Vue from "vue";

class Operation {
  constructor(name, type) {
    this.name = name;
    this.type = type;
    this.isGetReq = type == "get";
    this.record = null;
    this.records = {};
    this.loading = true;
    this.success = false;
    this.warnings = [];
    this.error = null;
    this.prepFns = {};
    // init this.changes
    this.getChanges();
  }
  getChanges() {
    var changes = this.changes;
    this.changes = {
      created: 0,
      updated: 0,
      deleted: 0,
      warnings: 0
    }
    return changes;
  }
  prepFn(keyPrefix, fn) {
    this.prepFns[keyPrefix] = fn;
    return this;
  }
  prepRecord(key, obj) {
    // run through prep fns
    for (const [keyPrefix, prepFn] of Object.entries(this.prepFns)) {
      if (key.startsWith(keyPrefix)) {
        prepFn(key, obj)
      }
    }
  }
  updateRecord(key, data, created) {
    var obj = this.parseObject(key, data);
    if (obj == null) {
      return;
    }

    // set new object
    if (this.isGetReq) {
      // single object
      this.record = obj;
      this.prepRecord(key, this.record);
    } else {
      // query: many objects
      if (created) {
        // set new
        Vue.set(this.records, key, obj);
        this.prepRecord(key, obj);
      } else {
        // update existing
        var existing = this.records[key];
        if (existing) {
          Object.assign(existing, obj);
          this.prepRecord(key, existing);
        } else {
          // if not exists, set new
          Vue.set(this.records, key, obj);
          this.prepRecord(key, obj);
        }
      }
    }
  }
  deleteRecord(key) {
    if (this.isGetReq) {
      if (this.record) {
        this.record._deleted = true; // mark deleted for copied references
      }
      this.record = null;
    } else {
      var recordToDelete = this.records[key];
      if (recordToDelete) {
        recordToDelete._deleted = true; // mark deleted for copied references
      }
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
      if (key.charAt(0) != key.charAt(0).toUpperCase()) {
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
    recvQueue: [],
    recvHandlerScheduled: false,
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
          // add msg to recvQueue
          vue.portapi.recvQueue.push(e.target.result)
          // schedule recvHandler
          if (!vue.portapi.recvHandlerScheduled) {
            window.setTimeout(vue.portapi.recvHandler, 100);
            vue.portapi.recvHandlerScheduled = true;
          }
        };
        reader.readAsText(e.data);
      };
    },
    recvHandler() {
      vue.portapi.recvHandlerScheduled = false;
      // process queue
      for (var i = 0; i < vue.portapi.recvQueue.length; i++) {
        var msg = vue.portapi.recvQueue[i];

        // console.log("DEBUG: recv: " + e.target.result);
        var splitted = msg.split("|");

        // dirty hack :(
        if (splitted.length > 4) {
          splitted[3] = splitted.slice(3).join("|");
        }

        if (splitted.length < 2) {
          console.warn("received invalid message: " + msg);
          continue;
        }

        var opID = splitted[0];
        var op = vue.portapi.requests[opID];
        if (op == undefined) {
          console.log("no op with ID " + opID);
          continue;
        }

        var msgType = splitted[1];
        switch (msgType) {
          case "ok":
            //    127|ok|<key>|<data>
            if (splitted.length < 4) {
              console.warn("received invalid message: " + msg);
              break;
            }
            op.changes.created++;
            op.updateRecord(splitted[2], splitted[3], true)
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
            op.error = splitted.slice(2).join("|");
            op.loading = false;
            break;
          case "upd":
            //    127|upd|<key>|<data>
            if (splitted.length < 4) {
              console.warn("received invalid message: " + msg);
              break;
            }
            op.changes.updated++;
            op.updateRecord(splitted[2], splitted[3], false)
            console.log(opID + ": update " + splitted[2]);
            break;
          case "new":
            //    127|new|<key>|<data>
            if (splitted.length < 4) {
              console.warn("received invalid message: " + msg);
              break;
            }
            op.changes.created++;
            op.updateRecord(splitted[2], splitted[3], true)
            console.log(opID + ": new " + splitted[2]);
            break;
          case "del":
            //    127|del|<key>
            if (splitted.length < 3) {
              console.warn("received invalid message: " + msg);
              break;
            }
            op.changes.deleted++;
            op.deleteRecord(splitted[2])
            console.log(opID + ": delete " + splitted[2]);
            break;
          case "warning":
            //    127|warning|<message> // error with single record, operation continues
            op.changes.warnings++;
            op.warnings.append(splitted.slice(2).join("|"));
            break;
          default:
            console.log("received invalid message type: " + msg);
            return;
        }

        // console.log("updated " + opID);
        // console.log(op);

      }
      // reset queue
      vue.portapi.recvQueue = [];
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
        requestText += "|J" + JSON.stringify(cleanedData);
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
