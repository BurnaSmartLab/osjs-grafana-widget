import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import AbstractGrafana from '../AbstractGrafana';

import { h, app } from 'hyperapp';
import { TextField, Button, BoxContainer, Label, Box, SelectField, Image } from '@osjs/gui';

import '../../customStyles.css';

export default class GaugeWidget extends AbstractGrafana {
  constructor(widgetOptions) {
    super();
    this.widgetHand = null;
    //custom widget option could be added here.
    if (!('gauge' in widgetOptions)) {
      widgetOptions.gauge = {
        gradeThresholds: [{
          title: 'status',
          color: '#54b947',
          lowScore: 0,
          highScore: 100
        }],
        minRange: 0,
        maxRange: 100,
      };
    }
  }
  // Every rendering tick (or just once if no canvas)
  async printChart(grafana) {
    am4core.options.autoSetClassName = true
    console.log('I AM IN PRINTCHART');
    let calcAvg = 0;
    let chartData = [];
    let url = `/grafana/api/datasources/proxy/1/query?db=opentsdb&q=SELECT ${grafana.options.aggregateFunction}("value") FROM "${grafana.options.measurment}" WHERE time >= now() - ${grafana.options.timeRange}ms GROUP BY time(${grafana.options.timeGroupBy}ms) fill(null)&epoch=ms`;
    let response = await fetch(url);
    if (response.ok) {
      let data = await response.json();
      chartData = data.results[0].series[0].values;
      let sum = 0, count = 0;
      for (let elem of chartData) {
        if (elem[1] !== null) {
          sum += elem[1];
          count += 1;
        }
        calcAvg = sum / count;
      }
    } else {
      alert('HTTP-Error: ' + response.status);
    }

    am4core.useTheme(am4themes_animated);
    grafana.chart = am4core.create(grafana.$mycontainer, am4charts.GaugeChart);
    //grafana.chart.responsive.enabled = true;

    let chartMin = grafana.options.widgetOptions.gauge.minRange;
    let chartMax = grafana.options.widgetOptions.gauge.maxRange;


    let data = {
      score: calcAvg,
      gradingData: grafana.options.widgetOptions.gauge.gradeThresholds
    };

    /**
     Grading Lookup
     */

    // create chart
    grafana.chart.hiddenState.properties.opacity = 0;
    grafana.chart.fontSize = '100%';
    grafana.chart.innerRadius = am4core.percent(80);
    grafana.chart.resizable = true;

    /**
     * Normal axis
     */

    let axis = grafana.chart.xAxes.push(new am4charts.ValueAxis());
    axis.min = chartMin;
    axis.max = chartMax;
    axis.strictMinMax = true;
    axis.renderer.radius = am4core.percent(80);
    axis.renderer.inside = true;
    axis.renderer.line.strokeOpacity = 0.1;
    axis.renderer.ticks.template.disabled = false;
    axis.renderer.ticks.template.strokeOpacity = 1;
    axis.renderer.ticks.template.strokeWidth = 0.5;
    axis.renderer.ticks.template.length = 5;
    axis.renderer.grid.template.disabled = true;
    axis.renderer.labels.template.radius = am4core.percent(15);
    axis.renderer.labels.template.fontSize = '1em';

    /**
     * Axis for ranges
     */
    let axis2 = grafana.chart.xAxes.push(new am4charts.ValueAxis());
    axis2.min = chartMin;
    axis2.max = chartMax;
    axis2.strictMinMax = true;
    axis2.renderer.labels.template.disabled = true;
    axis2.renderer.ticks.template.disabled = true;
    axis2.renderer.grid.template.disabled = false;
    axis2.renderer.grid.template.opacity = 0.5;
    axis2.renderer.labels.template.bent = true;
    axis2.renderer.labels.template.fill = am4core.color('#000');
    axis2.renderer.labels.template.fontWeight = 'bold';
    axis2.renderer.labels.template.fillOpacity = 0.3;

    /**
     Ranges
     */

    for (let grading of data.gradingData) {
      let range = axis2.axisRanges.create();
      range.axisFill.fill = am4core.color(grading.color);
      range.axisFill.fillOpacity = 0.8;
      range.axisFill.zIndex = -1;
      range.value = grading.lowScore > chartMin ? grading.lowScore : chartMin;
      range.endValue = grading.highScore < chartMax ? grading.highScore : chartMax;
      range.grid.strokeOpacity = 0;
      range.stroke = am4core.color(grading.color).lighten(-0.1);
      range.label.inside = true;
      range.label.text = grading.title.toUpperCase();
      range.label.inside = true;
      range.label.location = 0.5;
      range.label.inside = true;
      range.label.radius = am4core.percent(10);
      range.label.paddingBottom = -5; // ~half font size
      range.label.fontSize = '0.9em';
    }

    let matchingGrade = lookUpGrade(data.score, data.gradingData);

    /**
     * Label 1
     */

    let label = grafana.chart.radarContainer.createChild(am4core.Label);
    label.isMeasured = false;
    label.fontSize = '6em';
    label.x = am4core.percent(50);
    label.paddingBottom = 15;
    label.horizontalCenter = 'middle';
    label.verticalCenter = 'bottom';
    // label.dataItem = data;
    label.text = data.score.toFixed(1);
    // label.text = '{score}';
    label.fill = am4core.color(matchingGrade.color);

    /**
     * Label 2
     */

    let label2 = grafana.chart.radarContainer.createChild(am4core.Label);
    label2.isMeasured = false;
    label2.fontSize = '2em';
    label2.horizontalCenter = 'middle';
    label2.verticalCenter = 'bottom';
    label2.text = matchingGrade.title.toUpperCase();
    label2.fill = am4core.color(matchingGrade.color);


    /**
     * Hand
     */

    let hand = grafana.chart.hands.push(new am4charts.ClockHand());
    this.widgetHand = hand;
    hand.axis = axis2;
    hand.innerRadius = am4core.percent(55);
    hand.startWidth = 8;
    hand.pin.disabled = true;
    hand.value = data.score;
    hand.fill = am4core.color('#444');
    hand.stroke = am4core.color('#000');

    hand.events.on('positionchanged', () => {
      label.text = axis2.positionToValue(hand.currentPosition).toFixed(1);
      // let value2 = axis.positionToValue(hand.currentPosition);
      let matchingGrade = lookUpGrade(axis.positionToValue(hand.currentPosition), data.gradingData);
      label2.text = matchingGrade.title.toUpperCase();
      label2.fill = am4core.color(matchingGrade.color);
      label2.stroke = am4core.color(matchingGrade.color);
      label.fill = am4core.color(matchingGrade.color);
    });

    // ***** it searches in which grade the score will be places
    function lookUpGrade(lookupScore, grades) {
      // Only change code below this line
      for (let i = 0; i < grades.length; i++) {
        if (
          grades[i].lowScore < lookupScore &&
          grades[i].highScore >= lookupScore
        ) {
          return grades[i];
        }
      }
      return null;
    }

    if (grafana.options.refreshTime !== 'off') {
      this.startPoll(grafana);
    } else {
      grafana.stopPoll();
    }
  }

