/**
 * AUTO-GENERATED: Pine Script v6 Parameter Requirements
 * Generated: 2025-12-23T15:21:44.768Z
 * Source: https://www.tradingview.com/pine-script-reference/v6/
 * Functions: 497
 */

export interface FunctionParameter {
	name: string;
	type: string;
	description?: string;
	optional: boolean;
	required: boolean;
	explicitlyOptional?: boolean;
	explicitlyRequired?: boolean;
}

export interface FunctionSignatureSpec {
	name: string;
	syntax: string;
	description?: string;
	requiredParams: string[];
	optionalParams: string[];
	signature: string;
	parameters: FunctionParameter[];
	returns?: string; // Added in Session 5 for type inference
}

export const PINE_FUNCTIONS: Record<string, FunctionSignatureSpec> = {
 "alert.alert": {
  "name": "alert.alert",
  "syntax": "alert.alert()",
  "description": "Pine Script v6 function: alert.alert",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "alert.alert()",
  "parameters": [],
  "returns": "unknown"
 },
 "alert.alertcondition": {
  "name": "alert.alertcondition",
  "syntax": "alert.alertcondition()",
  "description": "Pine Script v6 function: alert.alertcondition",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "alert.alertcondition()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.abs": {
  "name": "array.abs",
  "syntax": "array.abs()",
  "description": "Pine Script v6 function: array.abs",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.abs()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.avg": {
  "name": "array.avg",
  "syntax": "array.avg()",
  "description": "Pine Script v6 function: array.avg",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.avg()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.binary_search": {
  "name": "array.binary_search",
  "syntax": "array.binary_search()",
  "description": "Pine Script v6 function: array.binary_search",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.binary_search()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.binary_search_leftmost": {
  "name": "array.binary_search_leftmost",
  "syntax": "array.binary_search_leftmost()",
  "description": "Pine Script v6 function: array.binary_search_leftmost",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.binary_search_leftmost()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.binary_search_rightmost": {
  "name": "array.binary_search_rightmost",
  "syntax": "array.binary_search_rightmost()",
  "description": "Pine Script v6 function: array.binary_search_rightmost",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.binary_search_rightmost()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.clear": {
  "name": "array.clear",
  "syntax": "array.clear()",
  "description": "Pine Script v6 function: array.clear",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.clear()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.concat": {
  "name": "array.concat",
  "syntax": "array.concat()",
  "description": "Pine Script v6 function: array.concat",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.concat()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.copy": {
  "name": "array.copy",
  "syntax": "array.copy()",
  "description": "Pine Script v6 function: array.copy",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.copy()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.covariance": {
  "name": "array.covariance",
  "syntax": "array.covariance()",
  "description": "Pine Script v6 function: array.covariance",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.covariance()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.every": {
  "name": "array.every",
  "syntax": "array.every()",
  "description": "Pine Script v6 function: array.every",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.every()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.fill": {
  "name": "array.fill",
  "syntax": "array.fill()",
  "description": "Pine Script v6 function: array.fill",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.fill()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.first": {
  "name": "array.first",
  "syntax": "array.first()",
  "description": "Pine Script v6 function: array.first",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.first()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.from": {
  "name": "array.from",
  "syntax": "array.from()",
  "description": "Pine Script v6 function: array.from",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.from()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.get": {
  "name": "array.get",
  "syntax": "array.get(id, index) → series <type>",
  "description": "The function returns the value of the element at the specified index.",
  "requiredParams": [
   "id",
   "index"
  ],
  "optionalParams": [],
  "signature": "array.get(id, index) → series <type>",
  "parameters": [
   {
    "name": "id",
    "type": "any array type",
    "description": "An array object.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "index",
    "type": "series int",
    "description": "The index of the element whose value is to be returned.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "series <type>"
 },
 "array.includes": {
  "name": "array.includes",
  "syntax": "array.includes()",
  "description": "Pine Script v6 function: array.includes",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.includes()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.indexof": {
  "name": "array.indexof",
  "syntax": "array.indexof()",
  "description": "Pine Script v6 function: array.indexof",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.indexof()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.insert": {
  "name": "array.insert",
  "syntax": "array.insert()",
  "description": "Pine Script v6 function: array.insert",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.insert()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.join": {
  "name": "array.join",
  "syntax": "array.join()",
  "description": "Pine Script v6 function: array.join",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.join()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.last": {
  "name": "array.last",
  "syntax": "array.last()",
  "description": "Pine Script v6 function: array.last",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.last()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.lastindexof": {
  "name": "array.lastindexof",
  "syntax": "array.lastindexof()",
  "description": "Pine Script v6 function: array.lastindexof",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.lastindexof()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.max": {
  "name": "array.max",
  "syntax": "array.max()",
  "description": "Pine Script v6 function: array.max",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.max()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.median": {
  "name": "array.median",
  "syntax": "array.median()",
  "description": "Pine Script v6 function: array.median",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.median()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.min": {
  "name": "array.min",
  "syntax": "array.min()",
  "description": "Pine Script v6 function: array.min",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.min()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.mode": {
  "name": "array.mode",
  "syntax": "array.mode()",
  "description": "Pine Script v6 function: array.mode",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.mode()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.new_bool": {
  "name": "array.new_bool",
  "syntax": "array.new_bool()",
  "description": "Pine Script v6 function: array.new_bool",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.new_bool()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.new_box": {
  "name": "array.new_box",
  "syntax": "array.new_box()",
  "description": "Pine Script v6 function: array.new_box",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.new_box()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.new_color": {
  "name": "array.new_color",
  "syntax": "array.new_color()",
  "description": "Pine Script v6 function: array.new_color",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.new_color()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.new_float": {
  "name": "array.new_float",
  "syntax": "array.new_float()",
  "description": "Pine Script v6 function: array.new_float",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.new_float()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.new_int": {
  "name": "array.new_int",
  "syntax": "array.new_int()",
  "description": "Pine Script v6 function: array.new_int",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.new_int()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.new_label": {
  "name": "array.new_label",
  "syntax": "array.new_label()",
  "description": "Pine Script v6 function: array.new_label",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.new_label()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.new_line": {
  "name": "array.new_line",
  "syntax": "array.new_line()",
  "description": "Pine Script v6 function: array.new_line",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.new_line()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.new_linefill": {
  "name": "array.new_linefill",
  "syntax": "array.new_linefill()",
  "description": "Pine Script v6 function: array.new_linefill",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.new_linefill()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.new_string": {
  "name": "array.new_string",
  "syntax": "array.new_string()",
  "description": "Pine Script v6 function: array.new_string",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.new_string()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.new_table": {
  "name": "array.new_table",
  "syntax": "array.new_table()",
  "description": "Pine Script v6 function: array.new_table",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.new_table()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.new": {
  "name": "array.new",
  "syntax": "array.new()",
  "description": "",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.new()",
  "parameters": [],
  "returns": ""
 },
 "array.percentile_linear_interpolation": {
  "name": "array.percentile_linear_interpolation",
  "syntax": "array.percentile_linear_interpolation()",
  "description": "Pine Script v6 function: array.percentile_linear_interpolation",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.percentile_linear_interpolation()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.percentile_nearest_rank": {
  "name": "array.percentile_nearest_rank",
  "syntax": "array.percentile_nearest_rank()",
  "description": "Pine Script v6 function: array.percentile_nearest_rank",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.percentile_nearest_rank()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.percentrank": {
  "name": "array.percentrank",
  "syntax": "array.percentrank()",
  "description": "Pine Script v6 function: array.percentrank",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.percentrank()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.pop": {
  "name": "array.pop",
  "syntax": "array.pop()",
  "description": "Pine Script v6 function: array.pop",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.pop()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.push": {
  "name": "array.push",
  "syntax": "array.push(id, value) → void",
  "description": "The function appends a value to an array.",
  "requiredParams": [
   "id",
   "value"
  ],
  "optionalParams": [],
  "signature": "array.push(id, value) → void",
  "parameters": [
   {
    "name": "id",
    "type": "any array type",
    "description": "An array object.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "value",
    "type": "series <type of the array's elements>",
    "description": "The value of the element added to the end of the array.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "void"
 },
 "array.range": {
  "name": "array.range",
  "syntax": "array.range()",
  "description": "Pine Script v6 function: array.range",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.range()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.remove": {
  "name": "array.remove",
  "syntax": "array.remove()",
  "description": "Pine Script v6 function: array.remove",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.remove()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.reverse": {
  "name": "array.reverse",
  "syntax": "array.reverse()",
  "description": "Pine Script v6 function: array.reverse",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.reverse()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.set": {
  "name": "array.set",
  "syntax": "array.set()",
  "description": "Pine Script v6 function: array.set",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.set()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.shift": {
  "name": "array.shift",
  "syntax": "array.shift()",
  "description": "Pine Script v6 function: array.shift",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.shift()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.size": {
  "name": "array.size",
  "syntax": "array.size(id) → series int",
  "description": "The function returns the number of elements in an array.",
  "requiredParams": [
   "id"
  ],
  "optionalParams": [],
  "signature": "array.size(id) → series int",
  "parameters": [
   {
    "name": "id",
    "type": "any array type",
    "description": "An array object.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "series int"
 },
 "array.slice": {
  "name": "array.slice",
  "syntax": "array.slice()",
  "description": "Pine Script v6 function: array.slice",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.slice()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.some": {
  "name": "array.some",
  "syntax": "array.some()",
  "description": "Pine Script v6 function: array.some",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.some()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.sort": {
  "name": "array.sort",
  "syntax": "array.sort()",
  "description": "Pine Script v6 function: array.sort",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.sort()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.sort_indices": {
  "name": "array.sort_indices",
  "syntax": "array.sort_indices()",
  "description": "Pine Script v6 function: array.sort_indices",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.sort_indices()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.standardize": {
  "name": "array.standardize",
  "syntax": "array.standardize()",
  "description": "Pine Script v6 function: array.standardize",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.standardize()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.stdev": {
  "name": "array.stdev",
  "syntax": "array.stdev()",
  "description": "Pine Script v6 function: array.stdev",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.stdev()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.sum": {
  "name": "array.sum",
  "syntax": "array.sum()",
  "description": "Pine Script v6 function: array.sum",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.sum()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.unshift": {
  "name": "array.unshift",
  "syntax": "array.unshift()",
  "description": "Pine Script v6 function: array.unshift",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.unshift()",
  "parameters": [],
  "returns": "unknown"
 },
 "array.variance": {
  "name": "array.variance",
  "syntax": "array.variance()",
  "description": "Pine Script v6 function: array.variance",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "array.variance()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.copy": {
  "name": "box.copy",
  "syntax": "box.copy()",
  "description": "Pine Script v6 function: box.copy",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.copy()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.delete": {
  "name": "box.delete",
  "syntax": "box.delete()",
  "description": "Pine Script v6 function: box.delete",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.delete()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.get_bottom": {
  "name": "box.get_bottom",
  "syntax": "box.get_bottom()",
  "description": "Pine Script v6 function: box.get_bottom",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.get_bottom()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.get_left": {
  "name": "box.get_left",
  "syntax": "box.get_left()",
  "description": "Pine Script v6 function: box.get_left",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.get_left()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.get_right": {
  "name": "box.get_right",
  "syntax": "box.get_right()",
  "description": "Pine Script v6 function: box.get_right",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.get_right()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.get_top": {
  "name": "box.get_top",
  "syntax": "box.get_top()",
  "description": "Pine Script v6 function: box.get_top",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.get_top()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.new": {
  "name": "box.new",
  "syntax": "box.new(top_left, bottom_right, border_color, border_width, border_style, extend, xloc, bgcolor, text, text_size, text_color, text_halign, text_valign, text_wrap, text_font_family, force_overlay, text_formatting) → series box",
  "description": "Creates a new box object.",
  "requiredParams": [
   "top_left",
   "bottom_right",
   "border_color",
   "border_width",
   "border_style",
   "extend",
   "xloc",
   "bgcolor",
   "text",
   "text_size",
   "text_color",
   "text_halign",
   "text_valign",
   "text_wrap",
   "text_font_family",
   "force_overlay",
   "text_formatting"
  ],
  "optionalParams": [],
  "signature": "box.new(top_left, bottom_right, border_color, border_width, border_style, extend, xloc, bgcolor, text, text_size, text_color, text_halign, text_valign, text_wrap, text_font_family, force_overlay, text_formatting) → series box",
  "parameters": [
   {
    "name": "top_left",
    "type": "chart.point",
    "description": "A chart.point object that specifies the top-left corner location of the box.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "bottom_right",
    "type": "chart.point",
    "description": "A chart.point object that specifies the bottom-right corner location of the box.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "border_color",
    "type": "series color",
    "description": "Color of the four borders. Optional. The default is color.blue.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "border_width",
    "type": "series int",
    "description": "Width of the four borders, in pixels. Optional. The default is 1 pixel.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "border_style",
    "type": "series string",
    "description": "Style of the four borders. Possible values: line.style_solid, line.style_dotted, line.style_dashed. Optional. The default value is line.style_solid.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "extend",
    "type": "series string",
    "description": "When extend.none is used, the horizontal borders start at the left border and end at the right border. With extend.left or extend.right, the horizontal borders are extended indefinitely to the left or right of the box, respectively. With extend.both, the horizontal borders are extended on both sides. Optional. The default value is extend.none.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "xloc",
    "type": "series string",
    "description": "Determines whether the arguments to 'left' and 'right' are a bar index or a time value. If xloc = xloc.bar_index, the arguments must be a bar index. If xloc = xloc.bar_time, the arguments must be a UNIX time. Possible values: xloc.bar_index and xloc.bar_time. Optional. The default is xloc.bar_index.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "bgcolor",
    "type": "series color",
    "description": "Background color of the box. Optional. The default is color.blue.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "text",
    "type": "series string",
    "description": "The text to be displayed inside the box. Optional. The default is empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "text_size",
    "type": "series int/string",
    "description": "Optional. Size of the box's text. The size can be any positive integer, or one of the size.* built-in constant strings. The constant strings and their equivalent integer values are: size.auto (0), size.tiny (8), size.small (10), size.normal (14), size.large (20), size.huge (36). The default value is size.auto or 0.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "text_color",
    "type": "series color",
    "description": "The color of the text. Optional. The default is color.black.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "text_halign",
    "type": "series string",
    "description": "The horizontal alignment of the box's text. Optional. The default value is text.align_center. Possible values: text.align_left, text.align_center, text.align_right.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "text_valign",
    "type": "series string",
    "description": "The vertical alignment of the box's text. Optional. The default value is text.align_center. Possible values: text.align_top, text.align_center, text.align_bottom.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "text_wrap",
    "type": "series string",
    "description": "Optional. Whether to wrap text. Wrapped text starts a new line when it reaches the side of the box. Wrapped text lower than the bottom of the box is not displayed. Unwrapped text stays on a single line and is displayed past the width of the box if it is too long. If the text_size is 0 or text.wrap_auto, this setting has no effect. The default value is text.wrap_none. Possible values: text.wrap_none, text.wrap_auto.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "text_font_family",
    "type": "series string",
    "description": "The font family of the text. Optional. The default value is font.family_default. Possible values: font.family_default, font.family_monospace.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "force_overlay",
    "type": "const bool",
    "description": "If true, the drawing will display on the main chart pane, even when the script occupies a separate pane. Optional. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "text_formatting",
    "type": "const text_format",
    "description": "The formatting of the displayed text. Formatting options support addition. For example, text.format_bold + text.format_italic will make the text both bold and italicized. Possible values: text.format_none, text.format_bold, text.format_italic. Optional. The default is text.format_none.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "series box"
 },
 "box.set_bgcolor": {
  "name": "box.set_bgcolor",
  "syntax": "box.set_bgcolor()",
  "description": "Pine Script v6 function: box.set_bgcolor",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_bgcolor()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_border_color": {
  "name": "box.set_border_color",
  "syntax": "box.set_border_color()",
  "description": "Pine Script v6 function: box.set_border_color",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_border_color()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_border_style": {
  "name": "box.set_border_style",
  "syntax": "box.set_border_style()",
  "description": "Pine Script v6 function: box.set_border_style",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_border_style()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_border_width": {
  "name": "box.set_border_width",
  "syntax": "box.set_border_width()",
  "description": "Pine Script v6 function: box.set_border_width",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_border_width()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_bottom": {
  "name": "box.set_bottom",
  "syntax": "box.set_bottom()",
  "description": "Pine Script v6 function: box.set_bottom",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_bottom()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_bottom_right_point": {
  "name": "box.set_bottom_right_point",
  "syntax": "box.set_bottom_right_point()",
  "description": "Pine Script v6 function: box.set_bottom_right_point",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_bottom_right_point()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_extend": {
  "name": "box.set_extend",
  "syntax": "box.set_extend()",
  "description": "Pine Script v6 function: box.set_extend",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_extend()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_left": {
  "name": "box.set_left",
  "syntax": "box.set_left()",
  "description": "Pine Script v6 function: box.set_left",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_left()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_lefttop": {
  "name": "box.set_lefttop",
  "syntax": "box.set_lefttop()",
  "description": "Pine Script v6 function: box.set_lefttop",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_lefttop()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_right": {
  "name": "box.set_right",
  "syntax": "box.set_right()",
  "description": "Pine Script v6 function: box.set_right",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_right()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_rightbottom": {
  "name": "box.set_rightbottom",
  "syntax": "box.set_rightbottom()",
  "description": "Pine Script v6 function: box.set_rightbottom",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_rightbottom()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_text": {
  "name": "box.set_text",
  "syntax": "box.set_text()",
  "description": "Pine Script v6 function: box.set_text",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_text()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_text_color": {
  "name": "box.set_text_color",
  "syntax": "box.set_text_color()",
  "description": "Pine Script v6 function: box.set_text_color",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_text_color()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_text_font_family": {
  "name": "box.set_text_font_family",
  "syntax": "box.set_text_font_family()",
  "description": "Pine Script v6 function: box.set_text_font_family",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_text_font_family()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_text_formatting": {
  "name": "box.set_text_formatting",
  "syntax": "box.set_text_formatting()",
  "description": "Pine Script v6 function: box.set_text_formatting",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_text_formatting()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_text_halign": {
  "name": "box.set_text_halign",
  "syntax": "box.set_text_halign()",
  "description": "Pine Script v6 function: box.set_text_halign",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_text_halign()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_text_size": {
  "name": "box.set_text_size",
  "syntax": "box.set_text_size()",
  "description": "Pine Script v6 function: box.set_text_size",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_text_size()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_text_valign": {
  "name": "box.set_text_valign",
  "syntax": "box.set_text_valign()",
  "description": "Pine Script v6 function: box.set_text_valign",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_text_valign()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_text_wrap": {
  "name": "box.set_text_wrap",
  "syntax": "box.set_text_wrap()",
  "description": "Pine Script v6 function: box.set_text_wrap",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_text_wrap()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_top": {
  "name": "box.set_top",
  "syntax": "box.set_top()",
  "description": "Pine Script v6 function: box.set_top",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_top()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_top_left_point": {
  "name": "box.set_top_left_point",
  "syntax": "box.set_top_left_point()",
  "description": "Pine Script v6 function: box.set_top_left_point",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_top_left_point()",
  "parameters": [],
  "returns": "unknown"
 },
 "box.set_xloc": {
  "name": "box.set_xloc",
  "syntax": "box.set_xloc()",
  "description": "Pine Script v6 function: box.set_xloc",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box.set_xloc()",
  "parameters": [],
  "returns": "unknown"
 },
 "chart.point.copy": {
  "name": "chart.point.copy",
  "syntax": "chart.point.copy()",
  "description": "Pine Script v6 function: chart.point.copy",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "chart.point.copy()",
  "parameters": [],
  "returns": "unknown"
 },
 "chart.point.from_index": {
  "name": "chart.point.from_index",
  "syntax": "chart.point.from_index()",
  "description": "Pine Script v6 function: chart.point.from_index",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "chart.point.from_index()",
  "parameters": [],
  "returns": "unknown"
 },
 "chart.point.from_time": {
  "name": "chart.point.from_time",
  "syntax": "chart.point.from_time()",
  "description": "Pine Script v6 function: chart.point.from_time",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "chart.point.from_time()",
  "parameters": [],
  "returns": "unknown"
 },
 "chart.point.new": {
  "name": "chart.point.new",
  "syntax": "chart.point.new()",
  "description": "Pine Script v6 function: chart.point.new",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "chart.point.new()",
  "parameters": [],
  "returns": "unknown"
 },
 "chart.point.now": {
  "name": "chart.point.now",
  "syntax": "chart.point.now()",
  "description": "Pine Script v6 function: chart.point.now",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "chart.point.now()",
  "parameters": [],
  "returns": "unknown"
 },
 "color.b": {
  "name": "color.b",
  "syntax": "color.b()",
  "description": "Pine Script v6 function: color.b",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "color.b()",
  "parameters": [],
  "returns": "unknown"
 },
 "color.from_gradient": {
  "name": "color.from_gradient",
  "syntax": "color.from_gradient()",
  "description": "Pine Script v6 function: color.from_gradient",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "color.from_gradient()",
  "parameters": [],
  "returns": "unknown"
 },
 "color.g": {
  "name": "color.g",
  "syntax": "color.g()",
  "description": "Pine Script v6 function: color.g",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "color.g()",
  "parameters": [],
  "returns": "unknown"
 },
 "color.new": {
  "name": "color.new",
  "syntax": "color.new(color, transp) → const color",
  "description": "Function color applies the specified transparency to the given color.",
  "requiredParams": [
   "color",
   "transp"
  ],
  "optionalParams": [],
  "signature": "color.new(color, transp) → const color",
  "parameters": [
   {
    "name": "color",
    "type": "const color",
    "description": "Color to apply transparency to.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "transp",
    "type": "const int/float",
    "description": "Possible values are from 0 (not transparent) to 100 (invisible).",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "const color"
 },
 "color.r": {
  "name": "color.r",
  "syntax": "color.r()",
  "description": "Pine Script v6 function: color.r",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "color.r()",
  "parameters": [],
  "returns": "unknown"
 },
 "color.rgb": {
  "name": "color.rgb",
  "syntax": "color.rgb(red, green, blue, transp) → const color",
  "description": "Creates a new color with transparency using the RGB color model.",
  "requiredParams": [
   "red",
   "green",
   "blue",
   "transp"
  ],
  "optionalParams": [],
  "signature": "color.rgb(red, green, blue, transp) → const color",
  "parameters": [
   {
    "name": "red",
    "type": "const int/float",
    "description": "Red color component. Possible values are from 0 to 255.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "green",
    "type": "const int/float",
    "description": "Green color component. Possible values are from 0 to 255.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "blue",
    "type": "const int/float",
    "description": "Blue color component. Possible values are from 0 to 255.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "transp",
    "type": "const int/float",
    "description": "Optional. Color transparency. Possible values are from 0 (opaque) to 100 (invisible). Default value is 0.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "const color"
 },
 "color.t": {
  "name": "color.t",
  "syntax": "color.t()",
  "description": "Pine Script v6 function: color.t",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "color.t()",
  "parameters": [],
  "returns": "unknown"
 },
 "input.color": {
  "name": "input.color",
  "syntax": "input.color(defval, title, tooltip, inline, group, confirm, display, active) → input color",
  "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a color picker that allows the user to select a color and transparency, either from a palette or a hex value.",
  "requiredParams": [
   "defval",
   "title",
   "tooltip",
   "inline",
   "group",
   "confirm",
   "display",
   "active"
  ],
  "optionalParams": [],
  "signature": "input.color(defval, title, tooltip, inline, group, confirm, display, active) → input color",
  "parameters": [
   {
    "name": "defval",
    "type": "const color",
    "description": "Determines the default value of the input variable proposed in the script's \"Settings/Inputs\" tab, from where the user can change it.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "title",
    "type": "const string",
    "description": "Title of the input. If not specified, the variable name is used as the input's title. If the title is specified, but it is empty, the name will be an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "tooltip",
    "type": "const string",
    "description": "The string that will be shown to the user when hovering over the tooltip icon.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "inline",
    "type": "const string",
    "description": "Combines all the input calls using the same argument in one line. The string used as an argument is not displayed. It is only used to identify inputs belonging to the same line.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "group",
    "type": "const string",
    "description": "Creates a header above all inputs using the same group argument string. The string is also used as the header's text.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "confirm",
    "type": "const bool",
    "description": "If true, then user will be asked to confirm input value before indicator is added to chart. Default value is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "display",
    "type": "const plot_display",
    "description": "Controls where the script will display the input's information, aside from within the script's settings. This option allows one to remove a specific input from the script's status line or the Data Window to ensure only the most necessary inputs are displayed there. Possible values: display.none, display.data_window, display.status_line, display.all. Optional. The default is display.none.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "active",
    "type": "input bool",
    "description": "Optional. Specifies whether users can change the value of the input in the script's \"Settings/Inputs\" tab. The script can use this parameter to set the state of the input based on the values of other inputs. If true, users can change the value of the input. If false, the input is grayed out, and users cannot change the value. The default is true.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "input color"
 },
 "input.enum": {
  "name": "input.enum",
  "syntax": "input.enum()",
  "description": "Pine Script v6 function: input.enum",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "input.enum()",
  "parameters": [],
  "returns": "unknown"
 },
 "input.float": {
  "name": "input.float",
  "syntax": "input.float(defval, title, options, tooltip, inline, group, confirm, display, active) → input float",
  "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for a float input to the script's inputs.",
  "requiredParams": [
   "defval",
   "title",
   "options",
   "tooltip",
   "inline",
   "group",
   "confirm",
   "display",
   "active"
  ],
  "optionalParams": [],
  "signature": "input.float(defval, title, options, tooltip, inline, group, confirm, display, active) → input float",
  "parameters": [
   {
    "name": "defval",
    "type": "const int/float",
    "description": "Determines the default value of the input variable proposed in the script's \"Settings/Inputs\" tab, from where script users can change it. When a list of values is used with the options parameter, the value must be one of them.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "title",
    "type": "const string",
    "description": "Title of the input. If not specified, the variable name is used as the input's title. If the title is specified, but it is empty, the name will be an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "options",
    "type": "tuple of const int/float values: [val1, val2, ...]",
    "description": "A list of options to choose from a dropdown menu, separated by commas and enclosed in square brackets: [val1, val2, ...]. When using this parameter, the minval, maxval and step parameters cannot be used.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "tooltip",
    "type": "const string",
    "description": "The string that will be shown to the user when hovering over the tooltip icon.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "inline",
    "type": "const string",
    "description": "Combines all the input calls using the same argument in one line. The string used as an argument is not displayed. It is only used to identify inputs belonging to the same line.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "group",
    "type": "const string",
    "description": "Creates a header above all inputs using the same group argument string. The string is also used as the header's text.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "confirm",
    "type": "const bool",
    "description": "If true, then user will be asked to confirm input value before indicator is added to chart. Default value is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "display",
    "type": "const plot_display",
    "description": "Controls where the script will display the input's information, aside from within the script's settings. This option allows one to remove a specific input from the script's status line or the Data Window to ensure only the most necessary inputs are displayed there. Possible values: display.none, display.data_window, display.status_line, display.all. Optional. The default is display.all.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "active",
    "type": "input bool",
    "description": "Optional. Specifies whether users can change the value of the input in the script's \"Settings/Inputs\" tab. The script can use this parameter to set the state of the input based on the values of other inputs. If true, users can change the value of the input. If false, the input is grayed out, and users cannot change the value. The default is true.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "input float"
 },
 "input.int": {
  "name": "input.int",
  "syntax": "input.int(defval, title, options, tooltip, inline, group, confirm, display, active) → input int",
  "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for an integer input to the script's inputs.",
  "requiredParams": [
   "defval",
   "title",
   "options",
   "tooltip",
   "inline",
   "group",
   "confirm",
   "display",
   "active"
  ],
  "optionalParams": [],
  "signature": "input.int(defval, title, options, tooltip, inline, group, confirm, display, active) → input int",
  "parameters": [
   {
    "name": "defval",
    "type": "const int",
    "description": "Determines the default value of the input variable proposed in the script's \"Settings/Inputs\" tab, from where script users can change it. When a list of values is used with the options parameter, the value must be one of them.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "title",
    "type": "const string",
    "description": "Title of the input. If not specified, the variable name is used as the input's title. If the title is specified, but it is empty, the name will be an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "options",
    "type": "tuple of const int values: [val1, val2, ...]",
    "description": "A list of options to choose from a dropdown menu, separated by commas and enclosed in square brackets: [val1, val2, ...]. When using this parameter, the minval, maxval and step parameters cannot be used.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "tooltip",
    "type": "const string",
    "description": "The string that will be shown to the user when hovering over the tooltip icon.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "inline",
    "type": "const string",
    "description": "Combines all the input calls using the same argument in one line. The string used as an argument is not displayed. It is only used to identify inputs belonging to the same line.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "group",
    "type": "const string",
    "description": "Creates a header above all inputs using the same group argument string. The string is also used as the header's text.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "confirm",
    "type": "const bool",
    "description": "If true, then user will be asked to confirm input value before indicator is added to chart. Default value is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "display",
    "type": "const plot_display",
    "description": "Controls where the script will display the input's information, aside from within the script's settings. This option allows one to remove a specific input from the script's status line or the Data Window to ensure only the most necessary inputs are displayed there. Possible values: display.none, display.data_window, display.status_line, display.all. Optional. The default is display.all.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "active",
    "type": "input bool",
    "description": "Optional. Specifies whether users can change the value of the input in the script's \"Settings/Inputs\" tab. The script can use this parameter to set the state of the input based on the values of other inputs. If true, users can change the value of the input. If false, the input is grayed out, and users cannot change the value. The default is true.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "input int"
 },
 "input.price": {
  "name": "input.price",
  "syntax": "input.price()",
  "description": "Pine Script v6 function: input.price",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "input.price()",
  "parameters": [],
  "returns": "unknown"
 },
 "input.session": {
  "name": "input.session",
  "syntax": "input.session()",
  "description": "Pine Script v6 function: input.session",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "input.session()",
  "parameters": [],
  "returns": "unknown"
 },
 "input.source": {
  "name": "input.source",
  "syntax": "input.source(defval, title, tooltip, inline, group, display, active, confirm) → series float",
  "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a dropdown that allows the user to select a source for the calculation, e.g. close, hl2, etc. The user can also select an output from another indicator on their chart as the source.",
  "requiredParams": [
   "defval",
   "title",
   "tooltip",
   "inline",
   "group",
   "display",
   "active",
   "confirm"
  ],
  "optionalParams": [],
  "signature": "input.source(defval, title, tooltip, inline, group, display, active, confirm) → series float",
  "parameters": [
   {
    "name": "defval",
    "type": "open/high/low/close/hl2/hlc3/ohlc4/hlcc4",
    "description": "Determines the default value of the input variable proposed in the script's \"Settings/Inputs\" tab, from where the user can change it.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "title",
    "type": "const string",
    "description": "Title of the input. If not specified, the variable name is used as the input's title. If the title is specified, but it is empty, the name will be an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "tooltip",
    "type": "const string",
    "description": "The string that will be shown to the user when hovering over the tooltip icon.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "inline",
    "type": "const string",
    "description": "Combines all the input calls using the same argument in one line. The string used as an argument is not displayed. It is only used to identify inputs belonging to the same line.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "group",
    "type": "const string",
    "description": "Creates a header above all inputs using the same group argument string. The string is also used as the header's text.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "display",
    "type": "const plot_display",
    "description": "Controls where the script will display the input's information, aside from within the script's settings. This option allows one to remove a specific input from the script's status line or the Data Window to ensure only the most necessary inputs are displayed there. Possible values: display.none, display.data_window, display.status_line, display.all. Optional. The default is display.all.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "active",
    "type": "input bool",
    "description": "Optional. Specifies whether users can change the value of the input in the script's \"Settings/Inputs\" tab. The script can use this parameter to set the state of the input based on the values of other inputs. If true, users can change the value of the input. If false, the input is grayed out, and users cannot change the value. The default is true.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "confirm",
    "type": "const bool",
    "description": "If true, then user will be asked to confirm input value before indicator is added to chart. Default value is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "series float"
 },
 "input.string": {
  "name": "input.string",
  "syntax": "input.string(defval, title, options, tooltip, inline, group, confirm, display, active) → input string",
  "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for a string input to the script's inputs.",
  "requiredParams": [
   "defval",
   "title",
   "options",
   "tooltip",
   "inline",
   "group",
   "confirm",
   "display",
   "active"
  ],
  "optionalParams": [],
  "signature": "input.string(defval, title, options, tooltip, inline, group, confirm, display, active) → input string",
  "parameters": [
   {
    "name": "defval",
    "type": "const string",
    "description": "Determines the default value of the input variable proposed in the script's \"Settings/Inputs\" tab, from where the user can change it. When a list of values is used with the options parameter, the value must be one of them.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "title",
    "type": "const string",
    "description": "Title of the input. If not specified, the variable name is used as the input's title. If the title is specified, but it is empty, the name will be an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "options",
    "type": "tuple of const string values: [val1, val2, ...]",
    "description": "A list of options to choose from.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "tooltip",
    "type": "const string",
    "description": "The string that will be shown to the user when hovering over the tooltip icon.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "inline",
    "type": "const string",
    "description": "Combines all the input calls using the same argument in one line. The string used as an argument is not displayed. It is only used to identify inputs belonging to the same line.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "group",
    "type": "const string",
    "description": "Creates a header above all inputs using the same group argument string. The string is also used as the header's text.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "confirm",
    "type": "const bool",
    "description": "If true, then user will be asked to confirm input value before indicator is added to chart. Default value is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "display",
    "type": "const plot_display",
    "description": "Controls where the script will display the input's information, aside from within the script's settings. This option allows one to remove a specific input from the script's status line or the Data Window to ensure only the most necessary inputs are displayed there. Possible values: display.none, display.data_window, display.status_line, display.all. Optional. The default is display.all.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "active",
    "type": "input bool",
    "description": "Optional. Specifies whether users can change the value of the input in the script's \"Settings/Inputs\" tab. The script can use this parameter to set the state of the input based on the values of other inputs. If true, users can change the value of the input. If false, the input is grayed out, and users cannot change the value. The default is true.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "input string"
 },
 "input.symbol": {
  "name": "input.symbol",
  "syntax": "input.symbol()",
  "description": "Pine Script v6 function: input.symbol",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "input.symbol()",
  "parameters": [],
  "returns": "unknown"
 },
 "input.text_area": {
  "name": "input.text_area",
  "syntax": "input.text_area()",
  "description": "Pine Script v6 function: input.text_area",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "input.text_area()",
  "parameters": [],
  "returns": "unknown"
 },
 "input.time": {
  "name": "input.time",
  "syntax": "input.time()",
  "description": "Pine Script v6 function: input.time",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "input.time()",
  "parameters": [],
  "returns": "unknown"
 },
 "input.timeframe": {
  "name": "input.timeframe",
  "syntax": "input.timeframe()",
  "description": "Pine Script v6 function: input.timeframe",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "input.timeframe()",
  "parameters": [],
  "returns": "unknown"
 },
 "input.resolution": {
  "name": "input.resolution",
  "syntax": "input.resolution()",
  "description": "Pine Script v6 function: input.resolution",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "input.resolution()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.copy": {
  "name": "label.copy",
  "syntax": "label.copy()",
  "description": "Pine Script v6 function: label.copy",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.copy()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.delete": {
  "name": "label.delete",
  "syntax": "label.delete()",
  "description": "Pine Script v6 function: label.delete",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.delete()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.get_text": {
  "name": "label.get_text",
  "syntax": "label.get_text()",
  "description": "Pine Script v6 function: label.get_text",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.get_text()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.get_x": {
  "name": "label.get_x",
  "syntax": "label.get_x()",
  "description": "Pine Script v6 function: label.get_x",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.get_x()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.get_y": {
  "name": "label.get_y",
  "syntax": "label.get_y()",
  "description": "Pine Script v6 function: label.get_y",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.get_y()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.new": {
  "name": "label.new",
  "syntax": "label.new(point, text, xloc, yloc, color, style, textcolor, size, textalign, tooltip, text_font_family, force_overlay, text_formatting) → series label",
  "description": "Creates new label object.",
  "requiredParams": [
   "point",
   "text",
   "xloc",
   "yloc",
   "color",
   "style",
   "textcolor",
   "size",
   "textalign",
   "tooltip",
   "text_font_family",
   "force_overlay",
   "text_formatting"
  ],
  "optionalParams": [],
  "signature": "label.new(point, text, xloc, yloc, color, style, textcolor, size, textalign, tooltip, text_font_family, force_overlay, text_formatting) → series label",
  "parameters": [
   {
    "name": "point",
    "type": "chart.point",
    "description": "A chart.point object that specifies the label's location.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "text",
    "type": "series string",
    "description": "Label text. Default is empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "xloc",
    "type": "series string",
    "description": "See description of x argument. Possible values: xloc.bar_index and xloc.bar_time. Default is xloc.bar_index.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "yloc",
    "type": "series string",
    "description": "Possible values are yloc.price, yloc.abovebar, yloc.belowbar. If yloc=yloc.price, y argument specifies the price of the label position. If yloc=yloc.abovebar, label is located above bar. If yloc=yloc.belowbar, label is located below bar. Default is yloc.price.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "color",
    "type": "series color",
    "description": "Color of the label border and arrow",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "style",
    "type": "series string",
    "description": "Label style. Possible values: label.style_none, label.style_xcross, label.style_cross, label.style_triangleup, label.style_triangledown, label.style_flag, label.style_circle, label.style_arrowup, label.style_arrowdown, label.style_label_up, label.style_label_down, label.style_label_left, label.style_label_right, label.style_label_lower_left, label.style_label_lower_right, label.style_label_upper_left, label.style_label_upper_right, label.style_label_center, label.style_square, label.style_diamond, label.style_text_outline. Default is label.style_label_down.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "textcolor",
    "type": "series color",
    "description": "Text color.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "size",
    "type": "series int/string",
    "description": "Optional. Size of the label. Accepts a positive int value or one of the built-in size.* constants. The constants and their equivalent numeric sizes are: size.auto (0), size.tiny (~7), size.small (~10), size.normal (12), size.large (18), size.huge (24). The default value is size.normal, which represents the numeric size of 12.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "textalign",
    "type": "series string",
    "description": "Label text alignment. Possible values: text.align_left, text.align_center, text.align_right. Default value is text.align_center.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "tooltip",
    "type": "series string",
    "description": "Hover to see tooltip label.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "text_font_family",
    "type": "series string",
    "description": "The font family of the text. Optional. The default value is font.family_default. Possible values: font.family_default, font.family_monospace.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "force_overlay",
    "type": "const bool",
    "description": "If true, the drawing will display on the main chart pane, even when the script occupies a separate pane. Optional. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "text_formatting",
    "type": "const text_format",
    "description": "The formatting of the displayed text. Formatting options support addition. For example, text.format_bold + text.format_italic will make the text both bold and italicized. Possible values: text.format_none, text.format_bold, text.format_italic. Optional. The default is text.format_none.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "series label"
 },
 "label.set_color": {
  "name": "label.set_color",
  "syntax": "label.set_color()",
  "description": "Pine Script v6 function: label.set_color",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_color()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.set_point": {
  "name": "label.set_point",
  "syntax": "label.set_point()",
  "description": "Pine Script v6 function: label.set_point",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_point()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.set_size": {
  "name": "label.set_size",
  "syntax": "label.set_size()",
  "description": "Pine Script v6 function: label.set_size",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_size()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.set_style": {
  "name": "label.set_style",
  "syntax": "label.set_style()",
  "description": "Pine Script v6 function: label.set_style",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_style()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.set_text": {
  "name": "label.set_text",
  "syntax": "label.set_text()",
  "description": "Pine Script v6 function: label.set_text",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_text()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.set_text_font_family": {
  "name": "label.set_text_font_family",
  "syntax": "label.set_text_font_family()",
  "description": "Pine Script v6 function: label.set_text_font_family",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_text_font_family()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.set_text_formatting": {
  "name": "label.set_text_formatting",
  "syntax": "label.set_text_formatting()",
  "description": "Pine Script v6 function: label.set_text_formatting",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_text_formatting()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.set_textalign": {
  "name": "label.set_textalign",
  "syntax": "label.set_textalign()",
  "description": "Pine Script v6 function: label.set_textalign",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_textalign()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.set_textcolor": {
  "name": "label.set_textcolor",
  "syntax": "label.set_textcolor()",
  "description": "Pine Script v6 function: label.set_textcolor",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_textcolor()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.set_tooltip": {
  "name": "label.set_tooltip",
  "syntax": "label.set_tooltip()",
  "description": "Pine Script v6 function: label.set_tooltip",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_tooltip()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.set_x": {
  "name": "label.set_x",
  "syntax": "label.set_x()",
  "description": "Pine Script v6 function: label.set_x",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_x()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.set_xloc": {
  "name": "label.set_xloc",
  "syntax": "label.set_xloc()",
  "description": "Pine Script v6 function: label.set_xloc",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_xloc()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.set_xy": {
  "name": "label.set_xy",
  "syntax": "label.set_xy()",
  "description": "Pine Script v6 function: label.set_xy",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_xy()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.set_y": {
  "name": "label.set_y",
  "syntax": "label.set_y()",
  "description": "Pine Script v6 function: label.set_y",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_y()",
  "parameters": [],
  "returns": "unknown"
 },
 "label.set_yloc": {
  "name": "label.set_yloc",
  "syntax": "label.set_yloc()",
  "description": "Pine Script v6 function: label.set_yloc",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label.set_yloc()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.copy": {
  "name": "line.copy",
  "syntax": "line.copy()",
  "description": "Pine Script v6 function: line.copy",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.copy()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.delete": {
  "name": "line.delete",
  "syntax": "line.delete()",
  "description": "Pine Script v6 function: line.delete",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.delete()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.get_price": {
  "name": "line.get_price",
  "syntax": "line.get_price()",
  "description": "Pine Script v6 function: line.get_price",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.get_price()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.get_x1": {
  "name": "line.get_x1",
  "syntax": "line.get_x1()",
  "description": "Pine Script v6 function: line.get_x1",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.get_x1()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.get_x2": {
  "name": "line.get_x2",
  "syntax": "line.get_x2()",
  "description": "Pine Script v6 function: line.get_x2",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.get_x2()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.get_y1": {
  "name": "line.get_y1",
  "syntax": "line.get_y1()",
  "description": "Pine Script v6 function: line.get_y1",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.get_y1()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.get_y2": {
  "name": "line.get_y2",
  "syntax": "line.get_y2()",
  "description": "Pine Script v6 function: line.get_y2",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.get_y2()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.new": {
  "name": "line.new",
  "syntax": "line.new(first_point, second_point, xloc, extend, color, style, width, force_overlay) → series line",
  "description": "Creates new line object.",
  "requiredParams": [
   "first_point",
   "second_point",
   "xloc",
   "extend",
   "color",
   "style",
   "width",
   "force_overlay"
  ],
  "optionalParams": [],
  "signature": "line.new(first_point, second_point, xloc, extend, color, style, width, force_overlay) → series line",
  "parameters": [
   {
    "name": "first_point",
    "type": "chart.point",
    "description": "A chart.point object that specifies the line's starting coordinate.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "second_point",
    "type": "chart.point",
    "description": "A chart.point object that specifies the line's ending coordinate.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "xloc",
    "type": "series string",
    "description": "See description of x1 argument. Possible values: xloc.bar_index and xloc.bar_time. Default is xloc.bar_index.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "extend",
    "type": "series string",
    "description": "If extend=extend.none, draws segment starting at point (x1, y1) and ending at point (x2, y2). If extend is equal to extend.right or extend.left, draws a ray starting at point (x1, y1) or (x2, y2), respectively. If extend=extend.both, draws a straight line that goes through these points. Default value is extend.none.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "color",
    "type": "series color",
    "description": "Line color.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "style",
    "type": "series string",
    "description": "Line style. Possible values: line.style_solid, line.style_dotted, line.style_dashed, line.style_arrow_left, line.style_arrow_right, line.style_arrow_both.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "width",
    "type": "series int",
    "description": "Line width in pixels.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "force_overlay",
    "type": "const bool",
    "description": "If true, the drawing will display on the main chart pane, even when the script occupies a separate pane. Optional. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "series line"
 },
 "line.set_color": {
  "name": "line.set_color",
  "syntax": "line.set_color()",
  "description": "Pine Script v6 function: line.set_color",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.set_color()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.set_extend": {
  "name": "line.set_extend",
  "syntax": "line.set_extend()",
  "description": "Pine Script v6 function: line.set_extend",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.set_extend()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.set_first_point": {
  "name": "line.set_first_point",
  "syntax": "line.set_first_point()",
  "description": "Pine Script v6 function: line.set_first_point",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.set_first_point()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.set_second_point": {
  "name": "line.set_second_point",
  "syntax": "line.set_second_point()",
  "description": "Pine Script v6 function: line.set_second_point",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.set_second_point()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.set_style": {
  "name": "line.set_style",
  "syntax": "line.set_style()",
  "description": "Pine Script v6 function: line.set_style",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.set_style()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.set_width": {
  "name": "line.set_width",
  "syntax": "line.set_width()",
  "description": "Pine Script v6 function: line.set_width",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.set_width()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.set_x1": {
  "name": "line.set_x1",
  "syntax": "line.set_x1()",
  "description": "Pine Script v6 function: line.set_x1",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.set_x1()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.set_x2": {
  "name": "line.set_x2",
  "syntax": "line.set_x2()",
  "description": "Pine Script v6 function: line.set_x2",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.set_x2()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.set_xloc": {
  "name": "line.set_xloc",
  "syntax": "line.set_xloc()",
  "description": "Pine Script v6 function: line.set_xloc",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.set_xloc()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.set_xy1": {
  "name": "line.set_xy1",
  "syntax": "line.set_xy1()",
  "description": "Pine Script v6 function: line.set_xy1",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.set_xy1()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.set_xy2": {
  "name": "line.set_xy2",
  "syntax": "line.set_xy2()",
  "description": "Pine Script v6 function: line.set_xy2",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.set_xy2()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.set_y1": {
  "name": "line.set_y1",
  "syntax": "line.set_y1()",
  "description": "Pine Script v6 function: line.set_y1",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.set_y1()",
  "parameters": [],
  "returns": "unknown"
 },
 "line.set_y2": {
  "name": "line.set_y2",
  "syntax": "line.set_y2()",
  "description": "Pine Script v6 function: line.set_y2",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line.set_y2()",
  "parameters": [],
  "returns": "unknown"
 },
 "linefill.delete": {
  "name": "linefill.delete",
  "syntax": "linefill.delete()",
  "description": "Pine Script v6 function: linefill.delete",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "linefill.delete()",
  "parameters": [],
  "returns": "unknown"
 },
 "linefill.get_line1": {
  "name": "linefill.get_line1",
  "syntax": "linefill.get_line1()",
  "description": "Pine Script v6 function: linefill.get_line1",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "linefill.get_line1()",
  "parameters": [],
  "returns": "unknown"
 },
 "linefill.get_line2": {
  "name": "linefill.get_line2",
  "syntax": "linefill.get_line2()",
  "description": "Pine Script v6 function: linefill.get_line2",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "linefill.get_line2()",
  "parameters": [],
  "returns": "unknown"
 },
 "linefill.new": {
  "name": "linefill.new",
  "syntax": "linefill.new()",
  "description": "Pine Script v6 function: linefill.new",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "linefill.new()",
  "parameters": [],
  "returns": "unknown"
 },
 "linefill.set_color": {
  "name": "linefill.set_color",
  "syntax": "linefill.set_color()",
  "description": "Pine Script v6 function: linefill.set_color",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "linefill.set_color()",
  "parameters": [],
  "returns": "unknown"
 },
 "log.error": {
  "name": "log.error",
  "syntax": "log.error()",
  "description": "Pine Script v6 function: log.error",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "log.error()",
  "parameters": [],
  "returns": "unknown"
 },
 "log.info": {
  "name": "log.info",
  "syntax": "log.info()",
  "description": "Pine Script v6 function: log.info",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "log.info()",
  "parameters": [],
  "returns": "unknown"
 },
 "log.warning": {
  "name": "log.warning",
  "syntax": "log.warning()",
  "description": "Pine Script v6 function: log.warning",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "log.warning()",
  "parameters": [],
  "returns": "unknown"
 },
 "map.clear": {
  "name": "map.clear",
  "syntax": "map.clear()",
  "description": "Pine Script v6 function: map.clear",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "map.clear()",
  "parameters": [],
  "returns": "unknown"
 },
 "map.contains": {
  "name": "map.contains",
  "syntax": "map.contains()",
  "description": "Pine Script v6 function: map.contains",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "map.contains()",
  "parameters": [],
  "returns": "unknown"
 },
 "map.copy": {
  "name": "map.copy",
  "syntax": "map.copy()",
  "description": "Pine Script v6 function: map.copy",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "map.copy()",
  "parameters": [],
  "returns": "unknown"
 },
 "map.get": {
  "name": "map.get",
  "syntax": "map.get()",
  "description": "Pine Script v6 function: map.get",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "map.get()",
  "parameters": [],
  "returns": "unknown"
 },
 "map.keys": {
  "name": "map.keys",
  "syntax": "map.keys()",
  "description": "Pine Script v6 function: map.keys",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "map.keys()",
  "parameters": [],
  "returns": "unknown"
 },
 "map.new": {
  "name": "map.new",
  "syntax": "map.new()",
  "description": "Pine Script v6 function: map.new",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "map.new()",
  "parameters": [],
  "returns": "unknown"
 },
 "map.put": {
  "name": "map.put",
  "syntax": "map.put()",
  "description": "Pine Script v6 function: map.put",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "map.put()",
  "parameters": [],
  "returns": "unknown"
 },
 "map.put_all": {
  "name": "map.put_all",
  "syntax": "map.put_all()",
  "description": "Pine Script v6 function: map.put_all",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "map.put_all()",
  "parameters": [],
  "returns": "unknown"
 },
 "map.remove": {
  "name": "map.remove",
  "syntax": "map.remove()",
  "description": "Pine Script v6 function: map.remove",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "map.remove()",
  "parameters": [],
  "returns": "unknown"
 },
 "map.size": {
  "name": "map.size",
  "syntax": "map.size()",
  "description": "Pine Script v6 function: map.size",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "map.size()",
  "parameters": [],
  "returns": "unknown"
 },
 "map.values": {
  "name": "map.values",
  "syntax": "map.values()",
  "description": "Pine Script v6 function: map.values",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "map.values()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.abs": {
  "name": "math.abs",
  "syntax": "math.abs(number) → const int",
  "description": "Absolute value of number is number if number >= 0, or -number otherwise.",
  "requiredParams": [
   "number"
  ],
  "optionalParams": [],
  "signature": "math.abs(number) → const int",
  "parameters": [
   {
    "name": "number",
    "type": "const int",
    "description": "The number to use in the calculation.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "const int"
 },
 "math.acos": {
  "name": "math.acos",
  "syntax": "math.acos()",
  "description": "Pine Script v6 function: math.acos",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.acos()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.asin": {
  "name": "math.asin",
  "syntax": "math.asin()",
  "description": "Pine Script v6 function: math.asin",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.asin()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.atan": {
  "name": "math.atan",
  "syntax": "math.atan()",
  "description": "Pine Script v6 function: math.atan",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.atan()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.avg": {
  "name": "math.avg",
  "syntax": "math.avg()",
  "description": "Pine Script v6 function: math.avg",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.avg()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.ceil": {
  "name": "math.ceil",
  "syntax": "math.ceil()",
  "description": "Pine Script v6 function: math.ceil",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.ceil()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.cos": {
  "name": "math.cos",
  "syntax": "math.cos()",
  "description": "Pine Script v6 function: math.cos",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.cos()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.exp": {
  "name": "math.exp",
  "syntax": "math.exp()",
  "description": "Pine Script v6 function: math.exp",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.exp()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.floor": {
  "name": "math.floor",
  "syntax": "math.floor(number) → const int",
  "description": "Rounds the specified number down to the largest whole number (\"int\" value) that is less than or equal to it.",
  "requiredParams": [
   "number"
  ],
  "optionalParams": [],
  "signature": "math.floor(number) → const int",
  "parameters": [
   {
    "name": "number",
    "type": "const int/float",
    "description": "The number to round.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "const int"
 },
 "math.log": {
  "name": "math.log",
  "syntax": "math.log()",
  "description": "Pine Script v6 function: math.log",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.log()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.log10": {
  "name": "math.log10",
  "syntax": "math.log10()",
  "description": "Pine Script v6 function: math.log10",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.log10()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.max": {
  "name": "math.max",
  "syntax": "math.max(number0, number1, ...) → const int",
  "description": "Returns the greatest of multiple values.",
  "requiredParams": [
   "number0",
   "number1"
  ],
  "optionalParams": [],
  "signature": "math.max(number0, number1, ...) → const int",
  "parameters": [
   {
    "name": "number0",
    "type": "unknown",
    "description": "",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "number1",
    "type": "unknown",
    "description": "",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "const int"
 },
 "math.min": {
  "name": "math.min",
  "syntax": "math.min(number0, number1, ...) → const int",
  "description": "Returns the smallest of multiple values.",
  "requiredParams": [
   "number0",
   "number1"
  ],
  "optionalParams": [],
  "signature": "math.min(number0, number1, ...) → const int",
  "parameters": [
   {
    "name": "number0",
    "type": "unknown",
    "description": "",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "number1",
    "type": "unknown",
    "description": "",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "const int"
 },
 "math.pow": {
  "name": "math.pow",
  "syntax": "math.pow()",
  "description": "Pine Script v6 function: math.pow",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.pow()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.random": {
  "name": "math.random",
  "syntax": "math.random()",
  "description": "Pine Script v6 function: math.random",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.random()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.round": {
  "name": "math.round",
  "syntax": "math.round(number) → const int",
  "description": "Returns the value of number rounded to the nearest integer, with ties rounding up. If the precision parameter is used, returns a float value rounded to that amount of decimal places.",
  "requiredParams": [
   "number"
  ],
  "optionalParams": [],
  "signature": "math.round(number) → const int",
  "parameters": [
   {
    "name": "number",
    "type": "const int/float",
    "description": "The value to be rounded.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "const int"
 },
 "math.round_to_mintick": {
  "name": "math.round_to_mintick",
  "syntax": "math.round_to_mintick()",
  "description": "Pine Script v6 function: math.round_to_mintick",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.round_to_mintick()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.sign": {
  "name": "math.sign",
  "syntax": "math.sign()",
  "description": "Pine Script v6 function: math.sign",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.sign()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.sin": {
  "name": "math.sin",
  "syntax": "math.sin()",
  "description": "Pine Script v6 function: math.sin",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.sin()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.sqrt": {
  "name": "math.sqrt",
  "syntax": "math.sqrt()",
  "description": "Pine Script v6 function: math.sqrt",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.sqrt()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.sum": {
  "name": "math.sum",
  "syntax": "math.sum()",
  "description": "Pine Script v6 function: math.sum",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.sum()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.tan": {
  "name": "math.tan",
  "syntax": "math.tan()",
  "description": "Pine Script v6 function: math.tan",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.tan()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.todegrees": {
  "name": "math.todegrees",
  "syntax": "math.todegrees()",
  "description": "Pine Script v6 function: math.todegrees",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.todegrees()",
  "parameters": [],
  "returns": "unknown"
 },
 "math.toradians": {
  "name": "math.toradians",
  "syntax": "math.toradians()",
  "description": "Pine Script v6 function: math.toradians",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "math.toradians()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.add_col": {
  "name": "matrix.add_col",
  "syntax": "matrix.add_col()",
  "description": "Pine Script v6 function: matrix.add_col",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.add_col()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.add_row": {
  "name": "matrix.add_row",
  "syntax": "matrix.add_row()",
  "description": "Pine Script v6 function: matrix.add_row",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.add_row()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.avg": {
  "name": "matrix.avg",
  "syntax": "matrix.avg()",
  "description": "Pine Script v6 function: matrix.avg",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.avg()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.col": {
  "name": "matrix.col",
  "syntax": "matrix.col()",
  "description": "Pine Script v6 function: matrix.col",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.col()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.columns": {
  "name": "matrix.columns",
  "syntax": "matrix.columns()",
  "description": "Pine Script v6 function: matrix.columns",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.columns()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.concat": {
  "name": "matrix.concat",
  "syntax": "matrix.concat()",
  "description": "Pine Script v6 function: matrix.concat",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.concat()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.copy": {
  "name": "matrix.copy",
  "syntax": "matrix.copy()",
  "description": "Pine Script v6 function: matrix.copy",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.copy()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.det": {
  "name": "matrix.det",
  "syntax": "matrix.det()",
  "description": "Pine Script v6 function: matrix.det",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.det()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.diff": {
  "name": "matrix.diff",
  "syntax": "matrix.diff()",
  "description": "Pine Script v6 function: matrix.diff",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.diff()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.eigenvalues": {
  "name": "matrix.eigenvalues",
  "syntax": "matrix.eigenvalues()",
  "description": "Pine Script v6 function: matrix.eigenvalues",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.eigenvalues()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.eigenvectors": {
  "name": "matrix.eigenvectors",
  "syntax": "matrix.eigenvectors()",
  "description": "Pine Script v6 function: matrix.eigenvectors",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.eigenvectors()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.elements_count": {
  "name": "matrix.elements_count",
  "syntax": "matrix.elements_count()",
  "description": "Pine Script v6 function: matrix.elements_count",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.elements_count()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.fill": {
  "name": "matrix.fill",
  "syntax": "matrix.fill()",
  "description": "Pine Script v6 function: matrix.fill",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.fill()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.get": {
  "name": "matrix.get",
  "syntax": "matrix.get()",
  "description": "Pine Script v6 function: matrix.get",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.get()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.inv": {
  "name": "matrix.inv",
  "syntax": "matrix.inv()",
  "description": "Pine Script v6 function: matrix.inv",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.inv()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.is_antidiagonal": {
  "name": "matrix.is_antidiagonal",
  "syntax": "matrix.is_antidiagonal()",
  "description": "Pine Script v6 function: matrix.is_antidiagonal",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.is_antidiagonal()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.is_antisymmetric": {
  "name": "matrix.is_antisymmetric",
  "syntax": "matrix.is_antisymmetric()",
  "description": "Pine Script v6 function: matrix.is_antisymmetric",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.is_antisymmetric()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.is_binary": {
  "name": "matrix.is_binary",
  "syntax": "matrix.is_binary()",
  "description": "Pine Script v6 function: matrix.is_binary",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.is_binary()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.is_diagonal": {
  "name": "matrix.is_diagonal",
  "syntax": "matrix.is_diagonal()",
  "description": "Pine Script v6 function: matrix.is_diagonal",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.is_diagonal()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.is_identity": {
  "name": "matrix.is_identity",
  "syntax": "matrix.is_identity()",
  "description": "Pine Script v6 function: matrix.is_identity",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.is_identity()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.is_square": {
  "name": "matrix.is_square",
  "syntax": "matrix.is_square()",
  "description": "Pine Script v6 function: matrix.is_square",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.is_square()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.is_stochastic": {
  "name": "matrix.is_stochastic",
  "syntax": "matrix.is_stochastic()",
  "description": "Pine Script v6 function: matrix.is_stochastic",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.is_stochastic()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.is_symmetric": {
  "name": "matrix.is_symmetric",
  "syntax": "matrix.is_symmetric()",
  "description": "Pine Script v6 function: matrix.is_symmetric",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.is_symmetric()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.is_triangular": {
  "name": "matrix.is_triangular",
  "syntax": "matrix.is_triangular()",
  "description": "Pine Script v6 function: matrix.is_triangular",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.is_triangular()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.is_zero": {
  "name": "matrix.is_zero",
  "syntax": "matrix.is_zero()",
  "description": "Pine Script v6 function: matrix.is_zero",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.is_zero()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.kron": {
  "name": "matrix.kron",
  "syntax": "matrix.kron()",
  "description": "Pine Script v6 function: matrix.kron",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.kron()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.max": {
  "name": "matrix.max",
  "syntax": "matrix.max()",
  "description": "Pine Script v6 function: matrix.max",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.max()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.median": {
  "name": "matrix.median",
  "syntax": "matrix.median()",
  "description": "Pine Script v6 function: matrix.median",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.median()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.min": {
  "name": "matrix.min",
  "syntax": "matrix.min()",
  "description": "Pine Script v6 function: matrix.min",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.min()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.mode": {
  "name": "matrix.mode",
  "syntax": "matrix.mode()",
  "description": "Pine Script v6 function: matrix.mode",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.mode()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.mult": {
  "name": "matrix.mult",
  "syntax": "matrix.mult()",
  "description": "Pine Script v6 function: matrix.mult",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.mult()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.new": {
  "name": "matrix.new",
  "syntax": "matrix.new()",
  "description": "Pine Script v6 function: matrix.new",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.new()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.pinv": {
  "name": "matrix.pinv",
  "syntax": "matrix.pinv()",
  "description": "Pine Script v6 function: matrix.pinv",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.pinv()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.pow": {
  "name": "matrix.pow",
  "syntax": "matrix.pow()",
  "description": "Pine Script v6 function: matrix.pow",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.pow()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.rank": {
  "name": "matrix.rank",
  "syntax": "matrix.rank()",
  "description": "Pine Script v6 function: matrix.rank",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.rank()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.remove_col": {
  "name": "matrix.remove_col",
  "syntax": "matrix.remove_col()",
  "description": "Pine Script v6 function: matrix.remove_col",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.remove_col()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.remove_row": {
  "name": "matrix.remove_row",
  "syntax": "matrix.remove_row()",
  "description": "Pine Script v6 function: matrix.remove_row",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.remove_row()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.reshape": {
  "name": "matrix.reshape",
  "syntax": "matrix.reshape()",
  "description": "Pine Script v6 function: matrix.reshape",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.reshape()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.reverse": {
  "name": "matrix.reverse",
  "syntax": "matrix.reverse()",
  "description": "Pine Script v6 function: matrix.reverse",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.reverse()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.row": {
  "name": "matrix.row",
  "syntax": "matrix.row()",
  "description": "Pine Script v6 function: matrix.row",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.row()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.rows": {
  "name": "matrix.rows",
  "syntax": "matrix.rows()",
  "description": "Pine Script v6 function: matrix.rows",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.rows()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.set": {
  "name": "matrix.set",
  "syntax": "matrix.set()",
  "description": "Pine Script v6 function: matrix.set",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.set()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.sort": {
  "name": "matrix.sort",
  "syntax": "matrix.sort()",
  "description": "Pine Script v6 function: matrix.sort",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.sort()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.submatrix": {
  "name": "matrix.submatrix",
  "syntax": "matrix.submatrix()",
  "description": "Pine Script v6 function: matrix.submatrix",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.submatrix()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.swap_columns": {
  "name": "matrix.swap_columns",
  "syntax": "matrix.swap_columns()",
  "description": "Pine Script v6 function: matrix.swap_columns",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.swap_columns()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.swap_rows": {
  "name": "matrix.swap_rows",
  "syntax": "matrix.swap_rows()",
  "description": "Pine Script v6 function: matrix.swap_rows",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.swap_rows()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.trace": {
  "name": "matrix.trace",
  "syntax": "matrix.trace()",
  "description": "Pine Script v6 function: matrix.trace",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.trace()",
  "parameters": [],
  "returns": "unknown"
 },
 "matrix.transpose": {
  "name": "matrix.transpose",
  "syntax": "matrix.transpose()",
  "description": "Pine Script v6 function: matrix.transpose",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "matrix.transpose()",
  "parameters": [],
  "returns": "unknown"
 },
 "polyline.delete": {
  "name": "polyline.delete",
  "syntax": "polyline.delete()",
  "description": "Pine Script v6 function: polyline.delete",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "polyline.delete()",
  "parameters": [],
  "returns": "unknown"
 },
 "polyline.new": {
  "name": "polyline.new",
  "syntax": "polyline.new()",
  "description": "Pine Script v6 function: polyline.new",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "polyline.new()",
  "parameters": [],
  "returns": "unknown"
 },
 "request.currency_rate": {
  "name": "request.currency_rate",
  "syntax": "request.currency_rate()",
  "description": "Pine Script v6 function: request.currency_rate",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "request.currency_rate()",
  "parameters": [],
  "returns": "unknown"
 },
 "request.dividends": {
  "name": "request.dividends",
  "syntax": "request.dividends()",
  "description": "Pine Script v6 function: request.dividends",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "request.dividends()",
  "parameters": [],
  "returns": "unknown"
 },
 "request.earnings": {
  "name": "request.earnings",
  "syntax": "request.earnings()",
  "description": "Pine Script v6 function: request.earnings",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "request.earnings()",
  "parameters": [],
  "returns": "unknown"
 },
 "request.economic": {
  "name": "request.economic",
  "syntax": "request.economic()",
  "description": "Pine Script v6 function: request.economic",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "request.economic()",
  "parameters": [],
  "returns": "unknown"
 },
 "request.financial": {
  "name": "request.financial",
  "syntax": "request.financial()",
  "description": "Pine Script v6 function: request.financial",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "request.financial()",
  "parameters": [],
  "returns": "unknown"
 },
 "request.quandl": {
  "name": "request.quandl",
  "syntax": "request.quandl()",
  "description": "Pine Script v6 function: request.quandl",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "request.quandl()",
  "parameters": [],
  "returns": "unknown"
 },
 "request.security": {
  "name": "request.security",
  "syntax": "request.security(symbol, timeframe, expression, gaps, lookahead, ignore_invalid_symbol, currency, calc_bars_count) → series <type>",
  "description": "Requests the result of an expression from a specified context (symbol and timeframe).",
  "requiredParams": [
   "symbol",
   "timeframe",
   "expression",
   "gaps",
   "lookahead",
   "ignore_invalid_symbol",
   "currency",
   "calc_bars_count"
  ],
  "optionalParams": [],
  "signature": "request.security(symbol, timeframe, expression, gaps, lookahead, ignore_invalid_symbol, currency, calc_bars_count) → series <type>",
  "parameters": [
   {
    "name": "symbol",
    "type": "series string",
    "description": "Symbol or ticker identifier of the requested data. Use an empty string or syminfo.tickerid to request data using the chart's symbol. To retrieve data with additional modifiers (extended sessions, dividend adjustments, non-standard chart types like Heikin Ashi and Renko, etc.), create a custom ticker ID for the request using the functions in the ticker.* namespace.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "timeframe",
    "type": "series string",
    "description": "Timeframe of the requested data. Use an empty string or timeframe.period to request data from the chart's timeframe or the timeframe specified in the indicator() function. To request data from a different timeframe, supply a valid timeframe string. See here to learn about specifying timeframe strings.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "expression",
    "type": "variable, function, object, array, matrix, or map of series int/float/bool/string/color/enum, or a tuple of these",
    "description": "The expression to calculate and return from the requested context. It can accept a built-in variable like close, a user-defined variable, an expression such as ta.change(close) / (high - low), a function call that does not use Pine Script® drawings, an object, a collection, or a tuple of expressions.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "gaps",
    "type": "simple barmerge_gaps",
    "description": "Specifies how the returned values are merged on chart bars. Possible values: barmerge.gaps_on, barmerge.gaps_off. With barmerge.gaps_on a value only appears on the current chart bar when it first becomes available from the function's context, otherwise na is returned (thus a \"gap\" occurs). With barmerge.gaps_off what would otherwise be gaps are filled with the latest known value returned, avoiding na values. Optional. The default is barmerge.gaps_off.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "lookahead",
    "type": "simple barmerge_lookahead",
    "description": "On historical bars only, returns data from the timeframe before it elapses. Possible values: barmerge.lookahead_on, barmerge.lookahead_off. Has no effect on realtime values. Optional. The default is barmerge.lookahead_off starting from Pine Script® v3. The default is barmerge.lookahead_on in v1 and v2. WARNING: Using barmerge.lookahead_on at timeframes higher than the chart's without offsetting the expression argument like in close[1] will introduce future leak in scripts, as the function will then return the close price before it is actually known in the current context. As is explained in the User Manual's page on Repainting this will produce misleading results.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "ignore_invalid_symbol",
    "type": "input bool",
    "description": "Determines the behavior of the function if the specified symbol is not found: if false, the script will halt and throw a runtime error; if true, the function will return na and execution will continue. Optional. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "currency",
    "type": "series string",
    "description": "Optional. Specifies the target currency for converting values expressed in currency units (e.g., open, high, low, close) or expressions involving such values. Literal values such as 200 are not converted. The conversion rate for monetary values depends on the previous daily value of a corresponding currency pair from the most popular exchange. A spread symbol is used if no exchange provides the rate directly. Possible values: a \"string\" representing a valid currency code (e.g., \"USD\" or \"USDT\") or a constant from the currency.* namespace (e.g., currency.USD or currency.USDT). The default is syminfo.currency.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "calc_bars_count",
    "type": "simple int",
    "description": "Optional. Determines the maximum number of recent historical bars that the function can request. If specified, the function evaluates the expression argument starting from that number of bars behind the last historical bar in the requested dataset, treating those bars as the only available data. Limiting the number of historical bars in a request can help improve calculation efficiency in some cases. The default is the same as the number of chart bars available for the symbol and timeframe. The maximum number of bars that the function can attempt to retrieve depends on the intrabar limit of the user's plan. However, the request cannot retrieve more bars than are available in the dataset.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "series <type>"
 },
 "request.security_lower_tf": {
  "name": "request.security_lower_tf",
  "syntax": "request.security_lower_tf()",
  "description": "Pine Script v6 function: request.security_lower_tf",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "request.security_lower_tf()",
  "parameters": [],
  "returns": "unknown"
 },
 "request.seed": {
  "name": "request.seed",
  "syntax": "request.seed()",
  "description": "Pine Script v6 function: request.seed",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "request.seed()",
  "parameters": [],
  "returns": "unknown"
 },
 "request.splits": {
  "name": "request.splits",
  "syntax": "request.splits()",
  "description": "Pine Script v6 function: request.splits",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "request.splits()",
  "parameters": [],
  "returns": "unknown"
 },
 "runtime.error": {
  "name": "runtime.error",
  "syntax": "runtime.error()",
  "description": "Pine Script v6 function: runtime.error",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "runtime.error()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.contains": {
  "name": "str.contains",
  "syntax": "str.contains()",
  "description": "Pine Script v6 function: str.contains",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.contains()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.endswith": {
  "name": "str.endswith",
  "syntax": "str.endswith()",
  "description": "Pine Script v6 function: str.endswith",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.endswith()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.format": {
  "name": "str.format",
  "syntax": "str.format(formatString, arg0, arg1, ...) → simple string",
  "description": "Creates a formatted string using a specified formatting string (formatString) and one or more additional arguments (arg0, arg1, etc.). The formatting string defines the structure of the returned string, where all placeholders in curly brackets ({}) refer to the additional arguments. Each placeholder requires a number representing an argument's position, starting from 0. For instance, the placeholder {0} refers to the first argument after formatString (arg0), {1} refers to the second (arg1), and so on. The function replaces each placeholder with a string representation of the corresponding argument.",
  "requiredParams": [
   "formatString"
  ],
  "optionalParams": [],
  "signature": "str.format(formatString, arg0, arg1, ...) → simple string",
  "parameters": [
   {
    "name": "formatString",
    "type": "simple string",
    "description": "Format string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "simple string"
 },
 "str.format_time": {
  "name": "str.format_time",
  "syntax": "str.format_time()",
  "description": "Pine Script v6 function: str.format_time",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.format_time()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.length": {
  "name": "str.length",
  "syntax": "str.length()",
  "description": "Pine Script v6 function: str.length",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.length()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.lower": {
  "name": "str.lower",
  "syntax": "str.lower()",
  "description": "Pine Script v6 function: str.lower",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.lower()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.match": {
  "name": "str.match",
  "syntax": "str.match()",
  "description": "Pine Script v6 function: str.match",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.match()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.pos": {
  "name": "str.pos",
  "syntax": "str.pos()",
  "description": "Pine Script v6 function: str.pos",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.pos()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.repeat": {
  "name": "str.repeat",
  "syntax": "str.repeat()",
  "description": "Pine Script v6 function: str.repeat",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.repeat()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.replace": {
  "name": "str.replace",
  "syntax": "str.replace()",
  "description": "Pine Script v6 function: str.replace",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.replace()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.replace_all": {
  "name": "str.replace_all",
  "syntax": "str.replace_all()",
  "description": "Pine Script v6 function: str.replace_all",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.replace_all()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.split": {
  "name": "str.split",
  "syntax": "str.split()",
  "description": "Pine Script v6 function: str.split",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.split()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.startswith": {
  "name": "str.startswith",
  "syntax": "str.startswith()",
  "description": "Pine Script v6 function: str.startswith",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.startswith()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.substring": {
  "name": "str.substring",
  "syntax": "str.substring()",
  "description": "Pine Script v6 function: str.substring",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.substring()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.tonumber": {
  "name": "str.tonumber",
  "syntax": "str.tonumber()",
  "description": "Pine Script v6 function: str.tonumber",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.tonumber()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.tostring": {
  "name": "str.tostring",
  "syntax": "str.tostring(value) → const string",
  "description": "",
  "requiredParams": [
   "value"
  ],
  "optionalParams": [],
  "signature": "str.tostring(value) → const string",
  "parameters": [
   {
    "name": "value",
    "type": "const enum",
    "description": "Value or array ID whose elements are converted to a string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "const string"
 },
 "str.trim": {
  "name": "str.trim",
  "syntax": "str.trim()",
  "description": "Pine Script v6 function: str.trim",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.trim()",
  "parameters": [],
  "returns": "unknown"
 },
 "str.upper": {
  "name": "str.upper",
  "syntax": "str.upper()",
  "description": "Pine Script v6 function: str.upper",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "str.upper()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.cancel": {
  "name": "strategy.cancel",
  "syntax": "strategy.cancel()",
  "description": "Pine Script v6 function: strategy.cancel",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.cancel()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.cancel_all": {
  "name": "strategy.cancel_all",
  "syntax": "strategy.cancel_all()",
  "description": "Pine Script v6 function: strategy.cancel_all",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.cancel_all()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.close": {
  "name": "strategy.close",
  "syntax": "strategy.close(id, comment, qty, qty_percent, alert_message, immediately, disable_alert) → void",
  "description": "Creates an order to exit from the part of a position opened by entry orders with a specific identifier. If multiple entries in the position share the same ID, the orders from this command apply to all those entries, starting from the first open trade, when its calls use that ID as the id argument.",
  "requiredParams": [
   "id",
   "comment",
   "qty",
   "qty_percent",
   "alert_message",
   "immediately",
   "disable_alert"
  ],
  "optionalParams": [],
  "signature": "strategy.close(id, comment, qty, qty_percent, alert_message, immediately, disable_alert) → void",
  "parameters": [
   {
    "name": "id",
    "type": "series string",
    "description": "The entry identifier of the open trades to close.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "comment",
    "type": "series string",
    "description": "Optional. Additional notes on the filled order. If the value is not an empty string, the Strategy Tester and the chart show this text for the order instead of the automatically generated exit identifier. The default is an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "qty",
    "type": "series int/float",
    "description": "Optional. The number of contracts/lots/shares/units to close when an exit order fills. If specified, the command uses this value instead of qty_percent to determine the order size. The default is na, which means the order size depends on the qty_percent value.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "qty_percent",
    "type": "series int/float",
    "description": "Optional. A value between 0 and 100 representing the percentage of the open trade quantity to close when an exit order fills. The percentage calculation depends on the total size of the open trades with the id entry identifier. The command ignores this parameter if the qty value is not na. The default is 100.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "alert_message",
    "type": "series string",
    "description": "Optional. Custom text for the alert that fires when an order fills. If the \"Message\" field of the \"Create Alert\" dialog box contains the {{strategy.order.alert_message}} placeholder, the alert message replaces the placeholder with this text. The default is an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "immediately",
    "type": "series bool",
    "description": "Optional. If true, the closing order executes on the same tick when the strategy places it, ignoring the strategy properties that restrict execution to the opening tick of the following bar. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "disable_alert",
    "type": "series bool",
    "description": "Optional. If true when the command creates an order, the strategy does not trigger an alert when that order fills. This parameter accepts a \"series\" value, meaning users can control which orders trigger alerts when they execute. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "void"
 },
 "strategy.close_all": {
  "name": "strategy.close_all",
  "syntax": "strategy.close_all()",
  "description": "Pine Script v6 function: strategy.close_all",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.close_all()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.convert_to_account": {
  "name": "strategy.convert_to_account",
  "syntax": "strategy.convert_to_account()",
  "description": "Pine Script v6 function: strategy.convert_to_account",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.convert_to_account()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.convert_to_symbol": {
  "name": "strategy.convert_to_symbol",
  "syntax": "strategy.convert_to_symbol()",
  "description": "Pine Script v6 function: strategy.convert_to_symbol",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.convert_to_symbol()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.default_entry_qty": {
  "name": "strategy.default_entry_qty",
  "syntax": "strategy.default_entry_qty()",
  "description": "Pine Script v6 function: strategy.default_entry_qty",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.default_entry_qty()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.entry": {
  "name": "strategy.entry",
  "syntax": "strategy.entry(id, direction, qty, limit, stop, oca_name, oca_type, comment, alert_message, disable_alert) → void",
  "description": "Creates a new order to open or add to a position. If an unfilled order with the same id exists, a call to this command modifies that order.",
  "requiredParams": [
   "id",
   "direction",
   "qty",
   "limit",
   "stop",
   "oca_name",
   "oca_type",
   "comment",
   "alert_message",
   "disable_alert"
  ],
  "optionalParams": [],
  "signature": "strategy.entry(id, direction, qty, limit, stop, oca_name, oca_type, comment, alert_message, disable_alert) → void",
  "parameters": [
   {
    "name": "id",
    "type": "series string",
    "description": "The identifier of the order, which corresponds to an entry ID in the strategy's trades after the order fills. If the strategy opens a new position after filling the order, the order's ID becomes the strategy.position_entry_name value. Strategy commands can reference the order ID to cancel or modify pending orders and generate exit orders for specific open trades. The Strategy Tester and the chart display the order ID unless the command specifies a comment value.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "direction",
    "type": "series strategy_direction",
    "description": "The direction of the trade. Possible values: strategy.long for a long trade, strategy.short for a short one.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "qty",
    "type": "series int/float",
    "description": "Optional. The number of contracts/shares/lots/units in the resulting open trade when the order fills. The default is na, which means that the command uses the default_qty_type and default_qty_value parameters of the strategy() declaration statement to determine the quantity.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "limit",
    "type": "series int/float",
    "description": "Optional. The limit price of the order. If specified, the command creates a limit or stop-limit order, depending on whether the stop value is also specified. The default is na, which means the resulting order is not of the limit or stop-limit type.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "stop",
    "type": "series int/float",
    "description": "Optional. The stop price of the order. If specified, the command creates a stop or stop-limit order, depending on whether the limit value is also specified. The default is na, which means the resulting order is not of the stop or stop-limit type.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "oca_name",
    "type": "series string",
    "description": "Optional. The name of the order's One-Cancels-All (OCA) group. When a pending order with the same oca_name and oca_type parameters executes, that order affects all unfilled orders in the group. The default is an empty string, which means the order does not belong to an OCA group.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "oca_type",
    "type": "input string",
    "description": "Optional. Specifies how an unfilled order behaves when another pending order with the same oca_name and oca_type values executes. Possible values: strategy.oca.cancel, strategy.oca.reduce, strategy.oca.none. The default is strategy.oca.none.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "comment",
    "type": "series string",
    "description": "Optional. Additional notes on the filled order. If the value is not an empty string, the Strategy Tester and the chart show this text for the order instead of the specified id. The default is an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "alert_message",
    "type": "series string",
    "description": "Optional. Custom text for the alert that fires when an order fills. If the \"Message\" field of the \"Create Alert\" dialog box contains the {{strategy.order.alert_message}} placeholder, the alert message replaces the placeholder with this text. The default is an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "disable_alert",
    "type": "series bool",
    "description": "Optional. If true when the command creates an order, the strategy does not trigger an alert when that order fills. This parameter accepts a \"series\" value, meaning users can control which orders trigger alerts when they execute. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "void"
 },
 "strategy.exit": {
  "name": "strategy.exit",
  "syntax": "strategy.exit(id, from_entry, qty, qty_percent, profit, limit, loss, stop, trail_price, trail_points, trail_offset, oca_name, comment, comment_profit, comment_loss, comment_trailing, alert_message, alert_profit, alert_loss, alert_trailing, disable_alert) → void",
  "description": "Creates price-based orders to exit from an open position. If unfilled exit orders with the same id exist, calls to this command modify those orders. This command can generate more than one type of exit order, depending on the specified parameters. However, it does not create market orders. To exit from a position with a market order, use strategy.close() or strategy.close_all().",
  "requiredParams": [
   "id",
   "from_entry",
   "qty",
   "qty_percent",
   "profit",
   "limit",
   "loss",
   "stop",
   "trail_price",
   "trail_points",
   "trail_offset",
   "oca_name",
   "comment",
   "comment_profit",
   "comment_loss",
   "comment_trailing",
   "alert_message",
   "alert_profit",
   "alert_loss",
   "alert_trailing",
   "disable_alert"
  ],
  "optionalParams": [],
  "signature": "strategy.exit(id, from_entry, qty, qty_percent, profit, limit, loss, stop, trail_price, trail_points, trail_offset, oca_name, comment, comment_profit, comment_loss, comment_trailing, alert_message, alert_profit, alert_loss, alert_trailing, disable_alert) → void",
  "parameters": [
   {
    "name": "id",
    "type": "series string",
    "description": "The identifier of the orders, which corresponds to an exit ID in the strategy's trades after an order fills. Strategy commands can reference the order ID to cancel or modify pending exit orders. The Strategy Tester and the chart display the order ID unless the command includes a comment* argument that applies to the filled order.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "from_entry",
    "type": "series string",
    "description": "Optional. The entry order ID of the trade to exit from. If there is more than one open trade with the specified entry ID, the command generates exit orders for all the entries from before or at the time of the call. The default is an empty string, which means the command generates exit orders for all open trades until the position closes.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "qty",
    "type": "series int/float",
    "description": "Optional. The number of contracts/lots/shares/units to close when an exit order fills. If specified, the command uses this value instead of qty_percent to determine the order size. The exit orders reserve this quantity from the position, meaning other calls to this command cannot close this portion until the strategy fills or cancels those orders. The default is na, which means the order size depends on the qty_percent value.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "qty_percent",
    "type": "series int/float",
    "description": "Optional. A value between 0 and 100 representing the percentage of the open trade quantity to close when an exit order fills. The exit orders reserve this percentage from the applicable open trades, meaning other calls to this command cannot close this portion until the strategy fills or cancels those orders. The percentage calculation depends on the total size of the applicable open trades without considering the reserved amount from other strategy.exit() calls. The command ignores this parameter if the qty value is not na. The default is 100.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "profit",
    "type": "series int/float",
    "description": "Optional. The take-profit distance, expressed in ticks. If specified, the command creates a limit order to exit the trade profit ticks away from the entry price in the favorable direction. The order executes at the calculated price or a better value. If this parameter and limit are not na, the command places a take-profit order only at the price level expected to trigger an exit first. The default is na.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "limit",
    "type": "series int/float",
    "description": "Optional. The take-profit price. If this parameter and profit are not na, the command places a take-profit order only at the price level expected to trigger an exit first. The default is na.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "loss",
    "type": "series int/float",
    "description": "Optional. The stop-loss distance, expressed in ticks. If specified, the command creates a stop order to exit the trade loss ticks away from the entry price in the unfavorable direction. The order executes at the calculated price or a worse value. If this parameter and stop are not na, the command places a stop-loss order only at the price level expected to trigger an exit first. The default is na.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "stop",
    "type": "series int/float",
    "description": "Optional. The stop-loss price. If this parameter and loss are not na, the command places a stop-loss order only at the price level expected to trigger an exit first. The default is na.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "trail_price",
    "type": "series int/float",
    "description": "Optional. The price of the trailing stop activation level. If the value is more favorable than the entry price, the command creates a trailing stop when the market price reaches that value. If less favorable than the entry price, the command creates the trailing stop immediately when the current market price is equal to or more favorable than the value. If this parameter and trail_points are not na, the command sets the activation level using the value expected to activate the stop first. The default is na.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "trail_points",
    "type": "series int/float",
    "description": "Optional. The trailing stop activation distance, expressed in ticks. If the value is positive, the command creates a trailing stop order when the market price moves trail_points ticks away from the trade's entry price in the favorable direction. If the value is negative, the command creates the trailing stop immediately when the market price is equal to or more favorable than the level trail_points ticks away from the entry price in the unfavorable direction. The default is na.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "trail_offset",
    "type": "series int/float",
    "description": "Optional. The trailing stop offset. When the market price reaches the activation level determined by the trail_price or trail_points parameter, or exceeds the level in the favorable direction, the command creates a trailing stop with an initial value trail_offset ticks away from that level in the unfavorable direction. After activation, the trailing stop moves toward the market price each time the trade's profit reaches a better value, maintaining the specified distance behind the best price. The default is na.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "oca_name",
    "type": "series string",
    "description": "Optional. The name of the One-Cancels-All (OCA) group that the command's take-profit, stop-loss, and trailing stop orders belong to. All orders from this command are of the strategy.oca.reduce OCA type. When an order of this OCA type with the same oca_name executes, the strategy reduces the sizes of other unfilled orders in the OCA group by the filled quantity. The default is an empty string, which means the strategy assigns the OCA name automatically, and the resulting orders cannot reduce or be reduced by the orders from other commands.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "comment",
    "type": "series string",
    "description": "Optional. Additional notes on the filled order. If the value is not an empty string, the Strategy Tester and the chart show this text for the order instead of the specified id. The command ignores this value if the call includes an argument for a comment_* parameter that applies to the order. The default is an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "comment_profit",
    "type": "series string",
    "description": "Optional. Additional notes on the filled order. If the value is not an empty string, the Strategy Tester and the chart show this text for the order instead of the specified id or comment. This comment applies only to the command's take-profit orders created using the profit or limit parameter. The default is an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "comment_loss",
    "type": "series string",
    "description": "Optional. Additional notes on the filled order. If the value is not an empty string, the Strategy Tester and the chart show this text for the order instead of the specified id or comment. This comment applies only to the command's stop-loss orders created using the loss or stop parameter. The default is an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "comment_trailing",
    "type": "series string",
    "description": "Optional. Additional notes on the filled order. If the value is not an empty string, the Strategy Tester and the chart show this text for the order instead of the specified id or comment. This comment applies only to the command's trailing stop orders created using the trail_price or trail_points and trail_offset parameters. The default is an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "alert_message",
    "type": "series string",
    "description": "Optional. Custom text for the alert that fires when an order fills. If the \"Message\" field of the \"Create Alert\" dialog box contains the {{strategy.order.alert_message}} placeholder, the alert message replaces the placeholder with this text. The command ignores this value if the call includes an argument for the other alert_* parameter that applies to the order. The default is an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "alert_profit",
    "type": "series string",
    "description": "Optional. Custom text for the alert that fires when an order fills. If the \"Message\" field of the \"Create Alert\" dialog box contains the {{strategy.order.alert_message}} placeholder, the alert message replaces the placeholder with this text. This message applies only to the command's take-profit orders created using the profit or limit parameter. The default is an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "alert_loss",
    "type": "series string",
    "description": "Optional. Custom text for the alert that fires when an order fills. If the \"Message\" field of the \"Create Alert\" dialog box contains the {{strategy.order.alert_message}} placeholder, the alert message replaces the placeholder with this text. This message applies only to the command's stop-loss orders created using the loss or stop parameter. The default is an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "alert_trailing",
    "type": "series string",
    "description": "Optional. Custom text for the alert that fires when an order fills. If the \"Message\" field of the \"Create Alert\" dialog box contains the {{strategy.order.alert_message}} placeholder, the alert message replaces the placeholder with this text. This message applies only to the command's trailing stop orders created using the trail_price or trail_points and trail_offset parameters. The default is an empty string.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "disable_alert",
    "type": "series bool",
    "description": "Optional. If true when the command creates an order, the strategy does not trigger an alert when that order fills. This parameter accepts a \"series\" value, meaning users can control which orders trigger alerts when they execute. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "void"
 },
 "strategy.order": {
  "name": "strategy.order",
  "syntax": "strategy.order()",
  "description": "Pine Script v6 function: strategy.order",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.order()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.risk.allow_entry_in": {
  "name": "strategy.risk.allow_entry_in",
  "syntax": "strategy.risk.allow_entry_in()",
  "description": "Pine Script v6 function: strategy.risk.allow_entry_in",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.risk.allow_entry_in()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.risk.max_cons_loss_days": {
  "name": "strategy.risk.max_cons_loss_days",
  "syntax": "strategy.risk.max_cons_loss_days()",
  "description": "Pine Script v6 function: strategy.risk.max_cons_loss_days",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.risk.max_cons_loss_days()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.risk.max_drawdown": {
  "name": "strategy.risk.max_drawdown",
  "syntax": "strategy.risk.max_drawdown()",
  "description": "Pine Script v6 function: strategy.risk.max_drawdown",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.risk.max_drawdown()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.risk.max_intraday_filled_orders": {
  "name": "strategy.risk.max_intraday_filled_orders",
  "syntax": "strategy.risk.max_intraday_filled_orders()",
  "description": "Pine Script v6 function: strategy.risk.max_intraday_filled_orders",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.risk.max_intraday_filled_orders()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.risk.max_intraday_loss": {
  "name": "strategy.risk.max_intraday_loss",
  "syntax": "strategy.risk.max_intraday_loss()",
  "description": "Pine Script v6 function: strategy.risk.max_intraday_loss",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.risk.max_intraday_loss()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.risk.max_position_size": {
  "name": "strategy.risk.max_position_size",
  "syntax": "strategy.risk.max_position_size()",
  "description": "Pine Script v6 function: strategy.risk.max_position_size",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.risk.max_position_size()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.commission": {
  "name": "strategy.closedtrades.commission",
  "syntax": "strategy.closedtrades.commission()",
  "description": "Pine Script v6 function: strategy.closedtrades.commission",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.commission()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.entry_bar_index": {
  "name": "strategy.closedtrades.entry_bar_index",
  "syntax": "strategy.closedtrades.entry_bar_index()",
  "description": "Pine Script v6 function: strategy.closedtrades.entry_bar_index",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.entry_bar_index()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.entry_comment": {
  "name": "strategy.closedtrades.entry_comment",
  "syntax": "strategy.closedtrades.entry_comment()",
  "description": "Pine Script v6 function: strategy.closedtrades.entry_comment",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.entry_comment()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.entry_id": {
  "name": "strategy.closedtrades.entry_id",
  "syntax": "strategy.closedtrades.entry_id()",
  "description": "Pine Script v6 function: strategy.closedtrades.entry_id",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.entry_id()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.entry_price": {
  "name": "strategy.closedtrades.entry_price",
  "syntax": "strategy.closedtrades.entry_price()",
  "description": "Pine Script v6 function: strategy.closedtrades.entry_price",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.entry_price()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.entry_time": {
  "name": "strategy.closedtrades.entry_time",
  "syntax": "strategy.closedtrades.entry_time()",
  "description": "Pine Script v6 function: strategy.closedtrades.entry_time",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.entry_time()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.exit_bar_index": {
  "name": "strategy.closedtrades.exit_bar_index",
  "syntax": "strategy.closedtrades.exit_bar_index()",
  "description": "Pine Script v6 function: strategy.closedtrades.exit_bar_index",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.exit_bar_index()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.exit_comment": {
  "name": "strategy.closedtrades.exit_comment",
  "syntax": "strategy.closedtrades.exit_comment()",
  "description": "Pine Script v6 function: strategy.closedtrades.exit_comment",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.exit_comment()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.exit_id": {
  "name": "strategy.closedtrades.exit_id",
  "syntax": "strategy.closedtrades.exit_id()",
  "description": "Pine Script v6 function: strategy.closedtrades.exit_id",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.exit_id()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.exit_price": {
  "name": "strategy.closedtrades.exit_price",
  "syntax": "strategy.closedtrades.exit_price()",
  "description": "Pine Script v6 function: strategy.closedtrades.exit_price",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.exit_price()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.exit_time": {
  "name": "strategy.closedtrades.exit_time",
  "syntax": "strategy.closedtrades.exit_time()",
  "description": "Pine Script v6 function: strategy.closedtrades.exit_time",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.exit_time()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.max_drawdown": {
  "name": "strategy.closedtrades.max_drawdown",
  "syntax": "strategy.closedtrades.max_drawdown()",
  "description": "Pine Script v6 function: strategy.closedtrades.max_drawdown",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.max_drawdown()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.max_drawdown_percent": {
  "name": "strategy.closedtrades.max_drawdown_percent",
  "syntax": "strategy.closedtrades.max_drawdown_percent()",
  "description": "Pine Script v6 function: strategy.closedtrades.max_drawdown_percent",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.max_drawdown_percent()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.max_runup": {
  "name": "strategy.closedtrades.max_runup",
  "syntax": "strategy.closedtrades.max_runup()",
  "description": "Pine Script v6 function: strategy.closedtrades.max_runup",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.max_runup()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.max_runup_percent": {
  "name": "strategy.closedtrades.max_runup_percent",
  "syntax": "strategy.closedtrades.max_runup_percent()",
  "description": "Pine Script v6 function: strategy.closedtrades.max_runup_percent",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.max_runup_percent()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.profit": {
  "name": "strategy.closedtrades.profit",
  "syntax": "strategy.closedtrades.profit()",
  "description": "Pine Script v6 function: strategy.closedtrades.profit",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.profit()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.profit_percent": {
  "name": "strategy.closedtrades.profit_percent",
  "syntax": "strategy.closedtrades.profit_percent()",
  "description": "Pine Script v6 function: strategy.closedtrades.profit_percent",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.profit_percent()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.closedtrades.size": {
  "name": "strategy.closedtrades.size",
  "syntax": "strategy.closedtrades.size()",
  "description": "Pine Script v6 function: strategy.closedtrades.size",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.closedtrades.size()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.opentrades.commission": {
  "name": "strategy.opentrades.commission",
  "syntax": "strategy.opentrades.commission()",
  "description": "Pine Script v6 function: strategy.opentrades.commission",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.opentrades.commission()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.opentrades.entry_bar_index": {
  "name": "strategy.opentrades.entry_bar_index",
  "syntax": "strategy.opentrades.entry_bar_index()",
  "description": "Pine Script v6 function: strategy.opentrades.entry_bar_index",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.opentrades.entry_bar_index()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.opentrades.entry_comment": {
  "name": "strategy.opentrades.entry_comment",
  "syntax": "strategy.opentrades.entry_comment()",
  "description": "Pine Script v6 function: strategy.opentrades.entry_comment",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.opentrades.entry_comment()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.opentrades.entry_id": {
  "name": "strategy.opentrades.entry_id",
  "syntax": "strategy.opentrades.entry_id()",
  "description": "Pine Script v6 function: strategy.opentrades.entry_id",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.opentrades.entry_id()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.opentrades.entry_price": {
  "name": "strategy.opentrades.entry_price",
  "syntax": "strategy.opentrades.entry_price()",
  "description": "Pine Script v6 function: strategy.opentrades.entry_price",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.opentrades.entry_price()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.opentrades.entry_time": {
  "name": "strategy.opentrades.entry_time",
  "syntax": "strategy.opentrades.entry_time()",
  "description": "Pine Script v6 function: strategy.opentrades.entry_time",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.opentrades.entry_time()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.opentrades.max_drawdown": {
  "name": "strategy.opentrades.max_drawdown",
  "syntax": "strategy.opentrades.max_drawdown()",
  "description": "Pine Script v6 function: strategy.opentrades.max_drawdown",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.opentrades.max_drawdown()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.opentrades.max_drawdown_percent": {
  "name": "strategy.opentrades.max_drawdown_percent",
  "syntax": "strategy.opentrades.max_drawdown_percent()",
  "description": "Pine Script v6 function: strategy.opentrades.max_drawdown_percent",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.opentrades.max_drawdown_percent()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.opentrades.max_runup": {
  "name": "strategy.opentrades.max_runup",
  "syntax": "strategy.opentrades.max_runup()",
  "description": "Pine Script v6 function: strategy.opentrades.max_runup",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.opentrades.max_runup()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.opentrades.max_runup_percent": {
  "name": "strategy.opentrades.max_runup_percent",
  "syntax": "strategy.opentrades.max_runup_percent()",
  "description": "Pine Script v6 function: strategy.opentrades.max_runup_percent",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.opentrades.max_runup_percent()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.opentrades.profit": {
  "name": "strategy.opentrades.profit",
  "syntax": "strategy.opentrades.profit()",
  "description": "Pine Script v6 function: strategy.opentrades.profit",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.opentrades.profit()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.opentrades.profit_percent": {
  "name": "strategy.opentrades.profit_percent",
  "syntax": "strategy.opentrades.profit_percent()",
  "description": "Pine Script v6 function: strategy.opentrades.profit_percent",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.opentrades.profit_percent()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy.opentrades.size": {
  "name": "strategy.opentrades.size",
  "syntax": "strategy.opentrades.size()",
  "description": "Pine Script v6 function: strategy.opentrades.size",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "strategy.opentrades.size()",
  "parameters": [],
  "returns": "unknown"
 },
 "syminfo.prefix": {
  "name": "syminfo.prefix",
  "syntax": "syminfo.prefix()",
  "description": "Pine Script v6 function: syminfo.prefix",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "syminfo.prefix()",
  "parameters": [],
  "returns": "unknown"
 },
 "syminfo.ticker": {
  "name": "syminfo.ticker",
  "syntax": "syminfo.ticker()",
  "description": "Pine Script v6 function: syminfo.ticker",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "syminfo.ticker()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.alma": {
  "name": "ta.alma",
  "syntax": "ta.alma()",
  "description": "Pine Script v6 function: ta.alma",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.alma()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.atr": {
  "name": "ta.atr",
  "syntax": "ta.atr(length) → series float",
  "description": "Function atr (average true range) returns the RMA of true range. True range is max(high - low, abs(high - close[1]), abs(low - close[1])).",
  "requiredParams": [
   "length"
  ],
  "optionalParams": [],
  "signature": "ta.atr(length) → series float",
  "parameters": [
   {
    "name": "length",
    "type": "simple int",
    "description": "Length (number of bars back).",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "series float"
 },
 "ta.barssince": {
  "name": "ta.barssince",
  "syntax": "ta.barssince()",
  "description": "Pine Script v6 function: ta.barssince",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.barssince()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.bb": {
  "name": "ta.bb",
  "syntax": "ta.bb()",
  "description": "Pine Script v6 function: ta.bb",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.bb()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.bbw": {
  "name": "ta.bbw",
  "syntax": "ta.bbw()",
  "description": "Pine Script v6 function: ta.bbw",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.bbw()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.cci": {
  "name": "ta.cci",
  "syntax": "ta.cci()",
  "description": "Pine Script v6 function: ta.cci",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.cci()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.change": {
  "name": "ta.change",
  "syntax": "ta.change()",
  "description": "Pine Script v6 function: ta.change",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.change()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.cmo": {
  "name": "ta.cmo",
  "syntax": "ta.cmo()",
  "description": "Pine Script v6 function: ta.cmo",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.cmo()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.cog": {
  "name": "ta.cog",
  "syntax": "ta.cog()",
  "description": "Pine Script v6 function: ta.cog",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.cog()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.correlation": {
  "name": "ta.correlation",
  "syntax": "ta.correlation()",
  "description": "Pine Script v6 function: ta.correlation",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.correlation()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.cross": {
  "name": "ta.cross",
  "syntax": "ta.cross()",
  "description": "Pine Script v6 function: ta.cross",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.cross()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.crossover": {
  "name": "ta.crossover",
  "syntax": "ta.crossover(source1, source2) → series bool",
  "description": "The source1-series is defined as having crossed over source2-series if, on the current bar, the value of source1 is greater than the value of source2, and on the previous bar, the value of source1 was less than or equal to the value of source2.",
  "requiredParams": [
   "source1",
   "source2"
  ],
  "optionalParams": [],
  "signature": "ta.crossover(source1, source2) → series bool",
  "parameters": [
   {
    "name": "source1",
    "type": "series int/float",
    "description": "First data series.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "source2",
    "type": "series int/float",
    "description": "Second data series.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "series bool"
 },
 "ta.crossunder": {
  "name": "ta.crossunder",
  "syntax": "ta.crossunder(source1, source2) → series bool",
  "description": "The source1-series is defined as having crossed under source2-series if, on the current bar, the value of source1 is less than the value of source2, and on the previous bar, the value of source1 was greater than or equal to the value of source2.",
  "requiredParams": [
   "source1",
   "source2"
  ],
  "optionalParams": [],
  "signature": "ta.crossunder(source1, source2) → series bool",
  "parameters": [
   {
    "name": "source1",
    "type": "series int/float",
    "description": "First data series.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "source2",
    "type": "series int/float",
    "description": "Second data series.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "series bool"
 },
 "ta.cum": {
  "name": "ta.cum",
  "syntax": "ta.cum()",
  "description": "Pine Script v6 function: ta.cum",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.cum()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.dev": {
  "name": "ta.dev",
  "syntax": "ta.dev()",
  "description": "Pine Script v6 function: ta.dev",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.dev()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.dmi": {
  "name": "ta.dmi",
  "syntax": "ta.dmi()",
  "description": "Pine Script v6 function: ta.dmi",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.dmi()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.ema": {
  "name": "ta.ema",
  "syntax": "ta.ema(source, length) → series float",
  "description": "The ema function returns the exponentially weighted moving average. In ema weighting factors decrease exponentially. It calculates by using a formula: EMA = alpha * source + (1 - alpha) * EMA[1], where alpha = 2 / (length + 1).",
  "requiredParams": [
   "source",
   "length"
  ],
  "optionalParams": [],
  "signature": "ta.ema(source, length) → series float",
  "parameters": [
   {
    "name": "source",
    "type": "series int/float",
    "description": "Series of values to process.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "length",
    "type": "simple int",
    "description": "Number of bars (length).",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "series float"
 },
 "ta.falling": {
  "name": "ta.falling",
  "syntax": "ta.falling()",
  "description": "Pine Script v6 function: ta.falling",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.falling()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.highest": {
  "name": "ta.highest",
  "syntax": "ta.highest()",
  "description": "Pine Script v6 function: ta.highest",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.highest()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.highestbars": {
  "name": "ta.highestbars",
  "syntax": "ta.highestbars()",
  "description": "Pine Script v6 function: ta.highestbars",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.highestbars()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.hma": {
  "name": "ta.hma",
  "syntax": "ta.hma()",
  "description": "Pine Script v6 function: ta.hma",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.hma()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.kc": {
  "name": "ta.kc",
  "syntax": "ta.kc()",
  "description": "Pine Script v6 function: ta.kc",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.kc()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.kcw": {
  "name": "ta.kcw",
  "syntax": "ta.kcw()",
  "description": "Pine Script v6 function: ta.kcw",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.kcw()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.linreg": {
  "name": "ta.linreg",
  "syntax": "ta.linreg()",
  "description": "Pine Script v6 function: ta.linreg",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.linreg()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.lowest": {
  "name": "ta.lowest",
  "syntax": "ta.lowest()",
  "description": "Pine Script v6 function: ta.lowest",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.lowest()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.lowestbars": {
  "name": "ta.lowestbars",
  "syntax": "ta.lowestbars()",
  "description": "Pine Script v6 function: ta.lowestbars",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.lowestbars()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.macd": {
  "name": "ta.macd",
  "syntax": "ta.macd()",
  "description": "Pine Script v6 function: ta.macd",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.macd()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.max": {
  "name": "ta.max",
  "syntax": "ta.max()",
  "description": "Pine Script v6 function: ta.max",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.max()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.median": {
  "name": "ta.median",
  "syntax": "ta.median()",
  "description": "Pine Script v6 function: ta.median",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.median()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.mfi": {
  "name": "ta.mfi",
  "syntax": "ta.mfi()",
  "description": "Pine Script v6 function: ta.mfi",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.mfi()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.min": {
  "name": "ta.min",
  "syntax": "ta.min()",
  "description": "Pine Script v6 function: ta.min",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.min()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.mode": {
  "name": "ta.mode",
  "syntax": "ta.mode()",
  "description": "Pine Script v6 function: ta.mode",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.mode()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.mom": {
  "name": "ta.mom",
  "syntax": "ta.mom()",
  "description": "Pine Script v6 function: ta.mom",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.mom()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.percentile_linear_interpolation": {
  "name": "ta.percentile_linear_interpolation",
  "syntax": "ta.percentile_linear_interpolation()",
  "description": "Pine Script v6 function: ta.percentile_linear_interpolation",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.percentile_linear_interpolation()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.percentile_nearest_rank": {
  "name": "ta.percentile_nearest_rank",
  "syntax": "ta.percentile_nearest_rank()",
  "description": "Pine Script v6 function: ta.percentile_nearest_rank",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.percentile_nearest_rank()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.percentrank": {
  "name": "ta.percentrank",
  "syntax": "ta.percentrank()",
  "description": "Pine Script v6 function: ta.percentrank",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.percentrank()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.pivot_point_levels": {
  "name": "ta.pivot_point_levels",
  "syntax": "ta.pivot_point_levels()",
  "description": "Pine Script v6 function: ta.pivot_point_levels",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.pivot_point_levels()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.pivothigh": {
  "name": "ta.pivothigh",
  "syntax": "ta.pivothigh()",
  "description": "Pine Script v6 function: ta.pivothigh",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.pivothigh()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.pivotlow": {
  "name": "ta.pivotlow",
  "syntax": "ta.pivotlow()",
  "description": "Pine Script v6 function: ta.pivotlow",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.pivotlow()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.range": {
  "name": "ta.range",
  "syntax": "ta.range()",
  "description": "Pine Script v6 function: ta.range",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.range()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.rci": {
  "name": "ta.rci",
  "syntax": "ta.rci()",
  "description": "Pine Script v6 function: ta.rci",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.rci()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.rising": {
  "name": "ta.rising",
  "syntax": "ta.rising()",
  "description": "Pine Script v6 function: ta.rising",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.rising()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.rma": {
  "name": "ta.rma",
  "syntax": "ta.rma()",
  "description": "Pine Script v6 function: ta.rma",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.rma()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.roc": {
  "name": "ta.roc",
  "syntax": "ta.roc()",
  "description": "Pine Script v6 function: ta.roc",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.roc()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.rsi": {
  "name": "ta.rsi",
  "syntax": "ta.rsi(source, length) → series float",
  "description": "Relative strength index. It is calculated using the ta.rma() of upward and downward changes of source over the last length bars.",
  "requiredParams": [
   "source",
   "length"
  ],
  "optionalParams": [],
  "signature": "ta.rsi(source, length) → series float",
  "parameters": [
   {
    "name": "source",
    "type": "series int/float",
    "description": "Series of values to process.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "length",
    "type": "simple int",
    "description": "Number of bars (length).",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "series float"
 },
 "ta.sar": {
  "name": "ta.sar",
  "syntax": "ta.sar()",
  "description": "Pine Script v6 function: ta.sar",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.sar()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.sma": {
  "name": "ta.sma",
  "syntax": "ta.sma(source, length) → series float",
  "description": "The sma function returns the moving average, that is the sum of last y values of x, divided by y.",
  "requiredParams": [
   "source",
   "length"
  ],
  "optionalParams": [],
  "signature": "ta.sma(source, length) → series float",
  "parameters": [
   {
    "name": "source",
    "type": "series int/float",
    "description": "Series of values to process.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "length",
    "type": "series int",
    "description": "Number of bars (length).",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "series float"
 },
 "ta.stdev": {
  "name": "ta.stdev",
  "syntax": "ta.stdev(source, length, biased) → series float",
  "description": "",
  "requiredParams": [
   "source",
   "length",
   "biased"
  ],
  "optionalParams": [],
  "signature": "ta.stdev(source, length, biased) → series float",
  "parameters": [
   {
    "name": "source",
    "type": "series int/float",
    "description": "Series of values to process.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "length",
    "type": "series int",
    "description": "Number of bars (length).",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "biased",
    "type": "series bool",
    "description": "Determines which estimate should be used. Optional. The default is true.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "series float"
 },
 "ta.stoch": {
  "name": "ta.stoch",
  "syntax": "ta.stoch()",
  "description": "Pine Script v6 function: ta.stoch",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.stoch()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.supertrend": {
  "name": "ta.supertrend",
  "syntax": "ta.supertrend()",
  "description": "Pine Script v6 function: ta.supertrend",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.supertrend()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.swma": {
  "name": "ta.swma",
  "syntax": "ta.swma()",
  "description": "Pine Script v6 function: ta.swma",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.swma()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.tr": {
  "name": "ta.tr",
  "syntax": "ta.tr()",
  "description": "Pine Script v6 function: ta.tr",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.tr()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.tsi": {
  "name": "ta.tsi",
  "syntax": "ta.tsi()",
  "description": "Pine Script v6 function: ta.tsi",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.tsi()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.valuewhen": {
  "name": "ta.valuewhen",
  "syntax": "ta.valuewhen()",
  "description": "Pine Script v6 function: ta.valuewhen",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.valuewhen()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.variance": {
  "name": "ta.variance",
  "syntax": "ta.variance()",
  "description": "Pine Script v6 function: ta.variance",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.variance()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.vwap": {
  "name": "ta.vwap",
  "syntax": "ta.vwap()",
  "description": "Pine Script v6 function: ta.vwap",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.vwap()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.vwma": {
  "name": "ta.vwma",
  "syntax": "ta.vwma()",
  "description": "Pine Script v6 function: ta.vwma",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.vwma()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.wma": {
  "name": "ta.wma",
  "syntax": "ta.wma()",
  "description": "Pine Script v6 function: ta.wma",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.wma()",
  "parameters": [],
  "returns": "unknown"
 },
 "ta.wpr": {
  "name": "ta.wpr",
  "syntax": "ta.wpr()",
  "description": "Pine Script v6 function: ta.wpr",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ta.wpr()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.cell": {
  "name": "table.cell",
  "syntax": "table.cell()",
  "description": "Pine Script v6 function: table.cell",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.cell()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.cell_set_bgcolor": {
  "name": "table.cell_set_bgcolor",
  "syntax": "table.cell_set_bgcolor()",
  "description": "Pine Script v6 function: table.cell_set_bgcolor",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.cell_set_bgcolor()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.cell_set_height": {
  "name": "table.cell_set_height",
  "syntax": "table.cell_set_height()",
  "description": "Pine Script v6 function: table.cell_set_height",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.cell_set_height()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.cell_set_text": {
  "name": "table.cell_set_text",
  "syntax": "table.cell_set_text()",
  "description": "Pine Script v6 function: table.cell_set_text",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.cell_set_text()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.cell_set_text_color": {
  "name": "table.cell_set_text_color",
  "syntax": "table.cell_set_text_color()",
  "description": "Pine Script v6 function: table.cell_set_text_color",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.cell_set_text_color()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.cell_set_text_font_family": {
  "name": "table.cell_set_text_font_family",
  "syntax": "table.cell_set_text_font_family()",
  "description": "Pine Script v6 function: table.cell_set_text_font_family",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.cell_set_text_font_family()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.cell_set_text_formatting": {
  "name": "table.cell_set_text_formatting",
  "syntax": "table.cell_set_text_formatting()",
  "description": "Pine Script v6 function: table.cell_set_text_formatting",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.cell_set_text_formatting()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.cell_set_text_halign": {
  "name": "table.cell_set_text_halign",
  "syntax": "table.cell_set_text_halign()",
  "description": "Pine Script v6 function: table.cell_set_text_halign",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.cell_set_text_halign()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.cell_set_text_size": {
  "name": "table.cell_set_text_size",
  "syntax": "table.cell_set_text_size()",
  "description": "Pine Script v6 function: table.cell_set_text_size",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.cell_set_text_size()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.cell_set_text_valign": {
  "name": "table.cell_set_text_valign",
  "syntax": "table.cell_set_text_valign()",
  "description": "Pine Script v6 function: table.cell_set_text_valign",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.cell_set_text_valign()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.cell_set_tooltip": {
  "name": "table.cell_set_tooltip",
  "syntax": "table.cell_set_tooltip()",
  "description": "Pine Script v6 function: table.cell_set_tooltip",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.cell_set_tooltip()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.cell_set_width": {
  "name": "table.cell_set_width",
  "syntax": "table.cell_set_width()",
  "description": "Pine Script v6 function: table.cell_set_width",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.cell_set_width()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.clear": {
  "name": "table.clear",
  "syntax": "table.clear()",
  "description": "Pine Script v6 function: table.clear",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.clear()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.delete": {
  "name": "table.delete",
  "syntax": "table.delete()",
  "description": "Pine Script v6 function: table.delete",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.delete()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.merge_cells": {
  "name": "table.merge_cells",
  "syntax": "table.merge_cells()",
  "description": "Pine Script v6 function: table.merge_cells",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.merge_cells()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.new": {
  "name": "table.new",
  "syntax": "table.new()",
  "description": "Pine Script v6 function: table.new",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.new()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.set_bgcolor": {
  "name": "table.set_bgcolor",
  "syntax": "table.set_bgcolor()",
  "description": "Pine Script v6 function: table.set_bgcolor",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.set_bgcolor()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.set_border_color": {
  "name": "table.set_border_color",
  "syntax": "table.set_border_color()",
  "description": "Pine Script v6 function: table.set_border_color",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.set_border_color()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.set_border_width": {
  "name": "table.set_border_width",
  "syntax": "table.set_border_width()",
  "description": "Pine Script v6 function: table.set_border_width",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.set_border_width()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.set_frame_color": {
  "name": "table.set_frame_color",
  "syntax": "table.set_frame_color()",
  "description": "Pine Script v6 function: table.set_frame_color",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.set_frame_color()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.set_frame_width": {
  "name": "table.set_frame_width",
  "syntax": "table.set_frame_width()",
  "description": "Pine Script v6 function: table.set_frame_width",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.set_frame_width()",
  "parameters": [],
  "returns": "unknown"
 },
 "table.set_position": {
  "name": "table.set_position",
  "syntax": "table.set_position()",
  "description": "Pine Script v6 function: table.set_position",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "table.set_position()",
  "parameters": [],
  "returns": "unknown"
 },
 "ticker.heikinashi": {
  "name": "ticker.heikinashi",
  "syntax": "ticker.heikinashi()",
  "description": "Pine Script v6 function: ticker.heikinashi",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ticker.heikinashi()",
  "parameters": [],
  "returns": "unknown"
 },
 "ticker.inherit": {
  "name": "ticker.inherit",
  "syntax": "ticker.inherit()",
  "description": "Pine Script v6 function: ticker.inherit",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ticker.inherit()",
  "parameters": [],
  "returns": "unknown"
 },
 "ticker.kagi": {
  "name": "ticker.kagi",
  "syntax": "ticker.kagi()",
  "description": "Pine Script v6 function: ticker.kagi",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ticker.kagi()",
  "parameters": [],
  "returns": "unknown"
 },
 "ticker.linebreak": {
  "name": "ticker.linebreak",
  "syntax": "ticker.linebreak()",
  "description": "Pine Script v6 function: ticker.linebreak",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ticker.linebreak()",
  "parameters": [],
  "returns": "unknown"
 },
 "ticker.modify": {
  "name": "ticker.modify",
  "syntax": "ticker.modify()",
  "description": "Pine Script v6 function: ticker.modify",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ticker.modify()",
  "parameters": [],
  "returns": "unknown"
 },
 "ticker.new": {
  "name": "ticker.new",
  "syntax": "ticker.new()",
  "description": "Pine Script v6 function: ticker.new",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ticker.new()",
  "parameters": [],
  "returns": "unknown"
 },
 "ticker.pointfigure": {
  "name": "ticker.pointfigure",
  "syntax": "ticker.pointfigure()",
  "description": "Pine Script v6 function: ticker.pointfigure",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ticker.pointfigure()",
  "parameters": [],
  "returns": "unknown"
 },
 "ticker.renko": {
  "name": "ticker.renko",
  "syntax": "ticker.renko()",
  "description": "Pine Script v6 function: ticker.renko",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ticker.renko()",
  "parameters": [],
  "returns": "unknown"
 },
 "ticker.standard": {
  "name": "ticker.standard",
  "syntax": "ticker.standard()",
  "description": "Pine Script v6 function: ticker.standard",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "ticker.standard()",
  "parameters": [],
  "returns": "unknown"
 },
 "timeframe.change": {
  "name": "timeframe.change",
  "syntax": "timeframe.change()",
  "description": "Pine Script v6 function: timeframe.change",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "timeframe.change()",
  "parameters": [],
  "returns": "unknown"
 },
 "timeframe.from_seconds": {
  "name": "timeframe.from_seconds",
  "syntax": "timeframe.from_seconds()",
  "description": "Pine Script v6 function: timeframe.from_seconds",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "timeframe.from_seconds()",
  "parameters": [],
  "returns": "unknown"
 },
 "timeframe.in_seconds": {
  "name": "timeframe.in_seconds",
  "syntax": "timeframe.in_seconds()",
  "description": "Pine Script v6 function: timeframe.in_seconds",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "timeframe.in_seconds()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.barcolor": {
  "name": "core.barcolor",
  "syntax": "core.barcolor()",
  "description": "Pine Script v6 function: core.barcolor",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.barcolor()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.bgcolor": {
  "name": "core.bgcolor",
  "syntax": "core.bgcolor()",
  "description": "Pine Script v6 function: core.bgcolor",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.bgcolor()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.bool": {
  "name": "core.bool",
  "syntax": "core.bool()",
  "description": "Pine Script v6 function: core.bool",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.bool()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.box": {
  "name": "core.box",
  "syntax": "core.box()",
  "description": "Pine Script v6 function: core.box",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.box()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.color": {
  "name": "core.color",
  "syntax": "core.color()",
  "description": "Pine Script v6 function: core.color",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.color()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.fill": {
  "name": "core.fill",
  "syntax": "core.fill()",
  "description": "Pine Script v6 function: core.fill",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.fill()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.fixnan": {
  "name": "core.fixnan",
  "syntax": "core.fixnan()",
  "description": "Pine Script v6 function: core.fixnan",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.fixnan()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.float": {
  "name": "core.float",
  "syntax": "core.float()",
  "description": "Pine Script v6 function: core.float",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.float()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.hline": {
  "name": "core.hline",
  "syntax": "core.hline()",
  "description": "Pine Script v6 function: core.hline",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.hline()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.hour": {
  "name": "core.hour",
  "syntax": "core.hour()",
  "description": "Pine Script v6 function: core.hour",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.hour()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.indicator": {
  "name": "core.indicator",
  "syntax": "core.indicator()",
  "description": "Pine Script v6 function: core.indicator",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.indicator()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.input": {
  "name": "core.input",
  "syntax": "core.input()",
  "description": "Pine Script v6 function: core.input",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.input()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.int": {
  "name": "core.int",
  "syntax": "core.int()",
  "description": "Pine Script v6 function: core.int",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.int()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.label": {
  "name": "core.label",
  "syntax": "core.label()",
  "description": "Pine Script v6 function: core.label",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.label()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.library": {
  "name": "core.library",
  "syntax": "core.library()",
  "description": "Pine Script v6 function: core.library",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.library()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.line": {
  "name": "core.line",
  "syntax": "core.line()",
  "description": "Pine Script v6 function: core.line",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.line()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.linefill": {
  "name": "core.linefill",
  "syntax": "core.linefill()",
  "description": "Pine Script v6 function: core.linefill",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.linefill()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.max_bars_back": {
  "name": "core.max_bars_back",
  "syntax": "core.max_bars_back()",
  "description": "Pine Script v6 function: core.max_bars_back",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.max_bars_back()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.minute": {
  "name": "core.minute",
  "syntax": "core.minute()",
  "description": "Pine Script v6 function: core.minute",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.minute()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.month": {
  "name": "core.month",
  "syntax": "core.month()",
  "description": "Pine Script v6 function: core.month",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.month()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.na": {
  "name": "core.na",
  "syntax": "core.na()",
  "description": "Pine Script v6 function: core.na",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.na()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.nz": {
  "name": "core.nz",
  "syntax": "core.nz()",
  "description": "Pine Script v6 function: core.nz",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.nz()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.plot": {
  "name": "core.plot",
  "syntax": "core.plot()",
  "description": "Pine Script v6 function: core.plot",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.plot()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.plotarrow": {
  "name": "core.plotarrow",
  "syntax": "core.plotarrow()",
  "description": "Pine Script v6 function: core.plotarrow",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.plotarrow()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.plotbar": {
  "name": "core.plotbar",
  "syntax": "core.plotbar()",
  "description": "Pine Script v6 function: core.plotbar",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.plotbar()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.plotcandle": {
  "name": "core.plotcandle",
  "syntax": "core.plotcandle()",
  "description": "Pine Script v6 function: core.plotcandle",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.plotcandle()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.plotchar": {
  "name": "core.plotchar",
  "syntax": "core.plotchar()",
  "description": "Pine Script v6 function: core.plotchar",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.plotchar()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.plotshape": {
  "name": "core.plotshape",
  "syntax": "core.plotshape()",
  "description": "Pine Script v6 function: core.plotshape",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.plotshape()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.polyline": {
  "name": "core.polyline",
  "syntax": "core.polyline()",
  "description": "Pine Script v6 function: core.polyline",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.polyline()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.string": {
  "name": "core.string",
  "syntax": "core.string()",
  "description": "Pine Script v6 function: core.string",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.string()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.dayofmonth": {
  "name": "core.dayofmonth",
  "syntax": "core.dayofmonth()",
  "description": "Pine Script v6 function: core.dayofmonth",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.dayofmonth()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.dayofweek": {
  "name": "core.dayofweek",
  "syntax": "core.dayofweek()",
  "description": "Pine Script v6 function: core.dayofweek",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.dayofweek()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.second": {
  "name": "core.second",
  "syntax": "core.second()",
  "description": "Pine Script v6 function: core.second",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.second()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.strategy": {
  "name": "core.strategy",
  "syntax": "core.strategy()",
  "description": "Pine Script v6 function: core.strategy",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.strategy()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.weekofyear": {
  "name": "core.weekofyear",
  "syntax": "core.weekofyear()",
  "description": "Pine Script v6 function: core.weekofyear",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.weekofyear()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.year": {
  "name": "core.year",
  "syntax": "core.year()",
  "description": "Pine Script v6 function: core.year",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.year()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.time": {
  "name": "core.time",
  "syntax": "core.time()",
  "description": "Pine Script v6 function: core.time",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.time()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.time_close": {
  "name": "core.time_close",
  "syntax": "core.time_close()",
  "description": "Pine Script v6 function: core.time_close",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.time_close()",
  "parameters": [],
  "returns": "unknown"
 },
 "core.timestamp": {
  "name": "core.timestamp",
  "syntax": "core.timestamp()",
  "description": "Pine Script v6 function: core.timestamp",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "core.timestamp()",
  "parameters": [],
  "returns": "unknown"
 },
 "alert": {
  "name": "alert",
  "syntax": "alert(message, freq) → void",
  "description": "Creates an alert trigger for an indicator or strategy, with a specified frequency, when called on the latest realtime bar. To activate alerts for a script containing calls to this function, open the \"Create Alert\" dialog box, then select the script name and \"Any alert() function call\" in the \"Condition\" section.",
  "requiredParams": [
   "message",
   "freq"
  ],
  "optionalParams": [],
  "signature": "alert(message, freq) → void",
  "parameters": [
   {
    "name": "message",
    "type": "series string",
    "description": "The message to send when the alert occurs.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "freq",
    "type": "input string",
    "description": "Optional. Determines the allowed frequency of the alert trigger. Possible values are: alert.freq_all (allows an alert on any realtime update), alert.freq_once_per_bar (allows an alert only on the first execution for each realtime bar), or alert.freq_once_per_bar_close (allows an alert only when a realtime bar closes). The default is alert.freq_once_per_bar.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "void"
 },
 "alertcondition": {
  "name": "alertcondition",
  "syntax": "alertcondition(condition, title, message) → void",
  "description": "Creates alert condition, that is available in Create Alert dialog. Please note, that alertcondition() does NOT create an alert, it just gives you more options in Create Alert dialog. Also, alertcondition() effect is invisible on chart.",
  "requiredParams": [
   "condition",
   "title",
   "message"
  ],
  "optionalParams": [],
  "signature": "alertcondition(condition, title, message) → void",
  "parameters": [
   {
    "name": "condition",
    "type": "series bool",
    "description": "Series of boolean values that is used for alert. True values mean alert fire, false - no alert. Required argument.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "title",
    "type": "const string",
    "description": "Title of the alert condition. Optional argument.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "message",
    "type": "const string",
    "description": "Message to display when alert fires. Optional argument.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "void"
 },
 "barcolor": {
  "name": "barcolor",
  "syntax": "barcolor()",
  "description": "Core Pine Script v6 function: barcolor",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "barcolor()",
  "parameters": [],
  "returns": "unknown"
 },
 "bgcolor": {
  "name": "bgcolor",
  "syntax": "bgcolor()",
  "description": "Core Pine Script v6 function: bgcolor",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "bgcolor()",
  "parameters": [],
  "returns": "unknown"
 },
 "bool": {
  "name": "bool",
  "syntax": "bool()",
  "description": "Core Pine Script v6 function: bool",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "bool()",
  "parameters": [],
  "returns": "unknown"
 },
 "box": {
  "name": "box",
  "syntax": "box()",
  "description": "Core Pine Script v6 function: box",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "box()",
  "parameters": [],
  "returns": "unknown"
 },
 "color": {
  "name": "color",
  "syntax": "color()",
  "description": "Core Pine Script v6 function: color",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "color()",
  "parameters": [],
  "returns": "unknown"
 },
 "fill": {
  "name": "fill",
  "syntax": "fill()",
  "description": "Core Pine Script v6 function: fill",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "fill()",
  "parameters": [],
  "returns": "unknown"
 },
 "fixnan": {
  "name": "fixnan",
  "syntax": "fixnan()",
  "description": "Core Pine Script v6 function: fixnan",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "fixnan()",
  "parameters": [],
  "returns": "unknown"
 },
 "float": {
  "name": "float",
  "syntax": "float()",
  "description": "Core Pine Script v6 function: float",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "float()",
  "parameters": [],
  "returns": "unknown"
 },
 "hline": {
  "name": "hline",
  "syntax": "hline()",
  "description": "Core Pine Script v6 function: hline",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "hline()",
  "parameters": [],
  "returns": "unknown"
 },
 "hour": {
  "name": "hour",
  "syntax": "hour()",
  "description": "Core Pine Script v6 function: hour",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "hour()",
  "parameters": [],
  "returns": "unknown"
 },
 "indicator": {
  "name": "indicator",
  "syntax": "indicator(title, shorttitle, overlay, format, precision, scale, max_bars_back, timeframe, timeframe_gaps, explicit_plot_zorder, max_lines_count, max_labels_count, max_boxes_count, calc_bars_count, max_polylines_count, dynamic_requests, behind_chart) → void",
  "description": "This declaration statement designates the script as an indicator and sets a number of indicator-related properties.",
  "requiredParams": [
   "title",
   "shorttitle",
   "overlay",
   "format",
   "precision",
   "scale",
   "max_bars_back",
   "timeframe",
   "timeframe_gaps",
   "explicit_plot_zorder",
   "max_lines_count",
   "max_labels_count",
   "max_boxes_count",
   "calc_bars_count",
   "max_polylines_count",
   "dynamic_requests",
   "behind_chart"
  ],
  "optionalParams": [],
  "signature": "indicator(title, shorttitle, overlay, format, precision, scale, max_bars_back, timeframe, timeframe_gaps, explicit_plot_zorder, max_lines_count, max_labels_count, max_boxes_count, calc_bars_count, max_polylines_count, dynamic_requests, behind_chart) → void",
  "parameters": [
   {
    "name": "title",
    "type": "const string",
    "description": "The title of the script. It is displayed on the chart when no shorttitle argument is used, and becomes the publication's default title when publishing the script.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "shorttitle",
    "type": "const string",
    "description": "The script's display name on charts. If specified, it will replace the title argument in most chart-related windows. Optional. The default is the argument used for title.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "overlay",
    "type": "const bool",
    "description": "If true, the script's visuals appear on the main chart pane if the user adds it to the chart directly, or in another script's pane if the user applies it to that script. If false, the script's visuals appear in a separate pane. Changes to the overlay value apply only after the user adds the script to the chart again. Additionally, if the user moves the script to another pane by selecting a \"Move to\" option in the script's \"More\" menu, it does not move back to its original pane after any updates to the source code. The default is false.  Strategy-specific labels that display entries and exits will be displayed over the main chart regardless of this setting.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "format",
    "type": "const string",
    "description": "Specifies the formatting of the script's displayed values. Possible values: format.inherit, format.price, format.volume, format.percent. Optional. The default is format.inherit.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "precision",
    "type": "const int",
    "description": "Specifies the number of digits after the floating point of the script's displayed values. Must be a non-negative integer no greater than 16. If format is set to format.inherit and precision is specified, the format will instead be set to format.price. When the function's format parameter uses format.volume, the precision parameter will not affect the result, as the decimal precision rules defined by format.volume supersede other precision settings. Optional. The default is inherited from the precision of the chart's symbol.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "scale",
    "type": "const scale_type",
    "description": "The price scale used. Possible values: scale.right, scale.left, scale.none. The scale.none value can only be applied in combination with overlay = true. Optional. By default, the script uses the same scale as the chart.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "max_bars_back",
    "type": "const int",
    "description": "The length of the historical buffer the script keeps for every variable and function, which determines how many past values can be referenced using the [] history-referencing operator. The required buffer size is automatically detected by the Pine Script® runtime. Using this parameter is only necessary when a runtime error occurs because automatic detection fails. More information on the underlying mechanics of the historical buffer can be found in our Help Center. Optional. The default is 0.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "timeframe",
    "type": "const string",
    "description": "Adds multi-timeframe functionality to simple scripts. When specified, a \"Timeframe\" field will be included in the \"Calculation\" section of the script's \"Settings/Inputs\" tab. The field's default value will be the argument supplied, whose format must conform to timeframe string specifications. To specify the chart's timeframe, use an empty string or the timeframe.period variable. The parameter cannot be used with scripts using Pine Script® drawings. Optional. The default is timeframe.period.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "timeframe_gaps",
    "type": "const bool",
    "description": "Specifies how the indicator's values are displayed on chart bars when the timeframe is higher than the chart's. If true, a value only appears on a chart bar when the higher timeframe value becomes available, otherwise na is returned (thus a \"gap\" occurs). With false, what would otherwise be gaps are filled with the latest known value returned, avoiding na values. When specified, a \"Wait for timeframe closes\" checkbox will be included in the \"Calculation\" section of the script's \"Settings/Inputs\" tab. Optional. The default is true.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "explicit_plot_zorder",
    "type": "const bool",
    "description": "Specifies the order in which the script's plots, fills, and hlines are rendered. If true, plots are drawn in the order in which they appear in the script's code, each newer plot being drawn above the previous ones. This only applies to plot*() functions, fill(), and hline(). Optional. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "max_lines_count",
    "type": "const int",
    "description": "The number of last line drawings displayed. Possible values: 1-500. The count is approximate; more drawings than the specified count may be displayed. Optional. The default is 50.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "max_labels_count",
    "type": "const int",
    "description": "The number of last label drawings displayed. Possible values: 1-500. The count is approximate; more drawings than the specified count may be displayed. Optional. The default is 50.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "max_boxes_count",
    "type": "const int",
    "description": "The number of last box drawings displayed. Possible values: 1-500. The count is approximate; more drawings than the specified count may be displayed. Optional. The default is 50.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "calc_bars_count",
    "type": "const int",
    "description": "Limits the initial calculation of a script to the last number of bars specified. When specified, a \"Calculated bars\" field will be included in the \"Calculation\" section of the script's \"Settings/Inputs\" tab. Optional. The default is 0, in which case the script executes on all available bars.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "max_polylines_count",
    "type": "const int",
    "description": "The number of last polyline drawings displayed. Possible values: 1-100. The count is approximate; more drawings than the specified count may be displayed. Optional. The default is 50.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "dynamic_requests",
    "type": "const bool",
    "description": "Specifies whether the script can dynamically call functions from the request.*() namespace. Dynamic request.*() calls are allowed within the local scopes of conditional structures (e.g., if), loops (e.g., for), and exported functions. Additionally, such calls allow \"series\" arguments for many of their parameters. Optional. The default is true. See the User Manual's Dynamic requests section for more information.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "behind_chart",
    "type": "const bool",
    "description": "Optional. Controls whether all plots and drawings appear behind the chart display (if true) or in front of it (if false). This parameter only takes effect when the overlay parameter is true. The default is true.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "void"
 },
 "input": {
  "name": "input",
  "syntax": "input()",
  "description": "Core Pine Script v6 function: input",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "input()",
  "parameters": [],
  "returns": "unknown"
 },
 "int": {
  "name": "int",
  "syntax": "int()",
  "description": "Core Pine Script v6 function: int",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "int()",
  "parameters": [],
  "returns": "unknown"
 },
 "label": {
  "name": "label",
  "syntax": "label()",
  "description": "Core Pine Script v6 function: label",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "label()",
  "parameters": [],
  "returns": "unknown"
 },
 "library": {
  "name": "library",
  "syntax": "library()",
  "description": "Core Pine Script v6 function: library",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "library()",
  "parameters": [],
  "returns": "unknown"
 },
 "line": {
  "name": "line",
  "syntax": "line()",
  "description": "Core Pine Script v6 function: line",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "line()",
  "parameters": [],
  "returns": "unknown"
 },
 "linefill": {
  "name": "linefill",
  "syntax": "linefill()",
  "description": "Core Pine Script v6 function: linefill",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "linefill()",
  "parameters": [],
  "returns": "unknown"
 },
 "max_bars_back": {
  "name": "max_bars_back",
  "syntax": "max_bars_back()",
  "description": "Core Pine Script v6 function: max_bars_back",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "max_bars_back()",
  "parameters": [],
  "returns": "unknown"
 },
 "minute": {
  "name": "minute",
  "syntax": "minute()",
  "description": "Core Pine Script v6 function: minute",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "minute()",
  "parameters": [],
  "returns": "unknown"
 },
 "month": {
  "name": "month",
  "syntax": "month()",
  "description": "Core Pine Script v6 function: month",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "month()",
  "parameters": [],
  "returns": "unknown"
 },
 "na": {
  "name": "na",
  "syntax": "na()",
  "description": "Core Pine Script v6 function: na",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "na()",
  "parameters": [],
  "returns": "unknown"
 },
 "nz": {
  "name": "nz",
  "syntax": "nz()",
  "description": "Core Pine Script v6 function: nz",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "nz()",
  "parameters": [],
  "returns": "unknown"
 },
 "plot": {
  "name": "plot",
  "syntax": "plot(series, title, color, linewidth, style, trackprice, histbase, offset, join, editable, show_last, display, format, precision, force_overlay, linestyle) → plot",
  "description": "Plots a series of data on the chart.",
  "requiredParams": [
   "series",
   "title",
   "color",
   "linewidth",
   "style",
   "trackprice",
   "histbase",
   "offset",
   "join",
   "editable",
   "show_last",
   "display",
   "format",
   "precision",
   "force_overlay",
   "linestyle"
  ],
  "optionalParams": [],
  "signature": "plot(series, title, color, linewidth, style, trackprice, histbase, offset, join, editable, show_last, display, format, precision, force_overlay, linestyle) → plot",
  "parameters": [
   {
    "name": "series",
    "type": "series int/float",
    "description": "Series of data to be plotted. Required argument.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "title",
    "type": "const string",
    "description": "Title of the plot.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "color",
    "type": "series color",
    "description": "Color of the plot. You can use constants like 'color=color.red' or 'color=#ff001a' as well as complex expressions like 'color = close >= open ? color.green : color.red'. Optional argument.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "linewidth",
    "type": "input int",
    "description": "Width of the plotted line. Default value is 1. Not applicable to every style.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "style",
    "type": "input plot_style",
    "description": "Type of plot. Possible values are: plot.style_line, plot.style_stepline, plot.style_stepline_diamond, plot.style_histogram, plot.style_cross, plot.style_area, plot.style_columns, plot.style_circles, plot.style_linebr, plot.style_areabr, plot.style_steplinebr. Default value is plot.style_line.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "trackprice",
    "type": "input bool",
    "description": "If true then a horizontal price line will be shown at the level of the last indicator value. Default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "histbase",
    "type": "input int/float",
    "description": "The price value used as the reference level when rendering plot with plot.style_histogram, plot.style_columns or plot.style_area style. Default is 0.0.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "offset",
    "type": "simple int",
    "description": "Shifts the plot to the left or to the right on the given number of bars. Default is 0.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "join",
    "type": "input bool",
    "description": "If true then plot points will be joined with line, applicable only to plot.style_cross and plot.style_circles styles. Default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "editable",
    "type": "input bool",
    "description": "If true then plot style will be editable in Format dialog. Default is true.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "show_last",
    "type": "input int",
    "description": "Optional. The number of bars, counting backwards from the most recent bar, on which the function can draw.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "display",
    "type": "input plot_display",
    "description": "Controls where the plot's information is displayed. Display options support addition and subtraction, meaning that using display.all - display.status_line will display the plot's information everywhere except in the script's status line. display.price_scale + display.status_line will display the plot only in the price scale and status line. When display arguments such as display.price_scale have user-controlled chart settings equivalents, the relevant plot information will only appear when all settings allow for it. Possible values: display.none, display.pane, display.data_window, display.price_scale, display.status_line, display.all. Optional. The default is display.all.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "format",
    "type": "input string",
    "description": "Determines whether the script formats the plot's values as prices, percentages, or volume values. The argument passed to this parameter supersedes the format parameter of the indicator(), and strategy() functions. Optional. The default is the format value used by the indicator()/strategy() function. Possible values: format.price, format.percent, format.volume.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "precision",
    "type": "input int",
    "description": "The number of digits after the decimal point the plot's values show on the chart pane's y-axis, the script's status line, and the Data Window. Accepts a non-negative integer less than or equal to 16. The argument passed to this parameter supersedes the precision parameter of the indicator() and strategy() functions. When the function's format parameter uses format.volume, the precision parameter will not affect the result, as the decimal precision rules defined by format.volume supersede other precision settings. Optional. The default is the precision value used by the indicator()/strategy() function.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "force_overlay",
    "type": "const bool",
    "description": "If true, the plotted results will display on the main chart pane, even when the script occupies a separate pane. Optional. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "linestyle",
    "type": "input plot_line_style",
    "description": "Optional. A modifier for plot styles that display lines. It specifies whether the plotted line is solid (plot.linestyle_solid), dashed (plot.linestyle_dashed), or dotted (plot.linestyle_dotted). The modifier applies only when the function uses one of the following style arguments: plot.style_line, plot.style_linebr, plot.style_stepline, plot.style_stepline_diamond, and plot.style_area. The default is plot.linestyle_solid.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "plot"
 },
 "plotarrow": {
  "name": "plotarrow",
  "syntax": "plotarrow()",
  "description": "Core Pine Script v6 function: plotarrow",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "plotarrow()",
  "parameters": [],
  "returns": "unknown"
 },
 "plotbar": {
  "name": "plotbar",
  "syntax": "plotbar()",
  "description": "Core Pine Script v6 function: plotbar",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "plotbar()",
  "parameters": [],
  "returns": "unknown"
 },
 "plotcandle": {
  "name": "plotcandle",
  "syntax": "plotcandle()",
  "description": "Core Pine Script v6 function: plotcandle",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "plotcandle()",
  "parameters": [],
  "returns": "unknown"
 },
 "plotchar": {
  "name": "plotchar",
  "syntax": "plotchar(series, title, char, location, color, offset, text, textcolor, editable, size, show_last, display, format, precision, force_overlay) → void",
  "description": "Plots visual shapes using any given one Unicode character on the chart.",
  "requiredParams": [
   "series",
   "title",
   "char",
   "location",
   "color",
   "offset",
   "text",
   "textcolor",
   "editable",
   "size",
   "show_last",
   "display",
   "format",
   "precision",
   "force_overlay"
  ],
  "optionalParams": [],
  "signature": "plotchar(series, title, char, location, color, offset, text, textcolor, editable, size, show_last, display, format, precision, force_overlay) → void",
  "parameters": [
   {
    "name": "series",
    "type": "series int/float/bool",
    "description": "Series of data to be plotted as shapes. Series is treated as a series of boolean values for all location values except location.absolute. Required argument.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "title",
    "type": "const string",
    "description": "Title of the plot.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "char",
    "type": "input string",
    "description": "Character to use as a visual shape.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "location",
    "type": "input string",
    "description": "Location of shapes on the chart. Possible values are: location.abovebar, location.belowbar, location.top, location.bottom, location.absolute. Default value is location.abovebar.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "color",
    "type": "series color",
    "description": "Color of the shapes. You can use constants like 'color=color.red' or 'color=#ff001a' as well as complex expressions like 'color = close >= open ? color.green : color.red'. Optional argument.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "offset",
    "type": "simple int",
    "description": "Shifts shapes to the left or to the right on the given number of bars. Default is 0.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "text",
    "type": "const string",
    "description": "Text to display with the shape. You can use multiline text, to separate lines use '\\n' escape sequence. Example: 'line one\\nline two'.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "textcolor",
    "type": "series color",
    "description": "Color of the text. You can use constants like 'textcolor=color.red' or 'textcolor=#ff001a' as well as complex expressions like 'textcolor = close >= open ? color.green : color.red'. Optional argument.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "editable",
    "type": "input bool",
    "description": "If true then plotchar style will be editable in Format dialog. Default is true.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "size",
    "type": "const string",
    "description": "Size of characters on the chart. Possible values are: size.auto, size.tiny, size.small, size.normal, size.large, size.huge. Default is size.auto.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "show_last",
    "type": "input int",
    "description": "Optional. The number of bars, counting backwards from the most recent bar, on which the function can draw.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "display",
    "type": "input plot_display",
    "description": "Controls where the plot's information is displayed. Display options support addition and subtraction, meaning that using display.all - display.status_line will display the plot's information everywhere except in the script's status line. display.price_scale + display.status_line will display the plot only in the price scale and status line. When display arguments such as display.price_scale have user-controlled chart settings equivalents, the relevant plot information will only appear when all settings allow for it. Possible values: display.none, display.pane, display.data_window, display.price_scale, display.status_line, display.all. Optional. The default is display.all.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "format",
    "type": "input string",
    "description": "Determines whether the script formats the plot's values as prices, percentages, or volume values. The argument passed to this parameter supersedes the format parameter of the indicator(), and strategy() functions. Optional. The default is the format value used by the indicator()/strategy() function. Possible values: format.price, format.percent, format.volume.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "precision",
    "type": "input int",
    "description": "The number of digits after the decimal point the plot's values show on the chart pane's y-axis, the script's status line, and the Data Window. Accepts a non-negative integer less than or equal to 16. The argument passed to this parameter supersedes the precision parameter of the indicator() and strategy() functions. When the function's format parameter uses format.volume, the precision parameter will not affect the result, as the decimal precision rules defined by format.volume supersede other precision settings. Optional. The default is the precision value used by the indicator()/strategy() function.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "force_overlay",
    "type": "const bool",
    "description": "If true, the plotted results will display on the main chart pane, even when the script occupies a separate pane. Optional. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "void"
 },
 "plotshape": {
  "name": "plotshape",
  "syntax": "plotshape(series, title, style, location, color, offset, text, textcolor, editable, size, show_last, display, format, precision, force_overlay) → void",
  "description": "Plots visual shapes on the chart.",
  "requiredParams": [
   "series",
   "title",
   "style",
   "location",
   "color",
   "offset",
   "text",
   "textcolor",
   "editable",
   "size",
   "show_last",
   "display",
   "format",
   "precision",
   "force_overlay"
  ],
  "optionalParams": [],
  "signature": "plotshape(series, title, style, location, color, offset, text, textcolor, editable, size, show_last, display, format, precision, force_overlay) → void",
  "parameters": [
   {
    "name": "series",
    "type": "series int/float/bool",
    "description": "Series of data to be plotted as shapes. Series is treated as a series of boolean values for all location values except location.absolute. Required argument.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "title",
    "type": "const string",
    "description": "Title of the plot.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "style",
    "type": "input string",
    "description": "Type of plot. Possible values are: shape.xcross, shape.cross, shape.triangleup, shape.triangledown, shape.flag, shape.circle, shape.arrowup, shape.arrowdown, shape.labelup, shape.labeldown, shape.square, shape.diamond. Default value is shape.xcross.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "location",
    "type": "input string",
    "description": "Location of shapes on the chart. Possible values are: location.abovebar, location.belowbar, location.top, location.bottom, location.absolute. Default value is location.abovebar.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "color",
    "type": "series color",
    "description": "Color of the shapes. You can use constants like 'color=color.red' or 'color=#ff001a' as well as complex expressions like 'color = close >= open ? color.green : color.red'. Optional argument.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "offset",
    "type": "simple int",
    "description": "Shifts shapes to the left or to the right on the given number of bars. Default is 0.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "text",
    "type": "const string",
    "description": "Text to display with the shape. You can use multiline text, to separate lines use '\\n' escape sequence. Example: 'line one\\nline two'.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "textcolor",
    "type": "series color",
    "description": "Color of the text. You can use constants like 'textcolor=color.red' or 'textcolor=#ff001a' as well as complex expressions like 'textcolor = close >= open ? color.green : color.red'. Optional argument.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "editable",
    "type": "input bool",
    "description": "If true then plotshape style will be editable in Format dialog. Default is true.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "size",
    "type": "const string",
    "description": "Size of shapes on the chart. Possible values are: size.auto, size.tiny, size.small, size.normal, size.large, size.huge. Default is size.auto.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "show_last",
    "type": "input int",
    "description": "Optional. The number of bars, counting backwards from the most recent bar, on which the function can draw.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "display",
    "type": "input plot_display",
    "description": "Controls where the plot's information is displayed. Display options support addition and subtraction, meaning that using display.all - display.status_line will display the plot's information everywhere except in the script's status line. display.price_scale + display.status_line will display the plot only in the price scale and status line. When display arguments such as display.price_scale have user-controlled chart settings equivalents, the relevant plot information will only appear when all settings allow for it. Possible values: display.none, display.pane, display.data_window, display.price_scale, display.status_line, display.all. Optional. The default is display.all.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "format",
    "type": "input string",
    "description": "Determines whether the script formats the plot's values as prices, percentages, or volume values. The argument passed to this parameter supersedes the format parameter of the indicator(), and strategy() functions. Optional. The default is the format value used by the indicator()/strategy() function. Possible values: format.price, format.percent, format.volume.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "precision",
    "type": "input int",
    "description": "The number of digits after the decimal point the plot's values show on the chart pane's y-axis, the script's status line, and the Data Window. Accepts a non-negative integer less than or equal to 16. The argument passed to this parameter supersedes the precision parameter of the indicator() and strategy() functions. When the function's format parameter uses format.volume, the precision parameter will not affect the result, as the decimal precision rules defined by format.volume supersede other precision settings. Optional. The default is the precision value used by the indicator()/strategy() function.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "force_overlay",
    "type": "const bool",
    "description": "If true, the plotted results will display on the main chart pane, even when the script occupies a separate pane. Optional. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "void"
 },
 "polyline": {
  "name": "polyline",
  "syntax": "polyline()",
  "description": "Core Pine Script v6 function: polyline",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "polyline()",
  "parameters": [],
  "returns": "unknown"
 },
 "string": {
  "name": "string",
  "syntax": "string()",
  "description": "Core Pine Script v6 function: string",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "string()",
  "parameters": [],
  "returns": "unknown"
 },
 "dayofmonth": {
  "name": "dayofmonth",
  "syntax": "dayofmonth()",
  "description": "Core Pine Script v6 function: dayofmonth",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "dayofmonth()",
  "parameters": [],
  "returns": "unknown"
 },
 "dayofweek": {
  "name": "dayofweek",
  "syntax": "dayofweek()",
  "description": "Core Pine Script v6 function: dayofweek",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "dayofweek()",
  "parameters": [],
  "returns": "unknown"
 },
 "second": {
  "name": "second",
  "syntax": "second()",
  "description": "Core Pine Script v6 function: second",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "second()",
  "parameters": [],
  "returns": "unknown"
 },
 "strategy": {
  "name": "strategy",
  "syntax": "strategy(title, shorttitle, overlay, format, precision, scale, pyramiding, calc_on_order_fills, calc_on_every_tick, max_bars_back, backtest_fill_limits_assumption, default_qty_type, default_qty_value, initial_capital, currency, slippage, commission_type, commission_value, process_orders_on_close, close_entries_rule, margin_long, margin_short, explicit_plot_zorder, max_lines_count, max_labels_count, max_boxes_count, calc_bars_count, risk_free_rate, use_bar_magnifier, fill_orders_on_standard_ohlc, max_polylines_count, dynamic_requests, behind_chart) → void",
  "description": "This declaration statement designates the script as a strategy and sets a number of strategy-related properties.",
  "requiredParams": [
   "title",
   "shorttitle",
   "overlay",
   "format",
   "precision",
   "scale",
   "pyramiding",
   "calc_on_order_fills",
   "calc_on_every_tick",
   "max_bars_back",
   "backtest_fill_limits_assumption",
   "default_qty_type",
   "default_qty_value",
   "initial_capital",
   "currency",
   "slippage",
   "commission_type",
   "commission_value",
   "process_orders_on_close",
   "close_entries_rule",
   "margin_long",
   "margin_short",
   "explicit_plot_zorder",
   "max_lines_count",
   "max_labels_count",
   "max_boxes_count",
   "calc_bars_count",
   "risk_free_rate",
   "use_bar_magnifier",
   "fill_orders_on_standard_ohlc",
   "max_polylines_count",
   "dynamic_requests",
   "behind_chart"
  ],
  "optionalParams": [],
  "signature": "strategy(title, shorttitle, overlay, format, precision, scale, pyramiding, calc_on_order_fills, calc_on_every_tick, max_bars_back, backtest_fill_limits_assumption, default_qty_type, default_qty_value, initial_capital, currency, slippage, commission_type, commission_value, process_orders_on_close, close_entries_rule, margin_long, margin_short, explicit_plot_zorder, max_lines_count, max_labels_count, max_boxes_count, calc_bars_count, risk_free_rate, use_bar_magnifier, fill_orders_on_standard_ohlc, max_polylines_count, dynamic_requests, behind_chart) → void",
  "parameters": [
   {
    "name": "title",
    "type": "const string",
    "description": "The title of the script. It is displayed on the chart when no shorttitle argument is used, and becomes the publication's default title when publishing the script.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "shorttitle",
    "type": "const string",
    "description": "The script's display name on charts. If specified, it will replace the title argument in most chart-related windows. Optional. The default is the argument used for title.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "overlay",
    "type": "const bool",
    "description": "If true, the script's visuals appear on the main chart pane if the user adds it to the chart directly, or in another script's pane if the user applies it to that script. If false, the script's visuals appear in a separate pane. Changes to the overlay value apply only after the user adds the script to the chart again. Additionally, if the user moves the script to another pane by selecting a \"Move to\" option in the script's \"More\" menu, it does not move back to its original pane after any updates to the source code. The default is false.  Strategy-specific labels that display entries and exits will be displayed over the main chart regardless of this setting.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "format",
    "type": "const string",
    "description": "Specifies the formatting of the script's displayed values. Possible values: format.inherit, format.price, format.volume, format.percent. Optional. The default is format.inherit.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "precision",
    "type": "const int",
    "description": "Specifies the number of digits after the floating point of the script's displayed values. Must be a non-negative integer no greater than 16. If format is set to format.inherit and precision is specified, the format will instead be set to format.price. When the function's format parameter uses format.volume, the precision parameter will not affect the result, as the decimal precision rules defined by format.volume supersede other precision settings. Optional. The default is inherited from the precision of the chart's symbol.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "scale",
    "type": "const scale_type",
    "description": "The price scale used. Possible values: scale.right, scale.left, scale.none. The scale.none value can only be applied in combination with overlay = true. Optional. By default, the script uses the same scale as the chart.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "pyramiding",
    "type": "const int",
    "description": "The maximum number of entries allowed in the same direction. If the value is 0, only one entry order in the same direction can be opened, and additional entry orders are rejected. This setting can also be changed in the strategy's \"Settings/Properties\" tab. Optional. The default is 0.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "calc_on_order_fills",
    "type": "const bool",
    "description": "Specifies whether the strategy should be recalculated after an order is filled. If true, the strategy recalculates after an order is filled, as opposed to recalculating only when the bar closes. This setting can also be changed in the strategy's \"Settings/Properties\" tab. Optional. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "calc_on_every_tick",
    "type": "const bool",
    "description": "Specifies whether the strategy should be recalculated on each realtime tick. If true, when the strategy is running on a realtime bar, it will recalculate on each chart update. If false, the strategy only calculates when the realtime bar closes. The argument used does not affect strategy calculation on historical data. This setting can also be changed in the strategy's \"Settings/Properties\" tab. Optional. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "max_bars_back",
    "type": "const int",
    "description": "The length of the historical buffer the script keeps for every variable and function, which determines how many past values can be referenced using the [] history-referencing operator. The required buffer size is automatically detected by the Pine Script® runtime. Using this parameter is only necessary when a runtime error occurs because automatic detection fails. More information on the underlying mechanics of the historical buffer can be found in our Help Center. Optional. The default is 0.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "backtest_fill_limits_assumption",
    "type": "const int",
    "description": "Limit order execution threshold in ticks. When it is used, limit orders are only filled if the market price exceeds the order's limit level by the specified number of ticks. Optional. The default is 0.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "default_qty_type",
    "type": "const string",
    "description": "Specifies the units used for default_qty_value. Possible values are: strategy.fixed for contracts/shares/lots, strategy.cash for currency amounts, or strategy.percent_of_equity for a percentage of available equity. This setting can also be changed in the strategy's \"Settings/Properties\" tab. Optional. The default is strategy.fixed.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "default_qty_value",
    "type": "const int/float",
    "description": "The default quantity to trade, in units determined by the argument used with the default_qty_type parameter. This setting can also be changed in the strategy's \"Settings/Properties\" tab. Optional. The default is 1.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "initial_capital",
    "type": "const int/float",
    "description": "The amount of funds initially available for the strategy to trade, in units of currency. Optional. The default is 1000000.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "currency",
    "type": "const string",
    "description": "Currency used by the strategy in currency-related calculations. Market positions are still opened by converting currency into the chart symbol's currency. The conversion rate depends on the previous daily value of a corresponding currency pair from the most popular exchange. A spread symbol is used if no exchange provides the rate directly. Possible values: a \"string\" representing a valid currency code (e.g., \"USD\" or \"USDT\") or a constant from the currency.* namespace (e.g., currency.USD or currency.USDT). The default is syminfo.currency.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "slippage",
    "type": "const int",
    "description": "Slippage expressed in ticks. This value is added to or subtracted from the fill price of market/stop orders to make the fill price less favorable for the strategy. E.g., if syminfo.mintick is 0.01 and slippage is set to 5, a long market order will enter at 5 * 0.01 = 0.05 points above the actual price. This setting can also be changed in the strategy's \"Settings/Properties\" tab. Optional. The default is 0.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "commission_type",
    "type": "const string",
    "description": "Determines what the number passed to the commission_value expresses: strategy.commission.percent for a percentage of the cash volume of the order, strategy.commission.cash_per_contract for currency per contract, strategy.commission.cash_per_order for currency per order. This setting can also be changed in the strategy's \"Settings/Properties\" tab. Optional. The default is strategy.commission.percent.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "commission_value",
    "type": "const int/float",
    "description": "Commission applied to the strategy's orders in units determined by the argument passed to the commission_type parameter. This setting can also be changed in the strategy's \"Settings/Properties\" tab. Optional. The default is 0.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "process_orders_on_close",
    "type": "const bool",
    "description": "When set to true, generates an additional attempt to execute orders after a bar closes and strategy calculations are completed. If the orders are market orders, the broker emulator executes them before the next bar's open. If the orders are price-dependent, they will only be filled if the price conditions are met. This option is useful if you wish to close positions on the current bar. This setting can also be changed in the strategy's \"Settings/Properties\" tab. Optional. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "close_entries_rule",
    "type": "const string",
    "description": "Determines the order in which trades are closed. Possible values are: \"FIFO\" (First-In, First-Out) if the earliest exit order must close the earliest entry order, or \"ANY\" if the orders are closed based on the from_entry parameter of the strategy.exit() function. \"FIFO\" can only be used with stocks, futures and US forex (NFA Compliance Rule 2-43b), while \"ANY\" is allowed in non-US forex. Optional. The default is \"FIFO\".",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "margin_long",
    "type": "const int/float",
    "description": "Margin long is the percentage of the purchase price of a security that must be covered by cash or collateral for long positions. Must be a non-negative number. The logic used to simulate margin calls is explained in the Help Center. This setting can also be changed in the strategy's \"Settings/Properties\" tab. Optional. If the value is 0, the strategy does not enforce any limits on position size. The default is 100, in which case the strategy only uses its own funds and the long positions cannot be margin called.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "margin_short",
    "type": "const int/float",
    "description": "Margin short is the percentage of the purchase price of a security that must be covered by cash or collateral for short positions. Must be a non-negative number. The logic used to simulate margin calls is explained in the Help Center. This setting can also be changed in the strategy's \"Settings/Properties\" tab. Optional. If the value is 0, the strategy does not enforce any limits on position size. The default is 100, in which case the strategy only uses its own funds. Note that even with no margin used, short positions can be margin called if the loss exceeds available funds.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "explicit_plot_zorder",
    "type": "const bool",
    "description": "Specifies the order in which the script's plots, fills, and hlines are rendered. If true, plots are drawn in the order in which they appear in the script's code, each newer plot being drawn above the previous ones. This only applies to plot*() functions, fill(), and hline(). Optional. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "max_lines_count",
    "type": "const int",
    "description": "The number of last line drawings displayed. Possible values: 1-500. Optional. The default is 50.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "max_labels_count",
    "type": "const int",
    "description": "The number of last label drawings displayed. Possible values: 1-500. Optional. The default is 50.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "max_boxes_count",
    "type": "const int",
    "description": "The number of last box drawings displayed. Possible values: 1-500. Optional. The default is 50.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "calc_bars_count",
    "type": "const int",
    "description": "Limits the initial calculation of a script to the last number of bars specified. When specified, a \"Calculated bars\" field will be included in the \"Calculation\" section of the script's \"Settings/Inputs\" tab. Optional. The default is 0, in which case the script executes on all available bars.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "risk_free_rate",
    "type": "const int/float",
    "description": "The risk-free rate of return is the annual percentage change in the value of an investment with minimal or zero risk. It is used to calculate the Sharpe and Sortino ratios. Optional. The default is 2.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "use_bar_magnifier",
    "type": "const bool",
    "description": "Optional. When true, the Broker Emulator uses lower timeframe data during backtesting on historical bars to achieve more realistic results. The default is false. Only Premium and higher-tier plans have access to this feature.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "fill_orders_on_standard_ohlc",
    "type": "const bool",
    "description": "When true, forces strategies running on Heikin Ashi charts to fill orders using actual OHLC prices, for more realistic results. Optional. The default is false.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "max_polylines_count",
    "type": "const int",
    "description": "The number of last polyline drawings displayed. Possible values: 1-100. The count is approximate; more drawings than the specified count may be displayed. Optional. The default is 50.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "dynamic_requests",
    "type": "const bool",
    "description": "Specifies whether the script can dynamically call functions from the request.*() namespace. Dynamic request.*() calls are allowed within the local scopes of conditional structures (e.g., if), loops (e.g., for), and exported functions. Additionally, such calls allow \"series\" arguments for many of their parameters. Optional. The default is true. See the User Manual's Dynamic requests section for more information.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   },
   {
    "name": "behind_chart",
    "type": "const bool",
    "description": "Optional. Controls whether all plots and drawings appear behind the chart display (if true) or in front of it (if false). This parameter only takes effect when the overlay parameter is true. The default is true.",
    "optional": false,
    "required": true,
    "explicitlyOptional": false,
    "explicitlyRequired": true
   }
  ],
  "returns": "void"
 },
 "weekofyear": {
  "name": "weekofyear",
  "syntax": "weekofyear()",
  "description": "Core Pine Script v6 function: weekofyear",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "weekofyear()",
  "parameters": [],
  "returns": "unknown"
 },
 "year": {
  "name": "year",
  "syntax": "year()",
  "description": "Core Pine Script v6 function: year",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "year()",
  "parameters": [],
  "returns": "unknown"
 },
 "time": {
  "name": "time",
  "syntax": "time()",
  "description": "Core Pine Script v6 function: time",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "time()",
  "parameters": [],
  "returns": "unknown"
 },
 "time_close": {
  "name": "time_close",
  "syntax": "time_close()",
  "description": "Core Pine Script v6 function: time_close",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "time_close()",
  "parameters": [],
  "returns": "unknown"
 },
 "timestamp": {
  "name": "timestamp",
  "syntax": "timestamp()",
  "description": "Core Pine Script v6 function: timestamp",
  "requiredParams": [],
  "optionalParams": [],
  "signature": "timestamp()",
  "parameters": [],
  "returns": "unknown"
 }
};
