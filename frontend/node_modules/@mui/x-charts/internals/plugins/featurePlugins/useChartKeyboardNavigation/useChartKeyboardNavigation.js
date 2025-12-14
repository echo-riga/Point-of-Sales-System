"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useChartKeyboardNavigation = void 0;
var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));
var React = _interopRequireWildcard(require("react"));
var _useEventCallback = _interopRequireDefault(require("@mui/utils/useEventCallback"));
var _useEnhancedEffect = _interopRequireDefault(require("@mui/utils/useEnhancedEffect"));
var _useChartKeyboardNavigation = require("./useChartKeyboardNavigation.helpers");
const useChartKeyboardNavigation = ({
  params,
  store,
  svgRef
}) => {
  const focusNextItem = (0, _useEventCallback.default)(function focusNextItem() {
    store.update(state => {
      let {
        type,
        seriesId
      } = state.keyboardNavigation.item ?? {};
      if (type === undefined ||
      // @ts-ignore sankey is not in MIT version
      type === 'sankey' || seriesId === undefined || !(0, _useChartKeyboardNavigation.seriesHasData)(state.series.processedSeries, type, seriesId)) {
        const nextSeries = (0, _useChartKeyboardNavigation.getNextSeriesWithData)(state.series.processedSeries, type, seriesId);
        if (nextSeries === null) {
          return (0, _extends2.default)({}, state, {
            keyboardNavigation: (0, _extends2.default)({}, state.keyboardNavigation, {
              item: null // No series to move the focus too.
            })
          });
        }
        type = nextSeries.type;
        seriesId = nextSeries.seriesId;
      }
      const dataLength = state.series.processedSeries[type].series[seriesId].data.length;
      return (0, _extends2.default)({}, state, {
        keyboardNavigation: (0, _extends2.default)({}, state.keyboardNavigation, {
          item: {
            type,
            seriesId,
            dataIndex: ((state.keyboardNavigation.item?.dataIndex ?? -1) + 1) % dataLength
          }
        })
      });
    });
  });
  const focusPreviousItem = (0, _useEventCallback.default)(function focusPreviousItem() {
    store.update(state => {
      let {
        type,
        seriesId
      } = state.keyboardNavigation.item ?? {};
      if (type === undefined ||
      // @ts-ignore sankey is not in MIT version
      type === 'sankey' || seriesId === undefined || !(0, _useChartKeyboardNavigation.seriesHasData)(state.series.processedSeries, type, seriesId)) {
        const previousSeries = (0, _useChartKeyboardNavigation.getPreviousSeriesWithData)(state.series.processedSeries, type, seriesId);
        if (previousSeries === null) {
          return (0, _extends2.default)({}, state, {
            keyboardNavigation: (0, _extends2.default)({}, state.keyboardNavigation, {
              item: null // No series to move the focus too.} };
            })
          });
        }
        type = previousSeries.type;
        seriesId = previousSeries.seriesId;
      }
      const dataLength = state.series.processedSeries[type].series[seriesId].data.length;
      return (0, _extends2.default)({}, state, {
        keyboardNavigation: (0, _extends2.default)({}, state.keyboardNavigation, {
          item: {
            type,
            seriesId,
            dataIndex: (dataLength + (state.keyboardNavigation.item?.dataIndex ?? 1) - 1) % dataLength
          }
        })
      });
    });
  });
  const focusPreviousSeries = (0, _useEventCallback.default)(function focusPreviousSeries() {
    let setNewSeries = false;
    store.update(state => {
      let {
        type,
        seriesId
      } = state.keyboardNavigation.item ?? {};
      const previousSeries = (0, _useChartKeyboardNavigation.getPreviousSeriesWithData)(state.series.processedSeries, type, seriesId);
      if (previousSeries === null) {
        return (0, _extends2.default)({}, state, {
          keyboardNavigation: (0, _extends2.default)({}, state.keyboardNavigation, {
            item: null // No series to move the focus too.
          })
        });
      }
      type = previousSeries.type;
      seriesId = previousSeries.seriesId;
      const dataLength = state.series.processedSeries[type].series[seriesId].data.length;
      setNewSeries = true;
      return (0, _extends2.default)({}, state, {
        keyboardNavigation: (0, _extends2.default)({}, state.keyboardNavigation, {
          item: {
            type,
            seriesId,
            dataIndex: Math.min(dataLength - 1, state.keyboardNavigation.item?.dataIndex ?? 0)
          }
        })
      });
    });
    return setNewSeries;
  });
  const focusNextSeries = (0, _useEventCallback.default)(function focusNextSeries() {
    let setNewSeries = false;
    store.update(state => {
      let {
        type,
        seriesId
      } = state.keyboardNavigation.item ?? {};
      const nextSeries = (0, _useChartKeyboardNavigation.getNextSeriesWithData)(state.series.processedSeries, type, seriesId);
      if (nextSeries === null) {
        return (0, _extends2.default)({}, state, {
          keyboardNavigation: (0, _extends2.default)({}, state.keyboardNavigation, {
            item: null // No series to move the focus too.
          })
        });
      }
      type = nextSeries.type;
      seriesId = nextSeries.seriesId;
      const dataLength = state.series.processedSeries[type].series[seriesId].data.length;
      setNewSeries = true;
      return (0, _extends2.default)({}, state, {
        keyboardNavigation: (0, _extends2.default)({}, state.keyboardNavigation, {
          item: {
            type,
            seriesId,
            dataIndex: Math.min(dataLength - 1, state.keyboardNavigation.item?.dataIndex ?? 0)
          }
        })
      });
    });
    return setNewSeries;
  });
  const removeFocus = (0, _useEventCallback.default)(function removeFocus() {
    store.update(state => {
      if (state.keyboardNavigation.item === null) {
        return state;
      }
      return (0, _extends2.default)({}, state, {
        keyboardNavigation: (0, _extends2.default)({}, state.keyboardNavigation, {
          item: null
        })
      });
    });
  });
  React.useEffect(() => {
    const element = svgRef.current;
    if (!element || !params.enableKeyboardNavigation) {
      return undefined;
    }
    function keyboardHandler(event) {
      switch (event.key) {
        case 'ArrowRight':
          focusNextItem();
          break;
        case 'ArrowLeft':
          focusPreviousItem();
          break;
        case 'ArrowDown':
          {
            const updatedStore = focusPreviousSeries();
            if (updatedStore) {
              // prevents scrolling
              event.preventDefault();
            }
            break;
          }
        case 'ArrowUp':
          {
            const updatedStore = focusNextSeries();
            if (updatedStore) {
              // prevents scrolling
              event.preventDefault();
            }
            break;
          }
        default:
          break;
      }
    }
    element.addEventListener('keydown', keyboardHandler);
    element.addEventListener('blur', removeFocus);
    return () => {
      element.removeEventListener('keydown', keyboardHandler);
      element.removeEventListener('blur', removeFocus);
    };
  }, [svgRef, focusNextItem, focusPreviousItem, removeFocus, focusPreviousSeries, focusNextSeries, params.enableKeyboardNavigation]);
  (0, _useEnhancedEffect.default)(() => store.update(prev => prev.keyboardNavigation.enableKeyboardNavigation === params.enableKeyboardNavigation ? prev : (0, _extends2.default)({}, prev, {
    keyboardNavigation: (0, _extends2.default)({}, prev.keyboardNavigation, {
      enableKeyboardNavigation: !!params.enableKeyboardNavigation
    })
  })), [store, params.enableKeyboardNavigation]);
  return {
    instance: {}
  };
};
exports.useChartKeyboardNavigation = useChartKeyboardNavigation;
useChartKeyboardNavigation.getInitialState = params => ({
  keyboardNavigation: {
    item: null,
    enableKeyboardNavigation: !!params.enableKeyboardNavigation
  }
});
useChartKeyboardNavigation.params = {
  enableKeyboardNavigation: true
};