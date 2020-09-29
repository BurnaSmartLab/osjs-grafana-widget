import { Widget } from '@osjs/widgets';

import * as translations from './locales.js';
import widgetItem from './src/widgetItems';

import { h, app } from 'hyperapp';
import { TextField, Button, BoxContainer, Label, Box, SelectField, Image } from '@osjs/gui';

import './customStyles.css';

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
    const { translatable } = this.core.make('osjs/locale');
    const __ = translatable(translations);
    return [{
      label: __('LBL_SET_SETTING'),
      onclick: () => this.createSettingDialog()
    }]
  }

  stopPoll() {
    this._interval = clearInterval(this._interval);
  }

  generateWidget() {
    if (this.options.widgetType === 'Gauge-Chart') {
      this.widget = new widgetItem.gauge.object(this.options.widgetOptions)
    }
    else if (this.options.widgetType === 'XY-Chart') {
      this.widget = new widgetItem.statsd.object(this.options.widgetOptions)
    }
  }

  createSettingDialog() {
    // eslint-disable-next-line no-unused-vars
    const { translate: _, translatable } = this.core.make('osjs/locale');
    const __ = translatable(translations);
    const callbackRender = ($content, dialogWindow, dialog) => {
      //state
      dialog.app = app({
        widgetTypeValue: this.options.widgetType,
        measurementValue: this.options.measurment,
        timeRangeValue: this.options.timeRange,
        refreshTimeValue: this.options.refreshTime,
        groupByValue: this.options.timeGroupBy,
        aggregateFuncValue: this.options.aggregateFunction
      }, {
        //actions
        onMeasurementChange: measurementValue => state => ({ measurementValue }),
        onTimeRangeChange: timeRangeValue => state => ({ timeRangeValue }),
        onRefreshTimeChange: refreshTimeValue => state => ({ refreshTimeValue }),
        onGroupByChange: groupByValue => state => ({ groupByValue }),
        onAggregateFuncChange: aggregateFuncValue => state => ({ aggregateFuncValue }),
        getValues: () => state => state,
        onWidgetTypeChange: widgetTypeValue => {
          this.options.widgetType = widgetTypeValue;
          this.generateWidget();
          let div = document.getElementsByClassName('hidden-divs');git
          if (widgetTypeValue === 'Gauge-Chart') {
            div[0].style.display = 'inline';
            div[1].style.display = 'none';
            this.widget.createSettingDialog(this);
          } else if (widgetTypeValue === 'XY-Chart') {
            div[1].style.display = 'inline';
            div[0].style.display = 'none';
          }
          return ({ widgetTypeValue });
        },
      }, (state, actions) => {
        //view
        return dialog.createView([
          h(Box, {}, [
            // Drop Down
            h(Label, {}, 'Widget type:  '),
            h(SelectField, {
              choices: ['Gauge-Chart', 'XY-Chart'],
              value: state.widgetTypeValue,
              onchange: (ev, value) => actions.onWidgetTypeChange(value)
            }),
          ]),
          // h('div', {
          //   class: 'grid-container'
          // }, [
          //   h(Label, {}, 'Widget type:  '),
          //   h(Image, {
          //     src :'../gauge.png',
          //     alt:'Gauge'
          //   }),
          //   h(Image, {
          //     src :'/home/shadi/OS.js/src/packages/wigets/statsd.png',
          //     alt :'Graph'
          //   }),
          // ]),
          h('div', {
            class: 'grid-container2'
          }, [
            // Drop Down
            h(Label, {}, 'Measurement:  '),
            h(SelectField, {
              choices: {
                'netdata.system.cpu.system': 'netdata.system.cpu.system',
                'netdata.statsd_timer_swift.object_server.put.timing.events': 'netdata.statsd_timer_swift.object_server.put.timing.events',
                'netdata.system.ram.free': 'netdata.system.ram.free'
              },
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
          h('div', { class: 'hidden-divs' }, 'gauge div element'),
          h('div', { class: 'hidden-divs' }, 'xy div element'),
        ]);
      }, $content);
    };

    // Values are passed down to the 'options' object
    const callbackValue = dialog => dialog.app.getValues();

    const callbackButton = (button, value) => {
      if (button === 'ok') {
        this.options.measurment = value.measurementValue;
        this.options.timeRange = value.timeRangeValue;
        this.options.timeGroupBy = value.groupByValue;
        this.options.refreshTime = value.refreshTimeValue;
        this.options.aggregateFunction = value.aggregateFuncValue;
        this.render();
        this.saveSettings();
        super.init();
      }
    };
    const options = {
      buttons: ['ok', 'cancel'],
      window: {
        title: __('TTL_SETTING'),
        message: __('MSG_SETTING'),
        dimension: { width: 700, height: 400 }
      }
    };
    this.core.make('osjs/dialogs').create(options, callbackValue, callbackButton).render(callbackRender);
  }


}
