                                                                        /*| Streamian for Movian/M7 Media Center | 2024 F0R3V3R50F7 |*/

/*|---------------------------------------------------------------------------------------- Establish Variables ----------------------------------------------------------------------------------------|*/


var page = require('movian/page');
var service = require('movian/service');
var settings = require('movian/settings');
var http = require('movian/http');
var html = require('movian/html');
var string = require('native/string');
var popup = require('native/popup');
var store = require('movian/store');
var plugin = JSON.parse(Plugin.manifest);
var logo = Plugin.path + plugin.icon;
var yts = require('addons/ytsaddon');
var ottsx = require('addons/ottsxaddon');
var internetarchive = require('addons/internetarchiveaddon');
var start = require('start');
var library = store.create('library');
if (!library.list) {
  library.list = JSON.stringify([]);
}


/*|---------------------------------------------------------------------------------------- Establish Services ----------------------------------------------------------------------------------------|*/


service.create(plugin.title, plugin.id + ":start", 'video', true, logo);
settings.globalSettings(plugin.id, plugin.title, logo, plugin.synopsis);
settings.createBool('h265filter', 'Enable H.265 Filter (Enable on Playstation 3)', false, function(v) {
    service.H265Filter = v;
});
settings.createBool('autoPlay', 'Enable Auto-Play', true, function(v) {
    service.autoPlay = v;
});
settings.createMultiOpt('selectQuality', 'Preferred Quality', [
    ['UltraHD', 'Ultra HD | 4k'],
    ['FullHD', 'Full HD | 1080p', true],
    ['HD', 'HD | 720p'],
  ], function(v) {
  service.selectQuality = v;
});
settings.createMultiOpt('searchTime', 'Minimum Video Source Search Time', [
    ['30', '30 Seconds'],
    ['20', '20 Seconds'],
    ['10', '10 Seconds'],
    ['5', '5 Seconds', true],
  ], function(v) {
  service.searchTime = v;
});
settings.createBool('disableLibrary', 'Disable "My Library"', false, function(v) {
    service.disableLibrary = v;
});


/*|---------------------------------------------------------------------------------------- Establish Global Functions ----------------------------------------------------------------------------------------|*/

