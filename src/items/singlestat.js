import AbstractGrafana from '../AbstractGrafana';

import ApexCharts from 'apexcharts';
import './singleStat.css';

import { app, h } from 'hyperapp';
import { Label, Box, TextField, Button } from '@osjs/gui';

import '../../customStyles.css';

export default class SingleStatWidget extends AbstractGrafana {
  constructor(widgetOptions) {
    // custom widget option could be added here.
    super();
    if (!('singleStat' in widgetOptions)) {
      widgetOptions.singleStat = {
        gradeThresholds: [{
          title: 'status',
          color: '#2F50BF',
          lowScore: 0,
          highScore: 100000000000
        }],
      };
    }
  }
  // Every rendering tick (or just once if no canvas)
  async printChart(grafana) {
    //getting data
    let calcAvg = 0;
    let values = [];
    let chartData = [];
    let url = `/grafana/api/datasources/proxy/1/query?db=opentsdb&q=SELECT ${grafana.options.aggregateSelect}("value") FROM "${grafana.options.measurement}" WHERE time >= now() - ${grafana.options.timeRange}ms GROUP BY time(${grafana.options.timeGroupBy}ms) fill(null)&epoch=ms`;
    let response = await fetch(url);
    if (response.ok) {
      let data = await response.json();
      chartData = data.results[0].series[0].values;
      let sum = 0, count = 0;
      for (let elem of chartData) {
        if (elem[1] !== null) {
          sum += elem[1];
          values.push(elem[1]);
          count += 1;
        }
      }
      calcAvg = sum / count;
    } else {
      alert('HTTP-Error: ' + response.status);
    }


    window.Apex = {
      chart: {
        foreColor: '#ccc',
        toolbar: {
          show: false
        },
      },
      stroke: {
        width: 3
      },
      dataLabels: {
        enabled: false
      },
      tooltip: {
        theme: 'dark'
      },
      grid: {
        borderColor: "#535A6C",
        xaxis: {
          lines: {
            show: true
          }
        }
      }
    };

    let spark1 = {
      chart: {
        id: 'spark1',
        group: 'sparks',
        type: 'line',
        sparkline: {
          enabled: true
        },
        dropShadow: {
          enabled: true,
          top: 1,
          left: 1,
          blur: 2,
          opacity: 0.2,
        }
      },
      series: [{
        data: values
      }],
      stroke: {
        curve: 'smooth'
      },
      markers: {
        size: 0
      },
      grid: {
        padding: {
          top: 0,
          bottom: 10,
        }
      },
      colors: ['#fff'],
      tooltip: {
        x: {
          show: false
        },
        y: {
          title: {
            formatter: function formatter(val) {
              return '';
            }
          }
        }
      }
    }

    //hyperapp
    const state = {
      singleValue: calcAvg,
      measurement: grafana.options.measurement,
    };
    const actions = {
      makeSpark: (el) => {
        new ApexCharts(el, spark1).render();
      },

      setStatus: (el) => {
        grafana.options.widgetOptions.singleStat.gradeThresholds.map( elem => {
          if ( calcAvg >= elem.lowScore && calcAvg < elem.highScore){
            el.innerHTML = elem.title;
          }
        })
      }, 

      setGradientColor: (el) => {
        grafana.options.widgetOptions.singleStat.gradeThresholds.map( elem => {
          if ( calcAvg >= elem.lowScore && calcAvg < elem.highScore){
            //generate a gradient background color based on user chosen colors
            el.style.backgroundImage = "linear-gradient(170deg,"+ elem.color+" 10%,  #E7EFF1 100%)";
          }
        })
      }

    };
    const view = (state, actions) => (
      
      h('div', { class: 'outerDiv' , oncreate: el => actions.setGradientColor(el)}, [
        h('div', { 
          class:'sparkboxes',
        },[  
            h('div', { class: 'details' }, [
              h('p', { class: 'singleValue' }, state.singleValue.toFixed(2) + ' unit'),
              h('p', { class: 'status' , oncreate: el => actions.setStatus(el)} )
            ]),
            h('div', { class: 'spark1' , oncreate: el => actions.makeSpark(el) } ),
          ]),
          h('div', { class: 'measurement' }, state.measurement)
      ])
    );

    grafana.chart = app(state, actions, view, grafana.$mycontainer);

  }


