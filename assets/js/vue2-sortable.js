const Sortable = {
  install(vue, options) {
    var Sortable = require('sortablejs')
    if (!Sortable) {
      throw new Error('[vue2-sortable] cannot locate Sortable.js.')
    }

    vue.directive('sortable', {
      inserted: function (el, binding) {
        var sortable = new Sortable(el, binding.value || {})

        // reverse automatic sorting by library, we sort our data ourselves!
        sortable.option("onSort", function(event) {
          // var order = sortable.toArray();
          // order.splice(event.oldIndex, 0, order.splice(event.newIndex, 1)[0]);
          console.log(sortable.toArray())
          sortable.sort(sortable.toArray().sort());
          console.log(sortable.toArray())
        })
      }
    })
  }
};

export default Sortable;
