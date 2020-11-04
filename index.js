import {Widget} from '@osjs/widgets';

import * as translations from './locales.js';
import widgetItem from './src/widgetItems';
import dialogChoices from './dialogChoices';

import {h, app} from 'hyperapp';
import {Label, Box, SelectField, Image, TextField, BoxContainer} from '@osjs/gui';

import $ from 'jquery';
import './src/components/select2/dist/css/select2.min.css';
import './src/components/select2/dist/js/select2.full.min';
import './src/components/select2/dist/js/i18n/fr';
import './customStyles.css';

export default class GrafanaWidget extends Widget {
  constructor(core, options) {
    super(core, options, {
      canvas: false,
    }, {
      // Custom options that can be saved
      measurement: 'netdata.system.cpu.system',
      timeRange: '300000',
      timeGroupBy: '1000',
      aggregateSelect: 'integral',
      title: '',
      unit: '',
      refreshTime: 'off',
      widgetType: null,
      widgetOptions: {},  // object properties of each widget class that must be saved
      fontColor: '#fff'
    });

    this.$mycontainer = document.createElement('div');
    this.$mycontainer.setAttribute('style', 'height:100%; width: 100%; font-size:18px');
    this.$element.appendChild(this.$mycontainer);
    this._interval = null;
    this.chart = null;
    this.widget = null;
    this.widgetTypeChangedFlag = false;
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
    this.widget.destroy(this);
    this.stopPoll();
  }

  // When widget was resized
  onResize() {
    this.widget.resize(this);

  }

  // When widget was moved
  onMove() {
  }

  // Every rendering tick (or just once if no canvas)
  async render() {
    await this.widget.printChart(this);
  }

