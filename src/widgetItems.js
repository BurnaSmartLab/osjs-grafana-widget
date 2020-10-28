import StatsdWidget from './items/statsd';
import GaugeWidget from './items/gauge';
import BarWidget from './items/bars';
import SingleStatWidget from './items/singlestat';
import SingleStatAreaWidget from './items/singleStatArea';
import BadgeWidget from './items/badge';

import statsdImage from '../XY-Chart.png';
import gaugeImage from '../gauge-Chart.png';
import barChartImage from '../bar-Chart.png';
import singleStatImage from '../singleStat-Chart.png';
import badgeImage from '../badge-Chart.png';

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
  },
  singleStat:{
    object: SingleStatWidget,
    name: 'SINGLESTAT',
    image: singleStatImage
  },
  singleStatArea:{
    object: SingleStatAreaWidget,
    name: 'SINGLESTATArea',
    image: singleStatImage
  },
  badge:{
    object: BadgeWidget,
    name: 'BADGE',
    image:badgeImage
  },
};
export default widgetItem;
