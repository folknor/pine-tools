/**
 * Pine Script v6 Namespaces
 * Auto-generated - provides organized namespace data for IntelliSense
 * Generated: 2025-12-23T15:21:44.774Z
 */

export interface NamespaceMember {
	fullName: string;
	syntax?: string;
	returns?: string;
	type?: string;
	description?: string;
}

export interface Namespace {
	functions: Record<string, NamespaceMember>;
	variables: Record<string, NamespaceMember>;
	constants: Record<string, NamespaceMember>;
}

export const V6_NAMESPACES: Record<string, Namespace> = {
 "alert": {
  "functions": {
   "alert": {
    "fullName": "alert.alert",
    "syntax": "alert.alert()",
    "returns": "unknown",
    "description": "Pine Script v6 function: alert.alert"
   },
   "alertcondition": {
    "fullName": "alert.alertcondition",
    "syntax": "alert.alertcondition()",
    "returns": "unknown",
    "description": "Pine Script v6 function: alert.alertcondition"
   }
  },
  "variables": {},
  "constants": {
   "freq_all": {
    "fullName": "alert.freq_all",
    "type": "string"
   },
   "freq_once_per_bar": {
    "fullName": "alert.freq_once_per_bar",
    "type": "string"
   },
   "freq_once_per_bar_close": {
    "fullName": "alert.freq_once_per_bar_close",
    "type": "string"
   }
  }
 },
 "array": {
  "functions": {
   "abs": {
    "fullName": "array.abs",
    "syntax": "array.abs()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.abs"
   },
   "avg": {
    "fullName": "array.avg",
    "syntax": "array.avg()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.avg"
   },
   "binary_search": {
    "fullName": "array.binary_search",
    "syntax": "array.binary_search()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.binary_search"
   },
   "binary_search_leftmost": {
    "fullName": "array.binary_search_leftmost",
    "syntax": "array.binary_search_leftmost()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.binary_search_leftmost"
   },
   "binary_search_rightmost": {
    "fullName": "array.binary_search_rightmost",
    "syntax": "array.binary_search_rightmost()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.binary_search_rightmost"
   },
   "clear": {
    "fullName": "array.clear",
    "syntax": "array.clear()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.clear"
   },
   "concat": {
    "fullName": "array.concat",
    "syntax": "array.concat()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.concat"
   },
   "copy": {
    "fullName": "array.copy",
    "syntax": "array.copy()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.copy"
   },
   "covariance": {
    "fullName": "array.covariance",
    "syntax": "array.covariance()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.covariance"
   },
   "every": {
    "fullName": "array.every",
    "syntax": "array.every()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.every"
   },
   "fill": {
    "fullName": "array.fill",
    "syntax": "array.fill()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.fill"
   },
   "first": {
    "fullName": "array.first",
    "syntax": "array.first()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.first"
   },
   "from": {
    "fullName": "array.from",
    "syntax": "array.from()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.from"
   },
   "get": {
    "fullName": "array.get",
    "syntax": "array.get(id, index) → series <type>",
    "returns": "series <type>",
    "description": "The function returns the value of the element at the specified index."
   },
   "includes": {
    "fullName": "array.includes",
    "syntax": "array.includes()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.includes"
   },
   "indexof": {
    "fullName": "array.indexof",
    "syntax": "array.indexof()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.indexof"
   },
   "insert": {
    "fullName": "array.insert",
    "syntax": "array.insert()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.insert"
   },
   "join": {
    "fullName": "array.join",
    "syntax": "array.join()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.join"
   },
   "last": {
    "fullName": "array.last",
    "syntax": "array.last()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.last"
   },
   "lastindexof": {
    "fullName": "array.lastindexof",
    "syntax": "array.lastindexof()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.lastindexof"
   },
   "max": {
    "fullName": "array.max",
    "syntax": "array.max()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.max"
   },
   "median": {
    "fullName": "array.median",
    "syntax": "array.median()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.median"
   },
   "min": {
    "fullName": "array.min",
    "syntax": "array.min()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.min"
   },
   "mode": {
    "fullName": "array.mode",
    "syntax": "array.mode()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.mode"
   },
   "new_bool": {
    "fullName": "array.new_bool",
    "syntax": "array.new_bool()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.new_bool"
   },
   "new_box": {
    "fullName": "array.new_box",
    "syntax": "array.new_box()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.new_box"
   },
   "new_color": {
    "fullName": "array.new_color",
    "syntax": "array.new_color()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.new_color"
   },
   "new_float": {
    "fullName": "array.new_float",
    "syntax": "array.new_float()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.new_float"
   },
   "new_int": {
    "fullName": "array.new_int",
    "syntax": "array.new_int()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.new_int"
   },
   "new_label": {
    "fullName": "array.new_label",
    "syntax": "array.new_label()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.new_label"
   },
   "new_line": {
    "fullName": "array.new_line",
    "syntax": "array.new_line()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.new_line"
   },
   "new_linefill": {
    "fullName": "array.new_linefill",
    "syntax": "array.new_linefill()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.new_linefill"
   },
   "new_string": {
    "fullName": "array.new_string",
    "syntax": "array.new_string()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.new_string"
   },
   "new_table": {
    "fullName": "array.new_table",
    "syntax": "array.new_table()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.new_table"
   },
   "new": {
    "fullName": "array.new",
    "syntax": "array.new()",
    "returns": "unknown",
    "description": ""
   },
   "percentile_linear_interpolation": {
    "fullName": "array.percentile_linear_interpolation",
    "syntax": "array.percentile_linear_interpolation()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.percentile_linear_interpolation"
   },
   "percentile_nearest_rank": {
    "fullName": "array.percentile_nearest_rank",
    "syntax": "array.percentile_nearest_rank()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.percentile_nearest_rank"
   },
   "percentrank": {
    "fullName": "array.percentrank",
    "syntax": "array.percentrank()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.percentrank"
   },
   "pop": {
    "fullName": "array.pop",
    "syntax": "array.pop()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.pop"
   },
   "push": {
    "fullName": "array.push",
    "syntax": "array.push(id, value) → void",
    "returns": "void",
    "description": "The function appends a value to an array."
   },
   "range": {
    "fullName": "array.range",
    "syntax": "array.range()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.range"
   },
   "remove": {
    "fullName": "array.remove",
    "syntax": "array.remove()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.remove"
   },
   "reverse": {
    "fullName": "array.reverse",
    "syntax": "array.reverse()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.reverse"
   },
   "set": {
    "fullName": "array.set",
    "syntax": "array.set()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.set"
   },
   "shift": {
    "fullName": "array.shift",
    "syntax": "array.shift()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.shift"
   },
   "size": {
    "fullName": "array.size",
    "syntax": "array.size(id) → series int",
    "returns": "series int",
    "description": "The function returns the number of elements in an array."
   },
   "slice": {
    "fullName": "array.slice",
    "syntax": "array.slice()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.slice"
   },
   "some": {
    "fullName": "array.some",
    "syntax": "array.some()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.some"
   },
   "sort": {
    "fullName": "array.sort",
    "syntax": "array.sort()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.sort"
   },
   "sort_indices": {
    "fullName": "array.sort_indices",
    "syntax": "array.sort_indices()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.sort_indices"
   },
   "standardize": {
    "fullName": "array.standardize",
    "syntax": "array.standardize()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.standardize"
   },
   "stdev": {
    "fullName": "array.stdev",
    "syntax": "array.stdev()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.stdev"
   },
   "sum": {
    "fullName": "array.sum",
    "syntax": "array.sum()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.sum"
   },
   "unshift": {
    "fullName": "array.unshift",
    "syntax": "array.unshift()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.unshift"
   },
   "variance": {
    "fullName": "array.variance",
    "syntax": "array.variance()",
    "returns": "unknown",
    "description": "Pine Script v6 function: array.variance"
   }
  },
  "variables": {},
  "constants": {}
 },
 "box": {
  "functions": {
   "copy": {
    "fullName": "box.copy",
    "syntax": "box.copy()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.copy"
   },
   "delete": {
    "fullName": "box.delete",
    "syntax": "box.delete()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.delete"
   },
   "get_bottom": {
    "fullName": "box.get_bottom",
    "syntax": "box.get_bottom()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.get_bottom"
   },
   "get_left": {
    "fullName": "box.get_left",
    "syntax": "box.get_left()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.get_left"
   },
   "get_right": {
    "fullName": "box.get_right",
    "syntax": "box.get_right()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.get_right"
   },
   "get_top": {
    "fullName": "box.get_top",
    "syntax": "box.get_top()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.get_top"
   },
   "new": {
    "fullName": "box.new",
    "syntax": "box.new(top_left, bottom_right, border_color, border_width, border_style, extend, xloc, bgcolor, text, text_size, text_color, text_halign, text_valign, text_wrap, text_font_family, force_overlay, text_formatting) → series box",
    "returns": "series box",
    "description": "Creates a new box object."
   },
   "set_bgcolor": {
    "fullName": "box.set_bgcolor",
    "syntax": "box.set_bgcolor()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_bgcolor"
   },
   "set_border_color": {
    "fullName": "box.set_border_color",
    "syntax": "box.set_border_color()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_border_color"
   },
   "set_border_style": {
    "fullName": "box.set_border_style",
    "syntax": "box.set_border_style()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_border_style"
   },
   "set_border_width": {
    "fullName": "box.set_border_width",
    "syntax": "box.set_border_width()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_border_width"
   },
   "set_bottom": {
    "fullName": "box.set_bottom",
    "syntax": "box.set_bottom()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_bottom"
   },
   "set_bottom_right_point": {
    "fullName": "box.set_bottom_right_point",
    "syntax": "box.set_bottom_right_point()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_bottom_right_point"
   },
   "set_extend": {
    "fullName": "box.set_extend",
    "syntax": "box.set_extend()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_extend"
   },
   "set_left": {
    "fullName": "box.set_left",
    "syntax": "box.set_left()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_left"
   },
   "set_lefttop": {
    "fullName": "box.set_lefttop",
    "syntax": "box.set_lefttop()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_lefttop"
   },
   "set_right": {
    "fullName": "box.set_right",
    "syntax": "box.set_right()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_right"
   },
   "set_rightbottom": {
    "fullName": "box.set_rightbottom",
    "syntax": "box.set_rightbottom()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_rightbottom"
   },
   "set_text": {
    "fullName": "box.set_text",
    "syntax": "box.set_text()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_text"
   },
   "set_text_color": {
    "fullName": "box.set_text_color",
    "syntax": "box.set_text_color()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_text_color"
   },
   "set_text_font_family": {
    "fullName": "box.set_text_font_family",
    "syntax": "box.set_text_font_family()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_text_font_family"
   },
   "set_text_formatting": {
    "fullName": "box.set_text_formatting",
    "syntax": "box.set_text_formatting()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_text_formatting"
   },
   "set_text_halign": {
    "fullName": "box.set_text_halign",
    "syntax": "box.set_text_halign()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_text_halign"
   },
   "set_text_size": {
    "fullName": "box.set_text_size",
    "syntax": "box.set_text_size()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_text_size"
   },
   "set_text_valign": {
    "fullName": "box.set_text_valign",
    "syntax": "box.set_text_valign()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_text_valign"
   },
   "set_text_wrap": {
    "fullName": "box.set_text_wrap",
    "syntax": "box.set_text_wrap()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_text_wrap"
   },
   "set_top": {
    "fullName": "box.set_top",
    "syntax": "box.set_top()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_top"
   },
   "set_top_left_point": {
    "fullName": "box.set_top_left_point",
    "syntax": "box.set_top_left_point()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_top_left_point"
   },
   "set_xloc": {
    "fullName": "box.set_xloc",
    "syntax": "box.set_xloc()",
    "returns": "unknown",
    "description": "Pine Script v6 function: box.set_xloc"
   }
  },
  "variables": {},
  "constants": {}
 },
 "chart": {
  "functions": {
   "point.copy": {
    "fullName": "chart.point.copy",
    "syntax": "chart.point.copy()",
    "returns": "unknown",
    "description": "Pine Script v6 function: chart.point.copy"
   },
   "point.from_index": {
    "fullName": "chart.point.from_index",
    "syntax": "chart.point.from_index()",
    "returns": "unknown",
    "description": "Pine Script v6 function: chart.point.from_index"
   },
   "point.from_time": {
    "fullName": "chart.point.from_time",
    "syntax": "chart.point.from_time()",
    "returns": "unknown",
    "description": "Pine Script v6 function: chart.point.from_time"
   },
   "point.new": {
    "fullName": "chart.point.new",
    "syntax": "chart.point.new()",
    "returns": "unknown",
    "description": "Pine Script v6 function: chart.point.new"
   },
   "point.now": {
    "fullName": "chart.point.now",
    "syntax": "chart.point.now()",
    "returns": "unknown",
    "description": "Pine Script v6 function: chart.point.now"
   }
  },
  "variables": {
   "bg_color": {
    "fullName": "chart.bg_color",
    "type": "simple<string>"
   },
   "fg_color": {
    "fullName": "chart.fg_color",
    "type": "simple<string>"
   },
   "is_heikinashi": {
    "fullName": "chart.is_heikinashi",
    "type": "simple<string>"
   },
   "is_kagi": {
    "fullName": "chart.is_kagi",
    "type": "simple<string>"
   },
   "is_linebreak": {
    "fullName": "chart.is_linebreak",
    "type": "simple<string>"
   },
   "is_pnf": {
    "fullName": "chart.is_pnf",
    "type": "simple<string>"
   },
   "is_range": {
    "fullName": "chart.is_range",
    "type": "simple<string>"
   },
   "is_renko": {
    "fullName": "chart.is_renko",
    "type": "simple<string>"
   },
   "is_standard": {
    "fullName": "chart.is_standard",
    "type": "simple<string>"
   },
   "left_visible_bar_time": {
    "fullName": "chart.left_visible_bar_time",
    "type": "simple<string>"
   },
   "right_visible_bar_time": {
    "fullName": "chart.right_visible_bar_time",
    "type": "simple<string>"
   }
  },
  "constants": {}
 },
 "color": {
  "functions": {
   "b": {
    "fullName": "color.b",
    "syntax": "color.b()",
    "returns": "unknown",
    "description": "Pine Script v6 function: color.b"
   },
   "from_gradient": {
    "fullName": "color.from_gradient",
    "syntax": "color.from_gradient()",
    "returns": "unknown",
    "description": "Pine Script v6 function: color.from_gradient"
   },
   "g": {
    "fullName": "color.g",
    "syntax": "color.g()",
    "returns": "unknown",
    "description": "Pine Script v6 function: color.g"
   },
   "new": {
    "fullName": "color.new",
    "syntax": "color.new(color, transp) → const color",
    "returns": "const color",
    "description": "Function color applies the specified transparency to the given color."
   },
   "r": {
    "fullName": "color.r",
    "syntax": "color.r()",
    "returns": "unknown",
    "description": "Pine Script v6 function: color.r"
   },
   "rgb": {
    "fullName": "color.rgb",
    "syntax": "color.rgb(red, green, blue, transp) → const color",
    "returns": "const color",
    "description": "Creates a new color with transparency using the RGB color model."
   },
   "t": {
    "fullName": "color.t",
    "syntax": "color.t()",
    "returns": "unknown",
    "description": "Pine Script v6 function: color.t"
   }
  },
  "variables": {},
  "constants": {
   "aqua": {
    "fullName": "color.aqua",
    "type": "color"
   },
   "black": {
    "fullName": "color.black",
    "type": "color"
   },
   "blue": {
    "fullName": "color.blue",
    "type": "color"
   },
   "fuchsia": {
    "fullName": "color.fuchsia",
    "type": "color"
   },
   "gray": {
    "fullName": "color.gray",
    "type": "color"
   },
   "green": {
    "fullName": "color.green",
    "type": "color"
   },
   "lime": {
    "fullName": "color.lime",
    "type": "color"
   },
   "maroon": {
    "fullName": "color.maroon",
    "type": "color"
   },
   "navy": {
    "fullName": "color.navy",
    "type": "color"
   },
   "olive": {
    "fullName": "color.olive",
    "type": "color"
   },
   "orange": {
    "fullName": "color.orange",
    "type": "color"
   },
   "purple": {
    "fullName": "color.purple",
    "type": "color"
   },
   "red": {
    "fullName": "color.red",
    "type": "color"
   },
   "silver": {
    "fullName": "color.silver",
    "type": "color"
   },
   "teal": {
    "fullName": "color.teal",
    "type": "color"
   },
   "white": {
    "fullName": "color.white",
    "type": "color"
   },
   "yellow": {
    "fullName": "color.yellow",
    "type": "color"
   }
  }
 },
 "input": {
  "functions": {
   "color": {
    "fullName": "input.color",
    "syntax": "input.color(defval, title, tooltip, inline, group, confirm, display, active) → input color",
    "returns": "input color",
    "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a color picker that allows the user to select a color and transparency, either from a palette or a hex value."
   },
   "enum": {
    "fullName": "input.enum",
    "syntax": "input.enum()",
    "returns": "unknown",
    "description": "Pine Script v6 function: input.enum"
   },
   "float": {
    "fullName": "input.float",
    "syntax": "input.float(defval, title, options, tooltip, inline, group, confirm, display, active) → input float",
    "returns": "input float",
    "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for a float input to the script's inputs."
   },
   "int": {
    "fullName": "input.int",
    "syntax": "input.int(defval, title, options, tooltip, inline, group, confirm, display, active) → input int",
    "returns": "input int",
    "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for an integer input to the script's inputs."
   },
   "price": {
    "fullName": "input.price",
    "syntax": "input.price()",
    "returns": "unknown",
    "description": "Pine Script v6 function: input.price"
   },
   "session": {
    "fullName": "input.session",
    "syntax": "input.session()",
    "returns": "unknown",
    "description": "Pine Script v6 function: input.session"
   },
   "source": {
    "fullName": "input.source",
    "syntax": "input.source(defval, title, tooltip, inline, group, display, active, confirm) → series float",
    "returns": "series float",
    "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a dropdown that allows the user to select a source for the calculation, e.g. close, hl2, etc. The user can also select an output from another indicator on their chart as the source."
   },
   "string": {
    "fullName": "input.string",
    "syntax": "input.string(defval, title, options, tooltip, inline, group, confirm, display, active) → input string",
    "returns": "input string",
    "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for a string input to the script's inputs."
   },
   "symbol": {
    "fullName": "input.symbol",
    "syntax": "input.symbol()",
    "returns": "unknown",
    "description": "Pine Script v6 function: input.symbol"
   },
   "text_area": {
    "fullName": "input.text_area",
    "syntax": "input.text_area()",
    "returns": "unknown",
    "description": "Pine Script v6 function: input.text_area"
   },
   "time": {
    "fullName": "input.time",
    "syntax": "input.time()",
    "returns": "unknown",
    "description": "Pine Script v6 function: input.time"
   },
   "timeframe": {
    "fullName": "input.timeframe",
    "syntax": "input.timeframe()",
    "returns": "unknown",
    "description": "Pine Script v6 function: input.timeframe"
   },
   "resolution": {
    "fullName": "input.resolution",
    "syntax": "input.resolution()",
    "returns": "unknown",
    "description": "Pine Script v6 function: input.resolution"
   }
  },
  "variables": {},
  "constants": {}
 },
 "label": {
  "functions": {
   "copy": {
    "fullName": "label.copy",
    "syntax": "label.copy()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.copy"
   },
   "delete": {
    "fullName": "label.delete",
    "syntax": "label.delete()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.delete"
   },
   "get_text": {
    "fullName": "label.get_text",
    "syntax": "label.get_text()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.get_text"
   },
   "get_x": {
    "fullName": "label.get_x",
    "syntax": "label.get_x()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.get_x"
   },
   "get_y": {
    "fullName": "label.get_y",
    "syntax": "label.get_y()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.get_y"
   },
   "new": {
    "fullName": "label.new",
    "syntax": "label.new(point, text, xloc, yloc, color, style, textcolor, size, textalign, tooltip, text_font_family, force_overlay, text_formatting) → series label",
    "returns": "series label",
    "description": "Creates new label object."
   },
   "set_color": {
    "fullName": "label.set_color",
    "syntax": "label.set_color()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_color"
   },
   "set_point": {
    "fullName": "label.set_point",
    "syntax": "label.set_point()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_point"
   },
   "set_size": {
    "fullName": "label.set_size",
    "syntax": "label.set_size()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_size"
   },
   "set_style": {
    "fullName": "label.set_style",
    "syntax": "label.set_style()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_style"
   },
   "set_text": {
    "fullName": "label.set_text",
    "syntax": "label.set_text()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_text"
   },
   "set_text_font_family": {
    "fullName": "label.set_text_font_family",
    "syntax": "label.set_text_font_family()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_text_font_family"
   },
   "set_text_formatting": {
    "fullName": "label.set_text_formatting",
    "syntax": "label.set_text_formatting()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_text_formatting"
   },
   "set_textalign": {
    "fullName": "label.set_textalign",
    "syntax": "label.set_textalign()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_textalign"
   },
   "set_textcolor": {
    "fullName": "label.set_textcolor",
    "syntax": "label.set_textcolor()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_textcolor"
   },
   "set_tooltip": {
    "fullName": "label.set_tooltip",
    "syntax": "label.set_tooltip()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_tooltip"
   },
   "set_x": {
    "fullName": "label.set_x",
    "syntax": "label.set_x()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_x"
   },
   "set_xloc": {
    "fullName": "label.set_xloc",
    "syntax": "label.set_xloc()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_xloc"
   },
   "set_xy": {
    "fullName": "label.set_xy",
    "syntax": "label.set_xy()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_xy"
   },
   "set_y": {
    "fullName": "label.set_y",
    "syntax": "label.set_y()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_y"
   },
   "set_yloc": {
    "fullName": "label.set_yloc",
    "syntax": "label.set_yloc()",
    "returns": "unknown",
    "description": "Pine Script v6 function: label.set_yloc"
   }
  },
  "variables": {
   "all": {
    "fullName": "label.all",
    "type": "series<float>"
   }
  },
  "constants": {
   "style_arrowdown": {
    "fullName": "label.style_arrowdown",
    "type": "label_style"
   },
   "style_arrowup": {
    "fullName": "label.style_arrowup",
    "type": "label_style"
   },
   "style_circle": {
    "fullName": "label.style_circle",
    "type": "label_style"
   },
   "style_cross": {
    "fullName": "label.style_cross",
    "type": "label_style"
   },
   "style_diamond": {
    "fullName": "label.style_diamond",
    "type": "label_style"
   },
   "style_flag": {
    "fullName": "label.style_flag",
    "type": "label_style"
   },
   "style_label_center": {
    "fullName": "label.style_label_center",
    "type": "label_style"
   },
   "style_label_down": {
    "fullName": "label.style_label_down",
    "type": "label_style"
   },
   "style_label_left": {
    "fullName": "label.style_label_left",
    "type": "label_style"
   },
   "style_label_lower_left": {
    "fullName": "label.style_label_lower_left",
    "type": "label_style"
   },
   "style_label_lower_right": {
    "fullName": "label.style_label_lower_right",
    "type": "label_style"
   },
   "style_label_right": {
    "fullName": "label.style_label_right",
    "type": "label_style"
   },
   "style_label_up": {
    "fullName": "label.style_label_up",
    "type": "label_style"
   },
   "style_label_upper_left": {
    "fullName": "label.style_label_upper_left",
    "type": "label_style"
   },
   "style_label_upper_right": {
    "fullName": "label.style_label_upper_right",
    "type": "label_style"
   },
   "style_none": {
    "fullName": "label.style_none",
    "type": "label_style"
   },
   "style_square": {
    "fullName": "label.style_square",
    "type": "label_style"
   },
   "style_text_outline": {
    "fullName": "label.style_text_outline",
    "type": "label_style"
   },
   "style_triangledown": {
    "fullName": "label.style_triangledown",
    "type": "label_style"
   },
   "style_triangleup": {
    "fullName": "label.style_triangleup",
    "type": "label_style"
   },
   "style_xcross": {
    "fullName": "label.style_xcross",
    "type": "label_style"
   }
  }
 },
 "line": {
  "functions": {
   "copy": {
    "fullName": "line.copy",
    "syntax": "line.copy()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.copy"
   },
   "delete": {
    "fullName": "line.delete",
    "syntax": "line.delete()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.delete"
   },
   "get_price": {
    "fullName": "line.get_price",
    "syntax": "line.get_price()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.get_price"
   },
   "get_x1": {
    "fullName": "line.get_x1",
    "syntax": "line.get_x1()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.get_x1"
   },
   "get_x2": {
    "fullName": "line.get_x2",
    "syntax": "line.get_x2()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.get_x2"
   },
   "get_y1": {
    "fullName": "line.get_y1",
    "syntax": "line.get_y1()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.get_y1"
   },
   "get_y2": {
    "fullName": "line.get_y2",
    "syntax": "line.get_y2()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.get_y2"
   },
   "new": {
    "fullName": "line.new",
    "syntax": "line.new(first_point, second_point, xloc, extend, color, style, width, force_overlay) → series line",
    "returns": "series line",
    "description": "Creates new line object."
   },
   "set_color": {
    "fullName": "line.set_color",
    "syntax": "line.set_color()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.set_color"
   },
   "set_extend": {
    "fullName": "line.set_extend",
    "syntax": "line.set_extend()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.set_extend"
   },
   "set_first_point": {
    "fullName": "line.set_first_point",
    "syntax": "line.set_first_point()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.set_first_point"
   },
   "set_second_point": {
    "fullName": "line.set_second_point",
    "syntax": "line.set_second_point()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.set_second_point"
   },
   "set_style": {
    "fullName": "line.set_style",
    "syntax": "line.set_style()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.set_style"
   },
   "set_width": {
    "fullName": "line.set_width",
    "syntax": "line.set_width()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.set_width"
   },
   "set_x1": {
    "fullName": "line.set_x1",
    "syntax": "line.set_x1()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.set_x1"
   },
   "set_x2": {
    "fullName": "line.set_x2",
    "syntax": "line.set_x2()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.set_x2"
   },
   "set_xloc": {
    "fullName": "line.set_xloc",
    "syntax": "line.set_xloc()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.set_xloc"
   },
   "set_xy1": {
    "fullName": "line.set_xy1",
    "syntax": "line.set_xy1()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.set_xy1"
   },
   "set_xy2": {
    "fullName": "line.set_xy2",
    "syntax": "line.set_xy2()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.set_xy2"
   },
   "set_y1": {
    "fullName": "line.set_y1",
    "syntax": "line.set_y1()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.set_y1"
   },
   "set_y2": {
    "fullName": "line.set_y2",
    "syntax": "line.set_y2()",
    "returns": "unknown",
    "description": "Pine Script v6 function: line.set_y2"
   }
  },
  "variables": {
   "all": {
    "fullName": "line.all",
    "type": "series<float>"
   }
  },
  "constants": {
   "style_arrow_both": {
    "fullName": "line.style_arrow_both",
    "type": "line_style"
   },
   "style_arrow_left": {
    "fullName": "line.style_arrow_left",
    "type": "line_style"
   },
   "style_arrow_right": {
    "fullName": "line.style_arrow_right",
    "type": "line_style"
   },
   "style_dashed": {
    "fullName": "line.style_dashed",
    "type": "line_style"
   },
   "style_dotted": {
    "fullName": "line.style_dotted",
    "type": "line_style"
   },
   "style_solid": {
    "fullName": "line.style_solid",
    "type": "line_style"
   }
  }
 },
 "linefill": {
  "functions": {
   "delete": {
    "fullName": "linefill.delete",
    "syntax": "linefill.delete()",
    "returns": "unknown",
    "description": "Pine Script v6 function: linefill.delete"
   },
   "get_line1": {
    "fullName": "linefill.get_line1",
    "syntax": "linefill.get_line1()",
    "returns": "unknown",
    "description": "Pine Script v6 function: linefill.get_line1"
   },
   "get_line2": {
    "fullName": "linefill.get_line2",
    "syntax": "linefill.get_line2()",
    "returns": "unknown",
    "description": "Pine Script v6 function: linefill.get_line2"
   },
   "new": {
    "fullName": "linefill.new",
    "syntax": "linefill.new()",
    "returns": "unknown",
    "description": "Pine Script v6 function: linefill.new"
   },
   "set_color": {
    "fullName": "linefill.set_color",
    "syntax": "linefill.set_color()",
    "returns": "unknown",
    "description": "Pine Script v6 function: linefill.set_color"
   }
  },
  "variables": {
   "all": {
    "fullName": "linefill.all",
    "type": "series<float>"
   }
  },
  "constants": {}
 },
 "log": {
  "functions": {
   "error": {
    "fullName": "log.error",
    "syntax": "log.error()",
    "returns": "unknown",
    "description": "Pine Script v6 function: log.error"
   },
   "info": {
    "fullName": "log.info",
    "syntax": "log.info()",
    "returns": "unknown",
    "description": "Pine Script v6 function: log.info"
   },
   "warning": {
    "fullName": "log.warning",
    "syntax": "log.warning()",
    "returns": "unknown",
    "description": "Pine Script v6 function: log.warning"
   }
  },
  "variables": {},
  "constants": {}
 },
 "map": {
  "functions": {
   "clear": {
    "fullName": "map.clear",
    "syntax": "map.clear()",
    "returns": "unknown",
    "description": "Pine Script v6 function: map.clear"
   },
   "contains": {
    "fullName": "map.contains",
    "syntax": "map.contains()",
    "returns": "unknown",
    "description": "Pine Script v6 function: map.contains"
   },
   "copy": {
    "fullName": "map.copy",
    "syntax": "map.copy()",
    "returns": "unknown",
    "description": "Pine Script v6 function: map.copy"
   },
   "get": {
    "fullName": "map.get",
    "syntax": "map.get()",
    "returns": "unknown",
    "description": "Pine Script v6 function: map.get"
   },
   "keys": {
    "fullName": "map.keys",
    "syntax": "map.keys()",
    "returns": "unknown",
    "description": "Pine Script v6 function: map.keys"
   },
   "new": {
    "fullName": "map.new",
    "syntax": "map.new()",
    "returns": "unknown",
    "description": "Pine Script v6 function: map.new"
   },
   "put": {
    "fullName": "map.put",
    "syntax": "map.put()",
    "returns": "unknown",
    "description": "Pine Script v6 function: map.put"
   },
   "put_all": {
    "fullName": "map.put_all",
    "syntax": "map.put_all()",
    "returns": "unknown",
    "description": "Pine Script v6 function: map.put_all"
   },
   "remove": {
    "fullName": "map.remove",
    "syntax": "map.remove()",
    "returns": "unknown",
    "description": "Pine Script v6 function: map.remove"
   },
   "size": {
    "fullName": "map.size",
    "syntax": "map.size()",
    "returns": "unknown",
    "description": "Pine Script v6 function: map.size"
   },
   "values": {
    "fullName": "map.values",
    "syntax": "map.values()",
    "returns": "unknown",
    "description": "Pine Script v6 function: map.values"
   }
  },
  "variables": {},
  "constants": {}
 },
 "math": {
  "functions": {
   "abs": {
    "fullName": "math.abs",
    "syntax": "math.abs(number) → const int",
    "returns": "const int",
    "description": "Absolute value of number is number if number >= 0, or -number otherwise."
   },
   "acos": {
    "fullName": "math.acos",
    "syntax": "math.acos()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.acos"
   },
   "asin": {
    "fullName": "math.asin",
    "syntax": "math.asin()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.asin"
   },
   "atan": {
    "fullName": "math.atan",
    "syntax": "math.atan()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.atan"
   },
   "avg": {
    "fullName": "math.avg",
    "syntax": "math.avg()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.avg"
   },
   "ceil": {
    "fullName": "math.ceil",
    "syntax": "math.ceil()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.ceil"
   },
   "cos": {
    "fullName": "math.cos",
    "syntax": "math.cos()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.cos"
   },
   "exp": {
    "fullName": "math.exp",
    "syntax": "math.exp()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.exp"
   },
   "floor": {
    "fullName": "math.floor",
    "syntax": "math.floor(number) → const int",
    "returns": "const int",
    "description": "Rounds the specified number down to the largest whole number (\"int\" value) that is less than or equal to it."
   },
   "log": {
    "fullName": "math.log",
    "syntax": "math.log()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.log"
   },
   "log10": {
    "fullName": "math.log10",
    "syntax": "math.log10()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.log10"
   },
   "max": {
    "fullName": "math.max",
    "syntax": "math.max(number0, number1, ...) → const int",
    "returns": "const int",
    "description": "Returns the greatest of multiple values."
   },
   "min": {
    "fullName": "math.min",
    "syntax": "math.min(number0, number1, ...) → const int",
    "returns": "const int",
    "description": "Returns the smallest of multiple values."
   },
   "pow": {
    "fullName": "math.pow",
    "syntax": "math.pow()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.pow"
   },
   "random": {
    "fullName": "math.random",
    "syntax": "math.random()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.random"
   },
   "round": {
    "fullName": "math.round",
    "syntax": "math.round(number) → const int",
    "returns": "const int",
    "description": "Returns the value of number rounded to the nearest integer, with ties rounding up. If the precision parameter is used, returns a float value rounded to that amount of decimal places."
   },
   "round_to_mintick": {
    "fullName": "math.round_to_mintick",
    "syntax": "math.round_to_mintick()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.round_to_mintick"
   },
   "sign": {
    "fullName": "math.sign",
    "syntax": "math.sign()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.sign"
   },
   "sin": {
    "fullName": "math.sin",
    "syntax": "math.sin()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.sin"
   },
   "sqrt": {
    "fullName": "math.sqrt",
    "syntax": "math.sqrt()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.sqrt"
   },
   "sum": {
    "fullName": "math.sum",
    "syntax": "math.sum()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.sum"
   },
   "tan": {
    "fullName": "math.tan",
    "syntax": "math.tan()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.tan"
   },
   "todegrees": {
    "fullName": "math.todegrees",
    "syntax": "math.todegrees()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.todegrees"
   },
   "toradians": {
    "fullName": "math.toradians",
    "syntax": "math.toradians()",
    "returns": "unknown",
    "description": "Pine Script v6 function: math.toradians"
   }
  },
  "variables": {},
  "constants": {
   "e": {
    "fullName": "math.e",
    "type": "const"
   },
   "phi": {
    "fullName": "math.phi",
    "type": "const"
   },
   "pi": {
    "fullName": "math.pi",
    "type": "const"
   },
   "rphi": {
    "fullName": "math.rphi",
    "type": "const"
   }
  }
 },
 "matrix": {
  "functions": {
   "add_col": {
    "fullName": "matrix.add_col",
    "syntax": "matrix.add_col()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.add_col"
   },
   "add_row": {
    "fullName": "matrix.add_row",
    "syntax": "matrix.add_row()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.add_row"
   },
   "avg": {
    "fullName": "matrix.avg",
    "syntax": "matrix.avg()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.avg"
   },
   "col": {
    "fullName": "matrix.col",
    "syntax": "matrix.col()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.col"
   },
   "columns": {
    "fullName": "matrix.columns",
    "syntax": "matrix.columns()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.columns"
   },
   "concat": {
    "fullName": "matrix.concat",
    "syntax": "matrix.concat()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.concat"
   },
   "copy": {
    "fullName": "matrix.copy",
    "syntax": "matrix.copy()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.copy"
   },
   "det": {
    "fullName": "matrix.det",
    "syntax": "matrix.det()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.det"
   },
   "diff": {
    "fullName": "matrix.diff",
    "syntax": "matrix.diff()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.diff"
   },
   "eigenvalues": {
    "fullName": "matrix.eigenvalues",
    "syntax": "matrix.eigenvalues()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.eigenvalues"
   },
   "eigenvectors": {
    "fullName": "matrix.eigenvectors",
    "syntax": "matrix.eigenvectors()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.eigenvectors"
   },
   "elements_count": {
    "fullName": "matrix.elements_count",
    "syntax": "matrix.elements_count()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.elements_count"
   },
   "fill": {
    "fullName": "matrix.fill",
    "syntax": "matrix.fill()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.fill"
   },
   "get": {
    "fullName": "matrix.get",
    "syntax": "matrix.get()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.get"
   },
   "inv": {
    "fullName": "matrix.inv",
    "syntax": "matrix.inv()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.inv"
   },
   "is_antidiagonal": {
    "fullName": "matrix.is_antidiagonal",
    "syntax": "matrix.is_antidiagonal()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.is_antidiagonal"
   },
   "is_antisymmetric": {
    "fullName": "matrix.is_antisymmetric",
    "syntax": "matrix.is_antisymmetric()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.is_antisymmetric"
   },
   "is_binary": {
    "fullName": "matrix.is_binary",
    "syntax": "matrix.is_binary()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.is_binary"
   },
   "is_diagonal": {
    "fullName": "matrix.is_diagonal",
    "syntax": "matrix.is_diagonal()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.is_diagonal"
   },
   "is_identity": {
    "fullName": "matrix.is_identity",
    "syntax": "matrix.is_identity()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.is_identity"
   },
   "is_square": {
    "fullName": "matrix.is_square",
    "syntax": "matrix.is_square()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.is_square"
   },
   "is_stochastic": {
    "fullName": "matrix.is_stochastic",
    "syntax": "matrix.is_stochastic()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.is_stochastic"
   },
   "is_symmetric": {
    "fullName": "matrix.is_symmetric",
    "syntax": "matrix.is_symmetric()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.is_symmetric"
   },
   "is_triangular": {
    "fullName": "matrix.is_triangular",
    "syntax": "matrix.is_triangular()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.is_triangular"
   },
   "is_zero": {
    "fullName": "matrix.is_zero",
    "syntax": "matrix.is_zero()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.is_zero"
   },
   "kron": {
    "fullName": "matrix.kron",
    "syntax": "matrix.kron()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.kron"
   },
   "max": {
    "fullName": "matrix.max",
    "syntax": "matrix.max()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.max"
   },
   "median": {
    "fullName": "matrix.median",
    "syntax": "matrix.median()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.median"
   },
   "min": {
    "fullName": "matrix.min",
    "syntax": "matrix.min()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.min"
   },
   "mode": {
    "fullName": "matrix.mode",
    "syntax": "matrix.mode()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.mode"
   },
   "mult": {
    "fullName": "matrix.mult",
    "syntax": "matrix.mult()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.mult"
   },
   "new": {
    "fullName": "matrix.new",
    "syntax": "matrix.new()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.new"
   },
   "pinv": {
    "fullName": "matrix.pinv",
    "syntax": "matrix.pinv()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.pinv"
   },
   "pow": {
    "fullName": "matrix.pow",
    "syntax": "matrix.pow()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.pow"
   },
   "rank": {
    "fullName": "matrix.rank",
    "syntax": "matrix.rank()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.rank"
   },
   "remove_col": {
    "fullName": "matrix.remove_col",
    "syntax": "matrix.remove_col()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.remove_col"
   },
   "remove_row": {
    "fullName": "matrix.remove_row",
    "syntax": "matrix.remove_row()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.remove_row"
   },
   "reshape": {
    "fullName": "matrix.reshape",
    "syntax": "matrix.reshape()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.reshape"
   },
   "reverse": {
    "fullName": "matrix.reverse",
    "syntax": "matrix.reverse()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.reverse"
   },
   "row": {
    "fullName": "matrix.row",
    "syntax": "matrix.row()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.row"
   },
   "rows": {
    "fullName": "matrix.rows",
    "syntax": "matrix.rows()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.rows"
   },
   "set": {
    "fullName": "matrix.set",
    "syntax": "matrix.set()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.set"
   },
   "sort": {
    "fullName": "matrix.sort",
    "syntax": "matrix.sort()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.sort"
   },
   "submatrix": {
    "fullName": "matrix.submatrix",
    "syntax": "matrix.submatrix()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.submatrix"
   },
   "swap_columns": {
    "fullName": "matrix.swap_columns",
    "syntax": "matrix.swap_columns()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.swap_columns"
   },
   "swap_rows": {
    "fullName": "matrix.swap_rows",
    "syntax": "matrix.swap_rows()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.swap_rows"
   },
   "trace": {
    "fullName": "matrix.trace",
    "syntax": "matrix.trace()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.trace"
   },
   "transpose": {
    "fullName": "matrix.transpose",
    "syntax": "matrix.transpose()",
    "returns": "unknown",
    "description": "Pine Script v6 function: matrix.transpose"
   }
  },
  "variables": {},
  "constants": {}
 },
 "polyline": {
  "functions": {
   "delete": {
    "fullName": "polyline.delete",
    "syntax": "polyline.delete()",
    "returns": "unknown",
    "description": "Pine Script v6 function: polyline.delete"
   },
   "new": {
    "fullName": "polyline.new",
    "syntax": "polyline.new()",
    "returns": "unknown",
    "description": "Pine Script v6 function: polyline.new"
   }
  },
  "variables": {
   "all": {
    "fullName": "polyline.all",
    "type": "series<float>"
   }
  },
  "constants": {}
 },
 "request": {
  "functions": {
   "currency_rate": {
    "fullName": "request.currency_rate",
    "syntax": "request.currency_rate()",
    "returns": "unknown",
    "description": "Pine Script v6 function: request.currency_rate"
   },
   "dividends": {
    "fullName": "request.dividends",
    "syntax": "request.dividends()",
    "returns": "unknown",
    "description": "Pine Script v6 function: request.dividends"
   },
   "earnings": {
    "fullName": "request.earnings",
    "syntax": "request.earnings()",
    "returns": "unknown",
    "description": "Pine Script v6 function: request.earnings"
   },
   "economic": {
    "fullName": "request.economic",
    "syntax": "request.economic()",
    "returns": "unknown",
    "description": "Pine Script v6 function: request.economic"
   },
   "financial": {
    "fullName": "request.financial",
    "syntax": "request.financial()",
    "returns": "unknown",
    "description": "Pine Script v6 function: request.financial"
   },
   "quandl": {
    "fullName": "request.quandl",
    "syntax": "request.quandl()",
    "returns": "unknown",
    "description": "Pine Script v6 function: request.quandl"
   },
   "security": {
    "fullName": "request.security",
    "syntax": "request.security(symbol, timeframe, expression, gaps, lookahead, ignore_invalid_symbol, currency, calc_bars_count) → series <type>",
    "returns": "series <type>",
    "description": "Requests the result of an expression from a specified context (symbol and timeframe)."
   },
   "security_lower_tf": {
    "fullName": "request.security_lower_tf",
    "syntax": "request.security_lower_tf()",
    "returns": "unknown",
    "description": "Pine Script v6 function: request.security_lower_tf"
   },
   "seed": {
    "fullName": "request.seed",
    "syntax": "request.seed()",
    "returns": "unknown",
    "description": "Pine Script v6 function: request.seed"
   },
   "splits": {
    "fullName": "request.splits",
    "syntax": "request.splits()",
    "returns": "unknown",
    "description": "Pine Script v6 function: request.splits"
   }
  },
  "variables": {
   "security": {
    "fullName": "request.security",
    "type": "series<float>"
   },
   "security_lower_tf": {
    "fullName": "request.security_lower_tf",
    "type": "series<float>"
   }
  },
  "constants": {}
 },
 "runtime": {
  "functions": {
   "error": {
    "fullName": "runtime.error",
    "syntax": "runtime.error()",
    "returns": "unknown",
    "description": "Pine Script v6 function: runtime.error"
   }
  },
  "variables": {},
  "constants": {}
 },
 "str": {
  "functions": {
   "contains": {
    "fullName": "str.contains",
    "syntax": "str.contains()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.contains"
   },
   "endswith": {
    "fullName": "str.endswith",
    "syntax": "str.endswith()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.endswith"
   },
   "format": {
    "fullName": "str.format",
    "syntax": "str.format(formatString, arg0, arg1, ...) → simple string",
    "returns": "simple string",
    "description": "Creates a formatted string using a specified formatting string (formatString) and one or more additional arguments (arg0, arg1, etc.). The formatting string defines the structure of the returned string, where all placeholders in curly brackets ({}) refer to the additional arguments. Each placeholder requires a number representing an argument's position, starting from 0. For instance, the placeholder {0} refers to the first argument after formatString (arg0), {1} refers to the second (arg1), and so on. The function replaces each placeholder with a string representation of the corresponding argument."
   },
   "format_time": {
    "fullName": "str.format_time",
    "syntax": "str.format_time()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.format_time"
   },
   "length": {
    "fullName": "str.length",
    "syntax": "str.length()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.length"
   },
   "lower": {
    "fullName": "str.lower",
    "syntax": "str.lower()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.lower"
   },
   "match": {
    "fullName": "str.match",
    "syntax": "str.match()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.match"
   },
   "pos": {
    "fullName": "str.pos",
    "syntax": "str.pos()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.pos"
   },
   "repeat": {
    "fullName": "str.repeat",
    "syntax": "str.repeat()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.repeat"
   },
   "replace": {
    "fullName": "str.replace",
    "syntax": "str.replace()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.replace"
   },
   "replace_all": {
    "fullName": "str.replace_all",
    "syntax": "str.replace_all()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.replace_all"
   },
   "split": {
    "fullName": "str.split",
    "syntax": "str.split()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.split"
   },
   "startswith": {
    "fullName": "str.startswith",
    "syntax": "str.startswith()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.startswith"
   },
   "substring": {
    "fullName": "str.substring",
    "syntax": "str.substring()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.substring"
   },
   "tonumber": {
    "fullName": "str.tonumber",
    "syntax": "str.tonumber()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.tonumber"
   },
   "tostring": {
    "fullName": "str.tostring",
    "syntax": "str.tostring(value) → const string",
    "returns": "const string",
    "description": ""
   },
   "trim": {
    "fullName": "str.trim",
    "syntax": "str.trim()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.trim"
   },
   "upper": {
    "fullName": "str.upper",
    "syntax": "str.upper()",
    "returns": "unknown",
    "description": "Pine Script v6 function: str.upper"
   }
  },
  "variables": {},
  "constants": {}
 },
 "strategy": {
  "functions": {
   "cancel": {
    "fullName": "strategy.cancel",
    "syntax": "strategy.cancel()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.cancel"
   },
   "cancel_all": {
    "fullName": "strategy.cancel_all",
    "syntax": "strategy.cancel_all()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.cancel_all"
   },
   "close": {
    "fullName": "strategy.close",
    "syntax": "strategy.close(id, comment, qty, qty_percent, alert_message, immediately, disable_alert) → void",
    "returns": "void",
    "description": "Creates an order to exit from the part of a position opened by entry orders with a specific identifier. If multiple entries in the position share the same ID, the orders from this command apply to all those entries, starting from the first open trade, when its calls use that ID as the id argument."
   },
   "close_all": {
    "fullName": "strategy.close_all",
    "syntax": "strategy.close_all()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.close_all"
   },
   "convert_to_account": {
    "fullName": "strategy.convert_to_account",
    "syntax": "strategy.convert_to_account()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.convert_to_account"
   },
   "convert_to_symbol": {
    "fullName": "strategy.convert_to_symbol",
    "syntax": "strategy.convert_to_symbol()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.convert_to_symbol"
   },
   "default_entry_qty": {
    "fullName": "strategy.default_entry_qty",
    "syntax": "strategy.default_entry_qty()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.default_entry_qty"
   },
   "entry": {
    "fullName": "strategy.entry",
    "syntax": "strategy.entry(id, direction, qty, limit, stop, oca_name, oca_type, comment, alert_message, disable_alert) → void",
    "returns": "void",
    "description": "Creates a new order to open or add to a position. If an unfilled order with the same id exists, a call to this command modifies that order."
   },
   "exit": {
    "fullName": "strategy.exit",
    "syntax": "strategy.exit(id, from_entry, qty, qty_percent, profit, limit, loss, stop, trail_price, trail_points, trail_offset, oca_name, comment, comment_profit, comment_loss, comment_trailing, alert_message, alert_profit, alert_loss, alert_trailing, disable_alert) → void",
    "returns": "void",
    "description": "Creates price-based orders to exit from an open position. If unfilled exit orders with the same id exist, calls to this command modify those orders. This command can generate more than one type of exit order, depending on the specified parameters. However, it does not create market orders. To exit from a position with a market order, use strategy.close() or strategy.close_all()."
   },
   "order": {
    "fullName": "strategy.order",
    "syntax": "strategy.order()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.order"
   },
   "risk.allow_entry_in": {
    "fullName": "strategy.risk.allow_entry_in",
    "syntax": "strategy.risk.allow_entry_in()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.risk.allow_entry_in"
   },
   "risk.max_cons_loss_days": {
    "fullName": "strategy.risk.max_cons_loss_days",
    "syntax": "strategy.risk.max_cons_loss_days()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.risk.max_cons_loss_days"
   },
   "risk.max_drawdown": {
    "fullName": "strategy.risk.max_drawdown",
    "syntax": "strategy.risk.max_drawdown()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.risk.max_drawdown"
   },
   "risk.max_intraday_filled_orders": {
    "fullName": "strategy.risk.max_intraday_filled_orders",
    "syntax": "strategy.risk.max_intraday_filled_orders()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.risk.max_intraday_filled_orders"
   },
   "risk.max_intraday_loss": {
    "fullName": "strategy.risk.max_intraday_loss",
    "syntax": "strategy.risk.max_intraday_loss()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.risk.max_intraday_loss"
   },
   "risk.max_position_size": {
    "fullName": "strategy.risk.max_position_size",
    "syntax": "strategy.risk.max_position_size()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.risk.max_position_size"
   },
   "closedtrades.commission": {
    "fullName": "strategy.closedtrades.commission",
    "syntax": "strategy.closedtrades.commission()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.commission"
   },
   "closedtrades.entry_bar_index": {
    "fullName": "strategy.closedtrades.entry_bar_index",
    "syntax": "strategy.closedtrades.entry_bar_index()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.entry_bar_index"
   },
   "closedtrades.entry_comment": {
    "fullName": "strategy.closedtrades.entry_comment",
    "syntax": "strategy.closedtrades.entry_comment()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.entry_comment"
   },
   "closedtrades.entry_id": {
    "fullName": "strategy.closedtrades.entry_id",
    "syntax": "strategy.closedtrades.entry_id()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.entry_id"
   },
   "closedtrades.entry_price": {
    "fullName": "strategy.closedtrades.entry_price",
    "syntax": "strategy.closedtrades.entry_price()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.entry_price"
   },
   "closedtrades.entry_time": {
    "fullName": "strategy.closedtrades.entry_time",
    "syntax": "strategy.closedtrades.entry_time()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.entry_time"
   },
   "closedtrades.exit_bar_index": {
    "fullName": "strategy.closedtrades.exit_bar_index",
    "syntax": "strategy.closedtrades.exit_bar_index()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.exit_bar_index"
   },
   "closedtrades.exit_comment": {
    "fullName": "strategy.closedtrades.exit_comment",
    "syntax": "strategy.closedtrades.exit_comment()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.exit_comment"
   },
   "closedtrades.exit_id": {
    "fullName": "strategy.closedtrades.exit_id",
    "syntax": "strategy.closedtrades.exit_id()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.exit_id"
   },
   "closedtrades.exit_price": {
    "fullName": "strategy.closedtrades.exit_price",
    "syntax": "strategy.closedtrades.exit_price()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.exit_price"
   },
   "closedtrades.exit_time": {
    "fullName": "strategy.closedtrades.exit_time",
    "syntax": "strategy.closedtrades.exit_time()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.exit_time"
   },
   "closedtrades.max_drawdown": {
    "fullName": "strategy.closedtrades.max_drawdown",
    "syntax": "strategy.closedtrades.max_drawdown()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.max_drawdown"
   },
   "closedtrades.max_drawdown_percent": {
    "fullName": "strategy.closedtrades.max_drawdown_percent",
    "syntax": "strategy.closedtrades.max_drawdown_percent()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.max_drawdown_percent"
   },
   "closedtrades.max_runup": {
    "fullName": "strategy.closedtrades.max_runup",
    "syntax": "strategy.closedtrades.max_runup()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.max_runup"
   },
   "closedtrades.max_runup_percent": {
    "fullName": "strategy.closedtrades.max_runup_percent",
    "syntax": "strategy.closedtrades.max_runup_percent()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.max_runup_percent"
   },
   "closedtrades.profit": {
    "fullName": "strategy.closedtrades.profit",
    "syntax": "strategy.closedtrades.profit()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.profit"
   },
   "closedtrades.profit_percent": {
    "fullName": "strategy.closedtrades.profit_percent",
    "syntax": "strategy.closedtrades.profit_percent()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.profit_percent"
   },
   "closedtrades.size": {
    "fullName": "strategy.closedtrades.size",
    "syntax": "strategy.closedtrades.size()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.closedtrades.size"
   },
   "opentrades.commission": {
    "fullName": "strategy.opentrades.commission",
    "syntax": "strategy.opentrades.commission()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.opentrades.commission"
   },
   "opentrades.entry_bar_index": {
    "fullName": "strategy.opentrades.entry_bar_index",
    "syntax": "strategy.opentrades.entry_bar_index()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.opentrades.entry_bar_index"
   },
   "opentrades.entry_comment": {
    "fullName": "strategy.opentrades.entry_comment",
    "syntax": "strategy.opentrades.entry_comment()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.opentrades.entry_comment"
   },
   "opentrades.entry_id": {
    "fullName": "strategy.opentrades.entry_id",
    "syntax": "strategy.opentrades.entry_id()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.opentrades.entry_id"
   },
   "opentrades.entry_price": {
    "fullName": "strategy.opentrades.entry_price",
    "syntax": "strategy.opentrades.entry_price()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.opentrades.entry_price"
   },
   "opentrades.entry_time": {
    "fullName": "strategy.opentrades.entry_time",
    "syntax": "strategy.opentrades.entry_time()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.opentrades.entry_time"
   },
   "opentrades.max_drawdown": {
    "fullName": "strategy.opentrades.max_drawdown",
    "syntax": "strategy.opentrades.max_drawdown()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.opentrades.max_drawdown"
   },
   "opentrades.max_drawdown_percent": {
    "fullName": "strategy.opentrades.max_drawdown_percent",
    "syntax": "strategy.opentrades.max_drawdown_percent()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.opentrades.max_drawdown_percent"
   },
   "opentrades.max_runup": {
    "fullName": "strategy.opentrades.max_runup",
    "syntax": "strategy.opentrades.max_runup()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.opentrades.max_runup"
   },
   "opentrades.max_runup_percent": {
    "fullName": "strategy.opentrades.max_runup_percent",
    "syntax": "strategy.opentrades.max_runup_percent()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.opentrades.max_runup_percent"
   },
   "opentrades.profit": {
    "fullName": "strategy.opentrades.profit",
    "syntax": "strategy.opentrades.profit()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.opentrades.profit"
   },
   "opentrades.profit_percent": {
    "fullName": "strategy.opentrades.profit_percent",
    "syntax": "strategy.opentrades.profit_percent()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.opentrades.profit_percent"
   },
   "opentrades.size": {
    "fullName": "strategy.opentrades.size",
    "syntax": "strategy.opentrades.size()",
    "returns": "unknown",
    "description": "Pine Script v6 function: strategy.opentrades.size"
   }
  },
  "variables": {
   "account_currency": {
    "fullName": "strategy.account_currency",
    "type": "series<int>"
   },
   "avg_losing_trade": {
    "fullName": "strategy.avg_losing_trade",
    "type": "series<int>"
   },
   "avg_losing_trade_percent": {
    "fullName": "strategy.avg_losing_trade_percent",
    "type": "series<int>"
   },
   "avg_trade": {
    "fullName": "strategy.avg_trade",
    "type": "series<int>"
   },
   "avg_trade_percent": {
    "fullName": "strategy.avg_trade_percent",
    "type": "series<int>"
   },
   "avg_winning_trade": {
    "fullName": "strategy.avg_winning_trade",
    "type": "series<int>"
   },
   "avg_winning_trade_percent": {
    "fullName": "strategy.avg_winning_trade_percent",
    "type": "series<int>"
   },
   "closedtrades": {
    "fullName": "strategy.closedtrades",
    "type": "series<int>"
   },
   "closedtrades.first_index": {
    "fullName": "strategy.closedtrades.first_index",
    "type": "series<int>"
   },
   "equity": {
    "fullName": "strategy.equity",
    "type": "series<float>"
   },
   "eventrades": {
    "fullName": "strategy.eventrades",
    "type": "series<int>"
   },
   "grossloss": {
    "fullName": "strategy.grossloss",
    "type": "series<int>"
   },
   "grossloss_percent": {
    "fullName": "strategy.grossloss_percent",
    "type": "series<int>"
   },
   "grossprofit": {
    "fullName": "strategy.grossprofit",
    "type": "series<int>"
   },
   "grossprofit_percent": {
    "fullName": "strategy.grossprofit_percent",
    "type": "series<int>"
   },
   "initial_capital": {
    "fullName": "strategy.initial_capital",
    "type": "series<int>"
   },
   "losstrades": {
    "fullName": "strategy.losstrades",
    "type": "series<int>"
   },
   "margin_liquidation_price": {
    "fullName": "strategy.margin_liquidation_price",
    "type": "series<int>"
   },
   "max_contracts_held_all": {
    "fullName": "strategy.max_contracts_held_all",
    "type": "series<int>"
   },
   "max_contracts_held_long": {
    "fullName": "strategy.max_contracts_held_long",
    "type": "series<int>"
   },
   "max_contracts_held_short": {
    "fullName": "strategy.max_contracts_held_short",
    "type": "series<int>"
   },
   "max_drawdown": {
    "fullName": "strategy.max_drawdown",
    "type": "series<int>"
   },
   "max_drawdown_percent": {
    "fullName": "strategy.max_drawdown_percent",
    "type": "series<int>"
   },
   "max_runup": {
    "fullName": "strategy.max_runup",
    "type": "series<int>"
   },
   "max_runup_percent": {
    "fullName": "strategy.max_runup_percent",
    "type": "series<int>"
   },
   "netprofit": {
    "fullName": "strategy.netprofit",
    "type": "series<int>"
   },
   "netprofit_percent": {
    "fullName": "strategy.netprofit_percent",
    "type": "series<int>"
   },
   "openprofit": {
    "fullName": "strategy.openprofit",
    "type": "series<float>"
   },
   "openprofit_percent": {
    "fullName": "strategy.openprofit_percent",
    "type": "series<float>"
   },
   "opentrades": {
    "fullName": "strategy.opentrades",
    "type": "series<int>"
   },
   "opentrades.capital_held": {
    "fullName": "strategy.opentrades.capital_held",
    "type": "series<int>"
   },
   "position_avg_price": {
    "fullName": "strategy.position_avg_price",
    "type": "series<int>"
   },
   "position_entry_name": {
    "fullName": "strategy.position_entry_name",
    "type": "series<int>"
   },
   "position_size": {
    "fullName": "strategy.position_size",
    "type": "series<float>"
   },
   "wintrades": {
    "fullName": "strategy.wintrades",
    "type": "series<int>"
   }
  },
  "constants": {
   "cash": {
    "fullName": "strategy.cash",
    "type": "string"
   },
   "commission": {
    "fullName": "strategy.commission",
    "type": "string"
   },
   "direction": {
    "fullName": "strategy.direction",
    "type": "string"
   },
   "fixed": {
    "fullName": "strategy.fixed",
    "type": "string"
   },
   "long": {
    "fullName": "strategy.long",
    "type": "string"
   },
   "oca": {
    "fullName": "strategy.oca",
    "type": "string"
   },
   "percent_of_equity": {
    "fullName": "strategy.percent_of_equity",
    "type": "string"
   },
   "short": {
    "fullName": "strategy.short",
    "type": "string"
   }
  }
 },
 "syminfo": {
  "functions": {
   "prefix": {
    "fullName": "syminfo.prefix",
    "syntax": "syminfo.prefix()",
    "returns": "unknown",
    "description": "Pine Script v6 function: syminfo.prefix"
   },
   "ticker": {
    "fullName": "syminfo.ticker",
    "syntax": "syminfo.ticker()",
    "returns": "unknown",
    "description": "Pine Script v6 function: syminfo.ticker"
   }
  },
  "variables": {
   "basecurrency": {
    "fullName": "syminfo.basecurrency",
    "type": "simple<string>"
   },
   "country": {
    "fullName": "syminfo.country",
    "type": "simple<string>"
   },
   "currency": {
    "fullName": "syminfo.currency",
    "type": "simple<string>"
   },
   "current_contract": {
    "fullName": "syminfo.current_contract",
    "type": "simple<string>"
   },
   "description": {
    "fullName": "syminfo.description",
    "type": "simple<string>"
   },
   "employees": {
    "fullName": "syminfo.employees",
    "type": "simple<string>"
   },
   "expiration_date": {
    "fullName": "syminfo.expiration_date",
    "type": "simple<string>"
   },
   "industry": {
    "fullName": "syminfo.industry",
    "type": "simple<string>"
   },
   "isin": {
    "fullName": "syminfo.isin",
    "type": "simple<string>"
   },
   "main_tickerid": {
    "fullName": "syminfo.main_tickerid",
    "type": "simple<string>"
   },
   "mincontract": {
    "fullName": "syminfo.mincontract",
    "type": "simple<string>"
   },
   "minmove": {
    "fullName": "syminfo.minmove",
    "type": "simple<string>"
   },
   "mintick": {
    "fullName": "syminfo.mintick",
    "type": "simple<float>"
   },
   "pointvalue": {
    "fullName": "syminfo.pointvalue",
    "type": "simple<float>"
   },
   "prefix": {
    "fullName": "syminfo.prefix",
    "type": "simple<string>"
   },
   "pricescale": {
    "fullName": "syminfo.pricescale",
    "type": "simple<string>"
   },
   "recommendations_buy": {
    "fullName": "syminfo.recommendations_buy",
    "type": "simple<string>"
   },
   "recommendations_buy_strong": {
    "fullName": "syminfo.recommendations_buy_strong",
    "type": "simple<string>"
   },
   "recommendations_date": {
    "fullName": "syminfo.recommendations_date",
    "type": "simple<string>"
   },
   "recommendations_hold": {
    "fullName": "syminfo.recommendations_hold",
    "type": "simple<string>"
   },
   "recommendations_sell": {
    "fullName": "syminfo.recommendations_sell",
    "type": "simple<string>"
   },
   "recommendations_sell_strong": {
    "fullName": "syminfo.recommendations_sell_strong",
    "type": "simple<string>"
   },
   "recommendations_total": {
    "fullName": "syminfo.recommendations_total",
    "type": "simple<string>"
   },
   "root": {
    "fullName": "syminfo.root",
    "type": "simple<string>"
   },
   "sector": {
    "fullName": "syminfo.sector",
    "type": "simple<string>"
   },
   "session": {
    "fullName": "syminfo.session",
    "type": "simple<string>"
   },
   "shareholders": {
    "fullName": "syminfo.shareholders",
    "type": "simple<string>"
   },
   "shares_outstanding_float": {
    "fullName": "syminfo.shares_outstanding_float",
    "type": "simple<string>"
   },
   "shares_outstanding_total": {
    "fullName": "syminfo.shares_outstanding_total",
    "type": "simple<string>"
   },
   "target_price_average": {
    "fullName": "syminfo.target_price_average",
    "type": "simple<string>"
   },
   "target_price_date": {
    "fullName": "syminfo.target_price_date",
    "type": "simple<string>"
   },
   "target_price_estimates": {
    "fullName": "syminfo.target_price_estimates",
    "type": "simple<string>"
   },
   "target_price_high": {
    "fullName": "syminfo.target_price_high",
    "type": "simple<string>"
   },
   "target_price_low": {
    "fullName": "syminfo.target_price_low",
    "type": "simple<string>"
   },
   "target_price_median": {
    "fullName": "syminfo.target_price_median",
    "type": "simple<string>"
   },
   "ticker": {
    "fullName": "syminfo.ticker",
    "type": "simple<string>"
   },
   "tickerid": {
    "fullName": "syminfo.tickerid",
    "type": "simple<string>"
   },
   "timezone": {
    "fullName": "syminfo.timezone",
    "type": "simple<string>"
   },
   "type": {
    "fullName": "syminfo.type",
    "type": "simple<string>"
   },
   "volumetype": {
    "fullName": "syminfo.volumetype",
    "type": "simple<string>"
   }
  },
  "constants": {}
 },
 "ta": {
  "functions": {
   "alma": {
    "fullName": "ta.alma",
    "syntax": "ta.alma()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.alma"
   },
   "atr": {
    "fullName": "ta.atr",
    "syntax": "ta.atr(length) → series float",
    "returns": "series float",
    "description": "Function atr (average true range) returns the RMA of true range. True range is max(high - low, abs(high - close[1]), abs(low - close[1]))."
   },
   "barssince": {
    "fullName": "ta.barssince",
    "syntax": "ta.barssince()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.barssince"
   },
   "bb": {
    "fullName": "ta.bb",
    "syntax": "ta.bb()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.bb"
   },
   "bbw": {
    "fullName": "ta.bbw",
    "syntax": "ta.bbw()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.bbw"
   },
   "cci": {
    "fullName": "ta.cci",
    "syntax": "ta.cci()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.cci"
   },
   "change": {
    "fullName": "ta.change",
    "syntax": "ta.change()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.change"
   },
   "cmo": {
    "fullName": "ta.cmo",
    "syntax": "ta.cmo()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.cmo"
   },
   "cog": {
    "fullName": "ta.cog",
    "syntax": "ta.cog()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.cog"
   },
   "correlation": {
    "fullName": "ta.correlation",
    "syntax": "ta.correlation()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.correlation"
   },
   "cross": {
    "fullName": "ta.cross",
    "syntax": "ta.cross()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.cross"
   },
   "crossover": {
    "fullName": "ta.crossover",
    "syntax": "ta.crossover(source1, source2) → series bool",
    "returns": "series bool",
    "description": "The source1-series is defined as having crossed over source2-series if, on the current bar, the value of source1 is greater than the value of source2, and on the previous bar, the value of source1 was less than or equal to the value of source2."
   },
   "crossunder": {
    "fullName": "ta.crossunder",
    "syntax": "ta.crossunder(source1, source2) → series bool",
    "returns": "series bool",
    "description": "The source1-series is defined as having crossed under source2-series if, on the current bar, the value of source1 is less than the value of source2, and on the previous bar, the value of source1 was greater than or equal to the value of source2."
   },
   "cum": {
    "fullName": "ta.cum",
    "syntax": "ta.cum()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.cum"
   },
   "dev": {
    "fullName": "ta.dev",
    "syntax": "ta.dev()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.dev"
   },
   "dmi": {
    "fullName": "ta.dmi",
    "syntax": "ta.dmi()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.dmi"
   },
   "ema": {
    "fullName": "ta.ema",
    "syntax": "ta.ema(source, length) → series float",
    "returns": "series float",
    "description": "The ema function returns the exponentially weighted moving average. In ema weighting factors decrease exponentially. It calculates by using a formula: EMA = alpha * source + (1 - alpha) * EMA[1], where alpha = 2 / (length + 1)."
   },
   "falling": {
    "fullName": "ta.falling",
    "syntax": "ta.falling()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.falling"
   },
   "highest": {
    "fullName": "ta.highest",
    "syntax": "ta.highest()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.highest"
   },
   "highestbars": {
    "fullName": "ta.highestbars",
    "syntax": "ta.highestbars()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.highestbars"
   },
   "hma": {
    "fullName": "ta.hma",
    "syntax": "ta.hma()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.hma"
   },
   "kc": {
    "fullName": "ta.kc",
    "syntax": "ta.kc()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.kc"
   },
   "kcw": {
    "fullName": "ta.kcw",
    "syntax": "ta.kcw()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.kcw"
   },
   "linreg": {
    "fullName": "ta.linreg",
    "syntax": "ta.linreg()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.linreg"
   },
   "lowest": {
    "fullName": "ta.lowest",
    "syntax": "ta.lowest()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.lowest"
   },
   "lowestbars": {
    "fullName": "ta.lowestbars",
    "syntax": "ta.lowestbars()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.lowestbars"
   },
   "macd": {
    "fullName": "ta.macd",
    "syntax": "ta.macd()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.macd"
   },
   "max": {
    "fullName": "ta.max",
    "syntax": "ta.max()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.max"
   },
   "median": {
    "fullName": "ta.median",
    "syntax": "ta.median()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.median"
   },
   "mfi": {
    "fullName": "ta.mfi",
    "syntax": "ta.mfi()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.mfi"
   },
   "min": {
    "fullName": "ta.min",
    "syntax": "ta.min()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.min"
   },
   "mode": {
    "fullName": "ta.mode",
    "syntax": "ta.mode()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.mode"
   },
   "mom": {
    "fullName": "ta.mom",
    "syntax": "ta.mom()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.mom"
   },
   "percentile_linear_interpolation": {
    "fullName": "ta.percentile_linear_interpolation",
    "syntax": "ta.percentile_linear_interpolation()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.percentile_linear_interpolation"
   },
   "percentile_nearest_rank": {
    "fullName": "ta.percentile_nearest_rank",
    "syntax": "ta.percentile_nearest_rank()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.percentile_nearest_rank"
   },
   "percentrank": {
    "fullName": "ta.percentrank",
    "syntax": "ta.percentrank()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.percentrank"
   },
   "pivot_point_levels": {
    "fullName": "ta.pivot_point_levels",
    "syntax": "ta.pivot_point_levels()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.pivot_point_levels"
   },
   "pivothigh": {
    "fullName": "ta.pivothigh",
    "syntax": "ta.pivothigh()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.pivothigh"
   },
   "pivotlow": {
    "fullName": "ta.pivotlow",
    "syntax": "ta.pivotlow()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.pivotlow"
   },
   "range": {
    "fullName": "ta.range",
    "syntax": "ta.range()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.range"
   },
   "rci": {
    "fullName": "ta.rci",
    "syntax": "ta.rci()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.rci"
   },
   "rising": {
    "fullName": "ta.rising",
    "syntax": "ta.rising()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.rising"
   },
   "rma": {
    "fullName": "ta.rma",
    "syntax": "ta.rma()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.rma"
   },
   "roc": {
    "fullName": "ta.roc",
    "syntax": "ta.roc()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.roc"
   },
   "rsi": {
    "fullName": "ta.rsi",
    "syntax": "ta.rsi(source, length) → series float",
    "returns": "series float",
    "description": "Relative strength index. It is calculated using the ta.rma() of upward and downward changes of source over the last length bars."
   },
   "sar": {
    "fullName": "ta.sar",
    "syntax": "ta.sar()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.sar"
   },
   "sma": {
    "fullName": "ta.sma",
    "syntax": "ta.sma(source, length) → series float",
    "returns": "series float",
    "description": "The sma function returns the moving average, that is the sum of last y values of x, divided by y."
   },
   "stdev": {
    "fullName": "ta.stdev",
    "syntax": "ta.stdev(source, length, biased) → series float",
    "returns": "series float",
    "description": ""
   },
   "stoch": {
    "fullName": "ta.stoch",
    "syntax": "ta.stoch()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.stoch"
   },
   "supertrend": {
    "fullName": "ta.supertrend",
    "syntax": "ta.supertrend()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.supertrend"
   },
   "swma": {
    "fullName": "ta.swma",
    "syntax": "ta.swma()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.swma"
   },
   "tr": {
    "fullName": "ta.tr",
    "syntax": "ta.tr()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.tr"
   },
   "tsi": {
    "fullName": "ta.tsi",
    "syntax": "ta.tsi()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.tsi"
   },
   "valuewhen": {
    "fullName": "ta.valuewhen",
    "syntax": "ta.valuewhen()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.valuewhen"
   },
   "variance": {
    "fullName": "ta.variance",
    "syntax": "ta.variance()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.variance"
   },
   "vwap": {
    "fullName": "ta.vwap",
    "syntax": "ta.vwap()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.vwap"
   },
   "vwma": {
    "fullName": "ta.vwma",
    "syntax": "ta.vwma()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.vwma"
   },
   "wma": {
    "fullName": "ta.wma",
    "syntax": "ta.wma()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.wma"
   },
   "wpr": {
    "fullName": "ta.wpr",
    "syntax": "ta.wpr()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ta.wpr"
   }
  },
  "variables": {
   "accdist": {
    "fullName": "ta.accdist",
    "type": "series<float>"
   },
   "iii": {
    "fullName": "ta.iii",
    "type": "series<float>"
   },
   "nvi": {
    "fullName": "ta.nvi",
    "type": "series<float>"
   },
   "obv": {
    "fullName": "ta.obv",
    "type": "series<float>"
   },
   "pvi": {
    "fullName": "ta.pvi",
    "type": "series<float>"
   },
   "pvt": {
    "fullName": "ta.pvt",
    "type": "series<float>"
   },
   "tr": {
    "fullName": "ta.tr",
    "type": "series<float>"
   },
   "vwap": {
    "fullName": "ta.vwap",
    "type": "series<float>"
   },
   "wad": {
    "fullName": "ta.wad",
    "type": "series<float>"
   },
   "wvad": {
    "fullName": "ta.wvad",
    "type": "series<float>"
   }
  },
  "constants": {}
 },
 "table": {
  "functions": {
   "cell": {
    "fullName": "table.cell",
    "syntax": "table.cell()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.cell"
   },
   "cell_set_bgcolor": {
    "fullName": "table.cell_set_bgcolor",
    "syntax": "table.cell_set_bgcolor()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.cell_set_bgcolor"
   },
   "cell_set_height": {
    "fullName": "table.cell_set_height",
    "syntax": "table.cell_set_height()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.cell_set_height"
   },
   "cell_set_text": {
    "fullName": "table.cell_set_text",
    "syntax": "table.cell_set_text()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.cell_set_text"
   },
   "cell_set_text_color": {
    "fullName": "table.cell_set_text_color",
    "syntax": "table.cell_set_text_color()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.cell_set_text_color"
   },
   "cell_set_text_font_family": {
    "fullName": "table.cell_set_text_font_family",
    "syntax": "table.cell_set_text_font_family()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.cell_set_text_font_family"
   },
   "cell_set_text_formatting": {
    "fullName": "table.cell_set_text_formatting",
    "syntax": "table.cell_set_text_formatting()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.cell_set_text_formatting"
   },
   "cell_set_text_halign": {
    "fullName": "table.cell_set_text_halign",
    "syntax": "table.cell_set_text_halign()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.cell_set_text_halign"
   },
   "cell_set_text_size": {
    "fullName": "table.cell_set_text_size",
    "syntax": "table.cell_set_text_size()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.cell_set_text_size"
   },
   "cell_set_text_valign": {
    "fullName": "table.cell_set_text_valign",
    "syntax": "table.cell_set_text_valign()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.cell_set_text_valign"
   },
   "cell_set_tooltip": {
    "fullName": "table.cell_set_tooltip",
    "syntax": "table.cell_set_tooltip()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.cell_set_tooltip"
   },
   "cell_set_width": {
    "fullName": "table.cell_set_width",
    "syntax": "table.cell_set_width()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.cell_set_width"
   },
   "clear": {
    "fullName": "table.clear",
    "syntax": "table.clear()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.clear"
   },
   "delete": {
    "fullName": "table.delete",
    "syntax": "table.delete()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.delete"
   },
   "merge_cells": {
    "fullName": "table.merge_cells",
    "syntax": "table.merge_cells()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.merge_cells"
   },
   "new": {
    "fullName": "table.new",
    "syntax": "table.new()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.new"
   },
   "set_bgcolor": {
    "fullName": "table.set_bgcolor",
    "syntax": "table.set_bgcolor()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.set_bgcolor"
   },
   "set_border_color": {
    "fullName": "table.set_border_color",
    "syntax": "table.set_border_color()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.set_border_color"
   },
   "set_border_width": {
    "fullName": "table.set_border_width",
    "syntax": "table.set_border_width()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.set_border_width"
   },
   "set_frame_color": {
    "fullName": "table.set_frame_color",
    "syntax": "table.set_frame_color()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.set_frame_color"
   },
   "set_frame_width": {
    "fullName": "table.set_frame_width",
    "syntax": "table.set_frame_width()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.set_frame_width"
   },
   "set_position": {
    "fullName": "table.set_position",
    "syntax": "table.set_position()",
    "returns": "unknown",
    "description": "Pine Script v6 function: table.set_position"
   }
  },
  "variables": {
   "all": {
    "fullName": "table.all",
    "type": "series<float>"
   }
  },
  "constants": {}
 },
 "ticker": {
  "functions": {
   "heikinashi": {
    "fullName": "ticker.heikinashi",
    "syntax": "ticker.heikinashi()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ticker.heikinashi"
   },
   "inherit": {
    "fullName": "ticker.inherit",
    "syntax": "ticker.inherit()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ticker.inherit"
   },
   "kagi": {
    "fullName": "ticker.kagi",
    "syntax": "ticker.kagi()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ticker.kagi"
   },
   "linebreak": {
    "fullName": "ticker.linebreak",
    "syntax": "ticker.linebreak()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ticker.linebreak"
   },
   "modify": {
    "fullName": "ticker.modify",
    "syntax": "ticker.modify()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ticker.modify"
   },
   "new": {
    "fullName": "ticker.new",
    "syntax": "ticker.new()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ticker.new"
   },
   "pointfigure": {
    "fullName": "ticker.pointfigure",
    "syntax": "ticker.pointfigure()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ticker.pointfigure"
   },
   "renko": {
    "fullName": "ticker.renko",
    "syntax": "ticker.renko()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ticker.renko"
   },
   "standard": {
    "fullName": "ticker.standard",
    "syntax": "ticker.standard()",
    "returns": "unknown",
    "description": "Pine Script v6 function: ticker.standard"
   }
  },
  "variables": {},
  "constants": {}
 },
 "timeframe": {
  "functions": {
   "change": {
    "fullName": "timeframe.change",
    "syntax": "timeframe.change()",
    "returns": "unknown",
    "description": "Pine Script v6 function: timeframe.change"
   },
   "from_seconds": {
    "fullName": "timeframe.from_seconds",
    "syntax": "timeframe.from_seconds()",
    "returns": "unknown",
    "description": "Pine Script v6 function: timeframe.from_seconds"
   },
   "in_seconds": {
    "fullName": "timeframe.in_seconds",
    "syntax": "timeframe.in_seconds()",
    "returns": "unknown",
    "description": "Pine Script v6 function: timeframe.in_seconds"
   }
  },
  "variables": {
   "isdaily": {
    "fullName": "timeframe.isdaily",
    "type": "simple<string>"
   },
   "isdwm": {
    "fullName": "timeframe.isdwm",
    "type": "simple<string>"
   },
   "isintraday": {
    "fullName": "timeframe.isintraday",
    "type": "simple<string>"
   },
   "isminutes": {
    "fullName": "timeframe.isminutes",
    "type": "simple<string>"
   },
   "ismonthly": {
    "fullName": "timeframe.ismonthly",
    "type": "simple<string>"
   },
   "isseconds": {
    "fullName": "timeframe.isseconds",
    "type": "simple<string>"
   },
   "isticks": {
    "fullName": "timeframe.isticks",
    "type": "simple<string>"
   },
   "isweekly": {
    "fullName": "timeframe.isweekly",
    "type": "simple<string>"
   },
   "main_period": {
    "fullName": "timeframe.main_period",
    "type": "simple<string>"
   },
   "multiplier": {
    "fullName": "timeframe.multiplier",
    "type": "simple<string>"
   },
   "period": {
    "fullName": "timeframe.period",
    "type": "simple<string>"
   }
  },
  "constants": {}
 },
 "core": {
  "functions": {
   "barcolor": {
    "fullName": "core.barcolor",
    "syntax": "core.barcolor()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.barcolor"
   },
   "bgcolor": {
    "fullName": "core.bgcolor",
    "syntax": "core.bgcolor()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.bgcolor"
   },
   "bool": {
    "fullName": "core.bool",
    "syntax": "core.bool()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.bool"
   },
   "box": {
    "fullName": "core.box",
    "syntax": "core.box()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.box"
   },
   "color": {
    "fullName": "core.color",
    "syntax": "core.color()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.color"
   },
   "fill": {
    "fullName": "core.fill",
    "syntax": "core.fill()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.fill"
   },
   "fixnan": {
    "fullName": "core.fixnan",
    "syntax": "core.fixnan()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.fixnan"
   },
   "float": {
    "fullName": "core.float",
    "syntax": "core.float()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.float"
   },
   "hline": {
    "fullName": "core.hline",
    "syntax": "core.hline()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.hline"
   },
   "hour": {
    "fullName": "core.hour",
    "syntax": "core.hour()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.hour"
   },
   "indicator": {
    "fullName": "core.indicator",
    "syntax": "core.indicator()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.indicator"
   },
   "input": {
    "fullName": "core.input",
    "syntax": "core.input()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.input"
   },
   "int": {
    "fullName": "core.int",
    "syntax": "core.int()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.int"
   },
   "label": {
    "fullName": "core.label",
    "syntax": "core.label()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.label"
   },
   "library": {
    "fullName": "core.library",
    "syntax": "core.library()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.library"
   },
   "line": {
    "fullName": "core.line",
    "syntax": "core.line()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.line"
   },
   "linefill": {
    "fullName": "core.linefill",
    "syntax": "core.linefill()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.linefill"
   },
   "max_bars_back": {
    "fullName": "core.max_bars_back",
    "syntax": "core.max_bars_back()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.max_bars_back"
   },
   "minute": {
    "fullName": "core.minute",
    "syntax": "core.minute()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.minute"
   },
   "month": {
    "fullName": "core.month",
    "syntax": "core.month()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.month"
   },
   "na": {
    "fullName": "core.na",
    "syntax": "core.na()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.na"
   },
   "nz": {
    "fullName": "core.nz",
    "syntax": "core.nz()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.nz"
   },
   "plot": {
    "fullName": "core.plot",
    "syntax": "core.plot()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.plot"
   },
   "plotarrow": {
    "fullName": "core.plotarrow",
    "syntax": "core.plotarrow()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.plotarrow"
   },
   "plotbar": {
    "fullName": "core.plotbar",
    "syntax": "core.plotbar()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.plotbar"
   },
   "plotcandle": {
    "fullName": "core.plotcandle",
    "syntax": "core.plotcandle()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.plotcandle"
   },
   "plotchar": {
    "fullName": "core.plotchar",
    "syntax": "core.plotchar()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.plotchar"
   },
   "plotshape": {
    "fullName": "core.plotshape",
    "syntax": "core.plotshape()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.plotshape"
   },
   "polyline": {
    "fullName": "core.polyline",
    "syntax": "core.polyline()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.polyline"
   },
   "string": {
    "fullName": "core.string",
    "syntax": "core.string()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.string"
   },
   "dayofmonth": {
    "fullName": "core.dayofmonth",
    "syntax": "core.dayofmonth()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.dayofmonth"
   },
   "dayofweek": {
    "fullName": "core.dayofweek",
    "syntax": "core.dayofweek()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.dayofweek"
   },
   "second": {
    "fullName": "core.second",
    "syntax": "core.second()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.second"
   },
   "strategy": {
    "fullName": "core.strategy",
    "syntax": "core.strategy()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.strategy"
   },
   "weekofyear": {
    "fullName": "core.weekofyear",
    "syntax": "core.weekofyear()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.weekofyear"
   },
   "year": {
    "fullName": "core.year",
    "syntax": "core.year()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.year"
   },
   "time": {
    "fullName": "core.time",
    "syntax": "core.time()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.time"
   },
   "time_close": {
    "fullName": "core.time_close",
    "syntax": "core.time_close()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.time_close"
   },
   "timestamp": {
    "fullName": "core.timestamp",
    "syntax": "core.timestamp()",
    "returns": "unknown",
    "description": "Pine Script v6 function: core.timestamp"
   }
  },
  "variables": {},
  "constants": {}
 },
 "barstate": {
  "functions": {},
  "variables": {
   "isconfirmed": {
    "fullName": "barstate.isconfirmed",
    "type": "series<bool>"
   },
   "isfirst": {
    "fullName": "barstate.isfirst",
    "type": "series<bool>"
   },
   "ishistory": {
    "fullName": "barstate.ishistory",
    "type": "series<bool>"
   },
   "islast": {
    "fullName": "barstate.islast",
    "type": "series<bool>"
   },
   "islastconfirmedhistory": {
    "fullName": "barstate.islastconfirmedhistory",
    "type": "series<bool>"
   },
   "isnew": {
    "fullName": "barstate.isnew",
    "type": "series<bool>"
   },
   "isrealtime": {
    "fullName": "barstate.isrealtime",
    "type": "series<bool>"
   }
  },
  "constants": {}
 },
 "dividends": {
  "functions": {},
  "variables": {
   "future_amount": {
    "fullName": "dividends.future_amount",
    "type": "series<float>"
   },
   "future_ex_date": {
    "fullName": "dividends.future_ex_date",
    "type": "series<float>"
   },
   "future_pay_date": {
    "fullName": "dividends.future_pay_date",
    "type": "series<float>"
   }
  },
  "constants": {
   "gross": {
    "fullName": "dividends.gross",
    "type": "string"
   },
   "net": {
    "fullName": "dividends.net",
    "type": "string"
   }
  }
 },
 "earnings": {
  "functions": {},
  "variables": {
   "future_eps": {
    "fullName": "earnings.future_eps",
    "type": "series<float>"
   },
   "future_period_end_time": {
    "fullName": "earnings.future_period_end_time",
    "type": "series<float>"
   },
   "future_revenue": {
    "fullName": "earnings.future_revenue",
    "type": "series<float>"
   },
   "future_time": {
    "fullName": "earnings.future_time",
    "type": "series<float>"
   }
  },
  "constants": {
   "actual": {
    "fullName": "earnings.actual",
    "type": "string"
   },
   "estimate": {
    "fullName": "earnings.estimate",
    "type": "string"
   },
   "standardized": {
    "fullName": "earnings.standardized",
    "type": "string"
   }
  }
 },
 "session": {
  "functions": {},
  "variables": {
   "isfirstbar": {
    "fullName": "session.isfirstbar",
    "type": "simple<bool>"
   },
   "isfirstbar_regular": {
    "fullName": "session.isfirstbar_regular",
    "type": "simple<bool>"
   },
   "islastbar": {
    "fullName": "session.islastbar",
    "type": "simple<bool>"
   },
   "islastbar_regular": {
    "fullName": "session.islastbar_regular",
    "type": "simple<bool>"
   },
   "ismarket": {
    "fullName": "session.ismarket",
    "type": "simple<bool>"
   },
   "ispostmarket": {
    "fullName": "session.ispostmarket",
    "type": "simple<bool>"
   },
   "ispremarket": {
    "fullName": "session.ispremarket",
    "type": "simple<bool>"
   }
  },
  "constants": {
   "extended": {
    "fullName": "session.extended",
    "type": "string"
   },
   "regular": {
    "fullName": "session.regular",
    "type": "string"
   }
  }
 },
 "adjustment": {
  "functions": {},
  "variables": {},
  "constants": {
   "dividends": {
    "fullName": "adjustment.dividends",
    "type": "adjustment"
   },
   "none": {
    "fullName": "adjustment.none",
    "type": "adjustment"
   },
   "splits": {
    "fullName": "adjustment.splits",
    "type": "adjustment"
   }
  }
 },
 "backadjustment": {
  "functions": {},
  "variables": {},
  "constants": {
   "inherit": {
    "fullName": "backadjustment.inherit",
    "type": "const"
   },
   "off": {
    "fullName": "backadjustment.off",
    "type": "const"
   },
   "on": {
    "fullName": "backadjustment.on",
    "type": "const"
   }
  }
 },
 "barmerge": {
  "functions": {},
  "variables": {},
  "constants": {
   "gaps_off": {
    "fullName": "barmerge.gaps_off",
    "type": "barmerge"
   },
   "gaps_on": {
    "fullName": "barmerge.gaps_on",
    "type": "barmerge"
   },
   "lookahead_off": {
    "fullName": "barmerge.lookahead_off",
    "type": "barmerge"
   },
   "lookahead_on": {
    "fullName": "barmerge.lookahead_on",
    "type": "barmerge"
   }
  }
 },
 "currency": {
  "functions": {},
  "variables": {},
  "constants": {
   "AED": {
    "fullName": "currency.AED",
    "type": "string"
   },
   "ARS": {
    "fullName": "currency.ARS",
    "type": "string"
   },
   "AUD": {
    "fullName": "currency.AUD",
    "type": "string"
   },
   "BDT": {
    "fullName": "currency.BDT",
    "type": "string"
   },
   "BHD": {
    "fullName": "currency.BHD",
    "type": "string"
   },
   "BRL": {
    "fullName": "currency.BRL",
    "type": "string"
   },
   "BTC": {
    "fullName": "currency.BTC",
    "type": "string"
   },
   "CAD": {
    "fullName": "currency.CAD",
    "type": "string"
   },
   "CHF": {
    "fullName": "currency.CHF",
    "type": "string"
   },
   "CLP": {
    "fullName": "currency.CLP",
    "type": "string"
   },
   "CNY": {
    "fullName": "currency.CNY",
    "type": "string"
   },
   "COP": {
    "fullName": "currency.COP",
    "type": "string"
   },
   "CZK": {
    "fullName": "currency.CZK",
    "type": "string"
   },
   "DKK": {
    "fullName": "currency.DKK",
    "type": "string"
   },
   "EGP": {
    "fullName": "currency.EGP",
    "type": "string"
   },
   "ETH": {
    "fullName": "currency.ETH",
    "type": "string"
   },
   "EUR": {
    "fullName": "currency.EUR",
    "type": "string"
   },
   "GBP": {
    "fullName": "currency.GBP",
    "type": "string"
   },
   "HKD": {
    "fullName": "currency.HKD",
    "type": "string"
   },
   "HUF": {
    "fullName": "currency.HUF",
    "type": "string"
   },
   "IDR": {
    "fullName": "currency.IDR",
    "type": "string"
   },
   "ILS": {
    "fullName": "currency.ILS",
    "type": "string"
   },
   "INR": {
    "fullName": "currency.INR",
    "type": "string"
   },
   "ISK": {
    "fullName": "currency.ISK",
    "type": "string"
   },
   "JPY": {
    "fullName": "currency.JPY",
    "type": "string"
   },
   "KES": {
    "fullName": "currency.KES",
    "type": "string"
   },
   "KRW": {
    "fullName": "currency.KRW",
    "type": "string"
   },
   "KWD": {
    "fullName": "currency.KWD",
    "type": "string"
   },
   "LKR": {
    "fullName": "currency.LKR",
    "type": "string"
   },
   "MAD": {
    "fullName": "currency.MAD",
    "type": "string"
   },
   "MXN": {
    "fullName": "currency.MXN",
    "type": "string"
   },
   "MYR": {
    "fullName": "currency.MYR",
    "type": "string"
   },
   "NGN": {
    "fullName": "currency.NGN",
    "type": "string"
   },
   "NOK": {
    "fullName": "currency.NOK",
    "type": "string"
   },
   "NONE": {
    "fullName": "currency.NONE",
    "type": "string"
   },
   "NZD": {
    "fullName": "currency.NZD",
    "type": "string"
   },
   "PEN": {
    "fullName": "currency.PEN",
    "type": "string"
   },
   "PHP": {
    "fullName": "currency.PHP",
    "type": "string"
   },
   "PKR": {
    "fullName": "currency.PKR",
    "type": "string"
   },
   "PLN": {
    "fullName": "currency.PLN",
    "type": "string"
   },
   "QAR": {
    "fullName": "currency.QAR",
    "type": "string"
   },
   "RON": {
    "fullName": "currency.RON",
    "type": "string"
   },
   "RSD": {
    "fullName": "currency.RSD",
    "type": "string"
   },
   "RUB": {
    "fullName": "currency.RUB",
    "type": "string"
   },
   "SAR": {
    "fullName": "currency.SAR",
    "type": "string"
   },
   "SEK": {
    "fullName": "currency.SEK",
    "type": "string"
   },
   "SGD": {
    "fullName": "currency.SGD",
    "type": "string"
   },
   "THB": {
    "fullName": "currency.THB",
    "type": "string"
   },
   "TND": {
    "fullName": "currency.TND",
    "type": "string"
   },
   "TRY": {
    "fullName": "currency.TRY",
    "type": "string"
   },
   "TWD": {
    "fullName": "currency.TWD",
    "type": "string"
   },
   "USD": {
    "fullName": "currency.USD",
    "type": "string"
   },
   "USDT": {
    "fullName": "currency.USDT",
    "type": "string"
   },
   "VES": {
    "fullName": "currency.VES",
    "type": "string"
   },
   "VND": {
    "fullName": "currency.VND",
    "type": "string"
   },
   "ZAR": {
    "fullName": "currency.ZAR",
    "type": "string"
   }
  }
 },
 "dayofweek": {
  "functions": {},
  "variables": {},
  "constants": {
   "friday": {
    "fullName": "dayofweek.friday",
    "type": "int"
   },
   "monday": {
    "fullName": "dayofweek.monday",
    "type": "int"
   },
   "saturday": {
    "fullName": "dayofweek.saturday",
    "type": "int"
   },
   "sunday": {
    "fullName": "dayofweek.sunday",
    "type": "int"
   },
   "thursday": {
    "fullName": "dayofweek.thursday",
    "type": "int"
   },
   "tuesday": {
    "fullName": "dayofweek.tuesday",
    "type": "int"
   },
   "wednesday": {
    "fullName": "dayofweek.wednesday",
    "type": "int"
   }
  }
 },
 "display": {
  "functions": {},
  "variables": {},
  "constants": {
   "all": {
    "fullName": "display.all",
    "type": "int"
   },
   "data_window": {
    "fullName": "display.data_window",
    "type": "int"
   },
   "none": {
    "fullName": "display.none",
    "type": "int"
   },
   "pane": {
    "fullName": "display.pane",
    "type": "int"
   },
   "price_scale": {
    "fullName": "display.price_scale",
    "type": "int"
   },
   "status_line": {
    "fullName": "display.status_line",
    "type": "int"
   }
  }
 },
 "extend": {
  "functions": {},
  "variables": {},
  "constants": {
   "both": {
    "fullName": "extend.both",
    "type": "string"
   },
   "left": {
    "fullName": "extend.left",
    "type": "string"
   },
   "none": {
    "fullName": "extend.none",
    "type": "string"
   },
   "right": {
    "fullName": "extend.right",
    "type": "string"
   }
  }
 },
 "font": {
  "functions": {},
  "variables": {},
  "constants": {
   "family_default": {
    "fullName": "font.family_default",
    "type": "const"
   },
   "family_monospace": {
    "fullName": "font.family_monospace",
    "type": "const"
   }
  }
 },
 "format": {
  "functions": {},
  "variables": {},
  "constants": {
   "inherit": {
    "fullName": "format.inherit",
    "type": "string"
   },
   "mintick": {
    "fullName": "format.mintick",
    "type": "string"
   },
   "percent": {
    "fullName": "format.percent",
    "type": "string"
   },
   "price": {
    "fullName": "format.price",
    "type": "string"
   },
   "volume": {
    "fullName": "format.volume",
    "type": "string"
   }
  }
 },
 "hline": {
  "functions": {},
  "variables": {},
  "constants": {
   "style_dashed": {
    "fullName": "hline.style_dashed",
    "type": "hline_style"
   },
   "style_dotted": {
    "fullName": "hline.style_dotted",
    "type": "hline_style"
   },
   "style_solid": {
    "fullName": "hline.style_solid",
    "type": "hline_style"
   }
  }
 },
 "location": {
  "functions": {},
  "variables": {},
  "constants": {
   "abovebar": {
    "fullName": "location.abovebar",
    "type": "string"
   },
   "absolute": {
    "fullName": "location.absolute",
    "type": "string"
   },
   "belowbar": {
    "fullName": "location.belowbar",
    "type": "string"
   },
   "bottom": {
    "fullName": "location.bottom",
    "type": "string"
   },
   "top": {
    "fullName": "location.top",
    "type": "string"
   }
  }
 },
 "order": {
  "functions": {},
  "variables": {},
  "constants": {
   "ascending": {
    "fullName": "order.ascending",
    "type": "string"
   },
   "descending": {
    "fullName": "order.descending",
    "type": "string"
   }
  }
 },
 "plot": {
  "functions": {},
  "variables": {},
  "constants": {
   "linestyle_dashed": {
    "fullName": "plot.linestyle_dashed",
    "type": "plot_style"
   },
   "linestyle_dotted": {
    "fullName": "plot.linestyle_dotted",
    "type": "plot_style"
   },
   "linestyle_solid": {
    "fullName": "plot.linestyle_solid",
    "type": "plot_style"
   },
   "style_area": {
    "fullName": "plot.style_area",
    "type": "plot_style"
   },
   "style_areabr": {
    "fullName": "plot.style_areabr",
    "type": "plot_style"
   },
   "style_circles": {
    "fullName": "plot.style_circles",
    "type": "plot_style"
   },
   "style_columns": {
    "fullName": "plot.style_columns",
    "type": "plot_style"
   },
   "style_cross": {
    "fullName": "plot.style_cross",
    "type": "plot_style"
   },
   "style_histogram": {
    "fullName": "plot.style_histogram",
    "type": "plot_style"
   },
   "style_line": {
    "fullName": "plot.style_line",
    "type": "plot_style"
   },
   "style_linebr": {
    "fullName": "plot.style_linebr",
    "type": "plot_style"
   },
   "style_stepline": {
    "fullName": "plot.style_stepline",
    "type": "plot_style"
   },
   "style_stepline_diamond": {
    "fullName": "plot.style_stepline_diamond",
    "type": "plot_style"
   },
   "style_steplinebr": {
    "fullName": "plot.style_steplinebr",
    "type": "plot_style"
   }
  }
 },
 "position": {
  "functions": {},
  "variables": {},
  "constants": {
   "bottom_center": {
    "fullName": "position.bottom_center",
    "type": "string"
   },
   "bottom_left": {
    "fullName": "position.bottom_left",
    "type": "string"
   },
   "bottom_right": {
    "fullName": "position.bottom_right",
    "type": "string"
   },
   "middle_center": {
    "fullName": "position.middle_center",
    "type": "string"
   },
   "middle_left": {
    "fullName": "position.middle_left",
    "type": "string"
   },
   "middle_right": {
    "fullName": "position.middle_right",
    "type": "string"
   },
   "top_center": {
    "fullName": "position.top_center",
    "type": "string"
   },
   "top_left": {
    "fullName": "position.top_left",
    "type": "string"
   },
   "top_right": {
    "fullName": "position.top_right",
    "type": "string"
   }
  }
 },
 "scale": {
  "functions": {},
  "variables": {},
  "constants": {
   "left": {
    "fullName": "scale.left",
    "type": "scale"
   },
   "none": {
    "fullName": "scale.none",
    "type": "scale"
   },
   "right": {
    "fullName": "scale.right",
    "type": "scale"
   }
  }
 },
 "settlement_as_close": {
  "functions": {},
  "variables": {},
  "constants": {
   "inherit": {
    "fullName": "settlement_as_close.inherit",
    "type": "const"
   },
   "off": {
    "fullName": "settlement_as_close.off",
    "type": "const"
   },
   "on": {
    "fullName": "settlement_as_close.on",
    "type": "const"
   }
  }
 },
 "shape": {
  "functions": {},
  "variables": {},
  "constants": {
   "arrowdown": {
    "fullName": "shape.arrowdown",
    "type": "string"
   },
   "arrowup": {
    "fullName": "shape.arrowup",
    "type": "string"
   },
   "circle": {
    "fullName": "shape.circle",
    "type": "string"
   },
   "cross": {
    "fullName": "shape.cross",
    "type": "string"
   },
   "diamond": {
    "fullName": "shape.diamond",
    "type": "string"
   },
   "flag": {
    "fullName": "shape.flag",
    "type": "string"
   },
   "labeldown": {
    "fullName": "shape.labeldown",
    "type": "string"
   },
   "labelup": {
    "fullName": "shape.labelup",
    "type": "string"
   },
   "square": {
    "fullName": "shape.square",
    "type": "string"
   },
   "triangledown": {
    "fullName": "shape.triangledown",
    "type": "string"
   },
   "triangleup": {
    "fullName": "shape.triangleup",
    "type": "string"
   },
   "xcross": {
    "fullName": "shape.xcross",
    "type": "string"
   }
  }
 },
 "size": {
  "functions": {},
  "variables": {},
  "constants": {
   "auto": {
    "fullName": "size.auto",
    "type": "string"
   },
   "huge": {
    "fullName": "size.huge",
    "type": "string"
   },
   "large": {
    "fullName": "size.large",
    "type": "string"
   },
   "normal": {
    "fullName": "size.normal",
    "type": "string"
   },
   "small": {
    "fullName": "size.small",
    "type": "string"
   },
   "tiny": {
    "fullName": "size.tiny",
    "type": "string"
   }
  }
 },
 "splits": {
  "functions": {},
  "variables": {},
  "constants": {
   "denominator": {
    "fullName": "splits.denominator",
    "type": "string"
   },
   "numerator": {
    "fullName": "splits.numerator",
    "type": "string"
   }
  }
 },
 "text": {
  "functions": {},
  "variables": {},
  "constants": {
   "align_bottom": {
    "fullName": "text.align_bottom",
    "type": "string"
   },
   "align_center": {
    "fullName": "text.align_center",
    "type": "string"
   },
   "align_left": {
    "fullName": "text.align_left",
    "type": "string"
   },
   "align_right": {
    "fullName": "text.align_right",
    "type": "string"
   },
   "align_top": {
    "fullName": "text.align_top",
    "type": "string"
   },
   "format_bold": {
    "fullName": "text.format_bold",
    "type": "string"
   },
   "format_italic": {
    "fullName": "text.format_italic",
    "type": "string"
   },
   "format_none": {
    "fullName": "text.format_none",
    "type": "string"
   },
   "wrap_auto": {
    "fullName": "text.wrap_auto",
    "type": "string"
   },
   "wrap_none": {
    "fullName": "text.wrap_none",
    "type": "string"
   }
  }
 },
 "xloc": {
  "functions": {},
  "variables": {},
  "constants": {
   "bar_index": {
    "fullName": "xloc.bar_index",
    "type": "string"
   },
   "bar_time": {
    "fullName": "xloc.bar_time",
    "type": "string"
   }
  }
 },
 "yloc": {
  "functions": {},
  "variables": {},
  "constants": {
   "abovebar": {
    "fullName": "yloc.abovebar",
    "type": "string"
   },
   "belowbar": {
    "fullName": "yloc.belowbar",
    "type": "string"
   },
   "price": {
    "fullName": "yloc.price",
    "type": "string"
   }
  }
 }
};

// Helper to get all namespace names
export const NAMESPACE_NAMES = ["adjustment","alert","array","backadjustment","barmerge","barstate","box","chart","color","core","currency","dayofweek","display","dividends","earnings","extend","font","format","hline","input","label","line","linefill","location","log","map","math","matrix","order","plot","polyline","position","request","runtime","scale","session","settlement_as_close","shape","size","splits","str","strategy","syminfo","ta","table","text","ticker","timeframe","xloc","yloc"];
