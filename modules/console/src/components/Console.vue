<template>
  <div>

    <div id="output">
      <table v-if="lines.length" class="ui very basic very compact fixed table">
        <tbody>
          <tr v-for="line, index in lines" v-bind:key="index" v-bind:class="[{'blue': line.self}, line.addClass]">
            <td style="width: 50px;">&nbsp;{{ line.lineNo }}</td>
            <td>{{ line.msg }}</td>
            <td style="width: 100px;">{{ line.time.toLocaleTimeString() }}&nbsp;</td>
          </tr>
        </tbody>
      </table>
      <div v-else style="background: lightgrey; padding: 70px; min-height: 100%;">
        <h3>Welcome to the Dev Console!</h3>
        <p>
          Here you can interact directly with the portmaster API.<br>
          You'll need to manually connect before sending a command.<br>
          Shortcuts are only active if the command input field is focused.
        </p>
        <p>
          Possible commands:<br>
          <PRE>
      get [key]
      query [query]
      sub [query]
      qsub [query]
      create [key]|[data]
      update [key]|[data]
      insert [key]|[data]
      delete [key]
          </PRE>
        </p>
        <p>
          Notable locations:<br>
          <PRE>
      query core:status/
      query config:
      query network:tree/
      query cache:intel/nameRecord/
      query cache:intel/ipInfo/
          </PRE>
        </p>
        <p>
          Console config:<br>
          <PRE>
      /trunc [#lines]
      /dupes [#lines]
          </PRE>
        </p>
      </div>
    </div>

    <hr>

    <div class="ui action fluid input" style="margin: 0 5px;">
      <input type="text" v-model="command"
        v-on:keyup.enter="submit"
        v-on:keyup.up="historyUp"
        v-on:keyup.page-up="historyUp"
        v-on:keyup.down="historyDown"
        v-on:keydown.ctrl.67.prevent="connect"
        v-on:keydown.ctrl.83.prevent="toggleScroll"
        v-on:keydown.ctrl.68.prevent="toggleCheckDupes"
        v-on:keydown.ctrl.84.prevent="toggleTruncate"
        v-on:keydown.ctrl.88.prevent="clear"
        autofocus>
      <button class="ui button" v-on:click="submit">[Up/Down/Enter] Send</button>
    </div>

    <div class="five tiny ui buttons" style="margin: 5px; width: calc(100vw - 10px)">
      <button v-bind:class="['ui button', {'blue': !conn}]" v-on:click="connect">
        [Ctrl+C] <span v-if="!conn">Connect</span><span v-else>Disconnect</span>
      </button>
      <button class="ui button" v-on:click="toggleScroll">
        <i v-if="scroll" class="green circle icon"></i>
        <i v-else class="grey circle icon"></i>
        [Ctrl+S] Scroll
      </button>
      <button class="ui button" v-on:click="toggleCheckDupes">
        <i v-if="checkDupes" class="green circle icon"></i>
        <i v-else class="grey circle icon"></i>
        [Ctrl+D] Detect Duplicates ({{ checkDupeLimit }}L)
      </button>
      <button class="ui button" v-on:click="toggleTruncate">
        <i v-if="truncate" class="green circle icon"></i>
        <i v-else class="grey circle icon"></i>
        [Ctrl+T] Truncate at {{ truncateLimit }}L
      </button>
      <button class="ui button" v-on:click="clear">
        [Ctrl+X] Clear output / Help
      </button>
    </div>

  </div>
</template>

<script>
export default {
  name: "Console",
  data() {
    return {
      conn: null,
      lines: [],
      lineCnt: 1,
      scroll: true,
      checkDupes: false,
      truncate: true,
      command: "",
      reqCnt: 1,
      reqHistory: [],
      reqHistoryPosition: -1,
      checkDupeLimit: 200,
      truncateLimit: 500,
      recvQueue: [],
      recvHandlerScheduled: false
    };
  },
  methods: {
    stdout(s, addClass) {
      // add
      this.lines.push({
        lineNo: this.lineCnt++,
        msg: s,
        time: new Date(),
        addClass: addClass
      });
      // truncate
      this.truncateLines();
    },
    toggleScroll() {
      this.scroll = !this.scroll;
    },
    toggleCheckDupes() {
      this.checkDupes = !this.checkDupes;
    },
    checkForDupe(msg) {
      // should we?
      if (!this.checkDupes) {
        return false;
      }
      // calc limit
      var limit = this.lines.length-this.checkDupeLimit;
      if (limit < 0) {
        limit = 0;
      }
      // check
      for (var i = this.lines.length-1; i >= limit; i--) {
        if (this.lines[i].msg == msg) {
          return true;
        }
      }
      return false;
    },
    toggleTruncate() {
      this.truncate = !this.truncate;
      this.truncateLines();
    },
    truncateLines() {
      if (this.truncate && this.lines.length > this.truncateLimit) {
        this.lines.splice(0, this.lines.length - this.truncateLimit);
      }
    },
    clear() {
      this.lines = [];
      this.lineCnt = 1;
      this.reqCnt = 1;
      this.recvQueue = [];
    },
    historyUp() {
      if (this.reqHistoryPosition+1 < this.reqHistory.length) {
        this.reqHistoryPosition++;
        this.command = this.reqHistory[this.reqHistoryPosition];
      }
    },
    historyDown() {
      if (this.reqHistoryPosition >= 0) {
        this.reqHistoryPosition--;
        if (this.reqHistoryPosition < 0) {
          this.command = "";
        } else {
          this.command = this.reqHistory[this.reqHistoryPosition];
        }
      }
    },
    submit() {
      // build request
      var apiRequest = "";
      var cmd = this.command.trim().split(" ")[0];
      var param = this.command.trim().split(" ").slice(1, 100).join(" ");
      switch (cmd) {
        case "get": // #|get|<key>
          apiRequest = `#${this.reqCnt}|get|${param}`;
          break;
        case "query": // #|query|<query>
          apiRequest = `#${this.reqCnt}|query|query ${param}`;
          break;
        case "sub": // #|sub|<query>
          apiRequest = `#${this.reqCnt}|sub|query ${param}`;
          break;
        case "qsub": // #|qsub|<query>
          apiRequest = `#${this.reqCnt}|qsub|query ${param}`;
          break;
        case "create": // #|create|<key>|<data>
          apiRequest = `#${this.reqCnt}|create|${param}`;
          break;
        case "update": // #|update|<key>|<data>
          apiRequest = `#${this.reqCnt}|update|${param}`;
          break;
        case "insert": // #|insert|<key>|<data>
          apiRequest = `#${this.reqCnt}|insert|${param}`;
          break;
        case "delete": // #|delete|<key>
          apiRequest = `#${this.reqCnt}|delete|${param}`;
          break;
        case "/trunc":
          var num = Number(param);
          if (isNaN(num)) {
            this.stdout(`error: ${param} is not a number`, "grey");
          } else {
            this.truncateLimit = num;
            this.truncate = true;
            this.command = "";
          }
          return;
        case "/dupes":
          var num = Number(param);
          if (isNaN(num)) {
            this.stdout(`error: ${param} is not a number`, "grey");
          } else {
            this.checkDupeLimit = num;
            this.checkDupes = true;
            this.command = "";
          }
          return;
        default:
          this.stdout(`unknown command: ${cmd}`, "grey");
          return;
      }

      // send request
      if (this.conn) {
        // send and print
        this.conn.send(apiRequest);
        this.stdout(`>>> ${apiRequest}`, "blue");
        if (this.reqHistory.length == 0 || this.reqHistory[0] != this.command) {
          this.reqHistory.unshift(this.command);
        }
        // reset
        this.command = "";
        this.reqCnt++;
        this.reqHistoryPosition = -1;
      } else {
        this.stdout(">>> error: not connected to api", "grey");
      }
    },
    connect() {
      if (this.conn) {
        this.conn.close();
        return;
      }

      var self = this;
      var newConn = new WebSocket("ws://127.0.0.1:817/api/database/v1");

      newConn.onopen = function() {
        self.stdout("connection to api established", "grey");
      };

      newConn.onclose = function(event) {
        if (event.reason == "") {
          self.stdout(`connection closed. (no reason)`, "grey");
        } else {
          self.stdout(`connection closed. (reason: ${event.reason})`, "grey");
        }
        self.conn = null;
      };

      newConn.onmessage = function(e) {
        var reader = new FileReader();
        reader.onload = function(e) {
          // add msg to recvQueue
          self.recvQueue.push(e.target.result)
          // schedule recvHandler
          if (!self.recvHandlerScheduled) {
            window.setTimeout(self.recvHandler, 100);
            self.recvHandlerScheduled = true;
          }
        };
        reader.readAsText(e.data);
      };

      this.conn = newConn;
    },
    disconnect() {
      this.conn.close();
    },
    recvHandler() {
      this.recvHandlerScheduled = false;
      // process queue
      for (var i = 0; i < this.recvQueue.length; i++) {
        var msg = this.recvQueue[i];
        if (this.checkForDupe(msg)) {
          this.stdout(`[DUPE!] ${msg}`, "yellow");
        } else {
          this.stdout(msg);
        }
      }
      // reset queue
      this.recvQueue = [];
      // scroll
      window.setTimeout(function(){
        if (this.scroll) {
          var o = document.getElementById("output");
          o.scrollTop = o.scrollHeight;
        }
      }, 10);
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
#output {
  height: calc(100vh - 95px);
  overflow-y: scroll;
}
</style>
