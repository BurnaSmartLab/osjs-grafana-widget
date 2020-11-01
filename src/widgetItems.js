import AreaWidget from './items/area';
import GaugeWidget from './items/gauge';
import BarWidget from './items/bars';
import SingleStatWidget from './items/singleStat';
import BadgeWidget from './items/badge';

import areaImage from './items/area/XY-Chart.png';
import gaugeImage from './items/gauge/gauge-Chart.png';
import barChartImage from './items/bars/bar-Chart.png';
import singleStatImage from './items/singleStat/singleStat-Chart.png';
import badgeImage from './items/badge/badge-Chart.png';

const widgetItem = {
  area:{
    object: AreaWidget,
    name: 'AREA',
    image: areaImage
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
  badge:{
    object: BadgeWidget,
    name: 'BADGE',
    image: badgeImage
  },
};
export default widgetItem;
