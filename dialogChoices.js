
const dialogChoices =
{
  TimeRange: {
    '300000': 'Last 5 minutes',
    '900000': 'Last 15 minutes',
    '1800000': 'Last 30 minutes',
    '3600000': 'Last 1 hour',
    '10800000': 'Last 3 hours',
    '21600000': 'Last 6 hours',
    '43200000': 'Last 12 hours',
    '86400000': 'Last 24 hours',
    '172800000': 'Last 2 days',
    '604800000': 'Last 7 days',
  },
  GroupBy: {
    '1000': '1s',
    '10000': '10s',
    '60000': '1m',
    '300000': '5m',
    '600000': '10m',
    '900000': '15m',
    '36000000': '1h'
  },
  RefreshTime:{
    'off': 'off',
    '5000': '5s',
    '10000': '10s',
    '15000': '15s',
    '30000': '30s',
    '36000000': '1h',
    '72000000': '2h',
    '86400000': '1d'
  },
  Aggregations:{
    'count': 'Count',
    'distinct': 'Distinct',
    'integral': 'Integral',
    'mean': 'Mean',
    'median': 'Median',
    'mode': 'Mode',
    'sum': 'Sum'
  },
  Selectors:{
    'bottom': 'Bottom',
    'first': 'First',
    'last': 'Last',
    'max': 'Max',
    'min': 'Min',
    'percentile': 'Percentile',
    'top': 'Top'
  },
  FontColors: {
    '#000': 'Black',
    '#fff': 'White',
  }
};
export default dialogChoices;
