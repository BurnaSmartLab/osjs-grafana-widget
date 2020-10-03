import {Widget} from '@osjs/widgets';

import * as translations from './locales.js';
import widgetItem from './src/widgetItems';

import {h, app} from 'hyperapp';
import {Label, Box, SelectField} from '@osjs/gui';

import $ from 'jquery';
import './customStyles.css';

import './node_modules/select2/dist/css/select2.min.css';
import './node_modules/select2/dist/js/select2.min';

export default class GrafanaWidget extends Widget {
  constructor(core, options) {
    super(core, options, {
      canvas: false,
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
      refreshTime: 'off',
      widgetType: null,
      widgetOptions: {},  // object properties of each widget class that must be saved

    });
    this.$mycontainer = document.createElement('div');
    this.$mycontainer.setAttribute('style', 'height:100%; width: 100%');
    this.$element.appendChild(this.$mycontainer);
    this._interval = null;
    this.chart = null;
    this.widget = null;
  }
  init() {
    if (this.options.widgetType === null) {
      this.createSettingDialog();
    } else {
      this.generateWidget();
      this.saveSettings();
      super.init();
    }
  }

  // When widget is destructed
  onDestroy() {
    this.chart.data = null;
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
    if (this.options.refreshTime !== 'off') {
      this.widget.startPoll(this);
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
      label: __('LBL_SET_SETTING'),
      onclick: () => this.createSettingDialog()
    }];
  }

  stopPoll() {
    this._interval = clearInterval(this._interval);
  }

  generateWidget() {
    for (const key in widgetItem) {
      if (key === this.options.widgetType) {
        this.widget = new widgetItem[key].object(this.options.widgetOptions);
      }
    }
  }

  createSettingDialog() {
    // eslint-disable-next-line no-unused-vars
    const {translate: _, translatable} = this.core.make('osjs/locale');
    const __ = translatable(translations);
    let advancedSetting = {};

    const callbackRender = ($content, dialogWindow, dialog) => {
      // state
      dialog.app = app({
        widgetTypeValue: this.options.widgetType,
        measurementValue: this.options.measurment,
        timeRangeValue: this.options.timeRange,
        refreshTimeValue: this.options.refreshTime,
        groupByValue: this.options.timeGroupBy,
        aggregateFuncValue: this.options.aggregateFunction,
        widgetOptionsValue: this.options.widgetOptions
      }, {
        // actions
        onMeasurementChange: measurementValue => state => ({measurementValue}),
        onTimeRangeChange: timeRangeValue => state => ({timeRangeValue}),
        onRefreshTimeChange: refreshTimeValue => state => ({refreshTimeValue}),
        onGroupByChange: groupByValue => state => ({groupByValue}),
        onAggregateFuncChange: aggregateFuncValue => state => ({aggregateFuncValue}),
        createSelect2: el => {
          $(el).select2({
            ajax: {
              url: '/grafana/api/datasources/proxy/1/query',
              dataType: 'json',
              data: (params) => ({
                db: 'opentsdb',
                q: `SHOW MEASUREMENTS WITH MEASUREMENT =~ /${typeof params.term !== 'undefined' ? params.term : ''}/ LIMIT 100`,
                epoch: 'ms'
              }),
              processResults: data => {
                if (typeof data.results[0].series !== 'undefined') {
                  let measurments = data.results[0].series[0].values;
                  measurments.map(arr => {
                    arr.id = arr[0];
                    arr.text = arr[0];
                    delete arr[0];
                  });
                  return {
                    results: measurments
                  };
                }
                return {results: []};
              }
            },
          });
          $('b[role="presentation"]').hide();
        },
        getValues: () => state => state,

        onWidgetTypeChange: (widgetTypeValue) => {
          this.options.widgetType = widgetTypeValue;
          // let tempWidget = null;
          // for (const key in widgetItem) {
          //   if (key === widgetTypeValue) {
          //     tempWidget = new widgetItem[key].object(this.options.widgetOptions);
          //   }
          // }
          this.generateWidget();
          let div = document.getElementsByClassName('hidden-div');
          div[0].style.display = 'inline';
          advancedSetting = this.widget.showAdvancedSetting(this);
          app(advancedSetting.state, advancedSetting.actions, advancedSetting.view, div[0]);
          return ({widgetTypeValue});
        },
        startDialog: (widgetTypeValue) => (state) => {
          if (widgetTypeValue !== null) {
            let div = document.getElementsByClassName('hidden-div');
            div[0].style.display = 'inline';
            advancedSetting = this.widget.showAdvancedSetting(this);
            app(advancedSetting.state, advancedSetting.actions, advancedSetting.view, div[0]);
          }
        }

      }, (state, actions) => {
        // view
        return dialog.createView([
          h('div', {
            class: 'outerBox',
          }, [
            h(Box, {
              oncreate: () => actions.startDialog(this.options.widgetType)
            }, [
              h(Label, {}, 'Widget type:  '),
              h(SelectField, {
                choices: Object.assign({}, ...Object.keys(widgetItem).map(k => ({[k]: __(widgetItem[k].name)}))),
                value: state.widgetTypeValue,
                onchange: (ev, value) => actions.onWidgetTypeChange(value)
              })
            ]),
            // h('div', {
            //   class: 'grid-container'
            // }, [
            //   h(Label, {}, 'Widget type:  '),
            //   h(Image, {
            //     src :'gauge-chart.png',
            //     alt:'Gauge'
            //   }),
            //   h(Image, {
            //     src :'./XY-chart.png',
            //     alt :'Graph'
            //   }),
            // ]),
            h('div', {
              class: 'grid-container2'
            }, [
              h(Label, {}, 'Measurement:  '),
              h(SelectField, {
                choices: {},
                oncreate: el => actions.createSelect2(el),
                value: state.measurementValue,
                onchange: (ev, value) => actions.onMeasurementChange(value)
              }),
            ]),
            h('div', {
              class: 'grid-container4'
            }, [
              h(Label, {}, 'Time Range:  '),
              h(SelectField, {
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
                },
                value: state.timeRangeValue,
                onchange: (ev, value) => actions.onTimeRangeChange(value)
              }),
              h(Label, {}, 'GroupBy:  '),
              h(SelectField, {
                choices: {
                  '1000': '1s',
                  '10000': '10s',
                  '60000': '1m',
                  '300000': '5m',
                  '600000': '10m',
                  '900000': '15m',
                  '36000000': '1h'
                },
                value: state.groupByValue,
                onchange: (ev, value) => actions.onGroupByChange(value)
              }),
              h(Label, {}, 'Refresh Time:  '),
              h(SelectField, {
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
                value: state.refreshTimeValue,
                onchange: (ev, value) => actions.onRefreshTimeChange(value)
              }),
              h(Label, {}, 'Aggregate Function:  '),
              h(SelectField, {
                choices: {
                  'count': 'Count',
                  'distinct': 'Distinct',
                  'integral': 'Integral',
                  'mean': 'Mean',
                  'median': 'Median',
                  'mode': 'Mode',
                  'sum': 'Sum'
                },
                value: state.aggregateFuncValue,
                onchange: (ev, value) => actions.onAggregateFuncChange(value)
              }),
            ]),
            h('div', {class: 'hidden-div'}),
          ])
        ]);
      }, $content);
    };

    // Values are passed down to the 'options' object
    const callbackValue = dialog => dialog.app.getValues();

    const callbackButton = (button, value) => {
      if (button === 'ok') {
        console.log('I AM IN OK');
        console.log(value.widgetOptionsValue);
        this.options.measurment = value.measurementValue;
        this.options.timeRange = value.timeRangeValue;
        this.options.timeGroupBy = value.groupByValue;
        this.options.refreshTime = value.refreshTimeValue;
        this.options.aggregateFunction = value.aggregateFuncValue;
        // this.generateWidget();
        console.log(advancedSetting.state);
        this.widget.saveWidgetOptions(this.options.widgetOptions, advancedSetting.state);
        this.saveSettings();
        // this.render();
        this.init();
      }
    };
    const options = {
      buttons: ['ok', 'cancel'],
      window: {
        title: __('TTL_SETTING'),
        message: __('MSG_SETTING'),
        dimension: {width: 700, height: 800},
        // resizeFit:document.getElementsByClassName('outerBox')
      }
    };
    this.core.make('osjs/dialogs').create(options, callbackValue, callbackButton).render(callbackRender);
  }


}