function isFavorite(title) {
    var list = JSON.parse(library.list);
    return list.some(function(fav) {
      return fav.identifier === title;
    });
}
function addToLibrary(title, type, imdbid) {
    var list = JSON.parse(library.list);
    if (isFavorite(title)) {
      popup.notify('\'' + title + '\' is already in My Favorites.', 3);
    } else {
      popup.notify('\'' + title + '\' has been added to Your Library.', 3);
      var libraryItem = {
        title: encodeURIComponent(title),
        type: type,
        imdbid: imdbid
      };
      list.push(libraryItem);
      library.list = JSON.stringify(list);
    }
}
function removeFromLibrary(title) {
    var list = JSON.parse(library.list);
    if (title) {
      var decodedTitle = decodeURIComponent(title);
      var initialLength = list.length;
      list = list.filter(function(fav) {
        return fav.title !== encodeURIComponent(decodedTitle);
      });
      if (list.length < initialLength) {
        popup.notify('\'' + decodedTitle + '\' has been removed from Your Library.', 3);
      } else {
        popup.notify('Video not found in favorites.', 3);
      }
      library.list = JSON.stringify(list);
    } else {
      popup.notify('Video not found in favorites.', 3);
    }
}
function consultAddons(page, title, imdbid) {
    page.model.contents = 'list';
    var ytsResults = yts.search(page, title) || [];
    var ottsxResults = ottsx.search(page, title) || [];
    var internetArchiveResults = internetarchive.search(page, title) || [];
    ytsResults = ytsResults.map(function(result) {
        return result + " - yts";
    });
    ottsxResults = ottsxResults.map(function(result) {
        return result + " - ottsx";
    });
    internetArchiveResults = internetArchiveResults.map(function(result) {
        return result + " - internetarchive";
    });
    var combinedResults = ytsResults.concat(ottsxResults).concat(internetArchiveResults);
    function processResults() {
        var filteredResults = combinedResults.filter(function(item) {
            var parts = item.split(" - ");
            var videoQuality = parts[1];

            if (service.selectQuality == "UltraHD" && (!/720p/i.test(videoQuality) && !/1080p/i.test(videoQuality) && !/480p/i.test(videoQuality) && !/360p/i.test(videoQuality) && !/Unknown/i.test(videoQuality))) {
                return true;
            }
            if (service.selectQuality == "FullHD" && (!/720p/i.test(videoQuality) && !/2160p/i.test(videoQuality) && !/Unknown/i.test(videoQuality) && !/480p/i.test(videoQuality) && !/360p/i.test(videoQuality))) {
                return true;
            }
            if (service.selectQuality == "HD" && (!/1080p/i.test(videoQuality) && !/2160p/i.test(videoQuality) && !/480p/i.test(videoQuality) && !/360p/i.test(videoQuality) && !/Unknown/i.test(videoQuality))) {
                return true;
            }
            if (/Unknown/i.test(videoQuality)) {
                return true;
            }
            return false;
        });
        console.log("IMDb ID for " + title + ":", imdbid);
        if (filteredResults.length > 0) {
            var highestSeedersItem = filteredResults.reduce(function(prev, current) {
                var prevSeeders = parseInt(prev.split(" - ")[2]) || 0;
                var currentSeeders = parseInt(current.split(" - ")[2]) || 0;
                return (currentSeeders > prevSeeders) ? current : prev;
            });
            var parts = highestSeedersItem.split(" - ");
            var magnetLink = parts[0];
            var videoQuality = parts[1];
            var seederCount = parts[2];
            var source = parts[3];
            var vparams;
            if (/Unknown/i.test(videoQuality)) {
                popup.notify('Streamian | Internet Archive: Could not determine video quality', 5);
            }
            if (source === 'internetarchive') {
                vparams = "videoparams:" + JSON.stringify({
                    title: title,
                    canonicalUrl: magnetLink,
                    no_fs_scan: true,
                    sources: [{
                        url: magnetLink
                    }],
                    imdbid: imdbid
                });
            } else {
                vparams = "videoparams:" + JSON.stringify({
                    title: title,
                    canonicalUrl: "torrent://" + magnetLink,
                    no_fs_scan: true,
                    sources: [{
                        url: "torrent:video:" + magnetLink
                    }],
                    imdbid: imdbid
                });
            }
            page.redirect(vparams);
        } else {
            var nostreamnotify = "No suitable streams found for " + title
            setPageHeader(page, nostreamnotify);
            page.loading = false;
        }
    }
    var searchTime = parseInt(service.searchTime) * 1000;
    setTimeout(processResults, searchTime);
}
function setPageHeader(page, title) {
    if (page.metadata) {
        page.metadata.title = title;
        page.metadata.icon = logo;
        page.metadata.background = Plugin.path + "bg.png";
    }
    page.type = "directory";
    page.contents = "items";
    page.entries = 0;
    page.loading = true;
}
function searchOnTmdb(page, query) {
    page.model.contents = 'grid';
    setPageHeader(page, query);
    var apiKey = "a0d71cffe2d6693d462af9e4f336bc06";
    var apiUrl = "https://api.themoviedb.org/3/search/multi?api_key=" + apiKey + "&query=" + encodeURIComponent(query);
    var response = http.request(apiUrl);
    var json = JSON.parse(response);
    var fallbackImage = Plugin.path + "cvrntfnd.png";
    if (json.results && json.results.length > 0) {
        var movies = [];
        var tvShows = [];
        json.results.forEach(function (item) {
            if (item.media_type === 'movie') {
                movies.push(item);
            } else if (item.media_type === 'tv') {
                tvShows.push(item);
            }
        });
        if (movies.length > 0) {
            page.appendItem("", "separator", { title: "Movies" });
            page.appendItem("", "separator", { title: "" });
            movies.forEach(function (item) {
                var title = item.title;
                var posterPath = item.poster_path ? "https://image.tmdb.org/t/p/w500" + item.poster_path : fallbackImage;
                var releaseDate = item.release_date ? item.release_date.substring(0, 4) : '';
                title = title + " " + releaseDate;
                // Fetch movie details to get the IMDb ID
                var movieDetailsUrl = "https://api.themoviedb.org/3/movie/" + item.id + "?api_key=" + apiKey + "&append_to_response=external_ids";
                var movieDetailsResponse = http.request(movieDetailsUrl);
                var movieDetails = JSON.parse(movieDetailsResponse);
                var imdbid = movieDetails.external_ids ? movieDetails.external_ids.imdb_id : '';
                var movieurl;
                if (service.autoPlay) {
                    movieurl = plugin.id + ":play:" + encodeURIComponent(title) + ":" + imdbid;
                } else {
                    movieurl = plugin.id + ":details:" + encodeURIComponent(title) + ":" + imdbid;
                }
                var item = page.appendItem(movieurl, "video", {
                    title: title,
                    icon: posterPath
                });
                var type = "movie";
                item.addOptAction('Add \'' + title + '\' to Your Library', (function(title, type, imdbid) {
                    return function() {
                        addToLibrary(title, type, imdbid);
                    };
                })(title, type, imdbid));
                item.addOptAction('Remove \'' + title + '\' from My Favorites', (function(title) {
                    return function() {
                        removeFromLibrary(title);
                    };
                })(title));
            });
        }
        if (tvShows.length > 0) {
            page.appendItem("", "separator", { title: "TV Shows" });
            page.appendItem("", "separator", { title: "" });
            tvShows.forEach(function (item) {
                var title = (item.name);
                var posterPath = item.poster_path ? "https://image.tmdb.org/t/p/w500" + item.poster_path : fallbackImage;
                var item = page.appendItem(plugin.id + ":season:" + (title), "video", {
                    title: (title),
                    icon: posterPath,
                });
                var type = "show";
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
                item.richMetadata = {
                    channel: "Channel Name",
                };
            });
        }
    } else {
        page.error("No results found");
    }
    page.loading = false;
}


