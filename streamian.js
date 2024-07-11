                                                                        /*| Streamian for Movian/M7 Media Center | 2024 F0R3V3R50F7 |*/

/*|---------------------------------------------------------------------------------------- Pre - Requisits ----------------------------------------------------------------------------------------|*/


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
var eztv = require('addons/eztvaddon');
var internetarchive = require('addons/internetarchiveaddon');
var start = require('start');
var ondemand = require('ondemand');
var channels = require('channels');
var search = require('search');
var library = store.create('library');
var otalibrary = store.create('otalibrary');


/*|---------------------------------------------------------------------------------------- Establish Services ----------------------------------------------------------------------------------------|*/


if (!library.list) {library.list = JSON.stringify([]);}
if (!otalibrary.list) {otalibrary.list = '[]';}
service.create(plugin.title, plugin.id + ":start", 'video', true, logo);
settings.globalSettings(plugin.id, plugin.title, logo, plugin.synopsis);
settings.createBool('h265filter', 'Enable H.265 Filter (Enable on Playstation 3)', false, function(v) {
    service.H265Filter = v;
});
settings.createBool('autoPlay', 'Enable Auto-Play', true, function(v) {
    service.autoPlay = v;
});
settings.createMultiOpt('selectRegion', 'Channel Region (May Be Geo-Restricted)', [
    ['United States', 'United States'],
    ['United Kingdom', 'United Kingdom'],
    ['France', 'France'],
    ['Canada', 'Canada'],
    ['Brazil', 'Brazil'],
    ['South Korea', 'South Korea'],
    ['Mexico', 'Mexico'],
    ['Chile', 'Chile'],
    ['Germany', 'Germany'],
    ['Switzerland', 'Switzerland'],
    ['Denmark', 'Denmark'],
    ['Sweden', 'Sweden'],
    ['Spain', 'Spain'],
    ['Austria', 'Austria'],
    ['Italy', 'Italy'],
    ['India', 'India'],
    ['Norway', 'Norway'],
    ['Off', 'Off', true],
  ], function(v) {
  service.selectRegion = v;
});
settings.createMultiOpt('selectQuality', 'Preferred Quality', [
    ['UltraHD', 'Ultra HD | 4k'],
    ['FullHD', 'Full HD | 1080p', true],
    ['HD', 'HD | 720p'],
    ['SD', 'SD | 480p'],
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


/*|---------------------------------------------------------------------------------------- Establish Global Functions ----------------------------------------------------------------------------------------|*/

function addOptionForAddingChannelToLibrary(item, link, title, icon) {
    item.addOptAction('Add \'' + title + '\' to Your Library', function() {
      var entry = JSON.stringify({
        link: encodeURIComponent(link),
        title: encodeURIComponent(title),
        icon: encodeURIComponent(icon),
      });
      otalibrary.list = JSON.stringify([entry].concat(eval(otalibrary.list)));
      popup.notify('\'' + title + '\' has been added to Your Library.', 3);
    });
}
  
function addOptionForRemovingChannelFromLibrary(page, item, title, pos) {
    item.addOptAction('Remove \'' + title + '\' from Your Library', function() {
      var list = eval(otalibrary.list);
      popup.notify('\'' + title + '\' has been removed from Your Library.', 3);
      list.splice(pos, 1);
      otalibrary.list = JSON.stringify(list);
      page.redirect(plugin.id + ':library');
    });
}

function isFavorite(title) {
    var list = JSON.parse(library.list);
    return list.some(function(fav) {
      return fav.identifier === title;
    });
}

function addToLibrary(title, type, imdbid) {
    var list = JSON.parse(library.list);
    if (isFavorite(title)) {
      popup.notify('\'' + title + '\' is already in Your Library.', 3);
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
    page.loading = true;
    page.model.contents = 'list';
    var ytsResults = yts.search(page, title) || [];
    var ottsxResults = ottsx.search(page, title) || [];
    var internetArchiveResults = internetarchive.search(page, title) || [];
    var eztvResults = eztv.search(page, title) || [];

    // Function to check if the result has more than 0 seeders
    function hasSeeders(result) {
        var parts = result.split(" - ");
        var seederCount = parseInt(parts[2]) || 0;
        return seederCount > 0;
    }

    ytsResults = ytsResults.filter(hasSeeders).map(function(result) {
        return result + " - Yify";
    });
    ottsxResults = ottsxResults.filter(hasSeeders).map(function(result) {
        return result + " - 1337x";
    });
    internetArchiveResults = internetArchiveResults.filter(hasSeeders).map(function(result) {
        return result + " - Archive.org";
    });
    eztvResults = eztvResults.filter(hasSeeders).map(function(result) {
        return result + " - EZTV";
    });

    var combinedResults = ytsResults.concat(ottsxResults).concat(internetArchiveResults).concat(eztvResults);

    function processResults() {
        var preferredQualityRegex;
        if (service.selectQuality === "UltraHD") {
            preferredQualityRegex = /2160p/i;
        } else if (service.selectQuality === "FullHD") {
            preferredQualityRegex = /1080p/i;
        } else if (service.selectQuality === "HD") {
            preferredQualityRegex = /720p/i;
        } else if (service.selectQuality === "SD") {
            preferredQualityRegex = /480p|360p/i;
        }

        var preferredResults = combinedResults.filter(function(item) {
            var parts = item.split(" - ");
            var videoQuality = parts[1];
            return preferredQualityRegex.test(videoQuality);
        });

        var selectedResult;
        var maxPreferredSeeders = 0;

        if (preferredResults.length > 0) {
            preferredResults.forEach(function(item) {
                var seederCount = parseInt(item.split(" - ")[2]) || 0;
                if (seederCount > maxPreferredSeeders) {
                    maxPreferredSeeders = seederCount;
                    selectedResult = item;
                }
            });

            if (maxPreferredSeeders < 30) {
                combinedResults.forEach(function(item) {
                    var seederCount = parseInt(item.split(" - ")[2]) || 0;
                    if (seederCount > maxPreferredSeeders) {
                        maxPreferredSeeders = seederCount;
                        selectedResult = item;
                    }
                });
                if (selectedResult) {
                    popup.notify("Streamian | Couldn't find a source in preferred quality, playing best source found.", 10);
                }
            }
        } else {
            combinedResults.forEach(function(item) {
                var seederCount = parseInt(item.split(" - ")[2]) || 0;
                if (seederCount > maxPreferredSeeders) {
                    maxPreferredSeeders = seederCount;
                    selectedResult = item;
                }
            });
            if (selectedResult) {
                popup.notify("Streamian | Couldn't find a source in preferred quality, playing best source found.", 10);
            }
        }

        if (selectedResult) {
            var parts = selectedResult.split(" - ");
            var magnetLink = parts[0];
            var videoQuality = parts[1];
            var seederCount = parts[2];
            var source = parts[3];
            var vparams;

            if (source === 'Archive.org') {
                popup.notify("Streamian | Streaming from " + source + " direct" + " at " + videoQuality, 10);
            } else {
                popup.notify("Streamian | Streaming from " + source + " with " + seederCount + " seeders" + " at " + videoQuality, 10);
            }

            if (source === 'Archive.org') {
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
            page.loading = false;
            page.redirect(vparams);
        } else {
            var nostreamnotify = "No suitable streams found for " + title;
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

function iprotM3UParser(page, pl, specifiedGroup, limit) {
    var m3uItems = [];
    var groups = [];
    var theLastList = '';
    var title = page.metadata.title + '';
    page.loading = true;

    if (theLastList !== pl) {
        page.metadata.title = 'Loading Channels, please wait...';
        var m3u = http.request(decodeURIComponent(pl), {}).toString().split('\n');
        theLastList = pl;

        var m3uTitle = '',
            m3uImage = '',
            m3uGroup = '',
            m3uRegion = '',
            m3uEpgId = '',
            m3uHeaders = '',
            m3uUA = '';

        for (var i = 0; i < m3u.length; i++) {
            page.metadata.title = 'Loading Channels, please wait...';
            var line = m3u[i].trim();
            if (line.substr(0, 7) !== '#EXTM3U' && line.indexOf(':') < 0 && line.length !== 40) continue; // skip invalid lines
            line = string.entityDecode(line.replace(/[\u200B-\u200F\u202A-\u202E]/g, ''));

            switch (line.substr(0, 7)) {
                case '#EXTM3U':
                    var match = line.match(/region=(.*)\b/);
                    if (match) {
                        m3uRegion = match[1];
                    }
                    break;
                case '#EXTINF':
                    var match = line.match(/#EXTINF:.*,(.*)/);
                    if (match) {
                        m3uTitle = match[1].trim();
                    }
                    match = line.match(/group-title="([\s\S]*?)"/);
                    if (match) {
                        m3uGroup = match[1].trim();
                        if (groups.indexOf(m3uGroup) < 0) {
                            groups.push(m3uGroup);
                        }
                    }
                    match = line.match(/tvg-logo=["|”]([\s\S]*?)["|”]/);
                    if (match) {
                        m3uImage = match[1].trim();
                    }
                    match = line.match(/region="([\s\S]*?)"/);
                    if (match) {
                        m3uRegion = match[1];
                    }
                    if (m3uRegion) {
                        match = line.match(/description="([\s\S]*?)"/);
                        if (match) {
                            m3uEpgId = match[1];
                        }
                    }
                    break;
                case '#EXTGRP':
                    var match = line.match(/#EXTGRP:(.*)/);
                    if (match) {
                        m3uGroup = match[1].trim();
                        if (groups.indexOf(m3uGroup) < 0) {
                            groups.push(m3uGroup);
                        }
                    }
                    break;
                case '#EXTVLC':
                    var match = line.match(/http-(user-agent=[\s\S]*)$/);
                    if (match) {
                        m3uUA = match[1];
                    }
                    break;
                default:
                    if (line[0] === '#') {
                        m3uImage = '';
                        continue; // skip unknown tags and comments
                    }
                    line = line.replace(/rtmp:\/\/\$OPT:rtmp-raw=/, '');
                    if (line.indexOf(':') === -1 && line.length === 40) {
                        line = 'acestream://' + line;
                    }
                    if (m3uImage && m3uImage.substr(0, 4) !== 'http') {
                        m3uImage = line.match(/^.+?[^\/:](?=[?\/]|$)/) + '/' + m3uImage;
                    }
                    m3uHeaders = line.match(/([\s\S]*?)\|([\s\S]*?)$/);
                    m3uHeaders ? line = m3uHeaders[1] : '';

                    var item = {
                        title: m3uTitle ? m3uTitle : line,
                        url: line,
                        group: m3uGroup,
                        logo: m3uImage,
                        region: m3uRegion,
                        epgid: m3uEpgId,
                        headers: m3uHeaders ? m3uHeaders[2] : m3uUA ? m3uUA : void(0),
                    };

                    if (specifiedGroup && item.group !== specifiedGroup) {
                        continue; // Skip items not matching specified group
                    }

                    m3uItems.push(item);
                    m3uTitle = '';
                    m3uImage = '';
                    m3uEpgId = '';
                    m3uHeaders = '';
            }

            // Check if limit is reached
            if (limit && m3uItems.length >= limit) {
                break;
            }
        }

        page.metadata.title = title;
    }

    return {
        items: m3uItems,
        groups: groups
    };
}

function addChannels(page, items, specifiedGroup, limit) {
    var num = 0; // Initialize num counter

    for (var i = 0; i < items.length; i++) {
        if (specifiedGroup && items[i].group !== specifiedGroup) {
            continue; // Skip items not matching specified group
        }

        var description = '';
        if (items[i].region && items[i].epgid) {
            description = getEpg(items[i].region, items[i].epgid);
        }

        addChannel(page, items[i].url, items[i].title, items[i].logo, description, '', '', items[i].headers);
        num++; // Increment num for each added item

        // Check if limit is reached
        if (limit && num >= limit) {
            break;
        }
    }
}

function addChannel(page, url, title, icon, description, genre, epgForTitle, headers) {
    if (!epgForTitle) epgForTitle = '';
    var type = 'video';
    var linkUrl = url.toUpperCase().match(/M3U8/) || url.toUpperCase().match(/\.SMIL/) ? 'hls:' + url : url;
    var link = 'videoparams:' + JSON.stringify({
        // title: title,
        icon: icon ? icon : void(0),
        sources: [{
            url: linkUrl,
        }],
        no_fs_scan: true,
        no_subtitle_scan: true,
    });

    // get icon from description
    if (!icon && description) {
        icon = description.match(/img src="([\s\S]*?)"/);
        if (icon) icon = icon[1];
    }

    var item = page.appendItem(link, 'video', {
        // title: title + epgForTitle,
        icon: icon ? icon : null,
        genre: genre,
        description: description,
        headers: headers,
    });
    addOptionForAddingChannelToLibrary(item, link, title, icon);
}


/*|---------------------------------------------------------------------------------------- Establish Pages ----------------------------------------------------------------------------------------|*/


new page.Route(plugin.id + ":channels", function(page) {
    setPageHeader(page, "Channels");
    page.model.contents = 'grid';
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "ondemand_off.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "channels_on.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "search_off.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "off.png",
    });
    page.loading = true;
    channels.addChannels(page);
    page.loading = false;
});

new page.Route(plugin.id + ":library", function(page) {
    setPageHeader(page, "Your Library");
    page.model.contents = 'grid';
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "ondemand_off.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "channels_off.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "search_off.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "library_on.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "off.png",
    });
    start.library(page);
    page.loading = false;
});

new page.Route(plugin.id + ":trendingshows", function(page) {
    setPageHeader(page, "Popular Shows");
    page.model.contents = 'grid';
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "ondemand_on.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "channels_off.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "search_off.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "off.png",
    });
    start.trendingshows(page);
    page.loading = false;
});

new page.Route(plugin.id + ":trendingmovies", function(page) {
    setPageHeader(page, "Popular Movies");
    page.model.contents = 'grid';
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "ondemand_on.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "channels_off.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "search_off.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "off.png",
    });
    start.trendingmovies(page);
    page.loading = false;
});

new page.Route(plugin.id + ":start", function(page) {
    setPageHeader(page, "Welcome");
    page.model.contents = 'grid';
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "ondemand_on.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "channels_off.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "search_off.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "off.png",
    });
    popup.notify('Streamian | Raise Your BitTorrent Cache and #KeepTorrentsAlive | Is your favourite Movie or Show not here? Add it to TMDB yourself and watch it here!', 10);
    ondemand.ondemand(page);
    page.loading = false;
});

