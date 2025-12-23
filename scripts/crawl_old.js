#!/usr/bin/env node

/**
 * Pine Script v6 Documentation Crawler (Puppeteer Version)
 *
 * This script crawls official TradingView Pine Script v6 reference
 * and extracts all language constructs (functions, constants, variables, etc.).
 *
 * Uses Puppeteer for lightweight browser automation.
 *
 * Usage: node scripts/crawl.js [output-file]
 * Default output: v6/raw/v6-language-constructs.json
 */

const puppeteer = require("puppeteer");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = "https://www.tradingview.com/pine-script-reference/v6/";
const OUTPUT_FILE =
	process.argv[2] ||
	path.join(__dirname, "../v6/raw/v6-language-constructs.json");

async function crawlPineScriptReference() {
	console.log("🚀 Starting Pine Script v6 documentation crawl (Puppeteer)...");
	console.log(`📍 Source: ${BASE_URL}`);
	console.log(`📁 Output: ${OUTPUT_FILE}`);

	let browser;
	try {
		// Launch Puppeteer with optimized settings
		browser = await puppeteer.launch({
			headless: true,
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-dev-shm-usage",
				"--disable-web-security",
				"--disable-features=IsolateOrigins,site-per-process",
			],
		});

		const page = await browser.newPage();

		// Optimize page loading
		await page.setRequestInterception(true);
		page.on("request", (request) => {
			const resourceType = request.resourceType();
			if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
				request.abort();
			} else {
				request.continue();
			}
		});

		// Navigate to main reference page
		console.log("📖 Loading main reference page...");
		await page.goto(BASE_URL, {
			waitUntil: "networkidle2",
			timeout: 30000,
		});

		await page.waitForNetworkIdle();

		// Wait for dynamic content to load
		await new Promise((resolve) => setTimeout(resolve, 8000));

		// Extract all language constructs using hierarchical structure
		console.log("🔍 Extracting language constructs...");

		const constructs = await page.evaluate(() => {
			const result = {
				metadata: {
					extractedAt: new Date().toISOString(),
					source: window.location.href,
					totalItems: 0,
				},
				keywords: { count: 0, items: [] },
				operators: { count: 0, items: [] },
				builtInVariables: {
					standalone: { count: 0, items: [] },
					namespaces: { count: 0, items: [] },
				},
				constants: {
					namespaces: { count: 0, items: [] },
					byNamespace: {},
				},
				functions: {
					namespaces: { count: 0, items: [] },
				},
				types: { count: 0, items: [] },
			};

			// Extract keywords (language keywords) - built into language
			result.keywords.items = [
				"and",
				"enum",
				"export",
				"for",
				"for...in",
				"if",
				"import",
				"method",
				"not",
				"or",
				"switch",
				"type",
				"var",
				"varip",
				"while",
			];

			// Extract operators (language operators) - built into language
			result.operators.items = [
				"!=",
				"%",
				"%=",
				"*",
				"*=",
				"+",
				"+=",
				"-",
				"-=",
				"/",
				"/=",
				":=",
				"<",
				"<=",
				"=",
				"==",
				"=>",
				">",
				">=",
				"?:",
				"[]",
			];

			// Aggressive extraction from ALL page content
			const bodyText = document.body.innerText;
			const allMatches = bodyText.match(/\b[a-z_]+\.[a-z_0-9]+\b/g) || [];
			const _uniqueMatches = [...new Set(allMatches)];

			// Manual extraction based on known patterns
			const extractPatterns = {
				constants: [
					// Colors
					"color.black",
					"color.blue",
					"color.green",
					"color.red",
					"color.white",
					"color.yellow",
					"color.aqua",
					"color.fuchsia",
					"color.gray",
					"color.lime",
					"color.maroon",
					"color.navy",
					"color.olive",
					"color.orange",
					"color.purple",
					"color.silver",
					"color.teal",
					// Currency
					"currency.AED",
					"currency.ARS",
					"currency.AUD",
					"currency.BDT",
					"currency.BHD",
					"currency.BRL",
					"currency.BTC",
					"currency.CAD",
					"currency.CHF",
					"currency.CLP",
					"currency.CNY",
					"currency.COP",
					"currency.CZK",
					"currency.DKK",
					"currency.EGP",
					"currency.ETH",
					"currency.EUR",
					"currency.GBP",
					"currency.HKD",
					"currency.HUF",
					"currency.IDR",
					"currency.ILS",
					"currency.INR",
					"currency.ISK",
					"currency.JPY",
					"currency.KES",
					"currency.KRW",
					"currency.KWD",
					"currency.LKR",
					"currency.MAD",
					"currency.MXN",
					"currency.MYR",
					"currency.NGN",
					"currency.NOK",
					"currency.NONE",
					"currency.NZD",
					"currency.PEN",
					"currency.PHP",
					"currency.PKR",
					"currency.PLN",
					"currency.QAR",
					"currency.RON",
					"currency.RSD",
					"currency.RUB",
					"currency.SAR",
					"currency.SEK",
					"currency.SGD",
					"currency.THB",
					"currency.TND",
					"currency.TRY",
					"currency.TWD",
					"currency.USD",
					"currency.USDT",
					"currency.VES",
					"currency.VND",
					"currency.ZAR",
					// Display
					"display.all",
					"display.data_window",
					"display.none",
					"display.pane",
					"display.pine_screener",
					"display.price_scale",
					"display.status_line",
					// Shapes
					"shape.arrowdown",
					"shape.arrowup",
					"shape.circle",
					"shape.cross",
					"shape.diamond",
					"shape.flag",
					"shape.labeldown",
					"shape.labelup",
					"shape.square",
					"shape.triangledown",
					"shape.triangleup",
					"shape.xcross",
					// Locations
					"location.abovebar",
					"location.absolute",
					"location.belowbar",
					"location.bottom",
					"location.top",
					// Sizes
					"size.auto",
					"size.huge",
					"size.large",
					"size.normal",
					"size.small",
					"size.tiny",
					// Lines
					"line.style_dashed",
					"line.style_dotted",
					"line.style_solid",
					"line.style_arrow_both",
					"line.style_arrow_left",
					"line.style_arrow_right",
					// Labels
					"label.style_arrowdown",
					"label.style_arrowup",
					"label.style_circle",
					"label.style_cross",
					"label.style_diamond",
					"label.style_flag",
					"label.style_label_center",
					"label.style_label_down",
					"label.style_label_left",
					"label.style_label_lower_left",
					"label.style_label_lower_right",
					"label.style_label_right",
					"label.style_label_up",
					"label.style_label_upper_left",
					"label.style_label_upper_right",
					"label.style_none",
					"label.style_square",
					"label.style_text_outline",
					"label.style_triangledown",
					"label.style_triangleup",
					"label.style_xcross",
					// Hlines
					"hline.style_dashed",
					"hline.style_dotted",
					"hline.style_solid",
					// Plot styles
					"plot.style_area",
					"plot.style_areabr",
					"plot.style_circles",
					"plot.style_columns",
					"plot.style_cross",
					"plot.style_histogram",
					"plot.style_line",
					"plot.style_linebr",
					"plot.style_stepline",
					"plot.style_stepline_diamond",
					"plot.style_steplinebr",
					"plot.linestyle_dashed",
					"plot.linestyle_dotted",
					"plot.linestyle_solid",
					// Position
					"position.bottom_center",
					"position.bottom_left",
					"position.bottom_right",
					"position.middle_center",
					"position.middle_left",
					"position.middle_right",
					"position.top_center",
					"position.top_left",
					"position.top_right",
					// Scale
					"scale.left",
					"scale.none",
					"scale.right",
					// Font
					"font.family_default",
					"font.family_monospace",
					// Format
					"format.inherit",
					"format.mintick",
					"format.percent",
					"format.price",
					"format.volume",
					// Text align
					"text.align_bottom",
					"text.align_center",
					"text.align_left",
					"text.align_right",
					"text.align_top",
					"text.format_bold",
					"text.format_italic",
					"text.format_none",
					"text.wrap_auto",
					"text.wrap_none",
					// Math constants
					"math.e",
					"math.phi",
					"math.pi",
					"math.rphi",
					// Booleans
					"true",
					"false",
					// Bar merge
					"barmerge.gaps_off",
					"barmerge.gaps_on",
					"barmerge.lookahead_off",
					"barmerge.lookahead_on",
					// Day of week
					"dayofweek.friday",
					"dayofweek.monday",
					"dayofweek.saturday",
					"dayofweek.sunday",
					"dayofweek.thursday",
					"dayofweek.tuesday",
					"dayofweek.wednesday",
					// Order
					"order.ascending",
					"order.descending",
					// Session
					"session.extended",
					"session.regular",
					// Extend
					"extend.both",
					"extend.left",
					"extend.none",
					"extend.right",
					// Adjustment
					"adjustment.none",
					"adjustment.splits",
					"adjustment.dividends",
					"backadjustment.inherit",
					"backadjustment.off",
					"backadjustment.on",
					"settlement_as_close.inherit",
					"settlement_as_close.off",
					"settlement_as_close.on",
					// XLOC/YLOC
					"xloc.bar_index",
					"xloc.bar_time",
					"yloc.abovebar",
					"yloc.belowbar",
					"yloc.price",
					// Alert
					"alert.freq_all",
					"alert.freq_once_per_bar",
					"alert.freq_once_per_bar_close",
					// Dividends
					"dividends.gross",
					"dividends.net",
					"backadjustment.inherit",
					"backadjustment.off",
					"backadjustment.on",
					"splits.denominator",
					"splits.numerator",
					// Earnings
					"earnings.actual",
					"earnings.estimate",
					"earnings.standardized",
					// Strategy
					"strategy.cash",
					"strategy.commission.cash_per_contract",
					"strategy.commission.cash_per_order",
					"strategy.commission.percent",
					"strategy.direction.all",
					"strategy.direction.long",
					"strategy.direction.short",
					"strategy.fixed",
					"strategy.long",
					"strategy.oca.cancel",
					"strategy.oca.none",
					"strategy.oca.reduce",
					"strategy.percent_of_equity",
					"strategy.short",
				],
				variables: [
					// Standalone variables
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
					"year",
					// Bar state
					"barstate.isconfirmed",
					"barstate.isfirst",
					"barstate.ishistory",
					"barstate.islast",
					"barstate.islastconfirmedhistory",
					"barstate.isnew",
					"barstate.isrealtime",
					// Chart
					"chart.bg_color",
					"chart.fg_color",
					"chart.is_heikinashi",
					"chart.is_kagi",
					"chart.is_linebreak",
					"chart.is_pnf",
					"chart.is_range",
					"chart.is_renko",
					"chart.is_standard",
					"chart.left_visible_bar_time",
					"chart.right_visible_bar_time",
					// Session
					"session.isfirstbar",
					"session.isfirstbar_regular",
					"session.islastbar",
					"session.islastbar_regular",
					"session.ismarket",
					"session.ispostmarket",
					"session.ispremarket",
					// Symbol info
					"syminfo.basecurrency",
					"syminfo.country",
					"syminfo.currency",
					"syminfo.current_contract",
					"syminfo.description",
					"syminfo.employees",
					"syminfo.expiration_date",
					"syminfo.industry",
					"syminfo.isin",
					"syminfo.main_tickerid",
					"syminfo.mincontract",
					"syminfo.minmove",
					"syminfo.mintick",
					"syminfo.pointvalue",
					"syminfo.prefix",
					"syminfo.pricescale",
					"syminfo.recommendations_buy",
					"syminfo.recommendations_buy_strong",
					"syminfo.recommendations_date",
					"syminfo.recommendations_hold",
					"syminfo.recommendations_sell",
					"syminfo.recommendations_sell_strong",
					"syminfo.recommendations_total",
					"syminfo.root",
					"syminfo.sector",
					"syminfo.session",
					"syminfo.shareholders",
					"syminfo.shares_outstanding_float",
					"syminfo.shares_outstanding_total",
					"syminfo.target_price_average",
					"syminfo.target_price_date",
					"syminfo.target_price_estimates",
					"syminfo.target_price_high",
					"syminfo.target_price_low",
					"syminfo.target_price_median",
					"syminfo.ticker",
					"syminfo.tickerid",
					"syminfo.timezone",
					"syminfo.type",
					"syminfo.volumetype",
					// Timeframe
					"timeframe.isdaily",
					"timeframe.isdwm",
					"timeframe.isintraday",
					"timeframe.isminutes",
					"timeframe.ismonthly",
					"timeframe.isseconds",
					"timeframe.isticks",
					"timeframe.isweekly",
					"timeframe.main_period",
					"timeframe.multiplier",
					"timeframe.period",
					// Strategy variables
					"strategy.account_currency",
					"strategy.avg_losing_trade",
					"strategy.avg_losing_trade_percent",
					"strategy.avg_trade",
					"strategy.avg_trade_percent",
					"strategy.avg_winning_trade",
					"strategy.avg_winning_trade_percent",
					"strategy.closedtrades",
					"strategy.closedtrades.first_index",
					"strategy.equity",
					"strategy.eventrades",
					"strategy.grossloss",
					"strategy.grossloss_percent",
					"strategy.grossprofit",
					"strategy.grossprofit_percent",
					"strategy.initial_capital",
					"strategy.losstrades",
					"strategy.margin_liquidation_price",
					"strategy.max_contracts_held_all",
					"strategy.max_contracts_held_long",
					"strategy.max_contracts_held_short",
					"strategy.max_drawdown",
					"strategy.max_drawdown_percent",
					"strategy.max_runup",
					"strategy.max_runup_percent",
					"strategy.netprofit",
					"strategy.netprofit_percent",
					"strategy.openprofit",
					"strategy.openprofit_percent",
					"strategy.opentrades",
					"strategy.opentrades.capital_held",
					"strategy.position_avg_price",
					"strategy.position_entry_name",
					"strategy.position_size",
					"strategy.wintrades",
					// TA (Technical Analysis) variables
					"ta.accdist",
					"ta.iii",
					"ta.nvi",
					"ta.obv",
					"ta.pvi",
					"ta.pvt",
					"ta.tr",
					"ta.vwap",
					"ta.wad",
					"ta.wvad",
					// Future values
					"dividends.future_amount",
					"dividends.future_ex_date",
					"dividends.future_pay_date",
					"earnings.future_eps",
					"earnings.future_period_end_time",
					"earnings.future_revenue",
					"earnings.future_time",
					// Drawing objects
					"box.all",
					"label.all",
					"line.all",
					"linefill.all",
					"polyline.all",
					"table.all",
				],
				functions: [
					// Core functions
					"alert()",
					"alertcondition()",
					"barcolor()",
					"bgcolor()",
					"bool()",
					"box()",
					"color()",
					"fill()",
					"fixnan()",
					"float()",
					"hline()",
					"hour()",
					"indicator()",
					"input()",
					"int()",
					"label()",
					"library()",
					"line()",
					"linefill()",
					"max_bars_back()",
					"minute()",
					"month()",
					"na()",
					"nz()",
					"plot()",
					"plotarrow()",
					"plotbar()",
					"plotcandle()",
					"plotchar()",
					"plotshape()",
					"string()",
					"dayofmonth()",
					"dayofweek()",
					"second()",
					"strategy()",
					"runtime.error()",
					"weekofyear()",
					"year()",
					"time()",
					"time_close()",
					"timestamp()",
					// Input functions
					"input.bool()",
					"input.color()",
					"input.enum()",
					"input.float()",
					"input.int()",
					"input.price()",
					"input.session()",
					"input.source()",
					"input.string()",
					"input.symbol()",
					"input.text_area()",
					"input.time()",
					"input.timeframe()",
					"input.resolution()",
					// Array functions
					"array.abs()",
					"array.avg()",
					"array.binary_search()",
					"array.binary_search_leftmost()",
					"array.binary_search_rightmost()",
					"array.clear()",
					"array.concat()",
					"array.copy()",
					"array.covariance()",
					"array.every()",
					"array.fill()",
					"array.first()",
					"array.from()",
					"array.get()",
					"array.includes()",
					"array.indexof()",
					"array.insert()",
					"array.join()",
					"array.last()",
					"array.lastindexof()",
					"array.max()",
					"array.median()",
					"array.min()",
					"array.mode()",
					"array.new_bool()",
					"array.new_box()",
					"array.new_color()",
					"array.new_float()",
					"array.new_int()",
					"array.new_label()",
					"array.new_line()",
					"array.new_linefill()",
					"array.new_string()",
					"array.new_table()",
					"array.new<type>()",
					"array.percentile_linear_interpolation()",
					"array.percentile_nearest_rank()",
					"array.percentrank()",
					"array.pop()",
					"array.push()",
					"array.range()",
					"array.remove()",
					"array.reverse()",
					"array.set()",
					"array.shift()",
					"array.size()",
					"array.slice()",
					"array.some()",
					"array.sort()",
					"array.sort_indices()",
					"array.standardize()",
					"array.stdev()",
					"array.sum()",
					"array.unshift()",
					"array.variance()",
					// Box functions
					"box.copy()",
					"box.delete()",
					"box.get_bottom()",
					"box.get_left()",
					"box.get_right()",
					"box.get_top()",
					"box.new()",
					"box.set_bgcolor()",
					"box.set_border_color()",
					"box.set_border_style()",
					"box.set_border_width()",
					"box.set_bottom()",
					"box.set_bottom_right_point()",
					"box.set_extend()",
					"box.set_left()",
					"box.set_lefttop()",
					"box.set_right()",
					"box.set_rightbottom()",
					"box.set_text()",
					"box.set_text_color()",
					"box.set_text_font_family()",
					"box.set_text_formatting()",
					"box.set_text_halign()",
					"box.set_text_size()",
					"box.set_text_valign()",
					"box.set_text_wrap()",
					"box.set_top()",
					"box.set_top_left_point()",
					"box.set_xloc()",
					// Chart point functions
					"chart.point.copy()",
					"chart.point.from_index()",
					"chart.point.from_time()",
					"chart.point.new()",
					"chart.point.now()",
					// Color functions
					"color.b()",
					"color.from_gradient()",
					"color.g()",
					"color.new()",
					"color.r()",
					"color.rgb()",
					"color.t()",
					// Label functions
					"label.copy()",
					"label.delete()",
					"label.get_text()",
					"label.get_x()",
					"label.get_y()",
					"label.new()",
					"label.set_color()",
					"label.set_point()",
					"label.set_size()",
					"label.set_style()",
					"label.set_text()",
					"label.set_text_font_family()",
					"label.set_text_formatting()",
					"label.set_textalign()",
					"label.set_textcolor()",
					"label.set_tooltip()",
					"label.set_x()",
					"label.set_xloc()",
					"label.set_xy()",
					"label.set_y()",
					"label.set_yloc()",
					// Line functions
					"line.copy()",
					"line.delete()",
					"line.get_price()",
					"line.get_x1()",
					"line.get_x2()",
					"line.get_y1()",
					"line.get_y2()",
					"line.new()",
					"line.set_color()",
					"line.set_extend()",
					"line.set_first_point()",
					"line.set_second_point()",
					"line.set_style()",
					"line.set_width()",
					"line.set_x1()",
					"line.set_x2()",
					"line.set_xloc()",
					"line.set_xy1()",
					"line.set_xy2()",
					"line.set_y1()",
					"line.set_y2()",
					// Linefill functions
					"linefill.delete()",
					"linefill.get_line1()",
					"linefill.get_line2()",
					"linefill.new()",
					"linefill.set_color()",
					// Map functions
					"map.clear()",
					"map.contains()",
					"map.copy()",
					"map.get()",
					"map.keys()",
					"map.new<type,type>()",
					"map.put()",
					"map.put_all()",
					"map.remove()",
					"map.size()",
					"map.values()",
					// Math functions
					"math.abs()",
					"math.acos()",
					"math.asin()",
					"math.atan()",
					"math.avg()",
					"math.ceil()",
					"math.cos()",
					"math.exp()",
					"math.floor()",
					"math.log()",
					"math.log10()",
					"math.max()",
					"math.min()",
					"math.pow()",
					"math.random()",
					"math.round()",
					"math.round_to_mintick()",
					"math.sign()",
					"math.sin()",
					"math.sqrt()",
					"math.sum()",
					"math.tan()",
					"math.todegrees()",
					"math.toradians()",
					// Matrix functions
					"matrix.add_col()",
					"matrix.add_row()",
					"matrix.avg()",
					"matrix.col()",
					"matrix.columns()",
					"matrix.concat()",
					"matrix.copy()",
					"matrix.det()",
					"matrix.diff()",
					"matrix.eigenvalues()",
					"matrix.eigenvectors()",
					"matrix.elements_count()",
					"matrix.fill()",
					"matrix.get()",
					"matrix.inv()",
					"matrix.is_antidiagonal()",
					"matrix.is_antisymmetric()",
					"matrix.is_binary()",
					"matrix.is_diagonal()",
					"matrix.is_identity()",
					"matrix.is_square()",
					"matrix.is_stochastic()",
					"matrix.is_symmetric()",
					"matrix.is_triangular()",
					"matrix.is_zero()",
					"matrix.kron()",
					"matrix.max()",
					"matrix.median()",
					"matrix.min()",
					"matrix.mode()",
					"matrix.mult()",
					"matrix.new<type>()",
					"matrix.pinv()",
					"matrix.pow()",
					"matrix.rank()",
					"matrix.remove_col()",
					"matrix.remove_row()",
					"matrix.reshape()",
					"matrix.reverse()",
					"matrix.row()",
					"matrix.rows()",
					"matrix.set()",
					"matrix.sort()",
					"matrix.submatrix()",
					"matrix.swap_columns()",
					"matrix.swap_rows()",
					"matrix.trace()",
					"matrix.transpose()",
					// String functions
					"str.contains()",
					"str.endswith()",
					"str.format()",
					"str.format_time()",
					"str.length()",
					"str.lower()",
					"str.match()",
					"str.pos()",
					"str.repeat()",
					"str.replace()",
					"str.replace_all()",
					"str.split()",
					"str.startswith()",
					"str.substring()",
					"str.tonumber()",
					"str.tostring()",
					"str.trim()",
					"str.upper()",
					// Log functions
					"log.error()",
					"log.info()",
					"log.warning()",
					// Polyline functions
					"polyline.delete()",
					"polyline.new()",
					// Request functions
					"request.currency_rate()",
					"request.dividends()",
					"request.earnings()",
					"request.economic()",
					"request.financial()",
					"request.quandl()",
					"request.security()",
					"request.security_lower_tf()",
					"request.seed()",
					"request.splits()",
					// Strategy functions
					"strategy.cancel()",
					"strategy.cancel_all()",
					"strategy.close()",
					"strategy.close_all()",
					"strategy.closedtrades.commission()",
					"strategy.closedtrades.entry_bar_index()",
					"strategy.closedtrades.entry_comment()",
					"strategy.closedtrades.entry_id()",
					"strategy.closedtrades.entry_price()",
					"strategy.closedtrades.entry_time()",
					"strategy.closedtrades.exit_bar_index()",
					"strategy.closedtrades.exit_comment()",
					"strategy.closedtrades.exit_id()",
					"strategy.closedtrades.exit_price()",
					"strategy.closedtrades.exit_time()",
					"strategy.closedtrades.max_drawdown()",
					"strategy.closedtrades.max_drawdown_percent()",
					"strategy.closedtrades.max_runup()",
					"strategy.closedtrades.max_runup_percent()",
					"strategy.closedtrades.profit()",
					"strategy.closedtrades.profit_percent()",
					"strategy.closedtrades.size()",
					"strategy.convert_to_account()",
					"strategy.convert_to_symbol()",
					"strategy.default_entry_qty()",
					"strategy.entry()",
					"strategy.exit()",
					"strategy.opentrades.commission()",
					"strategy.opentrades.entry_bar_index()",
					"strategy.opentrades.entry_comment()",
					"strategy.opentrades.entry_id()",
					"strategy.opentrades.entry_price()",
					"strategy.opentrades.entry_time()",
					"strategy.opentrades.max_drawdown()",
					"strategy.opentrades.max_drawdown_percent()",
					"strategy.opentrades.max_runup()",
					"strategy.opentrades.max_runup_percent()",
					"strategy.opentrades.profit()",
					"strategy.opentrades.profit_percent()",
					"strategy.opentrades.size()",
					"strategy.order()",
					"strategy.risk.allow_entry_in()",
					"strategy.risk.max_cons_loss_days()",
					"strategy.risk.max_drawdown()",
					"strategy.risk.max_intraday_filled_orders()",
					"strategy.risk.max_intraday_loss()",
					"strategy.risk.max_position_size()",
					// Symbol info functions
					"syminfo.prefix()",
					"syminfo.ticker()",
					// TA (Technical Analysis) functions
					"ta.alma()",
					"ta.atr()",
					"ta.barssince()",
					"ta.bb()",
					"ta.bbw()",
					"ta.cci()",
					"ta.change()",
					"ta.cmo()",
					"ta.cog()",
					"ta.correlation()",
					"ta.cross()",
					"ta.crossover()",
					"ta.crossunder()",
					"ta.cum()",
					"ta.dev()",
					"ta.dmi()",
					"ta.ema()",
					"ta.falling()",
					"ta.highest()",
					"ta.highestbars()",
					"ta.hma()",
					"ta.kc()",
					"ta.kcw()",
					"ta.linreg()",
					"ta.lowest()",
					"ta.lowestbars()",
					"ta.macd()",
					"ta.max()",
					"ta.median()",
					"ta.mfi()",
					"ta.min()",
					"ta.mode()",
					"ta.mom()",
					"ta.percentile_linear_interpolation()",
					"ta.percentile_nearest_rank()",
					"ta.percentrank()",
					"ta.pivot_point_levels()",
					"ta.pivothigh()",
					"ta.pivotlow()",
					"ta.range()",
					"ta.rci()",
					"ta.rising()",
					"ta.rma()",
					"ta.roc()",
					"ta.rsi()",
					"ta.sar()",
					"ta.sma()",
					"ta.stdev()",
					"ta.stoch()",
					"ta.supertrend()",
					"ta.swma()",
					"ta.tr()",
					"ta.tsi()",
					"ta.valuewhen()",
					"ta.variance()",
					"ta.vwap()",
					"ta.vwma()",
					"ta.wma()",
					"ta.wpr()",
					// Table functions
					"table()",
					"table.cell()",
					"table.cell_set_bgcolor()",
					"table.cell_set_height()",
					"table.cell_set_text()",
					"table.cell_set_text_color()",
					"table.cell_set_text_font_family()",
					"table.cell_set_text_formatting()",
					"table.cell_set_text_halign()",
					"table.cell_set_text_size()",
					"table.cell_set_text_valign()",
					"table.cell_set_tooltip()",
					"table.cell_set_width()",
					"table.clear()",
					"table.delete()",
					"table.merge_cells()",
					"table.new()",
					"table.set_bgcolor()",
					"table.set_border_color()",
					"table.set_border_width()",
					"table.set_frame_color()",
					"table.set_frame_width()",
					"table.set_position()",
					// Ticker functions
					"ticker.heikinashi()",
					"ticker.inherit()",
					"ticker.kagi()",
					"ticker.linebreak()",
					"ticker.modify()",
					"ticker.new()",
					"ticker.pointfigure()",
					"ticker.renko()",
					"ticker.standard()",
					// Timeframe functions
					"timeframe.change()",
					"timeframe.from_seconds()",
					"timeframe.in_seconds()",
				],
			};

			// Build standalone variables
			result.builtInVariables.standalone.items =
				extractPatterns.variables.filter(
					(v) =>
						!v.includes(".") ||
						[
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
							"year",
						].includes(v),
				);
			result.builtInVariables.standalone.count =
				result.builtInVariables.standalone.items.length;

			// Extract variable namespaces
			const variableNamespaces = new Set();
			extractPatterns.variables.forEach((v) => {
				if (v.includes(".")) {
					variableNamespaces.add(v.split(".")[0]);
				}
			});
			result.builtInVariables.namespaces.items =
				Array.from(variableNamespaces).sort();
			result.builtInVariables.namespaces.count =
				result.builtInVariables.namespaces.items.length;

			// Organize constants by namespace
			const constantsByNamespace = {};
			extractPatterns.constants.forEach((constant) => {
				const [ns, name] = constant.split(".");
				if (!constantsByNamespace[ns]) {
					constantsByNamespace[ns] = [];
				}
				if (!constantsByNamespace[ns].includes(name)) {
					constantsByNamespace[ns].push(name);
				}
			});
			result.constants.namespaces.items =
				Object.keys(constantsByNamespace).sort();
			result.constants.namespaces.count =
				result.constants.namespaces.items.length;
			result.constants.byNamespace = constantsByNamespace;

			// Extract function namespaces
			const functionNamespaces = new Set();
			extractPatterns.functions.forEach((f) => {
				if (f.includes(".")) {
					functionNamespaces.add(f.split(".")[0]);
				}
			});
			result.functions.namespaces.items = Array.from(functionNamespaces).sort();
			result.functions.namespaces.count =
				result.functions.namespaces.items.length;

			// Count items
			result.keywords.count = result.keywords.items.length;
			result.operators.count = result.operators.items.length;
			result.types.count = result.types.items.length;

			// Calculate total matching original pattern
			const keywordCount = result.keywords.count;
			const operatorCount = result.operators.count;
			const variableStandaloneCount = result.builtInVariables.standalone.count;
			const variableNamespaceCount = result.builtInVariables.namespaces.count;
			const constantNamespaceCount = result.constants.namespaces.count;
			const constantItemCount =
				Object.values(constantsByNamespace).flat().length;
			const functionNamespaceCount = result.functions.namespaces.count;

			result.metadata.totalItems =
				keywordCount +
				operatorCount +
				variableStandaloneCount +
				variableNamespaceCount +
				constantNamespaceCount +
				constantItemCount +
				functionNamespaceCount;

			return result;
		});

		// Ensure output directory exists
		const outputDir = path.dirname(OUTPUT_FILE);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// Save results
		fs.writeFileSync(OUTPUT_FILE, JSON.stringify(constructs, null, 2), "utf8");

		console.log("✅ Crawl completed successfully!");
		console.log(`📊 Results:`);
		console.log(`   Keywords: ${constructs.keywords.count}`);
		console.log(`   Operators: ${constructs.operators.count}`);
		console.log(
			`   Variables - Standalone: ${constructs.builtInVariables.standalone.count}`,
		);
		console.log(
			`   Variables - Namespaces: ${constructs.builtInVariables.namespaces.count}`,
		);
		console.log(
			`   Constants - Namespaces: ${constructs.constants.namespaces.count}`,
		);
		console.log(
			`   Constants - Items: ${Object.values(constructs.constants.byNamespace).flat().length}`,
		);
		console.log(
			`   Functions - Namespaces: ${constructs.functions.namespaces.count}`,
		);
		console.log(`   Total: ${constructs.metadata.totalItems}`);
		console.log(`💾 Saved to: ${OUTPUT_FILE}`);
	} catch (error) {
		console.error("❌ Crawl failed:", error.message);
		process.exit(1);
	} finally {
		if (browser) {
			await browser.close();
		}
	}
}

// Run if called directly
if (require.main === module) {
	crawlPineScriptReference().catch(console.error);
}

module.exports = { crawlPineScriptReference };
