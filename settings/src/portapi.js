function parseObject(data) {
  if (data[0] == "J") {
    return JSON.parse(data.slice(1))
  }
  return null
}

function install(vue, options) {
  if (!options.hasOwnProperty("url")) {
    console.error("PortAPI requires option 'url'.");
    return
  }

  // vue.prototype.$queries = {}
  vue.prototype.$api = {
    // 127|qsub|<query>
    //    127|ok|<key>|<data>
    //    127|done
    //    127|error|<message>
    //    127|upd|<key>|<data>
    //    127|new|<key>|<data>
    //    127|delete|<key>|<data>
    //    127|warning|<message> // error with single record, operation continues
    qsub(query, name) {
      return vue.portapi.newRequest(name, "qsub", query);
    },
  }
  vue.portapi = {
    debug: (options.debug == true) ? true : false,
    conn: null,
    url: options.url,
    requests: {},
    requestCnt: 0,
    connect() {
  		vue.portapi.conn = new WebSocket(vue.portapi.url)

  		vue.portapi.conn.onopen = function() {
  	    if (vue.portapi.debug) console.log('connection to api established');
  		}

  		vue.portapi.conn.onerror = function (error) {
  			if (vue.portapi.debug) console.log('connection error: ' + error);
  		}

  		vue.portapi.conn.onmessage = function (e) {
  			var reader = new FileReader()
  			reader.onload = function(e) {
          console.log("DEBUG: recv: " + e.target.result)
          var splitted = e.target.result.split("|", 4)
          if (splitted.length < 2) {
            console.log("received invalid message: " + e.target.result);
            return
          }

          var opID = splitted[0]
          var opObject = vue.portapi.requests[opID]
          if (opObject == undefined) {
            console.log("no opObject with ID " + opID);
            return
          }

          var msgType = splitted[1]
          switch (msgType) {
            case "ok":
              //    127|ok|<key>|<data>
              if (opObject.type == "get") {
                opObject.record = parseObject(splitted[3])
              } else {
                if (splitted.length != 4) {
                  console.log("AAAAAH!")
                }
                console.log(splitted[3])
                vue.set(opObject.records, splitted[2], parseObject(splitted[3]))
                // opObject.records[splitted[2]] = parseObject(splitted[3])
              }
              break;
            case "done":
              //    127|done
              opObject.loading = false
              break;
            case "error":
              //    127|error|<message>
              opObject.error = splitted[2]
              opObject.loading = false
              break;
            case "upd":
              //    127|upd|<key>|<data>
              vue.set(opObject.records, splitted[2], parseObject(splitted[3]))
              break;
            case "new":
              //    127|new|<key>|<data>
              vue.set(opObject.records, splitted[2], parseObject(splitted[3]))
              break;
            case "delete":
              //    127|delete|<key>|<data>
              delete opObject.records[splitted[2]]
              break;
            case "warning":
              //    127|warning|<message> // error with single record, operation continues
              opObject.warnings.append(splitted[2]);
              break;
            default:
              console.log("received invalid message type: " + e.target.result)
              return
          }

          console.log("updated " + opID);
          console.log(opObject);

        }
  			reader.readAsText(e.data);
  		}
    },
    newRequest(name, msgType, msgText) {
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
      vue.portapi.requests[name] = opObject
      // vue.portapi.conn.send(name + "|" + msgType + "|" + msgText);
      console.log("added " + name);
      return opObject;
    }
  };

  vue.portapi.connect()
  setTimeout(function(){
    vue.portapi.conn.send("#0|qsub|query config");
  }, 3000);

}

const PortAPI = {
  install: install
};

export default PortAPI;
