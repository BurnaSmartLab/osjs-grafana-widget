import StatsdWidget from './items/statsd';
import GaugeWidget from './items/gauge';
import BarWidget from './items/bars';
import statsdImage from '../XY-Chart.png';
import gaugeImage from '../gauge-Chart.png';
import barChartImage from '../bar-Chart.png';

const widgetItem = {
  statsd:{
    object: StatsdWidget,
    name: 'STATSD',
    image: statsdImage
  },
  gauge:{
    object: GaugeWidget,
    name: 'GAUGE',
    image: gaugeImage
  },
  barChart:{
    object: BarWidget,
    name: 'BARCHART',
    image: barChartImage
  }
};
export default widgetItem;
