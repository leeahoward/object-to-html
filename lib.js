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
// This function the cases where a simple call to JSON.stringify() would explode with a "Callstack size exceeded" error
// due to the object containing circular references
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
var evt_to_table = evt =>
  as_table(tab_props,
    // Header Row
    [ as_tr([], [ as_th([ bg_light_grey],"Property")
                , as_th([bg_light_grey],"Type")
                , as_th([bg_light_grey],"Value")
                ].join(""))

    // Event object properties
    , as_tr([], [ as_td([],"eventType")
                , as_td([], typeOf(evt.eventType))
                , as_td([], evt.eventType)
                ].join(""))
    , as_tr([], [ as_td([],"eventTypeVersion")
                , as_td([], typeOf(evt.eventTypeVersion))
                , as_td([], evt.eventTypeVersion)].join(""))
    , as_tr([], [ as_td([],"cloudEventsVersion")
                , as_td([], typeOf(evt.cloudEventsVersion))
                , as_td([], evt.cloudEventsVersion)].join(""))
    , as_tr([], [ as_td([],"source")
                , as_td([], typeOf(evt.source))
                , as_td([], evt.source)
                ].join(""))
    , as_tr([], [ as_td([],"eventID")
                , as_td([], typeOf(evt.eventID))
                , as_td([], evt.eventID)
                ].join(""))
    , as_tr([], [ as_td([],"eventTime")
                , as_td([], typeOf(evt.eventTime))
                , as_td([], ts_to_str(evt.eventTime))
                ].join(""))
    , as_tr([], [ as_td([],"schemaURL")
                , as_td([], typeOf(evt.schemaURL))
                , as_td([], evt.schemaURL)
                ].join(""))
    , as_tr([], [ as_td([],"contentType")
                , as_td([], typeOf(evt.contentType))
                , as_td([], evt.contentType)
                ].join(""))
    , as_tr([], [ as_td([],"extensions.request")
                , as_td([], typeOf(evt.extensions.request))
                , as_td([], object_to_table(evt.extensions.request))
                ].join(""))
    , as_tr([], [ as_td([],"extensions.response")
                , as_td([], typeOf(evt.extensions.response))
                , as_td([], object_to_table(evt.extensions.response))
                ].join(""))
    , as_tr([], [ as_td([],"data")
                , as_td([], typeOf(evt.data))
                , as_td([], object_to_table(evt.data))
                ].join(""))
    ].join("")
  )


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Object to table
// This function avoids the cases where a simple call to JSON.stringify() would explode with a "Callstack size exceeded"
// error due to the object containing circular references - as happens with the standard HTTP request object
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
      acc.push(
        as_tr( []
            , [ as_th([bg_light_grey],"Property")
              , as_th([bg_light_grey],"Type")
              , as_th([bg_light_grey],"Value")
              ].join("")
            )
      )

      // Show the enumerable keys
      for (var key in obj_arg) {
        cols = []
        // Add the Property Name and Type columns
        cols.push(as_td([],key))
        cols.push(as_td([],typeOf(obj_arg[key])))

        // Add the Value column
        switch (typeOf(obj_arg[key])) {
          case "Object":
            cols.push(as_td([], object_to_table(obj_arg[key], depth+1)))
            break

          case "Function":
            cols.push(as_td([],"Source code supressed"))
            break

          case "Array":
            cols.push(as_td([],obj_arg[key].join("<br>")))
            break

          default:
            cols.push(as_td([],obj_arg[key]))
        }

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
, set_indent_by    : set_indent_by
, get_indent_by    : get_indent_by
, set_tab_props    : set_tab_props
, get_tab_props    : get_tab_props

// String formatting functions
, timestamp_to_str : ts_to_str
, object_to_str    : obj_to_str
, map_to_str       : map_to_str

// Transform an object into a Name/Type/Value HTML table
, event_to_table  : evt_to_table
, object_to_table : object_to_table
}
