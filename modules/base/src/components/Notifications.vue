<template>
  <div class="notifications">
    <div v-if="notifications.length > 0" class="ui segments">
      <div v-for="n in notifications" :key="n.ID" :class="['ui inverted segment', notificationClass(n.Type)]">
        <p>
          {{ n.Message }}
        </p>
        <div v-if="n.AvailableActions && n.AvailableActions.length > 0" class="ui buttons">
          <button
            v-for="action in n.AvailableActions"
            :key="n.ID + ':' + action.ID"
            v-on:click="selectAction(n, action.ID)"
            :class="[
              'ui inverted button',
              notificationColorClass(n.Type),
              action.ID != n.SelectedActionID ? 'basic' : '',
            ]"
          >
            {{ action.Text }}
          </button>
        </div>
      </div>
    </div>

    <p v-else class="placeholder"><i class="envelope outline icon"></i> No notifications.</p>
  </div>
</template>

<script>
export default {
  name: "Notifications",
  components: {},
  data() {
    return {
      notifDB: this.$api.qsub("query notifications").prepFn("", function (key, obj) {
        obj.dbKey = key;
      }),
    };
  },
  computed: {
    notifications() {
      var active = [];
      // collect active
      for (var n of Object.values(this.notifDB.records)) {
        if (n.Executed == 0) {
          active.push(n);
        }
      }
      // sort
      active.sort(function (a, b) {
        return a.Created - b.Created;
      });
      return active;
    },
  },
  methods: {
    selectAction(n, actionID) {
      n.SelectedActionID = actionID;
      this.$api.update(n.dbKey, n);
    },
    notificationClass(nType) {
      switch (nType) {
        case 0: // Info
          return "notif-info";
        case 1: // Warning
          return "notif-warning";
        case 2: // Prompt
          return "notif-prompt";
      }
    },
    notificationColorClass(nType) {
      switch (nType) {
        case 0: // Info
          return "teal";
        case 1: // Warning
          return "yellow";
        case 2: // Prompt
          return "blue";
      }
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
// .notifications {
// }

.placeholder {
  padding: 20px;
  text-align: center;
  color: #fff6;
}

.notif-info {
  border-left: 2px solid #00b5ad !important;
}
.notif-warning {
  border-left: 2px solid #fbbd08 !important;
}
.notif-prompt {
  border-left: 2px solid #2185d0 !important;
}
</style>
