import SuperGrafanaWidget from './src/SuperGrafanaWidget';
import * as translations from './locales';
import StatsdtWidget from './src/items/statsd';

export default class GrafanaWidget extends SuperGrafanaWidget {
  init() {
    super.init();
    // eslint-disable-next-line no-unused-vars
    if (this.options.widgetType === null) {
      const {translate: _, translatable} = this.core.make('osjs/locale');
      const __ = translatable(translations);
      this.core.make('osjs/dialog', 'choice', {
        title: __('TTL_TIME_RANGE'),
        message: __('MSG_TIME_RANGE'),
        value: this.options.timeRange,
        choices: {
          '300000': 'Last 5 minutes',
          '900000': 'Last 15 minutes',
          '1800000': 'Last 30 minutes',
          '3600000': 'Last 1 hour',
          '10800000': 'Last 3 hours',
          '21600000': 'Last 6 hours',
          '43200000': 'Last 12 hours',
          '86400000': 'Last 24 hours',
          '172800000': 'Last 2 days',
          '604800000': 'Last 7 days',
          // '2592000000000': 'Last 30 days',
        },
      }, (btn, value) => {
        if (btn === 'ok') {
          this.options.timeRange = value;
          if ((value >= 86400000) && (value < 604800000) && (this.options.timeGroupBy < 10000)) {
            this.options.timeGroupBy = '60000';
            console.log(this.options.timeGroupBy);
          }else if ((value >= 604800000) && (this.options.timeGroupBy < 300000)) {
            this.options.timeGroupBy = '300000';
            console.log(this.options.timeGroupBy);
          }
          this.saveSettings();
          this.updateChartData();
          this.options.widget = new StatsdtWidget();
          this.render(this.options.widget.test());
        }
      });
    }
  }
}