  startPoll(grafana) {
    grafana.stopPoll();
    grafana._interval = setInterval(async () => {
      let calcAvgUpdated = 0;
      let chartData = [];
      let url = `/grafana/api/datasources/proxy/1/query?db=opentsdb&q=SELECT ${grafana.options.aggregateFunction}("value") FROM "${grafana.options.measurment}" WHERE time >= now() - ${grafana.options.timeRange}ms GROUP BY time(${grafana.options.timeGroupBy}ms) fill(null)&epoch=ms`;
      let response = await fetch(url);
      if (response.ok) {
        let data = await response.json();
        chartData = data.results[0].series[0].values;
        let sum = 0, count = 0;
        for (let elem of chartData) {
          if (elem[1] !== null) {
            sum += elem[1];
            count += 1;
          }
          calcAvgUpdated = sum / count;
        }
      } else {
        alert('HTTP-Error: ' + response.status);
      }
      this.widgetHand.showValue(calcAvgUpdated, grafana.options.refreshTime, am4core.ease.cubicOut);
    }, grafana.options.refreshTime);
  }

  showAdvancedSetting(grafana) {
    let arr = [];   // used for displaying previously set thresholds by opening dialog
    grafana.options.widgetOptions.gauge.gradeThresholds.map((item) => {
      arr.push(item);
    });
    let suggestedThre = arr[arr.length - 1].lowScore;  // used for suggesting threshold value based on last set threshold on dialog
    const state = {
      minRange: grafana.options.widgetOptions.gauge.minRange,
      maxRange: grafana.options.widgetOptions.gauge.maxRange,
      gradeThresholds: arr,  // containing threshold(low score and high score), title and its color
    };
    const actions = {
      setMinText: minRange => ({ gradeThresholds}) => {
        gradeThresholds[0].lowScore = minRange;
        suggestedThre = parseInt(minRange);
        state.minRange = minRange;
        return ({ minRange });
      },
      setMaxText: maxRange => state => ({maxRange}),
      getValues: () => state => state,
      setThreshold: ({ index, value }) => ({ gradeThresholds, minRange }) => {
        if (index === 0) {
          gradeThresholds[index].lowScore = minRange;
        } else {
          gradeThresholds[index].lowScore = value;
          suggestedThre = parseInt(value);
        }
        return { gradeThresholds };
      },
      setTitle: ({ index, value }) => ({ gradeThresholds }) => {
        gradeThresholds[index].title = value;
        return { gradeThresholds };
      },
      setColor: ({ index, value }) => ({ gradeThresholds }) => {
        gradeThresholds[index].color = value;
        return { gradeThresholds };
      },
      removeField: (index) => ({ gradeThresholds }) => {
        if (index !== 0) {   // first threshold (min) is essentially needed and can not be removed
          gradeThresholds.splice(index, 1);
          suggestedThre = gradeThresholds[gradeThresholds.length - 1].lowScore;
          return { gradeThresholds };
        }
      },
      addField: () => ({ gradeThresholds, minRange }) => {
        suggestedThre += 10;
        gradeThresholds.push({
          title: '',
          lowScore: suggestedThre,
          highScore: '',
          color: '#' + (Math.random() * 0xfffff * 1000000).toString(16).slice(0, 6)
        });
        return { gradeThresholds };
      }
    };

    const view = (state, actions) => (
      h(Box, {},[
        h(Label, {}, 'Gauge Advanced Settings:  '),
        h('div', {
          class: 'grid-container4'
        }, [
        h(Label, {}, 'Min Range:  '),
        h(TextField, {
          value: state.minRange,
          oninput: (ev, value) => actions.setMinText(value),
        }),
        h(Label, {}, 'Max Range:  '),
        h(TextField, {
          value: state.maxRange,
          oninput: (ev, value) => actions.setMaxText(value)
        }),
      ]),
      h(Box, { grow: 1, shrink: 1 }, [
        state.gradeThresholds.map((name, index) => {
          return h(BoxContainer, {}, [
            h(TextField, {
              box: { grow: 1, shrink: 1 },
              placeholder: 'threshold',
              oninput: (ev, value) => actions.setThreshold({ index, value }),
              value: state.gradeThresholds[index].lowScore
            }),
            h(TextField, {
              box: { grow: 1, shrink: 1 },
              placeholder: 'title',
              oninput: (ev, value) => actions.setTitle({ index, value }),
              value: state.gradeThresholds[index].title
            }),
            h(TextField, {
              box: { grow: 1, shrink: 1 },
              placeholder: 'color',
              oninput: (ev, value) => actions.setColor({ index, value }),
              value: state.gradeThresholds[index].color
            }),
            h(Button, {
              onclick: () => grafana.core.make('osjs/dialog', 'color', {
                color: state.gradeThresholds[index].color
              }, (btn, value) => {
                if (btn === 'ok') {
                  let hexCode = value.hex;
                  actions.setColor({ index, hexCode });
                  state.gradeThresholds[index].color = hexCode;
                }
              })
            }, 'Set Color'),
            h(Button, {
              onclick: () => actions.removeField(index)
            }, 'Remove')
          ]);
        }),
        h(Button, {
          onclick: () => actions.addField()
        }, 'Add Threshold')
      ])
    ])
    );
    return {state, actions, view};
  }

