import { objectToHtml } from "../src";
import { writeFileSync } from "fs";

describe("objectToHtml", () => {
  it("should convert an error object to HTML", () => {
    const error = new Error("Something went wrong");
    // const html = objectToHtml(error);
    const html = objectToHtml({
      a: "a",
      b: { c: "c wish me luck & @ dont run &'", d: [1, 2, 3, 4] },
      c: [1, 2, { e: "e" }, 4, 5],
    });

    console.log(html);
    writeFileSync("output.html", html);
  });
});
