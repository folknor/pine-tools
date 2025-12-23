// Pine Script v6 Complete API Reference
// Generated: 2025-12-23T15:21:44.772Z
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
 "ask": {
  "description": "Built-in variable: ask",
  "type": "variable",
  "category": "built-in"
 },
 "bar_index": {
  "description": "Built-in variable: bar_index",
  "type": "variable",
  "category": "built-in"
 },
 "bid": {
  "description": "Built-in variable: bid",
  "type": "variable",
  "category": "built-in"
 },
 "close": {
  "description": "Built-in variable: close",
  "type": "variable",
  "category": "built-in"
 },
 "dayofmonth": {
  "description": "Built-in variable: dayofmonth",
  "type": "variable",
  "category": "built-in"
 },
 "dayofweek": {
  "description": "Built-in variable: dayofweek",
  "type": "variable",
  "category": "built-in"
 },
 "high": {
  "description": "Built-in variable: high",
  "type": "variable",
  "category": "built-in"
 },
 "hl2": {
  "description": "Built-in variable: hl2",
  "type": "variable",
  "category": "built-in"
 },
 "hlc3": {
  "description": "Built-in variable: hlc3",
  "type": "variable",
  "category": "built-in"
 },
 "hlcc4": {
  "description": "Built-in variable: hlcc4",
  "type": "variable",
  "category": "built-in"
 },
 "hour": {
  "description": "Built-in variable: hour",
  "type": "variable",
  "category": "built-in"
 },
 "last_bar_index": {
  "description": "Built-in variable: last_bar_index",
  "type": "variable",
  "category": "built-in"
 },
 "last_bar_time": {
  "description": "Built-in variable: last_bar_time",
  "type": "variable",
  "category": "built-in"
 },
 "low": {
  "description": "Built-in variable: low",
  "type": "variable",
  "category": "built-in"
 },
 "minute": {
  "description": "Built-in variable: minute",
  "type": "variable",
  "category": "built-in"
 },
 "month": {
  "description": "Built-in variable: month",
  "type": "variable",
  "category": "built-in"
 },
 "na": {
  "description": "Built-in variable: na",
  "type": "variable",
  "category": "built-in"
 },
 "ohlc4": {
  "description": "Built-in variable: ohlc4",
  "type": "variable",
  "category": "built-in"
 },
 "open": {
  "description": "Built-in variable: open",
  "type": "variable",
  "category": "built-in"
 },
 "second": {
  "description": "Built-in variable: second",
  "type": "variable",
  "category": "built-in"
 },
 "time": {
  "description": "Built-in variable: time",
  "type": "variable",
  "category": "built-in"
 },
 "time_close": {
  "description": "Built-in variable: time_close",
  "type": "variable",
  "category": "built-in"
 },
 "time_tradingday": {
  "description": "Built-in variable: time_tradingday",
  "type": "variable",
  "category": "built-in"
 },
 "timenow": {
  "description": "Built-in variable: timenow",
  "type": "variable",
  "category": "built-in"
 },
 "volume": {
  "description": "Built-in variable: volume",
  "type": "variable",
  "category": "built-in"
 },
 "weekofyear": {
  "description": "Built-in variable: weekofyear",
  "type": "variable",
  "category": "built-in"
 },
 "year": {
  "description": "Built-in variable: year",
  "type": "variable",
  "category": "built-in"
 },
 "barstate.isconfirmed": {
  "description": "Built-in variable: barstate.isconfirmed",
  "type": "variable",
  "category": "built-in"
 },
 "barstate.isfirst": {
  "description": "Built-in variable: barstate.isfirst",
  "type": "variable",
  "category": "built-in"
 },
 "barstate.ishistory": {
  "description": "Built-in variable: barstate.ishistory",
  "type": "variable",
  "category": "built-in"
 },
 "barstate.islast": {
  "description": "Built-in variable: barstate.islast",
  "type": "variable",
  "category": "built-in"
 },
 "barstate.islastconfirmedhistory": {
  "description": "Built-in variable: barstate.islastconfirmedhistory",
  "type": "variable",
  "category": "built-in"
 },
 "barstate.isnew": {
  "description": "Built-in variable: barstate.isnew",
  "type": "variable",
  "category": "built-in"
 },
 "barstate.isrealtime": {
  "description": "Built-in variable: barstate.isrealtime",
  "type": "variable",
  "category": "built-in"
 },
 "chart.bg_color": {
  "description": "Built-in variable: chart.bg_color",
  "type": "variable",
  "category": "built-in"
 },
 "chart.fg_color": {
  "description": "Built-in variable: chart.fg_color",
  "type": "variable",
  "category": "built-in"
 },
 "chart.is_heikinashi": {
  "description": "Built-in variable: chart.is_heikinashi",
  "type": "variable",
  "category": "built-in"
 },
 "chart.is_kagi": {
  "description": "Built-in variable: chart.is_kagi",
  "type": "variable",
  "category": "built-in"
 },
 "chart.is_linebreak": {
  "description": "Built-in variable: chart.is_linebreak",
  "type": "variable",
  "category": "built-in"
 },
 "chart.is_pnf": {
  "description": "Built-in variable: chart.is_pnf",
  "type": "variable",
  "category": "built-in"
 },
 "chart.is_range": {
  "description": "Built-in variable: chart.is_range",
  "type": "variable",
  "category": "built-in"
 },
 "chart.is_renko": {
  "description": "Built-in variable: chart.is_renko",
  "type": "variable",
  "category": "built-in"
 },
 "chart.is_standard": {
  "description": "Built-in variable: chart.is_standard",
  "type": "variable",
  "category": "built-in"
 },
 "chart.left_visible_bar_time": {
  "description": "Built-in variable: chart.left_visible_bar_time",
  "type": "variable",
  "category": "built-in"
 },
 "chart.right_visible_bar_time": {
  "description": "Built-in variable: chart.right_visible_bar_time",
  "type": "variable",
  "category": "built-in"
 },
 "dividends.future_amount": {
  "description": "Built-in variable: dividends.future_amount",
  "type": "variable",
  "category": "built-in"
 },
 "dividends.future_ex_date": {
  "description": "Built-in variable: dividends.future_ex_date",
  "type": "variable",
  "category": "built-in"
 },
 "dividends.future_pay_date": {
  "description": "Built-in variable: dividends.future_pay_date",
  "type": "variable",
  "category": "built-in"
 },
 "earnings.future_eps": {
  "description": "Built-in variable: earnings.future_eps",
  "type": "variable",
  "category": "built-in"
 },
 "earnings.future_period_end_time": {
  "description": "Built-in variable: earnings.future_period_end_time",
  "type": "variable",
  "category": "built-in"
 },
 "earnings.future_revenue": {
  "description": "Built-in variable: earnings.future_revenue",
  "type": "variable",
  "category": "built-in"
 },
 "earnings.future_time": {
  "description": "Built-in variable: earnings.future_time",
  "type": "variable",
  "category": "built-in"
 },
 "label.all": {
  "description": "Built-in variable: label.all",
  "type": "variable",
  "category": "built-in"
 },
 "line.all": {
  "description": "Built-in variable: line.all",
  "type": "variable",
  "category": "built-in"
 },
 "linefill.all": {
  "description": "Built-in variable: linefill.all",
  "type": "variable",
  "category": "built-in"
 },
 "polyline.all": {
  "description": "Built-in variable: polyline.all",
  "type": "variable",
  "category": "built-in"
 },
 "request.security": {
  "description": "Built-in variable: request.security",
  "type": "variable",
  "category": "built-in"
 },
 "request.security_lower_tf": {
  "description": "Built-in variable: request.security_lower_tf",
  "type": "variable",
  "category": "built-in"
 },
 "session.isfirstbar": {
  "description": "Built-in variable: session.isfirstbar",
  "type": "variable",
  "category": "built-in"
 },
 "session.isfirstbar_regular": {
  "description": "Built-in variable: session.isfirstbar_regular",
  "type": "variable",
  "category": "built-in"
 },
 "session.islastbar": {
  "description": "Built-in variable: session.islastbar",
  "type": "variable",
  "category": "built-in"
 },
 "session.islastbar_regular": {
  "description": "Built-in variable: session.islastbar_regular",
  "type": "variable",
  "category": "built-in"
 },
 "session.ismarket": {
  "description": "Built-in variable: session.ismarket",
  "type": "variable",
  "category": "built-in"
 },
 "session.ispostmarket": {
  "description": "Built-in variable: session.ispostmarket",
  "type": "variable",
  "category": "built-in"
 },
 "session.ispremarket": {
  "description": "Built-in variable: session.ispremarket",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.account_currency": {
  "description": "Built-in variable: strategy.account_currency",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.avg_losing_trade": {
  "description": "Built-in variable: strategy.avg_losing_trade",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.avg_losing_trade_percent": {
  "description": "Built-in variable: strategy.avg_losing_trade_percent",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.avg_trade": {
  "description": "Built-in variable: strategy.avg_trade",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.avg_trade_percent": {
  "description": "Built-in variable: strategy.avg_trade_percent",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.avg_winning_trade": {
  "description": "Built-in variable: strategy.avg_winning_trade",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.avg_winning_trade_percent": {
  "description": "Built-in variable: strategy.avg_winning_trade_percent",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.closedtrades": {
  "description": "Built-in variable: strategy.closedtrades",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.closedtrades.first_index": {
  "description": "Built-in variable: strategy.closedtrades.first_index",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.equity": {
  "description": "Built-in variable: strategy.equity",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.eventrades": {
  "description": "Built-in variable: strategy.eventrades",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.grossloss": {
  "description": "Built-in variable: strategy.grossloss",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.grossloss_percent": {
  "description": "Built-in variable: strategy.grossloss_percent",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.grossprofit": {
  "description": "Built-in variable: strategy.grossprofit",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.grossprofit_percent": {
  "description": "Built-in variable: strategy.grossprofit_percent",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.initial_capital": {
  "description": "Built-in variable: strategy.initial_capital",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.losstrades": {
  "description": "Built-in variable: strategy.losstrades",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.margin_liquidation_price": {
  "description": "Built-in variable: strategy.margin_liquidation_price",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.max_contracts_held_all": {
  "description": "Built-in variable: strategy.max_contracts_held_all",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.max_contracts_held_long": {
  "description": "Built-in variable: strategy.max_contracts_held_long",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.max_contracts_held_short": {
  "description": "Built-in variable: strategy.max_contracts_held_short",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.max_drawdown": {
  "description": "Built-in variable: strategy.max_drawdown",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.max_drawdown_percent": {
  "description": "Built-in variable: strategy.max_drawdown_percent",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.max_runup": {
  "description": "Built-in variable: strategy.max_runup",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.max_runup_percent": {
  "description": "Built-in variable: strategy.max_runup_percent",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.netprofit": {
  "description": "Built-in variable: strategy.netprofit",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.netprofit_percent": {
  "description": "Built-in variable: strategy.netprofit_percent",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.openprofit": {
  "description": "Built-in variable: strategy.openprofit",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.openprofit_percent": {
  "description": "Built-in variable: strategy.openprofit_percent",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.opentrades": {
  "description": "Built-in variable: strategy.opentrades",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.opentrades.capital_held": {
  "description": "Built-in variable: strategy.opentrades.capital_held",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.position_avg_price": {
  "description": "Built-in variable: strategy.position_avg_price",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.position_entry_name": {
  "description": "Built-in variable: strategy.position_entry_name",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.position_size": {
  "description": "Built-in variable: strategy.position_size",
  "type": "variable",
  "category": "built-in"
 },
 "strategy.wintrades": {
  "description": "Built-in variable: strategy.wintrades",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.basecurrency": {
  "description": "Built-in variable: syminfo.basecurrency",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.country": {
  "description": "Built-in variable: syminfo.country",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.currency": {
  "description": "Built-in variable: syminfo.currency",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.current_contract": {
  "description": "Built-in variable: syminfo.current_contract",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.description": {
  "description": "Built-in variable: syminfo.description",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.employees": {
  "description": "Built-in variable: syminfo.employees",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.expiration_date": {
  "description": "Built-in variable: syminfo.expiration_date",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.industry": {
  "description": "Built-in variable: syminfo.industry",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.isin": {
  "description": "Built-in variable: syminfo.isin",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.main_tickerid": {
  "description": "Built-in variable: syminfo.main_tickerid",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.mincontract": {
  "description": "Built-in variable: syminfo.mincontract",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.minmove": {
  "description": "Built-in variable: syminfo.minmove",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.mintick": {
  "description": "Built-in variable: syminfo.mintick",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.pointvalue": {
  "description": "Built-in variable: syminfo.pointvalue",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.prefix": {
  "description": "Built-in variable: syminfo.prefix",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.pricescale": {
  "description": "Built-in variable: syminfo.pricescale",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.recommendations_buy": {
  "description": "Built-in variable: syminfo.recommendations_buy",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.recommendations_buy_strong": {
  "description": "Built-in variable: syminfo.recommendations_buy_strong",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.recommendations_date": {
  "description": "Built-in variable: syminfo.recommendations_date",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.recommendations_hold": {
  "description": "Built-in variable: syminfo.recommendations_hold",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.recommendations_sell": {
  "description": "Built-in variable: syminfo.recommendations_sell",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.recommendations_sell_strong": {
  "description": "Built-in variable: syminfo.recommendations_sell_strong",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.recommendations_total": {
  "description": "Built-in variable: syminfo.recommendations_total",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.root": {
  "description": "Built-in variable: syminfo.root",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.sector": {
  "description": "Built-in variable: syminfo.sector",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.session": {
  "description": "Built-in variable: syminfo.session",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.shareholders": {
  "description": "Built-in variable: syminfo.shareholders",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.shares_outstanding_float": {
  "description": "Built-in variable: syminfo.shares_outstanding_float",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.shares_outstanding_total": {
  "description": "Built-in variable: syminfo.shares_outstanding_total",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.target_price_average": {
  "description": "Built-in variable: syminfo.target_price_average",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.target_price_date": {
  "description": "Built-in variable: syminfo.target_price_date",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.target_price_estimates": {
  "description": "Built-in variable: syminfo.target_price_estimates",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.target_price_high": {
  "description": "Built-in variable: syminfo.target_price_high",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.target_price_low": {
  "description": "Built-in variable: syminfo.target_price_low",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.target_price_median": {
  "description": "Built-in variable: syminfo.target_price_median",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.ticker": {
  "description": "Built-in variable: syminfo.ticker",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.tickerid": {
  "description": "Built-in variable: syminfo.tickerid",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.timezone": {
  "description": "Built-in variable: syminfo.timezone",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.type": {
  "description": "Built-in variable: syminfo.type",
  "type": "variable",
  "category": "built-in"
 },
 "syminfo.volumetype": {
  "description": "Built-in variable: syminfo.volumetype",
  "type": "variable",
  "category": "built-in"
 },
 "ta.accdist": {
  "description": "Built-in variable: ta.accdist",
  "type": "variable",
  "category": "built-in"
 },
 "ta.iii": {
  "description": "Built-in variable: ta.iii",
  "type": "variable",
  "category": "built-in"
 },
 "ta.nvi": {
  "description": "Built-in variable: ta.nvi",
  "type": "variable",
  "category": "built-in"
 },
 "ta.obv": {
  "description": "Built-in variable: ta.obv",
  "type": "variable",
  "category": "built-in"
 },
 "ta.pvi": {
  "description": "Built-in variable: ta.pvi",
  "type": "variable",
  "category": "built-in"
 },
 "ta.pvt": {
  "description": "Built-in variable: ta.pvt",
  "type": "variable",
  "category": "built-in"
 },
 "ta.tr": {
  "description": "Built-in variable: ta.tr",
  "type": "variable",
  "category": "built-in"
 },
 "ta.vwap": {
  "description": "Built-in variable: ta.vwap",
  "type": "variable",
  "category": "built-in"
 },
 "ta.wad": {
  "description": "Built-in variable: ta.wad",
  "type": "variable",
  "category": "built-in"
 },
 "ta.wvad": {
  "description": "Built-in variable: ta.wvad",
  "type": "variable",
  "category": "built-in"
 },
 "table.all": {
  "description": "Built-in variable: table.all",
  "type": "variable",
  "category": "built-in"
 },
 "timeframe.isdaily": {
  "description": "Built-in variable: timeframe.isdaily",
  "type": "variable",
  "category": "built-in"
 },
 "timeframe.isdwm": {
  "description": "Built-in variable: timeframe.isdwm",
  "type": "variable",
  "category": "built-in"
 },
 "timeframe.isintraday": {
  "description": "Built-in variable: timeframe.isintraday",
  "type": "variable",
  "category": "built-in"
 },
 "timeframe.isminutes": {
  "description": "Built-in variable: timeframe.isminutes",
  "type": "variable",
  "category": "built-in"
 },
 "timeframe.ismonthly": {
  "description": "Built-in variable: timeframe.ismonthly",
  "type": "variable",
  "category": "built-in"
 },
 "timeframe.isseconds": {
  "description": "Built-in variable: timeframe.isseconds",
  "type": "variable",
  "category": "built-in"
 },
 "timeframe.isticks": {
  "description": "Built-in variable: timeframe.isticks",
  "type": "variable",
  "category": "built-in"
 },
 "timeframe.isweekly": {
  "description": "Built-in variable: timeframe.isweekly",
  "type": "variable",
  "category": "built-in"
 },
 "timeframe.main_period": {
  "description": "Built-in variable: timeframe.main_period",
  "type": "variable",
  "category": "built-in"
 },
 "timeframe.multiplier": {
  "description": "Built-in variable: timeframe.multiplier",
  "type": "variable",
  "category": "built-in"
 },
 "timeframe.period": {
  "description": "Built-in variable: timeframe.period",
  "type": "variable",
  "category": "built-in"
 }
};

