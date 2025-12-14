"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.selectorChartZoomOptionsLookup = exports.selectorChartZoomMap = exports.selectorChartZoomIsInteracting = exports.selectorChartZoomAxisFilters = exports.selectorChartYScales = exports.selectorChartYAxis = exports.selectorChartXScales = exports.selectorChartXAxis = exports.selectorChartRawAxis = exports.selectorChartAxisZoomOptionsLookup = exports.selectorChartAxis = exports.createZoomMap = void 0;
var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));
var _useChartDimensions = require("../../corePlugins/useChartDimensions");
var _useChartSeries = require("../../corePlugins/useChartSeries");
var _selectors = require("../../utils/selectors");
var _computeAxisValue = require("./computeAxisValue");
var _createAxisFilterMapper = require("./createAxisFilterMapper");
var _createZoomLookup = require("./createZoomLookup");
var _useChartCartesianAxisLayout = require("./useChartCartesianAxisLayout.selectors");
var _useChartExperimentalFeature = require("../../corePlugins/useChartExperimentalFeature");
var _getAxisScale = require("./getAxisScale");
const createZoomMap = zoom => {
  const zoomItemMap = new Map();
  zoom.forEach(zoomItem => {
    zoomItemMap.set(zoomItem.axisId, zoomItem);
  });
  return zoomItemMap;
};
exports.createZoomMap = createZoomMap;
const selectorChartZoomState = state => state.zoom;

/**
 * Following selectors are not exported because they exist in the MIT chart only to ba able to reuse the Zoom state from the pro.
 */

const selectorChartZoomIsInteracting = exports.selectorChartZoomIsInteracting = (0, _selectors.createSelector)([selectorChartZoomState], zoom => zoom?.isInteracting);
const selectorChartZoomMap = exports.selectorChartZoomMap = (0, _selectors.createSelector)([selectorChartZoomState], zoom => zoom?.zoomData && createZoomMap(zoom?.zoomData));
const selectorChartZoomOptionsLookup = exports.selectorChartZoomOptionsLookup = (0, _selectors.createSelector)([_useChartCartesianAxisLayout.selectorChartRawXAxis, _useChartCartesianAxisLayout.selectorChartRawYAxis], (xAxis, yAxis) => (0, _extends2.default)({}, (0, _createZoomLookup.createZoomLookup)('x')(xAxis), (0, _createZoomLookup.createZoomLookup)('y')(yAxis)));
const selectorChartAxisZoomOptionsLookup = exports.selectorChartAxisZoomOptionsLookup = (0, _selectors.createSelector)([selectorChartZoomOptionsLookup, (_, axisId) => axisId], (axisLookup, axisId) => axisLookup[axisId]);
const selectorChartXFilter = (0, _selectors.createSelector)([selectorChartZoomMap, selectorChartZoomOptionsLookup], (zoomMap, zoomOptions) => zoomMap && zoomOptions && (0, _createAxisFilterMapper.createAxisFilterMapper)(zoomMap, zoomOptions, 'x'));
const selectorChartYFilter = (0, _selectors.createSelector)([selectorChartZoomMap, selectorChartZoomOptionsLookup], (zoomMap, zoomOptions) => zoomMap && zoomOptions && (0, _createAxisFilterMapper.createAxisFilterMapper)(zoomMap, zoomOptions, 'y'));
const selectorChartXScales = exports.selectorChartXScales = (0, _selectors.createSelector)([_useChartCartesianAxisLayout.selectorChartRawXAxis, _useChartDimensions.selectorChartDrawingArea, _useChartSeries.selectorChartSeriesProcessed, _useChartSeries.selectorChartSeriesConfig, selectorChartZoomMap, _useChartExperimentalFeature.selectorPreferStrictDomainInLineCharts], function selectorChartXScales(axis, drawingArea, formattedSeries, seriesConfig, zoomMap, preferStrictDomainInLineCharts) {
  return (0, _getAxisScale.getXAxesScales)({
    drawingArea,
    formattedSeries,
    axis,
    seriesConfig,
    zoomMap,
    preferStrictDomainInLineCharts
  });
});
const selectorChartYScales = exports.selectorChartYScales = (0, _selectors.createSelector)([_useChartCartesianAxisLayout.selectorChartRawYAxis, _useChartDimensions.selectorChartDrawingArea, _useChartSeries.selectorChartSeriesProcessed, _useChartSeries.selectorChartSeriesConfig, selectorChartZoomMap, _useChartExperimentalFeature.selectorPreferStrictDomainInLineCharts], function selectorChartYScales(axis, drawingArea, formattedSeries, seriesConfig, zoomMap, preferStrictDomainInLineCharts) {
  return (0, _getAxisScale.getYAxesScales)({
    drawingArea,
    formattedSeries,
    axis,
    seriesConfig,
    zoomMap,
    preferStrictDomainInLineCharts
  });
});
const selectorChartZoomAxisFilters = exports.selectorChartZoomAxisFilters = (0, _selectors.createSelector)([selectorChartXFilter, selectorChartYFilter, _useChartCartesianAxisLayout.selectorChartRawXAxis, _useChartCartesianAxisLayout.selectorChartRawYAxis, selectorChartXScales, selectorChartYScales], (xMapper, yMapper, xAxis, yAxis, xScales, yScales) => {
  if (xMapper === undefined || yMapper === undefined) {
    // Early return if there is no zoom.
    return undefined;
  }
  const xFilters = xAxis?.reduce((acc, axis) => {
    const filter = xMapper(axis.id, axis.data, xScales[axis.id].scale);
    if (filter !== null) {
      acc[axis.id] = filter;
    }
    return acc;
  }, {});
  const yFilters = yAxis?.reduce((acc, axis) => {
    const filter = yMapper(axis.id, axis.data, yScales[axis.id].scale);
    if (filter !== null) {
      acc[axis.id] = filter;
    }
    return acc;
  }, {});
  if (Object.keys(xFilters ?? {}).length === 0 && Object.keys(yFilters ?? {}).length === 0) {
    return undefined;
  }
  return (0, _createAxisFilterMapper.createGetAxisFilters)((0, _extends2.default)({}, xFilters, yFilters));
});

