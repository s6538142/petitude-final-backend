// CJS 匯入

const { Person1, PI: MY_CONST } = require("./person1.cjs");

const p1 = new Person1("David", 29);

console.log(p1);
console.log(p1 + '');
console.log(MY_CONST);