export const V6_FUNCTIONS: Record<string, PineItem> = {
 "alert.alert": {
  "description": "Pine Script v6 function: alert.alert",
  "syntax": "alert.alert()",
  "returns": "unknown",
  "type": "function",
  "category": "alert",
  "example": ""
 },
 "alert.alertcondition": {
  "description": "Pine Script v6 function: alert.alertcondition",
  "syntax": "alert.alertcondition()",
  "returns": "unknown",
  "type": "function",
  "category": "alert",
  "example": ""
 },
 "array.abs": {
  "description": "Pine Script v6 function: array.abs",
  "syntax": "array.abs()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.avg": {
  "description": "Pine Script v6 function: array.avg",
  "syntax": "array.avg()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.binary_search": {
  "description": "Pine Script v6 function: array.binary_search",
  "syntax": "array.binary_search()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.binary_search_leftmost": {
  "description": "Pine Script v6 function: array.binary_search_leftmost",
  "syntax": "array.binary_search_leftmost()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.binary_search_rightmost": {
  "description": "Pine Script v6 function: array.binary_search_rightmost",
  "syntax": "array.binary_search_rightmost()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.clear": {
  "description": "Pine Script v6 function: array.clear",
  "syntax": "array.clear()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.concat": {
  "description": "Pine Script v6 function: array.concat",
  "syntax": "array.concat()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.copy": {
  "description": "Pine Script v6 function: array.copy",
  "syntax": "array.copy()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.covariance": {
  "description": "Pine Script v6 function: array.covariance",
  "syntax": "array.covariance()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.every": {
  "description": "Pine Script v6 function: array.every",
  "syntax": "array.every()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.fill": {
  "description": "Pine Script v6 function: array.fill",
  "syntax": "array.fill()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.first": {
  "description": "Pine Script v6 function: array.first",
  "syntax": "array.first()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.from": {
  "description": "Pine Script v6 function: array.from",
  "syntax": "array.from()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.get": {
  "description": "The function returns the value of the element at the specified index.",
  "syntax": "array.get(id, index) → series <type>",
  "returns": "series <type>",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"array.get example\")a = array.new_float(0)for i = 0 to 9    array.push(a, close[i] - open[i])plot(array.get(a, 9))"
 },
 "array.includes": {
  "description": "Pine Script v6 function: array.includes",
  "syntax": "array.includes()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.indexof": {
  "description": "Pine Script v6 function: array.indexof",
  "syntax": "array.indexof()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.insert": {
  "description": "Pine Script v6 function: array.insert",
  "syntax": "array.insert()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.join": {
  "description": "Pine Script v6 function: array.join",
  "syntax": "array.join()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.last": {
  "description": "Pine Script v6 function: array.last",
  "syntax": "array.last()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.lastindexof": {
  "description": "Pine Script v6 function: array.lastindexof",
  "syntax": "array.lastindexof()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.max": {
  "description": "Pine Script v6 function: array.max",
  "syntax": "array.max()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.median": {
  "description": "Pine Script v6 function: array.median",
  "syntax": "array.median()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.min": {
  "description": "Pine Script v6 function: array.min",
  "syntax": "array.min()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.mode": {
  "description": "Pine Script v6 function: array.mode",
  "syntax": "array.mode()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.new_bool": {
  "description": "Pine Script v6 function: array.new_bool",
  "syntax": "array.new_bool()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.new_box": {
  "description": "Pine Script v6 function: array.new_box",
  "syntax": "array.new_box()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.new_color": {
  "description": "Pine Script v6 function: array.new_color",
  "syntax": "array.new_color()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.new_float": {
  "description": "Pine Script v6 function: array.new_float",
  "syntax": "array.new_float()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.new_int": {
  "description": "Pine Script v6 function: array.new_int",
  "syntax": "array.new_int()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.new_label": {
  "description": "Pine Script v6 function: array.new_label",
  "syntax": "array.new_label()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.new_line": {
  "description": "Pine Script v6 function: array.new_line",
  "syntax": "array.new_line()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.new_linefill": {
  "description": "Pine Script v6 function: array.new_linefill",
  "syntax": "array.new_linefill()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.new_string": {
  "description": "Pine Script v6 function: array.new_string",
  "syntax": "array.new_string()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.new_table": {
  "description": "Pine Script v6 function: array.new_table",
  "syntax": "array.new_table()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.new": {
  "description": "",
  "syntax": "array.new()",
  "returns": "",
  "type": "function",
  "category": "",
  "example": ""
 },
 "array.percentile_linear_interpolation": {
  "description": "Pine Script v6 function: array.percentile_linear_interpolation",
  "syntax": "array.percentile_linear_interpolation()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.percentile_nearest_rank": {
  "description": "Pine Script v6 function: array.percentile_nearest_rank",
  "syntax": "array.percentile_nearest_rank()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.percentrank": {
  "description": "Pine Script v6 function: array.percentrank",
  "syntax": "array.percentrank()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.pop": {
  "description": "Pine Script v6 function: array.pop",
  "syntax": "array.pop()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.push": {
  "description": "The function appends a value to an array.",
  "syntax": "array.push(id, value) → void",
  "returns": "void",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"array.push example\")a = array.new_float(5, 0)array.push(a, open)plot(array.get(a, 5))"
 },
 "array.range": {
  "description": "Pine Script v6 function: array.range",
  "syntax": "array.range()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.remove": {
  "description": "Pine Script v6 function: array.remove",
  "syntax": "array.remove()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.reverse": {
  "description": "Pine Script v6 function: array.reverse",
  "syntax": "array.reverse()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.set": {
  "description": "Pine Script v6 function: array.set",
  "syntax": "array.set()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.shift": {
  "description": "Pine Script v6 function: array.shift",
  "syntax": "array.shift()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.size": {
  "description": "The function returns the number of elements in an array.",
  "syntax": "array.size(id) → series int",
  "returns": "series int",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"array.size example\")a = array.new_float(0)for i = 0 to 9    array.push(a, close[i])// note that changes in slice also modify original arrayslice = array.slice(a, 0, 5)array.push(slice, open)// size was changed in slice and in original arrayplot(array.size(a))plot(array.size(slice))"
 },
 "array.slice": {
  "description": "Pine Script v6 function: array.slice",
  "syntax": "array.slice()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.some": {
  "description": "Pine Script v6 function: array.some",
  "syntax": "array.some()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.sort": {
  "description": "Pine Script v6 function: array.sort",
  "syntax": "array.sort()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.sort_indices": {
  "description": "Pine Script v6 function: array.sort_indices",
  "syntax": "array.sort_indices()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.standardize": {
  "description": "Pine Script v6 function: array.standardize",
  "syntax": "array.standardize()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.stdev": {
  "description": "Pine Script v6 function: array.stdev",
  "syntax": "array.stdev()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.sum": {
  "description": "Pine Script v6 function: array.sum",
  "syntax": "array.sum()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.unshift": {
  "description": "Pine Script v6 function: array.unshift",
  "syntax": "array.unshift()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "array.variance": {
  "description": "Pine Script v6 function: array.variance",
  "syntax": "array.variance()",
  "returns": "unknown",
  "type": "function",
  "category": "array",
  "example": ""
 },
 "box.copy": {
  "description": "Pine Script v6 function: box.copy",
  "syntax": "box.copy()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.delete": {
  "description": "Pine Script v6 function: box.delete",
  "syntax": "box.delete()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.get_bottom": {
  "description": "Pine Script v6 function: box.get_bottom",
  "syntax": "box.get_bottom()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.get_left": {
  "description": "Pine Script v6 function: box.get_left",
  "syntax": "box.get_left()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.get_right": {
  "description": "Pine Script v6 function: box.get_right",
  "syntax": "box.get_right()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.get_top": {
  "description": "Pine Script v6 function: box.get_top",
  "syntax": "box.get_top()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.new": {
  "description": "Creates a new box object.",
  "syntax": "box.new(top_left, bottom_right, border_color, border_width, border_style, extend, xloc, bgcolor, text, text_size, text_color, text_halign, text_valign, text_wrap, text_font_family, force_overlay, text_formatting) → series box",
  "returns": "series box",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"box.new\")var b = box.new(time, open, time + 60 * 60 * 24, close, xloc=xloc.bar_time, border_style=line.style_dashed)box.set_lefttop(b, time, 100)box.set_rightbottom(b, time + 60 * 60 * 24, 500)box.set_bgcolor(b, color.green)"
 },
 "box.set_bgcolor": {
  "description": "Pine Script v6 function: box.set_bgcolor",
  "syntax": "box.set_bgcolor()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_border_color": {
  "description": "Pine Script v6 function: box.set_border_color",
  "syntax": "box.set_border_color()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_border_style": {
  "description": "Pine Script v6 function: box.set_border_style",
  "syntax": "box.set_border_style()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_border_width": {
  "description": "Pine Script v6 function: box.set_border_width",
  "syntax": "box.set_border_width()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_bottom": {
  "description": "Pine Script v6 function: box.set_bottom",
  "syntax": "box.set_bottom()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_bottom_right_point": {
  "description": "Pine Script v6 function: box.set_bottom_right_point",
  "syntax": "box.set_bottom_right_point()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_extend": {
  "description": "Pine Script v6 function: box.set_extend",
  "syntax": "box.set_extend()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_left": {
  "description": "Pine Script v6 function: box.set_left",
  "syntax": "box.set_left()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_lefttop": {
  "description": "Pine Script v6 function: box.set_lefttop",
  "syntax": "box.set_lefttop()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_right": {
  "description": "Pine Script v6 function: box.set_right",
  "syntax": "box.set_right()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_rightbottom": {
  "description": "Pine Script v6 function: box.set_rightbottom",
  "syntax": "box.set_rightbottom()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_text": {
  "description": "Pine Script v6 function: box.set_text",
  "syntax": "box.set_text()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_text_color": {
  "description": "Pine Script v6 function: box.set_text_color",
  "syntax": "box.set_text_color()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_text_font_family": {
  "description": "Pine Script v6 function: box.set_text_font_family",
  "syntax": "box.set_text_font_family()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_text_formatting": {
  "description": "Pine Script v6 function: box.set_text_formatting",
  "syntax": "box.set_text_formatting()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_text_halign": {
  "description": "Pine Script v6 function: box.set_text_halign",
  "syntax": "box.set_text_halign()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_text_size": {
  "description": "Pine Script v6 function: box.set_text_size",
  "syntax": "box.set_text_size()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_text_valign": {
  "description": "Pine Script v6 function: box.set_text_valign",
  "syntax": "box.set_text_valign()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_text_wrap": {
  "description": "Pine Script v6 function: box.set_text_wrap",
  "syntax": "box.set_text_wrap()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_top": {
  "description": "Pine Script v6 function: box.set_top",
  "syntax": "box.set_top()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_top_left_point": {
  "description": "Pine Script v6 function: box.set_top_left_point",
  "syntax": "box.set_top_left_point()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "box.set_xloc": {
  "description": "Pine Script v6 function: box.set_xloc",
  "syntax": "box.set_xloc()",
  "returns": "unknown",
  "type": "function",
  "category": "box",
  "example": ""
 },
 "chart.point.copy": {
  "description": "Pine Script v6 function: chart.point.copy",
  "syntax": "chart.point.copy()",
  "returns": "unknown",
  "type": "function",
  "category": "chart",
  "example": ""
 },
 "chart.point.from_index": {
  "description": "Pine Script v6 function: chart.point.from_index",
  "syntax": "chart.point.from_index()",
  "returns": "unknown",
  "type": "function",
  "category": "chart",
  "example": ""
 },
 "chart.point.from_time": {
  "description": "Pine Script v6 function: chart.point.from_time",
  "syntax": "chart.point.from_time()",
  "returns": "unknown",
  "type": "function",
  "category": "chart",
  "example": ""
 },
 "chart.point.new": {
  "description": "Pine Script v6 function: chart.point.new",
  "syntax": "chart.point.new()",
  "returns": "unknown",
  "type": "function",
  "category": "chart",
  "example": ""
 },
 "chart.point.now": {
  "description": "Pine Script v6 function: chart.point.now",
  "syntax": "chart.point.now()",
  "returns": "unknown",
  "type": "function",
  "category": "chart",
  "example": ""
 },
 "color.b": {
  "description": "Pine Script v6 function: color.b",
  "syntax": "color.b()",
  "returns": "unknown",
  "type": "function",
  "category": "color",
  "example": ""
 },
 "color.from_gradient": {
  "description": "Pine Script v6 function: color.from_gradient",
  "syntax": "color.from_gradient()",
  "returns": "unknown",
  "type": "function",
  "category": "color",
  "example": ""
 },
 "color.g": {
  "description": "Pine Script v6 function: color.g",
  "syntax": "color.g()",
  "returns": "unknown",
  "type": "function",
  "category": "color",
  "example": ""
 },
 "color.new": {
  "description": "Function color applies the specified transparency to the given color.",
  "syntax": "color.new(color, transp) → const color",
  "returns": "const color",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"color.new\", overlay=true)plot(close, color=color.new(color.red, 50))"
 },
 "color.r": {
  "description": "Pine Script v6 function: color.r",
  "syntax": "color.r()",
  "returns": "unknown",
  "type": "function",
  "category": "color",
  "example": ""
 },
 "color.rgb": {
  "description": "Creates a new color with transparency using the RGB color model.",
  "syntax": "color.rgb(red, green, blue, transp) → const color",
  "returns": "const color",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"color.rgb\", overlay=true)plot(close, color=color.rgb(255, 0, 0, 50))"
 },
 "color.t": {
  "description": "Pine Script v6 function: color.t",
  "syntax": "color.t()",
  "returns": "unknown",
  "type": "function",
  "category": "color",
  "example": ""
 },
 "input.color": {
  "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a color picker that allows the user to select a color and transparency, either from a palette or a hex value.",
  "syntax": "input.color(defval, title, tooltip, inline, group, confirm, display, active) → input color",
  "returns": "input color",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"input.color\", overlay=true)i_col = input.color(color.red, \"Plot Color\")plot(close, color=i_col)"
 },
 "input.enum": {
  "description": "Pine Script v6 function: input.enum",
  "syntax": "input.enum()",
  "returns": "unknown",
  "type": "function",
  "category": "input",
  "example": ""
 },
 "input.float": {
  "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for a float input to the script's inputs.",
  "syntax": "input.float(defval, title, options, tooltip, inline, group, confirm, display, active) → input float",
  "returns": "input float",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"input.float\", overlay=true)i_angle1 = input.float(0.5, \"Sin Angle\", minval=-3.14, maxval=3.14, step=0.02)plot(math.sin(i_angle1) > 0 ? close : open, \"sin\", color=color.green)i_angle2 = input.float(0, \"Cos Angle\", options=[-3.14, -1.57, 0, 1.57, 3.14])plot(math.cos(i_angle2) > 0 ? close : open, \"cos\", color=color.red)"
 },
 "input.int": {
  "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for an integer input to the script's inputs.",
  "syntax": "input.int(defval, title, options, tooltip, inline, group, confirm, display, active) → input int",
  "returns": "input int",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"input.int\", overlay=true)i_len1 = input.int(10, \"Length 1\", minval=5, maxval=21, step=1)plot(ta.sma(close, i_len1))i_len2 = input.int(10, \"Length 2\", options=[5, 10, 21])plot(ta.sma(close, i_len2))"
 },
 "input.price": {
  "description": "Pine Script v6 function: input.price",
  "syntax": "input.price()",
  "returns": "unknown",
  "type": "function",
  "category": "input",
  "example": ""
 },
 "input.session": {
  "description": "Pine Script v6 function: input.session",
  "syntax": "input.session()",
  "returns": "unknown",
  "type": "function",
  "category": "input",
  "example": ""
 },
 "input.source": {
  "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a dropdown that allows the user to select a source for the calculation, e.g. close, hl2, etc. The user can also select an output from another indicator on their chart as the source.",
  "syntax": "input.source(defval, title, tooltip, inline, group, display, active, confirm) → series float",
  "returns": "series float",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"input.source\", overlay=true)i_src = input.source(close, \"Source\")plot(i_src)"
 },
 "input.string": {
  "description": "Adds an input to the Inputs tab of your script's Settings, which allows you to provide configuration options to script users. This function adds a field for a string input to the script's inputs.",
  "syntax": "input.string(defval, title, options, tooltip, inline, group, confirm, display, active) → input string",
  "returns": "input string",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"input.string\", overlay=true)i_text = input.string(\"Hello!\", \"Message\")l = label.new(bar_index, high, i_text)label.delete(l[1])"
 },
 "input.symbol": {
  "description": "Pine Script v6 function: input.symbol",
  "syntax": "input.symbol()",
  "returns": "unknown",
  "type": "function",
  "category": "input",
  "example": ""
 },
 "input.text_area": {
  "description": "Pine Script v6 function: input.text_area",
  "syntax": "input.text_area()",
  "returns": "unknown",
  "type": "function",
  "category": "input",
  "example": ""
 },
 "input.time": {
  "description": "Pine Script v6 function: input.time",
  "syntax": "input.time()",
  "returns": "unknown",
  "type": "function",
  "category": "input",
  "example": ""
 },
 "input.timeframe": {
  "description": "Pine Script v6 function: input.timeframe",
  "syntax": "input.timeframe()",
  "returns": "unknown",
  "type": "function",
  "category": "input",
  "example": ""
 },
 "input.resolution": {
  "description": "Pine Script v6 function: input.resolution",
  "syntax": "input.resolution()",
  "returns": "unknown",
  "type": "function",
  "category": "input",
  "example": ""
 },
 "label.copy": {
  "description": "Pine Script v6 function: label.copy",
  "syntax": "label.copy()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.delete": {
  "description": "Pine Script v6 function: label.delete",
  "syntax": "label.delete()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.get_text": {
  "description": "Pine Script v6 function: label.get_text",
  "syntax": "label.get_text()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.get_x": {
  "description": "Pine Script v6 function: label.get_x",
  "syntax": "label.get_x()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.get_y": {
  "description": "Pine Script v6 function: label.get_y",
  "syntax": "label.get_y()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.new": {
  "description": "Creates new label object.",
  "syntax": "label.new(point, text, xloc, yloc, color, style, textcolor, size, textalign, tooltip, text_font_family, force_overlay, text_formatting) → series label",
  "returns": "series label",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"label.new\")var label1 = label.new(bar_index, low, text=\"Hello, world!\", style=label.style_circle)label.set_x(label1, 0)label.set_xloc(label1, time, xloc.bar_time)label.set_color(label1, color.red)label.set_size(label1, size.large)"
 },
 "label.set_color": {
  "description": "Pine Script v6 function: label.set_color",
  "syntax": "label.set_color()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.set_point": {
  "description": "Pine Script v6 function: label.set_point",
  "syntax": "label.set_point()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.set_size": {
  "description": "Pine Script v6 function: label.set_size",
  "syntax": "label.set_size()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.set_style": {
  "description": "Pine Script v6 function: label.set_style",
  "syntax": "label.set_style()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.set_text": {
  "description": "Pine Script v6 function: label.set_text",
  "syntax": "label.set_text()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.set_text_font_family": {
  "description": "Pine Script v6 function: label.set_text_font_family",
  "syntax": "label.set_text_font_family()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.set_text_formatting": {
  "description": "Pine Script v6 function: label.set_text_formatting",
  "syntax": "label.set_text_formatting()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.set_textalign": {
  "description": "Pine Script v6 function: label.set_textalign",
  "syntax": "label.set_textalign()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.set_textcolor": {
  "description": "Pine Script v6 function: label.set_textcolor",
  "syntax": "label.set_textcolor()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.set_tooltip": {
  "description": "Pine Script v6 function: label.set_tooltip",
  "syntax": "label.set_tooltip()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.set_x": {
  "description": "Pine Script v6 function: label.set_x",
  "syntax": "label.set_x()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.set_xloc": {
  "description": "Pine Script v6 function: label.set_xloc",
  "syntax": "label.set_xloc()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.set_xy": {
  "description": "Pine Script v6 function: label.set_xy",
  "syntax": "label.set_xy()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.set_y": {
  "description": "Pine Script v6 function: label.set_y",
  "syntax": "label.set_y()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "label.set_yloc": {
  "description": "Pine Script v6 function: label.set_yloc",
  "syntax": "label.set_yloc()",
  "returns": "unknown",
  "type": "function",
  "category": "label",
  "example": ""
 },
 "line.copy": {
  "description": "Pine Script v6 function: line.copy",
  "syntax": "line.copy()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.delete": {
  "description": "Pine Script v6 function: line.delete",
  "syntax": "line.delete()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.get_price": {
  "description": "Pine Script v6 function: line.get_price",
  "syntax": "line.get_price()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.get_x1": {
  "description": "Pine Script v6 function: line.get_x1",
  "syntax": "line.get_x1()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.get_x2": {
  "description": "Pine Script v6 function: line.get_x2",
  "syntax": "line.get_x2()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.get_y1": {
  "description": "Pine Script v6 function: line.get_y1",
  "syntax": "line.get_y1()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.get_y2": {
  "description": "Pine Script v6 function: line.get_y2",
  "syntax": "line.get_y2()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.new": {
  "description": "Creates new line object.",
  "syntax": "line.new(first_point, second_point, xloc, extend, color, style, width, force_overlay) → series line",
  "returns": "series line",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"line.new\")var line1 = line.new(0, low, bar_index, high, extend=extend.right)var line2 = line.new(time, open, time + 60 * 60 * 24, close, xloc=xloc.bar_time, style=line.style_dashed)line.set_x2(line1, 0)line.set_xloc(line1, time, time + 60 * 60 * 24, xloc.bar_time)line.set_color(line2, color.green)line.set_width(line2, 5)"
 },
 "line.set_color": {
  "description": "Pine Script v6 function: line.set_color",
  "syntax": "line.set_color()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.set_extend": {
  "description": "Pine Script v6 function: line.set_extend",
  "syntax": "line.set_extend()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.set_first_point": {
  "description": "Pine Script v6 function: line.set_first_point",
  "syntax": "line.set_first_point()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.set_second_point": {
  "description": "Pine Script v6 function: line.set_second_point",
  "syntax": "line.set_second_point()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.set_style": {
  "description": "Pine Script v6 function: line.set_style",
  "syntax": "line.set_style()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.set_width": {
  "description": "Pine Script v6 function: line.set_width",
  "syntax": "line.set_width()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.set_x1": {
  "description": "Pine Script v6 function: line.set_x1",
  "syntax": "line.set_x1()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.set_x2": {
  "description": "Pine Script v6 function: line.set_x2",
  "syntax": "line.set_x2()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.set_xloc": {
  "description": "Pine Script v6 function: line.set_xloc",
  "syntax": "line.set_xloc()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.set_xy1": {
  "description": "Pine Script v6 function: line.set_xy1",
  "syntax": "line.set_xy1()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.set_xy2": {
  "description": "Pine Script v6 function: line.set_xy2",
  "syntax": "line.set_xy2()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.set_y1": {
  "description": "Pine Script v6 function: line.set_y1",
  "syntax": "line.set_y1()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "line.set_y2": {
  "description": "Pine Script v6 function: line.set_y2",
  "syntax": "line.set_y2()",
  "returns": "unknown",
  "type": "function",
  "category": "line",
  "example": ""
 },
 "linefill.delete": {
  "description": "Pine Script v6 function: linefill.delete",
  "syntax": "linefill.delete()",
  "returns": "unknown",
  "type": "function",
  "category": "linefill",
  "example": ""
 },
 "linefill.get_line1": {
  "description": "Pine Script v6 function: linefill.get_line1",
  "syntax": "linefill.get_line1()",
  "returns": "unknown",
  "type": "function",
  "category": "linefill",
  "example": ""
 },
 "linefill.get_line2": {
  "description": "Pine Script v6 function: linefill.get_line2",
  "syntax": "linefill.get_line2()",
  "returns": "unknown",
  "type": "function",
  "category": "linefill",
  "example": ""
 },
 "linefill.new": {
  "description": "Pine Script v6 function: linefill.new",
  "syntax": "linefill.new()",
  "returns": "unknown",
  "type": "function",
  "category": "linefill",
  "example": ""
 },
 "linefill.set_color": {
  "description": "Pine Script v6 function: linefill.set_color",
  "syntax": "linefill.set_color()",
  "returns": "unknown",
  "type": "function",
  "category": "linefill",
  "example": ""
 },
 "log.error": {
  "description": "Pine Script v6 function: log.error",
  "syntax": "log.error()",
  "returns": "unknown",
  "type": "function",
  "category": "log",
  "example": ""
 },
 "log.info": {
  "description": "Pine Script v6 function: log.info",
  "syntax": "log.info()",
  "returns": "unknown",
  "type": "function",
  "category": "log",
  "example": ""
 },
 "log.warning": {
  "description": "Pine Script v6 function: log.warning",
  "syntax": "log.warning()",
  "returns": "unknown",
  "type": "function",
  "category": "log",
  "example": ""
 },
 "map.clear": {
  "description": "Pine Script v6 function: map.clear",
  "syntax": "map.clear()",
  "returns": "unknown",
  "type": "function",
  "category": "map",
  "example": ""
 },
 "map.contains": {
  "description": "Pine Script v6 function: map.contains",
  "syntax": "map.contains()",
  "returns": "unknown",
  "type": "function",
  "category": "map",
  "example": ""
 },
 "map.copy": {
  "description": "Pine Script v6 function: map.copy",
  "syntax": "map.copy()",
  "returns": "unknown",
  "type": "function",
  "category": "map",
  "example": ""
 },
 "map.get": {
  "description": "Pine Script v6 function: map.get",
  "syntax": "map.get()",
  "returns": "unknown",
  "type": "function",
  "category": "map",
  "example": ""
 },
 "map.keys": {
  "description": "Pine Script v6 function: map.keys",
  "syntax": "map.keys()",
  "returns": "unknown",
  "type": "function",
  "category": "map",
  "example": ""
 },
 "map.new": {
  "description": "Pine Script v6 function: map.new",
  "syntax": "map.new()",
  "returns": "unknown",
  "type": "function",
  "category": "map",
  "example": ""
 },
 "map.put": {
  "description": "Pine Script v6 function: map.put",
  "syntax": "map.put()",
  "returns": "unknown",
  "type": "function",
  "category": "map",
  "example": ""
 },
 "map.put_all": {
  "description": "Pine Script v6 function: map.put_all",
  "syntax": "map.put_all()",
  "returns": "unknown",
  "type": "function",
  "category": "map",
  "example": ""
 },
 "map.remove": {
  "description": "Pine Script v6 function: map.remove",
  "syntax": "map.remove()",
  "returns": "unknown",
  "type": "function",
  "category": "map",
  "example": ""
 },
 "map.size": {
  "description": "Pine Script v6 function: map.size",
  "syntax": "map.size()",
  "returns": "unknown",
  "type": "function",
  "category": "map",
  "example": ""
 },
 "map.values": {
  "description": "Pine Script v6 function: map.values",
  "syntax": "map.values()",
  "returns": "unknown",
  "type": "function",
  "category": "map",
  "example": ""
 },
 "math.abs": {
  "description": "Absolute value of number is number if number >= 0, or -number otherwise.",
  "syntax": "math.abs(number) → const int",
  "returns": "const int",
  "type": "function",
  "category": "",
  "example": ""
 },
 "math.acos": {
  "description": "Pine Script v6 function: math.acos",
  "syntax": "math.acos()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.asin": {
  "description": "Pine Script v6 function: math.asin",
  "syntax": "math.asin()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.atan": {
  "description": "Pine Script v6 function: math.atan",
  "syntax": "math.atan()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.avg": {
  "description": "Pine Script v6 function: math.avg",
  "syntax": "math.avg()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.ceil": {
  "description": "Pine Script v6 function: math.ceil",
  "syntax": "math.ceil()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.cos": {
  "description": "Pine Script v6 function: math.cos",
  "syntax": "math.cos()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.exp": {
  "description": "Pine Script v6 function: math.exp",
  "syntax": "math.exp()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.floor": {
  "description": "Rounds the specified number down to the largest whole number (\"int\" value) that is less than or equal to it.",
  "syntax": "math.floor(number) → const int",
  "returns": "const int",
  "type": "function",
  "category": "",
  "example": ""
 },
 "math.log": {
  "description": "Pine Script v6 function: math.log",
  "syntax": "math.log()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.log10": {
  "description": "Pine Script v6 function: math.log10",
  "syntax": "math.log10()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.max": {
  "description": "Returns the greatest of multiple values.",
  "syntax": "math.max(number0, number1, ...) → const int",
  "returns": "const int",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"math.max\", overlay=true)plot(math.max(close, open))plot(math.max(close, math.max(open, 42)))"
 },
 "math.min": {
  "description": "Returns the smallest of multiple values.",
  "syntax": "math.min(number0, number1, ...) → const int",
  "returns": "const int",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"math.min\", overlay=true)plot(math.min(close, open))plot(math.min(close, math.min(open, 42)))"
 },
 "math.pow": {
  "description": "Pine Script v6 function: math.pow",
  "syntax": "math.pow()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.random": {
  "description": "Pine Script v6 function: math.random",
  "syntax": "math.random()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.round": {
  "description": "Returns the value of number rounded to the nearest integer, with ties rounding up. If the precision parameter is used, returns a float value rounded to that amount of decimal places.",
  "syntax": "math.round(number) → const int",
  "returns": "const int",
  "type": "function",
  "category": "",
  "example": ""
 },
 "math.round_to_mintick": {
  "description": "Pine Script v6 function: math.round_to_mintick",
  "syntax": "math.round_to_mintick()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.sign": {
  "description": "Pine Script v6 function: math.sign",
  "syntax": "math.sign()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.sin": {
  "description": "Pine Script v6 function: math.sin",
  "syntax": "math.sin()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.sqrt": {
  "description": "Pine Script v6 function: math.sqrt",
  "syntax": "math.sqrt()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.sum": {
  "description": "Pine Script v6 function: math.sum",
  "syntax": "math.sum()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.tan": {
  "description": "Pine Script v6 function: math.tan",
  "syntax": "math.tan()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.todegrees": {
  "description": "Pine Script v6 function: math.todegrees",
  "syntax": "math.todegrees()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "math.toradians": {
  "description": "Pine Script v6 function: math.toradians",
  "syntax": "math.toradians()",
  "returns": "unknown",
  "type": "function",
  "category": "math",
  "example": ""
 },
 "matrix.add_col": {
  "description": "Pine Script v6 function: matrix.add_col",
  "syntax": "matrix.add_col()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.add_row": {
  "description": "Pine Script v6 function: matrix.add_row",
  "syntax": "matrix.add_row()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.avg": {
  "description": "Pine Script v6 function: matrix.avg",
  "syntax": "matrix.avg()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.col": {
  "description": "Pine Script v6 function: matrix.col",
  "syntax": "matrix.col()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.columns": {
  "description": "Pine Script v6 function: matrix.columns",
  "syntax": "matrix.columns()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.concat": {
  "description": "Pine Script v6 function: matrix.concat",
  "syntax": "matrix.concat()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.copy": {
  "description": "Pine Script v6 function: matrix.copy",
  "syntax": "matrix.copy()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.det": {
  "description": "Pine Script v6 function: matrix.det",
  "syntax": "matrix.det()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.diff": {
  "description": "Pine Script v6 function: matrix.diff",
  "syntax": "matrix.diff()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.eigenvalues": {
  "description": "Pine Script v6 function: matrix.eigenvalues",
  "syntax": "matrix.eigenvalues()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.eigenvectors": {
  "description": "Pine Script v6 function: matrix.eigenvectors",
  "syntax": "matrix.eigenvectors()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.elements_count": {
  "description": "Pine Script v6 function: matrix.elements_count",
  "syntax": "matrix.elements_count()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.fill": {
  "description": "Pine Script v6 function: matrix.fill",
  "syntax": "matrix.fill()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.get": {
  "description": "Pine Script v6 function: matrix.get",
  "syntax": "matrix.get()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.inv": {
  "description": "Pine Script v6 function: matrix.inv",
  "syntax": "matrix.inv()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.is_antidiagonal": {
  "description": "Pine Script v6 function: matrix.is_antidiagonal",
  "syntax": "matrix.is_antidiagonal()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.is_antisymmetric": {
  "description": "Pine Script v6 function: matrix.is_antisymmetric",
  "syntax": "matrix.is_antisymmetric()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.is_binary": {
  "description": "Pine Script v6 function: matrix.is_binary",
  "syntax": "matrix.is_binary()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.is_diagonal": {
  "description": "Pine Script v6 function: matrix.is_diagonal",
  "syntax": "matrix.is_diagonal()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.is_identity": {
  "description": "Pine Script v6 function: matrix.is_identity",
  "syntax": "matrix.is_identity()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.is_square": {
  "description": "Pine Script v6 function: matrix.is_square",
  "syntax": "matrix.is_square()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.is_stochastic": {
  "description": "Pine Script v6 function: matrix.is_stochastic",
  "syntax": "matrix.is_stochastic()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.is_symmetric": {
  "description": "Pine Script v6 function: matrix.is_symmetric",
  "syntax": "matrix.is_symmetric()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.is_triangular": {
  "description": "Pine Script v6 function: matrix.is_triangular",
  "syntax": "matrix.is_triangular()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.is_zero": {
  "description": "Pine Script v6 function: matrix.is_zero",
  "syntax": "matrix.is_zero()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.kron": {
  "description": "Pine Script v6 function: matrix.kron",
  "syntax": "matrix.kron()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.max": {
  "description": "Pine Script v6 function: matrix.max",
  "syntax": "matrix.max()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.median": {
  "description": "Pine Script v6 function: matrix.median",
  "syntax": "matrix.median()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.min": {
  "description": "Pine Script v6 function: matrix.min",
  "syntax": "matrix.min()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.mode": {
  "description": "Pine Script v6 function: matrix.mode",
  "syntax": "matrix.mode()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.mult": {
  "description": "Pine Script v6 function: matrix.mult",
  "syntax": "matrix.mult()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.new": {
  "description": "Pine Script v6 function: matrix.new",
  "syntax": "matrix.new()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.pinv": {
  "description": "Pine Script v6 function: matrix.pinv",
  "syntax": "matrix.pinv()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.pow": {
  "description": "Pine Script v6 function: matrix.pow",
  "syntax": "matrix.pow()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.rank": {
  "description": "Pine Script v6 function: matrix.rank",
  "syntax": "matrix.rank()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.remove_col": {
  "description": "Pine Script v6 function: matrix.remove_col",
  "syntax": "matrix.remove_col()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.remove_row": {
  "description": "Pine Script v6 function: matrix.remove_row",
  "syntax": "matrix.remove_row()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.reshape": {
  "description": "Pine Script v6 function: matrix.reshape",
  "syntax": "matrix.reshape()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.reverse": {
  "description": "Pine Script v6 function: matrix.reverse",
  "syntax": "matrix.reverse()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.row": {
  "description": "Pine Script v6 function: matrix.row",
  "syntax": "matrix.row()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.rows": {
  "description": "Pine Script v6 function: matrix.rows",
  "syntax": "matrix.rows()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.set": {
  "description": "Pine Script v6 function: matrix.set",
  "syntax": "matrix.set()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.sort": {
  "description": "Pine Script v6 function: matrix.sort",
  "syntax": "matrix.sort()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.submatrix": {
  "description": "Pine Script v6 function: matrix.submatrix",
  "syntax": "matrix.submatrix()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.swap_columns": {
  "description": "Pine Script v6 function: matrix.swap_columns",
  "syntax": "matrix.swap_columns()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.swap_rows": {
  "description": "Pine Script v6 function: matrix.swap_rows",
  "syntax": "matrix.swap_rows()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.trace": {
  "description": "Pine Script v6 function: matrix.trace",
  "syntax": "matrix.trace()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "matrix.transpose": {
  "description": "Pine Script v6 function: matrix.transpose",
  "syntax": "matrix.transpose()",
  "returns": "unknown",
  "type": "function",
  "category": "matrix",
  "example": ""
 },
 "polyline.delete": {
  "description": "Pine Script v6 function: polyline.delete",
  "syntax": "polyline.delete()",
  "returns": "unknown",
  "type": "function",
  "category": "polyline",
  "example": ""
 },
 "polyline.new": {
  "description": "Pine Script v6 function: polyline.new",
  "syntax": "polyline.new()",
  "returns": "unknown",
  "type": "function",
  "category": "polyline",
  "example": ""
 },
 "request.currency_rate": {
  "description": "Pine Script v6 function: request.currency_rate",
  "syntax": "request.currency_rate()",
  "returns": "unknown",
  "type": "function",
  "category": "request",
  "example": ""
 },
 "request.dividends": {
  "description": "Pine Script v6 function: request.dividends",
  "syntax": "request.dividends()",
  "returns": "unknown",
  "type": "function",
  "category": "request",
  "example": ""
 },
 "request.earnings": {
  "description": "Pine Script v6 function: request.earnings",
  "syntax": "request.earnings()",
  "returns": "unknown",
  "type": "function",
  "category": "request",
  "example": ""
 },
 "request.economic": {
  "description": "Pine Script v6 function: request.economic",
  "syntax": "request.economic()",
  "returns": "unknown",
  "type": "function",
  "category": "request",
  "example": ""
 },
 "request.financial": {
  "description": "Pine Script v6 function: request.financial",
  "syntax": "request.financial()",
  "returns": "unknown",
  "type": "function",
  "category": "request",
  "example": ""
 },
 "request.quandl": {
  "description": "Pine Script v6 function: request.quandl",
  "syntax": "request.quandl()",
  "returns": "unknown",
  "type": "function",
  "category": "request",
  "example": ""
 },
 "request.security": {
  "description": "Requests the result of an expression from a specified context (symbol and timeframe).",
  "syntax": "request.security(symbol, timeframe, expression, gaps, lookahead, ignore_invalid_symbol, currency, calc_bars_count) → series <type>",
  "returns": "series <type>",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"Simple `request.security()` calls\")// Returns 1D close of the current symbol.dailyClose = request.security(syminfo.tickerid, \"1D\", close)plot(dailyClose)// Returns the close of \"AAPL\" from the same timeframe as currently open on the chart.aaplClose = request.security(\"AAPL\", timeframe.period, close)plot(aaplClose)"
 },
 "request.security_lower_tf": {
  "description": "Pine Script v6 function: request.security_lower_tf",
  "syntax": "request.security_lower_tf()",
  "returns": "unknown",
  "type": "function",
  "category": "request",
  "example": ""
 },
 "request.seed": {
  "description": "Pine Script v6 function: request.seed",
  "syntax": "request.seed()",
  "returns": "unknown",
  "type": "function",
  "category": "request",
  "example": ""
 },
 "request.splits": {
  "description": "Pine Script v6 function: request.splits",
  "syntax": "request.splits()",
  "returns": "unknown",
  "type": "function",
  "category": "request",
  "example": ""
 },
 "runtime.error": {
  "description": "Pine Script v6 function: runtime.error",
  "syntax": "runtime.error()",
  "returns": "unknown",
  "type": "function",
  "category": "runtime",
  "example": ""
 },
 "str.contains": {
  "description": "Pine Script v6 function: str.contains",
  "syntax": "str.contains()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.endswith": {
  "description": "Pine Script v6 function: str.endswith",
  "syntax": "str.endswith()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.format": {
  "description": "Creates a formatted string using a specified formatting string (formatString) and one or more additional arguments (arg0, arg1, etc.). The formatting string defines the structure of the returned string, where all placeholders in curly brackets ({}) refer to the additional arguments. Each placeholder requires a number representing an argument's position, starting from 0. For instance, the placeholder {0} refers to the first argument after formatString (arg0), {1} refers to the second (arg1), and so on. The function replaces each placeholder with a string representation of the corresponding argument.",
  "syntax": "str.format(formatString, arg0, arg1, ...) → simple string",
  "returns": "simple string",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"Simple `str.format()` demo\")//@variable A formatted string that includes representations of the current `bar_index` and `close` values.//          The placeholder `{0}` refers to the first argument after the formatting string (`bar_index`), and //          `{1}` refers to the second (`close`).string labelText = str.format(\"Current bar index: {0}\\nCurrent bar close: {1}\", bar_index, close)// Draw a label to display the `labelText` string at the current bar's `high` price. label.new(bar_index, high, labelText)"
 },
 "str.format_time": {
  "description": "Pine Script v6 function: str.format_time",
  "syntax": "str.format_time()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.length": {
  "description": "Pine Script v6 function: str.length",
  "syntax": "str.length()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.lower": {
  "description": "Pine Script v6 function: str.lower",
  "syntax": "str.lower()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.match": {
  "description": "Pine Script v6 function: str.match",
  "syntax": "str.match()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.pos": {
  "description": "Pine Script v6 function: str.pos",
  "syntax": "str.pos()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.repeat": {
  "description": "Pine Script v6 function: str.repeat",
  "syntax": "str.repeat()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.replace": {
  "description": "Pine Script v6 function: str.replace",
  "syntax": "str.replace()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.replace_all": {
  "description": "Pine Script v6 function: str.replace_all",
  "syntax": "str.replace_all()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.split": {
  "description": "Pine Script v6 function: str.split",
  "syntax": "str.split()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.startswith": {
  "description": "Pine Script v6 function: str.startswith",
  "syntax": "str.startswith()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.substring": {
  "description": "Pine Script v6 function: str.substring",
  "syntax": "str.substring()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.tonumber": {
  "description": "Pine Script v6 function: str.tonumber",
  "syntax": "str.tonumber()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.tostring": {
  "description": "",
  "syntax": "str.tostring(value) → const string",
  "returns": "const string",
  "type": "function",
  "category": "",
  "example": ""
 },
 "str.trim": {
  "description": "Pine Script v6 function: str.trim",
  "syntax": "str.trim()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "str.upper": {
  "description": "Pine Script v6 function: str.upper",
  "syntax": "str.upper()",
  "returns": "unknown",
  "type": "function",
  "category": "str",
  "example": ""
 },
 "strategy.cancel": {
  "description": "Pine Script v6 function: strategy.cancel",
  "syntax": "strategy.cancel()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.cancel_all": {
  "description": "Pine Script v6 function: strategy.cancel_all",
  "syntax": "strategy.cancel_all()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.close": {
  "description": "Creates an order to exit from the part of a position opened by entry orders with a specific identifier. If multiple entries in the position share the same ID, the orders from this command apply to all those entries, starting from the first open trade, when its calls use that ID as the id argument.",
  "syntax": "strategy.close(id, comment, qty, qty_percent, alert_message, immediately, disable_alert) → void",
  "returns": "void",
  "type": "function",
  "category": "",
  "example": "//@version=6strategy(\"Partial close strategy\")// Calculate a 14-bar and 28-bar moving average of `close` prices.float sma14 = ta.sma(close, 14)float sma28 = ta.sma(close, 28)// Place a market order to enter a long position when `sma14` crosses over `sma28`.if ta.crossover(sma14, sma28)    strategy.entry(\"My Long Entry ID\", strategy.long)// Place a market order to close the long trade when `sma14` crosses under `sma28`.if ta.crossunder(sma14, sma28)    strategy.close(\"My Long Entry ID\", \"50% market close\", qty_percent = 50)// Plot the position size.plot(strategy.position_size)"
 },
 "strategy.close_all": {
  "description": "Pine Script v6 function: strategy.close_all",
  "syntax": "strategy.close_all()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.convert_to_account": {
  "description": "Pine Script v6 function: strategy.convert_to_account",
  "syntax": "strategy.convert_to_account()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.convert_to_symbol": {
  "description": "Pine Script v6 function: strategy.convert_to_symbol",
  "syntax": "strategy.convert_to_symbol()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.default_entry_qty": {
  "description": "Pine Script v6 function: strategy.default_entry_qty",
  "syntax": "strategy.default_entry_qty()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.entry": {
  "description": "Creates a new order to open or add to a position. If an unfilled order with the same id exists, a call to this command modifies that order.",
  "syntax": "strategy.entry(id, direction, qty, limit, stop, oca_name, oca_type, comment, alert_message, disable_alert) → void",
  "returns": "void",
  "type": "function",
  "category": "",
  "example": "//@version=6strategy(\"Market order strategy\", overlay = true)// Calculate a 14-bar and 28-bar moving average of `close` prices.float sma14 = ta.sma(close, 14)float sma28 = ta.sma(close, 28)// Place a market order to close the short trade and enter a long position when `sma14` crosses over `sma28`.if ta.crossover(sma14, sma28)    strategy.entry(\"My Long Entry ID\", strategy.long)// Place a market order to close the long trade and enter a short position when `sma14` crosses under `sma28`.if ta.crossunder(sma14, sma28)    strategy.entry(\"My Short Entry ID\", strategy.short)"
 },
 "strategy.exit": {
  "description": "Creates price-based orders to exit from an open position. If unfilled exit orders with the same id exist, calls to this command modify those orders. This command can generate more than one type of exit order, depending on the specified parameters. However, it does not create market orders. To exit from a position with a market order, use strategy.close() or strategy.close_all().",
  "syntax": "strategy.exit(id, from_entry, qty, qty_percent, profit, limit, loss, stop, trail_price, trail_points, trail_offset, oca_name, comment, comment_profit, comment_loss, comment_trailing, alert_message, alert_profit, alert_loss, alert_trailing, disable_alert) → void",
  "returns": "void",
  "type": "function",
  "category": "",
  "example": "//@version=6strategy(\"Exit bracket strategy\", overlay = true)// Inputs that define the profit and loss amount of each trade as a tick distance from the entry price.int profitDistanceInput = input.int(100, \"Profit distance, in ticks\", 1)int lossDistanceInput   = input.int(100, \"Loss distance, in ticks\", 1)// Variables to track the take-profit and stop-loss price.var float takeProfit = navar float stopLoss   = na// Calculate a 14-bar and 28-bar moving average of `close` prices.float sma14 = ta.sma(close, 14)float sma28 = ta.sma(close, 28)if ta.crossover(sma14, sma28) and strategy.opentrades == 0    // Place a market order to enter a long position.    strategy.entry(\"My Long Entry ID\", strategy.long)    // Place a take-profit and stop-loss order when the entry order fills.    strategy.exit(\"My Long Exit ID\", \"My Long Entry ID\", profit = profitDistanceInput, loss = lossDistanceInput)if ta.change(strategy.opentrades) == 1    //@variable The long entry price.    float entryPrice = strategy.opentrades.entry_price(0)    // Update the `takeProfit` and `stopLoss` values.    takeProfit := entryPrice + profitDistanceInput * syminfo.mintick    stopLoss   := entryPrice - lossDistanceInput * syminfo.mintickif ta.change(strategy.closedtrades) == 1    // Reset the `takeProfit` and `stopLoss`.    takeProfit := na    stopLoss   := na// Plot the `takeProfit` and `stopLoss`.plot(takeProfit, \"Take-profit level\", color.green, 2, plot.style_linebr)plot(stopLoss, \"Stop-loss level\", color.red, 2, plot.style_linebr)"
 },
 "strategy.order": {
  "description": "Pine Script v6 function: strategy.order",
  "syntax": "strategy.order()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.risk.allow_entry_in": {
  "description": "Pine Script v6 function: strategy.risk.allow_entry_in",
  "syntax": "strategy.risk.allow_entry_in()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.risk.max_cons_loss_days": {
  "description": "Pine Script v6 function: strategy.risk.max_cons_loss_days",
  "syntax": "strategy.risk.max_cons_loss_days()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.risk.max_drawdown": {
  "description": "Pine Script v6 function: strategy.risk.max_drawdown",
  "syntax": "strategy.risk.max_drawdown()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.risk.max_intraday_filled_orders": {
  "description": "Pine Script v6 function: strategy.risk.max_intraday_filled_orders",
  "syntax": "strategy.risk.max_intraday_filled_orders()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.risk.max_intraday_loss": {
  "description": "Pine Script v6 function: strategy.risk.max_intraday_loss",
  "syntax": "strategy.risk.max_intraday_loss()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.risk.max_position_size": {
  "description": "Pine Script v6 function: strategy.risk.max_position_size",
  "syntax": "strategy.risk.max_position_size()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.commission": {
  "description": "Pine Script v6 function: strategy.closedtrades.commission",
  "syntax": "strategy.closedtrades.commission()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.entry_bar_index": {
  "description": "Pine Script v6 function: strategy.closedtrades.entry_bar_index",
  "syntax": "strategy.closedtrades.entry_bar_index()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.entry_comment": {
  "description": "Pine Script v6 function: strategy.closedtrades.entry_comment",
  "syntax": "strategy.closedtrades.entry_comment()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.entry_id": {
  "description": "Pine Script v6 function: strategy.closedtrades.entry_id",
  "syntax": "strategy.closedtrades.entry_id()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.entry_price": {
  "description": "Pine Script v6 function: strategy.closedtrades.entry_price",
  "syntax": "strategy.closedtrades.entry_price()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.entry_time": {
  "description": "Pine Script v6 function: strategy.closedtrades.entry_time",
  "syntax": "strategy.closedtrades.entry_time()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.exit_bar_index": {
  "description": "Pine Script v6 function: strategy.closedtrades.exit_bar_index",
  "syntax": "strategy.closedtrades.exit_bar_index()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.exit_comment": {
  "description": "Pine Script v6 function: strategy.closedtrades.exit_comment",
  "syntax": "strategy.closedtrades.exit_comment()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.exit_id": {
  "description": "Pine Script v6 function: strategy.closedtrades.exit_id",
  "syntax": "strategy.closedtrades.exit_id()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.exit_price": {
  "description": "Pine Script v6 function: strategy.closedtrades.exit_price",
  "syntax": "strategy.closedtrades.exit_price()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.exit_time": {
  "description": "Pine Script v6 function: strategy.closedtrades.exit_time",
  "syntax": "strategy.closedtrades.exit_time()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.max_drawdown": {
  "description": "Pine Script v6 function: strategy.closedtrades.max_drawdown",
  "syntax": "strategy.closedtrades.max_drawdown()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.max_drawdown_percent": {
  "description": "Pine Script v6 function: strategy.closedtrades.max_drawdown_percent",
  "syntax": "strategy.closedtrades.max_drawdown_percent()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.max_runup": {
  "description": "Pine Script v6 function: strategy.closedtrades.max_runup",
  "syntax": "strategy.closedtrades.max_runup()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.max_runup_percent": {
  "description": "Pine Script v6 function: strategy.closedtrades.max_runup_percent",
  "syntax": "strategy.closedtrades.max_runup_percent()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.profit": {
  "description": "Pine Script v6 function: strategy.closedtrades.profit",
  "syntax": "strategy.closedtrades.profit()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.profit_percent": {
  "description": "Pine Script v6 function: strategy.closedtrades.profit_percent",
  "syntax": "strategy.closedtrades.profit_percent()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.closedtrades.size": {
  "description": "Pine Script v6 function: strategy.closedtrades.size",
  "syntax": "strategy.closedtrades.size()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.opentrades.commission": {
  "description": "Pine Script v6 function: strategy.opentrades.commission",
  "syntax": "strategy.opentrades.commission()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.opentrades.entry_bar_index": {
  "description": "Pine Script v6 function: strategy.opentrades.entry_bar_index",
  "syntax": "strategy.opentrades.entry_bar_index()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.opentrades.entry_comment": {
  "description": "Pine Script v6 function: strategy.opentrades.entry_comment",
  "syntax": "strategy.opentrades.entry_comment()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.opentrades.entry_id": {
  "description": "Pine Script v6 function: strategy.opentrades.entry_id",
  "syntax": "strategy.opentrades.entry_id()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.opentrades.entry_price": {
  "description": "Pine Script v6 function: strategy.opentrades.entry_price",
  "syntax": "strategy.opentrades.entry_price()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.opentrades.entry_time": {
  "description": "Pine Script v6 function: strategy.opentrades.entry_time",
  "syntax": "strategy.opentrades.entry_time()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.opentrades.max_drawdown": {
  "description": "Pine Script v6 function: strategy.opentrades.max_drawdown",
  "syntax": "strategy.opentrades.max_drawdown()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.opentrades.max_drawdown_percent": {
  "description": "Pine Script v6 function: strategy.opentrades.max_drawdown_percent",
  "syntax": "strategy.opentrades.max_drawdown_percent()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.opentrades.max_runup": {
  "description": "Pine Script v6 function: strategy.opentrades.max_runup",
  "syntax": "strategy.opentrades.max_runup()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.opentrades.max_runup_percent": {
  "description": "Pine Script v6 function: strategy.opentrades.max_runup_percent",
  "syntax": "strategy.opentrades.max_runup_percent()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.opentrades.profit": {
  "description": "Pine Script v6 function: strategy.opentrades.profit",
  "syntax": "strategy.opentrades.profit()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.opentrades.profit_percent": {
  "description": "Pine Script v6 function: strategy.opentrades.profit_percent",
  "syntax": "strategy.opentrades.profit_percent()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "strategy.opentrades.size": {
  "description": "Pine Script v6 function: strategy.opentrades.size",
  "syntax": "strategy.opentrades.size()",
  "returns": "unknown",
  "type": "function",
  "category": "strategy",
  "example": ""
 },
 "syminfo.prefix": {
  "description": "Pine Script v6 function: syminfo.prefix",
  "syntax": "syminfo.prefix()",
  "returns": "unknown",
  "type": "function",
  "category": "syminfo",
  "example": ""
 },
 "syminfo.ticker": {
  "description": "Pine Script v6 function: syminfo.ticker",
  "syntax": "syminfo.ticker()",
  "returns": "unknown",
  "type": "function",
  "category": "syminfo",
  "example": ""
 },
 "ta.alma": {
  "description": "Pine Script v6 function: ta.alma",
  "syntax": "ta.alma()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.atr": {
  "description": "Function atr (average true range) returns the RMA of true range. True range is max(high - low, abs(high - close[1]), abs(low - close[1])).",
  "syntax": "ta.atr(length) → series float",
  "returns": "series float",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"ta.atr\")plot(ta.atr(14))//the same on pinepine_atr(length) =>    trueRange = na(high[1])? high-low : math.max(math.max(high - low, math.abs(high - close[1])), math.abs(low - close[1]))    //true range can be also calculated with ta.tr(true)    ta.rma(trueRange, length)plot(pine_atr(14))"
 },
 "ta.barssince": {
  "description": "Pine Script v6 function: ta.barssince",
  "syntax": "ta.barssince()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.bb": {
  "description": "Pine Script v6 function: ta.bb",
  "syntax": "ta.bb()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.bbw": {
  "description": "Pine Script v6 function: ta.bbw",
  "syntax": "ta.bbw()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.cci": {
  "description": "Pine Script v6 function: ta.cci",
  "syntax": "ta.cci()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.change": {
  "description": "Pine Script v6 function: ta.change",
  "syntax": "ta.change()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.cmo": {
  "description": "Pine Script v6 function: ta.cmo",
  "syntax": "ta.cmo()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.cog": {
  "description": "Pine Script v6 function: ta.cog",
  "syntax": "ta.cog()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.correlation": {
  "description": "Pine Script v6 function: ta.correlation",
  "syntax": "ta.correlation()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.cross": {
  "description": "Pine Script v6 function: ta.cross",
  "syntax": "ta.cross()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.crossover": {
  "description": "The source1-series is defined as having crossed over source2-series if, on the current bar, the value of source1 is greater than the value of source2, and on the previous bar, the value of source1 was less than or equal to the value of source2.",
  "syntax": "ta.crossover(source1, source2) → series bool",
  "returns": "series bool",
  "type": "function",
  "category": "",
  "example": ""
 },
 "ta.crossunder": {
  "description": "The source1-series is defined as having crossed under source2-series if, on the current bar, the value of source1 is less than the value of source2, and on the previous bar, the value of source1 was greater than or equal to the value of source2.",
  "syntax": "ta.crossunder(source1, source2) → series bool",
  "returns": "series bool",
  "type": "function",
  "category": "",
  "example": ""
 },
 "ta.cum": {
  "description": "Pine Script v6 function: ta.cum",
  "syntax": "ta.cum()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.dev": {
  "description": "Pine Script v6 function: ta.dev",
  "syntax": "ta.dev()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.dmi": {
  "description": "Pine Script v6 function: ta.dmi",
  "syntax": "ta.dmi()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.ema": {
  "description": "The ema function returns the exponentially weighted moving average. In ema weighting factors decrease exponentially. It calculates by using a formula: EMA = alpha * source + (1 - alpha) * EMA[1], where alpha = 2 / (length + 1).",
  "syntax": "ta.ema(source, length) → series float",
  "returns": "series float",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"ta.ema\")plot(ta.ema(close, 15))//the same on pinepine_ema(src, length) =>    alpha = 2 / (length + 1)    sum = 0.0    sum := na(sum[1]) ? src : alpha * src + (1 - alpha) * nz(sum[1])plot(pine_ema(close,15))"
 },
 "ta.falling": {
  "description": "Pine Script v6 function: ta.falling",
  "syntax": "ta.falling()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.highest": {
  "description": "Pine Script v6 function: ta.highest",
  "syntax": "ta.highest()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.highestbars": {
  "description": "Pine Script v6 function: ta.highestbars",
  "syntax": "ta.highestbars()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.hma": {
  "description": "Pine Script v6 function: ta.hma",
  "syntax": "ta.hma()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.kc": {
  "description": "Pine Script v6 function: ta.kc",
  "syntax": "ta.kc()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.kcw": {
  "description": "Pine Script v6 function: ta.kcw",
  "syntax": "ta.kcw()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.linreg": {
  "description": "Pine Script v6 function: ta.linreg",
  "syntax": "ta.linreg()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.lowest": {
  "description": "Pine Script v6 function: ta.lowest",
  "syntax": "ta.lowest()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.lowestbars": {
  "description": "Pine Script v6 function: ta.lowestbars",
  "syntax": "ta.lowestbars()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.macd": {
  "description": "Pine Script v6 function: ta.macd",
  "syntax": "ta.macd()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.max": {
  "description": "Pine Script v6 function: ta.max",
  "syntax": "ta.max()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.median": {
  "description": "Pine Script v6 function: ta.median",
  "syntax": "ta.median()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.mfi": {
  "description": "Pine Script v6 function: ta.mfi",
  "syntax": "ta.mfi()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.min": {
  "description": "Pine Script v6 function: ta.min",
  "syntax": "ta.min()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.mode": {
  "description": "Pine Script v6 function: ta.mode",
  "syntax": "ta.mode()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.mom": {
  "description": "Pine Script v6 function: ta.mom",
  "syntax": "ta.mom()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.percentile_linear_interpolation": {
  "description": "Pine Script v6 function: ta.percentile_linear_interpolation",
  "syntax": "ta.percentile_linear_interpolation()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.percentile_nearest_rank": {
  "description": "Pine Script v6 function: ta.percentile_nearest_rank",
  "syntax": "ta.percentile_nearest_rank()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.percentrank": {
  "description": "Pine Script v6 function: ta.percentrank",
  "syntax": "ta.percentrank()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.pivot_point_levels": {
  "description": "Pine Script v6 function: ta.pivot_point_levels",
  "syntax": "ta.pivot_point_levels()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.pivothigh": {
  "description": "Pine Script v6 function: ta.pivothigh",
  "syntax": "ta.pivothigh()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.pivotlow": {
  "description": "Pine Script v6 function: ta.pivotlow",
  "syntax": "ta.pivotlow()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.range": {
  "description": "Pine Script v6 function: ta.range",
  "syntax": "ta.range()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.rci": {
  "description": "Pine Script v6 function: ta.rci",
  "syntax": "ta.rci()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.rising": {
  "description": "Pine Script v6 function: ta.rising",
  "syntax": "ta.rising()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.rma": {
  "description": "Pine Script v6 function: ta.rma",
  "syntax": "ta.rma()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.roc": {
  "description": "Pine Script v6 function: ta.roc",
  "syntax": "ta.roc()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.rsi": {
  "description": "Relative strength index. It is calculated using the ta.rma() of upward and downward changes of source over the last length bars.",
  "syntax": "ta.rsi(source, length) → series float",
  "returns": "series float",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"ta.rsi\")plot(ta.rsi(close, 7))// same on pine, but less efficientpine_rsi(x, y) =>    u = math.max(x - x[1], 0) // upward ta.change    d = math.max(x[1] - x, 0) // downward ta.change    rs = ta.rma(u, y) / ta.rma(d, y)    res = 100 - 100 / (1 + rs)    resplot(pine_rsi(close, 7))"
 },
 "ta.sar": {
  "description": "Pine Script v6 function: ta.sar",
  "syntax": "ta.sar()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.sma": {
  "description": "The sma function returns the moving average, that is the sum of last y values of x, divided by y.",
  "syntax": "ta.sma(source, length) → series float",
  "returns": "series float",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"ta.sma\")plot(ta.sma(close, 15))// same on pine, but much less efficientpine_sma(x, y) =>    sum = 0.0    for i = 0 to y - 1        sum := sum + x[i] / y    sumplot(pine_sma(close, 15))"
 },
 "ta.stdev": {
  "description": "",
  "syntax": "ta.stdev(source, length, biased) → series float",
  "returns": "series float",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"ta.stdev\")plot(ta.stdev(close, 5))//the same on pineisZero(val, eps) => math.abs(val) <= epsSUM(fst, snd) =>    EPS = 1e-10    res = fst + snd    if isZero(res, EPS)        res := 0    else        if not isZero(res, 1e-4)            res := res        else            15pine_stdev(src, length) =>    avg = ta.sma(src, length)    sumOfSquareDeviations = 0.0    for i = 0 to length - 1        sum = SUM(src[i], -avg)        sumOfSquareDeviations := sumOfSquareDeviations + sum * sum    stdev = math.sqrt(sumOfSquareDeviations / length)plot(pine_stdev(close, 5))"
 },
 "ta.stoch": {
  "description": "Pine Script v6 function: ta.stoch",
  "syntax": "ta.stoch()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.supertrend": {
  "description": "Pine Script v6 function: ta.supertrend",
  "syntax": "ta.supertrend()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.swma": {
  "description": "Pine Script v6 function: ta.swma",
  "syntax": "ta.swma()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.tr": {
  "description": "Pine Script v6 function: ta.tr",
  "syntax": "ta.tr()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.tsi": {
  "description": "Pine Script v6 function: ta.tsi",
  "syntax": "ta.tsi()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.valuewhen": {
  "description": "Pine Script v6 function: ta.valuewhen",
  "syntax": "ta.valuewhen()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.variance": {
  "description": "Pine Script v6 function: ta.variance",
  "syntax": "ta.variance()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.vwap": {
  "description": "Pine Script v6 function: ta.vwap",
  "syntax": "ta.vwap()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.vwma": {
  "description": "Pine Script v6 function: ta.vwma",
  "syntax": "ta.vwma()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.wma": {
  "description": "Pine Script v6 function: ta.wma",
  "syntax": "ta.wma()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "ta.wpr": {
  "description": "Pine Script v6 function: ta.wpr",
  "syntax": "ta.wpr()",
  "returns": "unknown",
  "type": "function",
  "category": "ta",
  "example": ""
 },
 "table.cell": {
  "description": "Pine Script v6 function: table.cell",
  "syntax": "table.cell()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.cell_set_bgcolor": {
  "description": "Pine Script v6 function: table.cell_set_bgcolor",
  "syntax": "table.cell_set_bgcolor()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.cell_set_height": {
  "description": "Pine Script v6 function: table.cell_set_height",
  "syntax": "table.cell_set_height()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.cell_set_text": {
  "description": "Pine Script v6 function: table.cell_set_text",
  "syntax": "table.cell_set_text()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.cell_set_text_color": {
  "description": "Pine Script v6 function: table.cell_set_text_color",
  "syntax": "table.cell_set_text_color()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.cell_set_text_font_family": {
  "description": "Pine Script v6 function: table.cell_set_text_font_family",
  "syntax": "table.cell_set_text_font_family()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.cell_set_text_formatting": {
  "description": "Pine Script v6 function: table.cell_set_text_formatting",
  "syntax": "table.cell_set_text_formatting()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.cell_set_text_halign": {
  "description": "Pine Script v6 function: table.cell_set_text_halign",
  "syntax": "table.cell_set_text_halign()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.cell_set_text_size": {
  "description": "Pine Script v6 function: table.cell_set_text_size",
  "syntax": "table.cell_set_text_size()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.cell_set_text_valign": {
  "description": "Pine Script v6 function: table.cell_set_text_valign",
  "syntax": "table.cell_set_text_valign()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.cell_set_tooltip": {
  "description": "Pine Script v6 function: table.cell_set_tooltip",
  "syntax": "table.cell_set_tooltip()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.cell_set_width": {
  "description": "Pine Script v6 function: table.cell_set_width",
  "syntax": "table.cell_set_width()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.clear": {
  "description": "Pine Script v6 function: table.clear",
  "syntax": "table.clear()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.delete": {
  "description": "Pine Script v6 function: table.delete",
  "syntax": "table.delete()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.merge_cells": {
  "description": "Pine Script v6 function: table.merge_cells",
  "syntax": "table.merge_cells()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.new": {
  "description": "Pine Script v6 function: table.new",
  "syntax": "table.new()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.set_bgcolor": {
  "description": "Pine Script v6 function: table.set_bgcolor",
  "syntax": "table.set_bgcolor()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.set_border_color": {
  "description": "Pine Script v6 function: table.set_border_color",
  "syntax": "table.set_border_color()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.set_border_width": {
  "description": "Pine Script v6 function: table.set_border_width",
  "syntax": "table.set_border_width()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.set_frame_color": {
  "description": "Pine Script v6 function: table.set_frame_color",
  "syntax": "table.set_frame_color()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.set_frame_width": {
  "description": "Pine Script v6 function: table.set_frame_width",
  "syntax": "table.set_frame_width()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "table.set_position": {
  "description": "Pine Script v6 function: table.set_position",
  "syntax": "table.set_position()",
  "returns": "unknown",
  "type": "function",
  "category": "table",
  "example": ""
 },
 "ticker.heikinashi": {
  "description": "Pine Script v6 function: ticker.heikinashi",
  "syntax": "ticker.heikinashi()",
  "returns": "unknown",
  "type": "function",
  "category": "ticker",
  "example": ""
 },
 "ticker.inherit": {
  "description": "Pine Script v6 function: ticker.inherit",
  "syntax": "ticker.inherit()",
  "returns": "unknown",
  "type": "function",
  "category": "ticker",
  "example": ""
 },
 "ticker.kagi": {
  "description": "Pine Script v6 function: ticker.kagi",
  "syntax": "ticker.kagi()",
  "returns": "unknown",
  "type": "function",
  "category": "ticker",
  "example": ""
 },
 "ticker.linebreak": {
  "description": "Pine Script v6 function: ticker.linebreak",
  "syntax": "ticker.linebreak()",
  "returns": "unknown",
  "type": "function",
  "category": "ticker",
  "example": ""
 },
 "ticker.modify": {
  "description": "Pine Script v6 function: ticker.modify",
  "syntax": "ticker.modify()",
  "returns": "unknown",
  "type": "function",
  "category": "ticker",
  "example": ""
 },
 "ticker.new": {
  "description": "Pine Script v6 function: ticker.new",
  "syntax": "ticker.new()",
  "returns": "unknown",
  "type": "function",
  "category": "ticker",
  "example": ""
 },
 "ticker.pointfigure": {
  "description": "Pine Script v6 function: ticker.pointfigure",
  "syntax": "ticker.pointfigure()",
  "returns": "unknown",
  "type": "function",
  "category": "ticker",
  "example": ""
 },
 "ticker.renko": {
  "description": "Pine Script v6 function: ticker.renko",
  "syntax": "ticker.renko()",
  "returns": "unknown",
  "type": "function",
  "category": "ticker",
  "example": ""
 },
 "ticker.standard": {
  "description": "Pine Script v6 function: ticker.standard",
  "syntax": "ticker.standard()",
  "returns": "unknown",
  "type": "function",
  "category": "ticker",
  "example": ""
 },
 "timeframe.change": {
  "description": "Pine Script v6 function: timeframe.change",
  "syntax": "timeframe.change()",
  "returns": "unknown",
  "type": "function",
  "category": "timeframe",
  "example": ""
 },
 "timeframe.from_seconds": {
  "description": "Pine Script v6 function: timeframe.from_seconds",
  "syntax": "timeframe.from_seconds()",
  "returns": "unknown",
  "type": "function",
  "category": "timeframe",
  "example": ""
 },
 "timeframe.in_seconds": {
  "description": "Pine Script v6 function: timeframe.in_seconds",
  "syntax": "timeframe.in_seconds()",
  "returns": "unknown",
  "type": "function",
  "category": "timeframe",
  "example": ""
 },
 "core.barcolor": {
  "description": "Pine Script v6 function: core.barcolor",
  "syntax": "core.barcolor()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.bgcolor": {
  "description": "Pine Script v6 function: core.bgcolor",
  "syntax": "core.bgcolor()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.bool": {
  "description": "Pine Script v6 function: core.bool",
  "syntax": "core.bool()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.box": {
  "description": "Pine Script v6 function: core.box",
  "syntax": "core.box()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.color": {
  "description": "Pine Script v6 function: core.color",
  "syntax": "core.color()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.fill": {
  "description": "Pine Script v6 function: core.fill",
  "syntax": "core.fill()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.fixnan": {
  "description": "Pine Script v6 function: core.fixnan",
  "syntax": "core.fixnan()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.float": {
  "description": "Pine Script v6 function: core.float",
  "syntax": "core.float()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.hline": {
  "description": "Pine Script v6 function: core.hline",
  "syntax": "core.hline()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.hour": {
  "description": "Pine Script v6 function: core.hour",
  "syntax": "core.hour()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.indicator": {
  "description": "Pine Script v6 function: core.indicator",
  "syntax": "core.indicator()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.input": {
  "description": "Pine Script v6 function: core.input",
  "syntax": "core.input()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.int": {
  "description": "Pine Script v6 function: core.int",
  "syntax": "core.int()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.label": {
  "description": "Pine Script v6 function: core.label",
  "syntax": "core.label()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.library": {
  "description": "Pine Script v6 function: core.library",
  "syntax": "core.library()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.line": {
  "description": "Pine Script v6 function: core.line",
  "syntax": "core.line()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.linefill": {
  "description": "Pine Script v6 function: core.linefill",
  "syntax": "core.linefill()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.max_bars_back": {
  "description": "Pine Script v6 function: core.max_bars_back",
  "syntax": "core.max_bars_back()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.minute": {
  "description": "Pine Script v6 function: core.minute",
  "syntax": "core.minute()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.month": {
  "description": "Pine Script v6 function: core.month",
  "syntax": "core.month()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.na": {
  "description": "Pine Script v6 function: core.na",
  "syntax": "core.na()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.nz": {
  "description": "Pine Script v6 function: core.nz",
  "syntax": "core.nz()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.plot": {
  "description": "Pine Script v6 function: core.plot",
  "syntax": "core.plot()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.plotarrow": {
  "description": "Pine Script v6 function: core.plotarrow",
  "syntax": "core.plotarrow()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.plotbar": {
  "description": "Pine Script v6 function: core.plotbar",
  "syntax": "core.plotbar()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.plotcandle": {
  "description": "Pine Script v6 function: core.plotcandle",
  "syntax": "core.plotcandle()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.plotchar": {
  "description": "Pine Script v6 function: core.plotchar",
  "syntax": "core.plotchar()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.plotshape": {
  "description": "Pine Script v6 function: core.plotshape",
  "syntax": "core.plotshape()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.polyline": {
  "description": "Pine Script v6 function: core.polyline",
  "syntax": "core.polyline()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.string": {
  "description": "Pine Script v6 function: core.string",
  "syntax": "core.string()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.dayofmonth": {
  "description": "Pine Script v6 function: core.dayofmonth",
  "syntax": "core.dayofmonth()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.dayofweek": {
  "description": "Pine Script v6 function: core.dayofweek",
  "syntax": "core.dayofweek()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.second": {
  "description": "Pine Script v6 function: core.second",
  "syntax": "core.second()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.strategy": {
  "description": "Pine Script v6 function: core.strategy",
  "syntax": "core.strategy()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.weekofyear": {
  "description": "Pine Script v6 function: core.weekofyear",
  "syntax": "core.weekofyear()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.year": {
  "description": "Pine Script v6 function: core.year",
  "syntax": "core.year()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.time": {
  "description": "Pine Script v6 function: core.time",
  "syntax": "core.time()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.time_close": {
  "description": "Pine Script v6 function: core.time_close",
  "syntax": "core.time_close()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "core.timestamp": {
  "description": "Pine Script v6 function: core.timestamp",
  "syntax": "core.timestamp()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "alert": {
  "description": "Creates an alert trigger for an indicator or strategy, with a specified frequency, when called on the latest realtime bar. To activate alerts for a script containing calls to this function, open the \"Create Alert\" dialog box, then select the script name and \"Any alert() function call\" in the \"Condition\" section.",
  "syntax": "alert(message, freq) → void",
  "returns": "void",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"`alert()` example\", \"\", true)ma = ta.sma(close, 14)xUp = ta.crossover(close, ma)if xUp    // Trigger the alert the first time a cross occurs during the real-time bar.    alert(\"Price (\" + str.tostring(close) + \") crossed over MA (\" + str.tostring(ma) + \").\", alert.freq_once_per_bar)plot(ma)plotchar(xUp, \"xUp\", \"▲\", location.top, size = size.tiny)"
 },
 "alertcondition": {
  "description": "Creates alert condition, that is available in Create Alert dialog. Please note, that alertcondition() does NOT create an alert, it just gives you more options in Create Alert dialog. Also, alertcondition() effect is invisible on chart.",
  "syntax": "alertcondition(condition, title, message) → void",
  "returns": "void",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"alertcondition\", overlay=true)alertcondition(close >= open, title='Alert on Green Bar', message='Green Bar!')"
 },
 "barcolor": {
  "description": "Core Pine Script v6 function: barcolor",
  "syntax": "barcolor()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "bgcolor": {
  "description": "Core Pine Script v6 function: bgcolor",
  "syntax": "bgcolor()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "bool": {
  "description": "Core Pine Script v6 function: bool",
  "syntax": "bool()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "box": {
  "description": "Core Pine Script v6 function: box",
  "syntax": "box()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "color": {
  "description": "Core Pine Script v6 function: color",
  "syntax": "color()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "fill": {
  "description": "Core Pine Script v6 function: fill",
  "syntax": "fill()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "fixnan": {
  "description": "Core Pine Script v6 function: fixnan",
  "syntax": "fixnan()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "float": {
  "description": "Core Pine Script v6 function: float",
  "syntax": "float()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "hline": {
  "description": "Core Pine Script v6 function: hline",
  "syntax": "hline()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "hour": {
  "description": "Core Pine Script v6 function: hour",
  "syntax": "hour()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "indicator": {
  "description": "This declaration statement designates the script as an indicator and sets a number of indicator-related properties.",
  "syntax": "indicator(title, shorttitle, overlay, format, precision, scale, max_bars_back, timeframe, timeframe_gaps, explicit_plot_zorder, max_lines_count, max_labels_count, max_boxes_count, calc_bars_count, max_polylines_count, dynamic_requests, behind_chart) → void",
  "returns": "void",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"My script\", shorttitle=\"Script\")plot(close)"
 },
 "input": {
  "description": "Core Pine Script v6 function: input",
  "syntax": "input()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "int": {
  "description": "Core Pine Script v6 function: int",
  "syntax": "int()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "label": {
  "description": "Core Pine Script v6 function: label",
  "syntax": "label()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "library": {
  "description": "Core Pine Script v6 function: library",
  "syntax": "library()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "line": {
  "description": "Core Pine Script v6 function: line",
  "syntax": "line()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "linefill": {
  "description": "Core Pine Script v6 function: linefill",
  "syntax": "linefill()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "max_bars_back": {
  "description": "Core Pine Script v6 function: max_bars_back",
  "syntax": "max_bars_back()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "minute": {
  "description": "Core Pine Script v6 function: minute",
  "syntax": "minute()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "month": {
  "description": "Core Pine Script v6 function: month",
  "syntax": "month()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "na": {
  "description": "Core Pine Script v6 function: na",
  "syntax": "na()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "nz": {
  "description": "Core Pine Script v6 function: nz",
  "syntax": "nz()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "plot": {
  "description": "Plots a series of data on the chart.",
  "syntax": "plot(series, title, color, linewidth, style, trackprice, histbase, offset, join, editable, show_last, display, format, precision, force_overlay, linestyle) → plot",
  "returns": "plot",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"plot\")plot(high+low, title='Title', color=color.new(#00ffaa, 70), linewidth=2, style=plot.style_area, offset=15, trackprice=true)// You may fill the background between any two plots with a fill() function:p1 = plot(open)p2 = plot(close)fill(p1, p2, color=color.new(color.green, 90))"
 },
 "plotarrow": {
  "description": "Core Pine Script v6 function: plotarrow",
  "syntax": "plotarrow()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "plotbar": {
  "description": "Core Pine Script v6 function: plotbar",
  "syntax": "plotbar()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "plotcandle": {
  "description": "Core Pine Script v6 function: plotcandle",
  "syntax": "plotcandle()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "plotchar": {
  "description": "Plots visual shapes using any given one Unicode character on the chart.",
  "syntax": "plotchar(series, title, char, location, color, offset, text, textcolor, editable, size, show_last, display, format, precision, force_overlay) → void",
  "returns": "void",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"plotchar example\", overlay=true)data = close >= openplotchar(data, char='❄')"
 },
 "plotshape": {
  "description": "Plots visual shapes on the chart.",
  "syntax": "plotshape(series, title, style, location, color, offset, text, textcolor, editable, size, show_last, display, format, precision, force_overlay) → void",
  "returns": "void",
  "type": "function",
  "category": "",
  "example": "//@version=6indicator(\"plotshape example 1\", overlay=true)data = close >= openplotshape(data, style=shape.xcross)"
 },
 "polyline": {
  "description": "Core Pine Script v6 function: polyline",
  "syntax": "polyline()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "string": {
  "description": "Core Pine Script v6 function: string",
  "syntax": "string()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "dayofmonth": {
  "description": "Core Pine Script v6 function: dayofmonth",
  "syntax": "dayofmonth()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "dayofweek": {
  "description": "Core Pine Script v6 function: dayofweek",
  "syntax": "dayofweek()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "second": {
  "description": "Core Pine Script v6 function: second",
  "syntax": "second()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "strategy": {
  "description": "This declaration statement designates the script as a strategy and sets a number of strategy-related properties.",
  "syntax": "strategy(title, shorttitle, overlay, format, precision, scale, pyramiding, calc_on_order_fills, calc_on_every_tick, max_bars_back, backtest_fill_limits_assumption, default_qty_type, default_qty_value, initial_capital, currency, slippage, commission_type, commission_value, process_orders_on_close, close_entries_rule, margin_long, margin_short, explicit_plot_zorder, max_lines_count, max_labels_count, max_boxes_count, calc_bars_count, risk_free_rate, use_bar_magnifier, fill_orders_on_standard_ohlc, max_polylines_count, dynamic_requests, behind_chart) → void",
  "returns": "void",
  "type": "function",
  "category": "",
  "example": "//@version=6strategy(\"My strategy\", overlay = true)// Enter long by market if current open is greater than previous high.if open > high[1]    strategy.entry(\"Long\", strategy.long, 1)// Generate a full exit bracket (profit 10 points, loss 5 points per contract) from the entry named \"Long\".strategy.exit(\"Exit\", \"Long\", profit = 10, loss = 5)"
 },
 "weekofyear": {
  "description": "Core Pine Script v6 function: weekofyear",
  "syntax": "weekofyear()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "year": {
  "description": "Core Pine Script v6 function: year",
  "syntax": "year()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "time": {
  "description": "Core Pine Script v6 function: time",
  "syntax": "time()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "time_close": {
  "description": "Core Pine Script v6 function: time_close",
  "syntax": "time_close()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 },
 "timestamp": {
  "description": "Core Pine Script v6 function: timestamp",
  "syntax": "timestamp()",
  "returns": "unknown",
  "type": "function",
  "category": "core",
  "example": ""
 }
};
