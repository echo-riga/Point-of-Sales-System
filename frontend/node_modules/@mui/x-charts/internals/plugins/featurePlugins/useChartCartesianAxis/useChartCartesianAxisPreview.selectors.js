"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.selectorChartPreviewYScales = exports.selectorChartPreviewXScales = exports.selectorChartPreviewComputedYAxis = exports.selectorChartPreviewComputedXAxis = void 0;
var _selectors = require("../../utils/selectors");
var _useChartCartesianAxisLayout = require("./useChartCartesianAxisLayout.selectors");
var _useChartSeries = require("../../corePlugins/useChartSeries");
var _computeAxisValue = require("./computeAxisValue");
var _useChartCartesianAxisRendering = require("./useChartCartesianAxisRendering.selectors");
var _useChartDimensions = require("../../corePlugins/useChartDimensions");
var _constants = require("../../../constants");
var _useChartExperimentalFeature = require("../../corePlugins/useChartExperimentalFeature");
var _getAxisScale = require("./getAxisScale");
function createPreviewDrawingArea(axisDirection, mainChartDrawingArea) {
  return axisDirection === 'x' ? {
    left: 0,
    top: 0,
    width: mainChartDrawingArea.width,
    height: _constants.ZOOM_SLIDER_PREVIEW_SIZE,
    right: mainChartDrawingArea.width,
    bottom: _constants.ZOOM_SLIDER_PREVIEW_SIZE
  } : {
    left: 0,
    top: 0,
    width: _constants.ZOOM_SLIDER_PREVIEW_SIZE,
    height: mainChartDrawingArea.height,
    right: _constants.ZOOM_SLIDER_PREVIEW_SIZE,
    bottom: mainChartDrawingArea.height
  };
}
const selectorChartPreviewXScales = exports.selectorChartPreviewXScales = (0, _selectors.createSelector)([_useChartCartesianAxisLayout.selectorChartRawXAxis, _useChartDimensions.selectorChartDrawingArea, _useChartSeries.selectorChartSeriesProcessed, _useChartSeries.selectorChartSeriesConfig, _useChartCartesianAxisRendering.selectorChartZoomOptionsLookup, _useChartExperimentalFeature.selectorPreferStrictDomainInLineCharts, (_, axisId) => axisId], function selectorChartPreviewXScales(xAxes, chartDrawingArea, formattedSeries, seriesConfig, zoomOptions, preferStrictDomainInLineCharts, axisId) {
  const hasAxis = xAxes?.some(axis => axis.id === axisId);
  const drawingArea = createPreviewDrawingArea(hasAxis ? 'x' : 'y', chartDrawingArea);
  const options = zoomOptions[axisId];
  const zoomMap = new Map([[axisId, {
    axisId,
    start: options.minStart,
    end: options.maxEnd
  }]]);
  return (0, _getAxisScale.getXAxesScales)({
    drawingArea,
    formattedSeries,
    axis: xAxes,
    seriesConfig,
    zoomMap,
    preferStrictDomainInLineCharts
  });
});
const selectorChartPreviewComputedXAxis = exports.selectorChartPreviewComputedXAxis = (0, _selectors.createSelector)([_useChartCartesianAxisLayout.selectorChartRawXAxis, _useChartSeries.selectorChartSeriesProcessed, _useChartSeries.selectorChartSeriesConfig, _useChartCartesianAxisRendering.selectorChartZoomOptionsLookup, _useChartCartesianAxisRendering.selectorChartZoomAxisFilters, _useChartDimensions.selectorChartDrawingArea, _useChartExperimentalFeature.selectorPreferStrictDomainInLineCharts, selectorChartPreviewXScales, (_, axisId) => axisId], (xAxes, formattedSeries, seriesConfig, zoomOptions, getFilters, chartDrawingArea, preferStrictDomainInLineCharts, scales, axisId) => {
  const hasAxis = xAxes?.some(axis => axis.id === axisId);
  const drawingArea = createPreviewDrawingArea(hasAxis ? 'x' : 'y', chartDrawingArea);
  const options = zoomOptions[axisId];
  const zoomMap = new Map([[axisId, {
    axisId,
    start: options.minStart,
    end: options.maxEnd
  }]]);
  const computedAxes = (0, _computeAxisValue.computeAxisValue)({
    scales,
    drawingArea,
    formattedSeries,
    axis: xAxes,
    seriesConfig,
    axisDirection: 'x',
    zoomMap,
    zoomOptions,
    getFilters,
    preferStrictDomainInLineCharts
  });
  if (computedAxes.axis[axisId]) {
    return {
      [axisId]: computedAxes.axis[axisId]
    };
  }
  return computedAxes.axis;
});
const selectorChartPreviewYScales = exports.selectorChartPreviewYScales = (0, _selectors.createSelector)([_useChartCartesianAxisLayout.selectorChartRawYAxis, _useChartDimensions.selectorChartDrawingArea, _useChartSeries.selectorChartSeriesProcessed, _useChartSeries.selectorChartSeriesConfig, _useChartCartesianAxisRendering.selectorChartZoomOptionsLookup, _useChartExperimentalFeature.selectorPreferStrictDomainInLineCharts, (_, axisId) => axisId], function selectorChartPreviewYScales(yAxes, chartDrawingArea, formattedSeries, seriesConfig, zoomOptions, preferStrictDomainInLineCharts, axisId) {
  const hasAxis = yAxes?.some(axis => axis.id === axisId);
  const drawingArea = createPreviewDrawingArea(hasAxis ? 'y' : 'x', chartDrawingArea);
  const options = zoomOptions[axisId];
  const zoomMap = new Map([[axisId, {
    axisId,
    start: options.minStart,
    end: options.maxEnd
  }]]);
  return (0, _getAxisScale.getYAxesScales)({
    drawingArea,
    formattedSeries,
    axis: yAxes,
    seriesConfig,
    zoomMap,
    preferStrictDomainInLineCharts
  });
});
const selectorChartPreviewComputedYAxis = exports.selectorChartPreviewComputedYAxis = (0, _selectors.createSelector)([_useChartCartesianAxisLayout.selectorChartRawYAxis, _useChartSeries.selectorChartSeriesProcessed, _useChartSeries.selectorChartSeriesConfig, _useChartCartesianAxisRendering.selectorChartZoomOptionsLookup, _useChartCartesianAxisRendering.selectorChartZoomAxisFilters, _useChartDimensions.selectorChartDrawingArea, _useChartExperimentalFeature.selectorPreferStrictDomainInLineCharts, selectorChartPreviewYScales, (_, axisId) => axisId], (yAxes, formattedSeries, seriesConfig, zoomOptions, getFilters, chartDrawingArea, preferStrictDomainInLineCharts, scales, axisId) => {
  const hasAxis = yAxes?.some(axis => axis.id === axisId);
  const drawingArea = createPreviewDrawingArea(hasAxis ? 'y' : 'x', chartDrawingArea);
  const options = zoomOptions[axisId];
  const zoomMap = new Map([[axisId, {
    axisId,
    start: options.minStart,
    end: options.maxEnd
  }]]);
  const computedAxes = (0, _computeAxisValue.computeAxisValue)({
    scales,
    drawingArea,
    formattedSeries,
    axis: yAxes,
    seriesConfig,
    axisDirection: 'y',
    zoomMap,
    zoomOptions,
    getFilters,
    preferStrictDomainInLineCharts
  });
  if (computedAxes.axis[axisId]) {
    return {
      [axisId]: computedAxes.axis[axisId]
    };
  }
  return computedAxes.axis;
});