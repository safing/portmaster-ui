<template>
  <!-- UNDECIDED -->
  <span v-if="verdict == 0">
    <i class="question circle icon" title="not yet decided"></i>
    <span v-if="reason">{{ reason }}</span>
  </span>
  <!-- ACCEPT -->
  <span v-else-if="verdict == 1">
    <i class="check circle icon" title="accepted"></i>
    <span v-if="reason">{{ reason }}</span>
  </span>
  <!-- BLOCK -->
  <span v-else-if="verdict == 2">
    <i class="times circle icon" title="blocked"></i>
    <span v-if="reason">{{ reason }}</span>
  </span>
  <!-- DROP -->
  <span v-else-if="verdict == 3" title="dropped">
    <i class="times circle icon"></i>
    <span v-if="reason">{{ reason }}</span>
  </span>
  <!-- RerouteToNameserver -->
  <span v-else-if="verdict == 4">
    <i class="redo alternate icon" title="redirected to nameserver"></i>
    <span v-if="long">redirected to nameserver</span>
  </span>
  <!-- RerouteToTunnel -->
  <span v-else-if="verdict == 5">
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
