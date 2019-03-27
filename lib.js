#!/usr/bin/env node

/**
 * =====================================================================================================================
 * @fileOverview basic-formatting-utils
 * 
 * A node library containing various helpful formatting functions for transforming a JavaScript object into an HTML
 * table.
 * 
 * Nested objects are transformed into nested tables, but only down to a predetermined depth (default = 3)
 * Once the recursion limit is hit, objects and arrays are displayed as "{...}" or "[...]" respectively
 * 
 * This node app is designed to run inside a "Function as a Service" environment - I.E. a stateless K8S container that
 * disappears as soon as the response has been returned to the client.  Therefore, all data needed by the client is
 * delivered in a single HTTP response.  Hence the need for Base64 encoded image src data to be added dynamically to IMG
 * elements by client-side coding
 * 
 * Author : Chris Whealy (www.whealy.com)
 * =====================================================================================================================
 **/

var fs = require("fs")

// *********************************************************************************************************************
// Discover my own version number
var { version } = require("./package.json")

// *********************************************************************************************************************
// Limit the recursion depth used by render_value()
var depth_limit = 3

var get_depth_limit = ()  => depth_limit
var set_depth_limit = lim => depth_limit = (isNumeric(lim) && lim >= 1) ? lim : depth_limit

// *********************************************************************************************************************
// Suppress the display of functions in the output table
var suppress_fns = true

// *********************************************************************************************************************
// The arrow icon names need to be available to coding that runs both on the server-side and the client-side
var arrow_right_icon_name = "bfu-arrow-right-icon"
var arrow_down_icon_name = "bfu-arrow-down-icon"

// Rather than referencing some external URL, image source data is stored as Base64 encoded data that is dynamically
// injected into each arrow icon
var image_src_data = [
  `var arrow_right_icon_name = "${arrow_right_icon_name}";`
  , `var arrow_down_icon_name  = "${arrow_down_icon_name}";`
  , ""
  , `var arrow_right_src = "data:image/png;base64, ${fs.readFileSync(__dirname + "/arrow_right.b64.txt").toString()}";`
  , `var arrow_down_src  = "data:image/png;base64, ${fs.readFileSync(__dirname + "/arrow_down.b64.txt").toString()}";`
  , ""
  , "var set_image_src = (divObj, objSrc) => divObj.src = objSrc;"
  , ""
  , "/* Dynamically add the Base64 encoded source for the arrow icons */"
  , "[...document.getElementsByName(\`\${arrow_right_icon_name}\`)].map(el => set_image_src(el, arrow_right_src));"
  , "[...document.getElementsByName(\`\${arrow_down_icon_name}\`)].map(el => set_image_src(el, arrow_down_src));"
].join("")

// *********************************************************************************************************************
// Discover what data type the object itself thinks it has - as opposed to the data type JavaScript thinks it has
var typeOf = typeName => Object.prototype.toString.apply(typeName).slice(8).slice(0, -1)

// Partial function that creates a function to check for a specific data type
var isOfType = targetType => someObject => typeOf(someObject) === targetType

// Primitive type identifiers
var isNull      = isOfType("Null")
var isUndefined = isOfType("Undefined")
var isNumber    = isOfType("Number")
var isBigInt    = isOfType("BigInt")
var isSymbol    = isOfType("Symbol")
var isArray     = isOfType("Array")
var isMap       = isOfType("Map")
var isSet       = isOfType("Set")
var isFn        = isOfType("Function")
var isGenFn     = isOfType("GeneratorFunction")
var isJsObject  = isOfType("Object")

// The NodeJS objects 'global' and 'process' return their own names when asked their type even though they are just
// regular objects
var isNodeJsProcess = isOfType("process")
var isNodeJsGlobal  = isOfType("global")

// Disjunctive type identifiers
var isNullOrUndef = x => isNull(x) || isUndefined(x)
var isNumeric     = x => isNumber(x) || isBigInt(x)
var isFunction    = x => isFn(x) || isGenFn(x)
var isObject      = x => isJsObject(x) || isNodeJsProcess(x) || isNodeJsGlobal(x)

// A map of data types that are considered expandable together with the functions needed to return the number of
// enumerable properties or elements they contain
var expandableTypesMap = new Map()

expandableTypesMap.set("Array",   x => x.length)
expandableTypesMap.set("Map",     x => x.size)
expandableTypesMap.set("Set",     x => x.size)
expandableTypesMap.set("Object",  x => Object.keys(x).length)
expandableTypesMap.set("process", x => Object.keys(x).length)
expandableTypesMap.set("global",  x => Object.keys(x).length)

var isExpandable = x => expandableTypesMap.has(typeOf(x))

