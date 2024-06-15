// Start Page Module for Streamian | M7 / Movian Media Center
// Version: 1.0
// Author: F0R3V3R50F7
var http = require('movian/http');
exports.start = function (page) {
    if (!service.disableLibrary) {
        page.appendItem('', 'separator', {
            title: 'Your Library',
        });
        page.appendItem('', 'separator', {
            title: '',
        });

        var list = JSON.parse(library.list);
        var pos = 0;

        // Function to fetch cover art from TMDB synchronously
        function fetchCoverArt(title, type) {
            var apiUrl;
            if (type === 'movie') {
                // Extract title and remove the year from the end
                var movieTitleParts = title.split('%20');
                var movieTitle = movieTitleParts.slice(0, movieTitleParts.length - 1).join('%20');
                apiUrl = "https://api.themoviedb.org/3/search/movie?api_key=a0d71cffe2d6693d462af9e4f336bc06&query=" + movieTitle;
            } else if (type === 'show') {
                apiUrl = "https://api.themoviedb.org/3/search/tv?api_key=a0d71cffe2d6693d462af9e4f336bc06&query=" + title;
            } else if (type === 'episode') {
                var showTitle = title.split("%20S")[0];
                apiUrl = "https://api.themoviedb.org/3/search/tv?api_key=a0d71cffe2d6693d462af9e4f336bc06&query=" + showTitle;
            }

            try {
                var response = showtime.httpGet(apiUrl).toString();
                console.log("[DEBUG]: API URL: " + apiUrl);
                console.log("[DEBUG]: API Response: " + response);
                var jsonResponse = JSON.parse(response);
                if (jsonResponse.results && jsonResponse.results.length > 0) {
                    var item = jsonResponse.results[0];
                    return item.poster_path ? "https://image.tmdb.org/t/p/w500" + item.poster_path : Plugin.path + "cvrntfnd.png";
                }
            } catch (error) {
                console.log("[DEBUG]: Error fetching cover art: " + error);
            }
            return Plugin.path + "cvrntfnd.png";
        }

        for (var i = list.length - 1; i >= 0 && pos < 4; i--) {
            var itemmd = list[i];
            var coverArt;
            if (itemmd.type === 'episode') {
                coverArt = fetchCoverArt(itemmd.title, 'episode');
                if (service.autoPlay) {
                    var episodeurl = plugin.id + ":play:" + decodeURIComponent(itemmd.title)
                } else {
                    var episodeurl = plugin.id + ":details:" + decodeURIComponent(itemmd.title)
                }
                page.appendItem(episodeurl, "video", {
                    title: decodeURIComponent(itemmd.title),
                    icon: coverArt,
                });
            } else if (itemmd.type === 'movie') {
                coverArt = fetchCoverArt(itemmd.title, 'movie');
                console.log("[DEBUG]: Movie Cover Art for " + itemmd.title + ": " + coverArt);
                var decodedTitle = decodeURIComponent(itemmd.title);
                var titleParts = decodedTitle.split(' ');
                var year = titleParts.pop();
                var movieTitle = titleParts.join(' ');
                if (service.autoPlay) {
                    var movieurl = plugin.id + ":play:" + decodeURIComponent(itemmd.title)
                } else {
                    var movieurl = plugin.id + ":details:" + decodeURIComponent(itemmd.title)
                }
                page.appendItem(movieurl, "video", {
                    title: movieTitle + " (" + year + ")",
                    icon: coverArt,
                });
            } else if (itemmd.type === 'show') {
                coverArt = fetchCoverArt(itemmd.title, 'show');
                console.log("[DEBUG]: Show Cover Art for " + decodeURIComponent(itemmd.title) + ": " + coverArt);
                page.appendItem(plugin.id + ":season:" + itemmd.title, "video", {
                    title: decodeURIComponent(itemmd.title),
                    icon: coverArt,
                });
            }
            pos++;
        }

        if (!list || list.length === 0) {
            page.appendItem(plugin.id + ":start", "video", {
                icon: Plugin.path + "refresh.png"
            });
        } else if (list.length < 4) {
            page.appendItem(plugin.id + ":start", "video", {
                icon: Plugin.path + "refresh.png"
            });
        }

        if (list && list.length > 0) {
            page.appendItem(plugin.id + ":library", "video", {
                icon: Plugin.path + "yourlib.png"
            });
        }
    }

    page.appendItem('', 'separator', { title: '', });
    page.appendItem('', 'separator', { title: 'Discover', });
    page.appendItem('', 'separator', { title: '', });
    page.appendItem(plugin.id + ":search:", 'search', { title: 'Search for Shows & Movies...' });
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
        page.appendItem('', 'separator', {title: '  Trending Shows                                                                                                                                                                                                                                                               '});
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
        page.appendItem('', 'separator', {title: '  Trending Movies                                                                                                                                                                                                                                                               '});
        page.appendItem("", "separator", { title: "" });
        trendingMovies.slice(0, 4).forEach(function(item) { // Limit to 4 items
            var title = item.title;
            var posterPath = item.poster_path ? "https://image.tmdb.org/t/p/w500" + item.poster_path : Plugin.path + "cvrntfnd.png";
            var releaseDate = item.release_date ? item.release_date.substring(0, 4) : "";
            if (service.autoPlay) {
                var movieurl = plugin.id + ":play:" + decodeURIComponent(title + " " + releaseDate)
            } else {
                var movieurl = plugin.id + ":details:" + decodeURIComponent(title + " " + releaseDate)
            }
            var item = page.appendItem(movieurl, "video", {
                title: title + (releaseDate ? " (" + releaseDate + ")" : ""),
                icon: posterPath
            });
            var type = "movie";
            var title = title + " " + releaseDate;
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
    page.appendItem(plugin.id + ":trendingmovies", "video", {
        icon: Plugin.path + "showall.png"
    });
    page.appendItem("", "separator", { title: "More Coming Soon!" });
};

exports.library = function (page) {
    page.appendItem(plugin.id + ":library", "video", {
        icon: Plugin.path + "refresh.png"
    });
    var list = JSON.parse(library.list);
    var pos = 0;
    function fetchCoverArt(title, type) {
        var apiUrl;
        if (type === 'movie') {
            var movieTitleParts = title.split('%20');
            var movieTitle = movieTitleParts.slice(0, movieTitleParts.length - 1).join('%20');
            apiUrl = "https://api.themoviedb.org/3/search/movie?api_key=a0d71cffe2d6693d462af9e4f336bc06&query=" + movieTitle;
        } else if (type === 'show') {
            apiUrl = "https://api.themoviedb.org/3/search/tv?api_key=a0d71cffe2d6693d462af9e4f336bc06&query=" + title;
        } else if (type === 'episode') {
            var showTitle = title.split("%20S")[0];
            apiUrl = "https://api.themoviedb.org/3/search/tv?api_key=a0d71cffe2d6693d462af9e4f336bc06&query=" + showTitle;
        }
        try {
            var response = showtime.httpGet(apiUrl).toString();
            console.log("[DEBUG]: API URL: " + apiUrl);
            console.log("[DEBUG]: API Response: " + response);
            var jsonResponse = JSON.parse(response);
            if (jsonResponse.results && jsonResponse.results.length > 0) {
                var item = jsonResponse.results[0];
                return item.poster_path ? "https://image.tmdb.org/t/p/w500" + item.poster_path : Plugin.path + "cvrntfnd.png";
            }
        } catch (error) {
            console.log("[DEBUG]: Error fetching cover art: " + error);
        }
        return Plugin.path + "cvrntfnd.png";
    }
    for (var i = list.length - 1; i >= 0; i--) {
        var itemmd = list[i];
        var coverArt;
        if (itemmd.type === 'episode') {
            coverArt = fetchCoverArt(itemmd.title, 'episode');
            if (service.autoPlay) {
                var episodeurl = plugin.id + ":play:" + decodeURIComponent(itemmd.title)
            } else {
                var episodeurl = plugin.id + ":details:" + decodeURIComponent(itemmd.title)
            }
            var item = page.appendItem(episodeurl, "video", {
                title: decodeURIComponent(itemmd.title),
                icon: coverArt,
            });
            var type = "episode";
            var title = itemmd.title;
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
        } else if (itemmd.type === 'movie') {
            coverArt = fetchCoverArt(itemmd.title, 'movie');
            console.log("[DEBUG]: Movie Cover Art for " + itemmd.title + ": " + coverArt);
            var decodedTitle = decodeURIComponent(itemmd.title);
            var titleParts = decodedTitle.split(' ');
            var year = titleParts.pop(); // Remove the year from the title
            var movieTitle = titleParts.join(' ');
            if (service.autoPlay) {
                var movieurl = plugin.id + ":play:" + decodeURIComponent(itemmd.title)
            } else {
                var movieurl = plugin.id + ":details:" + decodeURIComponent(itemmd.title)
            }
            var item = page.appendItem(movieurl, "video", {
                title: movieTitle + " (" + year + ")", // Display the title with the year in brackets
                icon: coverArt,
            });
            var title = movieTitle + " " + year;
            var type = "movie";
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
        } else if (itemmd.type === 'show') {
            coverArt = fetchCoverArt(itemmd.title, 'show');
            console.log("[DEBUG]: Show Cover Art for " + decodeURIComponent(itemmd.title) + ": " + coverArt);
            var item = page.appendItem(plugin.id + ":season:" + itemmd.title, "video", {
                title: decodeURIComponent(itemmd.title),
                icon: coverArt,
            });
            var type = "show";
            var title = itemmd.title;
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
        }
        pos++;
    }
    
};

exports.trendingshows = function (page) {
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
        trendingShows.slice(0, 999999).forEach(function(item) {
            var title = item.name;
            var posterPath = item.poster_path ? "https://image.tmdb.org/t/p/w500" + item.poster_path : Plugin.path + "cvrntfnd.png";
            page.appendItem(plugin.id + ":season:" + decodeURIComponent(title), "video", {
                title: title,
                icon: posterPath
            });
        });
    }
    
};

exports.trendingmovies = function (page) {
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
    var trendingMovies = fetchTrending('movie');
    if (trendingMovies.length > 0) {
        trendingMovies.slice(0, 999999).forEach(function(item) {
            var title = item.title;
            var posterPath = item.poster_path ? "https://image.tmdb.org/t/p/w500" + item.poster_path : Plugin.path + "cvrntfnd.png";
            var releaseDate = item.release_date ? item.release_date.substring(0, 4) : "";
            page.appendItem(plugin.id + ":details:" + decodeURIComponent(title + " " + releaseDate), "video", {
                title: title + (releaseDate ? " (" + releaseDate + ")" : ""),
                icon: posterPath
            });
        });
    }
};