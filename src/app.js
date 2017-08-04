module.exports = (() => {
    "use strict";

    const _ = require("lodash");
    const express = require("express");
    const path = require("path");
    const redis = require("redis");

    /**
     * For demonstration purposes, we'll assume you're running a Redis server locally. You should
     * fiddle with this if you want to optimize performance. (e.g., by using sockets)
     */
    const client = redis.createClient();

    /**
     * Names of candidates. This will be used to construct Redis keys.
     *
     * If you know the names in advance, you might want to put it here so it will persist across
     * server restarts. Otherwise, you'll need to wait until everyone gets at least one vote before
     * you can see the full statistics.
     * @type {Set.<string>}
     */
    const candidates = new Set(["薯片", "林林", "正氣"]);

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

        // Rate limit to 1 vote per candidate per IP per 5 second.
        const remoteAddress = req.connection.remoteAddress;
        const currentFiveSecond = secondsSinceEpoch - secondsSinceEpoch % 5;
        const rateLimitKey = remoteAddress + "|" + currentFiveSecond + "|" + req.params.id;

        client.get(rateLimitKey, (err, reply) => {
            if (err) {
                return res.status(500).send(err.message);
            }

            if (reply && reply >= 1) {
                return res.send("Over limit!");
            }

            client.multi()
                .incr(rateLimitKey)
                .expire(rateLimitKey, 5)
                .exec((err) => {
                    if (err) {
                        return res.status(500).send(err.message);
                    }

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

    app.use(express.static(path.join(__dirname, "../public")));

    if (require.main === module) {
        app.listen(process.env.PORT || 3000);
    }

    return app;
})();
