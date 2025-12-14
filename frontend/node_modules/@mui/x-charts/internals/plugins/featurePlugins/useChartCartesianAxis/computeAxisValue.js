"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.computeAxisValue = computeAxisValue;
var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));
var _defaultValueFormatters = require("../../../defaultValueFormatters");
var _axis = require("../../../../models/axis");
var _colorScale = require("../../../colorScale");
var _ticks = require("../../../ticks");
var _getScale = require("../../../getScale");
var _dateHelpers = require("../../../dateHelpers");
var _getAxisExtrema = require("./getAxisExtrema");
var _getAxisTriggerTooltip = require("./getAxisTriggerTooltip");
var _getAxisScale = require("./getAxisScale");
var _scaleGuards = require("../../../scaleGuards");
function getRange(drawingArea, axisDirection,
// | 'rotation' | 'radius',
reverse) {
  const range = axisDirection === 'x' ? [drawingArea.left, drawingArea.left + drawingArea.width] : [drawingArea.top + drawingArea.height, drawingArea.top];
  return reverse ? [range[1], range[0]] : range;
}
const DEFAULT_CATEGORY_GAP_RATIO = 0.2;
const DEFAULT_BAR_GAP_RATIO = 0.1;
function computeAxisValue({
  scales,
  drawingArea,
  formattedSeries,
  axis: allAxis,
  seriesConfig,
  axisDirection,
  zoomMap,
  zoomOptions,
  getFilters,
  preferStrictDomainInLineCharts
}) {
  if (allAxis === undefined) {
    return {
      axis: {},
      axisIds: []
    };
  }
  const axisIdsTriggeringTooltip = (0, _getAxisTriggerTooltip.getAxisTriggerTooltip)(axisDirection, seriesConfig, formattedSeries, allAxis[0].id);
  const completeAxis = {};
  allAxis.forEach((eachAxis, axisIndex) => {
    const axis = eachAxis;
    const scaleDefinition = scales[axis.id];
    let scale = scaleDefinition.scale;
    const zoomOption = zoomOptions?.[axis.id];
    const zoom = zoomMap?.get(axis.id);
    const zoomRange = zoom ? [zoom.start, zoom.end] : [0, 100];
    const range = getRange(drawingArea, axisDirection, axis.reverse ?? false);
    const triggerTooltip = !axis.ignoreTooltip && axisIdsTriggeringTooltip.has(axis.id);
    const data = axis.data ?? [];
    if ((0, _scaleGuards.isOrdinalScale)(scale)) {
      // Reverse range because ordinal scales are presented from top to bottom on y-axis
      const scaleRange = axisDirection === 'y' ? [range[1], range[0]] : range;
      if ((0, _scaleGuards.isBandScale)(scale) && (0, _axis.isBandScaleConfig)(axis)) {
        const categoryGapRatio = axis.categoryGapRatio ?? DEFAULT_CATEGORY_GAP_RATIO;
        const barGapRatio = axis.barGapRatio ?? DEFAULT_BAR_GAP_RATIO;
        completeAxis[axis.id] = (0, _extends2.default)({
          offset: 0,
          height: 0,
          categoryGapRatio,
          barGapRatio,
          triggerTooltip
        }, axis, {
          data,
          scale,
          tickNumber: axis.data.length,
          colorScale: axis.colorMap && (axis.colorMap.type === 'ordinal' ? (0, _colorScale.getOrdinalColorScale)((0, _extends2.default)({
            values: axis.data
          }, axis.colorMap)) : (0, _colorScale.getColorScale)(axis.colorMap))
        });
      }
      if ((0, _axis.isPointScaleConfig)(axis)) {
        completeAxis[axis.id] = (0, _extends2.default)({
          offset: 0,
          height: 0,
          triggerTooltip
        }, axis, {
          data,
          scale,
          tickNumber: axis.data.length,
          colorScale: axis.colorMap && (axis.colorMap.type === 'ordinal' ? (0, _colorScale.getOrdinalColorScale)((0, _extends2.default)({
            values: axis.data
          }, axis.colorMap)) : (0, _colorScale.getColorScale)(axis.colorMap))
        });
      }
      if ((0, _dateHelpers.isDateData)(axis.data)) {
        const dateFormatter = (0, _dateHelpers.createDateFormatter)(axis.data, scaleRange, axis.tickNumber);
        completeAxis[axis.id].valueFormatter = axis.valueFormatter ?? dateFormatter;
      }
      return;
    }
    if (axis.scaleType === 'band' || axis.scaleType === 'point') {
      // Could be merged with the two previous "if conditions" but then TS does not get that `axis.scaleType` can't be `band` or `point`.
      return;
    }
    const rawTickNumber = scaleDefinition.tickNumber;
    const continuousAxis = axis;
    const scaleType = continuousAxis.scaleType ?? 'linear';
    const tickNumber = (0, _ticks.scaleTickNumberByRange)(rawTickNumber, zoomRange);
    const filter = zoom === undefined && !zoomOption ? getFilters : undefined; // Do not apply filtering if zoom is already defined.
    if (filter) {
      const [minData, maxData] = (0, _getAxisExtrema.getAxisExtrema)(axis, axisDirection, seriesConfig, axisIndex, formattedSeries, filter);
      scale = scale.copy();
      scale.domain([minData, maxData]);
      const domainLimit = (0, _getAxisScale.getDomainLimit)(axis, axisDirection, axisIndex, formattedSeries, preferStrictDomainInLineCharts);
      const axisExtrema = (0, _getAxisScale.getActualAxisExtrema)(axis, minData, maxData);
      if (typeof domainLimit === 'function') {
        const {
          min,
          max
        } = domainLimit(minData, maxData);
        axisExtrema[0] = min;
        axisExtrema[1] = max;
      }
      scale.domain(axisExtrema);
      (0, _getAxisScale.applyDomainLimit)(scale, axis, domainLimit, rawTickNumber);
    }
    completeAxis[axis.id] = (0, _extends2.default)({
      offset: 0,
      height: 0,
      triggerTooltip
    }, continuousAxis, {
      data,
      scaleType,
      scale,
      tickNumber,
      colorScale: continuousAxis.colorMap && (0, _colorScale.getSequentialColorScale)(continuousAxis.colorMap),
      valueFormatter: axis.valueFormatter ?? (0, _defaultValueFormatters.createScalarFormatter)(tickNumber, (0, _getScale.getScale)(scaleType, range.map(v => scale.invert(v)), range))
    });
  });
  return {
    axis: completeAxis,
    axisIds: allAxis.map(({
      id
    }) => id)
  };
}