new page.Route(plugin.id + ":search", function(page, query) {
    page.model.contents = 'grid';
    setPageHeader(page, "Search for Shows, Movies & Channels!");
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "ondemand_off.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "channels_off.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "search_on.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "off.png",
    });
    page.appendItem('', 'separator', { title: '', });
    page.appendItem(plugin.id + ":searchresults:", 'search', { title: 'Search for Shows, Movies & Channels...' });
    page.appendItem('', 'separator', { title: '', });
    page.appendItem(plugin.id + ":search", "video", {
        icon: Plugin.path + "refresh.png"
    });
    page.loading = false;
});

new page.Route(plugin.id + ":searchresults:(.*)", function(page, query) {
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "ondemand_off.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "channels_off.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "search_on.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "off.png",
    });
    page.appendItem('', 'separator', { title: '', });
    page.appendItem(plugin.id + ":searchresults:", 'search', { title: 'searchSearch for Shows, Movies & Channels...' });
    page.appendItem('', 'separator', { title: '', });
    page.loading = true;
    search.search(page, query);
    page.loading = false;
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

new page.Route('m3uGroup:(.*):(.*):(.*)', function(page, pl, specifiedGroup, title) {
    setPageHeader(page, title);
    page.model.contents = 'grid';
    // Append your menu items here...

    var parsedData = iprotM3UParser(page, pl, specifiedGroup);
    var items = parsedData.items;

    items.forEach(function(item) {
        addChannels(page, [item], specifiedGroup); // Use addChannels to add each item
    });

    popup.notify("Right Click / Hold to add to Library.", 5);
    page.loading = false;
});