// Proxy wrapper around the expandableTypesMap to provide a default response of a function that always returns a valid
// integer when passed to the 'sizeOf' function
var expandableTypes = new Proxy(expandableTypesMap, {
  get: (map, key) => map.has(key) ? map.get(key) : () => 0
})

// Return the number of enumerable properties/elements in an expandable object
var sizeOf = obj => expandableTypes[typeOf(obj)](obj)

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Map of column headings per expandable data type
var columnHeadingMap = new Map()

columnHeadingMap.set("Array", "Index")
columnHeadingMap.set("Map", "Key")
columnHeadingMap.set("Set", "Key")

// Proxy wrapper around the columnHeadingMap to provide a default response of "Property"
var columnHeadings = new Proxy(columnHeadingMap, {
  get: (map, key) => map.has(key) ? map.get(key) : "Property"
})

// *********************************************************************************************************************
// Generate HTML elements
// None of these HTML elements require a closing tag
const emptyElements = [
  'area', 'base', 'basefont', 'br'
, 'col', 'frame', 'hr', 'img'
, 'input', 'isindex', 'link', 'meta'
, 'param', 'command', 'keygen', 'source'
]

var isEmptyElement = tag_name => emptyElements.indexOf(tag_name) >= 0

// Generate an opening HTML tag
var make_tag =
  (tag_name, props_array) =>
    (noProperties => `<${tag_name}${noProperties ? "" : " " + props_array.join(" ")}>`)
    (isNullOrUndef(props_array) || props_array.length === 0)

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Partial function to create a generic HTML element generator
// Any content passed to an empty HTML element will be ignored
var as_html_el =
  tag_name =>
    (propsArray, val) =>
      ((startTag, noContents) => `${startTag}${noContents ? "" : `${val}</${tag_name}>`}`)
      (make_tag(tag_name, propsArray), isEmptyElement(tag_name) || isNullOrUndef(val))

var as_html_el =
  tag_name =>
    (propsArray, val) =>
      ((openingTag, tagIsEmpty) => `${openingTag}${tagIsEmpty ? "" : `${val}</${tag_name}>`}`)
      (make_tag(tag_name, propsArray), isEmptyElement(tag_name) || isNullOrUndef(val))

// Functions for generating specific HTML elements
var as_a      = as_html_el("a")
var as_body   = as_html_el("body")
var as_button = as_html_el("button")
var as_div    = as_html_el("div")
var as_h1     = as_html_el("h1")
var as_h2     = as_html_el("h2")
var as_head   = as_html_el("head")
var as_html   = as_html_el("html")
var as_img    = as_html_el("img")
var as_ol     = as_html_el("ol")
var as_li     = as_html_el("li")
var as_p      = as_html_el("p")
var as_pre    = as_html_el("pre")
var as_script = as_html_el("script")
var as_span   = as_html_el("span")
var as_style  = as_html_el("style")
var as_table  = as_html_el("table")
var as_td     = as_html_el("td")
var as_th     = as_html_el("th")
var as_tr     = as_html_el("tr")
var as_ul     = as_html_el("ul")

// *********************************************************************************************************************
// Generate a header row for an NTV (Name, Type, Value) table
// If the object stores only key values and not name/value pairs (as in a Set), then the Type and value column headers
// are not needed
var make_table_hdr_row =
  (col1_txt, depth, keyOnly) =>
    keyOnly
    ? as_tr([], [ as_th(["class='bfu-th'"], col1_txt)].join(""))
    : as_tr([], [ as_th(["class='bfu-th'"], col1_txt)
                , as_th(["class='bfu-th'"], "Type")
                , as_th(["class='bfu-th'"], `Value (depth=${depth})`)
                ].join("")
      )

