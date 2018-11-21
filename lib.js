#!/usr/bin/env node

/**
 * =====================================================================================================================
 * @fileOverview basic-formatting-utils
 * 
 * A node library containing various helpful formatting functions for transforming a JavaScript object into an HTML
 * table.
 * 
 * Nested objects are transformed into nested tables, but only down to a predetermined depth (default = 2)
 * Once the recursion limit is hit, objects are displayed as "{...}"
 * 
 * This node app is designed to run inside a "Function as a Service" environment - I.E. a stateless K8S container that
 * disappears as soon as the response has been returned to the client.  Therefore, all data needed by the client is
 * delivered in a single HTTP response.  This includes image source data
 * 
 * Author : Chris Whealy (www.whealy.com)
 * =====================================================================================================================
 **/

//var fs = require("fs")

// *********************************************************************************************************************
// Discover my own version number
var { version } = require("./package.json")



// *********************************************************************************************************************
// Limit the recursion depth used by render_value()
var depth_limit = 3

var get_depth_limit = ()  => depth_limit
var set_depth_limit = lim => depth_limit = (isNumeric(lim) && lim >= 1) ? lim : depth_limit



// *********************************************************************************************************************
// The arrow icon names are used by coding that runs both on the server-side and the client-side
var arrow_right_icon_name = "bfu-arrow-right-icon"
var arrow_down_icon_name  = "bfu-arrow-down-icon"

// Rather than referencing some external URL, image source data is stored as Base64 encoded data that is dynamically
// injected into each arrow icon by the JavaScript coding in static_src_code
var  image_src_data = [
  `var arrow_right_icon_name = '${arrow_right_icon_name}';`
, `var arrow_down_icon_name  = '${arrow_down_icon_name}';`
, "var arrow_right_src = \"data:image/png;base64, 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\";"
, "var arrow_down_src  = \"data:image/png;base64, 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\";"
].join("")

var  static_src_code = [
  "var node_list_to_array = nl => Array.prototype.slice.call(nl);"
, "var set_image_src = (divObj, objSrc) => divObj.src = objSrc;"
, ""
, "var expand = elName => {"
, "  document.getElementById(`${elName}-content`).style.display = \"block\";"
, "  document.getElementById(`${elName}-arrow-down`).style.display = \"block\";"
, "  document.getElementById(`${elName}-arrow-right`).style.display = \"none\";"
, "};"
, ""
, "var collapse = elName => {"
, "  document.getElementById(\`\${elName}-content\`).style.display = \"none\";"
, "  document.getElementById(\`\${elName}-arrow-down\`).style.display = \"none\";"
, "  document.getElementById(\`\${elName}-arrow-right\`).style.display = \"block\";"
, "};"
, ""
, "/* Dynamically add the Base64 encoded source for the arrow icons */"
, "node_list_to_array(document.getElementsByName(\`\${arrow_right_icon_name}\`)).map(el => set_image_src(el, arrow_right_src));"
, "node_list_to_array(document.getElementsByName(\`\${arrow_down_icon_name}\`)).map(el => set_image_src(el, arrow_down_src));"
].join("")


// *********************************************************************************************************************
// Type checking operations
var typeOf        = x => Object.prototype.toString.apply(x).slice(8).slice(0, -1)
var isNull        = x => x === null
var isUndefined   = x => x === undefined
var isNullOrUndef = x => isNull(x) || isUndefined(x)

var isNumeric     = x => typeOf(x) === "Number"
var isArray       = x => typeOf(x) === "Array"
var isMap         = x => typeOf(x) === "Map"
var isFunction    = x => typeOf(x) === "Function"

// The NodeJS objects 'global' and 'process' return their own names when asked their type even though they are just
// regular objects
var isObject = x => (t => t === "Object" || t === "process" || t === "global")(typeOf(x))

// A map of expandable data types and the functions needed to return the respective number of enumerable properties or
// elements they might contain
var expandableTypesMap = new Map()

expandableTypesMap.set("Array",   x => x.length)
expandableTypesMap.set("Map",     x => x.size)
expandableTypesMap.set("Object",  x => Object.keys(x).length)
expandableTypesMap.set("process", x => Object.keys(x).length)
expandableTypesMap.set("global",  x => Object.keys(x).length)

var isExpandable = x => expandableTypesMap.has(typeOf(x))

// Map of columns headings per expandable data type
var columnHeadingMap = new Map()

columnHeadingMap.set("Array",   "Index")
columnHeadingMap.set("Map",     "Key")
columnHeadingMap.set("Object",  "Property")
columnHeadingMap.set("process", "Property")
columnHeadingMap.set("global",  "Property")

// *********************************************************************************************************************
// Return the number of enumerable properties/elements in an Object, Array or Map
// This function returns zero for all other dataypes
var sizeOf = obj => isExpandable(obj) ? expandableTypesMap.get(typeOf(obj))(obj) : 0

