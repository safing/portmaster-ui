<template>
  <div class="ui internally celled grid" style="height: 100%;">
    <div class="five wide column">
      <h1>Monitoring</h1>
      <p v-if="op.loading">
        loading...
      </p>
      <div v-else-if="op.error">
        error: {{ op.error }}
      </div>

      <div v-else class="ui one column celled grid container">
        <div v-for="process in tree" v-bind:key="process.key" class="column">
          <a href="#">
            <i class="caret down icon"></i>
          </a>
          {{ process.data.Name }}
          <div class="ui label right aligned">
            <i class="map signs icon"></i>
            <div class="detail" style="color: green;">
              23
            </div>
            <div class="detail" style="color: red;">
              39
            </div>
          </div>

          <div class="ui one column celled grid">
            <div v-for="connection in process.children" v-bind:key="connection.key" class="column">
              <a href="#">
                <i class="caret down icon"></i>
              </a>
              {{ connection.data.Domain }}
              <div class="ui label right aligned">
                <i class="map signs icon"></i>
                <div class="detail" style="color: green;">
                  23
                </div>
                <div class="detail" style="color: red;">
                  39
                </div>
              </div>

              <div class="ui one column celled grid">
                <div v-for="link in connection.children" v-bind:key="link.key" class="column">
                  <a href="#">
                    <i class="caret down icon"></i>
                  </a>
                  {{ link.data.RemoteAddress }}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      <table class="ui very basic compact table">
      <thead>
        <tr><th class="ten wide"></th>
        <th class="six wide"></th>
      </tr></thead>
      <tbody>
        <tr>
          <td class="level1">
            <a href="#">
              <i class="caret down icon"></i>
            </a>
            L1
          </td>
          <td class="status">
            <div class="ui label">
            <i class="map signs icon"></i>
            <div class="detail" style="color: green;">
              23
            </div>
            <div class="detail" style="color: red;">
              39
            </div>
          </div>
        </td>
        </tr>
        <tr>
          <td class="level2" style="padding-left: 1rem;">
            <a href="#">
              <i class="caret down icon"></i>
            </a>
            L2
          </td>
          <td class="status2">
            <div class="ui label">
              <i class="map signs icon"></i>
              <div class="detail" style="color: green;">
                23
              </div>
              <div class="detail" style="color: red;">
                39
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td class="level3" style="padding-left: 4rem;">
            L3
          </td>
          <td class="status3">
            <div class="ui label">
              <i class="map signs icon"></i>
              <div class="detail" style="color: green;">
                23
              </div>
              <div class="detail" style="color: red;">
                39
              </div>
            </div>
          </td>
        </tr>
        <tr class="level1">
          <td>
            <a href="#">
              <i class="caret right icon"></i>
            </a>
            L1
          </td>
          <td class="status">
            <div class="ui label">
            <i class="map signs icon"></i>
            <div class="detail" style="color: green;">
              23
            </div>
            <div class="detail" style="color: red;">
              39
            </div>
          </div>
        </td>
        </tr>
      </tbody>
    </table>
    </div>
    <div class="eleven wide column">
      <h2>Firefox > nytima.com (TCP, 160.87.23.162: 443)</h2>
      <div class="ui grid">
        <div class="nine wide column">
          <h4>Started:</h4>
          <h4>Ended:</h4>
          <h4>Security Level:</h4>
        </div>
        <div class="seven wide column">
          <div class="ui segment">
            <h3 style="text-align: center;">nytima</h3>
            <div class="ui two column grid">
              <div class="column">
                <h4>Labeled:</h4>
                <ul class="ui list">
                  <li value="-">news</li>
                  <li value="-">news</li>
                  <li value="-">news</li>
                </ul>
              </div>
              <div class="column">
                <h4>In Progress:</h4>
                <ul class="ui list">
                  <li>news</li>
                  <li>news</li>
                  <li>news</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div class="sixteen wide right aligned column" style="padding: 4px 1rem;">
          <div class="ui button">
            Block/Whitelist Domain
          </div>
          <div class="ui button">
            <i class="user icon"></i>
            to Profile
          </div>
        </div>
      </div>
      <div class="ui divider"></div>
      <div class="ui basic segment">

        <div class="" id="map">

        </div>

      </div>
    </div>

  </div>

</template>

<script>
// import Option from "./Option.vue";

function countChar(s, c) {
  var count = 0;
  for (var i=0; i<s.length; i++) {
    if (s[i] === c) {
      count += 1;
    }
  }
  return count;
}


export default {
  name: "Monitor",
  components: {
    // Option
  },
  data() {
    return {
      op: this.$api.qsub("query network:tree/")
    };
  },
  computed: {
    tree() {
      var tree = []

      // level 1
      var l1Keys = Object.keys(this.op.records).filter(function(key){ return countChar(key, "/") == 1 });
      for (var i = 0; i < l1Keys.length; i++) {
        var process = {
          key: l1Keys[i],
          data: this.op.records[l1Keys[i]],
          children: []
        }
        tree.push(process)

        // level 2
        var l2Keys = Object.keys(this.op.records).filter(function(key){ return countChar(key, "/") == 2 && key.startsWith(process.key) });
        for (var j = 0; j < l2Keys.length; j++) {
          var connection = {
            key: l2Keys[j],
            data: this.op.records[l2Keys[j]],
            children: [],
            parent: process,
          }
          process.children.push(connection)

          // level 3
          var l3Keys = Object.keys(this.op.records).filter(function(key){ return countChar(key, "/") == 3 && key.startsWith(connection.key) });
          for (var k = 0; k < l3Keys.length; k++) {
            var link = {
              key: l3Keys[k],
              data: this.op.records[l3Keys[k]],
              parent: connection,
            }
            connection.children.push(link)
          }
        }
      }

      return tree
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.ui.label {
  float: right;
}
.column {
  padding: 0.2em 0.4em !important;
}

.status{
  padding: 0 !important;
}
.status2{
  padding: 0 0 0 1rem !important;
}
.status3{
  padding: 0 0 0 2rem !important;
}
.list{
  margin-top: 0 !important;
}
h4 {
  margin: 4px 0 !important;
}
#map { height: 180px; }
</style>
