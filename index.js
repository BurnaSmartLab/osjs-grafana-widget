import {Widget} from '@osjs/widgets';

import * as translations from './locales.js';
import widgetItem from './src/widgetItems';
import dialogChoices from './dialogChoices'

import {h, app} from 'hyperapp';
// import {renderToString} from 'hyperapp-render';
import {Label, Box, SelectField} from '@osjs/gui';

import $ from 'jquery';
// import Splide from '@splidejs/splide';

// import '@splidejs/splide/dist/css/splide.min.css';
// import '@splidejs/splide/dist/css/themes/splide-sea-green.min.css';
import './node_modules/select2/dist/css/select2.min.css';
import './node_modules/select2/dist/js/select2.min';
import './customStyles.css';

export default class GrafanaWidget extends Widget {
  constructor(core, options) {
    super(core, options, {
      canvas: false,
      dimension: {
        width: 500,
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
    this.$mycontainer.setAttribute('style', 'height:100%; width: 100%;');
    this.$mycontainer.setAttribute('id', 'mydiv');
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
    this.widget.destroy(this);
    this.stopPoll();
  }

  // When widget was resized
  onResize() {
    this.$mycontainer.style.fontSize = parseInt(this.$mycontainer.parentElement.style.width) * 0.02 +'px';
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
                  let measurements = data.results[0].series[0].values;
                  measurements.map(arr => {
                    arr.id = arr[0];
                    arr.text = arr[0];
                    arr.selected = (arr[0] === this.options.measurment) ? true : false;
                    delete arr[0];
                  });
                  console.log(measurements);
                  return {
                    results: measurements
                  };
                }
                return {results: []};
              }
            },
          });
          let measurementSelect = $(el);
          $.ajax({
            type: 'GET',
            url: `/grafana/api/datasources/proxy/1/query?db=opentsdb&q=SHOW MEASUREMENTS WITH MEASUREMENT =~ /${typeof this.options.measurment !== 'undefined' ? this.options.measurment : ''}/&epoch=ms `,
          }).then((data)  => {
            // create the option and append to Select2
            let option = new Option(data.results[0].series[0].values[0], data.results[0].series[0].values[0], true, true);
            measurementSelect.append(option).trigger('change');

            // manually trigger the `select2:select` event
            measurementSelect.trigger({
              type: 'select2:select',
              params: {
                data: data
              }
            });
          });
          $('b[role="presentation"]').hide();
        },
        createSlider: el => (state, actions) => {
          let view = [];
          for (const item in widgetItem) {
            const slide = (state, actions) => (h('div', {
              class: 'column',
              onclick: () => actions.onWidgetTypeChange(item)
            }, h('div', {
              class: 'container',
            }, [h('img', {
              src: widgetItem[item].image,
              alt: widgetItem[item].image,
              style: 'width: 100%'
            }, {}),
            h('div', {
              class:'cursor overlay',
              oncreate: el => actions.setActiveClassSlide(el),
              onclick: el => actions.addActiveClass(el)
            }, item)])));
            view.push(slide);
          }
          // adding prev and next
          // const prev = h('a', {
          //   class: 'prev',
          //   onclick: console.log('prev')
          // }, '❮');
          // const next = h('a', {
          //   class: 'next',
          //   onclick: console.log('next')
          // }, '❯');
          // view.push(prev, next);
          const row = (state, actions) => (h('div', {class: 'row'}, view));
          app(state, actions, row, el);
        },
        setActiveClassSlide: (el) => {
          if (el.innerText === this.options.widgetType) {
            el.className += ' active';
          }
        },
        addActiveClass: el => {
          let dots = document.getElementsByClassName('cursor');
          for (let i = 0; i < dots.length; i++) {
            dots[i].className = dots[i].className.replace(' active', '');
          }
          console.log(el);
          el.currentTarget.className += ' active';
        },
        // createSplide: el => (state, actions) => {
        //   const splide = new Splide(el, {
        //     type: 'slide',
        //     perPage: 3,
        //     fixedWidth: '12rem',
        //     fixedHeight: '5rem',
        //     // padding:5,
        //     gap: 5,
        //     // focus: 0,
        //     pagination: false,
        //     lazyLoad: true,
        //     cover:true,
        //     keyboard: true,
        //     // direction: "rtl",
        //   }).mount();
        //   let view = [];
        //   for (let item in widgetItem) {
        //     const dom = (item, state, actions) => h('li', {
        //           class: 'splide__slide'
        //         },
        //         h('div', {
        //               class: 'splide__slide__container',
        //               onclick: (item) => actions.onWidgetTypeChange(item)
        //             },
        //             h('img', {
        //               alt: item,
        //               src: './gauge-Chart.png'
        //             })));
        //     console.log(dom);
        //     splide.add(renderToString(dom(state, actions)));
        //     console.log(item);
        //     app(state, actions, dom, el.childNodes[1].childNodes[0]);
        //   }
        //   return {state, actions};
        //   // console.log(view);
        // },
        getValues: () => state => state,

        onWidgetTypeChange: (widgetTypeValue) => {
          this.options.widgetType = widgetTypeValue;
          // let tempWidget = null;
          // for (const key in widgetItem) {
          //   if (key === widgetTypeValue) {
          //     tempWidget = new widgetItem[key].object(this.options.widgetOptions);
          //   }
          // }
          let div = document.getElementsByClassName('hidden-div');
          div[0].style.display = 'inline';
          this.generateWidget();
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
              h(Label, {}, 'Widget type: '),
              // custom slider
              h('div', {
                class: 'slider',
                oncreate: (el) => actions.createSlider(el)
              }, [
                // h('a', {
                //   class: 'prev',
                //   onclick: () => actions.pluseSlide(-1)
                // }, '❮'),
                // h('a', {
                //   class: 'next',
                //   onclick: () => actions.pluseSlide(1)
                // }, '❯')
              ]),
              // splideeeee
              // h('div', {
              //       class: 'splide',
              //       oncreate: (el) => actions.createSplide(el),
              //       // onchange: (ev, value) => actions.onWidgetTypeChange(value)
              //     },
              //     h('div', {class: 'splide__track'},
              //         h('ul', {class:'splide__list'}))
              // ),
              // h(SelectField, {
              //   choices: Object.assign({}, ...Object.keys(widgetItem).map(k => ({[k]: __(widgetItem[k].name)}))),
              //   value: state.widgetTypeValue,
              //   onchange: (ev, value) => actions.onWidgetTypeChange(value)
              // })
            ]),
            h('div', {
              class: 'grid-container2'
            }, [
              h(Label, {}, 'Measurement:  '),
              h(SelectField, {
                choices: {},
                value: state.measurementValue,
                oncreate: el => actions.createSelect2(el),
                onchange: (ev, value) => actions.onMeasurementChange(value)
              }),
            ]),
            h('div', {
              class: 'grid-container4'
            }, [
              h(Label, {}, 'Time Range:  '),
              h(SelectField, {
                choices: Object.assign({}, ...Object.keys(dialogChoices.TimeRange).map( k =>  ({[k]: __(dialogChoices.TimeRange[k])}) )),
                value: state.timeRangeValue,
                onchange: (ev, value) => actions.onTimeRangeChange(value)
              }),
              h(Label, {}, 'GroupBy:  '),
              h(SelectField, {
                choices: Object.assign({}, ...Object.keys(dialogChoices.GroupBy).map( k =>  ({[k]: __(dialogChoices.GroupBy[k])}) )),
                value: state.groupByValue,
                onchange: (ev, value) => actions.onGroupByChange(value)
              }),
              h(Label, {}, 'Refresh Time:  '),
              h(SelectField, {
                choices: Object.assign({}, ...Object.keys(dialogChoices.RefreshTime).map( k =>  ({[k]: __(dialogChoices.RefreshTime[k])}) )),
                value: state.refreshTimeValue,
                onchange: (ev, value) => actions.onRefreshTimeChange(value)
              }),
              h(Label, {}, 'Aggregate Function:  '),
              h(SelectField, {
                choices: Object.assign({}, ...Object.keys(dialogChoices.AggregateFunction).map( k =>  ({[k]: __(dialogChoices.AggregateFunction[k])}) )),
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
        this.options.measurment = value.measurementValue;
        this.options.timeRange = value.timeRangeValue;
        this.options.timeGroupBy = value.groupByValue;
        this.options.refreshTime = value.refreshTimeValue;
        this.options.aggregateFunction = value.aggregateFuncValue; 
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
        dimension: {width: 700, height: 800},
      }
    };
    this.core
        .make('osjs/dialogs')
        .create(options, callbackValue, callbackButton)
        .render(callbackRender);
  }


}