// *********************************************************************************************************************
// Array operations that can be used in chained function calls such as map and reduce
var push    = (arr, newEl) => (_ => arr)(arr.push(newEl))
var unshift = (arr, newEl) => (_ => arr)(arr.unshift(newEl))

// Transform a non-mappable NodeList into a standard JavaScript Array
var node_list_to_array = nl => Array.prototype.slice.call(nl)



// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Timestamp to string
var ts_to_str = ts_arg => isNullOrUndef(ts_arg) ? ts_arg : (new Date(ts_arg)).toLocaleString()



// *********************************************************************************************************************
// Generate HTML elements
// None of these HTML elements require a closing tag
const emptyElements = [
  'area',  'base',    'basefont', 'br'
, 'col',   'frame',   'hr',       'img'
, 'input', 'isindex', 'link',     'meta'
, 'param', 'command', 'keygen',   'source']

// Basic CSS formating
// "bfu-" prefix added to all class names to avoid potential name clashes
var content_table_style = [
   ".bfu-table { float:left; border-collapse: collapse; }"
 , ".bfu-table, .bfu-th, .bfu-td { border: 1px solid grey; }"
 , ".bfu-th, .bfu-td { padding: 3px; }"
 , ".bfu-th { background-color:#DDD; }"
 , ".bfu-arrow-down { float: left; }"
 , ".bfu-arrow-right { float: left; }"
 , ".bfu-content { display: table-row; }"
 , ".bfu-header2 { margin-top: 1em; }"
].join(" ")

var isEmptyElement = tag_name => emptyElements.indexOf(tag_name) >= 0

// Generate an opening HTML tag
var make_tag = (tag_name, props_array) =>
  `<${tag_name}${(isNullOrUndef(props_array) || props_array.length === 0 ? "" : " " + props_array.join(" "))}>`

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Generic HTML element generator
// Call this partial function with the element's tag name.
// It returns a function requiring two arguments:
// 1) An array of the element's property values,
// 2) The element's content in a form that is either a string, or where calling that object's toString() function
//    returns something useful
//
// Any content passed to an empty HTML element will be ignored
var as_html_el = tag_name =>
  (propsArray, val) =>
    `${make_tag(tag_name, propsArray)}${isEmptyElement(tag_name) || isNullOrUndef(val) ? "" : `${val}</${tag_name}>`}`

// Functions for generating specific HTML elements
var as_div    = as_html_el("div")
var as_style  = as_html_el("style")
var as_script = as_html_el("script")
var as_img    = as_html_el("img")
var as_button = as_html_el("button")
var as_table  = as_html_el("table")
var as_tr     = as_html_el("tr")
var as_td     = as_html_el("td")
var as_th     = as_html_el("th")
var as_h1     = as_html_el("h1")
var as_h2     = as_html_el("h2")
var as_pre    = as_html_el("pre")
var as_p      = as_html_el("p")
var as_body   = as_html_el("body")
var as_html   = as_html_el("html")



// *********************************************************************************************************************
// Generate a header row for an NTV (Name, Type, Value) table
var make_table_hdr_row = (col1_txt, depth) =>
  as_tr([], [ as_th(["class='bfu-th'"], col1_txt)
            , as_th(["class='bfu-th'"], "Type")
            , as_th(["class='bfu-th'"], `Value (depth=${depth})`)
            ].join("")
       )

