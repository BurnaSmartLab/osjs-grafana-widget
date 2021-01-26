import {Widget} from '@osjs/widgets';

import * as translations from './locales.js';
import widgetItem from './src/widgetItems';
import dialogChoices from './dialogChoices';

import {h, app} from 'hyperapp';
import {Label, Box, SelectField, Image, TextField, BoxContainer} from '@osjs/gui';

import $ from 'jquery';
import './src/components/select2/dist/css/select2.min.css';
import './src/components/select2/dist/js/select2.full.min';
import './customStyles.css';

export default class GrafanaWidget extends Widget {
  constructor(core, options) {
    super(core, options, {
      canvas: false,
    }, {
      // Custom options that can be saved
      start: true,
      dataSource: {},
      measurement: '',
      hostName: '',
      timeRange: '300000',
      timeGroupBy: '1000',
      aggregateSelect: 'integral',
      title: '',
      formula: '',
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
    this.default = 'area';
    this.dataSourceList = [];
    this.hostList = [];
  }
  init() {
    if (this.options.widgetType === null) {
      this.createSettingDialog();
    } else {
      this.options.start = false;
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
        formulaValue: this.options.formula,
        unitValue: this.options.unit,
        fontColorValue: this.options.fontColor,
        hostNameValue: this.options.hostName,
        dataSourceValue: this.options.dataSource
      }, {
        // actions
        onDataSourceChange: dataSourceValue => (state, actions) => {
          state.dataSourceValue = this.dataSourceList.filter(ds => ds.id === parseInt(dataSourceValue))[0];
        },
        onHostChange: hostNameValue => state => ({hostNameValue}),
        onMeasurementChange: measurementValue => state => ({measurementValue}),
        onTitleChange: titleValue => state => ({titleValue}),
        onFormulaChange: formulaValue => state => ({formulaValue}),
        onUnitChange: unitValue => state => ({unitValue}),
        onTimeRangeChange: timeRangeValue => state => ({timeRangeValue}),
        onRefreshTimeChange: refreshTimeValue => state => ({refreshTimeValue}),
        onGroupByChange: groupByValue => state => ({groupByValue}),
        onAggregateSelectChange: aggregateSelectValue => state => ({aggregateSelectValue}),
        onFontColorChange: fontColorValue => state => ({fontColorValue}),
        createDataSource: el => async (state, actions) => {
          let dataSourceSelect = $(el);
          //fetch data sources
          if(this.dataSourceList.length === 0){
            let url = '/grafana/api/datasources';
            let response = await fetch(url);
            if (response.ok) {
              let data = await response.json();
              this.dataSourceList = data.filter(ds => ds.type === 'influxdb');
              if (Object.keys(state.dataSourceValue).length === 0) {
                state.dataSourceValue = data[0];
                actions.onDataSourceChange(data[0].id);
              }
            } else {
              alert('HTTP-Error(datasource): ' + response.status);
            }
          }
          this.dataSourceList.forEach(ds => {
            let selected = state.dataSourceValue.id === ds.id;
            let option = document.createElement('option');
            option.text = ds.name;
            option.value = ds.id;
            option.selected = selected;
            el.add(option);
          });
          dataSourceSelect.select2({
            dir: document.getElementsByClassName('osjs-root')[0].getAttribute('data-dir') === 'rtl' ? 'rtl' : 'ltr'
          });
          dataSourceSelect.on('change', (e) => {
            $('#measurement').off('change');
            $('#host').off('change');
            actions.createMeasurement({el:document.getElementById('measurement'), bool:true});
          });
          $('b[role="presentation"]').hide();
          actions.createMeasurement({el:document.getElementById('measurement'), bool:false});
        },

        createMeasurement: ({el, bool}) => async (state, actions) => {
          let measurementSelect = $(el);
          //onclick event
          measurementSelect.select2({
            dir: document.getElementsByClassName('osjs-root')[0].getAttribute('data-dir') === 'rtl' ? 'rtl' : 'ltr',
            // language: document.getElementsByClassName('osjs-root')[0].getAttribute('data-dir') === 'rtl'? 'fr':'en',
            ajax: {
              url: `/grafana/api/datasources/${state.dataSourceValue.access}/${state.dataSourceValue.id}/query`,
              dataType: 'json',
              data: (params) => ({
                db: state.dataSourceValue.database,
                q: `SHOW MEASUREMENTS WITH MEASUREMENT =~ /${typeof params.term !== 'undefined' ? params.term : ''}/ ${this.options.hostName !== '' ? `WHERE ("host" = '${this.options.hostName}')` : ''} LIMIT 100`,
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
          $('b[role="presentation"]').hide();
          //very first opening
          if(this.options.measurement === '' && bool=== false){
            let option = document.createElement('option');
            option.text = 'Select measurement...';
            option.selected = true;
            option.disabled = true;
            measurementSelect.append(option);
            actions.createHost({el:document.getElementById('host'), bool:false});
          }
          //loading previous selected value (opening sessting dialog after creating or even refreshing )
          if(this.options.measurement !== '' && bool === false){
            let option = new Option(state.measurementValue, state.measurementValue, true, true);
            measurementSelect.append(option);
            actions.createHost({el:document.getElementById('host'), bool:false});
          }
          //changes in dependendent elements
          if(bool === true) {
            let option = document.createElement('option');
            option.text = 'Select measurement...';
            option.selected = true;
            option.disabled = true;
            measurementSelect.append(option);
            state.measurementValue= '';
            actions.createHost({el:document.getElementById('host'), bool:true});
          }
          measurementSelect.on('change', (e) => {
            actions.onMeasurementChange(measurementSelect.val());
            actions.createHost({el:document.getElementById('host'), bool:true});
          });
        },

        createHost: ({el, bool}) => async (state, actions) => {
          let hostSelect = $(el);
          //onclick event
          hostSelect.select2({
            dir: document.getElementsByClassName('osjs-root')[0].getAttribute('data-dir') === 'rtl' ? 'rtl' : 'ltr',
            // language: document.getElementsByClassName('osjs-root')[0].getAttribute('data-dir') === 'rtl'? 'fr':'en',
            ajax: {
              url: `/grafana/api/datasources/${state.dataSourceValue.access}/${state.dataSourceValue.id}/query`,
              dataType: 'json',
              data: (params) => ({
                db: state.dataSourceValue.database,
                q: `SHOW TAG VALUES ${state.measurementValue !== '' ? `FROM "${state.measurementValue}"` : ''} WITH KEY ="host"`,
                epoch: 'ms'
              }),
              processResults: data => {
                if (typeof data.results[0].series !== 'undefined') {
                  let tempHosts = [];
                  for (let i = 0; i < data.results[0].series[0].values.length; i++) {
                    tempHosts.push(data.results[0].series[0].values[i][1]);
                  }
                  this.hostList = [...new Set(tempHosts)];
                  let item = null
                  let arr = []
                  this.hostList.map(ele => {
                    item = {};
                    item.id = ele;
                    item.text = ele;
                    item.selected = (ele === this.options.hostName) ? true : false;
                    arr.push(item);
                });
                  return {
                    results: arr
                  };
                }
              }
            },
          });
          //very first opening or when hostName is not selected 
          if(this.options.hostName === '' && bool=== false){
            let option = document.createElement('option');
            option.text = 'Select a host...';
            option.selected = true;
            option.disabled = true;
            hostSelect.append(option);
            state.measurementValue=== '' ? hostSelect.prop('disabled', true): hostSelect.prop('disabled', false);
          }
          //loading previous selected value (opening sessting dialog after creating or even refreshing )
          if((this.hostList.length !== 0 || this.options.hostName !== '' ) && bool === false ){
            let option = state.hostNameValue !==''? new Option(state.hostNameValue, state.hostNameValue, true, true):
                          new Option('Select a host...', 'Select a host...', true, true)     ;
            hostSelect.append(option);
            hostSelect.prop('disabled', false);
          }
          //changes in dependendent elements
          if(bool === true) {
            let option = document.createElement('option');
            option.text = 'Select a host...';
            option.selected = true;
            option.disabled = true;
            hostSelect.append(option);
            state.measurementValue === ''? hostSelect.prop('disabled', true): hostSelect.prop('disabled', false) ;
            state.hostNameValue= '';
          }
          hostSelect.on('change', (e) => {
            actions.onHostChange(hostSelect.val());
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
            this.options.widgetType = this.default;
            actions.onWidgetTypeChange(this.default);
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
              // custom slider
              h(BoxContainer, {
                class: 'slider',
                oncreate: (el) => actions.createSlider(el)
              }, {}),
              h('a', {
                class: 'prev',
                style: document.getElementsByClassName('osjs-root')[0].getAttribute('data-dir') === 'rtl' ?
                  'left: 0;' : '',
                onclick: () => actions.pluseSlide({sign: '-', time:'175'})
              }, document.getElementsByClassName('osjs-root')[0].getAttribute('data-dir') === 'rtl' ?
                '❯' : '❮'),
              h('a', {
                class: 'next',
                onclick: () => actions.pluseSlide({sign: '+', time:'175'})
              }, document.getElementsByClassName('osjs-root')[0].getAttribute('data-dir') === 'rtl' ?
                '❮' : '❯'),
            ]),
            h('div', {
              class: 'grid-container4'
            }, [
              h(Label, {}, __('LBL_DATA_SOURCE')),
              h(SelectField, {
                placeholder: __('LBL_DATA_SOURCE'),
                choices: {},
                oncreate: el => actions.createDataSource(el),
                // onchange: (ev, value) => actions.onDataSourceChange(value),
              })]),
            h('div', {
              class: 'grid-3'
            }, [
              h(Label, {}, __('LBL_SET_MEASUREMENT')),
              h(SelectField, {
                choices: {},
                value: state.measurementValue,
                id: 'measurement'
                // oncreate: el => actions.createMeasurement(el),
              }),
              h(SelectField, {
                placeholder: __('LBL_HOST_NAME'),
                id: 'host',
                // onchange: (ev, value) => actions.onHostChange(value),
                value: state.hostNameValue
              })
            ]),
            h('div', {
              class: 'grid-3'
            }, [
              h(Label, {}, __('LBL_SET_UNIT')),
              h(TextField, {
                placeholder: 'Formula: (x/1024)',
                oninput: (ev, value) => actions.onFormulaChange(value),
                value: state.formulaValue
              }),
              h(TextField, {
                placeholder: 'Example: %, /s, Mb, Gb',
                oninput: (ev, value) => actions.onUnitChange(value),
                value: state.unitValue
              })
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
        this.options.dataSource = value.dataSourceValue;
        this.options.measurement = value.measurementValue;
        this.options.hostName = value.hostNameValue;
        this.options.title = value.titleValue;
        this.options.formula = value.formulaValue;
        this.options.unit = value.unitValue;
        this.options.timeRange = value.timeRangeValue;
        this.options.timeGroupBy = value.groupByValue;
        this.options.refreshTime = value.refreshTimeValue;
        this.options.aggregateSelect = value.aggregateSelectValue;
        this.options.fontColor = value.fontColorValue;
        // if ((Object.keys(this.options.dataSource).length === 0) || (this.options.measurement === '')) {
        //   this.core.make('osjs/dialog', 'alert', {
        //     message: `${this.options.dataSource === '' ? `${__('LBL_DATA_SOURCE')} field is empty` : ''}/n ${this.options.measurement === '' ? `${__('LBL_SET_MEASUREMENT')} field is empty` : ''}`,
        //     type: 'error'}, options, ()=>{
        //     this.init();
        //   });
        // }
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
    const dialog = this.core
      .make('osjs/dialogs').create(options, callbackValue, callbackButton).render(callbackRender);
    dialog.win.on('destroy', ()=> {
      if (this.options.start) {
        this.init();
        this.core.make('osjs/widgets').remove(this);
        this.core.make('osjs/widgets').save();
      }
    });
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

  eval(data) {
    // data.map(x => Function('"use strict";let p = ' + x + ';return p/10')());
    try {
      if (this.options.formula !== '') {
        if (typeof data === 'object' && data !== null) {
          let keys = Object.keys(data[0]);
          return data.map(a => ({
            [keys[0]]: Object.values(a)[0],
            [keys[1]]: Function('"use strict";let x = ' + Object.values(a)[1] + '; return ' + this.options.formula)()
          }));
        } else if (!isNaN(data)) {
          return Function('"use strict";let x = ' + data + '; return ' + this.options.formula)();
        }
      }
      return data;
    }catch (e) {
      console.log(e);
    }
  }
  static metadata(core) {
    const {translatable} = core.make('osjs/locale');
    const __ = translatable(translations);
    return {
      title: __('LBL_GRAFANA')
    };
  }
}
