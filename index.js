import {Widget} from '@osjs/widgets';
import * as translations from './locales.js';
import widgetItem from './src/widgetItems';

export default class GrafanaWidget extends Widget {
  constructor(core, options) {
    super(core, options, {
      canvas: false,
      // fbs:1,
      // Our default dimension
      dimension: {
        width: 700,
        height: 300
      }
    }, {
      // Custom options that can be saved
      measurment: 'netdata.system.cpu.system',
      timeRange: '300000',
      timeGroupBy: '1000',
      aggregateFunction: 'integral',
      refresh: 'off',
      widgetType: null,
      widgetOptions: {},

    });
    this.$mycontainer = document.createElement('div');
    this.$mycontainer.setAttribute('style', 'height:100%; width: 100%');
    this.$element.appendChild(this.$mycontainer);
    this._interval = null;
    this.chart = null;
    this.chartSize = 0;
    this.widget = null;
  }
  init() {
    // eslint-disable-next-line no-unused-vars
    if (this.options.widgetType === null) {
      const {translate: _, translatable} = this.core.make('osjs/locale');
      const __ = translatable(translations);
      this.core.make('osjs/dialog', 'choice', {
        title: __('TTL_SETTING'),
        message: __('MSG_SETTING'),
        value: this.options.widgetType,
        choices: Object.assign({}, ...Object.keys(widgetItem).map(k => ({[k]: __(widgetItem[k].name)}))),
      }, (btn, value) => {
        if (btn === 'ok') {
          if (value === 'statsd') {
            this.options.widgetType = value;
            this.widget = new widgetItem.statsd.object(this.options.widgetOptions);
          }
          this.saveSettings();
          super.init();
        }
      });
    }else {
      if (this.options.widgetType === 'statsd') {
        this.widget = new widgetItem.statsd.object(this.options.widgetOptions);
      }
      this.saveSettings();
      super.init();
    }
  }
  // When widget is destructed
  onDestroy() {
    this.chart.dispose();
    this.stopPoll();
  }

  // When widget was resized
  onResize() {
  }

  // When widget was moved
  onMove() {
  }

  // Every rendering tick (or just once if no canvas)
  async render() {
    await this.widget.printChart(this);
  }

  saveSettings() {
    // debugger;
    if (this.options.refresh !== 'off') {
      this.startPoll();
    } else {
      this.stopPoll();
    }
    super.saveSettings();
  }

  // A custom set of menu entries
  getContextMenu() {
    // eslint-disable-next-line no-unused-vars
    const {translatable} = this.core.make('osjs/locale');
    const __ = translatable(translations);
    return [{
      label: __('LBL_SET_REFRESH'),
      onclick: () => this.createRefreshDialog()
    }, {
      label: __('LBL_SET_MEASURMENT'),
      onclick: () => this.createMeasurmentDialog()
    }, {
      label: __('LBL_SET_TIME_RANGE'),
      onclick: () => this.createTimeRangeDialog()
    }, {
      label: __('LBL_SET_TIME_GROUP_BY'),
      onclick: () => this.createTimeGroupByDialog()
    }, {
      label: __('LBL_SET_AGGREGATE_FUNCTION'),
      onclick: () => this.createAggregateFunctionDialog()
    }];
  }

  createRefreshDialog() {
    // eslint-disable-next-line no-unused-vars
    const {translate: _, translatable} = this.core.make('osjs/locale');
    const __ = translatable(translations);
    this.core.make('osjs/dialog', 'choice', {
      title: __('TTL_REFRESH'),
      message: __('MSG_REFRESH'),
      value: this.options.refresh,
      choices: {
        'off': __('MSG_Off'),
        '5000': '5s',
        '10000': '10s',
        '15000': '15s',
        '30000': '30s',
        '36000000': '1h',
        '72000000': '2h',
        '86400000': '1d'
      },
    }, (btn, value) => {
      if (btn === 'ok') {
        this.options.refresh = value;
        if (this.options.refresh !== 'off') {
          this.startPoll();
        } else {
          this.stopPoll();
        }
        this.saveSettings();
      }
    });
  }

  createMeasurmentDialog() {
    // eslint-disable-next-line no-unused-vars
    const {translate: _, translatable} = this.core.make('osjs/locale');
    const __ = translatable(translations);
    this.core.make('osjs/dialog', 'choice', {
      title: __('TTL_MEASURMENT'),
      message: __('MSG_MEASURMENT'),
      value: this.options.measurment,
      // TODO: create this list via grafana service
      choices: {
        'netdata.system.cpu.system': 'netdata.system.cpu.system',
        'netdata.statsd_timer_swift.object_server.put.timing.events': 'netdata.statsd_timer_swift.object_server.put.timing.events'
      },
    }, (btn, value) => {
      if (btn === 'ok') {
        this.options.measurment = value;
        this.saveSettings();
        this.updateChartData();
      }
    });
  }

