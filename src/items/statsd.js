import SuperGrafanaWidget from '../SuperGrafanaWidget';

import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';

export default class StatsdtWidget extends SuperGrafanaWidget {
  constructor(core, options) {
    super(core, options, {
      dimension: {
        width: 700,
        height: 300
      }
    }, {
    });
  }

  // Every rendering tick (or just once if no canvas)
  async test() {
    /* Chart code */
    // Themes begin
    am4core.useTheme(am4themes_animated);
    // Themes end

    // Create chart
    this.chart = am4core.create(this.$mycontainer, am4charts.XYChart);
    this.chart.paddingRight = 20;

    let title = this.chart.chartContainer.createChild(am4core.Label);
    title.color = '#df1';
    title.text = '- ' + this.options.measurment;

    // get chart data and assigned it to this.chart.data
    this.updateChartData();

    let dateAxis = this.chart.xAxes.push(new am4charts.DateAxis());


    dateAxis.baseInterval = {
      'timeUnit': 'second',
      'count': 10
    };
    dateAxis.tooltipDateFormat = 'YYYY-MM-dd HH:mm:ss';

    let valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.tooltip.disabled = true;
    valueAxis.title.text = '';

    let series = this.chart.series.push(new am4charts.LineSeries());
    series.dataFields.dateX = 'date';
    series.dataFields.valueY = 'events';
    series.tooltipText = 'Events: [bold]{valueY}[/]';
    series.fillOpacity = 0.8;


    this.chart.cursor = new am4charts.XYCursor();
    this.chart.cursor.lineY.opacity = 0;
    this.chart.scrollbarX = new am4charts.XYChartScrollbar();
    this.chart.scrollbarX.series.push(series);


    dateAxis.start = 0.0;
    dateAxis.keepSelection = true;

    dateAxis.interpolationDuration = 500;
    dateAxis.rangeChangeDuration = 500;

    if (this.options.refresh !== 'off') {
      this.startPoll();
    }else {
      this.stopPoll();
    }
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
        }else {
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

  async updateChartData() {
    let chartData = [];
    let url = `/grafana/api/datasources/proxy/1/query?db=opentsdb&q=SELECT ${this.options.aggregateFunction}("value") FROM "${this.options.measurment}" WHERE time >= now() - ${this.options.timeRange}ms GROUP BY time(${this.options.timeGroupBy}ms) fill(null)&epoch=ms`;
    let response = await fetch(url);
    if (response.ok) {
      let data = await response.json();
      chartData = data.results[0].series[0].values;
      console.log(chartData);
      chartData.map(arr => {
        arr.date = arr[0];
        arr.events = arr[1];
        delete arr[0];
        delete arr[1];
      });
      this.chartSize = chartData.length;
      this.chart.data = chartData;
    }else {
      alert('HTTP-Error: ' + response.status);
    }
  }
}
