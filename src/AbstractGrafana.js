export default class AbstractGrafana {
  constructor() {
    if(this.constructor === AbstractGrafana) {
      throw new Error(' Object of Abstract Class cannot be created');
    }
  }
  printChart() {
    throw new Error('Abstract Method has no implementation');
  }
}
