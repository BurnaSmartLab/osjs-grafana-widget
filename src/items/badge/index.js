import AbstractGrafana from '../../AbstractGrafana';

import {app, h} from 'hyperapp';
import {TextField, Button, Label, Box, BoxContainer} from '@osjs/gui';
import './badge.scss';
import * as translations from '../../../locales';

export default class BadgeWidget extends AbstractGrafana {
  constructor(grafana) {

    super();

    grafana.attributes.minDimension.height = 30;
    grafana.attributes.maxDimension.width = 600;
    grafana.attributes.maxDimension.height = 30;

    // custom widget option could be added here.
    if (!('badge' in grafana.options.widgetOptions)) {
      grafana.options.widgetOptions.badge = {
        color: '#54b947'
      };
    }
    if (!('badge' in grafana.options.widgetOptions) ||
      ('badge' in grafana.options.widgetOptions) && grafana.widgetTypeChangedFlag === true) {
      grafana.options.dimension.width = 200;
      grafana.options.dimension.height = 30;
    }
    grafana.widgetTypeChangedFlag = false;
  }
  // Every rendering tick (or just once if no canvas)
  async printChart(grafana) {
    grafana.$mycontainer.innerHTML = null;

    let calcAvg = 0;
    let badgeData = [];
    let url = `/grafana/api/datasources/proxy/1/query?db=opentsdb&q=SELECT ${grafana.options.aggregateSelect}("value") FROM "${grafana.options.measurement}" WHERE time >= now() - ${grafana.options.timeRange}ms GROUP BY time(${grafana.options.timeGroupBy}ms) fill(null)&epoch=ms`;
    let response = await fetch(url);
    if (response.ok) {
      let data = await response.json();
      if (!data.results['error']) {
        badgeData = data.results[0].series[0].values;
        let sum = 0, count = 0;
        for (let elem of badgeData) {
          if (elem[1] !== null) {
            sum += elem[1];
            count += 1;
          }
        }
        calcAvg = (sum / count).toFixed(2);
      }
    } else {
      alert('HTTP-Error: ' + response.status);
    }
    let appParams = this.renderBadge(grafana, calcAvg);
    app(appParams.state, appParams.actions, appParams.view, grafana.$mycontainer);
  }

  startPoll(grafana) {
    grafana.stopPoll();
    grafana._interval = setInterval(async () => {
      let calcAvgUpdated = 0;
      let chartData = [];
      let url = `/grafana/api/datasources/proxy/1/query?db=opentsdb&q=SELECT ${grafana.options.aggregateSelect}("value") FROM "${grafana.options.measurement}" WHERE time >= now() - ${grafana.options.timeRange}ms GROUP BY time(${grafana.options.timeGroupBy}ms) fill(null)&epoch=ms`;
      let response = await fetch(url);
      if (response.ok) {
        let data = await response.json();
        if (!data.results['error']) {
          chartData = data.results[0].series[0].values;
          let sum = 0, count = 0;
          for (let elem of chartData) {
            if (elem[1] !== null) {
              sum += elem[1];
              count += 1;
            }
          }
          calcAvgUpdated = (sum / count).toFixed(2);
        }
      } else {
        alert('HTTP-Error: ' + response.status);
      }
      let appParams = this.renderBadge(grafana, calcAvgUpdated);
      app(appParams.state, appParams.actions, appParams.view, grafana.$mycontainer);
    }, grafana.options.refreshTime);
  }

  showAdvancedSetting(grafana, dialogWindow) {
    const {translatable} = grafana.core.make('osjs/locale');
    const __ = translatable(translations);
    const state = {
      color: grafana.options.widgetOptions.badge.color
    };
    const actions = {
      setColor: (color) => {
        state.color = color;
        return ({color});
      },
      getValues: () => state => state,
    };

    const view = (state, actions) => (
      h(Box, {}, [
        h('hr', {}, ''),
        h('h6', {}, __('MSG_BADGE')),
        h(BoxContainer, {}, [
          h(Label, {box: {grow: 1}}, __('LBL_COLOR')),
          h(TextField, {
            box: {grow:3},
            style: {'color': state.color},
            placeholder: __('LBL_COLOR'),
            oninput: (ev, value) => actions.setColor(value),
            value: state.color
          }),
          h(Button, {
            box: {grow:3},
            onclick: () => grafana.core.make('osjs/dialog', 'color', {
              color: state.color
            }, (btn, value) => {
              if (btn === 'ok') {
                let hexCode = value.hex;
                actions.setColor(hexCode);
                state.color = hexCode;
              }
            })
          }, __('LBL_SET_COLOR')),
        ])
      ])
    );
    return {state, actions, view};
  }

  saveWidgetOptions(widgetOptions, advSetting) {
    widgetOptions.badge.color = advSetting.color;
  }

  renderBadge(grafana, calcAvg) {
    const state = {
      color: grafana.options.widgetOptions.badge.color,
      title: grafana.options.title === '' ? grafana.options.measurement : grafana.options.title,
      unit: grafana.options.unit,
    };
    const actions = {
      setColor: (el) => {
        el.style.color = grafana.options.fontColor;
      }
    };
    const view = state => (
      h('div', {
        class: 'double-val-label',
        oncreate: el => actions.setColor(el)
      }, [
        h('span', {}, state.title),
        h('span', {
          style: `background-color: ${state.color}`
        }, `${calcAvg} ${state.unit}`)
      ])
    );
    return {state, actions, view};
  }
  destroy(grafana) {
    grafana = null;
  }
  resize(grafana) {
    grafana.$mycontainer.style.fontSize = parseInt(grafana.$mycontainer.parentElement.style.width) * 0.025 + 'px';
  }

}
