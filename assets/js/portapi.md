# PortAPI

PortAPI is Vue.js plugin for the Portmaster API.

Install:
```
import PortAPI from "../../../assets/js/portapi.js";

Vue.use(PortAPI, {
  url: "ws://127.0.0.1:817/api/database/v1",
  debug: true
});
```

Usage:
```
// this will query and subscribe to changes.
// op.records holds all the records and is automatically updated.
var op = this.$api.qsub("query config");

// you will want to check op.loading (when querying) and op.error before accessing data
// also, you might want to check op.warnings

// all functions
// name is an optional name for the operation, don't fill for automatic assignment
this.$api.get(key, name)
this.$api.query(query, name)
this.$api.sub(query, name)
this.$api.qsub(query, name)
this.$api.create(key, data, name)
this.$api.update(key, data, name)
this.$api.insert(key, data, name)
this.$api.delete(key, name)
```

`Operation` structure:
```
// attributes
op.name      // string - request name (either chosen or generated)
op.type      // string - request type
op.record    // {} - single record (only get)
op.records   // {} - map of records (only query, qsub)
op.loading   // bool - whether a operation is still loading (only query, qsub)
op.success   // bool - whether a modifying operation was a success (ie. create, update, insert, delete)
op.warnings  // []String - list of warnings (single failed records of a query - only query, qsub, sub)
op.error     // String - if an error occured

// functions

getChanges()
// returns counters of what changes since the last call to getChanges() (only for query, qsub, sub)
// {
//   created: 0,
//   updated: 0,
//   deleted: 0,
//   warnings: 0,
// }

prepFn(keyPrefix, fn)
// adds a prep function that is called on every incoming object
// function signature: fn(key, obj)
```
