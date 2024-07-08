// 1337x Scraper for Streamian | M7 / Movian Media Center
// Version: 1.4
// Author: F0R3V3R50F7
exports.search = function (page, title) {
    page.loading = true;
    var relevantTitlePartMatch = title.match(/^(.*?)(?:\sS\d{2}E\d{2}|\s\d{4})/i);
    var relevantTitlePart = relevantTitlePartMatch[1].trim().toLowerCase().replace(/\./g, ' ').replace(/[\-:]/g, '');
    //page.appendItem("", "separator", { title: "Relevant Title Part: " + relevantTitlePart });

    var searchUrl = "https://1337x.to/sort-search/" + encodeURIComponent(title) + "/seeders/desc/1/";
    var results = [];  // Initialize the results array
    try {
        httpResponse = http.request(searchUrl);
        //page.appendItem("", "separator", { title: "HTTP Response 1: " + httpResponse });
        searchPage = html.parse(httpResponse);
        //page.appendItem("", "separator", { title: "HTML parsed successfully" });
        tbodyElement = searchPage.root.getElementByTagName('tbody')[0];
        if (!tbodyElement) {
            throw new Error("No tbody element found.");
        }
        torrents = tbodyElement.getElementByTagName('tr');
        //page.appendItem("", "separator", { title: "Number of torrents found: " + torrents.length });
        if (torrents.length === 0) {
            throw new Error("No torrents found on search page.");
        }
        for (var i = 0; i < torrents.length; i++) {
            var torrent = torrents[i];
            
            try {
                if (!torrent) {
                    throw new Error("Invalid torrent element");
                }
                var titleElements = torrent.getElementByTagName('a');
                var titleElement = titleElements[1];
                if (service.H265Filter && /[xXhH]265/i.test(titleElement.textContent)) {continue;}

                //page.appendItem("", "separator", { title: "Relevant Title Part: " + relevantTitlePart });
                //page.appendItem("", "separator", { title: "Found title element: " + titleElement.textContent });

                var titleForCheck = titleElement.textContent.trim().toLowerCase().replace(/\./g, ' ').replace(/[\-:]/g, '');
                if (titleForCheck.indexOf(relevantTitlePart) === -1) continue;
                //if (!titleElement) {throw new Error("Second 'a' tag element is undefined");}
                
                var seederElement = torrent.getElementByTagName('td')[1];
                //if (!seederElement) {throw new Error("Seeder element not found");}
                var seederCount = seederElement.textContent.trim();
                var torrentPageLink = titleElement.attributes.getNamedItem('href').value;
                //if (!torrentPageLink) {throw new Error("Invalid torrent page link");}
                //page.appendItem("", "separator", { title: "Found Page link: " + torrentPageLink });
                var torrentPageResponse = http.request("https://1337x.to" + torrentPageLink);
                var htmlString = torrentPageResponse.toString();
                var magnetLinkMatch = htmlString.match(/href="(magnet:[^"]+)"/);
                if (magnetLinkMatch && magnetLinkMatch[1]) {
                    var magnetLink = magnetLinkMatch[1];
                    //page.appendItem("", "separator", { title: "FoundMag: " + magnetLink });
                } else {
                    //page.appendItem("", "separator", { title: "Magnet Not Found" });
                    continue;
                }

                if (/coppersurfer/i.test(magnetLink)){
                    continue;
                }

                var quality = "Unknown";
                if (/1080p/i.test(titleElement.textContent)){
                    quality = "1080p";
                } else if (/720p/i.test(titleElement.textContent)){
                    quality = "720p";
                } else if (/XviD/i.test(titleElement.textContent)){
                    quality = "480p";
                }
                var item = magnetLink + " - " + quality + " - " + seederCount;
                results.push(item);
            } catch (error) {
                //page.appendItem("", "separator", { title: "Error processing torrent: " + error.message });
                return [];
            }
        }
        page.loading = false;
        return results;             
    } catch (err) {
        //page.appendItem("", "separator", { title: "Fallback Error: " + err.message });
        page.loading = false;
        return [];
    }
}