  saveSettings() {
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
        this.widget = new widgetItem[key].object(this);
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
        measurementValue: this.options.measurement,
        timeRangeValue: this.options.timeRange,
        refreshTimeValue: this.options.refreshTime,
        groupByValue: this.options.timeGroupBy,
        aggregateSelectValue: this.options.aggregateSelect,
        titleValue: this.options.title,
        unitValue: this.options.unit,
        fontColorValue: this.options.fontColor
      }, {
        // actions
        onMeasurementChange: measurementValue => state => ({measurementValue}),
        onTitleChange: titleValue => state => ({titleValue}),
        onUnitChange: unitValue => state => ({unitValue}),
        onTimeRangeChange: timeRangeValue => state => ({timeRangeValue}),
        onRefreshTimeChange: refreshTimeValue => state => ({refreshTimeValue}),
        onGroupByChange: groupByValue => state => ({groupByValue}),
        onAggregateSelectChange: aggregateSelectValue => state => ({aggregateSelectValue}),
        onFontColorChange: fontColorValue => state => ({fontColorValue}),
        createSelect2: el => (state, actions) => {
          let measurementSelect = $(el);
          measurementSelect.select2({
            dir: document.getElementsByClassName('osjs-root')[0].getAttribute('data-dir') === 'rtl'? 'rtl':'ltr',
            // language: document.getElementsByClassName('osjs-root')[0].getAttribute('data-dir') === 'rtl'? 'fr':'en',
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
                  let measurements = data.results[0].series[0].values;
                  measurements.map(arr => {
                    arr.id = arr[0];
                    arr.text = arr[0];
                    arr.selected = (arr[0] === this.options.measurement) ? true : false;
                    delete arr[0];
                  });
                  return {
                    results: measurements
                  };
                }
                return {results: []};
              }
            },
          });

          $.ajax({
            type: 'GET',
            url: `/grafana/api/datasources/proxy/1/query?db=opentsdb&q=SHOW MEASUREMENTS WITH MEASUREMENT =~ /${typeof this.options.measurement !== 'undefined' ? this.options.measurement : ''}/&epoch=ms `,
          }).then((data) => {
            // create the option and append to Select2
            let measurement = data.results[0].series[0].values[0];
            state.measurementValue = measurement[0];
            this.options.measurement = measurement[0];
            let option = new Option(state.measurementValue, state.measurementValue, true, true);
            measurementSelect.append(option).trigger('change');
            // manually trigger the `select2:select` event
            measurementSelect.trigger({
              type: 'select2:select',
              params: {
                data: data
              }
            });
          });
          measurementSelect.on('change', (e) => {
            actions.onMeasurementChange(measurementSelect.val());
          });
          $('b[role="presentation"]').hide();
        },

        createSlider: el => (state, actions) => {
          let view = [];
          for (const item in widgetItem) {
            const slide = (state, actions) => (h('div', {
              class: 'item',
              onclick: () => actions.onWidgetTypeChange(item)
            }, h('div', {
              class: 'slider-container',
            }, [h(Image, {
              src: widgetItem[item].image,
              alt: widgetItem[item].image,
              style: 'width: 100%',
              class: 'thumb'
            }, {}),
            h('div', {
              class: 'cursor slider-overlay',
              'data-widget':item,
              oncreate: el => actions.setActiveClassSlide(el),
              onclick: el => actions.addActiveClass(el)
            }, __(widgetItem[item].name))])));
            view.push(slide);
          }
          const row = (state, actions) => (h('div', {class: 'slider-row'}, view));
          app(state, actions, row, el);
        },
        setActiveClassSlide: (el) => (state, actions) => {
          if (this.options.widgetType === null) {
            this.options.widgetType = el.getAttribute('data-widget');
            actions.onWidgetTypeChange(el.getAttribute('data-widget'));
          }
          if (el.getAttribute('data-widget') === this.options.widgetType) {
            el.className += ' active';
            actions.pluseSlide();
          }
        },
        addActiveClass: el => (state, actions) => {
          let dots = document.getElementsByClassName('cursor');
          for (let i = 0; i < dots.length; i++) {
            dots[i].className = dots[i].className.replace(' active', '');
          }
          el.currentTarget.className += ' active';
        },
        pluseSlide: (scroll) => {
          if (typeof scroll === 'undefined') {
            $('.slider-row').animate({
              scrollLeft: $('.active').offset().left - 639
            }, 300, 'swing');
          } else {
            $('.slider-row').animate({
              scrollLeft: `${scroll.sign}=${scroll.time}`
            }, 300, 'swing');
          }
        },
        getValues: () => state => state,
        onWidgetTypeChange: (widgetTypeValue) => {
          this.widgetTypeChangedFlag = true;
          this.options.widgetType = widgetTypeValue;
          let div = document.getElementsByClassName('hidden-div');
          div[0].style.display = 'inline';
          this.generateWidget();
          advancedSetting = this.widget.showAdvancedSetting(this, dialogWindow);
          app(advancedSetting.state, advancedSetting.actions, advancedSetting.view, div[0]);
          setTimeout(() => dialogWindow.emit('num-row-changed'), 100);
          return ({widgetTypeValue});
        },
        startDialog: (widgetTypeValue) => (state) => {
          if (widgetTypeValue !== null) {
            let div = document.getElementsByClassName('hidden-div');
            div[0].style.display = 'inline';
            advancedSetting = this.widget.showAdvancedSetting(this, dialogWindow);
            app(advancedSetting.state, advancedSetting.actions, advancedSetting.view, div[0]);
          }
          setTimeout(() => dialogWindow.emit('num-row-changed'), 100);
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
              h(Label, {}, __('LBL_WIDGET_TYPE')),
              // custom slider
              h(BoxContainer, {
                class: 'slider',
                oncreate: (el) => actions.createSlider(el)
              }, {}),
              h('a', {
                class: 'prev',
                onclick: () => actions.pluseSlide({sign: '-', time:'175'})
              }, '❮'),
              h('a', {
                class: 'next',
                onclick: () => actions.pluseSlide({sign: '+', time:'175'})
              }, '❯'),
            ]),
            h('div', {
              class: 'grid-container2'
            }, [
              h(Label, {}, __('LBL_SET_MEASUREMENT')),
              h(SelectField, {
                choices: {},
                value: state.measurementValue,
                oncreate: el => actions.createSelect2(el),
              }),
            ]),
            h('div', {
              class: 'grid-container4'
            }, [
              h(Label, {}, __('LBL_TITLE')),
              h(TextField, {
                placeholder: 'Default: Measurement',
                oninput: (ev, value) => actions.onTitleChange(value),
                value: state.titleValue
              }),
              h(Label, {}, __('LBL_SET_UNIT')),
              h(TextField, {
                placeholder: 'Example: %, /s, Mb, Gb',
                oninput: (ev, value) => actions.onUnitChange(value),
                value: state.unitValue,
              }),
              h(Label, {}, __('LBL_SET_TIME_RANGE')),
              h(SelectField, {
                choices: Object.assign({}, ...Object.keys(dialogChoices.TimeRange).map(k => ({[k]: __(dialogChoices.TimeRange[k])}))),
                value: state.timeRangeValue,
                onchange: (ev, value) => actions.onTimeRangeChange(value)
              }),
              h(Label, {}, __('LBL_SET_TIME_GROUP_BY')),
              h(SelectField, {
                choices: Object.assign({}, ...Object.keys(dialogChoices.GroupBy).map(k => ({[k]: __(dialogChoices.GroupBy[k])}))),
                value: state.groupByValue,
                onchange: (ev, value) => actions.onGroupByChange(value)
              }),
              h(Label, {}, __('LBL_SET_REFRESH')),
              h(SelectField, {
                choices: Object.assign({}, ...Object.keys(dialogChoices.RefreshTime).map(k => ({[k]: __(dialogChoices.RefreshTime[k])}))),
                value: state.refreshTimeValue,
                onchange: (ev, value) => actions.onRefreshTimeChange(value)
              }),
              h(Label, {}, __('LBL_SET_AGGREGATE_FUNCTION')),
              h(SelectField, {
                value: state.aggregateSelectValue,
                onchange: (ev, value) => actions.onAggregateSelectChange(value)
              }, [
                h('optgroup', {label: 'Aggregations'}, [
                  Object.entries(dialogChoices.Aggregations).map((x) => h('option', {value: x[0]}, x[1])),

                ]),
                h('optgroup', {label: 'Selectors'}, [
                  Object.entries(dialogChoices.Selectors).map((x) => h('option', {value: x[0]}, x[1])),
                ]),
              ]),
              h(Label, {}, __('LBL_SET_FONTCOLOR')),
              h(SelectField, {
                choices:Object.assign({}, ...Object.keys(dialogChoices.FontColors).map(k => ({[k]: __(dialogChoices.FontColors[k])}))),
                value: state.fontColorValue,
                onchange: (ev, value) => actions.onFontColorChange(value)
              }),
            ]),
            h('div', {class: 'hidden-div'}),
          ])
        ]);
      }, $content);

      dialogWindow.on('num-row-changed', () => {
        const $outerBox = dialogWindow.$content.querySelector('.outerBox');
        const height = this.getNewWindowHeight(dialogWindow, $outerBox);
        dialogWindow.setDimension({
          height
        });
      });
    };

    // Values are passed down to the 'options' object
    const callbackValue = dialog => dialog.app.getValues();
    const callbackButton = (button, value) => {
      if (button === 'ok') {
        this.options.measurement = value.measurementValue;
        this.options.title = value.titleValue;
        this.options.unit = value.unitValue;
        this.options.timeRange = value.timeRangeValue;
        this.options.timeGroupBy = value.groupByValue;
        this.options.refreshTime = value.refreshTimeValue;
        this.options.aggregateSelect = value.aggregateSelectValue;
        this.options.fontColor = value.fontColorValue;
        this.widget.saveWidgetOptions(this.options.widgetOptions, advancedSetting.state);
        this.saveSettings();
        this.init();
      }
    };
    const options = {
      buttons: ['ok', 'cancel'],
      window: {
        title: __('TTL_SETTING'),
        message: __('MSG_SETTING'),
        dimension: {width: 600},
      }
    };
    this.core
      .make('osjs/dialogs')
      .create(options, callbackValue, callbackButton)
      .render(callbackRender);
  }

  getNewWindowHeight(dialogWindow, $target) {
    const $toolbar = dialogWindow.$content.querySelector('.osjs-dialog-buttons');
    const $toolbarStyle = window.getComputedStyle($toolbar);
    const toolbarMargin = [
      $toolbarStyle['margin-top'],
      $toolbarStyle['margin-bottom']
    ]
      .map((str) => str.replace('px', ''))
      .reduce((acc, val) => acc + parseInt(val, 10), 0);

    const height =
      $toolbar.offsetHeight +
      $target.offsetHeight +
      dialogWindow.$header.offsetHeight +
      toolbarMargin;

    return height;
  }
  static metadata(core) {
    const {translatable} = core.make('osjs/locale');
    const __ = translatable(translations);
    return {
      title: __('LBL_GRAFANA')
    };
  }
}
