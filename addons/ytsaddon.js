// YTS Addon for Streamian | M7 / Movian Media Center
// Version: 1.1
// Author: F0R3V3R50F7
var http = require('movian/http');
exports.search = function (page, title) {
    // YTS API URL
    var apiUrl = "https://yts.mx/api/v2/list_movies.json?query_term=" + encodeURIComponent(title);
    var response = http.request(apiUrl);
    var json = JSON.parse(response);
    if (json.data && json.data.movies && json.data.movies.length > 0) {
        var results = [];
        json.data.movies.forEach(function (movie) {
            movie.torrents.forEach(function (torrent) {
                var quality = torrent.quality;
                var seederCount = torrent.seeds;
                var magnetLink = torrent.url;
                if (service.H265Filter && /[xXhH]265/i.test(magnetLink)) {return [];}
                var item = magnetLink + " - " + quality + " - " + seederCount;
                results.push(item);
            });
        });
        return results;
    } else {
        //page.appendItem("", "message", { title: "No results found on YTS for " + decodedTitle });
        return [];
    }
};