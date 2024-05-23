class Person1 {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  toString() {
    return JSON.stringify(this);
  }
}

const PI = 3.14;

// CJS 匯出
module.exports = { Person1, PI };