/**
 * The only interesting selectors that merge axis data and zoom if provided.
 */

const selectorChartXAxis = exports.selectorChartXAxis = (0, _selectors.createSelector)([_useChartCartesianAxisLayout.selectorChartRawXAxis, _useChartDimensions.selectorChartDrawingArea, _useChartSeries.selectorChartSeriesProcessed, _useChartSeries.selectorChartSeriesConfig, selectorChartZoomMap, selectorChartZoomOptionsLookup, selectorChartZoomAxisFilters, _useChartExperimentalFeature.selectorPreferStrictDomainInLineCharts, selectorChartXScales], (axis, drawingArea, formattedSeries, seriesConfig, zoomMap, zoomOptions, getFilters, preferStrictDomainInLineCharts, scales) => (0, _computeAxisValue.computeAxisValue)({
  scales,
  drawingArea,
  formattedSeries,
  axis,
  seriesConfig,
  axisDirection: 'x',
  zoomMap,
  zoomOptions,
  getFilters,
  preferStrictDomainInLineCharts
}));
const selectorChartYAxis = exports.selectorChartYAxis = (0, _selectors.createSelector)([_useChartCartesianAxisLayout.selectorChartRawYAxis, _useChartDimensions.selectorChartDrawingArea, _useChartSeries.selectorChartSeriesProcessed, _useChartSeries.selectorChartSeriesConfig, selectorChartZoomMap, selectorChartZoomOptionsLookup, selectorChartZoomAxisFilters, _useChartExperimentalFeature.selectorPreferStrictDomainInLineCharts, selectorChartYScales], (axis, drawingArea, formattedSeries, seriesConfig, zoomMap, zoomOptions, getFilters, preferStrictDomainInLineCharts, scales) => (0, _computeAxisValue.computeAxisValue)({
  scales,
  drawingArea,
  formattedSeries,
  axis,
  seriesConfig,
  axisDirection: 'y',
  zoomMap,
  zoomOptions,
  getFilters,
  preferStrictDomainInLineCharts
}));
const selectorChartAxis = exports.selectorChartAxis = (0, _selectors.createSelector)([selectorChartXAxis, selectorChartYAxis, (_, axisId) => axisId], (xAxes, yAxes, axisId) => xAxes?.axis[axisId] ?? yAxes?.axis[axisId]);
const selectorChartRawAxis = exports.selectorChartRawAxis = (0, _selectors.createSelector)([_useChartCartesianAxisLayout.selectorChartRawXAxis, _useChartCartesianAxisLayout.selectorChartRawYAxis, (state, axisId) => axisId], (xAxes, yAxes, axisId) => {
  const axis = xAxes?.find(a => a.id === axisId) ?? yAxes?.find(a => a.id === axisId) ?? null;
  if (!axis) {
    return undefined;
  }
  return axis;
});