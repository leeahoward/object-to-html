#!/usr/bin/env node

/**
 * =====================================================================================================================
 * @fileOverview basic-utils
 * 
 * A node library containing various helpful formatting functions
 * 
 * Author : Chris Whealy (www.whealy.com)
 * =====================================================================================================================
 **/

// *********************************************************************************************************************
// Type checking operations
var typeOf        = x => Object.prototype.toString.apply(x).slice(8).slice(0, -1)
var isNull        = x => x === null
var isUndefined   = x => x === undefined
var isNullOrUndef = x => isNull(x) || isUndefined(x)

var isNumeric     = x => typeOf(x) === "Number"
var isArray       = x => typeOf(x) === "Array"
var isMap         = x => typeOf(x) === "Map"


// *********************************************************************************************************************
// Array operations that can be used in chained function calls such as map and reduce
var push    = (arr, newEl) => (_ => arr)(arr.push(newEl))
var unshift = (arr, newEl) => (_ => arr)(arr.unshift(newEl))


// *********************************************************************************************************************
// Formatting values for the HTML output table
var tab_props = ["border=1", "cellpadding=3", "cellspacing=0"]

var get_tab_props = () => tab_props
var set_tab_props = tp => tab_props = typeOf(tb) === "Array" ? tp : tab_props

// *********************************************************************************************************************
// Transform various datatypes to strings

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Limit the recursion depth used by obj_to_str()
var depth_limit = 2

var get_depth_limit = ()  => depth_limit
var set_depth_limit = lim => depth_limit = (isNumeric(lim) && lim >= 1) ? lim : depth_limit


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Timestamp to string
var ts_to_str = ts_arg => isNullOrUndef(ts_arg) ? ts_arg : (new Date(ts_arg)).toLocaleString()

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Transform a Map object into a printable form
var map_to_str = map_arg => {
  if (isNullOrUndef(map_arg)) {
    return map_arg
  }
  else {
    var acc = []
    var iter = map_arg[Symbol.iterator]()

    for (let el of iter) {
      acc.push(`["${el[0]}", ${el[1]}]`)
    }

    return acc.join(", ")
  }
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Generic datatype to string
var value_to_str = (val, depth) =>
  (valType =>
    depth > depth_limit
    ? "..."
    : valType === "Object"
      ? object_to_table(val, depth+1)
      : valType === "Function"
        ? "Source code supressed"
        : valType === "Array"
          ? (val.length > 0
            ? val.map(el => value_to_str(el, depth+1)).join("<br>")
            : "[]")
          : valType === "Map"
            ? map_to_str(val)
            : val
  )
  (typeOf(val))


// *********************************************************************************************************************
// Generate HTML elements
const bg_light_grey = "style=\"background-color:#DDD;\""

const emptyElements = ['area', 'base', 'basefont', 'br', 'col', 'frame', 'hr'
, 'img', 'input', 'isindex', 'link', 'meta', 'param', 'command', 'keygen', 'source']

var isEmptyElement = tag_name => emptyElements.indexOf(tag_name) >= 0

var make_tag = (tag_name, props_array) =>
  `<${tag_name}${(isNullOrUndef(props_array) || props_array.length === 0 ? "" : " " + props_array.join(" "))}>`

var as_html_el = tag_name =>
  (propsArray, val) =>
    `${make_tag(tag_name, propsArray)}${isEmptyElement(tag_name) || isNullOrUndef(val) ? "" : val}</${tag_name}>`

// Partial functions for generating specific HTML elements
var as_table = as_html_el("table")
var as_tr    = as_html_el("tr")
var as_td    = as_html_el("td")
var as_th    = as_html_el("th")
var as_h1    = as_html_el("h1")
var as_h2    = as_html_el("h2")
var as_pre   = as_html_el("pre")
var as_body  = as_html_el("body")
var as_html  = as_html_el("html")


// *********************************************************************************************************************
// Transform an Event object to an HTML table
var make_table_hdr_row = () =>
  as_tr([], [as_th([bg_light_grey],"Property"), as_th([bg_light_grey],"Type"), as_th([bg_light_grey],"Value")].join(""))

var evt_to_table = (evt, depth) =>
  (current_depth =>
    as_table(tab_props
      // Header Row
      , [ make_table_hdr_row()

        // Event object properties
        , Object.keys(evt).map(key =>
            as_tr( []
                , [ as_td([], key)
                  , as_td([], typeOf(evt[key]))
                  , as_td([], value_to_str(evt[key], current_depth))
                  ].join("")
                )
          ).join("")
        ].join("")
    )
  )
  (depth || 0)

var value_to_table_cell = (val, depth) => as_td([], value_to_str(val, depth))


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Object to table
// This function avoids the cases where a simple call to JSON.stringify() would explode with either "Callstack size
// exceeded" or "TypeError: Converting circular structure to JSON" errors - as happens with an HTTP request object
var object_to_table = (obj_arg, depth) => {
  var acc  = []
  var cols

  // Set current recursion depth to 0 if the argument is missing
  depth = depth || 0

  // Bail out if the recursion depth limit has been hit
  if (depth === depth_limit) {
    return "{...}"
  }

  if (isNullOrUndef(obj_arg)) {
    return obj_arg
  }
  else {
    if (Object.keys(obj_arg).length > 0) {
      // Start with the header row
      acc.push(make_table_hdr_row())

      // Show the enumerable keys
      for (var key in obj_arg) {
        cols = []
        // Add the Property Name, Type and Value columns
        cols.push(as_td([],key))
        cols.push(as_td([],typeOf(obj_arg[key])))
        cols.push(value_to_table_cell(obj_arg[key], depth))

        // Add this row to the accumulator
        acc.push(as_tr([],cols.join("")))
      }

      // Join the accumulator array into a string then return it as a table
      return as_table(tab_props,acc.join(""))
    }
    else {
      return "No enumerable properties"
    }
  }
}


// *********************************************************************************************************************
// PUBLIC API
// *********************************************************************************************************************
module.exports = {
// Type identifiers
  typeOf        : typeOf
, isNull        : isNull
, isUndefined   : isUndefined
, isNullOrUndef : isNullOrUndef
, isNumeric     : isNumeric
, isArray       : isArray
, isMap         : isMap

// Array operations suitable for use with map or reduce
, push    : push
, unshift : unshift

// Generic HTML element generator.
// When called with only the element's tag name, it returns a partial function requiring an array of the elements
// property values, followed by the element's content in a form that is either a string, or where calling that object's
// toString() function returns something useful
, as_html_el : as_html_el

// HTML element partial functions
, as_table   : as_table
, as_tr      : as_tr
, as_th      : as_th
, as_td      : as_td
, as_h1      : as_h1
, as_h2      : as_h2
, as_pre     : as_pre
, as_body    : as_body
, as_html    : as_html

// Formatting parameters
, set_depth_limit  : set_depth_limit
, get_depth_limit  : get_depth_limit
, set_tab_props    : set_tab_props
, get_tab_props    : get_tab_props

// String formatting functions
, timestamp_to_str : ts_to_str

// Transform an object into a Name/Type/Value HTML table
, event_to_table  : evt_to_table
, object_to_table : object_to_table
}
