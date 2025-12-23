/**
 * Pine Script v6 Namespaces
 * Auto-generated - provides organized namespace data for IntelliSense
 * Generated: 2025-12-23T15:57:09.412Z
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
	barstate: {
		functions: {},
		variables: {},
		constants: {},
	},
	box: {
		functions: {
			copy: {
				fullName: "box.copy",
				syntax: "box.copy(id) → series box",
				returns: "series box",
				description: "Clones the box object.",
			},
			delete: {
				fullName: "box.delete",
				syntax: "box.delete(id) → void",
				returns: "void",
				description:
					"Deletes the specified box object. If it has already been deleted, does nothing.",
			},
			get_bottom: {
				fullName: "box.get_bottom",
				syntax: "box.get_bottom(id) → series float",
				returns: "series float",
				description: "Returns the price value of the bottom border of the box.",
			},
			get_left: {
				fullName: "box.get_left",
				syntax: "box.get_left(id) → series int",
				returns: "series int",
				description:
					"Returns the bar index or the UNIX time (depending on the last value used for 'xloc') of the left border of the box.",
			},
			get_right: {
				fullName: "box.get_right",
				syntax: "box.get_right(id) → series int",
				returns: "series int",
				description:
					"Returns the bar index or the UNIX time (depending on the last value used for 'xloc') of the right border of the box.",
			},
			get_top: {
				fullName: "box.get_top",
				syntax: "box.get_top(id) → series float",
				returns: "series float",
				description: "Returns the price value of the top border of the box.",
			},
			new: {
				fullName: "box.new",
				syntax:
					"box.new(top_left, bottom_right, border_color, border_width, border_style, extend, xloc, bgcolor, text, text_size, text_color, text_halign, text_valign, text_wrap, text_font_family, force_overlay, text_formatting) → series box",
				returns: "series box",
				description: "Creates a new box object.",
			},
			set_bgcolor: {
				fullName: "box.set_bgcolor",
				syntax: "box.set_bgcolor(id, color) → void",
				returns: "void",
				description: "Sets the background color of the box.",
			},
			set_border_color: {
				fullName: "box.set_border_color",
				syntax: "box.set_border_color(id, color) → void",
				returns: "void",
				description: "Sets the border color of the box.",
			},
			set_border_style: {
				fullName: "box.set_border_style",
				syntax: "box.set_border_style(id, style) → void",
				returns: "void",
				description: "Sets the border style of the box.",
			},
			set_border_width: {
				fullName: "box.set_border_width",
				syntax: "box.set_border_width(id, width) → void",
				returns: "void",
				description: "Sets the border width of the box.",
			},
			set_bottom: {
				fullName: "box.set_bottom",
				syntax: "box.set_bottom(id, bottom) → void",
				returns: "void",
				description: "Sets the bottom coordinate of the box.",
			},
			set_bottom_right_point: {
				fullName: "box.set_bottom_right_point",
				syntax: "box.set_bottom_right_point(id, point) → void",
				returns: "void",
				description:
					"Sets the bottom-right corner location of the id box to point.",
			},
			set_extend: {
				fullName: "box.set_extend",
				syntax: "box.set_extend(id, extend) → void",
				returns: "void",
				description:
					"Sets extending type of the border of this box object. When extend.none is used, the horizontal borders start at the left border and end at the right border. With extend.left or extend.right, the horizontal borders are extended indefinitely to the left or right of the box, respectively. With extend.both, the horizontal borders are extended on both sides.",
			},
			set_left: {
				fullName: "box.set_left",
				syntax: "box.set_left(id, left) → void",
				returns: "void",
				description: "Sets the left coordinate of the box.",
			},
			set_lefttop: {
				fullName: "box.set_lefttop",
				syntax: "box.set_lefttop(id, left, top) → void",
				returns: "void",
				description: "Sets the left and top coordinates of the box.",
			},
			set_right: {
				fullName: "box.set_right",
				syntax: "box.set_right(id, right) → void",
				returns: "void",
				description: "Sets the right coordinate of the box.",
			},
			set_rightbottom: {
				fullName: "box.set_rightbottom",
				syntax: "box.set_rightbottom(id, right, bottom) → void",
				returns: "void",
				description: "Sets the right and bottom coordinates of the box.",
			},
			set_text: {
				fullName: "box.set_text",
				syntax: "box.set_text(id, text) → void",
				returns: "void",
				description: "The function sets the text in the box.",
			},
			set_text_color: {
				fullName: "box.set_text_color",
				syntax: "box.set_text_color(id, text_color) → void",
				returns: "void",
				description: "The function sets the color of the text inside the box.",
			},
			set_text_font_family: {
				fullName: "box.set_text_font_family",
				syntax: "box.set_text_font_family(id, text_font_family) → void",
				returns: "void",
				description:
					"The function sets the font family of the text inside the box.",
			},
			set_text_formatting: {
				fullName: "box.set_text_formatting",
				syntax: "box.set_text_formatting(id, text_formatting) → void",
				returns: "void",
				description:
					"Sets the formatting attributes the drawing applies to displayed text.",
			},
			set_text_halign: {
				fullName: "box.set_text_halign",
				syntax: "box.set_text_halign(id, text_halign) → void",
				returns: "void",
				description:
					"The function sets the horizontal alignment of the box's text.",
			},
			set_text_size: {
				fullName: "box.set_text_size",
				syntax: "box.set_text_size(id, text_size) → void",
				returns: "void",
				description: "The function sets the size of the box's text.",
			},
			set_text_valign: {
				fullName: "box.set_text_valign",
				syntax: "box.set_text_valign(id, text_valign) → void",
				returns: "void",
				description:
					"The function sets the vertical alignment of a box's text.",
			},
			set_text_wrap: {
				fullName: "box.set_text_wrap",
				syntax: "box.set_text_wrap(id, text_wrap) → void",
				returns: "void",
				description:
					"The function sets the mode of wrapping of the text inside the box.",
			},
			set_top: {
				fullName: "box.set_top",
				syntax: "box.set_top(id, top) → void",
				returns: "void",
				description: "Sets the top coordinate of the box.",
			},
			set_top_left_point: {
				fullName: "box.set_top_left_point",
				syntax: "box.set_top_left_point(id, point) → void",
				returns: "void",
				description:
					"Sets the top-left corner location of the id box to point.",
			},
			set_xloc: {
				fullName: "box.set_xloc",
				syntax: "box.set_xloc(id, left, right, xloc) → void",
				returns: "void",
				description:
					"Sets the left and right borders of a box and updates its xloc property.",
			},
		},
		variables: {},
		constants: {},
	},
	chart: {
		functions: {
			"point.copy": {
				fullName: "chart.point.copy",
				syntax: "chart.point.copy(id) → chart.point",
				returns: "chart.point",
				description:
					"Creates a copy of a chart.point object with the specified id.",
			},
			"point.from_index": {
				fullName: "chart.point.from_index",
				syntax: "chart.point.from_index(index, price) → chart.point",
				returns: "chart.point",
				description:
					"Returns a chart.point object with index as its x-coordinate and price as its y-coordinate.",
			},
			"point.from_time": {
				fullName: "chart.point.from_time",
				syntax: "chart.point.from_time(time, price) → chart.point",
				returns: "chart.point",
				description:
					"Returns a chart.point object with time as its x-coordinate and price as its y-coordinate.",
			},
			"point.new": {
				fullName: "chart.point.new",
				syntax: "chart.point.new(time, index, price) → chart.point",
				returns: "chart.point",
				description:
					"Creates a new chart.point object with the specified time, index, and price.",
			},
			"point.now": {
				fullName: "chart.point.now",
				syntax: "chart.point.now(price) → chart.point",
				returns: "chart.point",
				description:
					"Returns a chart.point object with price as the y-coordinate",
			},
		},
		variables: {},
		constants: {},
	},
	dividends: {
		functions: {},
		variables: {},
		constants: {
			gross: {
				fullName: "dividends.gross",
				type: "string",
			},
			net: {
				fullName: "dividends.net",
				type: "string",
			},
		},
	},
	earnings: {
		functions: {},
		variables: {},
		constants: {
			actual: {
				fullName: "earnings.actual",
				type: "string",
			},
			estimate: {
				fullName: "earnings.estimate",
				type: "string",
			},
			standardized: {
				fullName: "earnings.standardized",
				type: "string",
			},
		},
	},
	label: {
		functions: {
			copy: {
				fullName: "label.copy",
				syntax: "label.copy(id) → series label",
				returns: "series label",
				description: "Clones the label object.",
			},
			delete: {
				fullName: "label.delete",
				syntax: "label.delete(id) → void",
				returns: "void",
				description:
					"Deletes the specified label object. If it has already been deleted, does nothing.",
			},
			get_text: {
				fullName: "label.get_text",
				syntax: "label.get_text(id) → series string",
				returns: "series string",
				description: "Returns the text of this label object.",
			},
			get_x: {
				fullName: "label.get_x",
				syntax: "label.get_x(id) → series int",
				returns: "series int",
				description:
					"Returns UNIX time or bar index (depending on the last xloc value set) of this label's position.",
			},
			get_y: {
				fullName: "label.get_y",
				syntax: "label.get_y(id) → series float",
				returns: "series float",
				description: "Returns price of this label's position.",
			},
			new: {
				fullName: "label.new",
				syntax:
					"label.new(point, text, xloc, yloc, color, style, textcolor, size, textalign, tooltip, text_font_family, force_overlay, text_formatting) → series label",
				returns: "series label",
				description: "Creates new label object.",
			},
			set_color: {
				fullName: "label.set_color",
				syntax: "label.set_color(id, color) → void",
				returns: "void",
				description: "Sets label border and arrow color.",
			},
			set_point: {
				fullName: "label.set_point",
				syntax: "label.set_point(id, point) → void",
				returns: "void",
				description: "Sets the location of the id label to point.",
			},
			set_size: {
				fullName: "label.set_size",
				syntax: "label.set_size(id, size) → void",
				returns: "void",
				description: "Sets arrow and text size of the specified label object.",
			},
			set_style: {
				fullName: "label.set_style",
				syntax: "label.set_style(id, style) → void",
				returns: "void",
				description: "Sets label style.",
			},
			set_text: {
				fullName: "label.set_text",
				syntax: "label.set_text(id, text) → void",
				returns: "void",
				description: "Sets label text",
			},
			set_text_font_family: {
				fullName: "label.set_text_font_family",
				syntax: "label.set_text_font_family(id, text_font_family) → void",
				returns: "void",
				description:
					"The function sets the font family of the text inside the label.",
			},
			set_text_formatting: {
				fullName: "label.set_text_formatting",
				syntax: "label.set_text_formatting(id, text_formatting) → void",
				returns: "void",
				description:
					"Sets the formatting attributes the drawing applies to displayed text.",
			},
			set_textalign: {
				fullName: "label.set_textalign",
				syntax: "label.set_textalign(id, textalign) → void",
				returns: "void",
				description: "Sets the alignment for the label text.",
			},
			set_textcolor: {
				fullName: "label.set_textcolor",
				syntax: "label.set_textcolor(id, textcolor) → void",
				returns: "void",
				description: "Sets color of the label text.",
			},
			set_tooltip: {
				fullName: "label.set_tooltip",
				syntax: "label.set_tooltip(id, tooltip) → void",
				returns: "void",
				description: "Sets the tooltip text.",
			},
			set_x: {
				fullName: "label.set_x",
				syntax: "label.set_x(id, x) → void",
				returns: "void",
				description:
					"Sets bar index or bar time (depending on the xloc) of the label position.",
			},
			set_xloc: {
				fullName: "label.set_xloc",
				syntax: "label.set_xloc(id, x, xloc) → void",
				returns: "void",
				description: "Sets x-location and new bar index/time value.",
			},
			set_xy: {
				fullName: "label.set_xy",
				syntax: "label.set_xy(id, x, y) → void",
				returns: "void",
				description: "Sets bar index/time and price of the label position.",
			},
			set_y: {
				fullName: "label.set_y",
				syntax: "label.set_y(id, y) → void",
				returns: "void",
				description: "Sets price of the label position",
			},
			set_yloc: {
				fullName: "label.set_yloc",
				syntax: "label.set_yloc(id, yloc) → void",
				returns: "void",
				description: "Sets new y-location calculation algorithm.",
			},
		},
		variables: {},
		constants: {
			style_arrowdown: {
				fullName: "label.style_arrowdown",
				type: "label_style",
			},
			style_arrowup: {
				fullName: "label.style_arrowup",
				type: "label_style",
			},
			style_circle: {
				fullName: "label.style_circle",
				type: "label_style",
			},
			style_cross: {
				fullName: "label.style_cross",
				type: "label_style",
			},
			style_diamond: {
				fullName: "label.style_diamond",
				type: "label_style",
			},
			style_flag: {
				fullName: "label.style_flag",
				type: "label_style",
			},
			style_label_center: {
				fullName: "label.style_label_center",
				type: "label_style",
			},
			style_label_down: {
				fullName: "label.style_label_down",
				type: "label_style",
			},
			style_label_left: {
				fullName: "label.style_label_left",
				type: "label_style",
			},
			style_label_lower_left: {
				fullName: "label.style_label_lower_left",
				type: "label_style",
			},
			style_label_lower_right: {
				fullName: "label.style_label_lower_right",
				type: "label_style",
			},
			style_label_right: {
				fullName: "label.style_label_right",
				type: "label_style",
			},
			style_label_up: {
				fullName: "label.style_label_up",
				type: "label_style",
			},
			style_label_upper_left: {
				fullName: "label.style_label_upper_left",
				type: "label_style",
			},
			style_label_upper_right: {
				fullName: "label.style_label_upper_right",
				type: "label_style",
			},
			style_none: {
				fullName: "label.style_none",
				type: "label_style",
			},
			style_square: {
				fullName: "label.style_square",
				type: "label_style",
			},
			style_text_outline: {
				fullName: "label.style_text_outline",
				type: "label_style",
			},
			style_triangledown: {
				fullName: "label.style_triangledown",
				type: "label_style",
			},
			style_triangleup: {
				fullName: "label.style_triangleup",
				type: "label_style",
			},
			style_xcross: {
				fullName: "label.style_xcross",
				type: "label_style",
			},
		},
	},
	line: {
		functions: {
			copy: {
				fullName: "line.copy",
				syntax: "line.copy(id) → series line",
				returns: "series line",
				description: "Clones the line object.",
			},
			delete: {
				fullName: "line.delete",
				syntax: "line.delete(id) → void",
				returns: "void",
				description:
					"Deletes the specified line object. If it has already been deleted, does nothing.",
			},
			get_price: {
				fullName: "line.get_price",
				syntax: "line.get_price(id, x) → series float",
				returns: "series float",
				description: "Returns the price level of a line at a given bar index.",
			},
			get_x1: {
				fullName: "line.get_x1",
				syntax: "line.get_x1(id) → series int",
				returns: "series int",
				description:
					"Returns UNIX time or bar index (depending on the last xloc value set) of the first point of the line.",
			},
			get_x2: {
				fullName: "line.get_x2",
				syntax: "line.get_x2(id) → series int",
				returns: "series int",
				description:
					"Returns UNIX time or bar index (depending on the last xloc value set) of the second point of the line.",
			},
			get_y1: {
				fullName: "line.get_y1",
				syntax: "line.get_y1(id) → series float",
				returns: "series float",
				description: "Returns price of the first point of the line.",
			},
			get_y2: {
				fullName: "line.get_y2",
				syntax: "line.get_y2(id) → series float",
				returns: "series float",
				description: "Returns price of the second point of the line.",
			},
			new: {
				fullName: "line.new",
				syntax:
					"line.new(first_point, second_point, xloc, extend, color, style, width, force_overlay) → series line",
				returns: "series line",
				description: "Creates new line object.",
			},
			set_color: {
				fullName: "line.set_color",
				syntax: "line.set_color(id, color) → void",
				returns: "void",
				description: "Sets the line color",
			},
			set_extend: {
				fullName: "line.set_extend",
				syntax: "line.set_extend(id, extend) → void",
				returns: "void",
				description:
					"Sets extending type of this line object. If extend=extend.none, draws segment starting at point (x1, y1) and ending at point (x2, y2). If extend is equal to extend.right or extend.left, draws a ray starting at point (x1, y1) or (x2, y2), respectively. If extend=extend.both, draws a straight line that goes through these points.",
			},
			set_first_point: {
				fullName: "line.set_first_point",
				syntax: "line.set_first_point(id, point) → void",
				returns: "void",
				description: "Sets the first point of the id line to point.",
			},
			set_second_point: {
				fullName: "line.set_second_point",
				syntax: "line.set_second_point(id, point) → void",
				returns: "void",
				description: "Sets the second point of the id line to point.",
			},
			set_style: {
				fullName: "line.set_style",
				syntax: "line.set_style(id, style) → void",
				returns: "void",
				description: "Sets the line style",
			},
			set_width: {
				fullName: "line.set_width",
				syntax: "line.set_width(id, width) → void",
				returns: "void",
				description: "Sets the line width.",
			},
			set_x1: {
				fullName: "line.set_x1",
				syntax: "line.set_x1(id, x) → void",
				returns: "void",
				description:
					"Sets bar index or bar time (depending on the xloc) of the first point.",
			},
			set_x2: {
				fullName: "line.set_x2",
				syntax: "line.set_x2(id, x) → void",
				returns: "void",
				description:
					"Sets bar index or bar time (depending on the xloc) of the second point.",
			},
			set_xloc: {
				fullName: "line.set_xloc",
				syntax: "line.set_xloc(id, x1, x2, xloc) → void",
				returns: "void",
				description: "Sets x-location and new bar index/time values.",
			},
			set_xy1: {
				fullName: "line.set_xy1",
				syntax: "line.set_xy1(id, x, y) → void",
				returns: "void",
				description: "Sets bar index/time and price of the first point.",
			},
			set_xy2: {
				fullName: "line.set_xy2",
				syntax: "line.set_xy2(id, x, y) → void",
				returns: "void",
				description: "Sets bar index/time and price of the second point",
			},
			set_y1: {
				fullName: "line.set_y1",
				syntax: "line.set_y1(id, y) → void",
				returns: "void",
				description: "Sets price of the first point",
			},
			set_y2: {
				fullName: "line.set_y2",
				syntax: "line.set_y2(id, y) → void",
				returns: "void",
				description: "Sets price of the second point.",
			},
		},
		variables: {},
		constants: {
			style_arrow_both: {
				fullName: "line.style_arrow_both",
				type: "line_style",
			},
			style_arrow_left: {
				fullName: "line.style_arrow_left",
				type: "line_style",
			},
			style_arrow_right: {
				fullName: "line.style_arrow_right",
				type: "line_style",
			},
			style_dashed: {
				fullName: "line.style_dashed",
				type: "line_style",
			},
			style_dotted: {
				fullName: "line.style_dotted",
				type: "line_style",
			},
			style_solid: {
				fullName: "line.style_solid",
				type: "line_style",
			},
		},
	},
	linefill: {
		functions: {
			delete: {
				fullName: "linefill.delete",
				syntax: "linefill.delete(id) → void",
				returns: "void",
				description:
					"Deletes the specified linefill object. If it has already been deleted, does nothing.",
			},
			get_line1: {
				fullName: "linefill.get_line1",
				syntax: "linefill.get_line1(id) → series line",
				returns: "series line",
				description:
					"Returns the ID of the first line used in the id linefill.",
			},
			get_line2: {
				fullName: "linefill.get_line2",
				syntax: "linefill.get_line2(id) → series line",
				returns: "series line",
				description:
					"Returns the ID of the second line used in the id linefill.",
			},
			new: {
				fullName: "linefill.new",
				syntax: "linefill.new(line1, line2, color) → series linefill",
				returns: "series linefill",
				description:
					"Creates a new linefill object and displays it on the chart, filling the space between line1 and line2 with the color specified in color.",
			},
			set_color: {
				fullName: "linefill.set_color",
				syntax: "linefill.set_color(id, color) → void",
				returns: "void",
				description:
					"The function sets the color of the linefill object passed to it.",
			},
		},
		variables: {},
		constants: {},
	},
	polyline: {
		functions: {
			delete: {
				fullName: "polyline.delete",
				syntax: "polyline.delete(id) → void",
				returns: "void",
				description:
					"Deletes the specified polyline object. It has no effect if the id doesn't exist.",
			},
			new: {
				fullName: "polyline.new",
				syntax:
					"polyline.new(points, curved, closed, xloc, line_color, fill_color, line_style, line_width, force_overlay) → series polyline",
				returns: "series polyline",
				description:
					"Creates a new polyline instance and displays it on the chart, sequentially connecting all of the points in the points array with line segments. The segments in the drawing can be straight or curved depending on the curved parameter.",
			},
		},
		variables: {},
		constants: {},
	},
	session: {
		functions: {},
		variables: {},
		constants: {
			extended: {
				fullName: "session.extended",
				type: "string",
			},
			regular: {
				fullName: "session.regular",
				type: "string",
			},
		},
	},
	strategy: {
		functions: {
			cancel: {
				fullName: "strategy.cancel",
				syntax: "strategy.cancel(id) → void",
				returns: "void",
				description:
					"Cancels a pending or unfilled order with a specific identifier. If multiple unfilled orders share the same ID, calling this command with that ID as the id argument cancels all of them. If a script calls this command with an id representing the ID of a filled order, it has no effect.",
			},
			cancel_all: {
				fullName: "strategy.cancel_all",
				syntax: "strategy.cancel_all() → void",
				returns: "void",
				description:
					"Cancels all pending or unfilled orders, regardless of their identifiers.",
			},
			close: {
				fullName: "strategy.close",
				syntax:
					"strategy.close(id, comment, qty, qty_percent, alert_message, immediately, disable_alert) → void",
				returns: "void",
				description:
					"Creates an order to exit from the part of a position opened by entry orders with a specific identifier. If multiple entries in the position share the same ID, the orders from this command apply to all those entries, starting from the first open trade, when its calls use that ID as the id argument.",
			},
			close_all: {
				fullName: "strategy.close_all",
				syntax:
					"strategy.close_all(comment, alert_message, immediately, disable_alert) → void",
				returns: "void",
				description:
					"Creates an order to close an open position completely, regardless of the identifiers of the entry orders that opened or added to it.",
			},
			"closedtrades.commission": {
				fullName: "strategy.closedtrades.commission",
				syntax: "strategy.closedtrades.commission(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the sum of entry and exit fees paid in the closed trade, expressed in strategy.account_currency.",
			},
			"closedtrades.entry_bar_index": {
				fullName: "strategy.closedtrades.entry_bar_index",
				syntax: "strategy.closedtrades.entry_bar_index(trade_num) → series int",
				returns: "series int",
				description: "Returns the bar_index of the closed trade's entry.",
			},
			"closedtrades.entry_comment": {
				fullName: "strategy.closedtrades.entry_comment",
				syntax:
					"strategy.closedtrades.entry_comment(trade_num) → series string",
				returns: "series string",
				description:
					"Returns the comment message of the closed trade's entry, or na if there is no entry with this trade_num.",
			},
			"closedtrades.entry_id": {
				fullName: "strategy.closedtrades.entry_id",
				syntax: "strategy.closedtrades.entry_id(trade_num) → series string",
				returns: "series string",
				description: "Returns the id of the closed trade's entry.",
			},
			"closedtrades.entry_price": {
				fullName: "strategy.closedtrades.entry_price",
				syntax: "strategy.closedtrades.entry_price(trade_num) → series float",
				returns: "series float",
				description: "Returns the price of the closed trade's entry.",
			},
			"closedtrades.entry_time": {
				fullName: "strategy.closedtrades.entry_time",
				syntax: "strategy.closedtrades.entry_time(trade_num) → series int",
				returns: "series int",
				description:
					"Returns the UNIX time of the closed trade's entry, expressed in milliseconds..",
			},
			"closedtrades.exit_bar_index": {
				fullName: "strategy.closedtrades.exit_bar_index",
				syntax: "strategy.closedtrades.exit_bar_index(trade_num) → series int",
				returns: "series int",
				description: "Returns the bar_index of the closed trade's exit.",
			},
			"closedtrades.exit_comment": {
				fullName: "strategy.closedtrades.exit_comment",
				syntax: "strategy.closedtrades.exit_comment(trade_num) → series string",
				returns: "series string",
				description:
					"Returns the comment message of the closed trade's exit, or na if there is no entry with this trade_num.",
			},
			"closedtrades.exit_id": {
				fullName: "strategy.closedtrades.exit_id",
				syntax: "strategy.closedtrades.exit_id(trade_num) → series string",
				returns: "series string",
				description: "Returns the id of the closed trade's exit.",
			},
			"closedtrades.exit_price": {
				fullName: "strategy.closedtrades.exit_price",
				syntax: "strategy.closedtrades.exit_price(trade_num) → series float",
				returns: "series float",
				description: "Returns the price of the closed trade's exit.",
			},
			"closedtrades.exit_time": {
				fullName: "strategy.closedtrades.exit_time",
				syntax: "strategy.closedtrades.exit_time(trade_num) → series int",
				returns: "series int",
				description:
					"Returns the UNIX time of the closed trade's exit, expressed in milliseconds.",
			},
			"closedtrades.max_drawdown": {
				fullName: "strategy.closedtrades.max_drawdown",
				syntax: "strategy.closedtrades.max_drawdown(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the maximum drawdown of the closed trade, i.e., the maximum possible loss during the trade, expressed in strategy.account_currency.",
			},
			"closedtrades.max_drawdown_percent": {
				fullName: "strategy.closedtrades.max_drawdown_percent",
				syntax:
					"strategy.closedtrades.max_drawdown_percent(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the maximum drawdown of the closed trade, i.e., the maximum possible loss during the trade, expressed as a percentage and calculated by formula: Lowest Value During Trade / (Entry Price x Quantity) * 100.",
			},
			"closedtrades.max_runup": {
				fullName: "strategy.closedtrades.max_runup",
				syntax: "strategy.closedtrades.max_runup(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the maximum run up of the closed trade, i.e., the maximum possible profit during the trade, expressed in strategy.account_currency.",
			},
			"closedtrades.max_runup_percent": {
				fullName: "strategy.closedtrades.max_runup_percent",
				syntax:
					"strategy.closedtrades.max_runup_percent(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the maximum run-up of the closed trade, i.e., the maximum possible profit during the trade, expressed as a percentage and calculated by formula: Highest Value During Trade / (Entry Price x Quantity) * 100.",
			},
			"closedtrades.profit": {
				fullName: "strategy.closedtrades.profit",
				syntax: "strategy.closedtrades.profit(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the profit/loss of the closed trade in the strategy's account currency, reduced by the trade's commissions. A positive returned value represents a profit, and a negative value represents a loss.",
			},
			"closedtrades.profit_percent": {
				fullName: "strategy.closedtrades.profit_percent",
				syntax:
					"strategy.closedtrades.profit_percent(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the profit/loss value of the closed trade, expressed as a percentage. Losses are expressed as negative values.",
			},
			"closedtrades.size": {
				fullName: "strategy.closedtrades.size",
				syntax: "strategy.closedtrades.size(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the direction and the number of contracts traded in the closed trade. If the value is > 0, the market position was long. If the value is < 0, the market position was short.",
			},
			convert_to_account: {
				fullName: "strategy.convert_to_account",
				syntax: "strategy.convert_to_account(value) → series float",
				returns: "series float",
				description:
					"Converts the value from the currency that the symbol on the chart is traded in (syminfo.currency) to the currency used by the strategy (strategy.account_currency).",
			},
			convert_to_symbol: {
				fullName: "strategy.convert_to_symbol",
				syntax: "strategy.convert_to_symbol(value) → series float",
				returns: "series float",
				description:
					"Converts the value from the currency used by the strategy (strategy.account_currency) to the currency that the symbol on the chart is traded in (syminfo.currency).",
			},
			default_entry_qty: {
				fullName: "strategy.default_entry_qty",
				syntax: "strategy.default_entry_qty(fill_price) → series float",
				returns: "series float",
				description:
					'Calculates the default quantity, in units, of an entry order from strategy.entry() or strategy.order() if it were to fill at the specified fill_price value. The calculation depends on several strategy properties, including default_qty_type, default_qty_value, currency, and other parameters in the strategy() function and their representation in the "Properties" tab of the strategy\'s settings.',
			},
			entry: {
				fullName: "strategy.entry",
				syntax:
					"strategy.entry(id, direction, qty, limit, stop, oca_name, oca_type, comment, alert_message, disable_alert) → void",
				returns: "void",
				description:
					"Creates a new order to open or add to a position. If an unfilled order with the same id exists, a call to this command modifies that order.",
			},
			exit: {
				fullName: "strategy.exit",
				syntax:
					"strategy.exit(id, from_entry, qty, qty_percent, profit, limit, loss, stop, trail_price, trail_points, trail_offset, oca_name, comment, comment_profit, comment_loss, comment_trailing, alert_message, alert_profit, alert_loss, alert_trailing, disable_alert) → void",
				returns: "void",
				description:
					"Creates price-based orders to exit from an open position. If unfilled exit orders with the same id exist, calls to this command modify those orders. This command can generate more than one type of exit order, depending on the specified parameters. However, it does not create market orders. To exit from a position with a market order, use strategy.close() or strategy.close_all().",
			},
			"opentrades.commission": {
				fullName: "strategy.opentrades.commission",
				syntax: "strategy.opentrades.commission(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the sum of entry and exit fees paid in the open trade, expressed in strategy.account_currency.",
			},
			"opentrades.entry_bar_index": {
				fullName: "strategy.opentrades.entry_bar_index",
				syntax: "strategy.opentrades.entry_bar_index(trade_num) → series int",
				returns: "series int",
				description: "Returns the bar_index of the open trade's entry.",
			},
			"opentrades.entry_comment": {
				fullName: "strategy.opentrades.entry_comment",
				syntax: "strategy.opentrades.entry_comment(trade_num) → series string",
				returns: "series string",
				description:
					"Returns the comment message of the open trade's entry, or na if there is no entry with this trade_num.",
			},
			"opentrades.entry_id": {
				fullName: "strategy.opentrades.entry_id",
				syntax: "strategy.opentrades.entry_id(trade_num) → series string",
				returns: "series string",
				description: "Returns the id of the open trade's entry.",
			},
			"opentrades.entry_price": {
				fullName: "strategy.opentrades.entry_price",
				syntax: "strategy.opentrades.entry_price(trade_num) → series float",
				returns: "series float",
				description: "Returns the price of the open trade's entry.",
			},
			"opentrades.entry_time": {
				fullName: "strategy.opentrades.entry_time",
				syntax: "strategy.opentrades.entry_time(trade_num) → series int",
				returns: "series int",
				description:
					"Returns the UNIX time of the open trade's entry, expressed in milliseconds.",
			},
			"opentrades.max_drawdown": {
				fullName: "strategy.opentrades.max_drawdown",
				syntax: "strategy.opentrades.max_drawdown(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the maximum drawdown of the open trade, i.e., the maximum possible loss during the trade, expressed in strategy.account_currency.",
			},
			"opentrades.max_drawdown_percent": {
				fullName: "strategy.opentrades.max_drawdown_percent",
				syntax:
					"strategy.opentrades.max_drawdown_percent(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the maximum drawdown of the open trade, i.e., the maximum possible loss during the trade, expressed as a percentage and calculated by formula: Lowest Value During Trade / (Entry Price x Quantity) * 100.",
			},
			"opentrades.max_runup": {
				fullName: "strategy.opentrades.max_runup",
				syntax: "strategy.opentrades.max_runup(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the maximum run up of the open trade, i.e., the maximum possible profit during the trade, expressed in strategy.account_currency.",
			},
			"opentrades.max_runup_percent": {
				fullName: "strategy.opentrades.max_runup_percent",
				syntax:
					"strategy.opentrades.max_runup_percent(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the maximum run-up of the open trade, i.e., the maximum possible profit during the trade, expressed as a percentage and calculated by formula: Highest Value During Trade / (Entry Price x Quantity) * 100.",
			},
			"opentrades.profit": {
				fullName: "strategy.opentrades.profit",
				syntax: "strategy.opentrades.profit(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the profit/loss of the open trade, expressed in strategy.account_currency. Losses are expressed as negative values.",
			},
			"opentrades.profit_percent": {
				fullName: "strategy.opentrades.profit_percent",
				syntax: "strategy.opentrades.profit_percent(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the profit/loss of the open trade, expressed as a percentage. Losses are expressed as negative values.",
			},
			"opentrades.size": {
				fullName: "strategy.opentrades.size",
				syntax: "strategy.opentrades.size(trade_num) → series float",
				returns: "series float",
				description:
					"Returns the direction and the number of contracts traded in the open trade. If the value is > 0, the market position was long. If the value is < 0, the market position was short.",
			},
			order: {
				fullName: "strategy.order",
				syntax:
					"strategy.order(id, direction, qty, limit, stop, oca_name, oca_type, comment, alert_message, disable_alert) → void",
				returns: "void",
				description:
					"Creates a new order to open, add to, or exit from a position. If an unfilled order with the same id exists, a call to this command modifies that order.",
			},
			"risk.allow_entry_in": {
				fullName: "strategy.risk.allow_entry_in",
				syntax: "strategy.risk.allow_entry_in(value) → void",
				returns: "void",
				description:
					"This function can be used to specify in which market direction the strategy.entry() function is allowed to open positions.",
			},
			"risk.max_cons_loss_days": {
				fullName: "strategy.risk.max_cons_loss_days",
				syntax: "strategy.risk.max_cons_loss_days(count, alert_message) → void",
				returns: "void",
				description:
					"The purpose of this rule is to cancel all pending orders, close all open positions and stop placing orders after a specified number of consecutive days with losses. The rule affects the whole strategy.",
			},
			"risk.max_drawdown": {
				fullName: "strategy.risk.max_drawdown",
				syntax: "strategy.risk.max_drawdown(value, type, alert_message) → void",
				returns: "void",
				description:
					"The purpose of this rule is to determine maximum drawdown. The rule affects the whole strategy. Once the maximum drawdown value is reached, all pending orders are cancelled, all open positions are closed and no new orders can be placed.",
			},
			"risk.max_intraday_filled_orders": {
				fullName: "strategy.risk.max_intraday_filled_orders",
				syntax:
					"strategy.risk.max_intraday_filled_orders(count, alert_message) → void",
				returns: "void",
				description:
					"The purpose of this rule is to determine maximum number of filled orders per 1 day (per 1 bar, if chart resolution is higher than 1 day). The rule affects the whole strategy. Once the maximum number of filled orders is reached, all pending orders are cancelled, all open positions are closed and no new orders can be placed till the end of the current trading session.",
			},
			"risk.max_intraday_loss": {
				fullName: "strategy.risk.max_intraday_loss",
				syntax:
					"strategy.risk.max_intraday_loss(value, type, alert_message) → void",
				returns: "void",
				description:
					"The maximum loss value allowed during a day. It is specified either in money (base currency), or in percentage of maximum intraday equity (0 -100).",
			},
			"risk.max_position_size": {
				fullName: "strategy.risk.max_position_size",
				syntax: "strategy.risk.max_position_size(contracts) → void",
				returns: "void",
				description:
					"The purpose of this rule is to determine maximum size of a market position. The rule affects the following function: strategy.entry(). The 'entry' quantity can be reduced (if needed) to such number of contracts/shares/lots/units, so the total position size doesn't exceed the value specified in 'strategy.risk.max_position_size'. If minimum possible quantity still violates the rule, the order will not be placed.",
			},
		},
		variables: {},
		constants: {
			cash: {
				fullName: "strategy.cash",
				type: "string",
			},
			"commission.cash_per_contract": {
				fullName: "strategy.commission.cash_per_contract",
				type: "string",
			},
			"commission.cash_per_order": {
				fullName: "strategy.commission.cash_per_order",
				type: "string",
			},
			"commission.percent": {
				fullName: "strategy.commission.percent",
				type: "string",
			},
			"direction.all": {
				fullName: "strategy.direction.all",
				type: "string",
			},
			"direction.long": {
				fullName: "strategy.direction.long",
				type: "string",
			},
			"direction.short": {
				fullName: "strategy.direction.short",
				type: "string",
			},
			fixed: {
				fullName: "strategy.fixed",
				type: "string",
			},
			long: {
				fullName: "strategy.long",
				type: "string",
			},
			"oca.cancel": {
				fullName: "strategy.oca.cancel",
				type: "string",
			},
			"oca.none": {
				fullName: "strategy.oca.none",
				type: "string",
			},
			"oca.reduce": {
				fullName: "strategy.oca.reduce",
				type: "string",
			},
			percent_of_equity: {
				fullName: "strategy.percent_of_equity",
				type: "string",
			},
			short: {
				fullName: "strategy.short",
				type: "string",
			},
		},
	},
	syminfo: {
		functions: {
			prefix: {
				fullName: "syminfo.prefix",
				syntax: "syminfo.prefix(symbol) → simple string",
				returns: "simple string",
				description: 'Returns exchange prefix of the symbol, e.g. "NASDAQ".',
			},
			ticker: {
				fullName: "syminfo.ticker",
				syntax: "syminfo.ticker(symbol) → simple string",
				returns: "simple string",
				description:
					'Returns symbol name without exchange prefix, e.g. "AAPL".',
			},
		},
		variables: {},
		constants: {},
	},
	ta: {
		functions: {
			alma: {
				fullName: "ta.alma",
				syntax: "ta.alma(series, length, offset, sigma, floor) → series float",
				returns: "series float",
				description:
					"Arnaud Legoux Moving Average. It uses Gaussian distribution as weights for moving average.",
			},
			atr: {
				fullName: "ta.atr",
				syntax: "ta.atr(length) → series float",
				returns: "series float",
				description:
					"Function atr (average true range) returns the RMA of true range. True range is max(high - low, abs(high - close[1]), abs(low - close[1])).",
			},
			barssince: {
				fullName: "ta.barssince",
				syntax: "ta.barssince(condition) → series int",
				returns: "series int",
				description:
					"Counts the number of bars since the last time the condition was true.",
			},
			bb: {
				fullName: "ta.bb",
				syntax:
					"ta.bb(series, length, mult) → [series float, series float, series float]",
				returns: "[series float, series float, series float]",
				description:
					"Bollinger Bands. A Bollinger Band is a technical analysis tool defined by a set of lines plotted two standard deviations (positively and negatively) away from a simple moving average (SMA) of the security's price, but can be adjusted to user preferences.",
			},
			bbw: {
				fullName: "ta.bbw",
				syntax: "ta.bbw(series, length, mult) → series float",
				returns: "series float",
				description:
					"Bollinger Bands Width. The Bollinger Band Width is the difference between the upper and the lower Bollinger Bands divided by the middle band.",
			},
			cci: {
				fullName: "ta.cci",
				syntax: "ta.cci(source, length) → series float",
				returns: "series float",
				description:
					"The CCI (commodity channel index) is calculated as the difference between the typical price of a commodity and its simple moving average, divided by the mean absolute deviation of the typical price. The index is scaled by an inverse factor of 0.015 to provide more readable numbers.",
			},
			change: {
				fullName: "ta.change",
				syntax: "ta.change(source, length) → series int",
				returns: "series int",
				description:
					"Compares the current source value to its value length bars ago and returns the difference.",
			},
			cmo: {
				fullName: "ta.cmo",
				syntax: "ta.cmo(series, length) → series float",
				returns: "series float",
				description:
					"Chande Momentum Oscillator. Calculates the difference between the sum of recent gains and the sum of recent losses and then divides the result by the sum of all price movement over the same period.",
			},
			cog: {
				fullName: "ta.cog",
				syntax: "ta.cog(source, length) → series float",
				returns: "series float",
				description:
					"The cog (center of gravity) is an indicator based on statistics and the Fibonacci golden ratio.",
			},
			correlation: {
				fullName: "ta.correlation",
				syntax: "ta.correlation(source1, source2, length) → series float",
				returns: "series float",
				description:
					"Correlation coefficient. Describes the degree to which two series tend to deviate from their ta.sma() values.",
			},
			cross: {
				fullName: "ta.cross",
				syntax: "ta.cross(source1, source2) → series bool",
				returns: "series bool",
				description: "",
			},
			crossover: {
				fullName: "ta.crossover",
				syntax: "ta.crossover(source1, source2) → series bool",
				returns: "series bool",
				description:
					"The source1-series is defined as having crossed over source2-series if, on the current bar, the value of source1 is greater than the value of source2, and on the previous bar, the value of source1 was less than or equal to the value of source2.",
			},
			crossunder: {
				fullName: "ta.crossunder",
				syntax: "ta.crossunder(source1, source2) → series bool",
				returns: "series bool",
				description:
					"The source1-series is defined as having crossed under source2-series if, on the current bar, the value of source1 is less than the value of source2, and on the previous bar, the value of source1 was greater than or equal to the value of source2.",
			},
			cum: {
				fullName: "ta.cum",
				syntax: "ta.cum(source) → series float",
				returns: "series float",
				description:
					"Cumulative (total) sum of source. In other words it's a sum of all elements of source.",
			},
			dev: {
				fullName: "ta.dev",
				syntax: "ta.dev(source, length) → series float",
				returns: "series float",
				description:
					"Measure of difference between the series and it's ta.sma()",
			},
			dmi: {
				fullName: "ta.dmi",
				syntax:
					"ta.dmi(diLength, adxSmoothing) → [series float, series float, series float]",
				returns: "[series float, series float, series float]",
				description: "The dmi function returns the directional movement index.",
			},
			ema: {
				fullName: "ta.ema",
				syntax: "ta.ema(source, length) → series float",
				returns: "series float",
				description:
					"The ema function returns the exponentially weighted moving average. In ema weighting factors decrease exponentially. It calculates by using a formula: EMA = alpha * source + (1 - alpha) * EMA[1], where alpha = 2 / (length + 1).",
			},
			falling: {
				fullName: "ta.falling",
				syntax: "ta.falling(source, length) → series bool",
				returns: "series bool",
				description:
					"Test if the source series is now falling for length bars long.",
			},
			highest: {
				fullName: "ta.highest",
				syntax: "ta.highest(source, length) → series float",
				returns: "series float",
				description: "Highest value for a given number of bars back.",
			},
			highestbars: {
				fullName: "ta.highestbars",
				syntax: "ta.highestbars(source, length) → series int",
				returns: "series int",
				description: "Highest value offset for a given number of bars back.",
			},
			hma: {
				fullName: "ta.hma",
				syntax: "ta.hma(source, length) → series float",
				returns: "series float",
				description: "The hma function returns the Hull Moving Average.",
			},
			kc: {
				fullName: "ta.kc",
				syntax:
					"ta.kc(series, length, mult, useTrueRange) → [series float, series float, series float]",
				returns: "[series float, series float, series float]",
				description:
					"Keltner Channels. Keltner channel is a technical analysis indicator showing a central moving average line plus channel lines at a distance above and below.",
			},
			kcw: {
				fullName: "ta.kcw",
				syntax: "ta.kcw(series, length, mult, useTrueRange) → series float",
				returns: "series float",
				description:
					"Keltner Channels Width. The Keltner Channels Width is the difference between the upper and the lower Keltner Channels divided by the middle channel.",
			},
			linreg: {
				fullName: "ta.linreg",
				syntax: "ta.linreg(source, length, offset) → series float",
				returns: "series float",
				description:
					"Linear regression curve. A line that best fits the prices specified over a user-defined time period. It is calculated using the least squares method. The result of this function is calculated using the formula: linreg = intercept + slope * (length - 1 - offset), where intercept and slope are the values calculated with the least squares method on source series.",
			},
			lowest: {
				fullName: "ta.lowest",
				syntax: "ta.lowest(source, length) → series float",
				returns: "series float",
				description: "Lowest value for a given number of bars back.",
			},
			lowestbars: {
				fullName: "ta.lowestbars",
				syntax: "ta.lowestbars(source, length) → series int",
				returns: "series int",
				description: "Lowest value offset for a given number of bars back.",
			},
			macd: {
				fullName: "ta.macd",
				syntax:
					"ta.macd(source, fastlen, slowlen, siglen) → [series float, series float, series float]",
				returns: "[series float, series float, series float]",
				description:
					"MACD (moving average convergence/divergence). It is supposed to reveal changes in the strength, direction, momentum, and duration of a trend in a stock's price.",
			},
			max: {
				fullName: "ta.max",
				syntax: "ta.max(source) → series float",
				returns: "series float",
				description:
					"Returns the all-time high value of source from the beginning of the chart up to the current bar.",
			},
			median: {
				fullName: "ta.median",
				syntax: "ta.median(source, length) → series int",
				returns: "series int",
				description: "Returns the median of the series.",
			},
			mfi: {
				fullName: "ta.mfi",
				syntax: "ta.mfi(series, length) → series float",
				returns: "series float",
				description:
					"Money Flow Index. The Money Flow Index (MFI) is a technical oscillator that uses price and volume for identifying overbought or oversold conditions in an asset.",
			},
			min: {
				fullName: "ta.min",
				syntax: "ta.min(source) → series float",
				returns: "series float",
				description:
					"Returns the all-time low value of source from the beginning of the chart up to the current bar.",
			},
			mode: {
				fullName: "ta.mode",
				syntax: "ta.mode(source, length) → series int",
				returns: "series int",
				description:
					"Returns the mode of the series. If there are several values with the same frequency, it returns the smallest value.",
			},
			mom: {
				fullName: "ta.mom",
				syntax: "ta.mom(source, length) → series float",
				returns: "series float",
				description:
					"Momentum of source price and source price length bars ago. This is simply a difference: source - source[length].",
			},
			percentile_linear_interpolation: {
				fullName: "ta.percentile_linear_interpolation",
				syntax:
					"ta.percentile_linear_interpolation(source, length, percentage) → series float",
				returns: "series float",
				description:
					"Calculates percentile using method of linear interpolation between the two nearest ranks.",
			},
			percentile_nearest_rank: {
				fullName: "ta.percentile_nearest_rank",
				syntax:
					"ta.percentile_nearest_rank(source, length, percentage) → series float",
				returns: "series float",
				description: "Calculates percentile using method of Nearest Rank.",
			},
			percentrank: {
				fullName: "ta.percentrank",
				syntax: "ta.percentrank(source, length) → series float",
				returns: "series float",
				description:
					"Percent rank is the percents of how many previous values was less than or equal to the current value of given series.",
			},
			pivot_point_levels: {
				fullName: "ta.pivot_point_levels",
				syntax:
					"ta.pivot_point_levels(type, anchor, developing) → array<float>",
				returns: "array<float>",
				description:
					"Calculates the pivot point levels using the specified type and anchor.",
			},
			pivothigh: {
				fullName: "ta.pivothigh",
				syntax: "ta.pivothigh(leftbars, rightbars) → series float",
				returns: "series float",
				description:
					"This function returns price of the pivot high point. It returns 'NaN', if there was no pivot high point.",
			},
			pivotlow: {
				fullName: "ta.pivotlow",
				syntax: "ta.pivotlow(leftbars, rightbars) → series float",
				returns: "series float",
				description:
					"This function returns price of the pivot low point. It returns 'NaN', if there was no pivot low point.",
			},
			range: {
				fullName: "ta.range",
				syntax: "ta.range(source, length) → series int",
				returns: "series int",
				description:
					"Returns the difference between the min and max values in a series.",
			},
			rci: {
				fullName: "ta.rci",
				syntax: "ta.rci(source, length) → series float",
				returns: "series float",
				description:
					"Calculates the Rank Correlation Index (RCI), which measures the directional consistency of price movements. It evaluates the monotonic relationship between a source series and the bar index over length bars using Spearman's rank correlation coefficient. The resulting value is scaled to a range of -100 to 100, where 100 indicates the source consistently increased over the period, and -100 indicates it consistently decreased. Values between -100 and 100 reflect varying degrees of upward or downward consistency.",
			},
			rising: {
				fullName: "ta.rising",
				syntax: "ta.rising(source, length) → series bool",
				returns: "series bool",
				description:
					"Test if the source series is now rising for length bars long.",
			},
			rma: {
				fullName: "ta.rma",
				syntax: "ta.rma(source, length) → series float",
				returns: "series float",
				description:
					"Moving average used in RSI. It is the exponentially weighted moving average with alpha = 1 / length.",
			},
			roc: {
				fullName: "ta.roc",
				syntax: "ta.roc(source, length) → series float",
				returns: "series float",
				description:
					"Calculates the percentage of change (rate of change) between the current value of source and its value length bars ago.",
			},
			rsi: {
				fullName: "ta.rsi",
				syntax: "ta.rsi(source, length) → series float",
				returns: "series float",
				description:
					"Relative strength index. It is calculated using the ta.rma() of upward and downward changes of source over the last length bars.",
			},
			sar: {
				fullName: "ta.sar",
				syntax: "ta.sar(start, inc, max) → series float",
				returns: "series float",
				description:
					"Parabolic SAR (parabolic stop and reverse) is a method devised by J. Welles Wilder, Jr., to find potential reversals in the market price direction of traded goods.",
			},
			sma: {
				fullName: "ta.sma",
				syntax: "ta.sma(source, length) → series float",
				returns: "series float",
				description:
					"The sma function returns the moving average, that is the sum of last y values of x, divided by y.",
			},
			stdev: {
				fullName: "ta.stdev",
				syntax: "ta.stdev(source, length, biased) → series float",
				returns: "series float",
				description: "",
			},
			stoch: {
				fullName: "ta.stoch",
				syntax: "ta.stoch(source, high, low, length) → series float",
				returns: "series float",
				description:
					"Stochastic. It is calculated by a formula: 100 * (close - lowest(low, length)) / (highest(high, length) - lowest(low, length)).",
			},
			supertrend: {
				fullName: "ta.supertrend",
				syntax:
					"ta.supertrend(factor, atrPeriod) → [series float, series float]",
				returns: "[series float, series float]",
				description:
					"The Supertrend Indicator. The Supertrend is a trend following indicator.",
			},
			swma: {
				fullName: "ta.swma",
				syntax: "ta.swma(source) → series float",
				returns: "series float",
				description:
					"Symmetrically weighted moving average with fixed length: 4. Weights: [1/6, 2/6, 2/6, 1/6].",
			},
			tr: {
				fullName: "ta.tr",
				syntax: "ta.tr(handle_na) → series float",
				returns: "series float",
				description:
					"Calculates the current bar's true range. Unlike a bar's actual range (high - low), true range accounts for potential gaps by taking the maximum of the current bar's actual range and the absolute distances from the previous bar's close to the current bar's high and low. The formula is: math.max(high - low, math.abs(high - close[1]), math.abs(low - close[1])).",
			},
			tsi: {
				fullName: "ta.tsi",
				syntax: "ta.tsi(source, short_length, long_length) → series float",
				returns: "series float",
				description:
					"True strength index. It uses moving averages of the underlying momentum of a financial instrument.",
			},
			valuewhen: {
				fullName: "ta.valuewhen",
				syntax: "ta.valuewhen(condition, source, occurrence) → series color",
				returns: "series color",
				description:
					"Returns the value of the source series on the bar where the condition was true on the nth most recent occurrence.",
			},
			variance: {
				fullName: "ta.variance",
				syntax: "ta.variance(source, length, biased) → series float",
				returns: "series float",
				description:
					"Variance is the expectation of the squared deviation of a series from its mean (ta.sma()), and it informally measures how far a set of numbers are spread out from their mean.",
			},
			vwap: {
				fullName: "ta.vwap",
				syntax: "ta.vwap(source, anchor) → series float",
				returns: "series float",
				description: "Volume weighted average price.",
			},
			vwma: {
				fullName: "ta.vwma",
				syntax: "ta.vwma(source, length) → series float",
				returns: "series float",
				description:
					"The vwma function returns volume-weighted moving average of source for length bars back. It is the same as: sma(source * volume, length) / sma(volume, length).",
			},
			wma: {
				fullName: "ta.wma",
				syntax: "ta.wma(source, length) → series float",
				returns: "series float",
				description:
					"The wma function returns weighted moving average of source for length bars back. In wma weighting factors decrease in arithmetical progression.",
			},
			wpr: {
				fullName: "ta.wpr",
				syntax: "ta.wpr(length) → series float",
				returns: "series float",
				description:
					"Williams %R. The oscillator shows the current closing price in relation to the high and low of the past 'length' bars.",
			},
		},
		variables: {},
		constants: {},
	},
	table: {
		functions: {
			cell: {
				fullName: "table.cell",
				syntax:
					"table.cell(table_id, column, row, text, width, height, text_color, text_halign, text_valign, text_size, bgcolor, tooltip, text_font_family, text_formatting) → void",
				returns: "void",
				description:
					"The function defines a cell in the table and sets its attributes.",
			},
			cell_set_bgcolor: {
				fullName: "table.cell_set_bgcolor",
				syntax: "table.cell_set_bgcolor(table_id, column, row, bgcolor) → void",
				returns: "void",
				description: "The function sets the background color of the cell.",
			},
			cell_set_height: {
				fullName: "table.cell_set_height",
				syntax: "table.cell_set_height(table_id, column, row, height) → void",
				returns: "void",
				description: "The function sets the height of cell.",
			},
			cell_set_text: {
				fullName: "table.cell_set_text",
				syntax: "table.cell_set_text(table_id, column, row, text) → void",
				returns: "void",
				description: "The function sets the text in the specified cell.",
			},
			cell_set_text_color: {
				fullName: "table.cell_set_text_color",
				syntax:
					"table.cell_set_text_color(table_id, column, row, text_color) → void",
				returns: "void",
				description: "The function sets the color of the text inside the cell.",
			},
			cell_set_text_font_family: {
				fullName: "table.cell_set_text_font_family",
				syntax:
					"table.cell_set_text_font_family(table_id, column, row, text_font_family) → void",
				returns: "void",
				description:
					"The function sets the font family of the text inside the cell.",
			},
			cell_set_text_formatting: {
				fullName: "table.cell_set_text_formatting",
				syntax:
					"table.cell_set_text_formatting(table_id, column, row, text_formatting) → void",
				returns: "void",
				description:
					"Sets the formatting attributes the drawing applies to displayed text.",
			},
			cell_set_text_halign: {
				fullName: "table.cell_set_text_halign",
				syntax:
					"table.cell_set_text_halign(table_id, column, row, text_halign) → void",
				returns: "void",
				description:
					"The function sets the horizontal alignment of the cell's text.",
			},
			cell_set_text_size: {
				fullName: "table.cell_set_text_size",
				syntax:
					"table.cell_set_text_size(table_id, column, row, text_size) → void",
				returns: "void",
				description: "The function sets the size of the cell's text.",
			},
			cell_set_text_valign: {
				fullName: "table.cell_set_text_valign",
				syntax:
					"table.cell_set_text_valign(table_id, column, row, text_valign) → void",
				returns: "void",
				description:
					"The function sets the vertical alignment of a cell's text.",
			},
			cell_set_tooltip: {
				fullName: "table.cell_set_tooltip",
				syntax: "table.cell_set_tooltip(table_id, column, row, tooltip) → void",
				returns: "void",
				description: "The function sets the tooltip in the specified cell.",
			},
			cell_set_width: {
				fullName: "table.cell_set_width",
				syntax: "table.cell_set_width(table_id, column, row, width) → void",
				returns: "void",
				description: "The function sets the width of the cell.",
			},
			clear: {
				fullName: "table.clear",
				syntax:
					"table.clear(table_id, start_column, start_row, end_column, end_row) → void",
				returns: "void",
				description:
					"The function removes a cell or a sequence of cells from the table. The cells are removed in a rectangle shape where the start_column and start_row specify the top-left corner, and end_column and end_row specify the bottom-right corner.",
			},
			delete: {
				fullName: "table.delete",
				syntax: "table.delete(table_id) → void",
				returns: "void",
				description: "The function deletes a table.",
			},
			merge_cells: {
				fullName: "table.merge_cells",
				syntax:
					"table.merge_cells(table_id, start_column, start_row, end_column, end_row) → void",
				returns: "void",
				description:
					"The function merges a sequence of cells in the table into one cell. The cells are merged in a rectangle shape where the start_column and start_row specify the top-left corner, and end_column and end_row specify the bottom-right corner.",
			},
			new: {
				fullName: "table.new",
				syntax:
					"table.new(position, columns, rows, bgcolor, frame_color, frame_width, border_color, border_width, force_overlay) → series table",
				returns: "series table",
				description: "The function creates a new table.",
			},
			set_bgcolor: {
				fullName: "table.set_bgcolor",
				syntax: "table.set_bgcolor(table_id, bgcolor) → void",
				returns: "void",
				description: "The function sets the background color of a table.",
			},
			set_border_color: {
				fullName: "table.set_border_color",
				syntax: "table.set_border_color(table_id, border_color) → void",
				returns: "void",
				description:
					"The function sets the color of the borders (excluding the outer frame) of the table's cells.",
			},
			set_border_width: {
				fullName: "table.set_border_width",
				syntax: "table.set_border_width(table_id, border_width) → void",
				returns: "void",
				description:
					"The function sets the width of the borders (excluding the outer frame) of the table's cells.",
			},
			set_frame_color: {
				fullName: "table.set_frame_color",
				syntax: "table.set_frame_color(table_id, frame_color) → void",
				returns: "void",
				description:
					"The function sets the color of the outer frame of a table.",
			},
			set_frame_width: {
				fullName: "table.set_frame_width",
				syntax: "table.set_frame_width(table_id, frame_width) → void",
				returns: "void",
				description:
					"The function set the width of the outer frame of a table.",
			},
			set_position: {
				fullName: "table.set_position",
				syntax: "table.set_position(table_id, position) → void",
				returns: "void",
				description: "The function sets the position of a table.",
			},
		},
		variables: {},
		constants: {},
	},
	timeframe: {
		functions: {
			change: {
				fullName: "timeframe.change",
				syntax: "timeframe.change(timeframe) → series bool",
				returns: "series bool",
				description: "Detects changes in the specified timeframe.",
			},
			from_seconds: {
				fullName: "timeframe.from_seconds",
				syntax: "timeframe.from_seconds(seconds) → simple string",
				returns: "simple string",
				description:
					"Converts a number of seconds into a valid timeframe string.",
			},
			in_seconds: {
				fullName: "timeframe.in_seconds",
				syntax: "timeframe.in_seconds(timeframe) → simple int",
				returns: "simple int",
				description: "Converts a timeframe string into seconds.",
			},
		},
		variables: {},
		constants: {},
	},
	array: {
		functions: {
			abs: {
				fullName: "array.abs",
				syntax: "array.abs(id) → array<float>",
				returns: "array<float>",
				description:
					"Returns an array containing the absolute value of each element in the original array.",
			},
			avg: {
				fullName: "array.avg",
				syntax: "array.avg(id) → series float",
				returns: "series float",
				description: "The function returns the mean of an array's elements.",
			},
			binary_search: {
				fullName: "array.binary_search",
				syntax: "array.binary_search(id, val) → series int",
				returns: "series int",
				description:
					"The function returns the index of the value, or -1 if the value is not found. The array to search must be sorted in ascending order.",
			},
			binary_search_leftmost: {
				fullName: "array.binary_search_leftmost",
				syntax: "array.binary_search_leftmost(id, val) → series int",
				returns: "series int",
				description:
					"The function returns the index of the value if it is found. When the value is not found, the function returns the index of the next smallest element to the left of where the value would lie if it was in the array. The array to search must be sorted in ascending order.",
			},
			binary_search_rightmost: {
				fullName: "array.binary_search_rightmost",
				syntax: "array.binary_search_rightmost(id, val) → series int",
				returns: "series int",
				description:
					"The function returns the index of the value if it is found. When the value is not found, the function returns the index of the element to the right of where the value would lie if it was in the array. The array must be sorted in ascending order.",
			},
			clear: {
				fullName: "array.clear",
				syntax: "array.clear(id) → void",
				returns: "void",
				description: "The function removes all elements from an array.",
			},
			concat: {
				fullName: "array.concat",
				syntax: "array.concat(id1, id2) → array<type>",
				returns: "array<type>",
				description:
					"The function is used to merge two arrays. It pushes all elements from the second array to the first array, and returns the first array.",
			},
			copy: {
				fullName: "array.copy",
				syntax: "array.copy(id) → array<type>",
				returns: "array<type>",
				description: "The function creates a copy of an existing array.",
			},
			covariance: {
				fullName: "array.covariance",
				syntax: "array.covariance(id1, id2, biased) → series float",
				returns: "series float",
				description: "The function returns the covariance of two arrays.",
			},
			every: {
				fullName: "array.every",
				syntax: "array.every(id) → series bool",
				returns: "series bool",
				description:
					"Returns true if all elements of the id array are true, false otherwise.",
			},
			fill: {
				fullName: "array.fill",
				syntax: "array.fill(id, value, index_from, index_to) → void",
				returns: "void",
				description:
					"The function sets elements of an array to a single value. If no index is specified, all elements are set. If only a start index (default 0) is supplied, the elements starting at that index are set. If both index parameters are used, the elements from the starting index up to but not including the end index (default na) are set.",
			},
			first: {
				fullName: "array.first",
				syntax: "array.first(id) → series <type>",
				returns: "series <type>",
				description:
					"Returns the array's first element. Throws a runtime error if the array is empty.",
			},
			from: {
				fullName: "array.from",
				syntax: "array.from(arg0, arg1, ...) → array<type>",
				returns: "array<type>",
				description:
					"The function takes a variable number of arguments with one of the types: int, float, bool, string, label, line, color, box, table, linefill, and returns an array of the corresponding type.",
			},
			get: {
				fullName: "array.get",
				syntax: "array.get(id, index) → series <type>",
				returns: "series <type>",
				description:
					"The function returns the value of the element at the specified index.",
			},
			includes: {
				fullName: "array.includes",
				syntax: "array.includes(id, value) → series bool",
				returns: "series bool",
				description:
					"The function returns true if the value was found in an array, false otherwise.",
			},
			indexof: {
				fullName: "array.indexof",
				syntax: "array.indexof(id, value) → series int",
				returns: "series int",
				description:
					"The function returns the index of the first occurrence of the value, or -1 if the value is not found.",
			},
			insert: {
				fullName: "array.insert",
				syntax: "array.insert(id, index, value) → void",
				returns: "void",
				description:
					"The function changes the contents of an array by adding new elements in place.",
			},
			join: {
				fullName: "array.join",
				syntax: "array.join(id, separator) → series string",
				returns: "series string",
				description:
					"The function creates and returns a new string by concatenating all the elements of an array, separated by the specified separator string.",
			},
			last: {
				fullName: "array.last",
				syntax: "array.last(id) → series <type>",
				returns: "series <type>",
				description:
					"Returns the array's last element. Throws a runtime error if the array is empty.",
			},
			lastindexof: {
				fullName: "array.lastindexof",
				syntax: "array.lastindexof(id, value) → series int",
				returns: "series int",
				description:
					"The function returns the index of the last occurrence of the value, or -1 if the value is not found.",
			},
			max: {
				fullName: "array.max",
				syntax: "array.max(id, nth) → series float",
				returns: "series float",
				description:
					"The function returns the greatest value, or the nth greatest value in a given array.",
			},
			median: {
				fullName: "array.median",
				syntax: "array.median(id) → series float",
				returns: "series float",
				description: "The function returns the median of an array's elements.",
			},
			min: {
				fullName: "array.min",
				syntax: "array.min(id, nth) → series float",
				returns: "series float",
				description:
					"The function returns the smallest value, or the nth smallest value in a given array.",
			},
			mode: {
				fullName: "array.mode",
				syntax: "array.mode(id) → series float",
				returns: "series float",
				description:
					"The function returns the mode of an array's elements. If there are several values with the same frequency, it returns the smallest value.",
			},
			"new<type>": {
				fullName: "array.new<type>",
				syntax: "array.new<type>(size, initial_value) → array<type>",
				returns: "array<type>",
				description:
					"The function creates a new array object of <type> elements.",
			},
			new_bool: {
				fullName: "array.new_bool",
				syntax: "array.new_bool(size, initial_value) → array<bool>",
				returns: "array<bool>",
				description:
					"The function creates a new array object of bool type elements.",
			},
			new_box: {
				fullName: "array.new_box",
				syntax: "array.new_box(size, initial_value) → array<box>",
				returns: "array<box>",
				description:
					"The function creates a new array object of box type elements.",
			},
			new_color: {
				fullName: "array.new_color",
				syntax: "array.new_color(size, initial_value) → array<color>",
				returns: "array<color>",
				description:
					"The function creates a new array object of color type elements.",
			},
			new_float: {
				fullName: "array.new_float",
				syntax: "array.new_float(size, initial_value) → array<float>",
				returns: "array<float>",
				description:
					"The function creates a new array object of float type elements.",
			},
			new_int: {
				fullName: "array.new_int",
				syntax: "array.new_int(size, initial_value) → array<int>",
				returns: "array<int>",
				description:
					"The function creates a new array object of int type elements.",
			},
			new_label: {
				fullName: "array.new_label",
				syntax: "array.new_label(size, initial_value) → array<label>",
				returns: "array<label>",
				description:
					"The function creates a new array object of label type elements.",
			},
			new_line: {
				fullName: "array.new_line",
				syntax: "array.new_line(size, initial_value) → array<line>",
				returns: "array<line>",
				description:
					"The function creates a new array object of line type elements.",
			},
			new_linefill: {
				fullName: "array.new_linefill",
				syntax: "array.new_linefill(size, initial_value) → array<linefill>",
				returns: "array<linefill>",
				description:
					"The function creates a new array object of linefill type elements.",
			},
			new_string: {
				fullName: "array.new_string",
				syntax: "array.new_string(size, initial_value) → array<string>",
				returns: "array<string>",
				description:
					"The function creates a new array object of string type elements.",
			},
			new_table: {
				fullName: "array.new_table",
				syntax: "array.new_table(size, initial_value) → array<table>",
				returns: "array<table>",
				description:
					"The function creates a new array object of table type elements.",
			},
			percentile_linear_interpolation: {
				fullName: "array.percentile_linear_interpolation",
				syntax:
					"array.percentile_linear_interpolation(id, percentage) → series float",
				returns: "series float",
				description:
					"Returns the value for which the specified percentage of array values (percentile) are less than or equal to it, using linear interpolation.",
			},
			percentile_nearest_rank: {
				fullName: "array.percentile_nearest_rank",
				syntax: "array.percentile_nearest_rank(id, percentage) → series float",
				returns: "series float",
				description:
					"Returns the value for which the specified percentage of array values (percentile) are less than or equal to it, using the nearest-rank method.",
			},
			percentrank: {
				fullName: "array.percentrank",
				syntax: "array.percentrank(id, index) → series float",
				returns: "series float",
				description:
					"Returns the percentile rank of the element at the specified index.",
			},
			pop: {
				fullName: "array.pop",
				syntax: "array.pop(id) → series <type>",
				returns: "series <type>",
				description:
					"The function removes the last element from an array and returns its value.",
			},
			push: {
				fullName: "array.push",
				syntax: "array.push(id, value) → void",
				returns: "void",
				description: "The function appends a value to an array.",
			},
			range: {
				fullName: "array.range",
				syntax: "array.range(id) → series float",
				returns: "series float",
				description:
					"The function returns the difference between the min and max values from a given array.",
			},
			remove: {
				fullName: "array.remove",
				syntax: "array.remove(id, index) → series <type>",
				returns: "series <type>",
				description:
					"The function changes the contents of an array by removing the element with the specified index.",
			},
			reverse: {
				fullName: "array.reverse",
				syntax: "array.reverse(id) → void",
				returns: "void",
				description:
					"The function reverses an array. The first array element becomes the last, and the last array element becomes the first.",
			},
			set: {
				fullName: "array.set",
				syntax: "array.set(id, index, value) → void",
				returns: "void",
				description:
					"The function sets the value of the element at the specified index.",
			},
			shift: {
				fullName: "array.shift",
				syntax: "array.shift(id) → series <type>",
				returns: "series <type>",
				description:
					"The function removes an array's first element and returns its value.",
			},
			size: {
				fullName: "array.size",
				syntax: "array.size(id) → series int",
				returns: "series int",
				description: "The function returns the number of elements in an array.",
			},
			slice: {
				fullName: "array.slice",
				syntax: "array.slice(id, index_from, index_to) → array<type>",
				returns: "array<type>",
				description:
					"The function creates a slice from an existing array. If an object from the slice changes, the changes are applied to both the new and the original arrays.",
			},
			some: {
				fullName: "array.some",
				syntax: "array.some(id) → series bool",
				returns: "series bool",
				description:
					"Returns true if at least one element of the id array is true, false otherwise.",
			},
			sort: {
				fullName: "array.sort",
				syntax: "array.sort(id, order) → void",
				returns: "void",
				description: "The function sorts the elements of an array.",
			},
			sort_indices: {
				fullName: "array.sort_indices",
				syntax: "array.sort_indices(id, order) → array<int>",
				returns: "array<int>",
				description:
					"Returns an array of indices which, when used to index the original array, will access its elements in their sorted order. It does not modify the original array.",
			},
			standardize: {
				fullName: "array.standardize",
				syntax: "array.standardize(id) → array<float>",
				returns: "array<float>",
				description: "The function returns the array of standardized elements.",
			},
			stdev: {
				fullName: "array.stdev",
				syntax: "array.stdev(id, biased) → series float",
				returns: "series float",
				description:
					"The function returns the standard deviation of an array's elements.",
			},
			sum: {
				fullName: "array.sum",
				syntax: "array.sum(id) → series float",
				returns: "series float",
				description: "The function returns the sum of an array's elements.",
			},
			unshift: {
				fullName: "array.unshift",
				syntax: "array.unshift(id, value) → void",
				returns: "void",
				description:
					"The function inserts the value at the beginning of the array.",
			},
			variance: {
				fullName: "array.variance",
				syntax: "array.variance(id, biased) → series float",
				returns: "series float",
				description:
					"The function returns the variance of an array's elements.",
			},
		},
		variables: {},
		constants: {},
	},
	color: {
		functions: {
			b: {
				fullName: "color.b",
				syntax: "color.b(color) → const float",
				returns: "const float",
				description: "Retrieves the value of the color's blue component.",
			},
			from_gradient: {
				fullName: "color.from_gradient",
				syntax:
					"color.from_gradient(value, bottom_value, top_value, bottom_color, top_color) → series color",
				returns: "series color",
				description:
					"Based on the relative position of value in the bottom_value to top_value range, the function returns a color from the gradient defined by bottom_color to top_color.",
			},
			g: {
				fullName: "color.g",
				syntax: "color.g(color) → const float",
				returns: "const float",
				description: "Retrieves the value of the color's green component.",
			},
			new: {
				fullName: "color.new",
				syntax: "color.new(color, transp) → const color",
				returns: "const color",
				description:
					"Function color applies the specified transparency to the given color.",
			},
			r: {
				fullName: "color.r",
				syntax: "color.r(color) → const float",
				returns: "const float",
				description: "Retrieves the value of the color's red component.",
			},
			rgb: {
				fullName: "color.rgb",
				syntax: "color.rgb(red, green, blue, transp) → const color",
				returns: "const color",
				description:
					"Creates a new color with transparency using the RGB color model.",
			},
			t: {
				fullName: "color.t",
				syntax: "color.t(color) → const float",
				returns: "const float",
				description: "Retrieves the color's transparency.",
			},
		},
		variables: {},
		constants: {
			aqua: {
				fullName: "color.aqua",
				type: "color",
			},
			black: {
				fullName: "color.black",
				type: "color",
			},
			blue: {
				fullName: "color.blue",
				type: "color",
			},
			fuchsia: {
				fullName: "color.fuchsia",
				type: "color",
			},
			gray: {
				fullName: "color.gray",
				type: "color",
			},
			green: {
				fullName: "color.green",
				type: "color",
			},
			lime: {
				fullName: "color.lime",
				type: "color",
			},
			maroon: {
				fullName: "color.maroon",
				type: "color",
			},
			navy: {
				fullName: "color.navy",
				type: "color",
			},
			olive: {
				fullName: "color.olive",
				type: "color",
			},
			orange: {
				fullName: "color.orange",
				type: "color",
			},
			purple: {
				fullName: "color.purple",
				type: "color",
			},
			red: {
				fullName: "color.red",
				type: "color",
			},
			silver: {
				fullName: "color.silver",
				type: "color",
			},
			teal: {
				fullName: "color.teal",
				type: "color",
			},
			white: {
				fullName: "color.white",
				type: "color",
			},
			yellow: {
				fullName: "color.yellow",
				type: "color",
			},
		},
	},
	input: {
		functions: {
			bool: {
				fullName: "input.bool",
				syntax:
					"input.bool(defval, title, tooltip, inline, group, confirm, display, active) → input bool",
				returns: "input bool",
				description:
					"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a checkmark to the script's inputs.",
			},
			color: {
				fullName: "input.color",
				syntax:
					"input.color(defval, title, tooltip, inline, group, confirm, display, active) → input color",
				returns: "input color",
				description:
					"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a color picker that allows the user to select a color and transparency, either from a palette or a hex value.",
			},
			enum: {
				fullName: "input.enum",
				syntax:
					"input.enum(defval, title, options, tooltip, inline, group, confirm, display, active) → input enum",
				returns: "input enum",
				description:
					"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a dropdown with options based on the enum fields passed to its defval and options parameters.",
			},
			float: {
				fullName: "input.float",
				syntax:
					"input.float(defval, title, options, tooltip, inline, group, confirm, display, active) → input float",
				returns: "input float",
				description:
					"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for a float input to the script's inputs.",
			},
			int: {
				fullName: "input.int",
				syntax:
					"input.int(defval, title, options, tooltip, inline, group, confirm, display, active) → input int",
				returns: "input int",
				description:
					"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for an integer input to the script's inputs.",
			},
			price: {
				fullName: "input.price",
				syntax:
					"input.price(defval, title, tooltip, inline, group, confirm, display, active) → input float",
				returns: "input float",
				description:
					'Adds a price input to the script\'s "Settings/Inputs" tab. The user can change the price in the settings or by selecting the indicator and dragging the price line.',
			},
			session: {
				fullName: "input.session",
				syntax:
					"input.session(defval, title, options, tooltip, inline, group, confirm, display, active) → input string",
				returns: "input string",
				description:
					"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds two dropdowns that allow the user to specify the beginning and the end of a session using the session selector and returns the result as a string.",
			},
			source: {
				fullName: "input.source",
				syntax:
					"input.source(defval, title, tooltip, inline, group, display, active, confirm) → series float",
				returns: "series float",
				description:
					"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a dropdown that allows the user to select a source for the calculation, e.g. close, hl2, etc. The user can also select an output from another indicator on their chart as the source.",
			},
			string: {
				fullName: "input.string",
				syntax:
					"input.string(defval, title, options, tooltip, inline, group, confirm, display, active) → input string",
				returns: "input string",
				description:
					"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for a string input to the script's inputs.",
			},
			symbol: {
				fullName: "input.symbol",
				syntax:
					"input.symbol(defval, title, tooltip, inline, group, confirm, display, active) → input string",
				returns: "input string",
				description:
					"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field that allows the user to select a specific symbol using the symbol search and returns that symbol, paired with its exchange prefix, as a string.",
			},
			text_area: {
				fullName: "input.text_area",
				syntax:
					"input.text_area(defval, title, tooltip, group, confirm, display, active) → input string",
				returns: "input string",
				description:
					"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for a multiline text input.",
			},
			time: {
				fullName: "input.time",
				syntax:
					"input.time(defval, title, tooltip, inline, group, confirm, display, active) → input int",
				returns: "input int",
				description:
					'Adds two inputs to the script\'s "Settings/Inputs" tab on the same line: one for the date and one for the time. The user can change the price in the settings or by selecting the indicator and dragging the price line. The function returns a date/time value in UNIX format.',
			},
			timeframe: {
				fullName: "input.timeframe",
				syntax:
					"input.timeframe(defval, title, options, tooltip, inline, group, confirm, display, active) → input string",
				returns: "input string",
				description:
					"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a dropdown that allows the user to select a specific timeframe via the timeframe selector and returns it as a string. The selector includes the custom timeframes a user may have added using the chart's Timeframe dropdown.",
			},
		},
		variables: {},
		constants: {},
	},
	log: {
		functions: {
			error: {
				fullName: "log.error",
				syntax: "log.error(message) → void",
				returns: "void",
				description:
					'Converts the formatting string and value(s) into a formatted string, and sends the result to the "Pine logs" menu tagged with the "error" debug level.',
			},
			info: {
				fullName: "log.info",
				syntax: "log.info(message) → void",
				returns: "void",
				description:
					'Converts the formatting string and value(s) into a formatted string, and sends the result to the "Pine logs" menu tagged with the "info" debug level.',
			},
			warning: {
				fullName: "log.warning",
				syntax: "log.warning(message) → void",
				returns: "void",
				description:
					'Converts the formatting string and value(s) into a formatted string, and sends the result to the "Pine logs" menu tagged with the "warning" debug level.',
			},
		},
		variables: {},
		constants: {},
	},
	map: {
		functions: {
			clear: {
				fullName: "map.clear",
				syntax: "map.clear(id) → void",
				returns: "void",
				description: "Clears the map, removing all key-value pairs from it.",
			},
			contains: {
				fullName: "map.contains",
				syntax: "map.contains(id, key) → series bool",
				returns: "series bool",
				description:
					"Returns true if the key was found in the id map, false otherwise.",
			},
			copy: {
				fullName: "map.copy",
				syntax: "map.copy(id) → map<keyType, valueType>",
				returns: "map<keyType, valueType>",
				description: "Creates a copy of an existing map.",
			},
			get: {
				fullName: "map.get",
				syntax: "map.get(id, key) → <value_type>",
				returns: "<value_type>",
				description:
					"Returns the value associated with the specified key in the id map.",
			},
			keys: {
				fullName: "map.keys",
				syntax: "map.keys(id) → array<type>",
				returns: "array<type>",
				description:
					"Returns an array of all the keys in the id map. The resulting array is a copy and any changes to it are not reflected in the original map.",
			},
			"new<type,type>": {
				fullName: "map.new<type,type>",
				syntax: "map.new<keyType, valueType>() → map<keyType, valueType>",
				returns: "map<keyType, valueType>",
				description:
					"Creates a new map object: a collection that consists of key-value pairs, where all keys are of the keyType, and all values are of the valueType.",
			},
			put: {
				fullName: "map.put",
				syntax: "map.put(id, key, value) → <value_type>",
				returns: "<value_type>",
				description: "Puts a new key-value pair into the id map.",
			},
			put_all: {
				fullName: "map.put_all",
				syntax: "map.put_all(id, id2) → void",
				returns: "void",
				description:
					"Puts all key-value pairs from the id2 map into the id map.",
			},
			remove: {
				fullName: "map.remove",
				syntax: "map.remove(id, key) → <value_type>",
				returns: "<value_type>",
				description: "Removes a key-value pair from the id map.",
			},
			size: {
				fullName: "map.size",
				syntax: "map.size(id) → series int",
				returns: "series int",
				description: "Returns the number of key-value pairs in the id map.",
			},
			values: {
				fullName: "map.values",
				syntax: "map.values(id) → array<type>",
				returns: "array<type>",
				description:
					"Returns an array of all the values in the id map. The resulting array is a copy and any changes to it are not reflected in the original map.",
			},
		},
		variables: {},
		constants: {},
	},
	math: {
		functions: {
			abs: {
				fullName: "math.abs",
				syntax: "math.abs(number) → const int",
				returns: "const int",
				description:
					"Absolute value of number is number if number >= 0, or -number otherwise.",
			},
			acos: {
				fullName: "math.acos",
				syntax: "math.acos(angle) → const float",
				returns: "const float",
				description:
					"The acos function returns the arccosine (in radians) of number such that cos(acos(y)) = y for y in range [-1, 1].",
			},
			asin: {
				fullName: "math.asin",
				syntax: "math.asin(angle) → const float",
				returns: "const float",
				description:
					"The asin function returns the arcsine (in radians) of number such that sin(asin(y)) = y for y in range [-1, 1].",
			},
			atan: {
				fullName: "math.atan",
				syntax: "math.atan(angle) → const float",
				returns: "const float",
				description:
					"The atan function returns the arctangent (in radians) of number such that tan(atan(y)) = y for any y.",
			},
			avg: {
				fullName: "math.avg",
				syntax: "math.avg(number0, number1, ...) → simple float",
				returns: "simple float",
				description: "Calculates average of all given series (elementwise).",
			},
			ceil: {
				fullName: "math.ceil",
				syntax: "math.ceil(number) → const int",
				returns: "const int",
				description:
					'Rounds the specified number up to the smallest whole number ("int" value) that is greater than or equal to it.',
			},
			cos: {
				fullName: "math.cos",
				syntax: "math.cos(angle) → const float",
				returns: "const float",
				description:
					"The cos function returns the trigonometric cosine of an angle.",
			},
			exp: {
				fullName: "math.exp",
				syntax: "math.exp(number) → const float",
				returns: "const float",
				description:
					"The exp function of number is e raised to the power of number, where e is Euler's number.",
			},
			floor: {
				fullName: "math.floor",
				syntax: "math.floor(number) → const int",
				returns: "const int",
				description:
					'Rounds the specified number down to the largest whole number ("int" value) that is less than or equal to it.',
			},
			log: {
				fullName: "math.log",
				syntax: "math.log(number) → const float",
				returns: "const float",
				description:
					"Natural logarithm of any number > 0 is the unique y such that e^y = number.",
			},
			log10: {
				fullName: "math.log10",
				syntax: "math.log10(number) → const float",
				returns: "const float",
				description:
					"The common (or base 10) logarithm of number is the power to which 10 must be raised to obtain the number. 10^y = number.",
			},
			max: {
				fullName: "math.max",
				syntax: "math.max(number0, number1, ...) → const int",
				returns: "const int",
				description: "Returns the greatest of multiple values.",
			},
			min: {
				fullName: "math.min",
				syntax: "math.min(number0, number1, ...) → const int",
				returns: "const int",
				description: "Returns the smallest of multiple values.",
			},
			pow: {
				fullName: "math.pow",
				syntax: "math.pow(base, exponent) → const float",
				returns: "const float",
				description: "Mathematical power function.",
			},
			random: {
				fullName: "math.random",
				syntax: "math.random(min, max, seed) → series float",
				returns: "series float",
				description:
					"Returns a pseudo-random value. The function will generate a different sequence of values for each script execution. Using the same value for the optional seed argument will produce a repeatable sequence.",
			},
			round: {
				fullName: "math.round",
				syntax: "math.round(number) → const int",
				returns: "const int",
				description:
					"Returns the value of number rounded to the nearest integer, with ties rounding up. If the precision parameter is used, returns a float value rounded to that amount of decimal places.",
			},
			round_to_mintick: {
				fullName: "math.round_to_mintick",
				syntax: "math.round_to_mintick(number) → simple float",
				returns: "simple float",
				description:
					"Returns the value rounded to the symbol's mintick, i.e. the nearest value that can be divided by syminfo.mintick, without the remainder, with ties rounding up.",
			},
			sign: {
				fullName: "math.sign",
				syntax: "math.sign(number) → const float",
				returns: "const float",
				description:
					"Sign (signum) of number is zero if number is zero, 1.0 if number is greater than zero, -1.0 if number is less than zero.",
			},
			sin: {
				fullName: "math.sin",
				syntax: "math.sin(angle) → const float",
				returns: "const float",
				description:
					"The sin function returns the trigonometric sine of an angle.",
			},
			sqrt: {
				fullName: "math.sqrt",
				syntax: "math.sqrt(number) → const float",
				returns: "const float",
				description:
					"Square root of any number >= 0 is the unique y >= 0 such that y^2 = number.",
			},
			sum: {
				fullName: "math.sum",
				syntax: "math.sum(source, length) → series float",
				returns: "series float",
				description:
					"The sum function returns the sliding sum of last y values of x.",
			},
			tan: {
				fullName: "math.tan",
				syntax: "math.tan(angle) → const float",
				returns: "const float",
				description:
					"The tan function returns the trigonometric tangent of an angle.",
			},
			todegrees: {
				fullName: "math.todegrees",
				syntax: "math.todegrees(radians) → series float",
				returns: "series float",
				description:
					"Returns an approximately equivalent angle in degrees from an angle measured in radians.",
			},
			toradians: {
				fullName: "math.toradians",
				syntax: "math.toradians(degrees) → series float",
				returns: "series float",
				description:
					"Returns an approximately equivalent angle in radians from an angle measured in degrees.",
			},
		},
		variables: {},
		constants: {
			e: {
				fullName: "math.e",
				type: "const",
			},
			phi: {
				fullName: "math.phi",
				type: "const",
			},
			pi: {
				fullName: "math.pi",
				type: "const",
			},
			rphi: {
				fullName: "math.rphi",
				type: "const",
			},
		},
	},
	matrix: {
		functions: {
			add_col: {
				fullName: "matrix.add_col",
				syntax: "matrix.add_col(id, column, array_id) → void",
				returns: "void",
				description:
					"Inserts a new column at the column index of the id matrix.",
			},
			add_row: {
				fullName: "matrix.add_row",
				syntax: "matrix.add_row(id, row, array_id) → void",
				returns: "void",
				description: "Inserts a new row at the row index of the id matrix.",
			},
			avg: {
				fullName: "matrix.avg",
				syntax: "matrix.avg(id) → series float",
				returns: "series float",
				description:
					"The function calculates the average of all elements in the matrix.",
			},
			col: {
				fullName: "matrix.col",
				syntax: "matrix.col(id, column) → array<type>",
				returns: "array<type>",
				description:
					"The function creates a one-dimensional array from the elements of a matrix column.",
			},
			columns: {
				fullName: "matrix.columns",
				syntax: "matrix.columns(id) → series int",
				returns: "series int",
				description:
					"The function returns the number of columns in the matrix.",
			},
			concat: {
				fullName: "matrix.concat",
				syntax: "matrix.concat(id1, id2) → matrix<type>",
				returns: "matrix<type>",
				description: "The function appends the m2 matrix to the m1 matrix.",
			},
			copy: {
				fullName: "matrix.copy",
				syntax: "matrix.copy(id) → matrix<type>",
				returns: "matrix<type>",
				description:
					"The function creates a new matrix which is a copy of the original.",
			},
			det: {
				fullName: "matrix.det",
				syntax: "matrix.det(id) → series float",
				returns: "series float",
				description: "The function returns the determinant of a square matrix.",
			},
			diff: {
				fullName: "matrix.diff",
				syntax: "matrix.diff(id1, id2) → matrix<int>",
				returns: "matrix<int>",
				description:
					"The function returns a new matrix resulting from the subtraction between matrices id1 and id2, or of matrix id1 and an id2 scalar (a numerical value).",
			},
			eigenvalues: {
				fullName: "matrix.eigenvalues",
				syntax: "matrix.eigenvalues(id) → array<float>",
				returns: "array<float>",
				description:
					"The function returns an array containing the eigenvalues of a square matrix.",
			},
			eigenvectors: {
				fullName: "matrix.eigenvectors",
				syntax: "matrix.eigenvectors(id) → matrix<float>",
				returns: "matrix<float>",
				description:
					"Returns a matrix of eigenvectors, in which each column is an eigenvector of the id matrix.",
			},
			elements_count: {
				fullName: "matrix.elements_count",
				syntax: "matrix.elements_count(id) → series int",
				returns: "series int",
				description:
					"The function returns the total number of all matrix elements.",
			},
			fill: {
				fullName: "matrix.fill",
				syntax:
					"matrix.fill(id, value, from_row, to_row, from_column, to_column) → void",
				returns: "void",
				description:
					"The function fills a rectangular area of the id matrix defined by the indices from_column to to_column (not including it) and from_row to to_row(not including it) with the value.",
			},
			get: {
				fullName: "matrix.get",
				syntax: "matrix.get(id, row, column) → <matrix_type>",
				returns: "<matrix_type>",
				description:
					"The function returns the element with the specified index of the matrix.",
			},
			inv: {
				fullName: "matrix.inv",
				syntax: "matrix.inv(id) → matrix<float>",
				returns: "matrix<float>",
				description: "The function returns the inverse of a square matrix.",
			},
			is_antidiagonal: {
				fullName: "matrix.is_antidiagonal",
				syntax: "matrix.is_antidiagonal(id) → series bool",
				returns: "series bool",
				description:
					"The function determines if the matrix is anti-diagonal (all elements outside the secondary diagonal are zero).",
			},
			is_antisymmetric: {
				fullName: "matrix.is_antisymmetric",
				syntax: "matrix.is_antisymmetric(id) → series bool",
				returns: "series bool",
				description:
					"The function determines if a matrix is antisymmetric (its transpose equals its negative).",
			},
			is_binary: {
				fullName: "matrix.is_binary",
				syntax: "matrix.is_binary(id) → series bool",
				returns: "series bool",
				description:
					"The function determines if the matrix is binary (when all elements of the matrix are 0 or 1).",
			},
			is_diagonal: {
				fullName: "matrix.is_diagonal",
				syntax: "matrix.is_diagonal(id) → series bool",
				returns: "series bool",
				description:
					"The function determines if the matrix is diagonal (all elements outside the main diagonal are zero).",
			},
			is_identity: {
				fullName: "matrix.is_identity",
				syntax: "matrix.is_identity(id) → series bool",
				returns: "series bool",
				description:
					"The function determines if a matrix is an identity matrix (elements with ones on the main diagonal and zeros elsewhere).",
			},
			is_square: {
				fullName: "matrix.is_square",
				syntax: "matrix.is_square(id) → series bool",
				returns: "series bool",
				description:
					"The function determines if the matrix is square (it has the same number of rows and columns).",
			},
			is_stochastic: {
				fullName: "matrix.is_stochastic",
				syntax: "matrix.is_stochastic(id) → series bool",
				returns: "series bool",
				description: "The function determines if the matrix is stochastic.",
			},
			is_symmetric: {
				fullName: "matrix.is_symmetric",
				syntax: "matrix.is_symmetric(id) → series bool",
				returns: "series bool",
				description:
					"The function determines if a square matrix is symmetric (elements are symmetric with respect to the main diagonal).",
			},
			is_triangular: {
				fullName: "matrix.is_triangular",
				syntax: "matrix.is_triangular(id) → series bool",
				returns: "series bool",
				description:
					"The function determines if the matrix is triangular (if all elements above or below the main diagonal are zero).",
			},
			is_zero: {
				fullName: "matrix.is_zero",
				syntax: "matrix.is_zero(id) → series bool",
				returns: "series bool",
				description:
					"The function determines if all elements of the matrix are zero.",
			},
			kron: {
				fullName: "matrix.kron",
				syntax: "matrix.kron(id1, id2) → matrix<float>",
				returns: "matrix<float>",
				description:
					"The function returns the Kronecker product for the id1 and id2 matrices.",
			},
			max: {
				fullName: "matrix.max",
				syntax: "matrix.max(id) → series float",
				returns: "series float",
				description:
					"The function returns the largest value from the matrix elements.",
			},
			median: {
				fullName: "matrix.median",
				syntax: "matrix.median(id) → series float",
				returns: "series float",
				description:
					'The function calculates the median ("the middle" value) of matrix elements.',
			},
			min: {
				fullName: "matrix.min",
				syntax: "matrix.min(id) → series float",
				returns: "series float",
				description:
					"The function returns the smallest value from the matrix elements.",
			},
			mode: {
				fullName: "matrix.mode",
				syntax: "matrix.mode(id) → series float",
				returns: "series float",
				description:
					"The function calculates the mode of the matrix, which is the most frequently occurring value from the matrix elements. When there are multiple values occurring equally frequently, the function returns the smallest of those values.",
			},
			mult: {
				fullName: "matrix.mult",
				syntax: "matrix.mult(id1, id2) → array<int>",
				returns: "array<int>",
				description:
					"The function returns a new matrix resulting from the product between the matrices id1 and id2, or between an id1 matrix and an id2 scalar (a numerical value), or between an id1 matrix and an id2 vector (an array of values).",
			},
			"new<type>": {
				fullName: "matrix.new<type>",
				syntax: "matrix.new<type>(rows, columns, initial_value) → matrix<type>",
				returns: "matrix<type>",
				description:
					'The function creates a new matrix object. A matrix is a two-dimensional data structure containing rows and columns. All elements in the matrix must be of the type specified in the type template ("<type>").',
			},
			pinv: {
				fullName: "matrix.pinv",
				syntax: "matrix.pinv(id) → matrix<float>",
				returns: "matrix<float>",
				description: "The function returns the pseudoinverse of a matrix.",
			},
			pow: {
				fullName: "matrix.pow",
				syntax: "matrix.pow(id, power) → matrix<float>",
				returns: "matrix<float>",
				description:
					"The function calculates the product of the matrix by itself power times.",
			},
			rank: {
				fullName: "matrix.rank",
				syntax: "matrix.rank(id) → series int",
				returns: "series int",
				description: "The function calculates the rank of the matrix.",
			},
			remove_col: {
				fullName: "matrix.remove_col",
				syntax: "matrix.remove_col(id, column) → array<type>",
				returns: "array<type>",
				description:
					"The function removes the column at column index of the id matrix and returns an array containing the removed column's values.",
			},
			remove_row: {
				fullName: "matrix.remove_row",
				syntax: "matrix.remove_row(id, row) → array<type>",
				returns: "array<type>",
				description:
					"The function removes the row at row index of the id matrix and returns an array containing the removed row's values.",
			},
			reshape: {
				fullName: "matrix.reshape",
				syntax: "matrix.reshape(id, rows, columns) → void",
				returns: "void",
				description:
					"The function rebuilds the id matrix to rows x cols dimensions.",
			},
			reverse: {
				fullName: "matrix.reverse",
				syntax: "matrix.reverse(id) → void",
				returns: "void",
				description:
					"The function reverses the order of rows and columns in the matrix id. The first row and first column become the last, and the last become the first.",
			},
			row: {
				fullName: "matrix.row",
				syntax: "matrix.row(id, row) → array<type>",
				returns: "array<type>",
				description:
					"The function creates a one-dimensional array from the elements of a matrix row.",
			},
			rows: {
				fullName: "matrix.rows",
				syntax: "matrix.rows(id) → series int",
				returns: "series int",
				description: "The function returns the number of rows in the matrix.",
			},
			set: {
				fullName: "matrix.set",
				syntax: "matrix.set(id, row, column, value) → void",
				returns: "void",
				description:
					"The function assigns value to the element at the row and column of the id matrix.",
			},
			sort: {
				fullName: "matrix.sort",
				syntax: "matrix.sort(id, column, order) → void",
				returns: "void",
				description:
					"The function rearranges the rows in the id matrix following the sorted order of the values in the column.",
			},
			submatrix: {
				fullName: "matrix.submatrix",
				syntax:
					"matrix.submatrix(id, from_row, to_row, from_column, to_column) → matrix<type>",
				returns: "matrix<type>",
				description:
					"The function extracts a submatrix of the id matrix within the specified indices.",
			},
			sum: {
				fullName: "matrix.sum",
				syntax: "matrix.sum(id1, id2) → matrix<int>",
				returns: "matrix<int>",
				description:
					"The function returns a new matrix resulting from the sum of two matrices id1 and id2, or of an id1 matrix and an id2 scalar (a numerical value).",
			},
			swap_columns: {
				fullName: "matrix.swap_columns",
				syntax: "matrix.swap_columns(id, column1, column2) → void",
				returns: "void",
				description:
					"The function swaps the columns at the index column1 and column2 in the id matrix.",
			},
			swap_rows: {
				fullName: "matrix.swap_rows",
				syntax: "matrix.swap_rows(id, row1, row2) → void",
				returns: "void",
				description:
					"The function swaps the rows at the index row1 and row2 in the id matrix.",
			},
			trace: {
				fullName: "matrix.trace",
				syntax: "matrix.trace(id) → series float",
				returns: "series float",
				description:
					"The function calculates the trace of a matrix (the sum of the main diagonal's elements).",
			},
			transpose: {
				fullName: "matrix.transpose",
				syntax: "matrix.transpose(id) → matrix<type>",
				returns: "matrix<type>",
				description:
					"The function creates a new, transposed version of the id. This interchanges the row and column index of each element.",
			},
		},
		variables: {},
		constants: {},
	},
	request: {
		functions: {
			currency_rate: {
				fullName: "request.currency_rate",
				syntax:
					"request.currency_rate(from, to, ignore_invalid_currency) → series float",
				returns: "series float",
				description:
					"Provides a daily rate that can be used to convert a value expressed in the from currency to another in the to currency.",
			},
			dividends: {
				fullName: "request.dividends",
				syntax:
					"request.dividends(ticker, field, gaps, lookahead, ignore_invalid_symbol, currency) → series float",
				returns: "series float",
				description: "Requests dividends data for the specified symbol.",
			},
			earnings: {
				fullName: "request.earnings",
				syntax:
					"request.earnings(ticker, field, gaps, lookahead, ignore_invalid_symbol, currency) → series float",
				returns: "series float",
				description: "Requests earnings data for the specified symbol.",
			},
			economic: {
				fullName: "request.economic",
				syntax:
					"request.economic(country_code, field, gaps, ignore_invalid_symbol) → series float",
				returns: "series float",
				description:
					"Requests economic data for a symbol. Economic data includes information such as the state of a country's economy (GDP, inflation rate, etc.) or of a particular industry (steel production, ICU beds, etc.).",
			},
			financial: {
				fullName: "request.financial",
				syntax:
					"request.financial(symbol, financial_id, period, gaps, ignore_invalid_symbol, currency) → series float",
				returns: "series float",
				description: "Requests financial series for symbol.",
			},
			quandl: {
				fullName: "request.quandl",
				syntax:
					"request.quandl(ticker, gaps, index, ignore_invalid_symbol) → series float",
				returns: "series float",
				description:
					'Note: This function has been deprecated due to the API change from NASDAQ Data Link. Requests for "QUANDL" symbols are no longer valid and requests for them return a runtime error.',
			},
			security: {
				fullName: "request.security",
				syntax:
					"request.security(symbol, timeframe, expression, gaps, lookahead, ignore_invalid_symbol, currency, calc_bars_count) → series <type>",
				returns: "series <type>",
				description:
					"Requests the result of an expression from a specified context (symbol and timeframe).",
			},
			security_lower_tf: {
				fullName: "request.security_lower_tf",
				syntax:
					"request.security_lower_tf(symbol, timeframe, expression, ignore_invalid_symbol, currency, ignore_invalid_timeframe, calc_bars_count) → array<type>",
				returns: "array<type>",
				description:
					'Requests the results of an expression from a specified symbol on a timeframe lower than or equal to the chart\'s timeframe. It returns an array containing one element for each lower-timeframe bar within the chart bar. On a 5-minute chart, requesting data using a timeframe argument of "1" typically returns an array with five elements representing the value of the expression on each 1-minute bar, ordered by time with the earliest value first.',
			},
			seed: {
				fullName: "request.seed",
				syntax:
					"request.seed(source, symbol, expression, ignore_invalid_symbol, calc_bars_count) → series <type>",
				returns: "series <type>",
				description:
					"Requests the result of an expression evaluated on data from a user-maintained GitHub repository. **Note:**The creation of new Pine Seeds repositories is suspended; only existing repositories are currently supported. See the Pine Seeds documentation on GitHub to learn more.",
			},
			splits: {
				fullName: "request.splits",
				syntax:
					"request.splits(ticker, field, gaps, lookahead, ignore_invalid_symbol) → series float",
				returns: "series float",
				description: "Requests splits data for the specified symbol.",
			},
		},
		variables: {},
		constants: {},
	},
	runtime: {
		functions: {
			error: {
				fullName: "runtime.error",
				syntax: "runtime.error(message) → void",
				returns: "void",
				description:
					"When called, causes a runtime error with the error message specified in the message argument.",
			},
		},
		variables: {},
		constants: {},
	},
	str: {
		functions: {
			contains: {
				fullName: "str.contains",
				syntax: "str.contains(source, str) → const bool",
				returns: "const bool",
				description:
					"Returns true if the source string contains the str substring, false otherwise.",
			},
			endswith: {
				fullName: "str.endswith",
				syntax: "str.endswith(source, str) → const bool",
				returns: "const bool",
				description:
					"Returns true if the source string ends with the substring specified in str, false otherwise.",
			},
			format: {
				fullName: "str.format",
				syntax: "str.format(formatString, arg0, arg1, ...) → simple string",
				returns: "simple string",
				description:
					"Creates a formatted string using a specified formatting string (formatString) and one or more additional arguments (arg0, arg1, etc.). The formatting string defines the structure of the returned string, where all placeholders in curly brackets ({}) refer to the additional arguments. Each placeholder requires a number representing an argument's position, starting from 0. For instance, the placeholder {0} refers to the first argument after formatString (arg0), {1} refers to the second (arg1), and so on. The function replaces each placeholder with a string representation of the corresponding argument.",
			},
			format_time: {
				fullName: "str.format_time",
				syntax: "str.format_time(time, format, timezone) → series string",
				returns: "series string",
				description:
					"Converts the time timestamp into a string formatted according to format and timezone.",
			},
			length: {
				fullName: "str.length",
				syntax: "str.length(string) → const int",
				returns: "const int",
				description:
					"Returns an integer corresponding to the amount of chars in that string.",
			},
			lower: {
				fullName: "str.lower",
				syntax: "str.lower(source) → const string",
				returns: "const string",
				description:
					"Returns a new string with all letters converted to lowercase.",
			},
			match: {
				fullName: "str.match",
				syntax: "str.match(source, regex) → simple string",
				returns: "simple string",
				description:
					"Returns the new substring of the source string if it matches a regex regular expression, an empty string otherwise.",
			},
			pos: {
				fullName: "str.pos",
				syntax: "str.pos(source, str) → const int",
				returns: "const int",
				description:
					"Returns the position of the first occurrence of the str string in the source string, 'na' otherwise.",
			},
			repeat: {
				fullName: "str.repeat",
				syntax: "str.repeat(source, repeat, separator) → const string",
				returns: "const string",
				description:
					"Constructs a new string containing the source string repeated repeat times with the separator injected between each repeated instance.",
			},
			replace: {
				fullName: "str.replace",
				syntax:
					"str.replace(source, target, replacement, occurrence) → const string",
				returns: "const string",
				description:
					"Returns a new string with the Nth occurrence of the target string replaced by the replacement string, where N is specified in occurrence.",
			},
			replace_all: {
				fullName: "str.replace_all",
				syntax: "str.replace_all(source, target, replacement) → simple string",
				returns: "simple string",
				description:
					"Replaces each occurrence of the target string in the source string with the replacement string.",
			},
			split: {
				fullName: "str.split",
				syntax: "str.split(string, separator) → array<string>",
				returns: "array<string>",
				description:
					"Divides a string into an array of substrings and returns its array id.",
			},
			startswith: {
				fullName: "str.startswith",
				syntax: "str.startswith(source, str) → const bool",
				returns: "const bool",
				description:
					"Returns true if the source string starts with the substring specified in str, false otherwise.",
			},
			substring: {
				fullName: "str.substring",
				syntax: "str.substring(source, begin_pos, end_pos) → const string",
				returns: "const string",
				description:
					"Returns a new string that is a substring of the source string. The substring begins with the character at the index specified by begin_pos and extends to 'end_pos - 1' of the source string.",
			},
			tonumber: {
				fullName: "str.tonumber",
				syntax: "str.tonumber(string) → const float",
				returns: "const float",
				description:
					'Converts a value represented in string to its "float" equivalent.',
			},
			tostring: {
				fullName: "str.tostring",
				syntax: "str.tostring(value) → const string",
				returns: "const string",
				description: "",
			},
			trim: {
				fullName: "str.trim",
				syntax: "str.trim(source) → const string",
				returns: "const string",
				description:
					"Constructs a new string with all consecutive whitespaces and other control characters (e.g., “\\n”, “\\t”, etc.) removed from the left and right of the source.",
			},
			upper: {
				fullName: "str.upper",
				syntax: "str.upper(source) → const string",
				returns: "const string",
				description:
					"Returns a new string with all letters converted to uppercase.",
			},
		},
		variables: {},
		constants: {},
	},
	ticker: {
		functions: {
			heikinashi: {
				fullName: "ticker.heikinashi",
				syntax: "ticker.heikinashi(symbol) → simple string",
				returns: "simple string",
				description:
					"Creates a ticker identifier for requesting Heikin Ashi bar values.",
			},
			inherit: {
				fullName: "ticker.inherit",
				syntax: "ticker.inherit(from_tickerid, symbol) → simple string",
				returns: "simple string",
				description:
					"Constructs a ticker ID for the specified symbol with additional parameters inherited from the ticker ID passed into the function call, allowing the script to request a symbol's data using the same modifiers that the from_tickerid has, including extended session, dividend adjustment, currency conversion, non-standard chart types, back-adjustment, settlement-as-close, etc.",
			},
			kagi: {
				fullName: "ticker.kagi",
				syntax: "ticker.kagi(symbol, reversal) → simple string",
				returns: "simple string",
				description: "Creates a ticker identifier for requesting Kagi values.",
			},
			linebreak: {
				fullName: "ticker.linebreak",
				syntax: "ticker.linebreak(symbol, number_of_lines) → simple string",
				returns: "simple string",
				description:
					"Creates a ticker identifier for requesting Line Break values.",
			},
			modify: {
				fullName: "ticker.modify",
				syntax:
					"ticker.modify(tickerid, session, adjustment, backadjustment, settlement_as_close) → simple string",
				returns: "simple string",
				description:
					"Creates a ticker identifier for requesting additional data for the script.",
			},
			new: {
				fullName: "ticker.new",
				syntax:
					"ticker.new(prefix, ticker, session, adjustment, backadjustment, settlement_as_close) → simple string",
				returns: "simple string",
				description:
					"Creates a ticker identifier for requesting additional data for the script.",
			},
			pointfigure: {
				fullName: "ticker.pointfigure",
				syntax:
					"ticker.pointfigure(symbol, source, style, param, reversal) → simple string",
				returns: "simple string",
				description:
					"Creates a ticker identifier for requesting Point & Figure values.",
			},
			renko: {
				fullName: "ticker.renko",
				syntax:
					"ticker.renko(symbol, style, param, request_wicks, source) → simple string",
				returns: "simple string",
				description: "Creates a ticker identifier for requesting Renko values.",
			},
			standard: {
				fullName: "ticker.standard",
				syntax: "ticker.standard(symbol) → simple string",
				returns: "simple string",
				description:
					"Creates a ticker to request data from a standard chart that is unaffected by modifiers like extended session, dividend adjustment, currency conversion, and the calculations of non-standard chart types: Heikin Ashi, Renko, etc. Among other things, this makes it possible to retrieve standard chart values when the script is running on a non-standard chart.",
			},
		},
		variables: {},
		constants: {},
	},
	adjustment: {
		functions: {},
		variables: {},
		constants: {
			dividends: {
				fullName: "adjustment.dividends",
				type: "adjustment",
			},
			none: {
				fullName: "adjustment.none",
				type: "adjustment",
			},
			splits: {
				fullName: "adjustment.splits",
				type: "adjustment",
			},
		},
	},
	alert: {
		functions: {},
		variables: {},
		constants: {
			freq_all: {
				fullName: "alert.freq_all",
				type: "string",
			},
			freq_once_per_bar: {
				fullName: "alert.freq_once_per_bar",
				type: "string",
			},
			freq_once_per_bar_close: {
				fullName: "alert.freq_once_per_bar_close",
				type: "string",
			},
		},
	},
	backadjustment: {
		functions: {},
		variables: {},
		constants: {
			inherit: {
				fullName: "backadjustment.inherit",
				type: "const",
			},
			off: {
				fullName: "backadjustment.off",
				type: "const",
			},
			on: {
				fullName: "backadjustment.on",
				type: "const",
			},
		},
	},
	barmerge: {
		functions: {},
		variables: {},
		constants: {
			gaps_off: {
				fullName: "barmerge.gaps_off",
				type: "barmerge",
			},
			gaps_on: {
				fullName: "barmerge.gaps_on",
				type: "barmerge",
			},
			lookahead_off: {
				fullName: "barmerge.lookahead_off",
				type: "barmerge",
			},
			lookahead_on: {
				fullName: "barmerge.lookahead_on",
				type: "barmerge",
			},
		},
	},
	currency: {
		functions: {},
		variables: {},
		constants: {
			AED: {
				fullName: "currency.AED",
				type: "string",
			},
			ARS: {
				fullName: "currency.ARS",
				type: "string",
			},
			AUD: {
				fullName: "currency.AUD",
				type: "string",
			},
			BDT: {
				fullName: "currency.BDT",
				type: "string",
			},
			BHD: {
				fullName: "currency.BHD",
				type: "string",
			},
			BRL: {
				fullName: "currency.BRL",
				type: "string",
			},
			BTC: {
				fullName: "currency.BTC",
				type: "string",
			},
			CAD: {
				fullName: "currency.CAD",
				type: "string",
			},
			CHF: {
				fullName: "currency.CHF",
				type: "string",
			},
			CLP: {
				fullName: "currency.CLP",
				type: "string",
			},
			CNY: {
				fullName: "currency.CNY",
				type: "string",
			},
			COP: {
				fullName: "currency.COP",
				type: "string",
			},
			CZK: {
				fullName: "currency.CZK",
				type: "string",
			},
			DKK: {
				fullName: "currency.DKK",
				type: "string",
			},
			EGP: {
				fullName: "currency.EGP",
				type: "string",
			},
			ETH: {
				fullName: "currency.ETH",
				type: "string",
			},
			EUR: {
				fullName: "currency.EUR",
				type: "string",
			},
			GBP: {
				fullName: "currency.GBP",
				type: "string",
			},
			HKD: {
				fullName: "currency.HKD",
				type: "string",
			},
			HUF: {
				fullName: "currency.HUF",
				type: "string",
			},
			IDR: {
				fullName: "currency.IDR",
				type: "string",
			},
			ILS: {
				fullName: "currency.ILS",
				type: "string",
			},
			INR: {
				fullName: "currency.INR",
				type: "string",
			},
			ISK: {
				fullName: "currency.ISK",
				type: "string",
			},
			JPY: {
				fullName: "currency.JPY",
				type: "string",
			},
			KES: {
				fullName: "currency.KES",
				type: "string",
			},
			KRW: {
				fullName: "currency.KRW",
				type: "string",
			},
			KWD: {
				fullName: "currency.KWD",
				type: "string",
			},
			LKR: {
				fullName: "currency.LKR",
				type: "string",
			},
			MAD: {
				fullName: "currency.MAD",
				type: "string",
			},
			MXN: {
				fullName: "currency.MXN",
				type: "string",
			},
			MYR: {
				fullName: "currency.MYR",
				type: "string",
			},
			NGN: {
				fullName: "currency.NGN",
				type: "string",
			},
			NOK: {
				fullName: "currency.NOK",
				type: "string",
			},
			NONE: {
				fullName: "currency.NONE",
				type: "string",
			},
			NZD: {
				fullName: "currency.NZD",
				type: "string",
			},
			PEN: {
				fullName: "currency.PEN",
				type: "string",
			},
			PHP: {
				fullName: "currency.PHP",
				type: "string",
			},
			PKR: {
				fullName: "currency.PKR",
				type: "string",
			},
			PLN: {
				fullName: "currency.PLN",
				type: "string",
			},
			QAR: {
				fullName: "currency.QAR",
				type: "string",
			},
			RON: {
				fullName: "currency.RON",
				type: "string",
			},
			RSD: {
				fullName: "currency.RSD",
				type: "string",
			},
			RUB: {
				fullName: "currency.RUB",
				type: "string",
			},
			SAR: {
				fullName: "currency.SAR",
				type: "string",
			},
			SEK: {
				fullName: "currency.SEK",
				type: "string",
			},
			SGD: {
				fullName: "currency.SGD",
				type: "string",
			},
			THB: {
				fullName: "currency.THB",
				type: "string",
			},
			TND: {
				fullName: "currency.TND",
				type: "string",
			},
			TRY: {
				fullName: "currency.TRY",
				type: "string",
			},
			TWD: {
				fullName: "currency.TWD",
				type: "string",
			},
			USD: {
				fullName: "currency.USD",
				type: "string",
			},
			USDT: {
				fullName: "currency.USDT",
				type: "string",
			},
			VES: {
				fullName: "currency.VES",
				type: "string",
			},
			VND: {
				fullName: "currency.VND",
				type: "string",
			},
			ZAR: {
				fullName: "currency.ZAR",
				type: "string",
			},
		},
	},
	dayofweek: {
		functions: {},
		variables: {},
		constants: {
			friday: {
				fullName: "dayofweek.friday",
				type: "int",
			},
			monday: {
				fullName: "dayofweek.monday",
				type: "int",
			},
			saturday: {
				fullName: "dayofweek.saturday",
				type: "int",
			},
			sunday: {
				fullName: "dayofweek.sunday",
				type: "int",
			},
			thursday: {
				fullName: "dayofweek.thursday",
				type: "int",
			},
			tuesday: {
				fullName: "dayofweek.tuesday",
				type: "int",
			},
			wednesday: {
				fullName: "dayofweek.wednesday",
				type: "int",
			},
		},
	},
	display: {
		functions: {},
		variables: {},
		constants: {
			all: {
				fullName: "display.all",
				type: "int",
			},
			data_window: {
				fullName: "display.data_window",
				type: "int",
			},
			none: {
				fullName: "display.none",
				type: "int",
			},
			pane: {
				fullName: "display.pane",
				type: "int",
			},
			pine_screener: {
				fullName: "display.pine_screener",
				type: "int",
			},
			price_scale: {
				fullName: "display.price_scale",
				type: "int",
			},
			status_line: {
				fullName: "display.status_line",
				type: "int",
			},
		},
	},
	extend: {
		functions: {},
		variables: {},
		constants: {
			both: {
				fullName: "extend.both",
				type: "string",
			},
			left: {
				fullName: "extend.left",
				type: "string",
			},
			none: {
				fullName: "extend.none",
				type: "string",
			},
			right: {
				fullName: "extend.right",
				type: "string",
			},
		},
	},
	font: {
		functions: {},
		variables: {},
		constants: {
			family_default: {
				fullName: "font.family_default",
				type: "const",
			},
			family_monospace: {
				fullName: "font.family_monospace",
				type: "const",
			},
		},
	},
	format: {
		functions: {},
		variables: {},
		constants: {
			inherit: {
				fullName: "format.inherit",
				type: "string",
			},
			mintick: {
				fullName: "format.mintick",
				type: "string",
			},
			percent: {
				fullName: "format.percent",
				type: "string",
			},
			price: {
				fullName: "format.price",
				type: "string",
			},
			volume: {
				fullName: "format.volume",
				type: "string",
			},
		},
	},
	hline: {
		functions: {},
		variables: {},
		constants: {
			style_dashed: {
				fullName: "hline.style_dashed",
				type: "hline_style",
			},
			style_dotted: {
				fullName: "hline.style_dotted",
				type: "hline_style",
			},
			style_solid: {
				fullName: "hline.style_solid",
				type: "hline_style",
			},
		},
	},
	location: {
		functions: {},
		variables: {},
		constants: {
			abovebar: {
				fullName: "location.abovebar",
				type: "string",
			},
			absolute: {
				fullName: "location.absolute",
				type: "string",
			},
			belowbar: {
				fullName: "location.belowbar",
				type: "string",
			},
			bottom: {
				fullName: "location.bottom",
				type: "string",
			},
			top: {
				fullName: "location.top",
				type: "string",
			},
		},
	},
	order: {
		functions: {},
		variables: {},
		constants: {
			ascending: {
				fullName: "order.ascending",
				type: "string",
			},
			descending: {
				fullName: "order.descending",
				type: "string",
			},
		},
	},
	plot: {
		functions: {},
		variables: {},
		constants: {
			linestyle_dashed: {
				fullName: "plot.linestyle_dashed",
				type: "plot_style",
			},
			linestyle_dotted: {
				fullName: "plot.linestyle_dotted",
				type: "plot_style",
			},
			linestyle_solid: {
				fullName: "plot.linestyle_solid",
				type: "plot_style",
			},
			style_area: {
				fullName: "plot.style_area",
				type: "plot_style",
			},
			style_areabr: {
				fullName: "plot.style_areabr",
				type: "plot_style",
			},
			style_circles: {
				fullName: "plot.style_circles",
				type: "plot_style",
			},
			style_columns: {
				fullName: "plot.style_columns",
				type: "plot_style",
			},
			style_cross: {
				fullName: "plot.style_cross",
				type: "plot_style",
			},
			style_histogram: {
				fullName: "plot.style_histogram",
				type: "plot_style",
			},
			style_line: {
				fullName: "plot.style_line",
				type: "plot_style",
			},
			style_linebr: {
				fullName: "plot.style_linebr",
				type: "plot_style",
			},
			style_stepline: {
				fullName: "plot.style_stepline",
				type: "plot_style",
			},
			style_stepline_diamond: {
				fullName: "plot.style_stepline_diamond",
				type: "plot_style",
			},
			style_steplinebr: {
				fullName: "plot.style_steplinebr",
				type: "plot_style",
			},
		},
	},
	position: {
		functions: {},
		variables: {},
		constants: {
			bottom_center: {
				fullName: "position.bottom_center",
				type: "string",
			},
			bottom_left: {
				fullName: "position.bottom_left",
				type: "string",
			},
			bottom_right: {
				fullName: "position.bottom_right",
				type: "string",
			},
			middle_center: {
				fullName: "position.middle_center",
				type: "string",
			},
			middle_left: {
				fullName: "position.middle_left",
				type: "string",
			},
			middle_right: {
				fullName: "position.middle_right",
				type: "string",
			},
			top_center: {
				fullName: "position.top_center",
				type: "string",
			},
			top_left: {
				fullName: "position.top_left",
				type: "string",
			},
			top_right: {
				fullName: "position.top_right",
				type: "string",
			},
		},
	},
	scale: {
		functions: {},
		variables: {},
		constants: {
			left: {
				fullName: "scale.left",
				type: "scale",
			},
			none: {
				fullName: "scale.none",
				type: "scale",
			},
			right: {
				fullName: "scale.right",
				type: "scale",
			},
		},
	},
	settlement_as_close: {
		functions: {},
		variables: {},
		constants: {
			inherit: {
				fullName: "settlement_as_close.inherit",
				type: "const",
			},
			off: {
				fullName: "settlement_as_close.off",
				type: "const",
			},
			on: {
				fullName: "settlement_as_close.on",
				type: "const",
			},
		},
	},
	shape: {
		functions: {},
		variables: {},
		constants: {
			arrowdown: {
				fullName: "shape.arrowdown",
				type: "string",
			},
			arrowup: {
				fullName: "shape.arrowup",
				type: "string",
			},
			circle: {
				fullName: "shape.circle",
				type: "string",
			},
			cross: {
				fullName: "shape.cross",
				type: "string",
			},
			diamond: {
				fullName: "shape.diamond",
				type: "string",
			},
			flag: {
				fullName: "shape.flag",
				type: "string",
			},
			labeldown: {
				fullName: "shape.labeldown",
				type: "string",
			},
			labelup: {
				fullName: "shape.labelup",
				type: "string",
			},
			square: {
				fullName: "shape.square",
				type: "string",
			},
			triangledown: {
				fullName: "shape.triangledown",
				type: "string",
			},
			triangleup: {
				fullName: "shape.triangleup",
				type: "string",
			},
			xcross: {
				fullName: "shape.xcross",
				type: "string",
			},
		},
	},
	size: {
		functions: {},
		variables: {},
		constants: {
			auto: {
				fullName: "size.auto",
				type: "string",
			},
			huge: {
				fullName: "size.huge",
				type: "string",
			},
			large: {
				fullName: "size.large",
				type: "string",
			},
			normal: {
				fullName: "size.normal",
				type: "string",
			},
			small: {
				fullName: "size.small",
				type: "string",
			},
			tiny: {
				fullName: "size.tiny",
				type: "string",
			},
		},
	},
	splits: {
		functions: {},
		variables: {},
		constants: {
			denominator: {
				fullName: "splits.denominator",
				type: "string",
			},
			numerator: {
				fullName: "splits.numerator",
				type: "string",
			},
		},
	},
	text: {
		functions: {},
		variables: {},
		constants: {
			align_bottom: {
				fullName: "text.align_bottom",
				type: "string",
			},
			align_center: {
				fullName: "text.align_center",
				type: "string",
			},
			align_left: {
				fullName: "text.align_left",
				type: "string",
			},
			align_right: {
				fullName: "text.align_right",
				type: "string",
			},
			align_top: {
				fullName: "text.align_top",
				type: "string",
			},
			format_bold: {
				fullName: "text.format_bold",
				type: "string",
			},
			format_italic: {
				fullName: "text.format_italic",
				type: "string",
			},
			format_none: {
				fullName: "text.format_none",
				type: "string",
			},
			wrap_auto: {
				fullName: "text.wrap_auto",
				type: "string",
			},
			wrap_none: {
				fullName: "text.wrap_none",
				type: "string",
			},
		},
	},
	xloc: {
		functions: {},
		variables: {},
		constants: {
			bar_index: {
				fullName: "xloc.bar_index",
				type: "string",
			},
			bar_time: {
				fullName: "xloc.bar_time",
				type: "string",
			},
		},
	},
	yloc: {
		functions: {},
		variables: {},
		constants: {
			abovebar: {
				fullName: "yloc.abovebar",
				type: "string",
			},
			belowbar: {
				fullName: "yloc.belowbar",
				type: "string",
			},
			price: {
				fullName: "yloc.price",
				type: "string",
			},
		},
	},
};

// Helper to get all namespace names
export const NAMESPACE_NAMES = [
	"adjustment",
	"alert",
	"array",
	"backadjustment",
	"barmerge",
	"barstate",
	"box",
	"chart",
	"color",
	"currency",
	"dayofweek",
	"display",
	"dividends",
	"earnings",
	"extend",
	"font",
	"format",
	"hline",
	"input",
	"label",
	"line",
	"linefill",
	"location",
	"log",
	"map",
	"math",
	"matrix",
	"order",
	"plot",
	"polyline",
	"position",
	"request",
	"runtime",
	"scale",
	"session",
	"settlement_as_close",
	"shape",
	"size",
	"splits",
	"str",
	"strategy",
	"syminfo",
	"ta",
	"table",
	"text",
	"ticker",
	"timeframe",
	"xloc",
	"yloc",
];
