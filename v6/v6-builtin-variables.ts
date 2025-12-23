/**
 * Pine Script v6 Built-in Variables with Types
 * Auto-generated with inferred types
 * Generated: 2025-12-23T15:57:09.413Z
 */

export const V6_BUILTIN_VARIABLES: Record<string, string> = {
	ask: "series<float>",
	bar_index: "series<int>",
	bid: "series<float>",
	close: "series<float>",
	dayofmonth: "series<int>",
	dayofweek: "series<int>",
	high: "series<float>",
	hl2: "series<float>",
	hlc3: "series<float>",
	hlcc4: "series<float>",
	hour: "series<int>",
	last_bar_index: "series<int>",
	last_bar_time: "series<int>",
	low: "series<float>",
	minute: "series<int>",
	month: "series<int>",
	na: "na",
	ohlc4: "series<float>",
	open: "series<float>",
	second: "series<int>",
	time: "series<int>",
	time_close: "series<int>",
	time_tradingday: "series<int>",
	timenow: "series<int>",
	volume: "series<float>",
	weekofyear: "series<int>",
	year: "series<int>",
};

// Categorized for quick lookups
export const SERIES_FLOAT_VARS = new Set([
	"ask",
	"bid",
	"close",
	"high",
	"hl2",
	"hlc3",
	"hlcc4",
	"low",
	"ohlc4",
	"open",
	"volume",
]);

export const SERIES_INT_VARS = new Set([
	"bar_index",
	"dayofmonth",
	"dayofweek",
	"hour",
	"last_bar_index",
	"last_bar_time",
	"minute",
	"month",
	"second",
	"time",
	"time_close",
	"time_tradingday",
	"timenow",
	"weekofyear",
	"year",
]);

export const SERIES_BOOL_VARS = new Set([]);

export const SERIES_STRING_VARS = new Set([]);
