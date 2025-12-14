import _extends from "@babel/runtime/helpers/esm/extends";
import { selectorChartDrawingArea } from "../../corePlugins/useChartDimensions/index.js";
import { selectorChartSeriesConfig, selectorChartSeriesProcessed } from "../../corePlugins/useChartSeries/index.js";
import { createSelector } from "../../utils/selectors.js";
import { computeAxisValue } from "./computeAxisValue.js";
import { createAxisFilterMapper, createGetAxisFilters } from "./createAxisFilterMapper.js";
import { createZoomLookup } from "./createZoomLookup.js";
import { selectorChartRawXAxis, selectorChartRawYAxis } from "./useChartCartesianAxisLayout.selectors.js";
import { selectorPreferStrictDomainInLineCharts } from "../../corePlugins/useChartExperimentalFeature/index.js";
import { getXAxesScales, getYAxesScales } from "./getAxisScale.js";
export const createZoomMap = zoom => {
  const zoomItemMap = new Map();
  zoom.forEach(zoomItem => {
    zoomItemMap.set(zoomItem.axisId, zoomItem);
  });
  return zoomItemMap;
};
const selectorChartZoomState = state => state.zoom;

/**
 * Following selectors are not exported because they exist in the MIT chart only to ba able to reuse the Zoom state from the pro.
 */

export const selectorChartZoomIsInteracting = createSelector([selectorChartZoomState], zoom => zoom?.isInteracting);
export const selectorChartZoomMap = createSelector([selectorChartZoomState], zoom => zoom?.zoomData && createZoomMap(zoom?.zoomData));
export const selectorChartZoomOptionsLookup = createSelector([selectorChartRawXAxis, selectorChartRawYAxis], (xAxis, yAxis) => _extends({}, createZoomLookup('x')(xAxis), createZoomLookup('y')(yAxis)));
export const selectorChartAxisZoomOptionsLookup = createSelector([selectorChartZoomOptionsLookup, (_, axisId) => axisId], (axisLookup, axisId) => axisLookup[axisId]);
const selectorChartXFilter = createSelector([selectorChartZoomMap, selectorChartZoomOptionsLookup], (zoomMap, zoomOptions) => zoomMap && zoomOptions && createAxisFilterMapper(zoomMap, zoomOptions, 'x'));
const selectorChartYFilter = createSelector([selectorChartZoomMap, selectorChartZoomOptionsLookup], (zoomMap, zoomOptions) => zoomMap && zoomOptions && createAxisFilterMapper(zoomMap, zoomOptions, 'y'));
export const selectorChartXScales = createSelector([selectorChartRawXAxis, selectorChartDrawingArea, selectorChartSeriesProcessed, selectorChartSeriesConfig, selectorChartZoomMap, selectorPreferStrictDomainInLineCharts], function selectorChartXScales(axis, drawingArea, formattedSeries, seriesConfig, zoomMap, preferStrictDomainInLineCharts) {
  return getXAxesScales({
    drawingArea,
    formattedSeries,
    axis,
    seriesConfig,
    zoomMap,
    preferStrictDomainInLineCharts
  });
});
export const selectorChartYScales = createSelector([selectorChartRawYAxis, selectorChartDrawingArea, selectorChartSeriesProcessed, selectorChartSeriesConfig, selectorChartZoomMap, selectorPreferStrictDomainInLineCharts], function selectorChartYScales(axis, drawingArea, formattedSeries, seriesConfig, zoomMap, preferStrictDomainInLineCharts) {
  return getYAxesScales({
    drawingArea,
    formattedSeries,
    axis,
    seriesConfig,
    zoomMap,
    preferStrictDomainInLineCharts
  });
});
export const selectorChartZoomAxisFilters = createSelector([selectorChartXFilter, selectorChartYFilter, selectorChartRawXAxis, selectorChartRawYAxis, selectorChartXScales, selectorChartYScales], (xMapper, yMapper, xAxis, yAxis, xScales, yScales) => {
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
  return createGetAxisFilters(_extends({}, xFilters, yFilters));
});

/**
 * The only interesting selectors that merge axis data and zoom if provided.
 */

export const selectorChartXAxis = createSelector([selectorChartRawXAxis, selectorChartDrawingArea, selectorChartSeriesProcessed, selectorChartSeriesConfig, selectorChartZoomMap, selectorChartZoomOptionsLookup, selectorChartZoomAxisFilters, selectorPreferStrictDomainInLineCharts, selectorChartXScales], (axis, drawingArea, formattedSeries, seriesConfig, zoomMap, zoomOptions, getFilters, preferStrictDomainInLineCharts, scales) => computeAxisValue({
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
export const selectorChartYAxis = createSelector([selectorChartRawYAxis, selectorChartDrawingArea, selectorChartSeriesProcessed, selectorChartSeriesConfig, selectorChartZoomMap, selectorChartZoomOptionsLookup, selectorChartZoomAxisFilters, selectorPreferStrictDomainInLineCharts, selectorChartYScales], (axis, drawingArea, formattedSeries, seriesConfig, zoomMap, zoomOptions, getFilters, preferStrictDomainInLineCharts, scales) => computeAxisValue({
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
export const selectorChartAxis = createSelector([selectorChartXAxis, selectorChartYAxis, (_, axisId) => axisId], (xAxes, yAxes, axisId) => xAxes?.axis[axisId] ?? yAxes?.axis[axisId]);
export const selectorChartRawAxis = createSelector([selectorChartRawXAxis, selectorChartRawYAxis, (state, axisId) => axisId], (xAxes, yAxes, axisId) => {
  const axis = xAxes?.find(a => a.id === axisId) ?? yAxes?.find(a => a.id === axisId) ?? null;
  if (!axis) {
    return undefined;
  }
  return axis;
});