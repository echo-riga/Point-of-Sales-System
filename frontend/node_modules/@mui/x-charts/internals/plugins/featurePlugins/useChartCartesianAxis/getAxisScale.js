"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.applyDomainLimit = applyDomainLimit;
exports.getActualAxisExtrema = getActualAxisExtrema;
exports.getDomainLimit = getDomainLimit;
exports.getXAxesScales = getXAxesScales;
exports.getYAxesScales = getYAxesScales;
var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));
var _d3Scale = require("@mui/x-charts-vendor/d3-scale");
var _axis = require("../../../../models/axis");
var _zoom = require("./zoom");
var _getAxisDomainLimit = require("./getAxisDomainLimit");
var _ticks = require("../../../ticks");
var _getScale = require("../../../getScale");
var _getAxisExtrema = require("./getAxisExtrema");
const DEFAULT_CATEGORY_GAP_RATIO = 0.2;
function getRange(drawingArea, axisDirection, axis) {
  const range = axisDirection === 'x' ? [drawingArea.left, drawingArea.left + drawingArea.width] : [drawingArea.top + drawingArea.height, drawingArea.top];
  return axis.reverse ? [range[1], range[0]] : range;
}
function getXAxesScales({
  drawingArea,
  formattedSeries,
  axis: axes = [],
  seriesConfig,
  zoomMap,
  preferStrictDomainInLineCharts
}) {
  const scales = {};
  axes.forEach((eachAxis, axisIndex) => {
    const axis = eachAxis;
    const zoom = zoomMap?.get(axis.id);
    scales[axis.id] = getAxisScale(axis, 'x', zoom, drawingArea, seriesConfig, axisIndex, formattedSeries, preferStrictDomainInLineCharts);
  });
  return scales;
}
function getYAxesScales({
  drawingArea,
  formattedSeries,
  axis: axes = [],
  seriesConfig,
  zoomMap,
  preferStrictDomainInLineCharts
}) {
  const scales = {};
  axes.forEach((eachAxis, axisIndex) => {
    const axis = eachAxis;
    const zoom = zoomMap?.get(axis.id);
    scales[axis.id] = getAxisScale(axis, 'y', zoom, drawingArea, seriesConfig, axisIndex, formattedSeries, preferStrictDomainInLineCharts);
  });
  return scales;
}
function getAxisScale(axis, axisDirection, zoom, drawingArea, seriesConfig, axisIndex, formattedSeries,
/**
 * @deprecated To remove in v9. This is an experimental feature to avoid breaking change.
 */
preferStrictDomainInLineCharts) {
  const zoomRange = zoom ? [zoom.start, zoom.end] : [0, 100];
  const range = getRange(drawingArea, axisDirection, axis);
  if ((0, _axis.isBandScaleConfig)(axis)) {
    const categoryGapRatio = axis.categoryGapRatio ?? DEFAULT_CATEGORY_GAP_RATIO;
    // Reverse range because ordinal scales are presented from top to bottom on y-axis
    const scaleRange = axisDirection === 'y' ? [range[1], range[0]] : range;
    const zoomedRange = (0, _zoom.zoomScaleRange)(scaleRange, zoomRange);
    return {
      scale: (0, _d3Scale.scaleBand)(axis.data, zoomedRange).paddingInner(categoryGapRatio).paddingOuter(categoryGapRatio / 2)
    };
  }
  if ((0, _axis.isPointScaleConfig)(axis)) {
    const scaleRange = axisDirection === 'y' ? [...range].reverse() : range;
    const zoomedRange = (0, _zoom.zoomScaleRange)(scaleRange, zoomRange);
    return {
      scale: (0, _d3Scale.scalePoint)(axis.data, zoomedRange)
    };
  }
  const scaleType = axis.scaleType ?? 'linear';
  const domainLimit = getDomainLimit(axis, axisDirection, axisIndex, formattedSeries, preferStrictDomainInLineCharts);
  const [minData, maxData] = (0, _getAxisExtrema.getAxisExtrema)(axis, axisDirection, seriesConfig, axisIndex, formattedSeries);
  const axisExtrema = getActualAxisExtrema(axis, minData, maxData);
  if (typeof domainLimit === 'function') {
    const {
      min,
      max
    } = domainLimit(minData, maxData);
    axisExtrema[0] = min;
    axisExtrema[1] = max;
  }
  const rawTickNumber = (0, _ticks.getTickNumber)((0, _extends2.default)({}, axis, {
    range,
    domain: axisExtrema
  }));
  const zoomedRange = (0, _zoom.zoomScaleRange)(range, zoomRange);
  const scale = (0, _getScale.getScale)(scaleType, axisExtrema, zoomedRange);
  if ((0, _axis.isSymlogScaleConfig)(axis) && axis.constant != null) {
    scale.constant(axis.constant);
  }
  applyDomainLimit(scale, axis, domainLimit, rawTickNumber);
  return {
    scale,
    tickNumber: rawTickNumber
  };
}
function getDomainLimit(axis, axisDirection, axisIndex, formattedSeries, preferStrictDomainInLineCharts) {
  return preferStrictDomainInLineCharts ? (0, _getAxisDomainLimit.getAxisDomainLimit)(axis, axisDirection, axisIndex, formattedSeries) : axis.domainLimit ?? 'nice';
}
function applyDomainLimit(scale, axis, domainLimit, rawTickNumber) {
  if (domainLimit === 'nice') {
    scale.nice(rawTickNumber);
  }
  const [minDomain, maxDomain] = scale.domain();
  scale.domain([axis.min ?? minDomain, axis.max ?? maxDomain]);
}

/**
 * Get the actual axis extrema considering the user defined min and max values.
 * @param axisExtrema User defined axis extrema.
 * @param minData Minimum value from the data.
 * @param maxData Maximum value from the data.
 */
function getActualAxisExtrema(axisExtrema, minData, maxData) {
  let min = minData;
  let max = maxData;
  if (axisExtrema.max != null && axisExtrema.max.valueOf() < minData) {
    min = axisExtrema.max;
  }
  if (axisExtrema.min != null && axisExtrema.min.valueOf() > minData) {
    max = axisExtrema.min;
  }
  return [axisExtrema.min ?? min, axisExtrema.max ?? max];
}