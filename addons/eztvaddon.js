// EZTV Scraper for Streamian | M7 / Movian Media Center
// Version: 1.0
// Author: F0R3V3R50F7
exports.search = function (page, title) {
    var searchUrl = "https://eztvx.to/search/" + encodeURIComponent(title);
    var results = [];
    try {
        var httpResponse = http.request(searchUrl);
        var searchPage = html.parse(httpResponse);
        var tbodyElement = searchPage.root.getElementByTagName('tbody')[4];
        if (!tbodyElement) return [];
        var torrents = tbodyElement.getElementByTagName('tr');
        if (torrents.length === 0) return [];
        for (var i = 2; i < torrents.length; i++) {
            var torrent = torrents[i];
            try {
                if (!torrent) continue;
                var titleElements = torrent.getElementByTagName('td');
                var titleElement = titleElements[1];
                if (service.H265Filter && /[xXhH]265/i.test(torrent.textContent)) continue;
                if (!titleElement) continue;
                
                var seederIndex = (i == 2) ? 5 : 4;
                var seederElement = torrent.getElementByTagName('td')[seederIndex];
                if (!seederElement) continue;
                var seederCount = parseInt(seederElement.textContent.trim());
                if (seederCount === 0) continue;

                var linkElement = titleElement.getElementByTagName('a')[0];
                var torrentPageLink = linkElement.attributes.getNamedItem('href').value;
                if (!torrentPageLink) continue;

                var torrentPageResponse = http.request("https://eztvx.to" + torrentPageLink);
                var htmlString = torrentPageResponse.toString();
                var magnetLinkMatch = htmlString.match(/href="(magnet:[^"]+)"/);
                if (!magnetLinkMatch || !magnetLinkMatch[1]) continue;
                var magnetLink = magnetLinkMatch[1];

                var quality = null;
                if (/1080p/i.test(titleElement.textContent)) quality = "1080p";
                if (/720p/i.test(titleElement.textContent)) quality = "720p";
                if (!quality) continue;
                
                var item = magnetLink + " - " + quality + " - " + seederCount;
                results.push(item);
            } catch (error) {
                continue;
            }
        }
        return results;             
    } catch (err) {
        page.loading = false;
        return [];
    }
};