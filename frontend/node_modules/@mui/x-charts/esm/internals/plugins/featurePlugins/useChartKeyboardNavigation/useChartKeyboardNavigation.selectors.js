import { createSelector } from "../../utils/selectors.js";
const selectKeyboardNavigation = state => state.keyboardNavigation;
export const selectorChartsHasFocusedItem = createSelector([selectKeyboardNavigation], keyboardNavigationState => keyboardNavigationState?.item != null);
export const selectorChartsFocusedSeriesType = createSelector([selectKeyboardNavigation], keyboardNavigationState => keyboardNavigationState?.item?.type);
export const selectorChartsFocusedSeriesId = createSelector([selectKeyboardNavigation], keyboardNavigationState => keyboardNavigationState?.item?.seriesId);
export const selectorChartsFocusedDataIndex = createSelector([selectKeyboardNavigation], keyboardNavigationState => keyboardNavigationState?.item?.dataIndex);
export const selectorChartsIsKeyboardNavigationEnabled = createSelector([selectKeyboardNavigation], keyboardNavigationState => !!keyboardNavigationState?.enableKeyboardNavigation);