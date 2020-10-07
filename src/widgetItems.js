import StatsdWidget from './items/statsd';
import GaugeWidget from './items/gauge';
import BarWidget from './items/bars';
const widgetItem = {
  statsd:{
    object: StatsdWidget,
    name: 'STATSD'
  },
  gauge:{
    object: GaugeWidget,
    name: 'GAUGE'
  },
  barChart:{
    object: BarWidget,
    name: 'BARCHART'
  }
};
export default widgetItem;
