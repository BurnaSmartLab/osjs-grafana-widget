import StatsdWidget from './items/statsd';
import GaugeWidget from './items/gauge';
const widgetItem = {
  statsd:{
    object: StatsdWidget,
    name: 'STATSD'
  },
  gauge:{
    object: GaugeWidget,
    name: 'GAUGE'
  }
};
export default widgetItem;