var empty_placeholder      = obj => isArray(obj) ? "[]"    : "{}"
var suppressed_placeholder = obj => isArray(obj) ? "[...]" : "{...}"

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Transform iterable object into an array of TR elements
var make_table_rows_from_obj = (obj_name, obj, col1txt, depth) => {
  var acc        = []
  var return_val = empty_placeholder(obj)

  if (sizeOf(obj) > 0) {
    // Insert the header row
    acc.push(make_table_hdr_row(col1txt, depth))

    // Transform each object property/element into a TR element
    if (isArray(obj)) {
      acc.push(obj.map((el,idx) => table_row_from_prop(obj_name, idx, el, depth)).join(""))
    }
    else if (isObject(obj)) {
      for (var key in obj) {
        acc.push(table_row_from_prop(obj_name, key, obj[key], depth))
      }
    }
    else if (isMap(obj)) {
      var iter = obj[Symbol.iterator]()
        
      for (let el of iter) {
        acc.push(table_row_from_prop(obj_name, el[0], el[1], depth))
      }
    }

    return_val = acc.join("")
  }

  return return_val
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Place table rows into a table, then into a collapsible DIV
var make_collapsible_div = (div_name, content, depth) =>
  as_div( [`id="${div_name}-content"`, depth === 0 ? "" : "style='display:none'"]
        , as_table([ "class='bfu-table'"], content)
        )

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Generate a single table row for either an object property or an array or map element
var table_row_from_prop = (parent_name, prop_name, prop_value, depth) => {
  var cols           = []
  var this_prop_name = `${parent_name}-${prop_name}`.toLowerCase()
  var this_el_type   = typeOf(prop_value)

  // Add contents to column 1
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
        ? render_value(prop_value, this_prop_name, depth+1)
        : suppressed_placeholder(prop_value)
      : empty_placeholder(prop_value)
    : render_value(prop_value, this_prop_name, depth+1)

  // Add the Type and Value columns to the current row
  cols.push(as_td(["class='bfu-td'"], type_col))
  cols.push(as_td(["class='bfu-td'"], value_col))
  
  // Join the row into single string then return this as a TR element
  return as_tr([], cols.join(""))
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Transform the current value into a useful HTML representation.
// If the value is expandable, then create a table, otherwise, simply return the value
var render_value = (enum_arg, enum_name, depth) =>
  // Is the current object expandable?
  (isExpandable(enum_arg))
    // Yup, so transform it into a table.
    ? make_collapsible_div(
        enum_name
      , make_table_rows_from_obj(
          enum_name
        , enum_arg
        , columnHeadingMap.get(typeOf(enum_arg))
        , depth
        )
      , depth
      )
    // Nope, so is it a function?
    : isFunction(enum_arg)
      ? "Source code suppressed"
      // Just return the value
      : enum_arg



// *********************************************************************************************************************
// Create a content DIV containing a header and an object table
var create_content_table = (hdr, obj) =>
  (obj_name =>
    as_div(
      ["class='bfu-content'"],
      [ as_h2(["class='bfu-header2'"], hdr)
      , render_value(obj, obj_name, 0)
      ].join("")
    )
  )
  // Replace spaces with dashes in the object's text name and convert to lowercase.
  // This value is then used as the HTML id for the table
  (hdr.replace(/\s+/g, '-').toLowerCase())


// Argument nvArray must be an array in which each element is an object containing:
// { 
//   title : "<Some text string to describe this object>"
// , value : the_object_itself
// }
var create_content = nvArray => 
  !isNullOrUndef(nvArray) && nvArray.length > 0
  ? as_div([]
      // Parent DIV contains the style sheet
    , [ as_style([], content_table_style)
      // Image source code
      , as_script([], image_src_data)
      // However many obejcts are to be displayed
      , nvArray.map(el => create_content_table(el.title, el.value)).join("")
      // The JavaScript source code that dynamically adds the image data to each expnd/collapse icon
      , as_script(["type='text/javascript'"], static_src_code)
      ].join("")
    )
  : ""



// *********************************************************************************************************************
// Expandable/Collapsible content
// Do not add the src parameter to the expand/collapse arrow icons here as this will duplicate the large Base64 encoded
// value every time one of these icons is generated.  Instead, the src of each icon will be added dynamically by the
// client-side JavaScript code included at the end of the parent generated DIV element
var arrow_right = as_img([`name='${arrow_right_icon_name}'`])
var arrow_down  = as_img([`name='${arrow_down_icon_name}'`])

var expand_button_div = (obj_name, obj_type) =>
  as_div(
    ["class='bfu-arrow-right'", `id='${obj_name}-arrow-right'`, `onclick="expand('${obj_name}')"`]
  , [obj_type, as_button(["type='button'"], arrow_right)].join("")
  )

var collapse_button_div = (obj_name, obj_type) =>
  as_div(
    ["class='bfu-arrow-down'", `id='${obj_name}-arrow-down'`, "style='display:none'", `onclick="collapse('${obj_name}')"`]
  , [obj_type, as_button(["type='button'"], arrow_down)].join("")
  )

//fs.writeFileSync("test.html", create_content([{title:"NodeJS Process", value:process}]))

  // *********************************************************************************************************************
// PUBLIC API
// *********************************************************************************************************************
module.exports = {
  // My own version number
  package_version : version

  // Type identifiers
, typeOf        : typeOf
, isNull        : isNull
, isUndefined   : isUndefined
, isNullOrUndef : isNullOrUndef
, isNumeric     : isNumeric
, isArray       : isArray
, isMap         : isMap
, isObject      : isObject
, isFunction    : isFunction

// Returns true if passed a Map, Array or Object; false for all other data types
, isExpandable : isExpandable

// Return the number of enumerable elements or properties with a Map, Array or Object
, sizeOf : sizeOf

// Array operations suitable for use with map or reduce
, push    : push
, unshift : unshift

, node_list_to_array : node_list_to_array

// Partial function to generate a generic HTML element
, as_html_el : as_html_el

// Specific HTML element functions
, as_div     : as_div   
, as_style   : as_style 
, as_script  : as_script
, as_img     : as_img   
, as_button  : as_button
, as_table   : as_table
, as_tr      : as_tr
, as_th      : as_th
, as_td      : as_td
, as_h1      : as_h1
, as_h2      : as_h2
, as_pre     : as_pre
, as_p       : as_p
, as_body    : as_body
, as_html    : as_html


// Formatting parameters
, set_depth_limit  : set_depth_limit
, get_depth_limit  : get_depth_limit

// String formatting functions
, timestamp_to_str : ts_to_str

// Wrap all supplied objects and their titles in a DIV with a style sheet
, create_content : create_content
}
