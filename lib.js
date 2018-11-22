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
// The arrow icon names need to be available to coding that runs both on the server-side and the client-side
var arrow_right_icon_name = "bfu-arrow-right-icon"
var arrow_down_icon_name  = "bfu-arrow-down-icon"

// Rather than referencing some external URL, image source data is stored as Base64 encoded data that is dynamically
// injected into each arrow icon by the JavaScript coding in static_src_code
var  image_src_data = [
  `var arrow_right_icon_name = "${arrow_right_icon_name}";`
, `var arrow_down_icon_name  = "${arrow_down_icon_name}";`
, `var arrow_right_src = "data:image/png;base64, ${fs.readFileSync(__dirname + "/arrow_right.b64.txt").toString()}";`
, `var arrow_down_src  = "data:image/png;base64, ${fs.readFileSync(__dirname + "/arrow_down.b64.txt").toString()}";`
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

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Return the number of enumerable properties/elements in an Object, Array or Map
// This function returns zero for all other dataypes
var sizeOf = obj => isExpandable(obj) ? expandableTypesMap.get(typeOf(obj))(obj) : 0

// *********************************************************************************************************************
// Array operations that can be used in chained function calls such as map and reduce
var push    = (arr, newEl) => (_ => arr)(arr.push(newEl))
var unshift = (arr, newEl) => (_ => arr)(arr.unshift(newEl))

// Transform a non-mappable NodeList into a standard JavaScript Array
var node_list_to_array = nl => Array.prototype.slice.call(nl)

// *********************************************************************************************************************
// Generate HTML elements
// None of these HTML elements require a closing tag
const emptyElements = [
  'area',  'base',    'basefont', 'br'
, 'col',   'frame',   'hr',       'img'
, 'input', 'isindex', 'link',     'meta'
, 'param', 'command', 'keygen',   'source']

var isEmptyElement = tag_name => emptyElements.indexOf(tag_name) >= 0

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
  // Start by assuming that the object is empty
  var return_val = empty_placeholder(obj)
  var acc        = []
  var prop_names
  
  if (sizeOf(obj) > 0) {
    // Insert the header row
    acc.push(make_table_hdr_row(col1txt, depth))

    // Transform each object property/element into a TR element
    if (isArray(obj)) {
      acc.push(obj.map((el,idx) => table_row_from_prop(obj_name, idx, el, depth)).join(""))
    }
    else if (isObject(obj)) {
      // Present object properties in alphabetic order
      prop_names = Object.keys(obj).sort()
      acc.push(prop_names.map(prop_name => table_row_from_prop(obj_name, prop_name, obj[prop_name], depth)).join(""))
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
var make_collapsible_div = (div_name, table_rows, depth) =>
  as_div( [`id="${div_name}-content"`, depth === 0 ? "" : "style='display:none'"]
        , as_table(["class='bfu-table'"], table_rows)
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
    ? expand_button_div(this_prop_name, this_el_type) +
      collapse_button_div(this_prop_name, this_el_type)
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
      , make_table_rows_from_obj(enum_name, enum_arg, columnHeadingMap.get(typeOf(enum_arg)), depth)
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
  // This value is then used as the id of the collapsible DIV containing the table
  (hdr.replace(/\s+/g, '-').toLowerCase())

// Argument tvArray must be an array in which each element is an object containing:
// { 
//   title : "<Some text string to describe this object>"
// , value : the_object_itself
// }
var create_content = tvArray => 
  isArray(tvArray) && tvArray.length > 0
  ? as_div([]
      // Parent DIV contains the style sheet
    , [ as_style([], content_table_style)
      // Image source code
      , as_script([], image_src_data)
      // However many obejcts are to be displayed
      , tvArray.map(el => create_content_table(el.title, el.value)).join("")
      // The JavaScript source code that dynamically adds the image data to each expnd/collapse icon
      , as_script(["type='text/javascript'"], static_src_code)
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

var arrow_content    = (obj_type, arrow_type) => [obj_type, as_button(["type='button'"], arrow_type)].join("")
var arrow_properties = (name, direction, action, hidden) =>
  [ `class='bfu-arrow-${direction}'`
  , `id='${name}-arrow-${direction}'`
  , `onclick="${action}('${name}')"`
  , hidden ? "style='display:none'" : ""
  ]

var expand_button_div = (obj_name, obj_type) =>
  as_div(arrow_properties(obj_name, "right", "expand", false), arrow_content(obj_type, arrow_right))

var collapse_button_div = (obj_name, obj_type) =>
  as_div(arrow_properties(obj_name, "down", "collapse", true), arrow_content(obj_type, arrow_down))

// Test using the NodeJS 'process' object
fs.writeFileSync("test.html", create_content([{title:"NodeJS Process", value:process}]))

// *********************************************************************************************************************
// PUBLIC API
// *********************************************************************************************************************
module.exports = {
  package_version    : version
, typeOf             : typeOf
, isNull             : isNull
, isUndefined        : isUndefined
, isNullOrUndef      : isNullOrUndef
, isNumeric          : isNumeric
, isArray            : isArray
, isMap              : isMap
, isObject           : isObject
, isFunction         : isFunction
, isExpandable       : isExpandable
, sizeOf             : sizeOf
, push               : push
, unshift            : unshift
, node_list_to_array : node_list_to_array
, as_html_el         : as_html_el
, as_div             : as_div   
, as_style           : as_style 
, as_script          : as_script
, as_img             : as_img   
, as_button          : as_button
, as_table           : as_table
, as_tr              : as_tr
, as_th              : as_th
, as_td              : as_td
, as_h1              : as_h1
, as_h2              : as_h2
, as_pre             : as_pre
, as_p               : as_p
, as_body            : as_body
, as_html            : as_html
, set_depth_limit    : set_depth_limit
, get_depth_limit    : get_depth_limit
, create_content     : create_content
}