  createTimeRangeDialog() {
    // eslint-disable-next-line no-unused-vars
    const {translate: _, translatable} = this.core.make('osjs/locale');
    const __ = translatable(translations);
    this.core.make('osjs/dialog', 'choice', {
      title: __('TTL_TIME_RANGE'),
      message: __('MSG_TIME_RANGE'),
      value: this.options.timeRange,
      choices: {
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
        // '2592000000000': 'Last 30 days',
      },
    }, (btn, value) => {
      if (btn === 'ok') {
        this.options.timeRange = value;
        if ((value >= 86400000) && (value < 604800000) && (this.options.timeGroupBy < 10000)) {
          this.options.timeGroupBy = '60000';
          console.log(this.options.timeGroupBy);
        } else if ((value >= 604800000) && (this.options.timeGroupBy < 300000)) {
          this.options.timeGroupBy = '300000';
          console.log(this.options.timeGroupBy);
        }
        this.saveSettings();
        this.updateChartData();
      }
    });
  }

  createTimeGroupByDialog() {
    let choices;
    if ((this.options.timeRange >= 86400000) && (this.options.timeRange < 604800000)) {
      choices = {
        '60000': '1m',
        '300000': '5m',
        '600000': '10m',
        '900000': '15m',
        '36000000': '1h'
      };
    } else if (this.options.timeRange >= 86400000) {
      choices = {
        '300000': '5m',
        '600000': '10m',
        '900000': '15m',
        '36000000': '1h'
      };
    } else {
      choices = {
        '1000': '1s',
        '10000': '10s',
        '60000': '1m',
        '300000': '5m',
        '600000': '10m',
        '900000': '15m',
        '36000000': '1h'
      };
    }
    // eslint-disable-next-line no-unused-vars
    const {translatable} = this.core.make('osjs/locale');
    const __ = translatable(translations);
    this.core.make('osjs/dialog', 'choice', {
      title: __('TTL_TIME_GROUP_BY'),
      message: __('MSG_TIME_GROUP_BY'),
      value: this.options.timeGroupBy,
      choices
    }, (btn, value) => {
      if (btn === 'ok') {
        this.options.timeGroupBy = value;
        this.saveSettings();
        this.updateChartData();
      }
    });
  }

  createAggregateFunctionDialog() {
    // eslint-disable-next-line no-unused-vars
    const {translate: _, translatable} = this.core.make('osjs/locale');
    const __ = translatable(translations);
    this.core.make('osjs/dialog', 'choice', {
      title: __('TTL_AGGREGATE_FUNCTION'),
      message: __('MSG_AGGREGATE_FUNCTION'),
      value: this.options.aggregateFunction,
      choices: {
        'count': 'Count',
        'distinct': 'Distinct',
        'integral': 'Integral',
        'mean': 'Mean',
        'median': 'Median',
        'mode': 'Mode',
        'sum': 'Sum'
      },
    }, (btn, value) => {
      if (btn === 'ok') {
        this.options.aggregateFunction = value;
        this.saveSettings();
        this.updateChartData();
      }
    });
  }

  stopPoll() {
    this._interval = clearInterval(this._interval);
  }

  startPoll() {
    this.stopPoll();
    if (this.options.refresh !== 'off') {
      this._interval = setInterval(async () => {
        let chartData = [];
        let timeRange = this.options.refresh < 20000 ? 20000 : this.options.refresh;
        let url = `/grafana/api/datasources/proxy/1/query?db=opentsdb&q=SELECT ${this.options.aggregateFunction}("value") FROM "${this.options.measurment}" WHERE time >= now() - ${timeRange}ms GROUP BY time(${this.options.timeGroupBy}ms) fill(null)&epoch=ms`;
        let response = await fetch(url);
        if (response.ok) {
          let data = await response.json();
          chartData = data.results[0].series[0].values;
          console.log(chartData.length);
          chartData.map(arr => {
            arr.date = arr[0];
            arr.events = arr[1];
            delete arr[0];
            delete arr[1];
          });
        } else {
          alert('HTTP-Error: ' + response.status);
        }
        this.chart.addData(
          chartData,
          1
        );
        console.log(this.chartSize);
        this.chartSize = chartData.length;
        chartData = null;
      }, this.options.refresh);
    }
  }
}
