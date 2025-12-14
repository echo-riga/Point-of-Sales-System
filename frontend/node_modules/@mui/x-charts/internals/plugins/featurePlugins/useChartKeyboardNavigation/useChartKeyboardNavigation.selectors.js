"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.selectorChartsIsKeyboardNavigationEnabled = exports.selectorChartsHasFocusedItem = exports.selectorChartsFocusedSeriesType = exports.selectorChartsFocusedSeriesId = exports.selectorChartsFocusedDataIndex = void 0;
var _selectors = require("../../utils/selectors");
const selectKeyboardNavigation = state => state.keyboardNavigation;
const selectorChartsHasFocusedItem = exports.selectorChartsHasFocusedItem = (0, _selectors.createSelector)([selectKeyboardNavigation], keyboardNavigationState => keyboardNavigationState?.item != null);
const selectorChartsFocusedSeriesType = exports.selectorChartsFocusedSeriesType = (0, _selectors.createSelector)([selectKeyboardNavigation], keyboardNavigationState => keyboardNavigationState?.item?.type);
const selectorChartsFocusedSeriesId = exports.selectorChartsFocusedSeriesId = (0, _selectors.createSelector)([selectKeyboardNavigation], keyboardNavigationState => keyboardNavigationState?.item?.seriesId);
const selectorChartsFocusedDataIndex = exports.selectorChartsFocusedDataIndex = (0, _selectors.createSelector)([selectKeyboardNavigation], keyboardNavigationState => keyboardNavigationState?.item?.dataIndex);
const selectorChartsIsKeyboardNavigationEnabled = exports.selectorChartsIsKeyboardNavigationEnabled = (0, _selectors.createSelector)([selectKeyboardNavigation], keyboardNavigationState => !!keyboardNavigationState?.enableKeyboardNavigation);