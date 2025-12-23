/**
 * Pine Script v6 Function Metadata
 * Flags for special function behaviors
 * Generated: 2025-12-23T15:21:44.776Z
 */

export interface FunctionFlags {
	topLevelOnly?: boolean;    // Can only be called at script root
	seriesReturning?: boolean; // Returns a series type
	variadic?: boolean;        // Accepts variable number of arguments
}

export const FUNCTION_METADATA: Record<string, FunctionFlags> = {
 "array.from": {
  "variadic": true
 },
 "math.abs": {
  "seriesReturning": true
 },
 "math.acos": {
  "seriesReturning": true
 },
 "math.asin": {
  "seriesReturning": true
 },
 "math.atan": {
  "seriesReturning": true
 },
 "math.avg": {
  "seriesReturning": true,
  "variadic": true
 },
 "math.ceil": {
  "seriesReturning": true
 },
 "math.cos": {
  "seriesReturning": true
 },
 "math.exp": {
  "seriesReturning": true
 },
 "math.floor": {
  "seriesReturning": true
 },
 "math.log": {
  "seriesReturning": true
 },
 "math.log10": {
  "seriesReturning": true
 },
 "math.max": {
  "seriesReturning": true,
  "variadic": true
 },
 "math.min": {
  "seriesReturning": true,
  "variadic": true
 },
 "math.pow": {
  "seriesReturning": true
 },
 "math.round": {
  "seriesReturning": true
 },
 "math.sign": {
  "seriesReturning": true
 },
 "math.sin": {
  "seriesReturning": true
 },
 "math.sqrt": {
  "seriesReturning": true
 },
 "math.sum": {
  "seriesReturning": true,
  "variadic": true
 },
 "math.tan": {
  "seriesReturning": true
 },
 "request.security": {
  "seriesReturning": true
 },
 "request.security_lower_tf": {
  "seriesReturning": true
 },
 "str.format": {
  "variadic": true
 },
 "ta.atr": {
  "seriesReturning": true
 },
 "ta.bb": {
  "seriesReturning": true
 },
 "ta.bbw": {
  "seriesReturning": true
 },
 "ta.cci": {
  "seriesReturning": true
 },
 "ta.change": {
  "seriesReturning": true
 },
 "ta.correlation": {
  "seriesReturning": true
 },
 "ta.cross": {
  "seriesReturning": true
 },
 "ta.crossover": {
  "seriesReturning": true
 },
 "ta.crossunder": {
  "seriesReturning": true
 },
 "ta.dev": {
  "seriesReturning": true
 },
 "ta.dmi": {
  "seriesReturning": true
 },
 "ta.ema": {
  "seriesReturning": true
 },
 "ta.highest": {
  "seriesReturning": true
 },
 "ta.highestbars": {
  "seriesReturning": true
 },
 "ta.kc": {
  "seriesReturning": true
 },
 "ta.kcw": {
  "seriesReturning": true
 },
 "ta.linreg": {
  "seriesReturning": true
 },
 "ta.lowest": {
  "seriesReturning": true
 },
 "ta.lowestbars": {
  "seriesReturning": true
 },
 "ta.macd": {
  "seriesReturning": true
 },
 "ta.median": {
  "seriesReturning": true
 },
 "ta.mode": {
  "seriesReturning": true
 },
 "ta.mom": {
  "seriesReturning": true
 },
 "ta.percentile_linear_interpolation": {
  "seriesReturning": true
 },
 "ta.percentile_nearest_rank": {
  "seriesReturning": true
 },
 "ta.percentrank": {
  "seriesReturning": true
 },
 "ta.pivothigh": {
  "seriesReturning": true
 },
 "ta.pivotlow": {
  "seriesReturning": true
 },
 "ta.rma": {
  "seriesReturning": true
 },
 "ta.rsi": {
  "seriesReturning": true
 },
 "ta.sar": {
  "seriesReturning": true
 },
 "ta.sma": {
  "seriesReturning": true
 },
 "ta.stdev": {
  "seriesReturning": true
 },
 "ta.stoch": {
  "seriesReturning": true
 },
 "ta.supertrend": {
  "seriesReturning": true
 },
 "ta.swma": {
  "seriesReturning": true
 },
 "ta.tr": {
  "seriesReturning": true
 },
 "ta.variance": {
  "seriesReturning": true
 },
 "ta.vwap": {
  "seriesReturning": true
 },
 "ta.vwma": {
  "seriesReturning": true
 },
 "ta.wma": {
  "seriesReturning": true
 },
 "alertcondition": {
  "topLevelOnly": true
 },
 "barcolor": {
  "topLevelOnly": true
 },
 "bgcolor": {
  "topLevelOnly": true
 },
 "fill": {
  "topLevelOnly": true
 },
 "hline": {
  "topLevelOnly": true
 },
 "indicator": {
  "topLevelOnly": true
 },
 "library": {
  "topLevelOnly": true
 },
 "plot": {
  "topLevelOnly": true
 },
 "plotarrow": {
  "topLevelOnly": true
 },
 "plotbar": {
  "topLevelOnly": true
 },
 "plotcandle": {
  "topLevelOnly": true
 },
 "plotchar": {
  "topLevelOnly": true
 },
 "plotshape": {
  "topLevelOnly": true
 },
 "strategy": {
  "topLevelOnly": true
 }
};

// Quick lookup helpers
export const TOP_LEVEL_ONLY_FUNCTIONS = new Set(["indicator","strategy","library","plot","plotshape","plotchar","plotcandle","plotbar","plotarrow","bgcolor","barcolor","fill","hline","alertcondition"]);
export const SERIES_RETURNING_FUNCTIONS = new Set(["ta.sma","ta.ema","ta.wma","ta.vwma","ta.rma","ta.swma","ta.rsi","ta.macd","ta.stoch","ta.cci","ta.atr","ta.tr","ta.highest","ta.lowest","ta.highestbars","ta.lowestbars","ta.crossover","ta.crossunder","ta.cross","ta.change","ta.mom","ta.dev","ta.variance","ta.stdev","ta.correlation","ta.linreg","ta.median","ta.mode","ta.percentile_linear_interpolation","ta.percentile_nearest_rank","ta.percentrank","ta.pivothigh","ta.pivotlow","ta.sar","ta.supertrend","ta.vwap","ta.bb","ta.bbw","ta.kc","ta.kcw","ta.dmi","math.abs","math.max","math.min","math.avg","math.sum","math.log","math.log10","math.exp","math.sqrt","math.pow","math.round","math.floor","math.ceil","math.sign","math.sin","math.cos","math.tan","math.asin","math.acos","math.atan","request.security","request.security_lower_tf"]);
export const VARIADIC_FUNCTIONS = new Set(["math.max","math.min","math.avg","math.sum","array.from","str.format"]);