new page.Route('m3u:(.*):(.*)', function(page, pl, title) {
    setPageHeader(page, unescape(title));
    page.model.contents = 'grid';
    // Append your menu items here...

    var parsedData = iprotM3UParser(page, pl);
    var items = parsedData.items;

    items.forEach(function(item) {
        addChannels(page, [item]); // Use addChannels to add each item
    });

    popup.notify("Right Click / Hold to add to Library.", 5);
    page.loading = false;
});

new page.Route(plugin.id + ":play:(.*):(.*)", function(page, title, imdbid) {
    popup.notify('Streamian | Encountering issues? Please report to Reddit r/movian', 10);

    var timer; // Declare the timer variable in the outer scope

    function clearTimer() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }

    page.onUnload = function() {
        clearTimer(); // Clear the timer when the page is unloaded
    };

    if (service.autoPlay) {
        var countdown = 3;
        setPageHeader(page, "Autoplaying in " + countdown + " seconds...");
        page.appendItem(plugin.id + ":details:" + title + ":" + imdbid, "video", {
            title: "Cancel",
            icon: Plugin.path + "cancel.png",
        });

        timer = setInterval(function() {
            countdown--;
            setPageHeader(page, "Autoplaying in " + countdown + " seconds...");
            if (countdown <= 0) {
                clearTimer(); // Clear the timer when it completes
                setPageHeader(page, "Searching for best source, please wait..");
                consultAddons(page, decodeURIComponent(title), imdbid);
            }
        }, 1000);
    } else {
        setPageHeader(page, "Searching for best source, please wait..");
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