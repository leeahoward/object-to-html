#!/usr/bin/env node

/**
 * =====================================================================================================================
 * @fileOverview basic-utils
 * 
 * A node library containing various helpful utilities functions
 * 
 * Author : Chris Whealy (www.whealy.com)
 * =====================================================================================================================
 **/

// *********************************************************************************************************************
// Type checking operations
var typeOf        = x => Object.prototype.toString.apply(x).slice(8).slice(0, -1)
var isNullOrUndef = x => x === undefined || x === null
var isNumeric     = x => typeOf(x) === "Number"
var isArray       = x => typeOf(x) === "Array"
var isMap         = x => typeOf(x) === "Map"


// *********************************************************************************************************************
// Array operations that can be used in chained function calls such as map and reduce
var push    = (arr, newEl) => (_ => arr)(arr.push(newEl))
var unshift = (arr, newEl) => (_ => arr)(arr.unshift(newEl))


// *********************************************************************************************************************
// Transform various datatypes to strings

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Limit the recursion depth used by str_to_obj()
var depth_limit = 2
var indent_by   = 2 
var padding = " ".repeat(depth_limit * indent_by)

var get_depth_limit = ()  => depth_limit
var set_depth_limit = lim => {
  if (isNumeric(lim) && lim >= 1) {
    depth_limit = lim
    padding = " ".repeat(depth_limit * indent_by)
  }

  return undefined
}

