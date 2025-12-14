import { AxisId, D3ContinuousScale, D3Scale } from "../../../../models/axis.js";
import { AxisConfig } from "../../../../models/index.js";
import { DefaultizedZoomOptions, ExtremumFilter } from "./useChartCartesianAxis.types.js";
import { GetZoomAxisFilters, ZoomAxisFilters, ZoomData } from "./zoom.types.js";
export declare function createAxisFilterMapper(zoomMap: Map<AxisId, ZoomData>, zoomOptions: Record<AxisId, DefaultizedZoomOptions>, direction: 'x' | 'y'): (axisId: AxisId, axisData: AxisConfig['data'], scale: D3Scale) => ExtremumFilter | null;
export declare function createDiscreteScaleGetAxisFilter(axisData: AxisConfig['data'], zoomStart: number, zoomEnd: number, direction: 'x' | 'y'): ExtremumFilter;
export declare function createContinuousScaleGetAxisFilter(scale: D3ContinuousScale, zoomStart: number, zoomEnd: number, direction: 'x' | 'y', axisData: AxisConfig['data']): ExtremumFilter;
export declare const createGetAxisFilters: (filters: ZoomAxisFilters) => GetZoomAxisFilters;