  saveWidgetOptions(widgetOptions, advSetting){
    //console.log(widgetOptions);
    widgetOptions.gauge.minRange = parseInt(advSetting.minRange);
    widgetOptions.gauge.maxRange = parseInt(advSetting.maxRange);
    widgetOptions.gauge.gradeThresholds = [];  // delete the previous set thresholds
    advSetting.gradeThresholds.sort((a, b) => (a.lowScore > b.lowScore) ? 1 : (b.lowScore > a.lowScore) ? -1 : 0);  // sort based on lowscore
    advSetting.gradeThresholds = advSetting.gradeThresholds.filter(item => item.lowScore !== '' && !isNaN(item.lowScore));  // remove objects with undefined threshold
    for (let i = advSetting.gradeThresholds.length - 1; i >= 0; i--) {
      if (i === advSetting.gradeThresholds.length - 1) {
        widgetOptions.gauge.gradeThresholds.unshift({
          title: advSetting.gradeThresholds[i].title,
          color: advSetting.gradeThresholds[i].color,
          lowScore: parseInt(advSetting.gradeThresholds[i].lowScore),
          highScore: parseInt(advSetting.maxRange)
        });
      } else {
        widgetOptions.gauge.gradeThresholds.unshift({
          title: advSetting.gradeThresholds[i].title,
          color: advSetting.gradeThresholds[i].color,
          lowScore: parseInt(advSetting.gradeThresholds[i].lowScore),
          highScore: parseInt(advSetting.gradeThresholds[i + 1].lowScore)
        });
      }
    }
  }

}
