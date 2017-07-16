(() => {
    "use strict";

    const app = require("../src/app");
    const chai = require("chai");
    const assert = chai.assert;

    chai.use(require("chai-http"));

    describe("app.js", () => {
        describe("POST /candidates/:id", () => {
            it("should increment the vote count and minute bucket", () => {
                const secondsSinceEpoch = Math.floor(new Date() / 1000);
                const currentMinute = secondsSinceEpoch - secondsSinceEpoch % 60;

                return chai.request(app)
                    .post("/candidates/Adam")
                    .then(() => {
                        return chai.request(app)
                            .get("/candidates")
                            .then((res) => {
                                const bucket = "Adam" + ":" + currentMinute;
                                assert.isAtLeast(res.body.votes.Adam, 1);
                                assert.isAtLeast(res.body.visualization[bucket], 1);
                            });
                    });
            });
        });
    });
})();
