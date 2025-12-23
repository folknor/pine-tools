// Pine Script v6 Complete API Reference
// Generated: 2025-12-23T15:57:09.409Z
// Source: Manual extraction from TradingView documentation

export interface PineItem {
	description: string;
	syntax?: string;
	returns?: string;
	type?: string;
	category?: string;
	example?: string;
}

export const V6_VARIABLES: Record<string, PineItem> = {
	ask: {
		description: "Built-in variable: ask",
		type: "variable",
		category: "built-in",
	},
	bar_index: {
		description: "Built-in variable: bar_index",
		type: "variable",
		category: "built-in",
	},
	bid: {
		description: "Built-in variable: bid",
		type: "variable",
		category: "built-in",
	},
	close: {
		description: "Built-in variable: close",
		type: "variable",
		category: "built-in",
	},
	dayofmonth: {
		description: "Built-in variable: dayofmonth",
		type: "variable",
		category: "built-in",
	},
	dayofweek: {
		description: "Built-in variable: dayofweek",
		type: "variable",
		category: "built-in",
	},
	high: {
		description: "Built-in variable: high",
		type: "variable",
		category: "built-in",
	},
	hl2: {
		description: "Built-in variable: hl2",
		type: "variable",
		category: "built-in",
	},
	hlc3: {
		description: "Built-in variable: hlc3",
		type: "variable",
		category: "built-in",
	},
	hlcc4: {
		description: "Built-in variable: hlcc4",
		type: "variable",
		category: "built-in",
	},
	hour: {
		description: "Built-in variable: hour",
		type: "variable",
		category: "built-in",
	},
	last_bar_index: {
		description: "Built-in variable: last_bar_index",
		type: "variable",
		category: "built-in",
	},
	last_bar_time: {
		description: "Built-in variable: last_bar_time",
		type: "variable",
		category: "built-in",
	},
	low: {
		description: "Built-in variable: low",
		type: "variable",
		category: "built-in",
	},
	minute: {
		description: "Built-in variable: minute",
		type: "variable",
		category: "built-in",
	},
	month: {
		description: "Built-in variable: month",
		type: "variable",
		category: "built-in",
	},
	na: {
		description: "Built-in variable: na",
		type: "variable",
		category: "built-in",
	},
	ohlc4: {
		description: "Built-in variable: ohlc4",
		type: "variable",
		category: "built-in",
	},
	open: {
		description: "Built-in variable: open",
		type: "variable",
		category: "built-in",
	},
	second: {
		description: "Built-in variable: second",
		type: "variable",
		category: "built-in",
	},
	time: {
		description: "Built-in variable: time",
		type: "variable",
		category: "built-in",
	},
	time_close: {
		description: "Built-in variable: time_close",
		type: "variable",
		category: "built-in",
	},
	time_tradingday: {
		description: "Built-in variable: time_tradingday",
		type: "variable",
		category: "built-in",
	},
	timenow: {
		description: "Built-in variable: timenow",
		type: "variable",
		category: "built-in",
	},
	volume: {
		description: "Built-in variable: volume",
		type: "variable",
		category: "built-in",
	},
	weekofyear: {
		description: "Built-in variable: weekofyear",
		type: "variable",
		category: "built-in",
	},
	year: {
		description: "Built-in variable: year",
		type: "variable",
		category: "built-in",
	},
};

