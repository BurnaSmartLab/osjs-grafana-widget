import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import AbstractGrafana from '../AbstractGrafana';

export default class StatsdWidget extends AbstractGrafana {
  constructor(widgetOptions) {
    // custom widget option could be added here.
    super();
    this.chartSize = 0;
  }
  // Every rendering tick (or just once if no canvas)
  async printChart(grafana) {
    /* Chart code */
    // Themes begin
    am4core.useTheme(am4themes_animated);
    // Themes end

    // Create chart
    grafana.chart = am4core.create(grafana.$mycontainer, am4charts.XYChart);
    grafana.chart.paddingRight = 20;

    let title = grafana.chart.chartContainer.createChild(am4core.Label);
    title.color = '#df1';
    title.text = '- ' + grafana.options.measurement;

    // get chart data and assigned it to this.chart.data
    this.updateChartData(grafana);

    let dateAxis = grafana.chart.xAxes.push(new am4charts.DateAxis());


    dateAxis.baseInterval = {
      'timeUnit': 'second',
      'count': 10
    };
    dateAxis.tooltipDateFormat = 'YYYY-MM-dd HH:mm:ss';

    let valueAxis = grafana.chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.tooltip.disabled = true;
    valueAxis.title.text = '';

    let series = grafana.chart.series.push(new am4charts.LineSeries());
    series.dataFields.dateX = 'date';
    series.dataFields.valueY = 'events';
    series.tooltipText = 'Events: [bold]{valueY}[/]';
    series.fillOpacity = 0.8;


    grafana.chart.cursor = new am4charts.XYCursor();
    grafana.chart.cursor.lineY.opacity = 0;
    grafana.chart.scrollbarX = new am4charts.XYChartScrollbar();
    grafana.chart.scrollbarX.series.push(series);


    dateAxis.start = 0.0;
    dateAxis.keepSelection = true;

    dateAxis.interpolationDuration = 500;
    dateAxis.rangeChangeDuration = 500;

    if (grafana.options.refreshTime !== 'off') {
      this.startPoll(grafana);
    }else {
      grafana.stopPoll();
    }

  }
  async updateChartData(grafana) {
    let chartData = [];
    //let url = '/grafana/api/datasources/proxy/1/query?db=opentsdb&q=SELECT distinct("value") FROM "netdata.apps.cpu.system" WHERE time >= now() - 12h GROUP BY time(1m) fill(null)'
    let url = `/grafana/api/datasources/proxy/1/query?db=opentsdb&q=SELECT ${grafana.options.aggregateSelect}("value") FROM "${grafana.options.measurement}" WHERE time >= now() - ${grafana.options.timeRange}ms GROUP BY time(${grafana.options.timeGroupBy}ms) fill(null)&epoch=ms`;
    let response = await fetch(url);
    if (response.ok) {
      let data = await response.json();
      chartData = data.results[0].series[0].values;
      // console.log(chartData);
      chartData.map(arr => {
        arr.date = arr[0];
        arr.events = arr[1];
        delete arr[0];
        delete arr[1];
      });
      this.chartSize = chartData.length;
      grafana.chart.data = chartData;
    }else {
      alert('HTTP-Error: ' + response.status);
    }
  }
  startPoll(grafana) {
    grafana.stopPoll();
    if (grafana.options.refreshTime !== 'off') {
      grafana._interval = setInterval(async () => {
        let chartData = [];
        let timeRange = grafana.options.refreshTime < 20000 ? 20000 : grafana.options.refreshTime;
        let url = `/grafana/api/datasources/proxy/1/query?db=opentsdb&q=SELECT ${grafana.options.aggregateSelect}("value") FROM "${grafana.options.measurement}" WHERE time >= now() - ${timeRange}ms GROUP BY time(${grafana.options.timeGroupBy}ms) fill(null)&epoch=ms`;
        let response = await fetch(url);
        if (response.ok) {
          let data = await response.json();
          chartData = data.results[0].series[0].values;
          chartData.map(arr => {
            arr.date = arr[0];
            arr.events = arr[1];
            delete arr[0];
            delete arr[1];
          });
        } else {
          alert('HTTP-Error: ' + response.status);
        }
        grafana.chart.addData(
          chartData,
          1
        );
        this.chartSize = chartData.length;
        chartData = null;
      }, grafana.options.refreshTime);
    }
  }

  showAdvancedSetting(grafana){
  return{};
}
saveWidgetOptions(widgetOptions, advSetting){
}
destroy(grafana){
  grafana.chart.data = null;
  grafana.chart.dispose();
}
resize(grafana){
  grafana.$mycontainer.style.fontSize = parseInt(grafana.$mycontainer.parentElement.style.width) * 0.025 + 'px';
}
}
