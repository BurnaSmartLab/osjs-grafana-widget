import * as d3 from "d3";
import AbstractGrafana from '../AbstractGrafana';


export default class BarWidget extends AbstractGrafana {
    constructor(grafana) {

        super();

        grafana.attributes.minDimension.width = 300;
        grafana.attributes.minDimension.height = 200;
        grafana.attributes.maxDimension.width = 500;
        grafana.attributes.maxDimension.height = 400;

        if (!('barChart' in grafana.options.widgetOptions)) {
            grafana.options.widgetOptions.barChart = {
                //empty
            };
            grafana.options.dimension.width = 300;
            grafana.options.dimension.height = 200;
        }
    }

    async printChart(grafana) {

        let data = await this.updateChartData(grafana);
        grafana.$mycontainer.innerHTML = "";

        let margin = ({ top: 30, right: 20, bottom: 50, left: 70 }),
            width = grafana.$mycontainer.offsetWidth,
            height = grafana.$mycontainer.offsetHeight;

        let color = "#33D1FF";

        let x = d3.scaleBand()
            .domain(d3.range(data.length))
            .range([margin.left, width - margin.right])
            .padding(0.1);

        let y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)]).nice()
            .range([height - margin.bottom, margin.top]);


        // customizing x axis according to the selected timerange
        let parseDate = null,
            tickValues = [],
            tickCount = 0,
            startValue = 0;
        if (grafana.options.timeRange >= 172800000) {
            parseDate = d3.timeFormat("%d %b");
            tickCount = 2;
        }
        else if (grafana.options.timeRange >= 43200000) {
            parseDate = d3.timeFormat("%H:%M %p");
            tickCount = 3;
        }
        else {
            parseDate = d3.timeFormat("%H:%M");
            tickCount = 5;
        }
        for (let i = 0; i < tickCount; i++) {
            tickValues[i] = startValue;
            startValue += Math.round(data.length / tickCount);
        }


        let yAxis = g => g
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(5, data.format))
            .selectAll("text")
            .style("font-size", "0.9em")
            .style("color", "black")
            .style("font-weight", "500");


        let xAxis = g => g
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).tickValues(tickValues).tickFormat(i => parseDate(data[i].name)).tickSizeOuter(0))
            .selectAll("text")
            .style("font-size", "0.9em")
            .style("color", "black")
            .style("font-weight", "500");


        grafana.chart = d3.select(grafana.$mycontainer)
            .append('svg')
            .attr("viewBox", [0, 0, width, height])
            .style("width", '100%')
            .style("height", '100%');

        grafana.chart.append("g")
            .attr("fill", color)
            .selectAll("rect")
            .data(data)
            .join("rect")
            .attr("x", (d, i) => x(i))
            .attr("y", d => y(d.value))
            .attr("height", d => y(0) - y(d.value))
            .attr("width", x.bandwidth())

        grafana.chart.append("g")
            .call(xAxis)


        grafana.chart.append("g")
            .call(yAxis)

        // text label for the x axis
        grafana.chart.append("text")
            .attr("x", width / 2)
            .attr("y", height - 10)
            .style("text-anchor", "middle")
            .style("font-Size", "1.5em")
            .text((grafana.options.title === '' ? grafana.options.measurement : grafana.options.title) + 
                  (grafana.options.unit === '' ? '': ' (' + grafana.options.unit + ')'))


        if (grafana.options.refreshTime !== 'off') {
            this.startPoll(grafana);
        } else {
            grafana.stopPoll();
        }

    }

    async updateChartData(grafana) {
        let chartData = [];
        let url = `/grafana/api/datasources/proxy/1/query?db=opentsdb&q=SELECT ${grafana.options.aggregateSelect}("value") FROM "${grafana.options.measurement}" WHERE time >= now() - ${grafana.options.timeRange}ms GROUP BY time(${grafana.options.timeGroupBy}ms) fill(null)&epoch=ms`;
        let response = await fetch(url);
        if (response.ok) {
            let data = await response.json();
            chartData = data.results[0].series[0].values;
            chartData.map(arr => {
                arr.name = arr[0];
                arr.value = arr[1];
                delete arr[0];
                delete arr[1];
            });
            return chartData;
        } else {
            alert('HTTP-Error: ' + response.status);
        }
    }

    startPoll(grafana) {
        grafana.stopPoll();
        if (grafana.options.refreshTime !== 'off') {
            grafana._interval = setInterval(async () => {
                this.printChart(grafana);
            }, grafana.options.refreshTime);
        }
    }

    showAdvancedSetting(grafana) {
        return {};
    }

    saveWidgetOptions(widgetOptions, advSetting) {
    }

    destroy(grafana) {

    }

    resize(grafana) {
        grafana.$mycontainer.style.fontSize = parseInt(grafana.$mycontainer.parentElement.style.width) * 0.025 + 'px';
    }


}
