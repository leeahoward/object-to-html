# Basic Formatting Utilities

This is a simple set of JavaScript utilities to format certain JavaScript objects into strings.

These are needed either because:

* The object's default `toString` doesn't return any useful
* The object contains properties that cannot be converted to primitive types (I.E. strings)
* The object contains circular references that cause `JSON.stringify` to explode

In the latter case, the `obj_to_str` function will create a depth limited string representatio of such an object.

The default depth limit is 2, but this can be adjusted by passing a positive integer to `set_depth_limit()`

