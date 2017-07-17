$(document).ready(function () {
    "use strict";

    $("button").click(function () {
        const candidate = $(this).text().trim();
        const glyphicon = $(this).find(".glyphicon");

        $.post("/candidates/" + candidate, function () {
            glyphicon.css("opacity", 1).animate({ opacity: 0 });
        });
    });
});
