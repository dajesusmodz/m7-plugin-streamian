// Archive.org Addon for Streamian | M7 / Movian Media Center
// Version: 1.0
// Author: F0R3V3R50F7
exports.search = function (page, title) {
    var query = title;
    var episodeIdentifier = query.match(/s\d+e\d+/gi);
    var identifier;

    if (!episodeIdentifier) {
        identifier = /\d{4}/i;  // Look for the date if it's a movie
    } else {
        identifier = /S\d+E\d+/i;  // TV show episode identifier
    }

    var regex = /Trailer Park Boys\s+S\d+E\d+/i;
    var trailerparkboysQuery = regex.test(query) ? query.replace(regex, 'doopey poopy') : query;
    var modifiedQuery = episodeIdentifier ? trailerparkboysQuery.replace(identifier, '') : trailerparkboysQuery;

    var apiUrl = "https://archive.org/advancedsearch.php";

    var args = {
        q: modifiedQuery,
        fl: ["identifier", "title", "mediatype", "subject", "format"],
        sort: "downloads desc",
        rows: 35,
        page: 1,
        output: "json"
    };

    try {
        var response = showtime.httpReq(apiUrl, {
            args: args
        });

        var json = JSON.parse(response.toString());

        if (json.response && json.response.docs && json.response.docs.length > 0) {
            var results = [];
            var matchedFiles = [];
            var nonMatchedFiles = [];
            var videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv'];

            // Create a new cleaned query variable
            var cleanedQuery = query.replace(identifier, '');
            //page.appendItem('', 'separator', { title: "Cleaned Query: " + cleanedQuery });

            // Iterate over each document in the response
            for (var i = 0; i < json.response.docs.length; i++) {
                var doc = json.response.docs[i];

                //if (service.H265Filter && /[xXhH]265/i.test(doc.format)) {continue;} <----------- Couldn't find any HEVC content on the site at all

                if (doc.subject && doc.subject.indexOf('Movie Trailer') !== -1) {
                    continue;
                }

                var itemDetailsUrl = "https://archive.org/metadata/" + doc.identifier;
                var itemResponse = showtime.httpReq(itemDetailsUrl);
                var itemJson = JSON.parse(itemResponse.toString());

                // Check if there are files
                if (itemJson.files) {
                    var foundFile = false;

                    // Iterate over files to find matching episode or movie
                    for (var j = 0; j < itemJson.files.length; j++) {
                        var file = itemJson.files[j];

                        // Check if the file name includes the episode identifier from the query and is a video file
                        var isVideoFile = false;
                        for (var k = 0; k < videoExtensions.length; k++) {
                            if (file.name.toLowerCase().indexOf(videoExtensions[k]) !== -1) {
                                isVideoFile = true;
                                break;
                            }
                        }

                        if (episodeIdentifier && file.name.toLowerCase().indexOf(episodeIdentifier[0].toLowerCase()) !== -1 && isVideoFile) {
                            foundFile = true;
                            var videoLink = "https://archive.org/download/" + doc.identifier + "/" + encodeURIComponent(file.name);
                            var item = videoLink;  // Just the video link
                            matchedFiles.push({ title: file.name, item: item });
                        } else if (isVideoFile) {
                            var queryWords = cleanedQuery.toLowerCase().split(/\s+/);

                            if (queryWords.every(function(word) {
                                return file.name.toLowerCase().indexOf(word) !== -1;
                            })) {
                                var videoLink = "https://archive.org/download/" + doc.identifier + "/" + encodeURIComponent(file.name);
                                var item = videoLink;
                                nonMatchedFiles.push({ title: file.name, item: item });
                            }
                        }
                    }
                }
            }

            // Append matched files if any
            if (matchedFiles.length > 0) {
                var quality = 'Unknown';
                var seederCount = '15'; // Dummy value - since we're not actually dealing with torrents

                var magnetLink = matchedFiles[0].item;
                var item = magnetLink + " - " + quality + " - " + seederCount;
                results.push(item);
            } else {
                // Sort nonMatchedFiles by the length of the title
                nonMatchedFiles.sort(function(a, b) {
                    return a.title.length - b.title.length;
                });

                var quality = 'Unknown';
                var seederCount = '15'; // Dummy value - since we're not actually dealing with torrents

                if (nonMatchedFiles.length > 0 && !episodeIdentifier) {
                    var magnetLink = nonMatchedFiles[0].item;
                    var item = magnetLink + " - " + quality + " - " + seederCount;
                    results.push(item);
                } else {
                    return [];
                }
            }
            return results;
        } else {
            return [];
        }
    } catch (error) {
        showtime.trace("Error fetching data from Internet Archive: " + error);
        return [];
    }
};