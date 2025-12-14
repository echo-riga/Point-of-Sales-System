"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createAxisFilterMapper = createAxisFilterMapper;
exports.createContinuousScaleGetAxisFilter = createContinuousScaleGetAxisFilter;
exports.createDiscreteScaleGetAxisFilter = createDiscreteScaleGetAxisFilter;
exports.createGetAxisFilters = void 0;
var _isDefined = require("../../../isDefined");
var _scaleGuards = require("../../../scaleGuards");
function createAxisFilterMapper(zoomMap, zoomOptions, direction) {
  return (axisId, axisData, scale) => {
    const zoomOption = zoomOptions[axisId];
    if (!zoomOption || zoomOption.filterMode !== 'discard') {
      return null;
    }
    const zoom = zoomMap?.get(axisId);
    if (zoom === undefined || zoom.start <= 0 && zoom.end >= 100) {
      // No zoom, or zoom with all data visible
      return null;
    }
    if ((0, _scaleGuards.isOrdinalScale)(scale)) {
      return createDiscreteScaleGetAxisFilter(axisData, zoom.start, zoom.end, direction);
    }
    return createContinuousScaleGetAxisFilter(scale, zoom.start, zoom.end, direction, axisData);
  };
}
function createDiscreteScaleGetAxisFilter(axisData, zoomStart, zoomEnd, direction) {
  const maxIndex = axisData?.length ?? 0;
  const minVal = Math.floor(zoomStart * maxIndex / 100);
  const maxVal = Math.ceil(zoomEnd * maxIndex / 100);
  return function filterAxis(value, dataIndex) {
    const val = value[direction] ?? axisData?.[dataIndex];
    if (val == null) {
      // If the value does not exist because of missing data point, or out of range index, we just ignore.
      return true;
    }
    return dataIndex >= minVal && dataIndex < maxVal;
  };
}
function createContinuousScaleGetAxisFilter(scale, zoomStart, zoomEnd, direction, axisData) {
  let min;
  let max;
  [min, max] = scale.domain();
  min = min instanceof Date ? min.getTime() : min;
  max = max instanceof Date ? max.getTime() : max;
  const minVal = min + zoomStart * (max - min) / 100;
  const maxVal = min + zoomEnd * (max - min) / 100;
  return function filterAxis(value, dataIndex) {
    const val = value[direction] ?? axisData?.[dataIndex];
    if (val == null) {
      // If the value does not exist because of missing data point, or out of range index, we just ignore.
      return true;
    }
    return val >= minVal && val <= maxVal;
  };
}
const createGetAxisFilters = filters => ({
  currentAxisId,
  seriesXAxisId,
  seriesYAxisId,
  isDefaultAxis
}) => {
  return (value, dataIndex) => {
    const axisId = currentAxisId === seriesXAxisId ? seriesYAxisId : seriesXAxisId;
    if (!axisId || isDefaultAxis) {
      return Object.values(filters ?? {})[0]?.(value, dataIndex) ?? true;
    }
    const data = [seriesYAxisId, seriesXAxisId].filter(id => id !== currentAxisId).map(id => filters[id ?? '']).filter(_isDefined.isDefined);
    return data.every(f => f(value, dataIndex));
  };
};
exports.createGetAxisFilters = createGetAxisFilters;