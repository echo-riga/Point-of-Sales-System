import _extends from "@babel/runtime/helpers/esm/extends";
import { scaleBand, scalePoint } from '@mui/x-charts-vendor/d3-scale';
import { isBandScaleConfig, isPointScaleConfig, isSymlogScaleConfig } from "../../../../models/axis.js";
import { zoomScaleRange } from "./zoom.js";
import { getAxisDomainLimit } from "./getAxisDomainLimit.js";
import { getTickNumber } from "../../../ticks.js";
import { getScale } from "../../../getScale.js";
import { getAxisExtrema } from "./getAxisExtrema.js";
const DEFAULT_CATEGORY_GAP_RATIO = 0.2;
function getRange(drawingArea, axisDirection, axis) {
  const range = axisDirection === 'x' ? [drawingArea.left, drawingArea.left + drawingArea.width] : [drawingArea.top + drawingArea.height, drawingArea.top];
  return axis.reverse ? [range[1], range[0]] : range;
}
export function getXAxesScales({
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
export function getYAxesScales({
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
  if (isBandScaleConfig(axis)) {
    const categoryGapRatio = axis.categoryGapRatio ?? DEFAULT_CATEGORY_GAP_RATIO;
    // Reverse range because ordinal scales are presented from top to bottom on y-axis
    const scaleRange = axisDirection === 'y' ? [range[1], range[0]] : range;
    const zoomedRange = zoomScaleRange(scaleRange, zoomRange);
    return {
      scale: scaleBand(axis.data, zoomedRange).paddingInner(categoryGapRatio).paddingOuter(categoryGapRatio / 2)
    };
  }
  if (isPointScaleConfig(axis)) {
    const scaleRange = axisDirection === 'y' ? [...range].reverse() : range;
    const zoomedRange = zoomScaleRange(scaleRange, zoomRange);
    return {
      scale: scalePoint(axis.data, zoomedRange)
    };
  }
  const scaleType = axis.scaleType ?? 'linear';
  const domainLimit = getDomainLimit(axis, axisDirection, axisIndex, formattedSeries, preferStrictDomainInLineCharts);
  const [minData, maxData] = getAxisExtrema(axis, axisDirection, seriesConfig, axisIndex, formattedSeries);
  const axisExtrema = getActualAxisExtrema(axis, minData, maxData);
  if (typeof domainLimit === 'function') {
    const {
      min,
      max
    } = domainLimit(minData, maxData);
    axisExtrema[0] = min;
    axisExtrema[1] = max;
  }
  const rawTickNumber = getTickNumber(_extends({}, axis, {
    range,
    domain: axisExtrema
  }));
  const zoomedRange = zoomScaleRange(range, zoomRange);
  const scale = getScale(scaleType, axisExtrema, zoomedRange);
  if (isSymlogScaleConfig(axis) && axis.constant != null) {
    scale.constant(axis.constant);
  }
  applyDomainLimit(scale, axis, domainLimit, rawTickNumber);
  return {
    scale,
    tickNumber: rawTickNumber
  };
}
export function getDomainLimit(axis, axisDirection, axisIndex, formattedSeries, preferStrictDomainInLineCharts) {
  return preferStrictDomainInLineCharts ? getAxisDomainLimit(axis, axisDirection, axisIndex, formattedSeries) : axis.domainLimit ?? 'nice';
}
export function applyDomainLimit(scale, axis, domainLimit, rawTickNumber) {
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
export function getActualAxisExtrema(axisExtrema, minData, maxData) {
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