import type { ScaleBand } from '@mui/x-charts-vendor/d3-scale';
import { D3OrdinalScale, D3Scale } from "../models/axis.js";
export declare function isOrdinalScale<T extends {
  toString(): string;
}>(scale: D3Scale<T>): scale is D3OrdinalScale<T>;
export declare function isBandScale<T extends {
  toString(): string;
}>(scale: D3Scale<T>): scale is ScaleBand<T>;
export declare function isPointScale<T extends {
  toString(): string;
}>(scale: D3Scale<T>): scale is D3OrdinalScale<T>;