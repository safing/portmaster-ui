<template>
  <!-- VerdictUndecided -->
  <span v-if="verdict == 0">
    <i class="question circle icon" title="not yet decided"></i>
    <span v-if="reason">{{ reason }}</span>
  </span>
  <!-- VerdictUndeterminable -->
  <span v-else-if="verdict == 1">
    <i class="question circle icon" title="undeterminable"></i>
    <span v-if="reason">{{ reason }}</span>
  </span>
  <!-- VerdictAccept -->
  <span v-else-if="verdict == 2">
    <i class="check circle icon" title="accepted"></i>
    <span v-if="reason">{{ reason }}</span>
  </span>
  <!-- VerdictBlock -->
  <span v-else-if="verdict == 3">
    <i class="times circle icon" title="blocked"></i>
    <span v-if="reason">{{ reason }}</span>
  </span>
  <!-- VerdictDrop -->
  <span v-else-if="verdict == 4" title="dropped">
    <i class="times circle icon"></i>
    <span v-if="reason">{{ reason }}</span>
  </span>
  <!-- VerdictRerouteToNameserver -->
  <span v-else-if="verdict == 5">
    <i class="redo alternate icon" title="redirected to nameserver"></i>
    <span v-if="long">redirected to nameserver</span>
  </span>
  <!-- VerdictRerouteToTunnel -->
  <span v-else-if="verdict == 6">
    <i class="redo alternate icon" title="redirected to tunnel"></i>
    <span v-if="long">redirected to tunnel</span>
  </span>
  <span v-else>
    <i class="exclamation triangle icon" title="unknown verdict"></i>
  </span>
</template>

<script>
export default {
  name: "Verdict",
  props: {
    verdict: Number,
    reason: String,
    long: Boolean
  }
};
</script>

<style scoped lang="scss">
.check.circle.icon {
  color: green;
}
.times.circle.icon {
  color: red;
}
.exclamation.triangle.icon {
  color: yellow;
}
</style>
