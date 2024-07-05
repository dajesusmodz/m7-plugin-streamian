// Archive.org Addon for Streamian | M7 / Movian Media Center
// Version: 1.2
// Author: F0R3V3R50F7
exports.search = function (page, title) {
    var relevantTitlePartMatch = title.match(/^(.*?)(?:\sS\d{2}E\d{2}|\s\d{4})/i);
    var relevantTitlePart = relevantTitlePartMatch[1].trim().toLowerCase().replace(/:/g, '');

    page.loading = true;
    var query = title;
    var episodeIdentifier = query.match(/s\d+e\d+/gi);
    var identifier;

    if (!episodeIdentifier) {
        identifier = /\d{4}/i;  // Look for the date if it's a movie
    } else {
        identifier = /S\d+E\d+/i;  // TV show episode identifier
    }

    // Check if the query includes 'Trailer Park Boys' exactly
    if (query.toLowerCase().indexOf('trailer park boys') !== -1) {
        modifiedQuery = 'doopey poopy';
    } else {
        modifiedQuery = relevantTitlePart
    }

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

                        
                        //page.appendItem("", "separator", { title: "Relevant Title: " + relevantTitlePart });


                        var titleForCheck = file.name.trim().toLowerCase().replace(/\./g, ' ');
                        if (titleForCheck.indexOf(relevantTitlePart) === -1) continue;

                        //page.appendItem("", "separator", { title: "File Found: " + file.name });
                        
                        // Exclude "Trailer Park Boys: Jail" only if the input title does not include it
                        var excludeJail = relevantTitlePart.indexOf('trailer park boys jail') === -1 && titleForCheck.indexOf('trailer park boys jail') !== -1;
                        if (excludeJail) continue;

                        var excludeAnimated = relevantTitlePart.indexOf('trailer park boys the animated series') === -1 && titleForCheck.indexOf('trailer park boys the animated series') !== -1;
                        if (excludeAnimated) continue;

                        var excludeAnimated = relevantTitlePart.indexOf('trailer park boys out of the park') === -1 && titleForCheck.indexOf('trailer park boys out of the park') !== -1;
                        if (excludeAnimated) continue;

                        var quality = "Unknown";
                        if (/1080p/i.test(file.name)){
                            quality = "1080p";
                        } else if (/720p/i.test(file.name)){
                            quality = "720p";
                        } else if (/XviD/i.test(file.name)){
                            quality = "480p";
                        }

                        if (episodeIdentifier && file.name.toLowerCase().indexOf(episodeIdentifier[0].toLowerCase()) !== -1 && isVideoFile) {
                            foundFile = true;
                            var videoLink = "https://archive.org/download/" + doc.identifier + "/" + encodeURIComponent(file.name);
                            matchedFiles.push({ title: file.name, item: videoLink, quality: quality });
                        } else if (isVideoFile) {
                            var queryWords = cleanedQuery.toLowerCase().split(/\s+/);

                            if (queryWords.every(function(word) {
                                return file.name.toLowerCase().indexOf(word) !== -1;
                            })) {
                                var videoLink = "https://archive.org/download/" + doc.identifier + "/" + encodeURIComponent(file.name);
                                nonMatchedFiles.push({ title: file.name, item: videoLink, quality: quality });
                            }
                        }
                    }
                }
            }

            // Append matched files if any
            if (matchedFiles.length > 0) {
                for (var i = 0; i < matchedFiles.length; i++) {
                    var magnetLink = matchedFiles[i].item;
                    var quality = matchedFiles[i].quality;
                    var seederCount = '15'; // Dummy value - since we're not actually dealing with torrents

                    var item = magnetLink + " - " + quality + " - " + seederCount;
                    results.push(item);
                }
            } else {
                // Sort nonMatchedFiles by the length of the title
                nonMatchedFiles.sort(function(a, b) {
                    return a.title.length - b.title.length;
                });

                if (nonMatchedFiles.length > 0 && !episodeIdentifier) {
                    for (var i = 0; i < nonMatchedFiles.length; i++) {
                        var magnetLink = nonMatchedFiles[i].item;
                        var quality = nonMatchedFiles[i].quality;
                        var seederCount = '1000'; // Dummy value - since we're not actually dealing with torrents

                        var item = magnetLink + " - " + quality + " - " + seederCount;
                        results.push(item);
                    }
                } else {
                    return [];
                }
            }
            page.loading = false;
            return results;
        } else {
            return [];
        }
    } catch (error) {
        //showtime.trace("Error fetching data from Internet Archive: " + error);
        page.loading = false;
        return [];
    }
};