var get_indent_by = ()    => indent_by
var set_indent_by = chars => {
  if (isNumeric(chars) && lim >= 1) {
    indent_by = chars
    padding = " ".repeat(depth_limit * indent_by)
  }
  
  return undefined
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Timestamp to string
var ts_to_str = ts_arg => isNullOrUndef(ts_arg) ? ts_arg : (new Date(ts_arg)).toLocaleString()

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Object to string
// This function is needed in situations where JSON.stringify() explodes with a "Callstack size exceeded" error due to
// the object containing circular references
var obj_to_str = (obj_arg, depth) => {
  // Set current recursion depth to 0 if the argument is missing
  depth = depth || 0

  if (depth === depth_limit) {
    return "{...}"
  }

  if (isNullOrUndef(obj_arg)) {
    return obj_arg
  }
  else {
    var acc = []
    var pad = padding.slice(0,depth * indent_by)

    // Show only the enumerable keys
    for (var key in obj_arg) {
      switch (typeOf(obj_arg[key])) {
        case "Object":
          acc.push(`"${key}": ${obj_to_str(obj_arg[key], depth+1)}`)
          break

        case "Function":
          acc.push(`"${key}": Function`)
          break

        case "Array":
          acc.push(`"${key}": Array`)
          break

        default:
          acc.push(`"${key}": ${obj_arg[key]}`)
      }
    }

    // Join the accumulator array into a string then top and tail it with curly braces
    return (acc.length > 0) ? `{\n${pad}  ${acc.join(`\n${pad}, `)}\n${pad}}` : "{}"
  }
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Transform a Map object into a printable form
var map_to_str = map_arg => {
  if (isMap(map_arg)) {
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
  else  {
    return "Not a Map object"
  }
}

// *********************************************************************************************************************
// Recursively unpack an object into an array of arrays suitable for map or reduce
// "ntv" = Name/Type/Value
var make_ntv_obj = (n, t, v) => ({prop_name:n, prop_type:t, prop_value:v})

var unpack_obj = (obj, acc) =>
  ((keys, vals) =>
     keys.reduce((acc, key, idx) =>
       push(acc
       , make_ntv_obj(key
         , typeOf(vals[idx])
         , (typeOf(vals[idx]) === "Object" ? unpack_obj(vals[idx],[]) : vals[idx])
         )
       )
     , acc))
  ( isNullOrUndef(obj) ? [] : Object.keys(obj)
  , isNullOrUndef(obj) ? [] : Object.values(obj))


// *********************************************************************************************************************
// Generate HTML elements
const emptyElements = ['area', 'base', 'basefont', 'br', 'col', 'frame', 'hr'
, 'img', 'input', 'isindex', 'link', 'meta', 'param', 'command', 'keygen', 'source']

var isEmptyElement = tag_name => emptyElements.indexOf(tag_name) >= 0

var make_tag = (tag_name, props_array) =>
  `<${tag_name}${(isNullOrUndef(props_array) || props_array.length === 0 ? "" : " " + props_array.join(" "))}>`

var as_html_el = tag_name =>
  (propsArray, val) =>
    `${make_tag(tag_name, propsArray)}${isEmptyElement(tag_name) || isNullOrUndef(val) ? "" : val}</${tag_name}>`

var as_table = as_html_el("table")
var as_tr    = as_html_el("tr")
var as_td    = as_html_el("td")
var as_th    = as_html_el("th")
var as_h1    = as_html_el("h1")
var as_h2    = as_html_el("h2")
var as_pre   = as_html_el("pre")
var as_body  = as_html_el("body")
var as_html  = as_html_el("html")

// Transform and object in a Name/Type/Value table
// This funtion only works on objects that can be JSON.stringified (I.E. objects that do not contain circular references)
// If you pass the object argument as the only parameter, then obj_arg will be undefined, so assume an empty array for
// the tab_props arg
var obj_to_table = (tab_props, obj_arg) =>
  isNullOrUndef(obj_arg)
  ? obj_to_table_int([], unpack_obj(tab_props,[]))
  : obj_to_table_int(tab_props, unpack_obj(obj_arg,[]))


var obj_to_table_int = (tab_props, ntvObjArray) =>
  as_table(tab_props,
    // Start with a header row
    [ as_tr([], [as_th([],"Property"), as_th([],"Value")].join(""))
    // Each element from the ntv array becomes a table row
    , ntvObjArray.map(ntv =>
        as_tr([],
          [ as_td([], ntv.prop_name)
          , as_td([], ntv.prop_type)
          , as_td([], ntv.prop_type === "Object" ? obj_to_table_int(tab_props, ntv.prop_value) : ntv.prop_value)
          ].join("")
        )
      ).join("")
    ].join("")
  )

var evt_to_table = (tab_props, evt) =>
  as_table(tab_props,
    [ as_tr([], [as_td([],"eventType"),           as_td([], evt.eventType)].join(""))
    , as_tr([], [as_td([],"eventTypeVersion"),    as_td([], evt.eventTypeVersion)].join(""))
    , as_tr([], [as_td([],"cloudEventsVersion"),  as_td([], evt.cloudEventsVersion)].join(""))
    , as_tr([], [as_td([],"source"),              as_td([], evt.source)].join(""))
    , as_tr([], [as_td([],"eventID"),             as_td([], evt.eventID)].join(""))
    , as_tr([], [as_td([],"eventTime"),           as_td([], ts_to_str(evt.eventTime))].join(""))
    , as_tr([], [as_td([],"schemaURL"),           as_td([], evt.schemaURL)].join(""))
    , as_tr([], [as_td([],"contentType"),         as_td([], evt.contentType)].join(""))
    , as_tr([], [as_td([],"extensions.request"),  as_td([], as_pre([], obj_to_str(evt.extensions.request)))].join(""))
    , as_tr([], [as_td([],"extensions.response"), as_td([], as_pre([], obj_to_str(evt.extensions.response)))].join(""))
    , as_tr([], [as_td([],"data"),                as_td([], as_pre([], obj_to_str(evt.data)))].join(""))
    ].join("")
  )



// *********************************************************************************************************************
// PUBLIC API
// *********************************************************************************************************************
module.exports = {
// Type identifiers
  typeOf        : typeOf
, isNullOrUndef : isNullOrUndef
, isNumeric     : isNumeric
, isArray       : isArray
, isMap         : isMap

// Array operations suitable for use with map or reduce
, push    : push
, unshift : unshift

// HTML element generator
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
, set_indent_by    : set_indent_by
, get_indent_by    : get_indent_by

// String formatting functions
, timestamp_to_str : ts_to_str
, object_to_str    : obj_to_str
, map_to_str       : map_to_str

// Transform an object into a Name/Type/Value HTML table
, event_to_table  : evt_to_table
, object_to_table : obj_to_table
}