export const V6_FUNCTIONS: Record<string, PineItem> = {
	alert: {
		description:
			'Creates an alert trigger for an indicator or strategy, with a specified frequency, when called on the latest realtime bar. To activate alerts for a script containing calls to this function, open the "Create Alert" dialog box, then select the script name and "Any alert() function call" in the "Condition" section.',
		syntax: "alert(message, freq) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`alert()` example", "", true)ma = ta.sma(close, 14)xUp = ta.crossover(close, ma)if xUp    // Trigger the alert the first time a cross occurs during the real-time bar.    alert("Price (" + str.tostring(close) + ") crossed over MA (" + str.tostring(ma) + ").", alert.freq_once_per_bar)plot(ma)plotchar(xUp, "xUp", "▲", location.top, size = size.tiny)',
	},
	alertcondition: {
		description:
			"Creates alert condition, that is available in Create Alert dialog. Please note, that alertcondition() does NOT create an alert, it just gives you more options in Create Alert dialog. Also, alertcondition() effect is invisible on chart.",
		syntax: "alertcondition(condition, title, message) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			"//@version=6indicator(\"alertcondition\", overlay=true)alertcondition(close >= open, title='Alert on Green Bar', message='Green Bar!')",
	},
	"array.abs": {
		description:
			"Returns an array containing the absolute value of each element in the original array.",
		syntax: "array.abs(id) → array<float>",
		returns: "array<float>",
		type: "function",
		category: "",
		example: "",
	},
	"array.avg": {
		description: "The function returns the mean of an array's elements.",
		syntax: "array.avg(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.avg example")a = array.new_float(0)for i = 0 to 9    array.push(a, close[i])plot(array.avg(a))',
	},
	"array.binary_search": {
		description:
			"The function returns the index of the value, or -1 if the value is not found. The array to search must be sorted in ascending order.",
		syntax: "array.binary_search(id, val) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.binary_search")a = array.from(5, -2, 0, 9, 1)array.sort(a) // [-2, 0, 1, 5, 9]position = array.binary_search(a, 0) // 1plot(position)',
	},
	"array.binary_search_leftmost": {
		description:
			"The function returns the index of the value if it is found. When the value is not found, the function returns the index of the next smallest element to the left of where the value would lie if it was in the array. The array to search must be sorted in ascending order.",
		syntax: "array.binary_search_leftmost(id, val) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.binary_search_leftmost")a = array.from(5, -2, 0, 9, 1)array.sort(a) // [-2, 0, 1, 5, 9]position = array.binary_search_leftmost(a, 3) // 2plot(position)',
	},
	"array.binary_search_rightmost": {
		description:
			"The function returns the index of the value if it is found. When the value is not found, the function returns the index of the element to the right of where the value would lie if it was in the array. The array must be sorted in ascending order.",
		syntax: "array.binary_search_rightmost(id, val) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.binary_search_rightmost")a = array.from(5, -2, 0, 9, 1)array.sort(a) // [-2, 0, 1, 5, 9]position = array.binary_search_rightmost(a, 3) // 3plot(position)',
	},
	"array.clear": {
		description: "The function removes all elements from an array.",
		syntax: "array.clear(id) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.clear example")a = array.new_float(5,high)array.clear(a)array.push(a, close)plot(array.get(a,0))plot(array.size(a))',
	},
	"array.concat": {
		description:
			"The function is used to merge two arrays. It pushes all elements from the second array to the first array, and returns the first array.",
		syntax: "array.concat(id1, id2) → array<type>",
		returns: "array<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.concat example")a = array.new_float(0,0)b = array.new_float(0,0)for i = 0 to 4    array.push(a, high[i])    array.push(b, low[i])c = array.concat(a,b)plot(array.size(a))plot(array.size(b))plot(array.size(c))',
	},
	"array.copy": {
		description: "The function creates a copy of an existing array.",
		syntax: "array.copy(id) → array<type>",
		returns: "array<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.copy example")length = 5a = array.new_float(length, close)b = array.copy(a)a := array.new_float(length, open)plot(array.sum(a) / length)plot(array.sum(b) / length)',
	},
	"array.covariance": {
		description: "The function returns the covariance of two arrays.",
		syntax: "array.covariance(id1, id2, biased) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.covariance example")a = array.new_float(0)b = array.new_float(0)for i = 0 to 9    array.push(a, close[i])    array.push(b, open[i])plot(array.covariance(a, b))',
	},
	"array.every": {
		description:
			"Returns true if all elements of the id array are true, false otherwise.",
		syntax: "array.every(id) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"array.fill": {
		description:
			"The function sets elements of an array to a single value. If no index is specified, all elements are set. If only a start index (default 0) is supplied, the elements starting at that index are set. If both index parameters are used, the elements from the starting index up to but not including the end index (default na) are set.",
		syntax: "array.fill(id, value, index_from, index_to) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.fill example")a = array.new_float(10)array.fill(a, close)plot(array.sum(a))',
	},
	"array.first": {
		description:
			"Returns the array's first element. Throws a runtime error if the array is empty.",
		syntax: "array.first(id) → series <type>",
		returns: "series <type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.first example")arr = array.new_int(3, 10)plot(array.first(arr))',
	},
	"array.from": {
		description:
			"The function takes a variable number of arguments with one of the types: int, float, bool, string, label, line, color, box, table, linefill, and returns an array of the corresponding type.",
		syntax: "array.from(arg0, arg1, ...) → array<type>",
		returns: "array<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.from_example", overlay = false)arr = array.from("Hello", "World!") // arr (array<string>) will contain 2 elements: {Hello}, {World!}.plot(close)',
	},
	"array.get": {
		description:
			"The function returns the value of the element at the specified index.",
		syntax: "array.get(id, index) → series <type>",
		returns: "series <type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.get example")a = array.new_float(0)for i = 0 to 9    array.push(a, close[i] - open[i])plot(array.get(a, 9))',
	},
	"array.includes": {
		description:
			"The function returns true if the value was found in an array, false otherwise.",
		syntax: "array.includes(id, value) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.includes example")a = array.new_float(5,high)p = closeif array.includes(a, high)    p := openplot(p)',
	},
	"array.indexof": {
		description:
			"The function returns the index of the first occurrence of the value, or -1 if the value is not found.",
		syntax: "array.indexof(id, value) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.indexof example")a = array.new_float(5,high)index = array.indexof(a, high)plot(index)',
	},
	"array.insert": {
		description:
			"The function changes the contents of an array by adding new elements in place.",
		syntax: "array.insert(id, index, value) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.insert example")a = array.new_float(5, close)array.insert(a, 0, open)plot(array.get(a, 5))',
	},
	"array.join": {
		description:
			"The function creates and returns a new string by concatenating all the elements of an array, separated by the specified separator string.",
		syntax: "array.join(id, separator) → series string",
		returns: "series string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.join example")a = array.new_float(5, 5)label.new(bar_index, close, array.join(a, ","))',
	},
	"array.last": {
		description:
			"Returns the array's last element. Throws a runtime error if the array is empty.",
		syntax: "array.last(id) → series <type>",
		returns: "series <type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.last example")arr = array.new_int(3, 10)plot(array.last(arr))',
	},
	"array.lastindexof": {
		description:
			"The function returns the index of the last occurrence of the value, or -1 if the value is not found.",
		syntax: "array.lastindexof(id, value) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.lastindexof example")a = array.new_float(5,high)index = array.lastindexof(a, high)plot(index)',
	},
	"array.max": {
		description:
			"The function returns the greatest value, or the nth greatest value in a given array.",
		syntax: "array.max(id, nth) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.max")a = array.from(5, -2, 0, 9, 1)thirdHighest = array.max(a, 2) // 1plot(thirdHighest)',
	},
	"array.median": {
		description: "The function returns the median of an array's elements.",
		syntax: "array.median(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.median example")a = array.new_float(0)for i = 0 to 9    array.push(a, close[i])plot(array.median(a))',
	},
	"array.min": {
		description:
			"The function returns the smallest value, or the nth smallest value in a given array.",
		syntax: "array.min(id, nth) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.min")a = array.from(5, -2, 0, 9, 1)secondLowest = array.min(a, 1) // 0plot(secondLowest)',
	},
	"array.mode": {
		description:
			"The function returns the mode of an array's elements. If there are several values with the same frequency, it returns the smallest value.",
		syntax: "array.mode(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.mode example")a = array.new_float(0)for i = 0 to 9    array.push(a, close[i])plot(array.mode(a))',
	},
	"array.new<type>": {
		description: "The function creates a new array object of <type> elements.",
		syntax: "array.new<type>(size, initial_value) → array<type>",
		returns: "array<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.new<string> example")a = array.new<string>(1, "Hello, World!")label.new(bar_index, close, array.get(a, 0))',
	},
	"array.new_bool": {
		description:
			"The function creates a new array object of bool type elements.",
		syntax: "array.new_bool(size, initial_value) → array<bool>",
		returns: "array<bool>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.new_bool example")length = 5a = array.new_bool(length, close > open)plot(array.get(a, 0) ? close : open)',
	},
	"array.new_box": {
		description:
			"The function creates a new array object of box type elements.",
		syntax: "array.new_box(size, initial_value) → array<box>",
		returns: "array<box>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.new_box example")boxes = array.new_box()array.push(boxes, box.new(time, close, time+2, low, xloc=xloc.bar_time))plot(1)',
	},
	"array.new_color": {
		description:
			"The function creates a new array object of color type elements.",
		syntax: "array.new_color(size, initial_value) → array<color>",
		returns: "array<color>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.new_color example")length = 5a = array.new_color(length, color.red)plot(close, color = array.get(a, 0))',
	},
	"array.new_float": {
		description:
			"The function creates a new array object of float type elements.",
		syntax: "array.new_float(size, initial_value) → array<float>",
		returns: "array<float>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.new_float example")length = 5a = array.new_float(length, close)plot(array.sum(a) / length)',
	},
	"array.new_int": {
		description:
			"The function creates a new array object of int type elements.",
		syntax: "array.new_int(size, initial_value) → array<int>",
		returns: "array<int>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.new_int example")length = 5a = array.new_int(length, int(close))plot(array.sum(a) / length)',
	},
	"array.new_label": {
		description:
			"The function creates a new array object of label type elements.",
		syntax: "array.new_label(size, initial_value) → array<label>",
		returns: "array<label>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.new_label example", overlay = true, max_labels_count = 500)//@variable The number of labels to show on the chart.int labelCount = input.int(50, "Labels to show", 1, 500)//@variable An array of `label` objects.var array<label> labelArray = array.new_label()//@variable A `chart.point` for the new label.labelPoint = chart.point.from_index(bar_index, close)//@variable The text in the new label.string labelText = na//@variable The color of the new label.color labelColor = na//@variable The style of the new label.string labelStyle = na// Set the label attributes for rising bars.if close > open    labelText  := "Rising"    labelColor := color.green    labelStyle := label.style_label_down// Set the label attributes for falling bars.else if close < open    labelText  := "Falling"    labelColor := color.red    labelStyle := label.style_label_up// Add a new label to the `labelArray` when the chart bar closed at a new value.if close != open    labelArray.push(label.new(labelPoint, labelText, color = labelColor, style = labelStyle))// Remove the first element and delete its label when the size of the `labelArray` exceeds the `labelCount`.if labelArray.size() > labelCount    label.delete(labelArray.shift())',
	},
	"array.new_line": {
		description:
			"The function creates a new array object of line type elements.",
		syntax: "array.new_line(size, initial_value) → array<line>",
		returns: "array<line>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.new_line example")// draw last 15 linesvar a = array.new_line()array.push(a, line.new(bar_index - 1, close[1], bar_index, close))if array.size(a) > 15    ln = array.shift(a)    line.delete(ln)',
	},
	"array.new_linefill": {
		description:
			"The function creates a new array object of linefill type elements.",
		syntax: "array.new_linefill(size, initial_value) → array<linefill>",
		returns: "array<linefill>",
		type: "function",
		category: "",
		example: "",
	},
	"array.new_string": {
		description:
			"The function creates a new array object of string type elements.",
		syntax: "array.new_string(size, initial_value) → array<string>",
		returns: "array<string>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.new_string example")length = 5a = array.new_string(length, "text")label.new(bar_index, close, array.get(a, 0))',
	},
	"array.new_table": {
		description:
			"The function creates a new array object of table type elements.",
		syntax: "array.new_table(size, initial_value) → array<table>",
		returns: "array<table>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("table array")tables = array.new_table()array.push(tables, table.new(position = position.top_left, rows = 1, columns = 2, bgcolor = color.yellow, border_width=1))plot(1)',
	},
	"array.percentile_linear_interpolation": {
		description:
			"Returns the value for which the specified percentage of array values (percentile) are less than or equal to it, using linear interpolation.",
		syntax:
			"array.percentile_linear_interpolation(id, percentage) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"array.percentile_nearest_rank": {
		description:
			"Returns the value for which the specified percentage of array values (percentile) are less than or equal to it, using the nearest-rank method.",
		syntax: "array.percentile_nearest_rank(id, percentage) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"array.percentrank": {
		description:
			"Returns the percentile rank of the element at the specified index.",
		syntax: "array.percentrank(id, index) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"array.pop": {
		description:
			"The function removes the last element from an array and returns its value.",
		syntax: "array.pop(id) → series <type>",
		returns: "series <type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.pop example")a = array.new_float(5,high)removedEl = array.pop(a)plot(array.size(a))plot(removedEl)',
	},
	"array.push": {
		description: "The function appends a value to an array.",
		syntax: "array.push(id, value) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.push example")a = array.new_float(5, 0)array.push(a, open)plot(array.get(a, 5))',
	},
	"array.range": {
		description:
			"The function returns the difference between the min and max values from a given array.",
		syntax: "array.range(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.range example")a = array.new_float(0)for i = 0 to 9    array.push(a, close[i])plot(array.range(a))',
	},
	"array.remove": {
		description:
			"The function changes the contents of an array by removing the element with the specified index.",
		syntax: "array.remove(id, index) → series <type>",
		returns: "series <type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.remove example")a = array.new_float(5,high)removedEl = array.remove(a, 0)plot(array.size(a))plot(removedEl)',
	},
	"array.reverse": {
		description:
			"The function reverses an array. The first array element becomes the last, and the last array element becomes the first.",
		syntax: "array.reverse(id) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.reverse example")a = array.new_float(0)for i = 0 to 9    array.push(a, close[i])plot(array.get(a, 0))array.reverse(a)plot(array.get(a, 0))',
	},
	"array.set": {
		description:
			"The function sets the value of the element at the specified index.",
		syntax: "array.set(id, index, value) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.set example")a = array.new_float(10)for i = 0 to 9    array.set(a, i, close[i])plot(array.sum(a) / 10)',
	},
	"array.shift": {
		description:
			"The function removes an array's first element and returns its value.",
		syntax: "array.shift(id) → series <type>",
		returns: "series <type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.shift example")a = array.new_float(5,high)removedEl = array.shift(a)plot(array.size(a))plot(removedEl)',
	},
	"array.size": {
		description: "The function returns the number of elements in an array.",
		syntax: "array.size(id) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.size example")a = array.new_float(0)for i = 0 to 9    array.push(a, close[i])// note that changes in slice also modify original arrayslice = array.slice(a, 0, 5)array.push(slice, open)// size was changed in slice and in original arrayplot(array.size(a))plot(array.size(slice))',
	},
	"array.slice": {
		description:
			"The function creates a slice from an existing array. If an object from the slice changes, the changes are applied to both the new and the original arrays.",
		syntax: "array.slice(id, index_from, index_to) → array<type>",
		returns: "array<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.slice example")a = array.new_float(0)for i = 0 to 9    array.push(a, close[i])// take elements from 0 to 4// *note that changes in slice also modify original arrayslice = array.slice(a, 0, 5)plot(array.sum(a) / 10)plot(array.sum(slice) / 5)',
	},
	"array.some": {
		description:
			"Returns true if at least one element of the id array is true, false otherwise.",
		syntax: "array.some(id) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"array.sort": {
		description: "The function sorts the elements of an array.",
		syntax: "array.sort(id, order) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.sort example")a = array.new_float(0,0)for i = 0 to 5    array.push(a, high[i])array.sort(a, order.descending)if barstate.islast    label.new(bar_index, close, str.tostring(a))',
	},
	"array.sort_indices": {
		description:
			"Returns an array of indices which, when used to index the original array, will access its elements in their sorted order. It does not modify the original array.",
		syntax: "array.sort_indices(id, order) → array<int>",
		returns: "array<int>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.sort_indices")a = array.from(5, -2, 0, 9, 1)sortedIndices = array.sort_indices(a) // [1, 2, 4, 0, 3]indexOfSmallestValue = array.get(sortedIndices, 0) // 1smallestValue = array.get(a, indexOfSmallestValue) // -2plot(smallestValue)',
	},
	"array.standardize": {
		description: "The function returns the array of standardized elements.",
		syntax: "array.standardize(id) → array<float>",
		returns: "array<float>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.standardize example")a = array.new_float(0)for i = 0 to 9    array.push(a, close[i])b = array.standardize(a)plot(array.min(b))plot(array.max(b))',
	},
	"array.stdev": {
		description:
			"The function returns the standard deviation of an array's elements.",
		syntax: "array.stdev(id, biased) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.stdev example")a = array.new_float(0)for i = 0 to 9    array.push(a, close[i])plot(array.stdev(a))',
	},
	"array.sum": {
		description: "The function returns the sum of an array's elements.",
		syntax: "array.sum(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.sum example")a = array.new_float(0)for i = 0 to 9    array.push(a, close[i])plot(array.sum(a))',
	},
	"array.unshift": {
		description:
			"The function inserts the value at the beginning of the array.",
		syntax: "array.unshift(id, value) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.unshift example")a = array.new_float(5, 0)array.unshift(a, open)plot(array.get(a, 0))',
	},
	"array.variance": {
		description: "The function returns the variance of an array's elements.",
		syntax: "array.variance(id, biased) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("array.variance example")a = array.new_float(0)for i = 0 to 9    array.push(a, close[i])plot(array.variance(a))',
	},
	barcolor: {
		description: "Set color of bars.",
		syntax:
			"barcolor(color, offset, editable, show_last, title, display) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("barcolor example", overlay=true)barcolor(close < open ? color.black : color.white)',
	},
	bgcolor: {
		description: "Fill background of bars with specified color.",
		syntax:
			"bgcolor(color, offset, editable, show_last, title, display, force_overlay) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("bgcolor example", overlay=true)bgcolor(close < open ? color.new(color.red,70) : color.new(color.green, 70))',
	},
	bool: {
		description:
			"Converts the x value to a bool value. Returns false if x is na, false, or an int/float value equal to 0. Returns true for all other possible values.",
		syntax: "bool(x) → const bool",
		returns: "const bool",
		type: "function",
		category: "",
		example: "",
	},
	box: {
		description: "Casts na to box.",
		syntax: "box(x) → series box",
		returns: "series box",
		type: "function",
		category: "",
		example: "",
	},
	"box.copy": {
		description: "Clones the box object.",
		syntax: "box.copy(id) → series box",
		returns: "series box",
		type: "function",
		category: "",
		example:
			"//@version=6indicator('Last 50 bars price ranges', overlay = true)LOOKBACK = 50highest = ta.highest(LOOKBACK)lowest = ta.lowest(LOOKBACK)if barstate.islastconfirmedhistory    var BoxLast = box.new(bar_index[LOOKBACK], highest, bar_index, lowest, bgcolor = color.new(color.green, 80))    var BoxPrev = box.copy(BoxLast)    box.set_lefttop(BoxPrev, bar_index[LOOKBACK * 2], highest[50])    box.set_rightbottom(BoxPrev, bar_index[LOOKBACK], lowest[50])    box.set_bgcolor(BoxPrev, color.new(color.red, 80))",
	},
	"box.delete": {
		description:
			"Deletes the specified box object. If it has already been deleted, does nothing.",
		syntax: "box.delete(id) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.get_bottom": {
		description: "Returns the price value of the bottom border of the box.",
		syntax: "box.get_bottom(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"box.get_left": {
		description:
			"Returns the bar index or the UNIX time (depending on the last value used for 'xloc') of the left border of the box.",
		syntax: "box.get_left(id) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	"box.get_right": {
		description:
			"Returns the bar index or the UNIX time (depending on the last value used for 'xloc') of the right border of the box.",
		syntax: "box.get_right(id) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	"box.get_top": {
		description: "Returns the price value of the top border of the box.",
		syntax: "box.get_top(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"box.new": {
		description: "Creates a new box object.",
		syntax:
			"box.new(top_left, bottom_right, border_color, border_width, border_style, extend, xloc, bgcolor, text, text_size, text_color, text_halign, text_valign, text_wrap, text_font_family, force_overlay, text_formatting) → series box",
		returns: "series box",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("box.new")var b = box.new(time, open, time + 60 * 60 * 24, close, xloc=xloc.bar_time, border_style=line.style_dashed)box.set_lefttop(b, time, 100)box.set_rightbottom(b, time + 60 * 60 * 24, 500)box.set_bgcolor(b, color.green)',
	},
	"box.set_bgcolor": {
		description: "Sets the background color of the box.",
		syntax: "box.set_bgcolor(id, color) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_border_color": {
		description: "Sets the border color of the box.",
		syntax: "box.set_border_color(id, color) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_border_style": {
		description: "Sets the border style of the box.",
		syntax: "box.set_border_style(id, style) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_border_width": {
		description: "Sets the border width of the box.",
		syntax: "box.set_border_width(id, width) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_bottom": {
		description: "Sets the bottom coordinate of the box.",
		syntax: "box.set_bottom(id, bottom) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_bottom_right_point": {
		description:
			"Sets the bottom-right corner location of the id box to point.",
		syntax: "box.set_bottom_right_point(id, point) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_extend": {
		description:
			"Sets extending type of the border of this box object. When extend.none is used, the horizontal borders start at the left border and end at the right border. With extend.left or extend.right, the horizontal borders are extended indefinitely to the left or right of the box, respectively. With extend.both, the horizontal borders are extended on both sides.",
		syntax: "box.set_extend(id, extend) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_left": {
		description: "Sets the left coordinate of the box.",
		syntax: "box.set_left(id, left) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_lefttop": {
		description: "Sets the left and top coordinates of the box.",
		syntax: "box.set_lefttop(id, left, top) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_right": {
		description: "Sets the right coordinate of the box.",
		syntax: "box.set_right(id, right) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_rightbottom": {
		description: "Sets the right and bottom coordinates of the box.",
		syntax: "box.set_rightbottom(id, right, bottom) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_text": {
		description: "The function sets the text in the box.",
		syntax: "box.set_text(id, text) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_text_color": {
		description: "The function sets the color of the text inside the box.",
		syntax: "box.set_text_color(id, text_color) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_text_font_family": {
		description:
			"The function sets the font family of the text inside the box.",
		syntax: "box.set_text_font_family(id, text_font_family) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Example of setting the box font")if barstate.islastconfirmedhistory    b = box.new(bar_index, open-ta.tr, bar_index-50, open-ta.tr*5, text="monospace")    box.set_text_font_family(b, font.family_monospace)',
	},
	"box.set_text_formatting": {
		description:
			"Sets the formatting attributes the drawing applies to displayed text.",
		syntax: "box.set_text_formatting(id, text_formatting) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_text_halign": {
		description:
			"The function sets the horizontal alignment of the box's text.",
		syntax: "box.set_text_halign(id, text_halign) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_text_size": {
		description: "The function sets the size of the box's text.",
		syntax: "box.set_text_size(id, text_size) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_text_valign": {
		description: "The function sets the vertical alignment of a box's text.",
		syntax: "box.set_text_valign(id, text_valign) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_text_wrap": {
		description:
			"The function sets the mode of wrapping of the text inside the box.",
		syntax: "box.set_text_wrap(id, text_wrap) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_top": {
		description: "Sets the top coordinate of the box.",
		syntax: "box.set_top(id, top) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_top_left_point": {
		description: "Sets the top-left corner location of the id box to point.",
		syntax: "box.set_top_left_point(id, point) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"box.set_xloc": {
		description:
			"Sets the left and right borders of a box and updates its xloc property.",
		syntax: "box.set_xloc(id, left, right, xloc) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"chart.point.copy": {
		description:
			"Creates a copy of a chart.point object with the specified id.",
		syntax: "chart.point.copy(id) → chart.point",
		returns: "chart.point",
		type: "function",
		category: "",
		example: "",
	},
	"chart.point.from_index": {
		description:
			"Returns a chart.point object with index as its x-coordinate and price as its y-coordinate.",
		syntax: "chart.point.from_index(index, price) → chart.point",
		returns: "chart.point",
		type: "function",
		category: "",
		example: "",
	},
	"chart.point.from_time": {
		description:
			"Returns a chart.point object with time as its x-coordinate and price as its y-coordinate.",
		syntax: "chart.point.from_time(time, price) → chart.point",
		returns: "chart.point",
		type: "function",
		category: "",
		example: "",
	},
	"chart.point.new": {
		description:
			"Creates a new chart.point object with the specified time, index, and price.",
		syntax: "chart.point.new(time, index, price) → chart.point",
		returns: "chart.point",
		type: "function",
		category: "",
		example: "",
	},
	"chart.point.now": {
		description: "Returns a chart.point object with price as the y-coordinate",
		syntax: "chart.point.now(price) → chart.point",
		returns: "chart.point",
		type: "function",
		category: "",
		example: "",
	},
	color: {
		description: "Casts na to color",
		syntax: "color(x) → const color",
		returns: "const color",
		type: "function",
		category: "",
		example: "",
	},
	"color.b": {
		description: "Retrieves the value of the color's blue component.",
		syntax: "color.b(color) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("color.b", overlay=true)plot(color.b(color.blue))',
	},
	"color.from_gradient": {
		description:
			"Based on the relative position of value in the bottom_value to top_value range, the function returns a color from the gradient defined by bottom_color to top_color.",
		syntax:
			"color.from_gradient(value, bottom_value, top_value, bottom_color, top_color) → series color",
		returns: "series color",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("color.from_gradient", overlay=true)color1 = color.from_gradient(close, low, high, color.yellow, color.lime)color2 = color.from_gradient(ta.rsi(close, 7), 0, 100, color.rgb(255, 0, 0), color.rgb(0, 255, 0, 50))plot(close, color=color1)plot(ta.rsi(close,7), color=color2)',
	},
	"color.g": {
		description: "Retrieves the value of the color's green component.",
		syntax: "color.g(color) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("color.g", overlay=true)plot(color.g(color.green))',
	},
	"color.new": {
		description:
			"Function color applies the specified transparency to the given color.",
		syntax: "color.new(color, transp) → const color",
		returns: "const color",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("color.new", overlay=true)plot(close, color=color.new(color.red, 50))',
	},
	"color.r": {
		description: "Retrieves the value of the color's red component.",
		syntax: "color.r(color) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("color.r", overlay=true)plot(color.r(color.red))',
	},
	"color.rgb": {
		description:
			"Creates a new color with transparency using the RGB color model.",
		syntax: "color.rgb(red, green, blue, transp) → const color",
		returns: "const color",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("color.rgb", overlay=true)plot(close, color=color.rgb(255, 0, 0, 50))',
	},
	"color.t": {
		description: "Retrieves the color's transparency.",
		syntax: "color.t(color) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("color.t", overlay=true)plot(color.t(color.new(color.red, 50)))',
	},
	dayofmonth: {
		description:
			"Calculates the day number of the month, in a specified time zone, from a UNIX timestamp.",
		syntax: "dayofmonth(time, timezone) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	dayofweek: {
		description:
			"Calculates the day number of the week, in a specified time zone, from a UNIX timestamp.",
		syntax: "dayofweek(time, timezone) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	fill: {
		description:
			"Fills background between two plots or hlines with a given color.",
		syntax:
			"fill(hline1, hline2, color, title, editable, fillgaps, display) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Fill between hlines", overlay = false)h1 = hline(20)h2 = hline(10)fill(h1, h2, color = color.new(color.blue, 90))',
	},
	fixnan: {
		description:
			"For a given series replaces NaN values with previous nearest non-NaN value.",
		syntax: "fixnan(source) → series color",
		returns: "series color",
		type: "function",
		category: "",
		example: "",
	},
	float: {
		description: "Casts na to float",
		syntax: "float(x) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example: "",
	},
	hline: {
		description: "Renders a horizontal line at a given fixed price level.",
		syntax:
			"hline(price, title, color, linestyle, linewidth, editable, display) → hline",
		returns: "hline",
		type: "function",
		category: "",
		example:
			"//@version=6indicator(\"input.hline\", overlay=true)hline(3.14, title='Pi', color=color.blue, linestyle=hline.style_dotted, linewidth=2)// You may fill the background between any two hlines with a fill() function:h1 = hline(20)h2 = hline(10)fill(h1, h2, color=color.new(color.green, 90))",
	},
	hour: {
		description: "",
		syntax: "hour(time, timezone) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	indicator: {
		description:
			"This declaration statement designates the script as an indicator and sets a number of indicator-related properties.",
		syntax:
			"indicator(title, shorttitle, overlay, format, precision, scale, max_bars_back, timeframe, timeframe_gaps, explicit_plot_zorder, max_lines_count, max_labels_count, max_boxes_count, calc_bars_count, max_polylines_count, dynamic_requests, behind_chart) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("My script", shorttitle="Script")plot(close)',
	},
	input: {
		description:
			"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function automatically detects the type of the argument used for 'defval' and uses the corresponding input widget.",
		syntax:
			"input(defval, title, tooltip, inline, group, display, active) → input color",
		returns: "input color",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("input", overlay=true)i_switch = input(true, "On/Off")plot(i_switch ? open : na)i_len = input(7, "Length")i_src = input(close, "Source")plot(ta.sma(i_src, i_len))i_border = input(142.50, "Price Border")hline(i_border)bgcolor(close > i_border ? color.green : color.red)i_col = input(color.red, "Plot Color")plot(close, color=i_col)i_text = input("Hello!", "Message")l = label.new(bar_index, high, text=i_text)label.delete(l[1])',
	},
	"input.bool": {
		description:
			"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a checkmark to the script's inputs.",
		syntax:
			"input.bool(defval, title, tooltip, inline, group, confirm, display, active) → input bool",
		returns: "input bool",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("input.bool", overlay=true)i_switch = input.bool(true, "On/Off")plot(i_switch ? open : na)',
	},
	"input.color": {
		description:
			"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a color picker that allows the user to select a color and transparency, either from a palette or a hex value.",
		syntax:
			"input.color(defval, title, tooltip, inline, group, confirm, display, active) → input color",
		returns: "input color",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("input.color", overlay=true)i_col = input.color(color.red, "Plot Color")plot(close, color=i_col)',
	},
	"input.enum": {
		description:
			"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a dropdown with options based on the enum fields passed to its defval and options parameters.",
		syntax:
			"input.enum(defval, title, options, tooltip, inline, group, confirm, display, active) → input enum",
		returns: "input enum",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Session highlight", overlay = true)//@enum        Contains fields with popular timezones as titles.//@field exch  Has an empty string as the title to represent the chart timezone.enum tz    utc  = "UTC"    exch = ""    ny   = "America/New_York"    chi  = "America/Chicago"    lon  = "Europe/London"    tok  = "Asia/Tokyo"//@variable The session string.selectedSession = input.session("1200-1500", "Session")//@variable The selected timezone. The input\'s dropdown contains the fields in the `tz` enum.selectedTimezone = input.enum(tz.utc, "Session Timezone")//@variable Is `true` if the current bar\'s time is in the specified session.bool inSession = falseif not na(time("", selectedSession, str.tostring(selectedTimezone)))    inSession := true// Highlight the background when `inSession` is `true`.bgcolor(inSession ? color.new(color.green, 90) : na, title = "Active session highlight")',
	},
	"input.float": {
		description:
			"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for a float input to the script's inputs.",
		syntax:
			"input.float(defval, title, options, tooltip, inline, group, confirm, display, active) → input float",
		returns: "input float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("input.float", overlay=true)i_angle1 = input.float(0.5, "Sin Angle", minval=-3.14, maxval=3.14, step=0.02)plot(math.sin(i_angle1) > 0 ? close : open, "sin", color=color.green)i_angle2 = input.float(0, "Cos Angle", options=[-3.14, -1.57, 0, 1.57, 3.14])plot(math.cos(i_angle2) > 0 ? close : open, "cos", color=color.red)',
	},
	"input.int": {
		description:
			"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for an integer input to the script's inputs.",
		syntax:
			"input.int(defval, title, options, tooltip, inline, group, confirm, display, active) → input int",
		returns: "input int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("input.int", overlay=true)i_len1 = input.int(10, "Length 1", minval=5, maxval=21, step=1)plot(ta.sma(close, i_len1))i_len2 = input.int(10, "Length 2", options=[5, 10, 21])plot(ta.sma(close, i_len2))',
	},
	"input.price": {
		description:
			'Adds a price input to the script\'s "Settings/Inputs" tab. The user can change the price in the settings or by selecting the indicator and dragging the price line.',
		syntax:
			"input.price(defval, title, tooltip, inline, group, confirm, display, active) → input float",
		returns: "input float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("input.price", overlay=true)price1 = input.price(title="Date", defval=42)plot(price1)price2 = input.price(54, title="Date")plot(price2)',
	},
	"input.session": {
		description:
			"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds two dropdowns that allow the user to specify the beginning and the end of a session using the session selector and returns the result as a string.",
		syntax:
			"input.session(defval, title, options, tooltip, inline, group, confirm, display, active) → input string",
		returns: "input string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("input.session", overlay=true)i_sess = input.session("1300-1700", "Session", options=["0930-1600", "1300-1700", "1700-2100"])t = time(timeframe.period, i_sess)bgcolor(time == t ? color.green : na)',
	},
	"input.source": {
		description:
			"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a dropdown that allows the user to select a source for the calculation, e.g. close, hl2, etc. The user can also select an output from another indicator on their chart as the source.",
		syntax:
			"input.source(defval, title, tooltip, inline, group, display, active, confirm) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("input.source", overlay=true)i_src = input.source(close, "Source")plot(i_src)',
	},
	"input.string": {
		description:
			"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for a string input to the script's inputs.",
		syntax:
			"input.string(defval, title, options, tooltip, inline, group, confirm, display, active) → input string",
		returns: "input string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("input.string", overlay=true)i_text = input.string("Hello!", "Message")l = label.new(bar_index, high, i_text)label.delete(l[1])',
	},
	"input.symbol": {
		description:
			"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field that allows the user to select a specific symbol using the symbol search and returns that symbol, paired with its exchange prefix, as a string.",
		syntax:
			"input.symbol(defval, title, tooltip, inline, group, confirm, display, active) → input string",
		returns: "input string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("input.symbol", overlay=true)i_sym = input.symbol("DELL", "Symbol")s = request.security(i_sym, \'D\', close)plot(s)',
	},
	"input.text_area": {
		description:
			"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for a multiline text input.",
		syntax:
			"input.text_area(defval, title, tooltip, group, confirm, display, active) → input string",
		returns: "input string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("input.text_area")i_text = input.text_area(defval = "Hello \\nWorld!", title = "Message")plot(close)',
	},
	"input.time": {
		description:
			'Adds two inputs to the script\'s "Settings/Inputs" tab on the same line: one for the date and one for the time. The user can change the price in the settings or by selecting the indicator and dragging the price line. The function returns a date/time value in UNIX format.',
		syntax:
			"input.time(defval, title, tooltip, inline, group, confirm, display, active) → input int",
		returns: "input int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("input.time", overlay=true)i_date = input.time(timestamp("20 Jul 2021 00:00 +0300"), "Date")l = label.new(i_date, high, "Date", xloc=xloc.bar_time)label.delete(l[1])',
	},
	"input.timeframe": {
		description:
			"Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a dropdown that allows the user to select a specific timeframe via the timeframe selector and returns it as a string. The selector includes the custom timeframes a user may have added using the chart's Timeframe dropdown.",
		syntax:
			"input.timeframe(defval, title, options, tooltip, inline, group, confirm, display, active) → input string",
		returns: "input string",
		type: "function",
		category: "",
		example:
			"//@version=6indicator(\"input.timeframe\", overlay=true)i_res = input.timeframe('D', \"Resolution\", options=['D', 'W', 'M'])s = request.security(\"AAPL\", i_res, close)plot(s)",
	},
	int: {
		description: "Casts na or truncates float value to int",
		syntax: "int(x) → const int",
		returns: "const int",
		type: "function",
		category: "",
		example: "",
	},
	label: {
		description: "Casts na to label",
		syntax: "label(x) → series label",
		returns: "series label",
		type: "function",
		category: "",
		example: "",
	},
	"label.copy": {
		description: "Clones the label object.",
		syntax: "label.copy(id) → series label",
		returns: "series label",
		type: "function",
		category: "",
		example:
			"//@version=6indicator('Last 100 bars highest/lowest', overlay = true)LOOKBACK = 100highest = ta.highest(LOOKBACK)highestBars = ta.highestbars(LOOKBACK)lowest = ta.lowest(LOOKBACK)lowestBars = ta.lowestbars(LOOKBACK)if barstate.islastconfirmedhistory    var labelHigh = label.new(bar_index + highestBars, highest, str.tostring(highest), color = color.green)    var labelLow = label.copy(labelHigh)    label.set_xy(labelLow, bar_index + lowestBars, lowest)    label.set_text(labelLow, str.tostring(lowest))    label.set_color(labelLow, color.red)    label.set_style(labelLow, label.style_label_up)",
	},
	"label.delete": {
		description:
			"Deletes the specified label object. If it has already been deleted, does nothing.",
		syntax: "label.delete(id) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"label.get_text": {
		description: "Returns the text of this label object.",
		syntax: "label.get_text(id) → series string",
		returns: "series string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("label.get_text")my_label = label.new(time, open, text="Open bar text", xloc=xloc.bar_time)a = label.get_text(my_label)label.new(time, close, text = a + " new", xloc=xloc.bar_time)',
	},
	"label.get_x": {
		description:
			"Returns UNIX time or bar index (depending on the last xloc value set) of this label's position.",
		syntax: "label.get_x(id) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("label.get_x")my_label = label.new(time, open, text="Open bar text", xloc=xloc.bar_time)a = label.get_x(my_label)plot(time - label.get_x(my_label)) //draws zero plot',
	},
	"label.get_y": {
		description: "Returns price of this label's position.",
		syntax: "label.get_y(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"label.new": {
		description: "Creates new label object.",
		syntax:
			"label.new(point, text, xloc, yloc, color, style, textcolor, size, textalign, tooltip, text_font_family, force_overlay, text_formatting) → series label",
		returns: "series label",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("label.new")var label1 = label.new(bar_index, low, text="Hello, world!", style=label.style_circle)label.set_x(label1, 0)label.set_xloc(label1, time, xloc.bar_time)label.set_color(label1, color.red)label.set_size(label1, size.large)',
	},
	"label.set_color": {
		description: "Sets label border and arrow color.",
		syntax: "label.set_color(id, color) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"label.set_point": {
		description: "Sets the location of the id label to point.",
		syntax: "label.set_point(id, point) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"label.set_size": {
		description: "Sets arrow and text size of the specified label object.",
		syntax: "label.set_size(id, size) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"label.set_style": {
		description: "Sets label style.",
		syntax: "label.set_style(id, style) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"label.set_text": {
		description: "Sets label text",
		syntax: "label.set_text(id, text) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"label.set_text_font_family": {
		description:
			"The function sets the font family of the text inside the label.",
		syntax: "label.set_text_font_family(id, text_font_family) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Example of setting the label font")if barstate.islastconfirmedhistory    l = label.new(bar_index, 0, "monospace", yloc=yloc.abovebar)    label.set_text_font_family(l, font.family_monospace)',
	},
	"label.set_text_formatting": {
		description:
			"Sets the formatting attributes the drawing applies to displayed text.",
		syntax: "label.set_text_formatting(id, text_formatting) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"label.set_textalign": {
		description: "Sets the alignment for the label text.",
		syntax: "label.set_textalign(id, textalign) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"label.set_textcolor": {
		description: "Sets color of the label text.",
		syntax: "label.set_textcolor(id, textcolor) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"label.set_tooltip": {
		description: "Sets the tooltip text.",
		syntax: "label.set_tooltip(id, tooltip) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"label.set_x": {
		description:
			"Sets bar index or bar time (depending on the xloc) of the label position.",
		syntax: "label.set_x(id, x) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"label.set_xloc": {
		description: "Sets x-location and new bar index/time value.",
		syntax: "label.set_xloc(id, x, xloc) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"label.set_xy": {
		description: "Sets bar index/time and price of the label position.",
		syntax: "label.set_xy(id, x, y) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"label.set_y": {
		description: "Sets price of the label position",
		syntax: "label.set_y(id, y) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"label.set_yloc": {
		description: "Sets new y-location calculation algorithm.",
		syntax: "label.set_yloc(id, yloc) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	library: {
		description: "Declaration statement identifying a script as a library.",
		syntax: "library(title, overlay, dynamic_requests) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6// @description Math librarylibrary("num_methods", overlay = true)// Calculate "sinh()" from the float parameter `x`export sinh(float x) =>    (math.exp(x) - math.exp(-x)) / 2.0plot(sinh(0))',
	},
	line: {
		description: "Casts na to line",
		syntax: "line(x) → series line",
		returns: "series line",
		type: "function",
		category: "",
		example: "",
	},
	"line.copy": {
		description: "Clones the line object.",
		syntax: "line.copy(id) → series line",
		returns: "series line",
		type: "function",
		category: "",
		example:
			"//@version=6indicator('Last 100 bars price range', overlay = true)LOOKBACK = 100highest = ta.highest(LOOKBACK)lowest = ta.lowest(LOOKBACK)if barstate.islastconfirmedhistory    var lineTop = line.new(bar_index[LOOKBACK], highest, bar_index, highest, color = color.green)    var lineBottom = line.copy(lineTop)    line.set_y1(lineBottom, lowest)    line.set_y2(lineBottom, lowest)    line.set_color(lineBottom, color.red)",
	},
	"line.delete": {
		description:
			"Deletes the specified line object. If it has already been deleted, does nothing.",
		syntax: "line.delete(id) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"line.get_price": {
		description: "Returns the price level of a line at a given bar index.",
		syntax: "line.get_price(id, x) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("GetPrice", overlay=true)var line l = naif bar_index == 10    l := line.new(0, high[5], bar_index, high)plot(line.get_price(l, bar_index), color=color.green)',
	},
	"line.get_x1": {
		description:
			"Returns UNIX time or bar index (depending on the last xloc value set) of the first point of the line.",
		syntax: "line.get_x1(id) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("line.get_x1")my_line = line.new(time, open, time + 60 * 60 * 24, close, xloc=xloc.bar_time)a = line.get_x1(my_line)plot(time - line.get_x1(my_line)) //draws zero plot',
	},
	"line.get_x2": {
		description:
			"Returns UNIX time or bar index (depending on the last xloc value set) of the second point of the line.",
		syntax: "line.get_x2(id) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	"line.get_y1": {
		description: "Returns price of the first point of the line.",
		syntax: "line.get_y1(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"line.get_y2": {
		description: "Returns price of the second point of the line.",
		syntax: "line.get_y2(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"line.new": {
		description: "Creates new line object.",
		syntax:
			"line.new(first_point, second_point, xloc, extend, color, style, width, force_overlay) → series line",
		returns: "series line",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("line.new")var line1 = line.new(0, low, bar_index, high, extend=extend.right)var line2 = line.new(time, open, time + 60 * 60 * 24, close, xloc=xloc.bar_time, style=line.style_dashed)line.set_x2(line1, 0)line.set_xloc(line1, time, time + 60 * 60 * 24, xloc.bar_time)line.set_color(line2, color.green)line.set_width(line2, 5)',
	},
	"line.set_color": {
		description: "Sets the line color",
		syntax: "line.set_color(id, color) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"line.set_extend": {
		description:
			"Sets extending type of this line object. If extend=extend.none, draws segment starting at point (x1, y1) and ending at point (x2, y2). If extend is equal to extend.right or extend.left, draws a ray starting at point (x1, y1) or (x2, y2), respectively. If extend=extend.both, draws a straight line that goes through these points.",
		syntax: "line.set_extend(id, extend) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"line.set_first_point": {
		description: "Sets the first point of the id line to point.",
		syntax: "line.set_first_point(id, point) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"line.set_second_point": {
		description: "Sets the second point of the id line to point.",
		syntax: "line.set_second_point(id, point) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"line.set_style": {
		description: "Sets the line style",
		syntax: "line.set_style(id, style) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"line.set_width": {
		description: "Sets the line width.",
		syntax: "line.set_width(id, width) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"line.set_x1": {
		description:
			"Sets bar index or bar time (depending on the xloc) of the first point.",
		syntax: "line.set_x1(id, x) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"line.set_x2": {
		description:
			"Sets bar index or bar time (depending on the xloc) of the second point.",
		syntax: "line.set_x2(id, x) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"line.set_xloc": {
		description: "Sets x-location and new bar index/time values.",
		syntax: "line.set_xloc(id, x1, x2, xloc) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"line.set_xy1": {
		description: "Sets bar index/time and price of the first point.",
		syntax: "line.set_xy1(id, x, y) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"line.set_xy2": {
		description: "Sets bar index/time and price of the second point",
		syntax: "line.set_xy2(id, x, y) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"line.set_y1": {
		description: "Sets price of the first point",
		syntax: "line.set_y1(id, y) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"line.set_y2": {
		description: "Sets price of the second point.",
		syntax: "line.set_y2(id, y) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	linefill: {
		description: "Casts na to linefill.",
		syntax: "linefill(x) → series linefill",
		returns: "series linefill",
		type: "function",
		category: "",
		example: "",
	},
	"linefill.delete": {
		description:
			"Deletes the specified linefill object. If it has already been deleted, does nothing.",
		syntax: "linefill.delete(id) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"linefill.get_line1": {
		description: "Returns the ID of the first line used in the id linefill.",
		syntax: "linefill.get_line1(id) → series line",
		returns: "series line",
		type: "function",
		category: "",
		example: "",
	},
	"linefill.get_line2": {
		description: "Returns the ID of the second line used in the id linefill.",
		syntax: "linefill.get_line2(id) → series line",
		returns: "series line",
		type: "function",
		category: "",
		example: "",
	},
	"linefill.new": {
		description:
			"Creates a new linefill object and displays it on the chart, filling the space between line1 and line2 with the color specified in color.",
		syntax: "linefill.new(line1, line2, color) → series linefill",
		returns: "series linefill",
		type: "function",
		category: "",
		example: "",
	},
	"linefill.set_color": {
		description:
			"The function sets the color of the linefill object passed to it.",
		syntax: "linefill.set_color(id, color) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"log.error": {
		description:
			'Converts the formatting string and value(s) into a formatted string, and sends the result to the "Pine logs" menu tagged with the "error" debug level.',
		syntax: "log.error(message) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("My strategy", overlay = true, process_orders_on_close = true)bracketTickSizeInput = input.int(1000, "Stoploss/Take-Profit distance (in ticks)")longCondition = ta.crossover(ta.sma(close, 14), ta.sma(close, 28))if (longCondition)    limitLevel = close * 1.01    log.info("Long limit order has been placed at {0}", limitLevel)    strategy.order("My Long Entry Id", strategy.long, limit = limitLevel)    log.info("Exit orders have been placed: Take-profit at {0}, Stop-loss at {1}", close, limitLevel)    strategy.exit("Exit", "My Long Entry Id", profit = bracketTickSizeInput, loss = bracketTickSizeInput)if strategy.opentrades > 10    log.warning("{0} positions opened in the same direction in a row. Try adjusting `bracketTickSizeInput`", strategy.opentrades)last10Perc = strategy.initial_capital / 10 > strategy.equityif (last10Perc and not last10Perc[1])    log.error("The strategy has lost 90% of the initial capital!")',
	},
	"log.info": {
		description:
			'Converts the formatting string and value(s) into a formatted string, and sends the result to the "Pine logs" menu tagged with the "info" debug level.',
		syntax: "log.info(message) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("My strategy", overlay = true, process_orders_on_close = true)bracketTickSizeInput = input.int(1000, "Stoploss/Take-Profit distance (in ticks)")longCondition = ta.crossover(ta.sma(close, 14), ta.sma(close, 28))if (longCondition)    limitLevel = close * 1.01    log.info("Long limit order has been placed at {0}", limitLevel)    strategy.order("My Long Entry Id", strategy.long, limit = limitLevel)    log.info("Exit orders have been placed: Take-profit at {0}, Stop-loss at {1}", close, limitLevel)    strategy.exit("Exit", "My Long Entry Id", profit = bracketTickSizeInput, loss = bracketTickSizeInput)if strategy.opentrades > 10    log.warning("{0} positions opened in the same direction in a row. Try adjusting `bracketTickSizeInput`", strategy.opentrades)last10Perc = strategy.initial_capital / 10 > strategy.equityif (last10Perc and not last10Perc[1])    log.error("The strategy has lost 90% of the initial capital!")',
	},
	"log.warning": {
		description:
			'Converts the formatting string and value(s) into a formatted string, and sends the result to the "Pine logs" menu tagged with the "warning" debug level.',
		syntax: "log.warning(message) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("My strategy", overlay = true, process_orders_on_close = true)bracketTickSizeInput = input.int(1000, "Stoploss/Take-Profit distance (in ticks)")longCondition = ta.crossover(ta.sma(close, 14), ta.sma(close, 28))if (longCondition)    limitLevel = close * 1.01    log.info("Long limit order has been placed at {0}", limitLevel)    strategy.order("My Long Entry Id", strategy.long, limit = limitLevel)    log.info("Exit orders have been placed: Take-profit at {0}, Stop-loss at {1}", close, limitLevel)    strategy.exit("Exit", "My Long Entry Id", profit = bracketTickSizeInput, loss = bracketTickSizeInput)if strategy.opentrades > 10    log.warning("{0} positions opened in the same direction in a row. Try adjusting `bracketTickSizeInput`", strategy.opentrades)last10Perc = strategy.initial_capital / 10 > strategy.equityif (last10Perc and not last10Perc[1])    log.error("The strategy has lost 90% of the initial capital!")',
	},
	"map.clear": {
		description: "Clears the map, removing all key-value pairs from it.",
		syntax: "map.clear(id) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("map.clear example")oddMap = map.new<int, bool>()oddMap.put(1, true)oddMap.put(2, false)oddMap.put(3, true)map.clear(oddMap)plot(oddMap.size())',
	},
	"map.contains": {
		description:
			"Returns true if the key was found in the id map, false otherwise.",
		syntax: "map.contains(id, key) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("map.includes example")a = map.new<string, float>()a.put("open", open)p = closeif map.contains(a, "open")    p := a.get("open")plot(p)',
	},
	"map.copy": {
		description: "Creates a copy of an existing map.",
		syntax: "map.copy(id) → map<keyType, valueType>",
		returns: "map<keyType, valueType>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("map.copy example")a = map.new<string, int>()a.put("example", 1)b = map.copy(a)a := map.new<string, int>()a.put("example", 2)plot(a.get("example"))plot(b.get("example"))',
	},
	"map.get": {
		description:
			"Returns the value associated with the specified key in the id map.",
		syntax: "map.get(id, key) → <value_type>",
		returns: "<value_type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("map.get example")a = map.new<int, int>()size = 10for i = 0 to size    a.put(i, size-i)plot(map.get(a, 1))',
	},
	"map.keys": {
		description:
			"Returns an array of all the keys in the id map. The resulting array is a copy and any changes to it are not reflected in the original map.",
		syntax: "map.keys(id) → array<type>",
		returns: "array<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("map.keys example")a = map.new<string, float>()a.put("open", open)a.put("high", high)a.put("low", low)a.put("close", close)keys = map.keys(a)ohlc = 0.0for key in keys    ohlc += a.get(key)plot(ohlc/4)',
	},
	"map.new<type,type>": {
		description:
			"Creates a new map object: a collection that consists of key-value pairs, where all keys are of the keyType, and all values are of the valueType.",
		syntax: "map.new<keyType, valueType>() → map<keyType, valueType>",
		returns: "map<keyType, valueType>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("map.new<string, int> example")a = map.new<string, int>()a.put("example", 1)label.new(bar_index, close, str.tostring(a.get("example")))',
	},
	"map.put": {
		description: "Puts a new key-value pair into the id map.",
		syntax: "map.put(id, key, value) → <value_type>",
		returns: "<value_type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("map.put example")a = map.new<string, float>()map.put(a, "first", 10)map.put(a, "second", 15)prevFirst = map.put(a, "first", 20)currFirst = a.get("first")plot(prevFirst)plot(currFirst)',
	},
	"map.put_all": {
		description: "Puts all key-value pairs from the id2 map into the id map.",
		syntax: "map.put_all(id, id2) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("map.put_all example")a = map.new<string, float>()b = map.new<string, float>()a.put("first", 10)a.put("second", 15)b.put("third", 20)map.put_all(a, b)plot(a.get("third"))',
	},
	"map.remove": {
		description: "Removes a key-value pair from the id map.",
		syntax: "map.remove(id, key) → <value_type>",
		returns: "<value_type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("map.remove example")a = map.new<string, color>()a.put("firstColor", color.green)oldColorValue = map.remove(a, "firstColor")plot(close, color = oldColorValue)',
	},
	"map.size": {
		description: "Returns the number of key-value pairs in the id map.",
		syntax: "map.size(id) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("map.size example")a = map.new<int, int>()size = 10for i = 0 to size    a.put(i, size-i)plot(map.size(a))',
	},
	"map.values": {
		description:
			"Returns an array of all the values in the id map. The resulting array is a copy and any changes to it are not reflected in the original map.",
		syntax: "map.values(id) → array<type>",
		returns: "array<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("map.values example")a = map.new<string, float>()a.put("open", open)a.put("high", high)a.put("low", low)a.put("close", close)values = map.values(a)ohlc = 0.0for value in values    ohlc += valueplot(ohlc/4)',
	},
	"math.abs": {
		description:
			"Absolute value of number is number if number >= 0, or -number otherwise.",
		syntax: "math.abs(number) → const int",
		returns: "const int",
		type: "function",
		category: "",
		example: "",
	},
	"math.acos": {
		description:
			"The acos function returns the arccosine (in radians) of number such that cos(acos(y)) = y for y in range [-1, 1].",
		syntax: "math.acos(angle) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example: "",
	},
	"math.asin": {
		description:
			"The asin function returns the arcsine (in radians) of number such that sin(asin(y)) = y for y in range [-1, 1].",
		syntax: "math.asin(angle) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example: "",
	},
	"math.atan": {
		description:
			"The atan function returns the arctangent (in radians) of number such that tan(atan(y)) = y for any y.",
		syntax: "math.atan(angle) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example: "",
	},
	"math.avg": {
		description: "Calculates average of all given series (elementwise).",
		syntax: "math.avg(number0, number1, ...) → simple float",
		returns: "simple float",
		type: "function",
		category: "",
		example: "",
	},
	"math.ceil": {
		description:
			'Rounds the specified number up to the smallest whole number ("int" value) that is greater than or equal to it.',
		syntax: "math.ceil(number) → const int",
		returns: "const int",
		type: "function",
		category: "",
		example: "",
	},
	"math.cos": {
		description:
			"The cos function returns the trigonometric cosine of an angle.",
		syntax: "math.cos(angle) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example: "",
	},
	"math.exp": {
		description:
			"The exp function of number is e raised to the power of number, where e is Euler's number.",
		syntax: "math.exp(number) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example: "",
	},
	"math.floor": {
		description:
			'Rounds the specified number down to the largest whole number ("int" value) that is less than or equal to it.',
		syntax: "math.floor(number) → const int",
		returns: "const int",
		type: "function",
		category: "",
		example: "",
	},
	"math.log": {
		description:
			"Natural logarithm of any number > 0 is the unique y such that e^y = number.",
		syntax: "math.log(number) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example: "",
	},
	"math.log10": {
		description:
			"The common (or base 10) logarithm of number is the power to which 10 must be raised to obtain the number. 10^y = number.",
		syntax: "math.log10(number) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example: "",
	},
	"math.max": {
		description: "Returns the greatest of multiple values.",
		syntax: "math.max(number0, number1, ...) → const int",
		returns: "const int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("math.max", overlay=true)plot(math.max(close, open))plot(math.max(close, math.max(open, 42)))',
	},
	"math.min": {
		description: "Returns the smallest of multiple values.",
		syntax: "math.min(number0, number1, ...) → const int",
		returns: "const int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("math.min", overlay=true)plot(math.min(close, open))plot(math.min(close, math.min(open, 42)))',
	},
	"math.pow": {
		description: "Mathematical power function.",
		syntax: "math.pow(base, exponent) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("math.pow", overlay=true)plot(math.pow(close, 2))',
	},
	"math.random": {
		description:
			"Returns a pseudo-random value. The function will generate a different sequence of values for each script execution. Using the same value for the optional seed argument will produce a repeatable sequence.",
		syntax: "math.random(min, max, seed) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"math.round": {
		description:
			"Returns the value of number rounded to the nearest integer, with ties rounding up. If the precision parameter is used, returns a float value rounded to that amount of decimal places.",
		syntax: "math.round(number) → const int",
		returns: "const int",
		type: "function",
		category: "",
		example: "",
	},
	"math.round_to_mintick": {
		description:
			"Returns the value rounded to the symbol's mintick, i.e. the nearest value that can be divided by syminfo.mintick, without the remainder, with ties rounding up.",
		syntax: "math.round_to_mintick(number) → simple float",
		returns: "simple float",
		type: "function",
		category: "",
		example: "",
	},
	"math.sign": {
		description:
			"Sign (signum) of number is zero if number is zero, 1.0 if number is greater than zero, -1.0 if number is less than zero.",
		syntax: "math.sign(number) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example: "",
	},
	"math.sin": {
		description: "The sin function returns the trigonometric sine of an angle.",
		syntax: "math.sin(angle) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example: "",
	},
	"math.sqrt": {
		description:
			"Square root of any number >= 0 is the unique y >= 0 such that y^2 = number.",
		syntax: "math.sqrt(number) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example: "",
	},
	"math.sum": {
		description:
			"The sum function returns the sliding sum of last y values of x.",
		syntax: "math.sum(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"math.tan": {
		description:
			"The tan function returns the trigonometric tangent of an angle.",
		syntax: "math.tan(angle) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example: "",
	},
	"math.todegrees": {
		description:
			"Returns an approximately equivalent angle in degrees from an angle measured in radians.",
		syntax: "math.todegrees(radians) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"math.toradians": {
		description:
			"Returns an approximately equivalent angle in radians from an angle measured in degrees.",
		syntax: "math.toradians(degrees) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"matrix.add_col": {
		description: "Inserts a new column at the column index of the id matrix.",
		syntax: "matrix.add_col(id, column, array_id) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.add_col()` Example 1")// Create a 2x3 "int" matrix containing values `0`.m = matrix.new<int>(2, 3, 0)// Add a column with `na` values to the matrix.matrix.add_col(m)// Display matrix elements.if barstate.islastconfirmedhistory    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Matrix elements:")    table.cell(t, 0, 1, str.tostring(m))',
	},
	"matrix.add_row": {
		description: "Inserts a new row at the row index of the id matrix.",
		syntax: "matrix.add_row(id, row, array_id) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.add_row()` Example 1")// Create a 2x3 "int" matrix containing values `0`.m = matrix.new<int>(2, 3, 0)// Add a row with `na` values to the matrix.matrix.add_row(m)// Display matrix elements.if barstate.islastconfirmedhistory    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Matrix elements:")    table.cell(t, 0, 1, str.tostring(m))',
	},
	"matrix.avg": {
		description:
			"The function calculates the average of all elements in the matrix.",
		syntax: "matrix.avg(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			"//@version=6indicator(\"`matrix.avg()` Example\")// Create a 2x2 matrix.var m = matrix.new<int>(2, 2, na)// Fill the matrix with values.matrix.set(m, 0, 0, 1)matrix.set(m, 0, 1, 2)matrix.set(m, 1, 0, 3)matrix.set(m, 1, 1, 4)// Get the average value of the matrix.var x = matrix.avg(m)plot(x, 'Matrix average value')",
	},
	"matrix.col": {
		description:
			"The function creates a one-dimensional array from the elements of a matrix column.",
		syntax: "matrix.col(id, column) → array<type>",
		returns: "array<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.col()` Example", "", true)// Create a 2x3 "float" matrix from `hlc3` values.m = matrix.new<float>(2, 3, hlc3)// Return an array with the values of the first column of matrix `m`.a = matrix.col(m, 0)// Plot the first value from the array `a`.plot(array.get(a, 0))',
	},
	"matrix.columns": {
		description: "The function returns the number of columns in the matrix.",
		syntax: "matrix.columns(id) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.columns()` Example")// Create a 2x6 matrix with values `0`.var m = matrix.new<int>(2, 6, 0)// Get the quantity of columns in matrix `m`.var x = matrix.columns(m)// Display using a label.if barstate.islastconfirmedhistory    label.new(bar_index, high, "Columns: " + str.tostring(x) + "\\n" + str.tostring(m))',
	},
	"matrix.concat": {
		description: "The function appends the m2 matrix to the m1 matrix.",
		syntax: "matrix.concat(id1, id2) → matrix<type>",
		returns: "matrix<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.concat()` Example")// Create a 2x4 "int" matrix containing values `0`.m1 = matrix.new<int>(2, 4, 0)// Create a 2x4 "int" matrix containing values `1`.m2 = matrix.new<int>(2, 4, 1)// Append matrix `m2` to `m1`.matrix.concat(m1, m2)// Display matrix elements.if barstate.islastconfirmedhistory    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Matrix Elements:")    table.cell(t, 0, 1, str.tostring(m1))',
	},
	"matrix.copy": {
		description:
			"The function creates a new matrix which is a copy of the original.",
		syntax: "matrix.copy(id) → matrix<type>",
		returns: "matrix<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.copy()` Example")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 2x3 "float" matrix with `1` values.    var m1 = matrix.new<float>(2, 3, 1)    // Copy the matrix to a new one.    // Note that unlike what `matrix.copy()` does,    // the simple assignment operation `m2 = m1`    // would NOT create a new copy of the `m1` matrix.    // It would merely create a copy of its ID referencing the same matrix.    var m2 = matrix.copy(m1)    // Display using a table.    var t = table.new(position.top_right, 5, 2, color.green)    table.cell(t, 0, 0, "Original Matrix:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 0, "Matrix Copy:")    table.cell(t, 1, 1, str.tostring(m2))',
	},
	"matrix.det": {
		description: "The function returns the determinant of a square matrix.",
		syntax: "matrix.det(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			"//@version=6indicator(\"`matrix.det` Example\")// Create a 2x2 matrix.var m = matrix.new<float>(2, 2, na)// Fill the matrix with values.matrix.set(m, 0, 0,  3)matrix.set(m, 0, 1,  7)matrix.set(m, 1, 0,  1)matrix.set(m, 1, 1, -4)// Get the determinant of the matrix.var x = matrix.det(m)plot(x, 'Matrix determinant')",
	},
	"matrix.diff": {
		description:
			"The function returns a new matrix resulting from the subtraction between matrices id1 and id2, or of matrix id1 and an id2 scalar (a numerical value).",
		syntax: "matrix.diff(id1, id2) → matrix<int>",
		returns: "matrix<int>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.diff()` Example 1")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 2x3 matrix containing values `5`.    var m1 = matrix.new<float>(2, 3, 5)    // Create a 2x3 matrix containing values `4`.    var m2 = matrix.new<float>(2, 3, 4)    // Create a new matrix containing the difference between matrices `m1` and `m2`.    var m3 = matrix.diff(m1, m2)    // Display using a table.    var t = table.new(position.top_right, 1, 2, color.green)    table.cell(t, 0, 0, "Difference between two matrices:")    table.cell(t, 0, 1, str.tostring(m3))',
	},
	"matrix.eigenvalues": {
		description:
			"The function returns an array containing the eigenvalues of a square matrix.",
		syntax: "matrix.eigenvalues(id) → array<float>",
		returns: "array<float>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.eigenvalues()` Example")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 2x2 matrix.    var m1 = matrix.new<int>(2, 2, na)    // Fill the matrix with values.    matrix.set(m1, 0, 0, 2)    matrix.set(m1, 0, 1, 4)    matrix.set(m1, 1, 0, 6)    matrix.set(m1, 1, 1, 8)    // Get the eigenvalues of the matrix.    tr = matrix.eigenvalues(m1)    // Display matrix elements.    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Matrix elements:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 0, "Array of Eigenvalues:")    table.cell(t, 1, 1, str.tostring(tr))',
	},
	"matrix.eigenvectors": {
		description:
			"Returns a matrix of eigenvectors, in which each column is an eigenvector of the id matrix.",
		syntax: "matrix.eigenvectors(id) → matrix<float>",
		returns: "matrix<float>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.eigenvectors()` Example")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 2x2 matrix    var m1 = matrix.new<int>(2, 2, 1)    // Fill the matrix with values.    matrix.set(m1, 0, 0, 2)    matrix.set(m1, 0, 1, 4)    matrix.set(m1, 1, 0, 6)    matrix.set(m1, 1, 1, 8)    // Get the eigenvectors of the matrix.    m2 = matrix.eigenvectors(m1)    // Display matrix elements.    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Matrix Elements:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 0, "Matrix Eigenvectors:")    table.cell(t, 1, 1, str.tostring(m2))',
	},
	"matrix.elements_count": {
		description:
			"The function returns the total number of all matrix elements.",
		syntax: "matrix.elements_count(id) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	"matrix.fill": {
		description:
			"The function fills a rectangular area of the id matrix defined by the indices from_column to to_column (not including it) and from_row to to_row(not including it) with the value.",
		syntax:
			"matrix.fill(id, value, from_row, to_row, from_column, to_column) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.fill()` Example")// Create a 4x5 "int" matrix containing values `0`.m = matrix.new<float>(4, 5, 0)// Fill the intersection of rows 1 to 2 and columns 2 to 3 of the matrix with `hl2` values.matrix.fill(m, hl2, 0, 2, 1, 3)// Display using a label.if barstate.islastconfirmedhistory    label.new(bar_index, high, str.tostring(m))',
	},
	"matrix.get": {
		description:
			"The function returns the element with the specified index of the matrix.",
		syntax: "matrix.get(id, row, column) → <matrix_type>",
		returns: "<matrix_type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.get()` Example", "", true)// Create a 2x3 "float" matrix from the `hl2` values.m = matrix.new<float>(2, 3, hl2)// Return the value of the element at index [0, 0] of matrix `m`.x = matrix.get(m, 0, 0)plot(x)',
	},
	"matrix.inv": {
		description: "The function returns the inverse of a square matrix.",
		syntax: "matrix.inv(id) → matrix<float>",
		returns: "matrix<float>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.inv()` Example")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 2x2 matrix.    var m1 = matrix.new<int>(2, 2, na)    // Fill the matrix with values.    matrix.set(m1, 0, 0, 1)    matrix.set(m1, 0, 1, 2)    matrix.set(m1, 1, 0, 3)    matrix.set(m1, 1, 1, 4)    // Inverse of the matrix.    var m2 = matrix.inv(m1)    // Display matrix elements.    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Original Matrix:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 0, "Inverse matrix:")    table.cell(t, 1, 1, str.tostring(m2))',
	},
	"matrix.is_antidiagonal": {
		description:
			"The function determines if the matrix is anti-diagonal (all elements outside the secondary diagonal are zero).",
		syntax: "matrix.is_antidiagonal(id) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"matrix.is_antisymmetric": {
		description:
			"The function determines if a matrix is antisymmetric (its transpose equals its negative).",
		syntax: "matrix.is_antisymmetric(id) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"matrix.is_binary": {
		description:
			"The function determines if the matrix is binary (when all elements of the matrix are 0 or 1).",
		syntax: "matrix.is_binary(id) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"matrix.is_diagonal": {
		description:
			"The function determines if the matrix is diagonal (all elements outside the main diagonal are zero).",
		syntax: "matrix.is_diagonal(id) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"matrix.is_identity": {
		description:
			"The function determines if a matrix is an identity matrix (elements with ones on the main diagonal and zeros elsewhere).",
		syntax: "matrix.is_identity(id) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"matrix.is_square": {
		description:
			"The function determines if the matrix is square (it has the same number of rows and columns).",
		syntax: "matrix.is_square(id) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"matrix.is_stochastic": {
		description: "The function determines if the matrix is stochastic.",
		syntax: "matrix.is_stochastic(id) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"matrix.is_symmetric": {
		description:
			"The function determines if a square matrix is symmetric (elements are symmetric with respect to the main diagonal).",
		syntax: "matrix.is_symmetric(id) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"matrix.is_triangular": {
		description:
			"The function determines if the matrix is triangular (if all elements above or below the main diagonal are zero).",
		syntax: "matrix.is_triangular(id) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"matrix.is_zero": {
		description:
			"The function determines if all elements of the matrix are zero.",
		syntax: "matrix.is_zero(id) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"matrix.kron": {
		description:
			"The function returns the Kronecker product for the id1 and id2 matrices.",
		syntax: "matrix.kron(id1, id2) → matrix<float>",
		returns: "matrix<float>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.kron()` Example")// Display using a table.if barstate.islastconfirmedhistory    // Create two matrices with default values `1` and `2`.    var m1 = matrix.new<float>(2, 2, 1)    var m2 = matrix.new<float>(2, 2, 2)    // Calculate the Kronecker product of the matrices.    var m3 = matrix.kron(m1, m2)    // Display matrix elements.    var t = table.new(position.top_right, 5, 2, color.green)    table.cell(t, 0, 0, "Matrix 1:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 1, "⊗")    table.cell(t, 2, 0, "Matrix 2:")    table.cell(t, 2, 1, str.tostring(m2))    table.cell(t, 3, 1, "=")    table.cell(t, 4, 0, "Kronecker product:")    table.cell(t, 4, 1, str.tostring(m3))',
	},
	"matrix.max": {
		description:
			"The function returns the largest value from the matrix elements.",
		syntax: "matrix.max(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			"//@version=6indicator(\"`matrix.max()` Example\")// Create a 2x2 matrix.var m = matrix.new<int>(2, 2, na)// Fill the matrix with values.matrix.set(m, 0, 0, 1)matrix.set(m, 0, 1, 2)matrix.set(m, 1, 0, 3)matrix.set(m, 1, 1, 4)// Get the maximum value in the matrix.var x = matrix.max(m)plot(x, 'Matrix maximum value')",
	},
	"matrix.median": {
		description:
			'The function calculates the median ("the middle" value) of matrix elements.',
		syntax: "matrix.median(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			"//@version=6indicator(\"`matrix.median()` Example\")// Create a 2x2 matrix.m = matrix.new<int>(2, 2, na)// Fill the matrix with values.matrix.set(m, 0, 0, 1)matrix.set(m, 0, 1, 2)matrix.set(m, 1, 0, 3)matrix.set(m, 1, 1, 4)// Get the median of the matrix.x = matrix.median(m)plot(x, 'Median of the matrix')",
	},
	"matrix.min": {
		description:
			"The function returns the smallest value from the matrix elements.",
		syntax: "matrix.min(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			"//@version=6indicator(\"`matrix.min()` Example\")// Create a 2x2 matrix.var m = matrix.new<int>(2, 2, na)// Fill the matrix with values.matrix.set(m, 0, 0, 1)matrix.set(m, 0, 1, 2)matrix.set(m, 1, 0, 3)matrix.set(m, 1, 1, 4)// Get the minimum value from the matrix.var x = matrix.min(m)plot(x, 'Matrix minimum value')",
	},
	"matrix.mode": {
		description:
			"The function calculates the mode of the matrix, which is the most frequently occurring value from the matrix elements. When there are multiple values occurring equally frequently, the function returns the smallest of those values.",
		syntax: "matrix.mode(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			"//@version=6indicator(\"`matrix.mode()` Example\")// Create a 2x2 matrix.var m = matrix.new<int>(2, 2, na)// Fill the matrix with values.matrix.set(m, 0, 0, 0)matrix.set(m, 0, 1, 0)matrix.set(m, 1, 0, 1)matrix.set(m, 1, 1, 1)// Get the mode of the matrix.var x = matrix.mode(m)plot(x, 'Mode of the matrix')",
	},
	"matrix.mult": {
		description:
			"The function returns a new matrix resulting from the product between the matrices id1 and id2, or between an id1 matrix and an id2 scalar (a numerical value), or between an id1 matrix and an id2 vector (an array of values).",
		syntax: "matrix.mult(id1, id2) → array<int>",
		returns: "array<int>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.mult()` Example 1")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 6x2 matrix containing values `5`.    var m1 = matrix.new<float>(6, 2, 5)    // Create a 2x3 matrix containing values `4`.    // Note that it must have the same quantity of rows as there are columns in the first matrix.    var m2 = matrix.new<float>(2, 3, 4)    // Create a new matrix from the multiplication of the two matrices.    var m3 = matrix.mult(m1, m2)    // Display using a table.    var t = table.new(position.top_right, 1, 2, color.green)    table.cell(t, 0, 0, "Product of two matrices:")    table.cell(t, 0, 1, str.tostring(m3))',
	},
	"matrix.new<type>": {
		description:
			'The function creates a new matrix object. A matrix is a two-dimensional data structure containing rows and columns. All elements in the matrix must be of the type specified in the type template ("<type>").',
		syntax: "matrix.new<type>(rows, columns, initial_value) → matrix<type>",
		returns: "matrix<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.new<type>()` Example 1")// Create a 2x3 (2 rows x 3 columns) "int" matrix with values zero.var m = matrix.new<int>(2, 3, 0)// Display using a label.if barstate.islastconfirmedhistory    label.new(bar_index, high, str.tostring(m))',
	},
	"matrix.pinv": {
		description: "The function returns the pseudoinverse of a matrix.",
		syntax: "matrix.pinv(id) → matrix<float>",
		returns: "matrix<float>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.pinv()` Example")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 2x2 matrix.    var m1 = matrix.new<int>(2, 2, na)    // Fill the matrix with values.    matrix.set(m1, 0, 0, 1)    matrix.set(m1, 0, 1, 2)    matrix.set(m1, 1, 0, 3)    matrix.set(m1, 1, 1, 4)    // Pseudoinverse of the matrix.    var m2 = matrix.pinv(m1)    // Display matrix elements.    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Original Matrix:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 0, "Pseudoinverse matrix:")    table.cell(t, 1, 1, str.tostring(m2))',
	},
	"matrix.pow": {
		description:
			"The function calculates the product of the matrix by itself power times.",
		syntax: "matrix.pow(id, power) → matrix<float>",
		returns: "matrix<float>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.pow()` Example")// Display using a table.if barstate.islastconfirmedhistory    // Create a 2x2 matrix.    var m1 = matrix.new<int>(2, 2, 2)    // Calculate the power of three of the matrix.    var m2 = matrix.pow(m1, 3)    // Display matrix elements.    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Original Matrix:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 0, "Matrix³:")    table.cell(t, 1, 1, str.tostring(m2))',
	},
	"matrix.rank": {
		description: "The function calculates the rank of the matrix.",
		syntax: "matrix.rank(id) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.rank()` Example")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 2x2 matrix.    var m1 = matrix.new<int>(2, 2, na)    // Fill the matrix with values.    matrix.set(m1, 0, 0, 1)    matrix.set(m1, 0, 1, 2)    matrix.set(m1, 1, 0, 3)    matrix.set(m1, 1, 1, 4)    // Get the rank of the matrix.    r = matrix.rank(m1)    // Display matrix elements.    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Matrix elements:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 0, "Rank of the matrix:")    table.cell(t, 1, 1, str.tostring(r))',
	},
	"matrix.remove_col": {
		description:
			"The function removes the column at column index of the id matrix and returns an array containing the removed column's values.",
		syntax: "matrix.remove_col(id, column) → array<type>",
		returns: "array<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("matrix_remove_col", overlay = true)// Create a 2x2 matrix with ones.var matrixOrig = matrix.new<int>(2, 2, 1)// Set values to the \'matrixOrig\' matrix.matrix.set(matrixOrig, 0, 1, 2)matrix.set(matrixOrig, 1, 0, 3)matrix.set(matrixOrig, 1, 1, 4)// Create a copy of the \'matrixOrig\' matrix.matrixCopy = matrix.copy(matrixOrig)// Remove the first column from the `matrixCopy` matrix.arr = matrix.remove_col(matrixCopy, 0)// Display matrix elements.if barstate.islastconfirmedhistory    var t = table.new(position.top_right, 3, 2, color.green)    table.cell(t, 0, 0, "Original Matrix:")    table.cell(t, 0, 1, str.tostring(matrixOrig))    table.cell(t, 1, 0, "Removed Elements:")    table.cell(t, 1, 1, str.tostring(arr))    table.cell(t, 2, 0, "Result Matrix:")    table.cell(t, 2, 1, str.tostring(matrixCopy))',
	},
	"matrix.remove_row": {
		description:
			"The function removes the row at row index of the id matrix and returns an array containing the removed row's values.",
		syntax: "matrix.remove_row(id, row) → array<type>",
		returns: "array<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("matrix_remove_row", overlay = true)// Create a 2x2 "int" matrix containing values `1`.var matrixOrig = matrix.new<int>(2, 2, 1)// Set values to the \'matrixOrig\' matrix.matrix.set(matrixOrig, 0, 1, 2)matrix.set(matrixOrig, 1, 0, 3)matrix.set(matrixOrig, 1, 1, 4)// Create a copy of the \'matrixOrig\' matrix.matrixCopy = matrix.copy(matrixOrig)// Remove the first row from the matrix `matrixCopy`.arr = matrix.remove_row(matrixCopy, 0)// Display matrix elements.if barstate.islastconfirmedhistory    var t = table.new(position.top_right, 3, 2, color.green)    table.cell(t, 0, 0, "Original Matrix:")    table.cell(t, 0, 1, str.tostring(matrixOrig))    table.cell(t, 1, 0, "Removed Elements:")    table.cell(t, 1, 1, str.tostring(arr))    table.cell(t, 2, 0, "Result Matrix:")    table.cell(t, 2, 1, str.tostring(matrixCopy))',
	},
	"matrix.reshape": {
		description:
			"The function rebuilds the id matrix to rows x cols dimensions.",
		syntax: "matrix.reshape(id, rows, columns) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.reshape()` Example")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 2x3 matrix.    var m1 = matrix.new<float>(2, 3)    // Fill the matrix with values.    matrix.set(m1, 0, 0, 1)    matrix.set(m1, 0, 1, 2)    matrix.set(m1, 0, 2, 3)    matrix.set(m1, 1, 0, 4)    matrix.set(m1, 1, 1, 5)    matrix.set(m1, 1, 2, 6)    // Copy the matrix to a new one.    var m2 = matrix.copy(m1)    // Reshape the copy to a 3x2.    matrix.reshape(m2, 3, 2)    // Display using a table.    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Original matrix:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 0, "Reshaped matrix:")    table.cell(t, 1, 1, str.tostring(m2))',
	},
	"matrix.reverse": {
		description:
			"The function reverses the order of rows and columns in the matrix id. The first row and first column become the last, and the last become the first.",
		syntax: "matrix.reverse(id) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.reverse()` Example")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Copy the matrix to a new one.    var m1 = matrix.new<int>(2, 2, na)    // Fill the matrix with values.    matrix.set(m1, 0, 0, 1)    matrix.set(m1, 0, 1, 2)    matrix.set(m1, 1, 0, 3)    matrix.set(m1, 1, 1, 4)    // Copy matrix elements to a new matrix.    var m2 = matrix.copy(m1)    // Reverse the `m2` copy of the original matrix.    matrix.reverse(m2)    // Display using a table.    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Original matrix:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 0, "Reversed matrix:")    table.cell(t, 1, 1, str.tostring(m2))',
	},
	"matrix.row": {
		description:
			"The function creates a one-dimensional array from the elements of a matrix row.",
		syntax: "matrix.row(id, row) → array<type>",
		returns: "array<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.row()` Example", "", true)// Create a 2x3 "float" matrix from `hlc3` values.m = matrix.new<float>(2, 3, hlc3)// Return an array with the values of the first row of the matrix.a = matrix.row(m, 0)// Plot the first value from the array `a`.plot(array.get(a, 0))',
	},
	"matrix.rows": {
		description: "The function returns the number of rows in the matrix.",
		syntax: "matrix.rows(id) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.rows()` Example")// Create a 2x6 matrix with values `0`.var m = matrix.new<int>(2, 6, 0)// Get the quantity of rows in the matrix.var x = matrix.rows(m)// Display using a label.if barstate.islastconfirmedhistory    label.new(bar_index, high, "Rows: " + str.tostring(x) + "\\n" + str.tostring(m))',
	},
	"matrix.set": {
		description:
			"The function assigns value to the element at the row and column of the id matrix.",
		syntax: "matrix.set(id, row, column, value) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.set()` Example")// Create a 2x3 "int" matrix containing values `4`.m = matrix.new<int>(2, 3, 4)// Replace the value of element at row 1 and column 2 with value `3`.matrix.set(m, 0, 1, 3)// Display using a label.if barstate.islastconfirmedhistory    label.new(bar_index, high, str.tostring(m))',
	},
	"matrix.sort": {
		description:
			"The function rearranges the rows in the id matrix following the sorted order of the values in the column.",
		syntax: "matrix.sort(id, column, order) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.sort()` Example")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 2x2 matrix.    var m1 = matrix.new<float>(2, 2, na)    // Fill the matrix with values.    matrix.set(m1, 0, 0, 3)    matrix.set(m1, 0, 1, 4)    matrix.set(m1, 1, 0, 1)    matrix.set(m1, 1, 1, 2)    // Copy the matrix to a new one.    var m2 = matrix.copy(m1)    // Sort the rows of `m2` using the default arguments (first column and ascending order).    matrix.sort(m2)    // Display using a table.    if barstate.islastconfirmedhistory        var t = table.new(position.top_right, 2, 2, color.green)        table.cell(t, 0, 0, "Original matrix:")        table.cell(t, 0, 1, str.tostring(m1))        table.cell(t, 1, 0, "Sorted matrix:")        table.cell(t, 1, 1, str.tostring(m2))',
	},
	"matrix.submatrix": {
		description:
			"The function extracts a submatrix of the id matrix within the specified indices.",
		syntax:
			"matrix.submatrix(id, from_row, to_row, from_column, to_column) → matrix<type>",
		returns: "matrix<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.submatrix()` Example")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 2x3 matrix matrix with values `0`.    var m1 = matrix.new<int>(2, 3, 0)    // Fill the matrix with values.    matrix.set(m1, 0, 0, 1)    matrix.set(m1, 0, 1, 2)    matrix.set(m1, 0, 2, 3)    matrix.set(m1, 1, 0, 4)    matrix.set(m1, 1, 1, 5)    matrix.set(m1, 1, 2, 6)    // Create a 2x2 submatrix of the `m1` matrix.    var m2 = matrix.submatrix(m1, 0, 2, 1, 3)    // Display using a table.    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Original Matrix:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 0, "Submatrix:")    table.cell(t, 1, 1, str.tostring(m2))',
	},
	"matrix.sum": {
		description:
			"The function returns a new matrix resulting from the sum of two matrices id1 and id2, or of an id1 matrix and an id2 scalar (a numerical value).",
		syntax: "matrix.sum(id1, id2) → matrix<int>",
		returns: "matrix<int>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.sum()` Example 1")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 2x3 matrix containing values `5`.    var m1 = matrix.new<float>(2, 3, 5)    // Create a 2x3 matrix containing values `4`.    var m2 = matrix.new<float>(2, 3, 4)    // Create a new matrix that sums matrices `m1` and `m2`.    var m3 = matrix.sum(m1, m2)    // Display using a table.    var t = table.new(position.top_right, 1, 2, color.green)    table.cell(t, 0, 0, "Sum of two matrices:")    table.cell(t, 0, 1, str.tostring(m3))',
	},
	"matrix.swap_columns": {
		description:
			"The function swaps the columns at the index column1 and column2 in the id matrix.",
		syntax: "matrix.swap_columns(id, column1, column2) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.swap_columns()` Example")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 2x2 matrix with ‘na’ values.    var m1 = matrix.new<int>(2, 2, na)    // Fill the matrix with values.    matrix.set(m1, 0, 0, 1)    matrix.set(m1, 0, 1, 2)    matrix.set(m1, 1, 0, 3)    matrix.set(m1, 1, 1, 4)    // Copy the matrix to a new one.    var m2 = matrix.copy(m1)    // Swap the first and second columns of the matrix copy.    matrix.swap_columns(m2, 0, 1)    // Display using a table.    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Original matrix:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 0, "Swapped columns in copy:")    table.cell(t, 1, 1, str.tostring(m2))',
	},
	"matrix.swap_rows": {
		description:
			"The function swaps the rows at the index row1 and row2 in the id matrix.",
		syntax: "matrix.swap_rows(id, row1, row2) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.swap_rows()` Example")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 3x2 matrix with ‘na’ values.    var m1 = matrix.new<int>(3, 2, na)    // Fill the matrix with values.    matrix.set(m1, 0, 0, 1)    matrix.set(m1, 0, 1, 2)    matrix.set(m1, 1, 0, 3)    matrix.set(m1, 1, 1, 4)    matrix.set(m1, 2, 0, 5)    matrix.set(m1, 2, 1, 6)    // Copy the matrix to a new one.    var m2 = matrix.copy(m1)    // Swap the first and second rows of the matrix copy.    matrix.swap_rows(m2, 0, 1)    // Display using a table.    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Original matrix:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 0, "Swapped rows in copy:")    table.cell(t, 1, 1, str.tostring(m2))',
	},
	"matrix.trace": {
		description:
			"The function calculates the trace of a matrix (the sum of the main diagonal's elements).",
		syntax: "matrix.trace(id) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.trace()` Example")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 2x2 matrix.    var m1 = matrix.new<int>(2, 2, na)    // Fill the matrix with values.    matrix.set(m1, 0, 0, 1)    matrix.set(m1, 0, 1, 2)    matrix.set(m1, 1, 0, 3)    matrix.set(m1, 1, 1, 4)    // Get the trace of the matrix.    tr = matrix.trace(m1)    // Display matrix elements.    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Matrix elements:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 0, "Trace of the matrix:")    table.cell(t, 1, 1, str.tostring(tr))',
	},
	"matrix.transpose": {
		description:
			"The function creates a new, transposed version of the id. This interchanges the row and column index of each element.",
		syntax: "matrix.transpose(id) → matrix<type>",
		returns: "matrix<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`matrix.transpose()` Example")// For efficiency, execute this code only once.if barstate.islastconfirmedhistory    // Create a 2x2 matrix.    var m1 = matrix.new<float>(2, 2, na)    // Fill the matrix with values.    matrix.set(m1, 0, 0, 1)    matrix.set(m1, 0, 1, 2)    matrix.set(m1, 1, 0, 3)    matrix.set(m1, 1, 1, 4)    // Create a transpose of the matrix.    var m2 = matrix.transpose(m1)    // Display using a table.    var t = table.new(position.top_right, 2, 2, color.green)    table.cell(t, 0, 0, "Original matrix:")    table.cell(t, 0, 1, str.tostring(m1))    table.cell(t, 1, 0, "Transposed matrix:")    table.cell(t, 1, 1, str.tostring(m2))',
	},
	max_bars_back: {
		description:
			"Function sets the maximum number of bars that is available for historical reference of a given built-in or user variable. When operator '[]' is applied to a variable - it is a reference to a historical value of that variable.",
		syntax: "max_bars_back(var, num) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("max_bars_back")close_() => closedepth() => 400d = depth()v = close_()max_bars_back(v, 500)out = if bar_index > 0    v[d]else    vplot(out)',
	},
	minute: {
		description: "",
		syntax: "minute(time, timezone) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	month: {
		description: "",
		syntax: "month(time, timezone) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	na: {
		description: "Tests if x is na.",
		syntax: "na(x) → simple bool",
		returns: "simple bool",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("na")// Use the `na()` function to test for `na`.plot(na(close[1]) ? close : close[1])// ALTERNATIVE// `nz()` also tests `close[1]` for `na`. It returns `close[1]` if it is not `na`, and `close` if it is.plot(nz(close[1], close))',
	},
	nz: {
		description:
			"Replaces na (undefined) values with either a type-specific default value or a specified replacement.",
		syntax: "nz(source, replacement) → simple color",
		returns: "simple color",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("nz", overlay=true)plot(nz(ta.sma(close, 100)))',
	},
	plot: {
		description: "Plots a series of data on the chart.",
		syntax:
			"plot(series, title, color, linewidth, style, trackprice, histbase, offset, join, editable, show_last, display, format, precision, force_overlay, linestyle) → plot",
		returns: "plot",
		type: "function",
		category: "",
		example:
			"//@version=6indicator(\"plot\")plot(high+low, title='Title', color=color.new(#00ffaa, 70), linewidth=2, style=plot.style_area, offset=15, trackprice=true)// You may fill the background between any two plots with a fill() function:p1 = plot(open)p2 = plot(close)fill(p1, p2, color=color.new(color.green, 90))",
	},
	plotarrow: {
		description:
			"Plots up and down arrows on the chart. Up arrow is drawn at every indicator positive value, down arrow is drawn at every negative value. If indicator returns na then no arrow is drawn. Arrows has different height, the more absolute indicator value the longer arrow is drawn.",
		syntax:
			"plotarrow(series, title, colorup, colordown, offset, minheight, maxheight, editable, show_last, display, format, precision, force_overlay) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("plotarrow example", overlay=true)codiff = close - openplotarrow(codiff, colorup=color.new(color.teal,40), colordown=color.new(color.orange, 40))',
	},
	plotbar: {
		description: "Plots ohlc bars on the chart.",
		syntax:
			"plotbar(open, high, low, close, title, color, editable, show_last, display, format, precision, force_overlay) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			"//@version=6indicator(\"plotbar example\", overlay=true)plotbar(open, high, low, close, title='Title', color = open < close ? color.green : color.red)",
	},
	plotcandle: {
		description: "Plots candles on the chart.",
		syntax:
			"plotcandle(open, high, low, close, title, color, wickcolor, editable, show_last, bordercolor, display, format, precision, force_overlay) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			"//@version=6indicator(\"plotcandle example\", overlay=true)plotcandle(open, high, low, close, title='Title', color = open < close ? color.green : color.red, wickcolor=color.black)",
	},
	plotchar: {
		description:
			"Plots visual shapes using any given one Unicode character on the chart.",
		syntax:
			"plotchar(series, title, char, location, color, offset, text, textcolor, editable, size, show_last, display, format, precision, force_overlay) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			"//@version=6indicator(\"plotchar example\", overlay=true)data = close >= openplotchar(data, char='❄')",
	},
	plotshape: {
		description: "Plots visual shapes on the chart.",
		syntax:
			"plotshape(series, title, style, location, color, offset, text, textcolor, editable, size, show_last, display, format, precision, force_overlay) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("plotshape example 1", overlay=true)data = close >= openplotshape(data, style=shape.xcross)',
	},
	"polyline.delete": {
		description:
			"Deletes the specified polyline object. It has no effect if the id doesn't exist.",
		syntax: "polyline.delete(id) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"polyline.new": {
		description:
			"Creates a new polyline instance and displays it on the chart, sequentially connecting all of the points in the points array with line segments. The segments in the drawing can be straight or curved depending on the curved parameter.",
		syntax:
			"polyline.new(points, curved, closed, xloc, line_color, fill_color, line_style, line_width, force_overlay) → series polyline",
		returns: "series polyline",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Polylines example", overlay = true)//@variable If `true`, connects all points in the polyline with curved line segments.bool curvedInput = input.bool(false, "Curve Polyline")//@variable If `true`, connects the first point in the polyline to the last point.bool closedInput = input.bool(true, "Close Polyline")//@variable The color of the space filled by the polyline.color fillcolor = input.color(color.new(color.blue, 90), "Fill Color")// Time and price inputs for the polyline\'s points.p1x = input.time(0,  "p1", confirm = true, inline = "p1")p1y = input.price(0, "  ", confirm = true, inline = "p1")p2x = input.time(0,  "p2", confirm = true, inline = "p2")p2y = input.price(0, "  ", confirm = true, inline = "p2")p3x = input.time(0,  "p3", confirm = true, inline = "p3")p3y = input.price(0, "  ", confirm = true, inline = "p3")p4x = input.time(0,  "p4", confirm = true, inline = "p4")p4y = input.price(0, "  ", confirm = true, inline = "p4")p5x = input.time(0,  "p5", confirm = true, inline = "p5")p5y = input.price(0, "  ", confirm = true, inline = "p5")if barstate.islastconfirmedhistory    //@variable An array of `chart.point` objects for the new polyline.    var points = array.new<chart.point>()    // Push new `chart.point` instances into the `points` array.    points.push(chart.point.from_time(p1x, p1y))    points.push(chart.point.from_time(p2x, p2y))    points.push(chart.point.from_time(p3x, p3y))    points.push(chart.point.from_time(p4x, p4y))    points.push(chart.point.from_time(p5x, p5y))    // Add labels for each `chart.point` in `points`.    l1p1 = label.new(points.get(0), text = "p1", xloc = xloc.bar_time, color = na)    l1p2 = label.new(points.get(1), text = "p2", xloc = xloc.bar_time, color = na)    l2p1 = label.new(points.get(2), text = "p3", xloc = xloc.bar_time, color = na)    l2p2 = label.new(points.get(3), text = "p4", xloc = xloc.bar_time, color = na)    // Create a new polyline that connects each `chart.point` in the `points` array, starting from the first.    polyline.new(points, curved = curvedInput, closed = closedInput, fill_color = fillcolor, xloc = xloc.bar_time)',
	},
	"request.currency_rate": {
		description:
			"Provides a daily rate that can be used to convert a value expressed in the from currency to another in the to currency.",
		syntax:
			"request.currency_rate(from, to, ignore_invalid_currency) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Close in British Pounds")rate = request.currency_rate(syminfo.currency, "GBP")plot(close * rate)',
	},
	"request.dividends": {
		description: "Requests dividends data for the specified symbol.",
		syntax:
			"request.dividends(ticker, field, gaps, lookahead, ignore_invalid_symbol, currency) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("request.dividends")s1 = request.dividends("NASDAQ:BELFA")plot(s1)s2 = request.dividends("NASDAQ:BELFA", dividends.net, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_on)plot(s2)',
	},
	"request.earnings": {
		description: "Requests earnings data for the specified symbol.",
		syntax:
			"request.earnings(ticker, field, gaps, lookahead, ignore_invalid_symbol, currency) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("request.earnings")s1 = request.earnings("NASDAQ:BELFA")plot(s1)s2 = request.earnings("NASDAQ:BELFA", earnings.actual, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_on)plot(s2)',
	},
	"request.economic": {
		description:
			"Requests economic data for a symbol. Economic data includes information such as the state of a country's economy (GDP, inflation rate, etc.) or of a particular industry (steel production, ICU beds, etc.).",
		syntax:
			"request.economic(country_code, field, gaps, ignore_invalid_symbol) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("US GDP")e = request.economic("US", "GDP")plot(e)',
	},
	"request.financial": {
		description: "Requests financial series for symbol.",
		syntax:
			"request.financial(symbol, financial_id, period, gaps, ignore_invalid_symbol, currency) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("request.financial")f = request.financial("NASDAQ:MSFT", "ACCOUNTS_PAYABLE", "FY")plot(f)',
	},
	"request.quandl": {
		description:
			'Note: This function has been deprecated due to the API change from NASDAQ Data Link. Requests for "QUANDL" symbols are no longer valid and requests for them return a runtime error.',
		syntax:
			"request.quandl(ticker, gaps, index, ignore_invalid_symbol) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("request.quandl")f = request.quandl("CFTC/SB_FO_ALL", barmerge.gaps_off, 0)plot(f)',
	},
	"request.security": {
		description:
			"Requests the result of an expression from a specified context (symbol and timeframe).",
		syntax:
			"request.security(symbol, timeframe, expression, gaps, lookahead, ignore_invalid_symbol, currency, calc_bars_count) → series <type>",
		returns: "series <type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Simple `request.security()` calls")// Returns 1D close of the current symbol.dailyClose = request.security(syminfo.tickerid, "1D", close)plot(dailyClose)// Returns the close of "AAPL" from the same timeframe as currently open on the chart.aaplClose = request.security("AAPL", timeframe.period, close)plot(aaplClose)',
	},
	"request.security_lower_tf": {
		description:
			'Requests the results of an expression from a specified symbol on a timeframe lower than or equal to the chart\'s timeframe. It returns an array containing one element for each lower-timeframe bar within the chart bar. On a 5-minute chart, requesting data using a timeframe argument of "1" typically returns an array with five elements representing the value of the expression on each 1-minute bar, ordered by time with the earliest value first.',
		syntax:
			"request.security_lower_tf(symbol, timeframe, expression, ignore_invalid_symbol, currency, ignore_invalid_timeframe, calc_bars_count) → array<type>",
		returns: "array<type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`request.security_lower_tf()` Example", overlay = true)// If the current chart timeframe is set to 120 minutes, then the `arrayClose` array will contain two \'close\' values from the 60 minute timeframe for each bar.arrClose = request.security_lower_tf(syminfo.tickerid, "60", close)if bar_index == last_bar_index - 1    label.new(bar_index, high, str.tostring(arrClose))',
	},
	"request.seed": {
		description:
			"Requests the result of an expression evaluated on data from a user-maintained GitHub repository. **Note:**The creation of new Pine Seeds repositories is suspended; only existing repositories are currently supported. See the Pine Seeds documentation on GitHub to learn more.",
		syntax:
			"request.seed(source, symbol, expression, ignore_invalid_symbol, calc_bars_count) → series <type>",
		returns: "series <type>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("BTC Development Activity")[devAct, devActSMA] = request.seed("seed_crypto_santiment", "BTC_DEV_ACTIVITY", [close, ta.sma(close, 10)])plot(devAct, "BTC Development Activity")plot(devActSMA, "BTC Development Activity SMA10", color = color.yellow)',
	},
	"request.splits": {
		description: "Requests splits data for the specified symbol.",
		syntax:
			"request.splits(ticker, field, gaps, lookahead, ignore_invalid_symbol) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("request.splits")s1 = request.splits("NASDAQ:BELFA", splits.denominator)plot(s1)s2 = request.splits("NASDAQ:BELFA", splits.denominator, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_on)plot(s2)',
	},
	"runtime.error": {
		description:
			"When called, causes a runtime error with the error message specified in the message argument.",
		syntax: "runtime.error(message) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	second: {
		description: "",
		syntax: "second(time, timezone) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	"str.contains": {
		description:
			"Returns true if the source string contains the str substring, false otherwise.",
		syntax: "str.contains(source, str) → const bool",
		returns: "const bool",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("str.contains")// If the current chart is a continuous futures chart, e.g “BTC1!”, then the function will return true, false otherwise.var isFutures = str.contains(syminfo.tickerid, "!")plot(isFutures ? 1 : 0)',
	},
	"str.endswith": {
		description:
			"Returns true if the source string ends with the substring specified in str, false otherwise.",
		syntax: "str.endswith(source, str) → const bool",
		returns: "const bool",
		type: "function",
		category: "",
		example: "",
	},
	"str.format": {
		description:
			"Creates a formatted string using a specified formatting string (formatString) and one or more additional arguments (arg0, arg1, etc.). The formatting string defines the structure of the returned string, where all placeholders in curly brackets ({}) refer to the additional arguments. Each placeholder requires a number representing an argument's position, starting from 0. For instance, the placeholder {0} refers to the first argument after formatString (arg0), {1} refers to the second (arg1), and so on. The function replaces each placeholder with a string representation of the corresponding argument.",
		syntax: "str.format(formatString, arg0, arg1, ...) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Simple `str.format()` demo")//@variable A formatted string that includes representations of the current `bar_index` and `close` values.//          The placeholder `{0}` refers to the first argument after the formatting string (`bar_index`), and //          `{1}` refers to the second (`close`).string labelText = str.format("Current bar index: {0}\\nCurrent bar close: {1}", bar_index, close)// Draw a label to display the `labelText` string at the current bar\'s `high` price. label.new(bar_index, high, labelText)',
	},
	"str.format_time": {
		description:
			"Converts the time timestamp into a string formatted according to format and timezone.",
		syntax: "str.format_time(time, format, timezone) → series string",
		returns: "series string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("str.format_time")if timeframe.change("1D")    formattedTime = str.format_time(time, "yyyy-MM-dd HH:mm", syminfo.timezone)    label.new(bar_index, high, formattedTime)',
	},
	"str.length": {
		description:
			"Returns an integer corresponding to the amount of chars in that string.",
		syntax: "str.length(string) → const int",
		returns: "const int",
		type: "function",
		category: "",
		example: "",
	},
	"str.lower": {
		description:
			"Returns a new string with all letters converted to lowercase.",
		syntax: "str.lower(source) → const string",
		returns: "const string",
		type: "function",
		category: "",
		example: "",
	},
	"str.match": {
		description:
			"Returns the new substring of the source string if it matches a regex regular expression, an empty string otherwise.",
		syntax: "str.match(source, regex) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("str.match")s = input.string("It\'s time to sell some NASDAQ:AAPL!")// finding first substring that matches regular expression "[\\w]+:[\\w]+"var string tickerid = str.match(s, "[\\\\w]+:[\\\\w]+")if barstate.islastconfirmedhistory    label.new(bar_index, high, text = tickerid) // "NASDAQ:AAPL"',
	},
	"str.pos": {
		description:
			"Returns the position of the first occurrence of the str string in the source string, 'na' otherwise.",
		syntax: "str.pos(source, str) → const int",
		returns: "const int",
		type: "function",
		category: "",
		example: "",
	},
	"str.repeat": {
		description:
			"Constructs a new string containing the source string repeated repeat times with the separator injected between each repeated instance.",
		syntax: "str.repeat(source, repeat, separator) → const string",
		returns: "const string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("str.repeat")repeat = str.repeat("?", 3, ",") // Returns "?,?,?"label.new(bar_index,close,repeat)',
	},
	"str.replace": {
		description:
			"Returns a new string with the Nth occurrence of the target string replaced by the replacement string, where N is specified in occurrence.",
		syntax:
			"str.replace(source, target, replacement, occurrence) → const string",
		returns: "const string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("str.replace")var source = "FTX:BTCUSD / FTX:BTCEUR"// Replace first occurrence of "FTX" with "BINANCE" replacement stringvar newSource = str.replace(source, "FTX", "BINANCE", 0)if barstate.islastconfirmedhistory    // Display "BINANCE:BTCUSD / FTX:BTCEUR"    label.new(bar_index, high, text = newSource)',
	},
	"str.replace_all": {
		description:
			"Replaces each occurrence of the target string in the source string with the replacement string.",
		syntax: "str.replace_all(source, target, replacement) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example: "",
	},
	"str.split": {
		description:
			"Divides a string into an array of substrings and returns its array id.",
		syntax: "str.split(string, separator) → array<string>",
		returns: "array<string>",
		type: "function",
		category: "",
		example: "",
	},
	"str.startswith": {
		description:
			"Returns true if the source string starts with the substring specified in str, false otherwise.",
		syntax: "str.startswith(source, str) → const bool",
		returns: "const bool",
		type: "function",
		category: "",
		example: "",
	},
	"str.substring": {
		description:
			"Returns a new string that is a substring of the source string. The substring begins with the character at the index specified by begin_pos and extends to 'end_pos - 1' of the source string.",
		syntax: "str.substring(source, begin_pos, end_pos) → const string",
		returns: "const string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("str.substring", overlay = true)sym= input.symbol("NASDAQ:AAPL")pos = str.pos(sym, ":") // Get position of ":" charactertkr= str.substring(sym, pos+1) // "AAPL"if barstate.islastconfirmedhistory    label.new(bar_index, high, text = tkr)',
	},
	"str.tonumber": {
		description:
			'Converts a value represented in string to its "float" equivalent.',
		syntax: "str.tonumber(string) → const float",
		returns: "const float",
		type: "function",
		category: "",
		example: "",
	},
	"str.tostring": {
		description: "",
		syntax: "str.tostring(value) → const string",
		returns: "const string",
		type: "function",
		category: "",
		example: "",
	},
	"str.trim": {
		description:
			"Constructs a new string with all consecutive whitespaces and other control characters (e.g., “\\n”, “\\t”, etc.) removed from the left and right of the source.",
		syntax: "str.trim(source) → const string",
		returns: "const string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("str.trim")trim = str.trim("    abc    ") // Returns "abc"label.new(bar_index,close,trim)',
	},
	"str.upper": {
		description:
			"Returns a new string with all letters converted to uppercase.",
		syntax: "str.upper(source) → const string",
		returns: "const string",
		type: "function",
		category: "",
		example: "",
	},
	strategy: {
		description:
			"This declaration statement designates the script as a strategy and sets a number of strategy-related properties.",
		syntax:
			"strategy(title, shorttitle, overlay, format, precision, scale, pyramiding, calc_on_order_fills, calc_on_every_tick, max_bars_back, backtest_fill_limits_assumption, default_qty_type, default_qty_value, initial_capital, currency, slippage, commission_type, commission_value, process_orders_on_close, close_entries_rule, margin_long, margin_short, explicit_plot_zorder, max_lines_count, max_labels_count, max_boxes_count, calc_bars_count, risk_free_rate, use_bar_magnifier, fill_orders_on_standard_ohlc, max_polylines_count, dynamic_requests, behind_chart) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("My strategy", overlay = true)// Enter long by market if current open is greater than previous high.if open > high[1]    strategy.entry("Long", strategy.long, 1)// Generate a full exit bracket (profit 10 points, loss 5 points per contract) from the entry named "Long".strategy.exit("Exit", "Long", profit = 10, loss = 5)',
	},
	"strategy.cancel": {
		description:
			"Cancels a pending or unfilled order with a specific identifier. If multiple unfilled orders share the same ID, calling this command with that ID as the id argument cancels all of them. If a script calls this command with an id representing the ID of a filled order, it has no effect.",
		syntax: "strategy.cancel(id) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy(title = "Order cancellation demo")conditionForBuy = open > high[1]if conditionForBuy    strategy.entry("Long", strategy.long, 1, limit = low) // Enter long using limit order at low price of current bar if `conditionForBuy` is `true`.if not conditionForBuy    strategy.cancel("Long") // Cancel the entry order with name "Long" if `conditionForBuy` is `false`.',
	},
	"strategy.cancel_all": {
		description:
			"Cancels all pending or unfilled orders, regardless of their identifiers.",
		syntax: "strategy.cancel_all() → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy(title = "Cancel all orders demo")conditionForBuy1 = open > high[1]if conditionForBuy1    strategy.entry("Long entry 1", strategy.long, 1, limit = low) // Enter long using a limit order if `conditionForBuy1` is `true`.conditionForBuy2 = conditionForBuy1 and open[1] > high[2]float lowest2 = ta.lowest(low, 2)if conditionForBuy2    strategy.entry("Long entry 2", strategy.long, 1, limit = lowest2) // Enter long using a limit order if `conditionForBuy2` is `true`.conditionForStopTrading = open < lowest2if conditionForStopTrading    strategy.cancel_all() // Cancel both limit orders if `conditionForStopTrading` is `true`.',
	},
	"strategy.close": {
		description:
			"Creates an order to exit from the part of a position opened by entry orders with a specific identifier. If multiple entries in the position share the same ID, the orders from this command apply to all those entries, starting from the first open trade, when its calls use that ID as the id argument.",
		syntax:
			"strategy.close(id, comment, qty, qty_percent, alert_message, immediately, disable_alert) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("Partial close strategy")// Calculate a 14-bar and 28-bar moving average of `close` prices.float sma14 = ta.sma(close, 14)float sma28 = ta.sma(close, 28)// Place a market order to enter a long position when `sma14` crosses over `sma28`.if ta.crossover(sma14, sma28)    strategy.entry("My Long Entry ID", strategy.long)// Place a market order to close the long trade when `sma14` crosses under `sma28`.if ta.crossunder(sma14, sma28)    strategy.close("My Long Entry ID", "50% market close", qty_percent = 50)// Plot the position size.plot(strategy.position_size)',
	},
	"strategy.close_all": {
		description:
			"Creates an order to close an open position completely, regardless of the identifiers of the entry orders that opened or added to it.",
		syntax:
			"strategy.close_all(comment, alert_message, immediately, disable_alert) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("Multi-entry close strategy")// Calculate a 14-bar and 28-bar moving average of `close` prices.float sma14 = ta.sma(close, 14)float sma28 = ta.sma(close, 28)// Place a market order to enter a long trade every time `sma14` crosses over `sma28`.if ta.crossover(sma14, sma28)    strategy.order("My Long Entry ID " + str.tostring(strategy.opentrades), strategy.long)// Place a market order to close the entire position every 500 bars.if bar_index % 500 == 0    strategy.close_all()// Plot the position size.plot(strategy.position_size)',
	},
	"strategy.closedtrades.commission": {
		description:
			"Returns the sum of entry and exit fees paid in the closed trade, expressed in strategy.account_currency.",
		syntax: "strategy.closedtrades.commission(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("`strategy.closedtrades.commission` Example", commission_type = strategy.commission.percent, commission_value = 0.1)// Strategy calls to enter long trades every 15 bars and exit long trades every 20 bars.if bar_index % 15 == 0    strategy.entry("Long", strategy.long)if bar_index % 20 == 0    strategy.close("Long")// Plot total fees for the latest closed trade.plot(strategy.closedtrades.commission(strategy.closedtrades - 1))',
	},
	"strategy.closedtrades.entry_bar_index": {
		description: "Returns the bar_index of the closed trade's entry.",
		syntax: "strategy.closedtrades.entry_bar_index(trade_num) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("strategy.closedtrades.entry_bar_index Example")// Enter long trades on three rising bars; exit on two falling bars.if ta.rising(close, 3)    strategy.entry("Long", strategy.long)if ta.falling(close, 2)    strategy.close("Long")// Function that calculates the average amount of bars in a trade.avgBarsPerTrade() =>    sumBarsPerTrade = 0    for tradeNo = 0 to strategy.closedtrades - 1        // Loop through all closed trades, starting with the oldest.        sumBarsPerTrade += strategy.closedtrades.exit_bar_index(tradeNo) - strategy.closedtrades.entry_bar_index(tradeNo) + 1    result = nz(sumBarsPerTrade / strategy.closedtrades)plot(avgBarsPerTrade())',
	},
	"strategy.closedtrades.entry_comment": {
		description:
			"Returns the comment message of the closed trade's entry, or na if there is no entry with this trade_num.",
		syntax: "strategy.closedtrades.entry_comment(trade_num) → series string",
		returns: "series string",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("`strategy.closedtrades.entry_comment()` Example", overlay = true)stopPrice = open * 1.01longCondition = ta.crossover(ta.sma(close, 14), ta.sma(close, 28))if (longCondition)    strategy.entry("Long", strategy.long, stop = stopPrice, comment = str.tostring(stopPrice, "#.####"))    strategy.exit("EXIT", trail_points = 1000, trail_offset = 0)var testTable = table.new(position.top_right, 1, 3, color.orange, border_width = 1)if barstate.islastconfirmedhistory or barstate.isrealtime    table.cell(testTable, 0, 0, \'Last closed trade:\')    table.cell(testTable, 0, 1, "Order stop price value: " + strategy.closedtrades.entry_comment(strategy.closedtrades - 1))    table.cell(testTable, 0, 2, "Actual Entry Price: " + str.tostring(strategy.closedtrades.entry_price(strategy.closedtrades - 1)))',
	},
	"strategy.closedtrades.entry_id": {
		description: "Returns the id of the closed trade's entry.",
		syntax: "strategy.closedtrades.entry_id(trade_num) → series string",
		returns: "series string",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("strategy.closedtrades.entry_id Example", overlay = true)// Enter a short position and close at the previous to last bar.if bar_index == 1    strategy.entry("Short at bar #" + str.tostring(bar_index), strategy.short)if bar_index == last_bar_index - 2    strategy.close_all()// Display ID of the last entry position.if barstate.islastconfirmedhistory    label.new(last_bar_index, high, "Last Entry ID is: " + strategy.closedtrades.entry_id(strategy.closedtrades - 1))',
	},
	"strategy.closedtrades.entry_price": {
		description: "Returns the price of the closed trade's entry.",
		syntax: "strategy.closedtrades.entry_price(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("strategy.closedtrades.entry_price Example 1")// Strategy calls to enter long trades every 15 bars and exit long trades every 20 bars.if bar_index % 15 == 0    strategy.entry("Long", strategy.long)if bar_index % 20 == 0    strategy.close("Long")// Return the entry price for the latest entry.entryPrice = strategy.closedtrades.entry_price(strategy.closedtrades - 1)plot(entryPrice, "Long entry price")',
	},
	"strategy.closedtrades.entry_time": {
		description:
			"Returns the UNIX time of the closed trade's entry, expressed in milliseconds..",
		syntax: "strategy.closedtrades.entry_time(trade_num) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("strategy.closedtrades.entry_time Example", overlay = true)// Enter long trades on three rising bars; exit on two falling bars.if ta.rising(close, 3)    strategy.entry("Long", strategy.long)if ta.falling(close, 2)    strategy.close("Long")// Calculate the average trade durationavgTradeDuration() =>    sumTradeDuration = 0    for i = 0 to strategy.closedtrades - 1        sumTradeDuration += strategy.closedtrades.exit_time(i) - strategy.closedtrades.entry_time(i)    result = nz(sumTradeDuration / strategy.closedtrades)// Display average duration converted to seconds and formatted using 2 decimal pointsif barstate.islastconfirmedhistory    label.new(bar_index, high, str.tostring(avgTradeDuration() / 1000, "#.##") + " seconds")',
	},
	"strategy.closedtrades.exit_bar_index": {
		description: "Returns the bar_index of the closed trade's exit.",
		syntax: "strategy.closedtrades.exit_bar_index(trade_num) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("strategy.closedtrades.exit_bar_index Example 1")// Strategy calls to place a single short trade. We enter the trade at the first bar and exit the trade at 10 bars before the last chart bar.if bar_index == 0    strategy.entry("Short", strategy.short)if bar_index == last_bar_index - 10    strategy.close("Short")// Calculate the amount of bars since the last closed trade.barsSinceClosed = strategy.closedtrades > 0 ? bar_index - strategy.closedtrades.exit_bar_index(strategy.closedtrades - 1) : naplot(barsSinceClosed, "Bars since last closed trade")',
	},
	"strategy.closedtrades.exit_comment": {
		description:
			"Returns the comment message of the closed trade's exit, or na if there is no entry with this trade_num.",
		syntax: "strategy.closedtrades.exit_comment(trade_num) → series string",
		returns: "series string",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("`strategy.closedtrades.exit_comment()` Example", overlay = true)longCondition = ta.crossover(ta.sma(close, 14), ta.sma(close, 28))if (longCondition)    strategy.entry("Long", strategy.long)    strategy.exit("Exit", stop = open * 0.95, limit = close * 1.05, trail_points = 100, trail_offset = 0, comment_profit = "TP", comment_loss = "SL", comment_trailing = "TRAIL")exitStats() =>    int slCount = 0    int tpCount = 0    int trailCount = 0    if strategy.closedtrades > 0        for i = 0 to strategy.closedtrades - 1            switch strategy.closedtrades.exit_comment(i)                "TP"    => tpCount    += 1                "SL"    => slCount    += 1                "TRAIL" => trailCount += 1    [slCount, tpCount, trailCount]var testTable = table.new(position.top_right, 1, 4, color.orange, border_width = 1)if barstate.islastconfirmedhistory    [slCount, tpCount, trailCount] = exitStats()    table.cell(testTable, 0, 0, "Closed trades (" + str.tostring(strategy.closedtrades) +") stats:")    table.cell(testTable, 0, 1, "Stop Loss: " + str.tostring(slCount))    table.cell(testTable, 0, 2, "Take Profit: " + str.tostring(tpCount))    table.cell(testTable, 0, 3, "Trailing Stop: " + str.tostring(trailCount))',
	},
	"strategy.closedtrades.exit_id": {
		description: "Returns the id of the closed trade's exit.",
		syntax: "strategy.closedtrades.exit_id(trade_num) → series string",
		returns: "series string",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("strategy.closedtrades.exit_id Example", overlay = true)// Strategy calls to create single short and long tradesif bar_index == last_bar_index - 15    strategy.entry("Long Entry", strategy.long)else if bar_index == last_bar_index - 10    strategy.entry("Short Entry", strategy.short)// When a new open trade is detected then we create the exit strategy corresponding with the matching entry id// We detect the correct entry id by determining if a position is long or short based on the position quantityif ta.change(strategy.opentrades) != 0    posSign = strategy.opentrades.size(strategy.opentrades - 1)    strategy.exit(posSign > 0 ? "SL Long Exit" : "SL Short Exit", strategy.opentrades.entry_id(strategy.opentrades - 1), stop = posSign > 0 ? high - ta.tr : low + ta.tr)// When a new closed trade is detected then we place a label above the bar with the exit infoif ta.change(strategy.closedtrades) != 0    msg = "Trade closed by: " + strategy.closedtrades.exit_id(strategy.closedtrades - 1)    label.new(bar_index, high + (3 * ta.tr), msg)',
	},
	"strategy.closedtrades.exit_price": {
		description: "Returns the price of the closed trade's exit.",
		syntax: "strategy.closedtrades.exit_price(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("strategy.closedtrades.exit_price Example 1")// We are creating a long trade every 5 barsif bar_index % 5 == 0    strategy.entry("Long", strategy.long)strategy.close("Long")// Return the exit price from the latest closed trade.exitPrice = strategy.closedtrades.exit_price(strategy.closedtrades - 1)plot(exitPrice, "Long exit price")',
	},
	"strategy.closedtrades.exit_time": {
		description:
			"Returns the UNIX time of the closed trade's exit, expressed in milliseconds.",
		syntax: "strategy.closedtrades.exit_time(trade_num) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("strategy.closedtrades.exit_time Example 1")// Enter long trades on three rising bars; exit on two falling bars.if ta.rising(close, 3)    strategy.entry("Long", strategy.long)if ta.falling(close, 2)    strategy.close("Long")// Calculate the average trade duration.avgTradeDuration() =>    sumTradeDuration = 0    for i = 0 to strategy.closedtrades - 1        sumTradeDuration += strategy.closedtrades.exit_time(i) - strategy.closedtrades.entry_time(i)    result = nz(sumTradeDuration / strategy.closedtrades)// Display average duration converted to seconds and formatted using 2 decimal points.if barstate.islastconfirmedhistory    label.new(bar_index, high, str.tostring(avgTradeDuration() / 1000, "#.##") + " seconds")',
	},
	"strategy.closedtrades.max_drawdown": {
		description:
			"Returns the maximum drawdown of the closed trade, i.e., the maximum possible loss during the trade, expressed in strategy.account_currency.",
		syntax: "strategy.closedtrades.max_drawdown(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("`strategy.closedtrades.max_drawdown` Example")// Strategy calls to enter long trades every 15 bars and exit long trades every 20 bars.if bar_index % 15 == 0    strategy.entry("Long", strategy.long)if bar_index % 20 == 0    strategy.close("Long")// Get the biggest max trade drawdown value from all of the closed trades.maxTradeDrawDown() =>    maxDrawdown = 0.0    for tradeNo = 0 to strategy.closedtrades - 1        maxDrawdown := math.max(maxDrawdown, strategy.closedtrades.max_drawdown(tradeNo))    result = maxDrawdownplot(maxTradeDrawDown(), "Biggest max drawdown")',
	},
	"strategy.closedtrades.max_drawdown_percent": {
		description:
			"Returns the maximum drawdown of the closed trade, i.e., the maximum possible loss during the trade, expressed as a percentage and calculated by formula: Lowest Value During Trade / (Entry Price x Quantity) * 100.",
		syntax:
			"strategy.closedtrades.max_drawdown_percent(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"strategy.closedtrades.max_runup": {
		description:
			"Returns the maximum run up of the closed trade, i.e., the maximum possible profit during the trade, expressed in strategy.account_currency.",
		syntax: "strategy.closedtrades.max_runup(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("`strategy.closedtrades.max_runup` Example")// Strategy calls to enter long trades every 15 bars and exit long trades every 20 bars.if bar_index % 15 == 0    strategy.entry("Long", strategy.long)if bar_index % 20 == 0    strategy.close("Long")// Get the biggest max trade runup value from all of the closed trades.maxTradeRunUp() =>    maxRunup = 0.0    for tradeNo = 0 to strategy.closedtrades - 1        maxRunup := math.max(maxRunup, strategy.closedtrades.max_runup(tradeNo))    result = maxRunupplot(maxTradeRunUp(), "Max trade runup")',
	},
	"strategy.closedtrades.max_runup_percent": {
		description:
			"Returns the maximum run-up of the closed trade, i.e., the maximum possible profit during the trade, expressed as a percentage and calculated by formula: Highest Value During Trade / (Entry Price x Quantity) * 100.",
		syntax: "strategy.closedtrades.max_runup_percent(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"strategy.closedtrades.profit": {
		description:
			"Returns the profit/loss of the closed trade in the strategy's account currency, reduced by the trade's commissions. A positive returned value represents a profit, and a negative value represents a loss.",
		syntax: "strategy.closedtrades.profit(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("`strategy.closedtrades.profit()` example")// Enter a long trade every 15 bars, and close a long trade every 20 bars.if bar_index % 15 == 0    strategy.entry("Long", strategy.long)if bar_index % 20 == 0    strategy.close("Long")//@function Calculates the average gross profit from all available closed trades. avgGrossProfit() =>    var float result = 0.0    if result == 0.0 or strategy.closedtrades > strategy.closedtrades[1]        float sumGrossProfit = 0.0        for tradeNo = 0 to strategy.closedtrades - 1            sumGrossProfit += strategy.closedtrades.profit(tradeNo)        result := nz(sumGrossProfit / strategy.closedtrades)    resultplot(avgGrossProfit(), "Average gross profit")',
	},
	"strategy.closedtrades.profit_percent": {
		description:
			"Returns the profit/loss value of the closed trade, expressed as a percentage. Losses are expressed as negative values.",
		syntax: "strategy.closedtrades.profit_percent(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"strategy.closedtrades.size": {
		description:
			"Returns the direction and the number of contracts traded in the closed trade. If the value is > 0, the market position was long. If the value is < 0, the market position was short.",
		syntax: "strategy.closedtrades.size(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("`strategy.closedtrades.size` Example 1")// We calculate the max amt of shares we can buy.amtShares = math.floor(strategy.equity / close)// Strategy calls to enter long trades every 15 bars and exit long trades every 20 barsif bar_index % 15 == 0    strategy.entry("Long", strategy.long, qty = amtShares)if bar_index % 20 == 0    strategy.close("Long")// Plot the number of contracts traded in the last closed trade.plot(strategy.closedtrades.size(strategy.closedtrades - 1), "Number of contracts traded")',
	},
	"strategy.convert_to_account": {
		description:
			"Converts the value from the currency that the symbol on the chart is traded in (syminfo.currency) to the currency used by the strategy (strategy.account_currency).",
		syntax: "strategy.convert_to_account(value) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("`strategy.convert_to_account` Example 1", currency = currency.EUR)plot(close, "Close price using default currency")plot(strategy.convert_to_account(close), "Close price converted to strategy currency")',
	},
	"strategy.convert_to_symbol": {
		description:
			"Converts the value from the currency used by the strategy (strategy.account_currency) to the currency that the symbol on the chart is traded in (syminfo.currency).",
		syntax: "strategy.convert_to_symbol(value) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("`strategy.convert_to_symbol` Example", currency = currency.EUR)// Calculate the max qty we can buy using current chart\'s currency.calcContracts(accountMoney) =>    math.floor(strategy.convert_to_symbol(accountMoney) / syminfo.pointvalue / close)// Return max qty we can buy using 300 eurosqt = calcContracts(300)// Strategy calls to enter long trades every 15 bars and exit long trades every 20 bars using our custom qty.if bar_index % 15 == 0    strategy.entry("Long", strategy.long, qty = qt)if bar_index % 20 == 0    strategy.close("Long")',
	},
	"strategy.default_entry_qty": {
		description:
			'Calculates the default quantity, in units, of an entry order from strategy.entry() or strategy.order() if it were to fill at the specified fill_price value. The calculation depends on several strategy properties, including default_qty_type, default_qty_value, currency, and other parameters in the strategy() function and their representation in the "Properties" tab of the strategy\'s settings.',
		syntax: "strategy.default_entry_qty(fill_price) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("Supertrend Strategy", overlay = true, default_qty_type = strategy.percent_of_equity, default_qty_value = 15)//@variable The length of the ATR calculation.atrPeriod = input(10, "ATR Length")//@variable The ATR multiplier.factor = input.float(3.0, "Factor", step = 0.01)//@variable The tick offset of the stop order.stopOffsetInput = input.int(100, "Tick offset for entry stop")// Get the direction of the SuperTrend.[_, direction] = ta.supertrend(factor, atrPeriod)if ta.change(direction) < 0    //@variable The stop price of the entry order.    stopPrice = close + syminfo.mintick * stopOffsetInput    //@variable The expected default fill quantity at the `stopPrice`. This value may not reflect actual qty of the filled order, because fill price may be different.    calculatedQty = strategy.default_entry_qty(stopPrice)    strategy.entry("My Long Entry Id", strategy.long, stop = stopPrice)    label.new(bar_index, stopPrice, str.format("Stop set at {0}\\nExpected qty at {0}: {1}", math.round_to_mintick(stopPrice), calculatedQty))if ta.change(direction) > 0    strategy.close_all()',
	},
	"strategy.entry": {
		description:
			"Creates a new order to open or add to a position. If an unfilled order with the same id exists, a call to this command modifies that order.",
		syntax:
			"strategy.entry(id, direction, qty, limit, stop, oca_name, oca_type, comment, alert_message, disable_alert) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("Market order strategy", overlay = true)// Calculate a 14-bar and 28-bar moving average of `close` prices.float sma14 = ta.sma(close, 14)float sma28 = ta.sma(close, 28)// Place a market order to close the short trade and enter a long position when `sma14` crosses over `sma28`.if ta.crossover(sma14, sma28)    strategy.entry("My Long Entry ID", strategy.long)// Place a market order to close the long trade and enter a short position when `sma14` crosses under `sma28`.if ta.crossunder(sma14, sma28)    strategy.entry("My Short Entry ID", strategy.short)',
	},
	"strategy.exit": {
		description:
			"Creates price-based orders to exit from an open position. If unfilled exit orders with the same id exist, calls to this command modify those orders. This command can generate more than one type of exit order, depending on the specified parameters. However, it does not create market orders. To exit from a position with a market order, use strategy.close() or strategy.close_all().",
		syntax:
			"strategy.exit(id, from_entry, qty, qty_percent, profit, limit, loss, stop, trail_price, trail_points, trail_offset, oca_name, comment, comment_profit, comment_loss, comment_trailing, alert_message, alert_profit, alert_loss, alert_trailing, disable_alert) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("Exit bracket strategy", overlay = true)// Inputs that define the profit and loss amount of each trade as a tick distance from the entry price.int profitDistanceInput = input.int(100, "Profit distance, in ticks", 1)int lossDistanceInput   = input.int(100, "Loss distance, in ticks", 1)// Variables to track the take-profit and stop-loss price.var float takeProfit = navar float stopLoss   = na// Calculate a 14-bar and 28-bar moving average of `close` prices.float sma14 = ta.sma(close, 14)float sma28 = ta.sma(close, 28)if ta.crossover(sma14, sma28) and strategy.opentrades == 0    // Place a market order to enter a long position.    strategy.entry("My Long Entry ID", strategy.long)    // Place a take-profit and stop-loss order when the entry order fills.    strategy.exit("My Long Exit ID", "My Long Entry ID", profit = profitDistanceInput, loss = lossDistanceInput)if ta.change(strategy.opentrades) == 1    //@variable The long entry price.    float entryPrice = strategy.opentrades.entry_price(0)    // Update the `takeProfit` and `stopLoss` values.    takeProfit := entryPrice + profitDistanceInput * syminfo.mintick    stopLoss   := entryPrice - lossDistanceInput * syminfo.mintickif ta.change(strategy.closedtrades) == 1    // Reset the `takeProfit` and `stopLoss`.    takeProfit := na    stopLoss   := na// Plot the `takeProfit` and `stopLoss`.plot(takeProfit, "Take-profit level", color.green, 2, plot.style_linebr)plot(stopLoss, "Stop-loss level", color.red, 2, plot.style_linebr)',
	},
	"strategy.opentrades.commission": {
		description:
			"Returns the sum of entry and exit fees paid in the open trade, expressed in strategy.account_currency.",
		syntax: "strategy.opentrades.commission(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'// Calculates the gross profit or loss for the current open position.//@version=6strategy("`strategy.opentrades.commission` Example", commission_type = strategy.commission.percent, commission_value = 0.1)// Strategy calls to enter long trades every 15 bars and exit long trades every 20 bars.if bar_index % 15 == 0    strategy.entry("Long", strategy.long)if bar_index % 20 == 0    strategy.close("Long")// Calculate gross profit or loss for open positions only.tradeOpenGrossPL() =>    sumOpenGrossPL = 0.0    for tradeNo = 0 to strategy.opentrades - 1        sumOpenGrossPL += strategy.opentrades.profit(tradeNo) - strategy.opentrades.commission(tradeNo)    result = sumOpenGrossPLplot(tradeOpenGrossPL())',
	},
	"strategy.opentrades.entry_bar_index": {
		description: "Returns the bar_index of the open trade's entry.",
		syntax: "strategy.opentrades.entry_bar_index(trade_num) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'// Wait 10 bars and then close the position.//@version=6strategy("`strategy.opentrades.entry_bar_index` Example")barsSinceLastEntry() =>    strategy.opentrades > 0 ? bar_index - strategy.opentrades.entry_bar_index(strategy.opentrades - 1) : na// Enter a long position if there are no open positions.if strategy.opentrades == 0    strategy.entry("Long", strategy.long)// Close the long position after 10 bars.if barsSinceLastEntry() >= 10    strategy.close("Long")',
	},
	"strategy.opentrades.entry_comment": {
		description:
			"Returns the comment message of the open trade's entry, or na if there is no entry with this trade_num.",
		syntax: "strategy.opentrades.entry_comment(trade_num) → series string",
		returns: "series string",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("`strategy.opentrades.entry_comment()` Example", overlay = true)stopPrice = open * 1.01longCondition = ta.crossover(ta.sma(close, 14), ta.sma(close, 28))if (longCondition)    strategy.entry("Long", strategy.long, stop = stopPrice, comment = str.tostring(stopPrice, "#.####"))var testTable = table.new(position.top_right, 1, 3, color.orange, border_width = 1)if barstate.islastconfirmedhistory or barstate.isrealtime    table.cell(testTable, 0, 0, \'Last entry stats\')    table.cell(testTable, 0, 1, "Order stop price value: " + strategy.opentrades.entry_comment(strategy.opentrades - 1))    table.cell(testTable, 0, 2, "Actual Entry Price: " + str.tostring(strategy.opentrades.entry_price(strategy.opentrades - 1)))',
	},
	"strategy.opentrades.entry_id": {
		description: "Returns the id of the open trade's entry.",
		syntax: "strategy.opentrades.entry_id(trade_num) → series string",
		returns: "series string",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("`strategy.opentrades.entry_id` Example", overlay = true)// We enter a long position when 14 period sma crosses over 28 period sma.// We enter a short position when 14 period sma crosses under 28 period sma.longCondition = ta.crossover(ta.sma(close, 14), ta.sma(close, 28))shortCondition = ta.crossunder(ta.sma(close, 14), ta.sma(close, 28))// Strategy calls to enter a long or short position when the corresponding condition is met.if longCondition    strategy.entry("Long entry at bar #" + str.tostring(bar_index), strategy.long)if shortCondition    strategy.entry("Short entry at bar #" + str.tostring(bar_index), strategy.short)// Display ID of the latest open position.if barstate.islastconfirmedhistory    label.new(bar_index, high + (2 * ta.tr), "Last opened position is \\n " + strategy.opentrades.entry_id(strategy.opentrades - 1))',
	},
	"strategy.opentrades.entry_price": {
		description: "Returns the price of the open trade's entry.",
		syntax: "strategy.opentrades.entry_price(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("strategy.opentrades.entry_price Example 1", overlay = true)// Strategy calls to enter long trades every 15 bars and exit long trades every 20 bars.if ta.crossover(close, ta.sma(close, 14))    strategy.entry("Long", strategy.long)// Return the entry price for the latest closed trade.currEntryPrice = strategy.opentrades.entry_price(strategy.opentrades - 1)currExitPrice = currEntryPrice * 1.05if high >= currExitPrice    strategy.close("Long")plot(currEntryPrice, "Long entry price", style = plot.style_linebr)plot(currExitPrice, "Long exit price", color.green, style = plot.style_linebr)',
	},
	"strategy.opentrades.entry_time": {
		description:
			"Returns the UNIX time of the open trade's entry, expressed in milliseconds.",
		syntax: "strategy.opentrades.entry_time(trade_num) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("strategy.opentrades.entry_time Example")// Strategy calls to enter long trades every 15 bars and exit long trades every 20 bars.if bar_index % 15 == 0    strategy.entry("Long", strategy.long)if bar_index % 20 == 0    strategy.close("Long")// Calculates duration in milliseconds since the last position was opened.timeSinceLastEntry()=>    strategy.opentrades > 0 ? (time - strategy.opentrades.entry_time(strategy.opentrades - 1)) : naplot(timeSinceLastEntry() / 1000 * 60 * 60 * 24, "Days since last entry")',
	},
	"strategy.opentrades.max_drawdown": {
		description:
			"Returns the maximum drawdown of the open trade, i.e., the maximum possible loss during the trade, expressed in strategy.account_currency.",
		syntax: "strategy.opentrades.max_drawdown(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("strategy.opentrades.max_drawdown Example 1")// Strategy calls to enter long trades every 15 bars and exit long trades every 20 bars.if bar_index % 15 == 0    strategy.entry("Long", strategy.long)if bar_index % 20 == 0    strategy.close("Long")// Plot the max drawdown of the latest open trade.plot(strategy.opentrades.max_drawdown(strategy.opentrades - 1), "Max drawdown of the latest open trade")',
	},
	"strategy.opentrades.max_drawdown_percent": {
		description:
			"Returns the maximum drawdown of the open trade, i.e., the maximum possible loss during the trade, expressed as a percentage and calculated by formula: Lowest Value During Trade / (Entry Price x Quantity) * 100.",
		syntax:
			"strategy.opentrades.max_drawdown_percent(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"strategy.opentrades.max_runup": {
		description:
			"Returns the maximum run up of the open trade, i.e., the maximum possible profit during the trade, expressed in strategy.account_currency.",
		syntax: "strategy.opentrades.max_runup(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("strategy.opentrades.max_runup Example 1")// Strategy calls to enter long trades every 15 bars and exit long trades every 20 bars.if bar_index % 15 == 0    strategy.entry("Long", strategy.long)if bar_index % 20 == 0    strategy.close("Long")// Plot the max runup of the latest open trade.plot(strategy.opentrades.max_runup(strategy.opentrades - 1), "Max runup of the latest open trade")',
	},
	"strategy.opentrades.max_runup_percent": {
		description:
			"Returns the maximum run-up of the open trade, i.e., the maximum possible profit during the trade, expressed as a percentage and calculated by formula: Highest Value During Trade / (Entry Price x Quantity) * 100.",
		syntax: "strategy.opentrades.max_runup_percent(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"strategy.opentrades.profit": {
		description:
			"Returns the profit/loss of the open trade, expressed in strategy.account_currency. Losses are expressed as negative values.",
		syntax: "strategy.opentrades.profit(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'// Returns the profit of the last open trade.//@version=6strategy("`strategy.opentrades.profit` Example 1", commission_type = strategy.commission.percent, commission_value = 0.1)// Strategy calls to enter long trades every 15 bars and exit long trades every 20 bars.if bar_index % 15 == 0    strategy.entry("Long", strategy.long)if bar_index % 20 == 0    strategy.close("Long")plot(strategy.opentrades.profit(strategy.opentrades - 1), "Profit of the latest open trade")',
	},
	"strategy.opentrades.profit_percent": {
		description:
			"Returns the profit/loss of the open trade, expressed as a percentage. Losses are expressed as negative values.",
		syntax: "strategy.opentrades.profit_percent(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"strategy.opentrades.size": {
		description:
			"Returns the direction and the number of contracts traded in the open trade. If the value is > 0, the market position was long. If the value is < 0, the market position was short.",
		syntax: "strategy.opentrades.size(trade_num) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("`strategy.opentrades.size` Example 1")// We calculate the max amt of shares we can buy.amtShares = math.floor(strategy.equity / close)// Strategy calls to enter long trades every 15 bars and exit long trades every 20 barsif bar_index % 15 == 0    strategy.entry("Long", strategy.long, qty = amtShares)if bar_index % 20 == 0    strategy.close("Long")// Plot the number of contracts in the latest open trade.plot(strategy.opentrades.size(strategy.opentrades - 1), "Amount of contracts in latest open trade")',
	},
	"strategy.order": {
		description:
			"Creates a new order to open, add to, or exit from a position. If an unfilled order with the same id exists, a call to this command modifies that order.",
		syntax:
			"strategy.order(id, direction, qty, limit, stop, oca_name, oca_type, comment, alert_message, disable_alert) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("Market order strategy", overlay = true)// Calculate a 14-bar and 28-bar moving average of `close` prices.float sma14 = ta.sma(close, 14)float sma28 = ta.sma(close, 28)// Place a market order to enter a long position when `sma14` crosses over `sma28`.if ta.crossover(sma14, sma28) and strategy.position_size == 0    strategy.order("My Long Entry ID", strategy.long)// Place a market order to sell the same quantity as the long trade when `sma14` crosses under `sma28`,// effectively closing the long position.if ta.crossunder(sma14, sma28) and strategy.position_size > 0    strategy.order("My Long Exit ID", strategy.short)',
	},
	"strategy.risk.allow_entry_in": {
		description:
			"This function can be used to specify in which market direction the strategy.entry() function is allowed to open positions.",
		syntax: "strategy.risk.allow_entry_in(value) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("strategy.risk.allow_entry_in")strategy.risk.allow_entry_in(strategy.direction.long)if open > close    strategy.entry("Long", strategy.long)// Instead of opening a short position with 10 contracts, this command will close long entries.if open < close    strategy.entry("Short", strategy.short, qty = 10)',
	},
	"strategy.risk.max_cons_loss_days": {
		description:
			"The purpose of this rule is to cancel all pending orders, close all open positions and stop placing orders after a specified number of consecutive days with losses. The rule affects the whole strategy.",
		syntax: "strategy.risk.max_cons_loss_days(count, alert_message) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("risk.max_cons_loss_days Demo 1")strategy.risk.max_cons_loss_days(3) // No orders will be placed after 3 days, if each day is with loss.plot(strategy.position_size)',
	},
	"strategy.risk.max_drawdown": {
		description:
			"The purpose of this rule is to determine maximum drawdown. The rule affects the whole strategy. Once the maximum drawdown value is reached, all pending orders are cancelled, all open positions are closed and no new orders can be placed.",
		syntax: "strategy.risk.max_drawdown(value, type, alert_message) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("risk.max_drawdown Demo 1")strategy.risk.max_drawdown(50, strategy.percent_of_equity) // set maximum drawdown to 50% of maximum equityplot(strategy.position_size)',
	},
	"strategy.risk.max_intraday_filled_orders": {
		description:
			"The purpose of this rule is to determine maximum number of filled orders per 1 day (per 1 bar, if chart resolution is higher than 1 day). The rule affects the whole strategy. Once the maximum number of filled orders is reached, all pending orders are cancelled, all open positions are closed and no new orders can be placed till the end of the current trading session.",
		syntax:
			"strategy.risk.max_intraday_filled_orders(count, alert_message) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("risk.max_intraday_filled_orders Demo")strategy.risk.max_intraday_filled_orders(10) // After 10 orders are filled, no more strategy orders will be placed (except for a market order to exit current open market position, if there is any).if open > close    strategy.entry("buy", strategy.long)if open < close    strategy.entry("sell", strategy.short)',
	},
	"strategy.risk.max_intraday_loss": {
		description:
			"The maximum loss value allowed during a day. It is specified either in money (base currency), or in percentage of maximum intraday equity (0 -100).",
		syntax:
			"strategy.risk.max_intraday_loss(value, type, alert_message) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'// Sets the maximum intraday loss using the strategy\'s equity value.//@version=6strategy("strategy.risk.max_intraday_loss Example 1", overlay = false, default_qty_type = strategy.percent_of_equity, default_qty_value = 100)// Input for maximum intraday loss %.lossPct = input.float(10)// Set maximum intraday loss to our lossPct inputstrategy.risk.max_intraday_loss(lossPct, strategy.percent_of_equity)// Enter Short at bar_index zero.if bar_index == 0    strategy.entry("Short", strategy.short)// Store equity value from the beginning of the dayeqFromDayStart = ta.valuewhen(ta.change(dayofweek) > 0, strategy.equity, 0)// Calculate change of the current equity from the beginning of the current day.eqChgPct = 100 * ((strategy.equity - eqFromDayStart) / strategy.equity)// Plot itplot(eqChgPct)hline(-lossPct)',
	},
	"strategy.risk.max_position_size": {
		description:
			"The purpose of this rule is to determine maximum size of a market position. The rule affects the following function: strategy.entry(). The 'entry' quantity can be reduced (if needed) to such number of contracts/shares/lots/units, so the total position size doesn't exceed the value specified in 'strategy.risk.max_position_size'. If minimum possible quantity still violates the rule, the order will not be placed.",
		syntax: "strategy.risk.max_position_size(contracts) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6strategy("risk.max_position_size Demo", default_qty_value = 100)strategy.risk.max_position_size(10)if open > close    strategy.entry("buy", strategy.long)plot(strategy.position_size) // max plot value will be 10',
	},
	string: {
		description: "Casts na to string",
		syntax: "string(x) → const string",
		returns: "const string",
		type: "function",
		category: "",
		example: "",
	},
	"syminfo.prefix": {
		description: 'Returns exchange prefix of the symbol, e.g. "NASDAQ".',
		syntax: "syminfo.prefix(symbol) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("syminfo.prefix fun", overlay=true)i_sym = input.symbol("NASDAQ:AAPL")pref = syminfo.prefix(i_sym)tick = syminfo.ticker(i_sym)t = ticker.new(pref, tick, session.extended)s = request.security(t, "1D", close)plot(s)',
	},
	"syminfo.ticker": {
		description: 'Returns symbol name without exchange prefix, e.g. "AAPL".',
		syntax: "syminfo.ticker(symbol) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("syminfo.ticker fun", overlay=true)i_sym = input.symbol("NASDAQ:AAPL")pref = syminfo.prefix(i_sym)tick = syminfo.ticker(i_sym)t = ticker.new(pref, tick, session.extended)s = request.security(t, "1D", close)plot(s)',
	},
	"ta.alma": {
		description:
			"Arnaud Legoux Moving Average. It uses Gaussian distribution as weights for moving average.",
		syntax: "ta.alma(series, length, offset, sigma, floor) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.alma", overlay=true)plot(ta.alma(close, 9, 0.85, 6))// same on pine, but much less efficientpine_alma(series, windowsize, offset, sigma) =>    m = offset * (windowsize - 1)    //m = math.floor(offset * (windowsize - 1)) // Used as m when math.floor=true    s = windowsize / sigma    norm = 0.0    sum = 0.0    for i = 0 to windowsize - 1        weight = math.exp(-1 * math.pow(i - m, 2) / (2 * math.pow(s, 2)))        norm := norm + weight        sum := sum + series[windowsize - i - 1] * weight    sum / normplot(pine_alma(close, 9, 0.85, 6))',
	},
	"ta.atr": {
		description:
			"Function atr (average true range) returns the RMA of true range. True range is max(high - low, abs(high - close[1]), abs(low - close[1])).",
		syntax: "ta.atr(length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.atr")plot(ta.atr(14))//the same on pinepine_atr(length) =>    trueRange = na(high[1])? high-low : math.max(math.max(high - low, math.abs(high - close[1])), math.abs(low - close[1]))    //true range can be also calculated with ta.tr(true)    ta.rma(trueRange, length)plot(pine_atr(14))',
	},
	"ta.barssince": {
		description:
			"Counts the number of bars since the last time the condition was true.",
		syntax: "ta.barssince(condition) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.barssince")// get number of bars since last color.green barplot(ta.barssince(close >= open))',
	},
	"ta.bb": {
		description:
			"Bollinger Bands. A Bollinger Band is a technical analysis tool defined by a set of lines plotted two standard deviations (positively and negatively) away from a simple moving average (SMA) of the security's price, but can be adjusted to user preferences.",
		syntax:
			"ta.bb(series, length, mult) → [series float, series float, series float]",
		returns: "[series float, series float, series float]",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.bb")[middle, upper, lower] = ta.bb(close, 5, 4)plot(middle, color=color.yellow)plot(upper, color=color.yellow)plot(lower, color=color.yellow)// the same on pinef_bb(src, length, mult) =>    float basis = ta.sma(src, length)    float dev = mult * ta.stdev(src, length)    [basis, basis + dev, basis - dev][pineMiddle, pineUpper, pineLower] = f_bb(close, 5, 4)plot(pineMiddle)plot(pineUpper)plot(pineLower)',
	},
	"ta.bbw": {
		description:
			"Bollinger Bands Width. The Bollinger Band Width is the difference between the upper and the lower Bollinger Bands divided by the middle band.",
		syntax: "ta.bbw(series, length, mult) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.bbw")plot(ta.bbw(close, 5, 4), color=color.yellow)// the same on pinef_bbw(src, length, mult) =>    float basis = ta.sma(src, length)    float dev = mult * ta.stdev(src, length)    (((basis + dev) - (basis - dev)) / basis) * 100plot(f_bbw(close, 5, 4))',
	},
	"ta.cci": {
		description:
			"The CCI (commodity channel index) is calculated as the difference between the typical price of a commodity and its simple moving average, divided by the mean absolute deviation of the typical price. The index is scaled by an inverse factor of 0.015 to provide more readable numbers.",
		syntax: "ta.cci(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.change": {
		description:
			"Compares the current source value to its value length bars ago and returns the difference.",
		syntax: "ta.change(source, length) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			"//@version=6indicator('Day and Direction Change', overlay = true)dailyBarTime = time('1D')isNewDay = ta.change(dailyBarTime) != 0bgcolor(isNewDay ? color.new(color.green, 80) : na)isGreenBar = close >= opencolorChange = ta.change(isGreenBar)plotshape(colorChange, 'Direction Change')",
	},
	"ta.cmo": {
		description:
			"Chande Momentum Oscillator. Calculates the difference between the sum of recent gains and the sum of recent losses and then divides the result by the sum of all price movement over the same period.",
		syntax: "ta.cmo(series, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.cmo")plot(ta.cmo(close, 5), color=color.yellow)// the same on pinef_cmo(src, length) =>    float mom = ta.change(src)    float sm1 = math.sum((mom >= 0) ? mom : 0.0, length)    float sm2 = math.sum((mom >= 0) ? 0.0 : -mom, length)    100 * (sm1 - sm2) / (sm1 + sm2)plot(f_cmo(close, 5))',
	},
	"ta.cog": {
		description:
			"The cog (center of gravity) is an indicator based on statistics and the Fibonacci golden ratio.",
		syntax: "ta.cog(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.cog", overlay=true)plot(ta.cog(close, 10))// the same on pinepine_cog(source, length) =>    sum = math.sum(source, length)    num = 0.0    for i = 0 to length - 1        price = source[i]        num := num + price * (i + 1)    -num / sumplot(pine_cog(close, 10))',
	},
	"ta.correlation": {
		description:
			"Correlation coefficient. Describes the degree to which two series tend to deviate from their ta.sma() values.",
		syntax: "ta.correlation(source1, source2, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.cross": {
		description: "",
		syntax: "ta.cross(source1, source2) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"ta.crossover": {
		description:
			"The source1-series is defined as having crossed over source2-series if, on the current bar, the value of source1 is greater than the value of source2, and on the previous bar, the value of source1 was less than or equal to the value of source2.",
		syntax: "ta.crossover(source1, source2) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"ta.crossunder": {
		description:
			"The source1-series is defined as having crossed under source2-series if, on the current bar, the value of source1 is less than the value of source2, and on the previous bar, the value of source1 was greater than or equal to the value of source2.",
		syntax: "ta.crossunder(source1, source2) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"ta.cum": {
		description:
			"Cumulative (total) sum of source. In other words it's a sum of all elements of source.",
		syntax: "ta.cum(source) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.dev": {
		description: "Measure of difference between the series and it's ta.sma()",
		syntax: "ta.dev(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.dev")plot(ta.dev(close, 10))// the same on pinepine_dev(source, length) =>    mean = ta.sma(source, length)    sum = 0.0    for i = 0 to length - 1        val = source[i]        sum := sum + math.abs(val - mean)    dev = sum/lengthplot(pine_dev(close, 10))',
	},
	"ta.dmi": {
		description: "The dmi function returns the directional movement index.",
		syntax:
			"ta.dmi(diLength, adxSmoothing) → [series float, series float, series float]",
		returns: "[series float, series float, series float]",
		type: "function",
		category: "",
		example:
			'//@version=6indicator(title="Directional Movement Index", shorttitle="DMI", format=format.price, precision=4)len = input.int(17, minval=1, title="DI Length")lensig = input.int(14, title="ADX Smoothing", minval=1)[diplus, diminus, adx] = ta.dmi(len, lensig)plot(adx, color=color.red, title="ADX")plot(diplus, color=color.blue, title="+DI")plot(diminus, color=color.orange, title="-DI")',
	},
	"ta.ema": {
		description:
			"The ema function returns the exponentially weighted moving average. In ema weighting factors decrease exponentially. It calculates by using a formula: EMA = alpha * source + (1 - alpha) * EMA[1], where alpha = 2 / (length + 1).",
		syntax: "ta.ema(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.ema")plot(ta.ema(close, 15))//the same on pinepine_ema(src, length) =>    alpha = 2 / (length + 1)    sum = 0.0    sum := na(sum[1]) ? src : alpha * src + (1 - alpha) * nz(sum[1])plot(pine_ema(close,15))',
	},
	"ta.falling": {
		description:
			"Test if the source series is now falling for length bars long.",
		syntax: "ta.falling(source, length) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"ta.highest": {
		description: "Highest value for a given number of bars back.",
		syntax: "ta.highest(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.highestbars": {
		description: "Highest value offset for a given number of bars back.",
		syntax: "ta.highestbars(source, length) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	"ta.hma": {
		description: "The hma function returns the Hull Moving Average.",
		syntax: "ta.hma(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Hull Moving Average")src = input(defval=close, title="Source")length = input(defval=9, title="Length")hmaBuildIn = ta.hma(src, length)plot(hmaBuildIn, title="Hull MA", color=#674EA7)',
	},
	"ta.kc": {
		description:
			"Keltner Channels. Keltner channel is a technical analysis indicator showing a central moving average line plus channel lines at a distance above and below.",
		syntax:
			"ta.kc(series, length, mult, useTrueRange) → [series float, series float, series float]",
		returns: "[series float, series float, series float]",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.kc")[middle, upper, lower] = ta.kc(close, 5, 4)plot(middle, color=color.yellow)plot(upper, color=color.yellow)plot(lower, color=color.yellow)// the same on pinef_kc(src, length, mult, useTrueRange) =>    float basis = ta.ema(src, length)    float span = (useTrueRange) ? ta.tr : (high - low)    float rangeEma = ta.ema(span, length)    [basis, basis + rangeEma * mult, basis - rangeEma * mult][pineMiddle, pineUpper, pineLower] = f_kc(close, 5, 4, true)plot(pineMiddle)plot(pineUpper)plot(pineLower)',
	},
	"ta.kcw": {
		description:
			"Keltner Channels Width. The Keltner Channels Width is the difference between the upper and the lower Keltner Channels divided by the middle channel.",
		syntax: "ta.kcw(series, length, mult, useTrueRange) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.kcw")plot(ta.kcw(close, 5, 4), color=color.yellow)// the same on pinef_kcw(src, length, mult, useTrueRange) =>    float basis = ta.ema(src, length)    float span = (useTrueRange) ? ta.tr : (high - low)    float rangeEma = ta.ema(span, length)    ((basis + rangeEma * mult) - (basis - rangeEma * mult)) / basisplot(f_kcw(close, 5, 4, true))',
	},
	"ta.linreg": {
		description:
			"Linear regression curve. A line that best fits the prices specified over a user-defined time period. It is calculated using the least squares method. The result of this function is calculated using the formula: linreg = intercept + slope * (length - 1 - offset), where intercept and slope are the values calculated with the least squares method on source series.",
		syntax: "ta.linreg(source, length, offset) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.lowest": {
		description: "Lowest value for a given number of bars back.",
		syntax: "ta.lowest(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.lowestbars": {
		description: "Lowest value offset for a given number of bars back.",
		syntax: "ta.lowestbars(source, length) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	"ta.macd": {
		description:
			"MACD (moving average convergence/divergence). It is supposed to reveal changes in the strength, direction, momentum, and duration of a trend in a stock's price.",
		syntax:
			"ta.macd(source, fastlen, slowlen, siglen) → [series float, series float, series float]",
		returns: "[series float, series float, series float]",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("MACD")[macdLine, signalLine, histLine] = ta.macd(close, 12, 26, 9)plot(macdLine, color=color.blue)plot(signalLine, color=color.orange)plot(histLine, color=color.red, style=plot.style_histogram)',
	},
	"ta.max": {
		description:
			"Returns the all-time high value of source from the beginning of the chart up to the current bar.",
		syntax: "ta.max(source) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.median": {
		description: "Returns the median of the series.",
		syntax: "ta.median(source, length) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	"ta.mfi": {
		description:
			"Money Flow Index. The Money Flow Index (MFI) is a technical oscillator that uses price and volume for identifying overbought or oversold conditions in an asset.",
		syntax: "ta.mfi(series, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Money Flow Index")plot(ta.mfi(hlc3, 14), color=color.yellow)// the same on pinepine_mfi(src, length) =>    float upper = math.sum(volume * (ta.change(src) <= 0.0 ? 0.0 : src), length)    float lower = math.sum(volume * (ta.change(src) >= 0.0 ? 0.0 : src), length)    mfi = 100.0 - (100.0 / (1.0 + upper / lower))    mfiplot(pine_mfi(hlc3, 14))',
	},
	"ta.min": {
		description:
			"Returns the all-time low value of source from the beginning of the chart up to the current bar.",
		syntax: "ta.min(source) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.mode": {
		description:
			"Returns the mode of the series. If there are several values with the same frequency, it returns the smallest value.",
		syntax: "ta.mode(source, length) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	"ta.mom": {
		description:
			"Momentum of source price and source price length bars ago. This is simply a difference: source - source[length].",
		syntax: "ta.mom(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.percentile_linear_interpolation": {
		description:
			"Calculates percentile using method of linear interpolation between the two nearest ranks.",
		syntax:
			"ta.percentile_linear_interpolation(source, length, percentage) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.percentile_nearest_rank": {
		description: "Calculates percentile using method of Nearest Rank.",
		syntax:
			"ta.percentile_nearest_rank(source, length, percentage) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.percentrank": {
		description:
			"Percent rank is the percents of how many previous values was less than or equal to the current value of given series.",
		syntax: "ta.percentrank(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.pivot_point_levels": {
		description:
			"Calculates the pivot point levels using the specified type and anchor.",
		syntax: "ta.pivot_point_levels(type, anchor, developing) → array<float>",
		returns: "array<float>",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Weekly Pivots", max_lines_count=500, overlay=true)timeframe = "1W"typeInput = input.string("Traditional", "Type", options=["Traditional", "Fibonacci", "Woodie", "Classic", "DM", "Camarilla"])weekChange = timeframe.change(timeframe)pivotPointsArray = ta.pivot_point_levels(typeInput, weekChange)if weekChange    for pivotLevel in pivotPointsArray        line.new(time, pivotLevel, time + timeframe.in_seconds(timeframe) * 1000, pivotLevel, xloc=xloc.bar_time)',
	},
	"ta.pivothigh": {
		description:
			"This function returns price of the pivot high point. It returns 'NaN', if there was no pivot high point.",
		syntax: "ta.pivothigh(leftbars, rightbars) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("PivotHigh", overlay=true)leftBars = input(2)rightBars=input(2)ph = ta.pivothigh(leftBars, rightBars)plot(ph, style=plot.style_cross, linewidth=3, color= color.red, offset=-rightBars)',
	},
	"ta.pivotlow": {
		description:
			"This function returns price of the pivot low point. It returns 'NaN', if there was no pivot low point.",
		syntax: "ta.pivotlow(leftbars, rightbars) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("PivotLow", overlay=true)leftBars = input(2)rightBars=input(2)pl = ta.pivotlow(close, leftBars, rightBars)plot(pl, style=plot.style_cross, linewidth=3, color= color.blue, offset=-rightBars)',
	},
	"ta.range": {
		description:
			"Returns the difference between the min and max values in a series.",
		syntax: "ta.range(source, length) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	"ta.rci": {
		description:
			"Calculates the Rank Correlation Index (RCI), which measures the directional consistency of price movements. It evaluates the monotonic relationship between a source series and the bar index over length bars using Spearman's rank correlation coefficient. The resulting value is scaled to a range of -100 to 100, where 100 indicates the source consistently increased over the period, and -100 indicates it consistently decreased. Values between -100 and 100 reflect varying degrees of upward or downward consistency.",
		syntax: "ta.rci(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.rising": {
		description:
			"Test if the source series is now rising for length bars long.",
		syntax: "ta.rising(source, length) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example: "",
	},
	"ta.rma": {
		description:
			"Moving average used in RSI. It is the exponentially weighted moving average with alpha = 1 / length.",
		syntax: "ta.rma(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.rma")plot(ta.rma(close, 15))//the same on pinepine_rma(src, length) =>    alpha = 1/length    sum = 0.0    sum := na(sum[1]) ? ta.sma(src, length) : alpha * src + (1 - alpha) * nz(sum[1])plot(pine_rma(close, 15))',
	},
	"ta.roc": {
		description:
			"Calculates the percentage of change (rate of change) between the current value of source and its value length bars ago.",
		syntax: "ta.roc(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.rsi": {
		description:
			"Relative strength index. It is calculated using the ta.rma() of upward and downward changes of source over the last length bars.",
		syntax: "ta.rsi(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.rsi")plot(ta.rsi(close, 7))// same on pine, but less efficientpine_rsi(x, y) =>    u = math.max(x - x[1], 0) // upward ta.change    d = math.max(x[1] - x, 0) // downward ta.change    rs = ta.rma(u, y) / ta.rma(d, y)    res = 100 - 100 / (1 + rs)    resplot(pine_rsi(close, 7))',
	},
	"ta.sar": {
		description:
			"Parabolic SAR (parabolic stop and reverse) is a method devised by J. Welles Wilder, Jr., to find potential reversals in the market price direction of traded goods.",
		syntax: "ta.sar(start, inc, max) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.sar")plot(ta.sar(0.02, 0.02, 0.2), style=plot.style_cross, linewidth=3)// The same on Pine Script®pine_sar(start, inc, max) =>    var float result = na    var float maxMin = na    var float acceleration = na    var bool isBelow = false    bool isFirstTrendBar = false    if bar_index == 1        if close > close[1]            isBelow := true            maxMin := high            result := low[1]        else            isBelow := false            maxMin := low            result := high[1]        isFirstTrendBar := true        acceleration := start    result := result + acceleration * (maxMin - result)    if isBelow        if result > low            isFirstTrendBar := true            isBelow := false            result := math.max(high, maxMin)            maxMin := low            acceleration := start    else        if result < high            isFirstTrendBar := true            isBelow := true            result := math.min(low, maxMin)            maxMin := high            acceleration := start                if not isFirstTrendBar        if isBelow            if high > maxMin                maxMin := high                acceleration := math.min(acceleration + inc, max)        else            if low < maxMin                maxMin := low                acceleration := math.min(acceleration + inc, max)    if isBelow        result := math.min(result, low[1])        if bar_index > 1            result := math.min(result, low[2])            else        result := math.max(result, high[1])        if bar_index > 1            result := math.max(result, high[2])    resultplot(pine_sar(0.02, 0.02, 0.2), style=plot.style_cross, linewidth=3)',
	},
	"ta.sma": {
		description:
			"The sma function returns the moving average, that is the sum of last y values of x, divided by y.",
		syntax: "ta.sma(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.sma")plot(ta.sma(close, 15))// same on pine, but much less efficientpine_sma(x, y) =>    sum = 0.0    for i = 0 to y - 1        sum := sum + x[i] / y    sumplot(pine_sma(close, 15))',
	},
	"ta.stdev": {
		description: "",
		syntax: "ta.stdev(source, length, biased) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.stdev")plot(ta.stdev(close, 5))//the same on pineisZero(val, eps) => math.abs(val) <= epsSUM(fst, snd) =>    EPS = 1e-10    res = fst + snd    if isZero(res, EPS)        res := 0    else        if not isZero(res, 1e-4)            res := res        else            15pine_stdev(src, length) =>    avg = ta.sma(src, length)    sumOfSquareDeviations = 0.0    for i = 0 to length - 1        sum = SUM(src[i], -avg)        sumOfSquareDeviations := sumOfSquareDeviations + sum * sum    stdev = math.sqrt(sumOfSquareDeviations / length)plot(pine_stdev(close, 5))',
	},
	"ta.stoch": {
		description:
			"Stochastic. It is calculated by a formula: 100 * (close - lowest(low, length)) / (highest(high, length) - lowest(low, length)).",
		syntax: "ta.stoch(source, high, low, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.supertrend": {
		description:
			"The Supertrend Indicator. The Supertrend is a trend following indicator.",
		syntax: "ta.supertrend(factor, atrPeriod) → [series float, series float]",
		returns: "[series float, series float]",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Pine Script® Supertrend")[supertrend, direction] = ta.supertrend(3, 10)plot(direction < 0 ? supertrend : na, "Up direction", color = color.green, style=plot.style_linebr)plot(direction > 0 ? supertrend : na, "Down direction", color = color.red, style=plot.style_linebr)// The same on Pine Script®pine_supertrend(factor, atrPeriod) =>    src = hl2    atr = ta.atr(atrPeriod)    upperBand = src + factor * atr    lowerBand = src - factor * atr    prevLowerBand = nz(lowerBand[1])    prevUpperBand = nz(upperBand[1])    lowerBand := lowerBand > prevLowerBand or close[1] < prevLowerBand ? lowerBand : prevLowerBand    upperBand := upperBand < prevUpperBand or close[1] > prevUpperBand ? upperBand : prevUpperBand    int _direction = na    float superTrend = na    prevSuperTrend = superTrend[1]    if na(atr[1])        _direction := 1    else if prevSuperTrend == prevUpperBand        _direction := close > upperBand ? -1 : 1    else        _direction := close < lowerBand ? 1 : -1    superTrend := _direction == -1 ? lowerBand : upperBand    [superTrend, _direction][Pine_Supertrend, pineDirection] = pine_supertrend(3, 10)plot(pineDirection < 0 ? Pine_Supertrend : na, "Up direction", color = color.green, style=plot.style_linebr)plot(pineDirection > 0 ? Pine_Supertrend : na, "Down direction", color = color.red, style=plot.style_linebr)',
	},
	"ta.swma": {
		description:
			"Symmetrically weighted moving average with fixed length: 4. Weights: [1/6, 2/6, 2/6, 1/6].",
		syntax: "ta.swma(source) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.swma")plot(ta.swma(close))// same on pine, but less efficientpine_swma(x) =>    x[3] * 1 / 6 + x[2] * 2 / 6 + x[1] * 2 / 6 + x[0] * 1 / 6plot(pine_swma(close))',
	},
	"ta.tr": {
		description:
			"Calculates the current bar's true range. Unlike a bar's actual range (high - low), true range accounts for potential gaps by taking the maximum of the current bar's actual range and the absolute distances from the previous bar's close to the current bar's high and low. The formula is: math.max(high - low, math.abs(high - close[1]), math.abs(low - close[1])).",
		syntax: "ta.tr(handle_na) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.tsi": {
		description:
			"True strength index. It uses moving averages of the underlying momentum of a financial instrument.",
		syntax: "ta.tsi(source, short_length, long_length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.valuewhen": {
		description:
			"Returns the value of the source series on the bar where the condition was true on the nth most recent occurrence.",
		syntax: "ta.valuewhen(condition, source, occurrence) → series color",
		returns: "series color",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.valuewhen")slow = ta.sma(close, 7)fast = ta.sma(close, 14)// Get value of `close` on second most recent crossplot(ta.valuewhen(ta.cross(slow, fast), close, 1))',
	},
	"ta.variance": {
		description:
			"Variance is the expectation of the squared deviation of a series from its mean (ta.sma()), and it informally measures how far a set of numbers are spread out from their mean.",
		syntax: "ta.variance(source, length, biased) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example: "",
	},
	"ta.vwap": {
		description: "Volume weighted average price.",
		syntax: "ta.vwap(source, anchor) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Simple VWAP")vwap = ta.vwap(open)plot(vwap)',
	},
	"ta.vwma": {
		description:
			"The vwma function returns volume-weighted moving average of source for length bars back. It is the same as: sma(source * volume, length) / sma(volume, length).",
		syntax: "ta.vwma(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.vwma")plot(ta.vwma(close, 15))// same on pine, but less efficientpine_vwma(x, y) =>    ta.sma(x * volume, y) / ta.sma(volume, y)plot(pine_vwma(close, 15))',
	},
	"ta.wma": {
		description:
			"The wma function returns weighted moving average of source for length bars back. In wma weighting factors decrease in arithmetical progression.",
		syntax: "ta.wma(source, length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ta.wma")plot(ta.wma(close, 15))// same on pine, but much less efficientpine_wma(x, y) =>    norm = 0.0    sum = 0.0    for i = 0 to y - 1        weight = (y - i) * y        norm := norm + weight        sum := sum + x[i] * weight    sum / normplot(pine_wma(close, 15))',
	},
	"ta.wpr": {
		description:
			"Williams %R. The oscillator shows the current closing price in relation to the high and low of the past 'length' bars.",
		syntax: "ta.wpr(length) → series float",
		returns: "series float",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Williams %R", shorttitle="%R", format=format.price, precision=2)plot(ta.wpr(14), title="%R", color=color.new(#ff6d00, 0))',
	},
	table: {
		description: "Casts na to table",
		syntax: "table(x) → series table",
		returns: "series table",
		type: "function",
		category: "",
		example: "",
	},
	"table.cell": {
		description:
			"The function defines a cell in the table and sets its attributes.",
		syntax:
			"table.cell(table_id, column, row, text, width, height, text_color, text_halign, text_valign, text_size, bgcolor, tooltip, text_font_family, text_formatting) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"table.cell_set_bgcolor": {
		description: "The function sets the background color of the cell.",
		syntax: "table.cell_set_bgcolor(table_id, column, row, bgcolor) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"table.cell_set_height": {
		description: "The function sets the height of cell.",
		syntax: "table.cell_set_height(table_id, column, row, height) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"table.cell_set_text": {
		description: "The function sets the text in the specified cell.",
		syntax: "table.cell_set_text(table_id, column, row, text) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("TABLE example")var tLog = table.new(position = position.top_left, rows = 1, columns = 2, bgcolor = color.yellow, border_width=1)table.cell(tLog, row = 0, column = 0, text = "sometext", text_color = color.blue)table.cell_set_text(tLog, row = 0, column = 0, text = "sometext")',
	},
	"table.cell_set_text_color": {
		description: "The function sets the color of the text inside the cell.",
		syntax:
			"table.cell_set_text_color(table_id, column, row, text_color) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"table.cell_set_text_font_family": {
		description:
			"The function sets the font family of the text inside the cell.",
		syntax:
			"table.cell_set_text_font_family(table_id, column, row, text_font_family) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Example of setting the table cell font")var t = table.new(position.top_left, rows = 1, columns = 1)table.cell(t, 0, 0, "monospace", text_color = color.blue)table.cell_set_text_font_family(t, 0, 0, font.family_monospace)',
	},
	"table.cell_set_text_formatting": {
		description:
			"Sets the formatting attributes the drawing applies to displayed text.",
		syntax:
			"table.cell_set_text_formatting(table_id, column, row, text_formatting) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"table.cell_set_text_halign": {
		description:
			"The function sets the horizontal alignment of the cell's text.",
		syntax:
			"table.cell_set_text_halign(table_id, column, row, text_halign) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"table.cell_set_text_size": {
		description: "The function sets the size of the cell's text.",
		syntax: "table.cell_set_text_size(table_id, column, row, text_size) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"table.cell_set_text_valign": {
		description: "The function sets the vertical alignment of a cell's text.",
		syntax:
			"table.cell_set_text_valign(table_id, column, row, text_valign) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"table.cell_set_tooltip": {
		description: "The function sets the tooltip in the specified cell.",
		syntax: "table.cell_set_tooltip(table_id, column, row, tooltip) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("TABLE example")var tLog = table.new(position = position.top_left, rows = 1, columns = 2, bgcolor = color.yellow, border_width=1)table.cell(tLog, row = 0, column = 0, text = "sometext", text_color = color.blue)table.cell_set_tooltip(tLog, row = 0, column = 0, tooltip = "sometext")',
	},
	"table.cell_set_width": {
		description: "The function sets the width of the cell.",
		syntax: "table.cell_set_width(table_id, column, row, width) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"table.clear": {
		description:
			"The function removes a cell or a sequence of cells from the table. The cells are removed in a rectangle shape where the start_column and start_row specify the top-left corner, and end_column and end_row specify the bottom-right corner.",
		syntax:
			"table.clear(table_id, start_column, start_row, end_column, end_row) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("A donut", overlay=true)if barstate.islast    colNum = 8, rowNum = 8    padding = "◯"    donutTable = table.new(position.middle_right, colNum, rowNum)    for c = 0 to colNum - 1        for r = 0 to rowNum - 1            table.cell(donutTable, c, r, text=padding, bgcolor=#face6e, text_color=color.new(color.black, 100))    table.clear(donutTable, 2, 2, 5, 5)',
	},
	"table.delete": {
		description: "The function deletes a table.",
		syntax: "table.delete(table_id) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("table.delete example")var testTable = table.new(position = position.top_right, columns = 2, rows = 1, bgcolor = color.yellow, border_width = 1)if barstate.islast    table.cell(table_id = testTable, column = 0, row = 0, text = "Open is " + str.tostring(open))    table.cell(table_id = testTable, column = 1, row = 0, text = "Close is " + str.tostring(close), bgcolor=color.teal)if barstate.isrealtime    table.delete(testTable)',
	},
	"table.merge_cells": {
		description:
			"The function merges a sequence of cells in the table into one cell. The cells are merged in a rectangle shape where the start_column and start_row specify the top-left corner, and end_column and end_row specify the bottom-right corner.",
		syntax:
			"table.merge_cells(table_id, start_column, start_row, end_column, end_row) → void",
		returns: "void",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("table.merge_cells example")SMA50  = ta.sma(close, 50)SMA100 = ta.sma(close, 100)SMA200 = ta.sma(close, 200)if barstate.islast    maTable = table.new(position.bottom_right, 3, 3, bgcolor = color.gray, border_width = 1, border_color = color.black)    // Header    table.cell(maTable, 0, 0, text = "SMA Table")    table.merge_cells(maTable, 0, 0, 2, 0)    // Cell Titles    table.cell(maTable, 0, 1, text = "SMA 50")    table.cell(maTable, 1, 1, text = "SMA 100")    table.cell(maTable, 2, 1, text = "SMA 200")    // Values    table.cell(maTable, 0, 2, bgcolor = color.white, text = str.tostring(SMA50))    table.cell(maTable, 1, 2, bgcolor = color.white, text = str.tostring(SMA100))    table.cell(maTable, 2, 2, bgcolor = color.white, text = str.tostring(SMA200))',
	},
	"table.new": {
		description: "The function creates a new table.",
		syntax:
			"table.new(position, columns, rows, bgcolor, frame_color, frame_width, border_color, border_width, force_overlay) → series table",
		returns: "series table",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("table.new example")var testTable = table.new(position = position.top_right, columns = 2, rows = 1, bgcolor = color.yellow, border_width = 1)if barstate.islast    table.cell(table_id = testTable, column = 0, row = 0, text = "Open is " + str.tostring(open))    table.cell(table_id = testTable, column = 1, row = 0, text = "Close is " + str.tostring(close), bgcolor=color.teal)',
	},
	"table.set_bgcolor": {
		description: "The function sets the background color of a table.",
		syntax: "table.set_bgcolor(table_id, bgcolor) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"table.set_border_color": {
		description:
			"The function sets the color of the borders (excluding the outer frame) of the table's cells.",
		syntax: "table.set_border_color(table_id, border_color) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"table.set_border_width": {
		description:
			"The function sets the width of the borders (excluding the outer frame) of the table's cells.",
		syntax: "table.set_border_width(table_id, border_width) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"table.set_frame_color": {
		description: "The function sets the color of the outer frame of a table.",
		syntax: "table.set_frame_color(table_id, frame_color) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"table.set_frame_width": {
		description: "The function set the width of the outer frame of a table.",
		syntax: "table.set_frame_width(table_id, frame_width) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"table.set_position": {
		description: "The function sets the position of a table.",
		syntax: "table.set_position(table_id, position) → void",
		returns: "void",
		type: "function",
		category: "",
		example: "",
	},
	"ticker.heikinashi": {
		description:
			"Creates a ticker identifier for requesting Heikin Ashi bar values.",
		syntax: "ticker.heikinashi(symbol) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ticker.heikinashi", overlay=true)heikinashi_close = request.security(ticker.heikinashi(syminfo.tickerid), timeframe.period, close)heikinashi_aapl_60_close = request.security(ticker.heikinashi("AAPL"), "60", close)plot(heikinashi_close)plot(heikinashi_aapl_60_close)',
	},
	"ticker.inherit": {
		description:
			"Constructs a ticker ID for the specified symbol with additional parameters inherited from the ticker ID passed into the function call, allowing the script to request a symbol's data using the same modifiers that the from_tickerid has, including extended session, dividend adjustment, currency conversion, non-standard chart types, back-adjustment, settlement-as-close, etc.",
		syntax: "ticker.inherit(from_tickerid, symbol) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ticker.inherit")//@variable A "NASDAQ:AAPL" ticker ID with Extender Hours enabled.tickerExtHours = ticker.new("NASDAQ", "AAPL", session.extended)//@variable A Heikin Ashi ticker ID for "NASDAQ:AAPL" with Extended Hours enabled.HAtickerExtHours = ticker.heikinashi(tickerExtHours)//@variable The "NASDAQ:MSFT" symbol with no modifiers.testSymbol = "NASDAQ:MSFT"//@variable A ticker ID for "NASDAQ:MSFT" with inherited Heikin Ashi and Extended Hours modifiers.testSymbolHAtickerExtHours = ticker.inherit(HAtickerExtHours, testSymbol)//@variable The `close` price requested using "NASDAQ:MSFT" with inherited modifiers.secData = request.security(testSymbolHAtickerExtHours, "60", close, ignore_invalid_symbol = true)//@variable The `close` price requested using "NASDAQ:MSFT" without modifiers.compareData = request.security(testSymbol, "60", close, ignore_invalid_symbol = true)plot(secData, color = color.green)plot(compareData)',
	},
	"ticker.kagi": {
		description: "Creates a ticker identifier for requesting Kagi values.",
		syntax: "ticker.kagi(symbol, reversal) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ticker.kagi", overlay=true)kagi_tickerid = ticker.kagi(syminfo.tickerid, 3)kagi_close = request.security(kagi_tickerid, timeframe.period, close)plot(kagi_close)',
	},
	"ticker.linebreak": {
		description:
			"Creates a ticker identifier for requesting Line Break values.",
		syntax: "ticker.linebreak(symbol, number_of_lines) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ticker.linebreak", overlay=true)linebreak_tickerid = ticker.linebreak(syminfo.tickerid, 3)linebreak_close = request.security(linebreak_tickerid, timeframe.period, close)plot(linebreak_close)',
	},
	"ticker.modify": {
		description:
			"Creates a ticker identifier for requesting additional data for the script.",
		syntax:
			"ticker.modify(tickerid, session, adjustment, backadjustment, settlement_as_close) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ticker_modify", overlay=true)t1 = ticker.new(syminfo.prefix, syminfo.ticker, session.regular, adjustment.splits)c1 = request.security(t1, "D", close)t2 = ticker.modify(t1, session.extended)c2 = request.security(t2, "2D", close)plot(c1)plot(c2)',
	},
	"ticker.new": {
		description:
			"Creates a ticker identifier for requesting additional data for the script.",
		syntax:
			"ticker.new(prefix, ticker, session, adjustment, backadjustment, settlement_as_close) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ticker.new", overlay=true)t = ticker.new(syminfo.prefix, syminfo.ticker, session.regular, adjustment.splits)t2 = ticker.heikinashi(t)c = request.security(t2, timeframe.period, low, barmerge.gaps_on)plot(c, style=plot.style_linebr)',
	},
	"ticker.pointfigure": {
		description:
			"Creates a ticker identifier for requesting Point & Figure values.",
		syntax:
			"ticker.pointfigure(symbol, source, style, param, reversal) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ticker.pointfigure", overlay=true)pnf_tickerid = ticker.pointfigure(syminfo.tickerid, "hl", "Traditional", 1, 3)pnf_close = request.security(pnf_tickerid, timeframe.period, close)plot(pnf_close)',
	},
	"ticker.renko": {
		description: "Creates a ticker identifier for requesting Renko values.",
		syntax:
			"ticker.renko(symbol, style, param, request_wicks, source) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ticker.renko", overlay=true)renko_tickerid = ticker.renko(syminfo.tickerid, "ATR", 10)renko_close = request.security(renko_tickerid, timeframe.period, close)plot(renko_close)',
	},
	"ticker.standard": {
		description:
			"Creates a ticker to request data from a standard chart that is unaffected by modifiers like extended session, dividend adjustment, currency conversion, and the calculations of non-standard chart types: Heikin Ashi, Renko, etc. Among other things, this makes it possible to retrieve standard chart values when the script is running on a non-standard chart.",
		syntax: "ticker.standard(symbol) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("ticker.standard", overlay = true)// This script should be run on a non-standard chart such as HA, Renko...// Requests data from the chart type the script is running on.chartTypeValue = request.security(syminfo.tickerid, "1D", close)// Request data from the standard chart type, regardless of the chart type the script is running on.standardChartValue = request.security(ticker.standard(syminfo.tickerid), "1D", close)// This will not use a standard ticker ID because the `symbol` argument contains only the ticker — not the prefix (exchange).standardChartValue2 = request.security(ticker.standard(syminfo.ticker), "1D", close)plot(chartTypeValue)plot(standardChartValue, color = color.green)',
	},
	time: {
		description:
			"Returns the opening UNIX timestamp for the specified timeframe and session, or na if the time point is outside the session.",
		syntax:
			"time(timeframe, session, bars_back, timeframe_bars_back) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Time", overlay=true)// Try this on chart AAPL,1timeinrange(res, sess) => not na(time(res, sess, "America/New_York")) ? 1 : 0plot(timeinrange("1", "1300-1400"), color=color.red)// This plots 1.0 at every start of 10 minute bar on a 1 minute chart:newbar(res) => ta.change(time(res)) == 0 ? 0 : 1plot(newbar("10"))',
	},
	time_close: {
		description:
			"Returns the closing UNIX timestamp for the specified timeframe and session, or na if the time point is outside the session. On tick charts and price-based charts such as Renko, line break, Kagi, point & figure, and range, the function returns na on the latest realtime bar because the future closing time is unpredictable. However, it returns a valid timestamp for any previous bar.",
		syntax:
			"time_close(timeframe, session, bars_back, timeframe_bars_back) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("Time", overlay=true)t1 = time_close(timeframe.period, "1200-1300", "America/New_York")bgcolor(not na(t1) ? color.new(color.blue, 90) : na)',
	},
	"timeframe.change": {
		description: "Detects changes in the specified timeframe.",
		syntax: "timeframe.change(timeframe) → series bool",
		returns: "series bool",
		type: "function",
		category: "",
		example:
			'//@version=6// Run this script on an intraday chart.indicator("New day started", overlay = true)// Highlights the first bar of the new day.isNewDay = timeframe.change("1D")bgcolor(isNewDay ? color.new(color.green, 80) : na)',
	},
	"timeframe.from_seconds": {
		description: "Converts a number of seconds into a valid timeframe string.",
		syntax: "timeframe.from_seconds(seconds) → simple string",
		returns: "simple string",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("HTF Close", "", true)int chartTf = timeframe.in_seconds()string tfTimes5 = timeframe.from_seconds(chartTf * 5)float htfClose = request.security(syminfo.tickerid, tfTimes5, close)plot(htfClose)',
	},
	"timeframe.in_seconds": {
		description: "Converts a timeframe string into seconds.",
		syntax: "timeframe.in_seconds(timeframe) → simple int",
		returns: "simple int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("`timeframe_in_seconds()`"),// Get a user-selected timeframe.tfInput = input.timeframe("1D")// Convert it into an "int" number of seconds.secondsInTf = timeframe.in_seconds(tfInput)plot(secondsInTf)',
	},
	timestamp: {
		description:
			"Function timestamp returns UNIX time of specified date and time.",
		syntax: "timestamp(dateString) → const int",
		returns: "const int",
		type: "function",
		category: "",
		example:
			'//@version=6indicator("timestamp")plot(timestamp(2016, 01, 19, 09, 30), linewidth=3, color=color.green)plot(timestamp(syminfo.timezone, 2016, 01, 19, 09, 30), color=color.blue)plot(timestamp(2016, 01, 19, 09, 30), color=color.yellow)plot(timestamp("GMT+6", 2016, 01, 19, 09, 30))plot(timestamp(2019, 06, 19, 09, 30, 15), color=color.lime)plot(timestamp("GMT+3", 2019, 06, 19, 09, 30, 15), color=color.fuchsia)plot(timestamp("Feb 01 2020 22:10:05"))plot(timestamp("2011-10-10T14:48:00"))plot(timestamp("04 Dec 1995 00:12:00 GMT+5"))',
	},
	weekofyear: {
		description:
			"Calculates the week number of the year, in a specified time zone, from a UNIX timestamp.",
		syntax: "weekofyear(time, timezone) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
	year: {
		description: "",
		syntax: "year(time, timezone) → series int",
		returns: "series int",
		type: "function",
		category: "",
		example: "",
	},
};
