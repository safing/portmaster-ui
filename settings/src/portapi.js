function parseObject(data) {
  if (data[0] == "J") {
    return JSON.parse(data.slice(1));
  }
  return null;
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
    }
  };
  vue.portapi = {
    debug: options.debug == true ? true : false,
    conn: null,
    connected: false,
    requestQueue: [],
    url: options.url,
    requests: {},
    requestCnt: 0,
    connect() {
      vue.portapi.ws = new WebSocket(vue.portapi.url);

      vue.portapi.ws.onopen = function() {
        if (vue.portapi.debug) console.log("connection to api established");

        vue.portapi.connected = true;

        // send queued requests
        vue.portapi.requestQueue.forEach(function(requestText) {
          vue.portapi.ws.send(requestText);
          if (vue.portapi.debug)
            console.log("sending queued request: " + requestText);
        });
        vue.portapi.requestQueue = [];
      };

      vue.portapi.ws.onerror = function(error) {
        if (vue.portapi.debug) console.log("connection error: " + error);
        vue.portapi.connected = false;

        console.log("lost connection, waiting...");
        setTimeout(function() {
          console.log("reconnecting...");
          vue.portapi.connect();
        }, 1000);
      };

      vue.portapi.ws.onmessage = function(e) {
        var reader = new FileReader();
        reader.onload = function(e) {
          console.log("DEBUG: recv: " + e.target.result);
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
          var opObject = vue.portapi.requests[opID];
          if (opObject == undefined) {
            console.log("no opObject with ID " + opID);
            return;
          }

          var msgType = splitted[1];
          switch (msgType) {
            case "ok":
              //    127|ok|<key>|<data>
              if (opObject.type == "get") {
                opObject.record = parseObject(splitted[3]);
              } else {
                if (splitted.length != 4) {
                  console.log("AAAAAH!");
                }
                console.log(splitted[3]);
                vue.set(
                  opObject.records,
                  splitted[2],
                  parseObject(splitted[3])
                );
              }
              break;
            case "done":
              //    127|done
              opObject.loading = false;
              break;
            case "success":
              //    127|done
              opObject.success = true;
              opObject.loading = false;
              break;
            case "error":
              //    127|error|<message>
              opObject.error = splitted[2];
              opObject.loading = false;
              break;
            case "upd":
              //    127|upd|<key>|<data>
              vue.set(opObject.records, splitted[2], parseObject(splitted[3]));
              break;
            case "new":
              //    127|new|<key>|<data>
              vue.set(opObject.records, splitted[2], parseObject(splitted[3]));
              break;
            case "delete":
              //    127|delete|<key>|<data>
              delete opObject.records[splitted[2]];
              break;
            case "warning":
              //    127|warning|<message> // error with single record, operation continues
              opObject.warnings.append(splitted[2]);
              break;
            default:
              console.log("received invalid message type: " + e.target.result);
              return;
          }

          console.log("updated " + opID);
          console.log(opObject);
        };
        reader.readAsText(e.data);
      };
    },
    newRequest(name, msgType, msgText, data) {
      if (name == undefined || name == null || name == "") {
        name = "#" + vue.portapi.requestCnt++;
      }
      var opObject = {
        record: null,
        records: {},
        loading: true,
        success: false,
        warnings: [],
        error: null,
        changeCnt: 0
      };
      vue.portapi.requests[name] = opObject;

      var requestText = name + "|" + msgType + "|" + msgText;
      if (data != undefined) {
        requestText += "|" + JSON.stringify(data);
      }

      if (vue.portapi.connected) {
        if (vue.portapi.debug) console.log("sending request: " + requestText);
        vue.portapi.ws.send(requestText);
      } else {
        if (vue.portapi.debug) console.log("queueing request: " + requestText);
        vue.portapi.requestQueue.push(requestText);
      }

      console.log("added " + name);
      return opObject;
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
