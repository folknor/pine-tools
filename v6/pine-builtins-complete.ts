/**
 * Complete Pine Script v6 Built-in Variables
 * Auto-generated from official TradingView Pine Script v6 Reference
 * Source: https://www.tradingview.com/pine-script-reference/v6/
 *
 * Total: 27 standalone + 15 variable namespaces
 * Generated: 2025-12-23
 */

//──────────────────────────────────────────────────────────
// STANDALONE BUILT-IN VARIABLES (27)
//──────────────────────────────────────────────────────────
export const STANDALONE_BUILTINS = new Set([
	"ask",
	"bar_index",
	"bid",
	"close",
	"dayofmonth",
	"dayofweek",
	"high",
	"hl2",
	"hlc3",
	"hlcc4",
	"hour",
	"last_bar_index",
	"last_bar_time",
	"low",
	"minute",
	"month",
	"na",
	"ohlc4",
	"open",
	"second",
	"time",
	"time_close",
	"time_tradingday",
	"timenow",
	"volume",
	"weekofyear",
	"year"
]);

//──────────────────────────────────────────────────────────
// BARSTATE_BUILTINS namespace (7 variables)
//──────────────────────────────────────────────────────────
export const BARSTATE_BUILTINS = new Set([
	"isconfirmed",
	"isfirst",
	"ishistory",
	"islast",
	"islastconfirmedhistory",
	"isnew",
	"isrealtime"
]);

//──────────────────────────────────────────────────────────
// CHART_BUILTINS namespace (11 variables)
//──────────────────────────────────────────────────────────
export const CHART_BUILTINS = new Set([
	"bg_color",
	"fg_color",
	"is_heikinashi",
	"is_kagi",
	"is_linebreak",
	"is_pnf",
	"is_range",
	"is_renko",
	"is_standard",
	"left_visible_bar_time",
	"right_visible_bar_time"
]);

//──────────────────────────────────────────────────────────
// DIVIDENDS_BUILTINS namespace (3 variables)
//──────────────────────────────────────────────────────────
export const DIVIDENDS_BUILTINS = new Set([
	"future_amount",
	"future_ex_date",
	"future_pay_date"
]);

//──────────────────────────────────────────────────────────
// EARNINGS_BUILTINS namespace (4 variables)
//──────────────────────────────────────────────────────────
export const EARNINGS_BUILTINS = new Set([
	"future_eps",
	"future_period_end_time",
	"future_revenue",
	"future_time"
]);

//──────────────────────────────────────────────────────────
// LABEL_BUILTINS namespace (1 variables)
//──────────────────────────────────────────────────────────
export const LABEL_BUILTINS = new Set([
	"all"
]);

//──────────────────────────────────────────────────────────
// LINE_BUILTINS namespace (1 variables)
//──────────────────────────────────────────────────────────
export const LINE_BUILTINS = new Set([
	"all"
]);

//──────────────────────────────────────────────────────────
// LINEFILL_BUILTINS namespace (1 variables)
//──────────────────────────────────────────────────────────
export const LINEFILL_BUILTINS = new Set([
	"all"
]);

//──────────────────────────────────────────────────────────
// POLYLINE_BUILTINS namespace (1 variables)
//──────────────────────────────────────────────────────────
export const POLYLINE_BUILTINS = new Set([
	"all"
]);

//──────────────────────────────────────────────────────────
// REQUEST_BUILTINS namespace (2 variables)
//──────────────────────────────────────────────────────────
export const REQUEST_BUILTINS = new Set([
	"security",
	"security_lower_tf"
]);

//──────────────────────────────────────────────────────────
// SESSION_BUILTINS namespace (7 variables)
//──────────────────────────────────────────────────────────
export const SESSION_BUILTINS = new Set([
	"isfirstbar",
	"isfirstbar_regular",
	"islastbar",
	"islastbar_regular",
	"ismarket",
	"ispostmarket",
	"ispremarket"
]);

//──────────────────────────────────────────────────────────
// STRATEGY_BUILTINS namespace (35 variables)
//──────────────────────────────────────────────────────────
export const STRATEGY_BUILTINS = new Set([
	"account_currency",
	"avg_losing_trade",
	"avg_losing_trade_percent",
	"avg_trade",
	"avg_trade_percent",
	"avg_winning_trade",
	"avg_winning_trade_percent",
	"closedtrades",
	"closedtrades.first_index",
	"equity",
	"eventrades",
	"grossloss",
	"grossloss_percent",
	"grossprofit",
	"grossprofit_percent",
	"initial_capital",
	"losstrades",
	"margin_liquidation_price",
	"max_contracts_held_all",
	"max_contracts_held_long",
	"max_contracts_held_short",
	"max_drawdown",
	"max_drawdown_percent",
	"max_runup",
	"max_runup_percent",
	"netprofit",
	"netprofit_percent",
	"openprofit",
	"openprofit_percent",
	"opentrades",
	"opentrades.capital_held",
	"position_avg_price",
	"position_entry_name",
	"position_size",
	"wintrades"
]);

//──────────────────────────────────────────────────────────
// SYMINFO_BUILTINS namespace (40 variables)
//──────────────────────────────────────────────────────────
export const SYMINFO_BUILTINS = new Set([
	"basecurrency",
	"country",
	"currency",
	"current_contract",
	"description",
	"employees",
	"expiration_date",
	"industry",
	"isin",
	"main_tickerid",
	"mincontract",
	"minmove",
	"mintick",
	"pointvalue",
	"prefix",
	"pricescale",
	"recommendations_buy",
	"recommendations_buy_strong",
	"recommendations_date",
	"recommendations_hold",
	"recommendations_sell",
	"recommendations_sell_strong",
	"recommendations_total",
	"root",
	"sector",
	"session",
	"shareholders",
	"shares_outstanding_float",
	"shares_outstanding_total",
	"target_price_average",
	"target_price_date",
	"target_price_estimates",
	"target_price_high",
	"target_price_low",
	"target_price_median",
	"ticker",
	"tickerid",
	"timezone",
	"type",
	"volumetype"
]);

//──────────────────────────────────────────────────────────
// TA_BUILTINS namespace (10 variables)
//──────────────────────────────────────────────────────────
export const TA_BUILTINS = new Set([
	"accdist",
	"iii",
	"nvi",
	"obv",
	"pvi",
	"pvt",
	"tr",
	"vwap",
	"wad",
	"wvad"
]);

//──────────────────────────────────────────────────────────
// TABLE_BUILTINS namespace (1 variables)
//──────────────────────────────────────────────────────────
export const TABLE_BUILTINS = new Set([
	"all"
]);

//──────────────────────────────────────────────────────────
// TIMEFRAME_BUILTINS namespace (11 variables)
//──────────────────────────────────────────────────────────
export const TIMEFRAME_BUILTINS = new Set([
	"isdaily",
	"isdwm",
	"isintraday",
	"isminutes",
	"ismonthly",
	"isseconds",
	"isticks",
	"isweekly",
	"main_period",
	"multiplier",
	"period"
]);