var empty_placeholder      = obj => isArray(obj) ? "[]" : "{}"
var suppressed_placeholder = obj => isArray(obj) ? "[...]" : "{...}"

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Transform iterable object into an array of TR elements
var make_table_rows_from_obj =
  (obj_name, obj, col1txt, depth) => {
    // Start by assuming that the object is empty
    var return_val = empty_placeholder(obj)
    var acc = []
    var prop_names
  
    if (sizeOf(obj) > 0) {
      // Insert the header row
      acc.push(make_table_hdr_row(col1txt, depth, isSet(obj)))
  
      // Transform each object property/element into a TR element
      if (isArray(obj)) {
        acc.push(
          obj.map((el, idx) => make_table_row_from_prop(obj_name, idx, el, depth))
            .join("")
        )
      }
      else if (isObject(obj)) {
        // Present object properties in alphabetic order
        prop_names = Object.keys(obj).sort()
        acc.push(
          prop_names.map(prop_name => make_table_row_from_prop(obj_name, prop_name, obj[prop_name], depth))
            .join("")
        )
      }
      else if (isMap(obj)) {
        var iter = obj[Symbol.iterator]()
  
        for (let el of iter) {
          acc.push(make_table_row_from_prop(obj_name, el[0], el[1], depth))
        }
      }
      else if (isSet(obj)) {
        obj.forEach(val => acc.push(make_table_row_from_prop(obj_name, val, null, depth, true)))
      }
  
      return_val = acc.join("")
    }
  
    return return_val
  }

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Place table rows into a table, then into a collapsible DIV
var make_collapsible_div = (div_name, table_rows, depth) =>
  as_div([`id="${div_name}-content"`, depth === 0 ? "" : "style='display:none'"]
    , as_table(["class='bfu-table'"], table_rows)
  )

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Generate a single table row for either an object property or an array or map element
// The keyOnly flag is set to true if the property belongs to an object that stores only keys (such as a Set)
var make_table_row_from_prop = (parent_name, prop_name, prop_value, depth, keyOnly) => {
  var cols = []
  var this_prop_name = `${parent_name}-${prop_name}`.toLowerCase()
  var this_el_type = typeOf(prop_value)

  // Should we suppress functions from the display?
  if (suppress_fns && isFunction(prop_value)) {
    // Yup, functions are not to be displayed, so return null
    return null
  }
  else {
    // Nope, so add contents to column 1
    // Depending on the datatype being transformed, this will be either a property or key name, or an index number
    cols.push(as_td(["class='bfu-td'"], prop_name))

    // The expand/collapse buttons should only be displayed when the following three conditions are true:
    // * The current element is expandable
    // * The expandable object has contents
    // * We are not about to exceed the recursion depth limit
    var type_col = (isExpandable(prop_value) && sizeOf(prop_value) > 0 && depth < depth_limit)
      ? expand_button_div(this_prop_name, this_el_type) + collapse_button_div(this_prop_name, this_el_type)
      : this_el_type

    // How should the current object be rendered?
    var value_col = isExpandable(prop_value)
      ? (sizeOf(prop_value) > 0)
        ? (depth < depth_limit)
          ? render_value(prop_value, this_prop_name, depth + 1)
          : suppressed_placeholder(prop_value)
        : empty_placeholder(prop_value)
      : render_value(prop_value, this_prop_name, depth + 1)

    // Add the Type and Value columns to the current row
    // If this object holds only keys (as in a Set), then Type and Value columns are not needed
    if (!keyOnly) {
      cols.push(as_td(["class='bfu-td'"], type_col))
      cols.push(as_td(["class='bfu-td'"], value_col))
    }
    // Join the row into single string then return this as a TR element
    return as_tr([], cols.join(""))
  }
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Transform the current value into a useful HTML representation.
// If the value is expandable, then create a table, otherwise, simply return the value
var render_value =
  (enum_arg, enum_name, depth) =>
    // Is the current object expandable?
    (isExpandable(enum_arg))
      // Yup, so transform it into a table.
      ? make_collapsible_div(
        enum_name
        , make_table_rows_from_obj(enum_name, enum_arg, columnHeadings[typeOf(enum_arg)], depth)
        , depth
      )
      // Nope, so if its a function then suppress the source code, else just return the value
      : isFunction(enum_arg)
        ? "Source code suppressed"
        : enum_arg

// *********************************************************************************************************************
// Create a content DIV containing a header and an object table
var create_content_table =
  (hdr, obj) =>
    (obj_name =>
      as_div(
        ["class='bfu-content'"],
        [as_h2(["class='bfu-header2'"], hdr)
          , render_value(obj, obj_name, 0)
        ].join("")
      )
    )
    // Replace spaces with dashes in the object's text name and convert to lowercase.
    // This value is then used as the id of the collapsible DIV containing the table
    (hdr.replace(/\s+/g, '-').toLowerCase())

// Argument tvArray must be an array in which each element is an object containing:
// { 
//   title : "<Some text string to describe this object>"
// , value : the_object_itself
// }
var create_content =
  tvArray =>
    isArray(tvArray) && tvArray.length > 0
      ? as_div([]
        // Parent DIV contains the style sheet
        , [as_style([], fs.readFileSync(__dirname + "/bfu-style.css").toString())
          // Transform one or more objects
          , tvArray.map(el => create_content_table(`${el.title}${suppress_fns ? " (Functions suppressed)" : ""}`, el.value)).join("")
          // Image source data and coding to dynamically that data to each expnd/collapse icon's src property
          , as_script([], image_src_data)
          // Expand and collapse functions
          , as_script(["type='text/javascript'"], fs.readFileSync(__dirname + "/expand_collapse.js").toString())
        ].join("")
      )
      : as_div([], "Nothing to see here.  Move along...")

// *********************************************************************************************************************
// Expandable/Collapsible content
// Do not add the src parameter to the expand/collapse arrow icons here as this will duplicate the large Base64 encoded
// value every time one of these icons is generated.  Instead, the src of each icon will be added dynamically by the
// client-side JavaScript code included at the end of the parent generated DIV element
var arrow_right = as_img([`name='${arrow_right_icon_name}'`])
var arrow_down  = as_img([`name='${arrow_down_icon_name}'`])

var arrow_content = (obj_type, arrow_type) => [obj_type, as_button(["type='button'"], arrow_type)].join("")

var arrow_properties =
  (name, direction, action, hidden) =>
    [`class='bfu-arrow-${direction}'`
      , `id='${name}-arrow-${direction}'`
      , `onclick="${action}('${name}')"`
      , hidden ? "style='display:none'" : ""
    ]

var expand_button_div =
  (obj_name, obj_type) =>
    as_div(arrow_properties(obj_name, "right", "expand", false), arrow_content(obj_type, arrow_right))

var collapse_button_div =
  (obj_name, obj_type) =>
    as_div(arrow_properties(obj_name, "down", "collapse", true), arrow_content(obj_type, arrow_down))


// *********************************************************************************************************************
// Partial function to create a date/time stamp for a given timezone offset in minutes
var datetime_by_timezone =
  offset =>
    date =>
      new Date(date.getTime() + (date.getTimezoneOffset() * 60000) + (60000 * offset))

// Date/Time functions for some selected time zones
var datetime_pst = datetime_by_timezone(-480)      // US Pacific Time
var datetime_est = datetime_by_timezone(-300)      // US Eastern Standard Time
var datetime_gmt = datetime_by_timezone(0)         // Greenwich Mean Time
var datetime_cet = datetime_by_timezone(60)        // Central European Time
var datetime_ist = datetime_by_timezone(330)       // India Standard Time


// *********************************************************************************************************************
// Test using the NodeJS 'process' object
// suppress_fns = false
// fs.writeFileSync(
//   "test.html"
//   , as_html(
//     []
//     , as_body([]
//       , [as_h1([], "Function called at: " + datetime_gmt(new Date()))
//         , create_content([{ title: "NodeJS process", value: process }])
//       ].join("")
//     )
//   )
// )

// *********************************************************************************************************************
// PUBLIC API
// *********************************************************************************************************************
module.exports = {
// Low-level utilities
  package_version : version
, sizeOf          : sizeOf

// Datatype identifiers
, typeOf        : typeOf
, isOfType      : isOfType
, isArray       : isArray
, isBigInt      : isBigInt
, isExpandable  : isExpandable
, isFunction    : isFunction
, isMap         : isMap
, isNull        : isNull
, isNullOrUndef : isNullOrUndef
, isNumber      : isNumber
, isNumeric     : isNumeric
, isObject      : isObject
, isSet         : isSet
, isSymbol      : isSymbol
, isUndefined   : isUndefined

// HTML utilities
, set_depth_limit : set_depth_limit
, get_depth_limit : get_depth_limit
, show_fns        : () => suppress_fns = false
, hide_fns        : () => suppress_fns = true
, as_html_el      : as_html_el
, as_a            : as_a
, as_body         : as_body
, as_button       : as_button
, as_div          : as_div
, as_h1           : as_h1
, as_h2           : as_h2
, as_html         : as_html
, as_head         : as_head
, as_img          : as_img
, as_li           : as_li
, as_ol           : as_ol
, as_p            : as_p
, as_pre          : as_pre
, as_script       : as_script
, as_span         : as_span
, as_style        : as_style
, as_table        : as_table
, as_td           : as_td
, as_th           : as_th
, as_tr           : as_tr
, as_ul           : as_ul

// Main entry point with synonym functions
, create_content : create_content
, show_objects   : create_content
, show_object    : (title, val) => create_content([{ title: title, value: val }])

// Date/Time functions
, datetime_by_timezone : datetime_by_timezone
, datetime_pst         : datetime_pst
, datetime_est         : datetime_est
, datetime_gmt         : datetime_gmt
, datetime_cet         : datetime_cet
, datetime_ist         : datetime_ist

// NodeJS convenience functions
, show_nodejs_global  : () => create_content([{ title: "NodeJS global", value: global }])
, show_nodejs_process : () => create_content([{ title: "NodeJS process", value: process }])
}
