// On-Demand Module for Streamian | M7 / Movian Media Center
// Version: 1.0
// Author: F0R3V3R50F7
var http = require('movian/http');
exports.ondemand = function (page) {
    function fetchTrending(type) {
        var apiUrl = "https://api.themoviedb.org/3/trending/" + type + "/week?api_key=a0d71cffe2d6693d462af9e4f336bc06";
        try {
            var response = showtime.httpGet(apiUrl).toString();
            console.log("[DEBUG]: Trending API URL: " + apiUrl);
            console.log("[DEBUG]: Trending API Response: " + response);
            return JSON.parse(response).results;
        } catch (error) {
            console.log("[DEBUG]: Error fetching trending " + type + ": " + error);
            return [];
        }
    }
    var trendingShows = fetchTrending('tv');
    if (trendingShows.length > 0) {
        page.appendItem("", "separator", { title: "" });
        page.appendItem('', 'separator', {title: '  Popular Shows                                                                                                                                                                                                                                                               '});
        page.appendItem("", "separator", { title: "" });
        trendingShows.slice(0, 4).forEach(function(item) { // Limit to 4 items
            var title = item.name;
            var posterPath = item.poster_path ? "https://image.tmdb.org/t/p/w500" + item.poster_path : Plugin.path + "cvrntfnd.png";
            var item = page.appendItem(plugin.id + ":season:" + decodeURIComponent(title), "video", {
                title: title,
                icon: posterPath
            });
            var type = "show";
            var title = title;
                item.addOptAction('Add \'' + decodeURIComponent(title) + '\' to Your Library', (function(title, type) {
                    return function() {
                        var list = JSON.parse(library.list);
                        if (isFavorite(title)) {
                            popup.notify('\'' + decodeURIComponent(title) + '\' is already in Your Library.', 3);
                        } else {
                            popup.notify('\'' + decodeURIComponent(title) + '\' has been added to Your Library.', 3);
                            var libraryItem = {
                                title: encodeURIComponent(title),
                                type: type
                            };
                            list.push(libraryItem);
                            library.list = JSON.stringify(list);
                        }
                    };
                })(title, type));
                item.addOptAction('Remove \'' + decodeURIComponent(title) + '\' from Your Library', (function(title, type) {
                    return function() {
                        var list = JSON.parse(library.list);
                        if (title) {
                            var decodedTitle = decodeURIComponent(title);
                            var initialLength = list.length;
                            list = list.filter(function(fav) {
                                return fav.title !== encodeURIComponent(decodedTitle);
                            });
                            if (list.length < initialLength) {
                                popup.notify('\'' + decodeURIComponent(decodedTitle) + '\' has been removed from Your Library.', 3);
                            } else {
                                popup.notify('Content not found in Your Library.', 3);
                            }
                            library.list = JSON.stringify(list);
                        } else {
                        popup.notify('Content not found in Your Library.', 3);
                        }
                    };
                })(title, type));
        });
    }
    page.appendItem(plugin.id + ":trendingshows", "video", {
        icon: Plugin.path + "showall.png"
    });

    // Fetch and display trending movies
    var trendingMovies = fetchTrending('movie');
    if (trendingMovies.length > 0) {
        page.appendItem("", "separator", { title: "" });
        page.appendItem('', 'separator', {title: '  Popular Movies                                                                                                                                                                                                                                                               '});
        page.appendItem("", "separator", { title: "" });
        trendingMovies.slice(0, 4).forEach(function(item) { // Limit to 4 items
            var title = item.title;
            var posterPath = item.poster_path ? "https://image.tmdb.org/t/p/w500" + item.poster_path : Plugin.path + "cvrntfnd.png";
            var releaseDate = item.release_date ? item.release_date.substring(0, 4) : "";
            var movieDetailsUrl = "https://api.themoviedb.org/3/movie/" + item.id + "?api_key=a0d71cffe2d6693d462af9e4f336bc06" + "&append_to_response=external_ids";
            var movieDetailsResponse = http.request(movieDetailsUrl);
            var movieDetails = JSON.parse(movieDetailsResponse);
            var imdbid = movieDetails.external_ids ? movieDetails.external_ids.imdb_id : '';
            title = title + " " + releaseDate;
            var movieurl;
            if (service.autoPlay) {
                movieurl = plugin.id + ":play:" + encodeURIComponent(title) + ":" + imdbid;
            } else {
                movieurl = plugin.id + ":details:" + encodeURIComponent(title) + ":" + imdbid;
            }
            title = item.title + " " + "(" + releaseDate + ")";
            var item = page.appendItem(movieurl, "video", {
                title: title,
                icon: posterPath
            });
            var type = "movie";
            var title = title + " " + releaseDate;
            item.addOptAction('Add \'' + decodeURIComponent(title) + '\' to Your Library', (function(title, type, imdbid) {
                return function() {
                    var list = JSON.parse(library.list);
                    if (isFavorite(title)) {
                        popup.notify('\'' + decodeURIComponent(title) + '\' is already in Your Library.', 3);
                    } else {
                        popup.notify('\'' + decodeURIComponent(title) + '\' has been added to Your Library.', 3);
                        var libraryItem = {
                            title: encodeURIComponent(title),
                            type: type,
                            imdbid: imdbid
                        };
                        list.push(libraryItem);
                        library.list = JSON.stringify(list);
                    }
                };
            })(title, type, imdbid));
            item.addOptAction('Remove \'' + decodeURIComponent(title) + '\' from Your Library', (function(title) {
                return function() {
                    var list = JSON.parse(library.list);
                    if (title) {
                        var decodedTitle = decodeURIComponent(title);
                        var initialLength = list.length;
                        list = list.filter(function(fav) {
                            return fav.title !== encodeURIComponent(decodedTitle);
                        });
                        if (list.length < initialLength) {
                            popup.notify('\'' + decodeURIComponent(decodedTitle) + '\' has been removed from Your Library.', 3);
                        } else {
                            popup.notify('Content not found in Your Library.', 3);
                        }
                        library.list = JSON.stringify(list);
                    } else {
                    popup.notify('Content not found in Your Library.', 3);
                    }
                };
            })(title));
        });
    }
    page.appendItem(plugin.id + ":trendingmovies", "video", {
        icon: Plugin.path + "showall.png"
    });
    page.appendItem("", "separator", { title: "More Coming Soon!" });

    
};