module.exports = (() => {
    "use strict";

    const _ = require("lodash");
    const express = require("express");
    const redis = require("redis");

    /**
     * For demonstration purposes, we'll assume you're running a Redis server locally. You should
     * fiddle with this if you want to optimize performance. (e.g., by using sockets)
     */
    const client = redis.createClient();

    /**
     * Names of candidates. This will be used to construct Redis keys.
     * @type {Set.<string>}
     */
    const candidates = new Set();

    const app = express();

    /**
     * Vote for a candidate.
     *
     * This will do two things: increment the total vote count and the "minute bucket" for that
     * candidate. A minute bucket keeps track of how many votes a candidate got within a particular
     * minute in the past. This allows us to visualize the velocity of votes.
     */
    app.post("/candidates/:id", (req, res) => {
        const secondsSinceEpoch = Math.floor(new Date() / 1000);
        const currentMinute = secondsSinceEpoch - secondsSinceEpoch % 60;
        const bucket = req.params.id + ":" + currentMinute.toString();

        client.multi()
            .incr(req.params.id)
            .incr(bucket)
            .expire(bucket, 666)
            .exec((err, reply) => {
                if (err) {
                    return res.status(500).send(err.message);
                }

                candidates.add(req.params.id);
                return res.send(reply.toString());
            });
    });

    /**
     * Get voting results on all candidates.
     *
     * To reduce network round trips, we will combine two functions into one call: getting the total
     * vote count for each candidate and the vote distribution within the last 10 minutes.
     *
     * A JSON will be returned in the following format:
     * {
     *     votes: { 'Adam': '10', ... },
     *     visualization: { 'Adam:1483200000': '3', 'Adam:1483200060': '7', ... }
     * }
     *
     * This example indicates:
     * - Adam has a total of 10 votes so far.
     * - 3 of which were obtained on 2017-01-01 12:00:00 AM < 12:01:00 AM.
     * - 7 of which were obtained on 2017-01-01 12:01:00 AM < 12:02:00 AM.
     *
     * You will see nulls if a candidate has no votes or if a minute bucket is empty.
     */
    app.get("/candidates", (req, res) => {
        const secondsSinceEpoch = Math.floor(new Date() / 1000);
        const currentMinute = secondsSinceEpoch - secondsSinceEpoch % 60;

        // Generate the keys for all minute buckets within the last 10 minutes for all candidates.
        const buckets = _.chain(_.range(10))
            .map((minuteOffset) => {
                return _.map([...candidates.keys()], (candidate) => {
                    return candidate + ":" + (currentMinute - minuteOffset * 60);
                });
            })
            .flatten()
            .value();

        const keys = [...candidates.keys()].concat(buckets);
        client.mget(keys, (err, reply) => {
            if (err) {
                return res.status(500).send(err.message);
            }

            return res.json({
                votes: _.zipObject([...candidates.keys()], reply.slice(0, candidates.size)),
                visualization: _.zipObject(buckets, reply.slice(candidates.size))
            });
        });
    });

    if (require.main === module) {
        app.listen(process.env.PORT || 3000);
    }

    return app;
})();
