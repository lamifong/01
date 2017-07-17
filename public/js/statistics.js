$(document).ready(function () {
    "use strict";

    // Set the order of candidates to show.
    const candidates = ["薯片", "林林", "正氣"];

    $.get("/candidates", function (data) {
        // First, let's update the total vote count for each candidate.
        const div = $("#count");
        $.each(candidates, function (_, candidate) {
            div.append("<p>" + candidate + ": " + (parseInt(data.votes[candidate]) || 0) + "</p>");
        });

        // Now, we need to construct the data that plotly.js requires.
        const traces = {};

        // Extract minute buckets into tuples.
        $.each(data.visualization, function (bucket, count) {
            const candidate = bucket.split(":")[0];
            const timestamp = bucket.split(":")[1];
            traces[candidate] = traces[candidate] || [];
            traces[candidate].push([timestamp, parseInt(count) || 0]);
        });

        $.each(traces, function (candidate, tuples) {
            // Sort minute buckets in ascending time order.
            tuples.sort(function (a, b) {
                return a[0] - b[0];
            });

            // Minute buckets contain the delta of votes, not the actual count at a particular time.
            const deltas = $.map(tuples, function (tuple) {
                return tuple[1];
            });

            // Since the buckets are in order of time, the last bucket should be the current count.
            tuples[tuples.length - 1][1] = parseInt(data.votes[candidate]) || 0;

            // Then, we can calculate the history of vote counts by subtracting the deltas.
            for (let index = tuples.length - 2; index >= 0; --index) {
                tuples[index][1] = tuples[index + 1][1] - deltas[index + 1];
            }

            // Convert timestamps into HH:mm format for prettier display.
            $.each(tuples, function (_, tuple) {
                const date = new Date(0);
                date.setUTCSeconds(tuple[0]);
                tuple[0] = date.toTimeString().slice(0, 5);
            });
        });

        const plotData = $.map(candidates, function (candidate) {
            return {
                x: $.map(traces[candidate], function (tuple) {
                    return tuple[0];
                }),
                y: $.map(traces[candidate], function (tuple) {
                    return tuple[1];
                }),
                mode: "lines+markers",
                name: candidate
            };
        });

        Plotly.newPlot("graph", plotData, { title: "History of Vote Counts" });
    });
});
