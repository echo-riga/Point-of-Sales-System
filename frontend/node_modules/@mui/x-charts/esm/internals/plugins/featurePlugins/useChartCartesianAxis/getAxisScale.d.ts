import { AxisConfig, AxisId, D3ContinuousScale, D3OrdinalScale, DefaultedAxis } from "../../../../models/axis.js";
import { ChartSeriesType } from "../../../../models/seriesType/config.js";
import { ProcessedSeries } from "../../corePlugins/useChartSeries/index.js";
import { ChartSeriesConfig } from "../../models/index.js";
import { ZoomData } from "./zoom.types.js";
import { ChartDrawingArea } from "../../../../hooks/useDrawingArea.js";
type GetAxesScalesParams<T extends ChartSeriesType = ChartSeriesType> = {
  drawingArea: ChartDrawingArea;
  formattedSeries: ProcessedSeries<T>;
  seriesConfig: ChartSeriesConfig<T>;
  zoomMap?: Map<AxisId, ZoomData>;
  /**
   * @deprecated To remove in v9. This is an experimental feature to avoid breaking change.
   */
  preferStrictDomainInLineCharts?: boolean;
};
export declare function getXAxesScales<T extends ChartSeriesType>({
  drawingArea,
  formattedSeries,
  axis: axes,
  seriesConfig,
  zoomMap,
  preferStrictDomainInLineCharts
}: GetAxesScalesParams<T> & {
  axis?: DefaultedAxis[];
}): Record<AxisId, ScaleDefinition>;
export declare function getYAxesScales<T extends ChartSeriesType>({
  drawingArea,
  formattedSeries,
  axis: axes,
  seriesConfig,
  zoomMap,
  preferStrictDomainInLineCharts
}: GetAxesScalesParams<T> & {
  axis?: DefaultedAxis[];
}): Record<AxisId, ScaleDefinition>;
export type ScaleDefinition = {
  scale: D3ContinuousScale;
  tickNumber: number;
} | {
  scale: D3OrdinalScale;
  tickNumber?: never;
};
type DomainLimit = 'nice' | 'strict' | ((min: number, max: number) => {
  min: number;
  max: number;
});
export declare function getDomainLimit(axis: Pick<DefaultedAxis, 'id' | 'domainLimit'>, axisDirection: 'x' | 'y', axisIndex: number, formattedSeries: ProcessedSeries, preferStrictDomainInLineCharts: boolean | undefined): "nice" | "strict" | ((min: number, max: number) => {
  min: number;
  max: number;
});
export declare function applyDomainLimit(scale: D3ContinuousScale, axis: {
  min?: number | Date;
  max?: number | Date;
}, domainLimit: DomainLimit, rawTickNumber: number): void;
/**
 * Get the actual axis extrema considering the user defined min and max values.
 * @param axisExtrema User defined axis extrema.
 * @param minData Minimum value from the data.
 * @param maxData Maximum value from the data.
 */
export declare function getActualAxisExtrema(axisExtrema: Pick<AxisConfig, 'min' | 'max'>, minData: number, maxData: number): [number | Date, number | Date];
export {};