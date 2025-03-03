const multiply = require("../utils/multiply");
const get_chai = require("../util/get_chai");

describe("testing multiply", () => {
  it("should give 4*5 is 20", async () => {
    const { expect } = await get_chai();
    expect(multiply(4, 5)).to.equal(20);
  });
});
