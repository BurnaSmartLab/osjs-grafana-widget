export default class AbstractGrafana {
  constructor() {
    if(this.constructor === AbstractGrafana) {
      throw new Error(' Object of Abstract Class cannot be created');
    }
  }
  printChart() {
    throw new Error('Abstract Method has no implementation');
  }

  startPoll() {
    throw new Error('Abstract Method has no implementation');
  }

  showAdvancedSetting() {
    throw new Error('Abstract Method has no implementation');
  }

  saveWidgetOptions() {
    throw new Error('Abstract Method has no implementation');
  }

  destroy() {
    throw new Error('Abstract Method has no implementation');
  }

  resize() {
    throw new Error('Abstract Method has no implementation');
  }
}
