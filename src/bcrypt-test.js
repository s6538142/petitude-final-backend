import bcrypt from "bcrypt";

const pw = "13579";

const hash = await bcrypt.hash(pw, 8);

console.log({ hash });

const hash2 = "$2b$12$5Ao8OA.b0.o6ENkRcBu9c.TE7GRnsjlAIg96JWfx0NA6uoAGWsFNa";

// 比對
const result = await bcrypt.compare("13579_", hash2);
console.log({ result });
