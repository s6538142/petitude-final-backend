export default class Person2 {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  toString() {
    return JSON.stringify(this);
  }
}

export const PI = 3.14;