/*|---------------------------------------------------------------------------------------- Establish Pages ----------------------------------------------------------------------------------------|*/


new page.Route(plugin.id + ":library", function(page) {
    setPageHeader(page, "Your Library");
    page.model.contents = 'grid';
    start.library(page);
    page.loading = false;
});
new page.Route(plugin.id + ":trendingshows", function(page) {
    setPageHeader(page, "Trending Shows");
    page.model.contents = 'grid';
    start.trendingshows(page);
    page.loading = false;
});
new page.Route(plugin.id + ":trendingmovies", function(page) {
    setPageHeader(page, "Trending Movies");
    page.model.contents = 'grid';
    start.trendingmovies(page);
    page.loading = false;
});
new page.Route(plugin.id + ":start", function(page) {
    setPageHeader(page, "Welcome");
    page.model.contents = 'grid';
    popup.notify('Streamian | Raise Your Torrent Cache if You Can! #SeedAsYouStream', 5);
    popup.notify('Streamian | Encountering Issues? Report on Reddit at r/movian', 5);
    start.start(page);
    page.loading = false;
});
new page.Route(plugin.id + ":search:(.*)", function(page, query) {
    searchOnTmdb(page, query);
});
new page.Route(plugin.id + ":season:(.*)", function(page, title) {
    setPageHeader(page, decodeURIComponent(title));
    page.model.contents = 'grid';
    var apiKey = "a0d71cffe2d6693d462af9e4f336bc06";
    var searchUrl = "https://api.themoviedb.org/3/search/tv?api_key=" + apiKey + "&query=" + encodeURIComponent(title);
    var searchResponse = http.request(searchUrl);
    var searchJson = JSON.parse(searchResponse);
    var type = "show";
    if (searchJson.results && searchJson.results.length > 0) {
        var show = searchJson.results[0];
        console.log('Show object:', show); // Log the show object to inspect its structure
        var showId = show.id;
        var seasonsUrl = "https://api.themoviedb.org/3/tv/" + showId + "?api_key=" + apiKey;
        var seasonsResponse = http.request(seasonsUrl);
        var seasonsJson = JSON.parse(seasonsResponse);
        if (seasonsJson.seasons && seasonsJson.seasons.length > 0) {
            seasonsJson.seasons.forEach(function (season) {
                var seasonTitle = season.name;
                var posterPath = season.poster_path ? "https://image.tmdb.org/t/p/w500" + season.poster_path : Plugin.path + "cvrntfnd.png";
                var seasonNumber = season.season_number;
                page.appendItem(plugin.id + ":episodes:" + showId + ":" + seasonNumber, "video", {
                    title: seasonTitle,
                    icon: posterPath,
                });
            });
        } else {
            page.error("No seasons found for this show");
        }
    } else {
        page.error("No TV show found with the title: " + title);
    }
    page.loading = false;
});
new page.Route(plugin.id + ":episodes:(\\d+):(\\d+)", function(page, showId, seasonNumber) {
    var headerTitle;
    if (seasonNumber === '0') {
        headerTitle = "Specials";
        page.model.contents = 'list';
    } else {
        headerTitle = "Season " + seasonNumber + " Episodes";
    }
    setPageHeader(page, headerTitle);
    var apiKey = "a0d71cffe2d6693d462af9e4f336bc06";
    var episodesUrl = "https://api.themoviedb.org/3/tv/" + showId + "/season/" + seasonNumber + "?api_key=" + apiKey;
    var episodesResponse = http.request(episodesUrl);
    var episodesJson = JSON.parse(episodesResponse);
    if (episodesJson.episodes && episodesJson.episodes.length > 0) {
        var showDetailsUrl = "https://api.themoviedb.org/3/tv/" + showId + "?api_key=" + apiKey;
        var showDetailsResponse = http.request(showDetailsUrl);
        var showDetailsJson = JSON.parse(showDetailsResponse);
        var showTitle = showDetailsJson.name ? showDetailsJson.name : "Unknown Show";
        episodesJson.episodes.forEach(function (episode) {
            var episodeTitle = episode.name;
            var episodeNumber = episode.episode_number < 10 ? "0" + episode.episode_number : episode.episode_number;
            var cleanedSeasonNumber = seasonNumber < 10 ? "0" + seasonNumber : seasonNumber;
            var title = showTitle + " S" + cleanedSeasonNumber + "E" + episodeNumber;
            var posterPath = episode.still_path ? "https://image.tmdb.org/t/p/w500" + episode.still_path : Plugin.path + "scrnshtntfnd.png";
            var episodeDetailsUrl = "https://api.themoviedb.org/3/tv/" + showId + "/season/" + seasonNumber + "/episode/" + episode.episode_number + "?api_key=" + apiKey + "&append_to_response=external_ids";
            var episodeDetailsResponse = http.request(episodeDetailsUrl);
            var episodeDetails = JSON.parse(episodeDetailsResponse);
            var imdbid = episodeDetails.external_ids ? episodeDetails.external_ids.imdb_id : '';
            var episodeurl;
            if (service.autoPlay) {
                episodeurl = plugin.id + ":play:" + encodeURIComponent(title) + ":" + imdbid;
            } else {
                episodeurl = plugin.id + ":details:" + encodeURIComponent(title) + ":" + imdbid;
            }
            var item = page.appendItem(episodeurl, "video", {
                title: episodeNumber + "). " + episodeTitle,
                icon: posterPath,
            });
            var type = "episode";
            item.addOptAction('Add \'' + title + '\' to Your Library', (function(title, type, imdbid) {
                return function() {
                    var list = JSON.parse(library.list);
                    if (isFavorite(title)) {
                        popup.notify('\'' + title + '\' is already in My Favorites.', 3);
                    } else {
                        popup.notify('\'' + title + '\' has been added to Your Library.', 3);
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
            item.addOptAction('Remove \'' + title + '\' from My Favorites', (function(title, type) {
                return function() {
                    var list = JSON.parse(library.list);
                    if (title) {
                        var decodedTitle = decodeURIComponent(title);
                        var initialLength = list.length;
                        list = list.filter(function(fav) {
                            return fav.title !== encodeURIComponent(decodedTitle);
                        });
                        if (list.length < initialLength) {
                            popup.notify('\'' + decodedTitle + '\' has been removed from Your Library.', 3);
                        } else {
                            popup.notify('Video not found in favorites.', 3);
                        }
                        library.list = JSON.stringify(list);
                    } else {
                        popup.notify('Video not found in favorites.', 3);
                    }
                };
            })(title, type));
        });
    } else {
        page.error("No episodes found for this season");
    }
    page.loading = false;
});
new page.Route(plugin.id + ":play:(.*):(.*)", function(page, title, imdbid) {
    if (service.autoPlay) {
        var countdown = 3;
        setPageHeader(page, "Autoplaying in " + countdown + " seconds...");
        page.appendItem(plugin.id + ":details:" + title + ":" + imdbid, "video", {
            title: "Cancel",
            icon: Plugin.path + "cancel.png",
        });
        var timer = setInterval(function() {
            countdown--;
            setPageHeader(page, "Autoplaying in " + countdown + " seconds...");
            if (countdown <= 0) {
                clearInterval(timer);
                setPageHeader(page, "Searching for best link..");
                consultAddons(page, decodeURIComponent(title), imdbid);
            }
        }, 1000);
    } else {
        setPageHeader(page, "Searching for best link..");
        consultAddons(page, decodeURIComponent(title), imdbid);
    }
});
new page.Route(plugin.id + ":details:(.*):(.*)", function(page, title, imdbid) {
    setPageHeader(page, decodeURIComponent(title));
    page.model.contents = 'list';
    page.appendItem(plugin.id + ":play:" + title + ":" + imdbid, "video", {
        title: "Play",
        icon: Plugin.path + "play.png",
    });
    page.loading = false;
});