<template>
  <span />
</template>

<script>
export default {
  name: "SaveWindowSize",
  components: {},
  data() {
    return {
      updateID: 0,
    };
  },
  methods: {
    saveWindowSize() {
      // increase ID counter
      this.updateID++;
      // assign current ID to this instance
      let myUpdateID = this.updateID;
      // create function to check if loading has finished
      let save = () => {
        // only save if we are the last instance
        if (myUpdateID == this.updateID) {
          this.$api.update("core:ui/app/window", {
            // window.outer* don't work correctly with IE/MSHTML.
            Height: window.outerHeight - 50, // substract a little to compensate for top bar
            Width: window.outerWidth - 50, // substract a little to compensate for scroll bar
          });
        }
      };
      // save after one second
      setTimeout(save, 1000);
    },
  },
  beforeMount() {
    window.addEventListener("resize", this.saveWindowSize);
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