  startPoll(grafana) {
    grafana.stopPoll();
    if (grafana.options.refreshTime !== 'off') {
      grafana._interval = setInterval(async () => {
        this.printChart(grafana);
      }, grafana.options.refreshTime);
    }
  }
  showAdvancedSetting(grafana, dialogWindow) {
    let arr = [];   // used for displaying previously set thresholds by opening dialog
    grafana.options.widgetOptions.singleStat.gradeThresholds.map((item) => {
      arr.push(item);
    });
    let suggestedThre = arr[arr.length - 1].lowScore;  // used for suggesting threshold value based on last set threshold on dialog
    const state = {
      gradeThresholds: arr,  // containing threshold(low score and high score), title and its color
    };
    const actions = {
      getValues: () => state => state,
      setThreshold: ({index, value}) => ({gradeThresholds}) => {
        if (index === 0) {
          //gradeThresholds[index].lowScore = 0;
        } else {
          gradeThresholds[index].lowScore = value;
          gradeThresholds[index].highScore = value;
          suggestedThre = parseInt(value);
        }
        return {gradeThresholds};
      },
      setTitle: ({index, value}) => ({gradeThresholds}) => {
        gradeThresholds[index].title = value;
        return {gradeThresholds};
      },
      setColor: ({index, value}) => ({gradeThresholds}) => {
        gradeThresholds[index].color = value;
        return {gradeThresholds};
      },
      removeField: (index) => ({gradeThresholds}) => {
        if (index !== 0) {   // first threshold (min) is essentially needed and can not be removed
          gradeThresholds.splice(index, 1);
          suggestedThre = gradeThresholds[gradeThresholds.length - 1].lowScore;
          setTimeout(() => dialogWindow.emit("num-row-changed"), 100);
          return { gradeThresholds };
        }
      },
      addField: () => ({gradeThresholds}) => {
        suggestedThre += 10;
        gradeThresholds.push({
          title: '',
          lowScore: suggestedThre,
          highScore: '',
          color: '#' + (Math.random() * 0xfffff * 1000000).toString(16).slice(0, 6)
        });
        setTimeout(() => dialogWindow.emit("num-row-changed"), 100);
        return { gradeThresholds };
      }
    };

    const view = (state, actions) => (
      h(Box, {
        class: 'outer'
      },[
        h('hr', {}, ''),
        h('h4', { }, 'SingleStat Advanced Settings:  '),
      h('div', {class: 'grid-container3' },[
        h(Label, {}, 'Threshold:  '),
        h(Label, {}, 'Title:  '),
        h(Label, {}, 'Color:  '),
      ]),
      h(Box, { grow: 1, shrink: 1 }, [
        state.gradeThresholds.map((name, index) => {
          return h('div', {class: 'grid-container5'}, [
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
        h('div', {class: 'grid-container1'}, [
        h(Button, {
          onclick: () => actions.addField()
        }, 'Add Threshold')
      ])
    ])
    ])
    );
    return {state, actions, view};
  }
  saveWidgetOptions(widgetOptions, advSetting) {
    widgetOptions.singleStat.gradeThresholds = [];  // delete the previous set thresholds
    advSetting.gradeThresholds.sort((a, b) => (a.lowScore > b.lowScore) ? 1 : (b.lowScore > a.lowScore) ? -1 : 0);  // sort based on lowscore
    advSetting.gradeThresholds = advSetting.gradeThresholds.filter(item => item.lowScore !== '' && !isNaN(item.lowScore));  // remove objects with undefined threshold
    for (let i = advSetting.gradeThresholds.length - 1; i >= 0; i--) {
      if (i === advSetting.gradeThresholds.length - 1) {
        widgetOptions.singleStat.gradeThresholds.unshift({
          title: advSetting.gradeThresholds[i].title,
          color: advSetting.gradeThresholds[i].color,
          lowScore: parseInt(advSetting.gradeThresholds[i].lowScore),
          highScore:100000000000
        });
      } else {
        widgetOptions.singleStat.gradeThresholds.unshift({
          title: advSetting.gradeThresholds[i].title,
          color: advSetting.gradeThresholds[i].color,
          lowScore: parseInt(advSetting.gradeThresholds[i].lowScore),
          highScore: parseInt(advSetting.gradeThresholds[i + 1].lowScore)
        });
      }
    }
  }
  destroy(grafana) {
    grafana.chart.data = null;
  }

  resize(grafana){
   grafana.$mycontainer.style.fontSize = parseInt(grafana.$mycontainer.parentElement.style.width) * 0.025 + 'px';
  }

}