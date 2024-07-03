// EZTV Scraper for Streamian | M7 / Movian Media Center
// Version: 1.0
// Author: F0R3V3R50F7
exports.search = function (page, title) {

    /*Scrap this and scrape the page old school.

    var apiUrl = "https://eztvx.to/api/get-torrents?imdb_id=" + encodeURIComponent(imdbid);
    var response = http.request(apiUrl);
    var json = JSON.parse(response);
    if (json && json.torrents && json.torrents.length > 0) {
        var results = [];
        json.torrents.forEach(function (torrent) {
            var seederCount = torrent.seeds;
            var magnetLink = torrent.magnet_url;
            var item = magnetLink + " - " + torrent.title + " - " + seederCount;
            results.push(item);
        });
        return results;
    } else {
        return [];
    }*/
    return [];
};