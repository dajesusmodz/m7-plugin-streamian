                                                                        /*| Streamian for Movian/M7 Media Center | 2024 F0R3V3R50F7 |*/

/*|---------------------------------------------------------------------------------------- Establish Pre - Requisits / Services ----------------------------------------------------------------------------------------|*/


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
var yts = require('scrapers/ytsaddon');
var ottsx = require('scrapers/ottsxaddon');
var eztv = require('scrapers/eztvaddon');
var internetarchive = require('scrapers/internetarchiveaddon');
var start = require('start');
var ondemand = require('ondemand');
var channels = require('channels');
var search = require('search');
var library = store.create('library');
var channelhistory = store.create('channelhistory');
var ondemandhistory = store.create('ondemandhistory');
var otalibrary = store.create('otalibrary');
var currentCancellationToken = null;


/*|---------------------------------------------------------------------------------------- Establish Services ----------------------------------------------------------------------------------------|*/


if (!library.list) {library.list = JSON.stringify([]);}
if (!otalibrary.list) {otalibrary.list = '[]';}
if (!ondemandhistory.list) {ondemandhistory.list = '[]';}
if (!channelhistory.list) {channelhistory.list = '[]';}
service.create(plugin.title, plugin.id + ":start", 'video', true, logo);
service.searchTime = '5';
settings.globalSettings(plugin.id, plugin.title, logo, plugin.synopsis);

settings.createDivider('                Video Settings                                                                                                                                                                                                                                                                                                                                                                                                                              ');
settings.createDivider('');
settings.createBool('h265filter', 'Enable H.265 Filter (Playstation 3)', false, function(v) {
    service.H265Filter = v;
});
settings.createBool('autoPlay', 'Enable Auto-Play', true, function(v) {
    service.autoPlay = v;
});
settings.createMultiOpt('selectQuality', 'Preferred Quality', [
    ['UltraHD', 'Ultra HD | 4k'],
    ['FullHD', 'Full HD | 1080p', true],
    ['HD', 'HD | 720p'],
    ['SD', 'SD | 480p'],
  ], function(v) {
  service.selectQuality = v;
});

settings.createDivider('                Data Management                                                                                                                                                                                                                                                                                                                                                                                                                              ');
settings.createDivider('');

settings.createAction('emptyhistory', 'Empty Watch History', function() {
    channelhistory.list = '[]';
    ondemandhistory.list = '[]';
    popup.notify('Watch history has been emptied successfully.', 3);
});

settings.createDivider('                Regional Settings                                                                                                                                                                                                                                                                                                                                                                                                                              ');
settings.createDivider('');

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


/*|---------------------------------------------------------------------------------------- Establish Global Functions ----------------------------------------------------------------------------------------|*/


function createCancellationToken() {
    return { cancelled: false };
}

// Function to cancel the current operation
function cancelCurrentOperation() {
    if (currentCancellationToken) {
        currentCancellationToken.cancelled = true;
    }
}

function addItemToHistory(title, type, imdbid, icon, link) {
    var list = JSON.parse(ondemandhistory.list);
    var historyItem = {
        title: encodeURIComponent(title),
        type: type,
        imdbid: imdbid,
        icon: icon,
        link: link
    };
    list.push(historyItem);
    ondemandhistory.list = JSON.stringify(list);
}

function addChannelToHistory(page, link, title, icon) {
    var entry = JSON.stringify({
        link: link,
        title: title,
        icon: icon
    });
    channelhistory.list = JSON.stringify([entry].concat(eval(channelhistory.list)));
}

function addOptionForAddingChannelToLibrary(item, link, title, icon) {
    item.addOptAction('Add \'' + title + '\' to Your Library', function() {
      var entry = JSON.stringify({
        link: encodeURIComponent(link),
        title: encodeURIComponent(title),
        icon: icon,
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
    // Cancel any currently running instance
    cancelCurrentOperation();

    // Create a new cancellation token for this instance
    currentCancellationToken = createCancellationToken();
    const cancellationToken = currentCancellationToken;

    page.loading = true;
    page.model.contents = 'list';

    // Function cleanup to reset the global variable
    function cleanup() {
        page.loading = false;
        currentCancellationToken = null;
    }

    // Check if the operation has been cancelled
    function checkCancellation() {
        if (cancellationToken.cancelled) {
            cleanup();
            throw new Error('Operation cancelled');
        }
    }

    try {
        var ytsResults = yts.search(page, title) || [];
        checkCancellation();
        var ottsxResults = ottsx.search(page, title) || [];
        checkCancellation();
        var internetArchiveResults = internetarchive.search(page, title) || [];
        checkCancellation();
        var eztvResults = eztv.search(page, title) || [];
        checkCancellation();

        // Function to check if the result has more than 0 seeders
        function hasSeeders(result) {
            checkCancellation();
            var parts = result.split(" - ");
            var seederCount = parseInt(parts[2]) || 0;
            return seederCount > 0;
        }

        ytsResults = ytsResults.filter(hasSeeders).map(function(result) {
            checkCancellation();
            return result + " - Yify";
        });
        checkCancellation();
        ottsxResults = ottsxResults.filter(hasSeeders).map(function(result) {
            checkCancellation();
            return result + " - 1337x";
        });
        checkCancellation();
        internetArchiveResults = internetArchiveResults.filter(hasSeeders).map(function(result) {
            checkCancellation();
            return result + " - Archive.org";
        });
        checkCancellation();
        eztvResults = eztvResults.filter(hasSeeders).map(function(result) {
            checkCancellation();
            return result + " - EZTV";
        });
        checkCancellation();

        var combinedResults = ytsResults.concat(ottsxResults).concat(internetArchiveResults).concat(eztvResults);
        checkCancellation();

        function processResults() {
            checkCancellation();

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
            checkCancellation();

            var preferredResults = combinedResults.filter(function(item) {
                checkCancellation();
                var parts = item.split(" - ");
                var videoQuality = parts[1];
                return preferredQualityRegex.test(videoQuality);
            });
            checkCancellation();

            var selectedResult;
            var maxPreferredSeeders = 0;
            checkCancellation();

            if (preferredResults.length > 0) {
                preferredResults.forEach(function(item) {
                    checkCancellation();
                    var seederCount = parseInt(item.split(" - ")[2]) || 0;
                    if (seederCount > maxPreferredSeeders) {
                        maxPreferredSeeders = seederCount;
                        selectedResult = item;
                    }
                });
                checkCancellation();

                if (maxPreferredSeeders < 30) {
                    combinedResults.forEach(function(item) {
                        checkCancellation();
                        var seederCount = parseInt(item.split(" - ")[2]) || 0;
                        if (seederCount > maxPreferredSeeders) {
                            maxPreferredSeeders = seederCount;
                            selectedResult = item;
                        }
                    });
                    checkCancellation();

                    if (selectedResult) {
                        popup.notify("Streamian | Couldn't find a source in preferred quality, playing best source found.", 10);
                    }
                }
            } else {
                combinedResults.forEach(function(item) {
                    checkCancellation();
                    var seederCount = parseInt(item.split(" - ")[2]) || 0;
                    if (seederCount > maxPreferredSeeders) {
                        maxPreferredSeeders = seederCount;
                        selectedResult = item;
                    }
                });
                checkCancellation();

                if (selectedResult) {
                    popup.notify("Streamian | Couldn't find a source in preferred quality, playing best source found.", 10);
                }
            }
            checkCancellation();

            if (selectedResult) {
                var parts = selectedResult.split(" - ");
                var magnetLink = parts[0];
                var videoQuality = parts[1];
                var seederCount = parts[2];
                var source = parts[3];
                var vparams;
                checkCancellation();

                if (source === 'Archive.org') {
                    popup.notify("Streamian | Streaming from " + source + " direct" + " at " + videoQuality, 10);
                } else {
                    popup.notify("Streamian | Streaming from " + source + " with " + seederCount + " seeders" + " at " + videoQuality, 10);
                }
                checkCancellation();

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

            // Reset the global variable as the function execution completes
            cleanup();
        }

        var searchTime = parseInt(service.searchTime) * 1000;
        setTimeout(processResults, searchTime);
    } catch (e) {
        // Log any errors and reset the global variable
        showtime.print("Error in consultAddons: " + e.message);
        cleanup();
    }
}

function setPageHeader(page, title) {
    if (page.metadata) {
        page.metadata.title = title;
        page.metadata.icon = logo;
        page.metadata.background = Plugin.path + "images/bg.png";
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

    var decodedIcon = decodeURIComponent(icon);

    var item = page.appendItem(plugin.id + ":playchannel:" + link + ':' + title + ':' + decodedIcon, "video", {
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
    cancelCurrentOperation();
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "images/ondemand_off.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "images/channels_on.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "images/search_off.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "images/library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "images/history_off.png",
    });
    page.loading = true;
    channels.addChannels(page);
    page.loading = false;
});

new page.Route(plugin.id + ":library", function(page) {
    setPageHeader(page, "Your Library");
    page.model.contents = 'grid';
    cancelCurrentOperation();
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "images/ondemand_off.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "images/channels_off.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "images/search_off.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "images/library_on.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "images/history_off.png",
    });
    start.library(page);
    page.loading = false;
});

new page.Route(plugin.id + ":trendingshows", function(page) {
    setPageHeader(page, "Popular Shows");
    page.model.contents = 'grid';
    cancelCurrentOperation();
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "images/ondemand_on.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "images/channels_off.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "images/search_off.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "images/library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "images/history_off.png",
    });
    start.trendingshows(page);
    page.loading = false;
});

new page.Route(plugin.id + ":trendingmovies", function(page) {
    setPageHeader(page, "Popular Movies");
    page.model.contents = 'grid';
    cancelCurrentOperation();
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "images/ondemand_on.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "images/channels_off.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "images/search_off.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "images/library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "images/history_off.png",
    });
    start.trendingmovies(page);
    page.loading = false;
});

new page.Route(plugin.id + ":start", function(page) {
    setPageHeader(page, "Welcome");
    page.model.contents = 'grid';
    cancelCurrentOperation();
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "images/ondemand_on.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "images/channels_off.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "images/search_off.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "images/library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "images/history_off.png",
    });
    popup.notify('Streamian | Raise Your BitTorrent Cache and #KeepTorrentsAlive | Is your favourite Movie or Show not here? Add it to TMDB yourself and watch it here!', 10);
    ondemand.ondemand(page);
    page.loading = false;
});

new page.Route(plugin.id + ":search", function(page, query) {
    page.model.contents = 'grid';
    setPageHeader(page, "Search for Shows, Movies & Channels!");
    cancelCurrentOperation();
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "images/ondemand_off.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "images/channels_off.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "images/search_on.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "images/library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "images/history_off.png",
    });
    page.appendItem('', 'separator', { title: '', });
    page.appendItem(plugin.id + ":searchresults:", 'search', { title: 'Search for Shows, Movies & Channels...' });
    page.appendItem('', 'separator', { title: '', });
    page.appendItem(plugin.id + ":search", "video", {
        icon: Plugin.path + "images/refresh.png"
    });
    page.loading = false;
});

new page.Route(plugin.id + ":searchresults:(.*)", function(page, query) {
    cancelCurrentOperation();
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "images/ondemand_off.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "images/channels_off.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "images/search_on.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "images/library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "images/history_off.png",
    });
    page.appendItem('', 'separator', { title: '', });
    page.appendItem(plugin.id + ":searchresults:", 'search', { title: 'Search for Shows, Movies & Channels...' });
    page.appendItem('', 'separator', { title: '', });
    page.loading = true;
    search.search(page, query);
    page.loading = false;
});

new page.Route(plugin.id + ":season:(.*)", function(page, title) {
    setPageHeader(page, decodeURIComponent(title));
    page.model.contents = 'grid';
    cancelCurrentOperation();

    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "images/ondemand_on.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "images/channels_off.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "images/search_off.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "images/library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "images/history_off.png",
    });

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
                var posterPath = season.poster_path ? "https://image.tmdb.org/t/p/w500" + season.poster_path : Plugin.path + "images/cvrntfnd.png";
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
    cancelCurrentOperation();

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
            var posterPath = episode.still_path ? "https://image.tmdb.org/t/p/w500" + episode.still_path : Plugin.path + "images/scrnshtntfnd.png";
            var episodeDetailsUrl = "https://api.themoviedb.org/3/tv/" + showId + "/season/" + seasonNumber + "/episode/" + episode.episode_number + "?api_key=" + apiKey + "&append_to_response=external_ids";
            var episodeDetailsResponse = http.request(episodeDetailsUrl);
            var episodeDetails = JSON.parse(episodeDetailsResponse);
            var imdbid = episodeDetails.external_ids ? episodeDetails.external_ids.imdb_id : '';
            var episodeurl;
            var type = "episode";

            if (service.autoPlay) {
                episodeurl = plugin.id + ":play:" + encodeURIComponent(title) + ":" + imdbid + ":" + type;
            } else {
                episodeurl = plugin.id + ":details:" + encodeURIComponent(title) + ":" + imdbid + ":" + type;
            }
            var item = page.appendItem(episodeurl, "video", {
                title: episodeNumber + "). " + episodeTitle,
                icon: posterPath,
            });
            
            item.addOptAction('Add \'' + title + '\' to Your Library', (function(title, type, imdbid) {
                return function() {
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
                };
            })(title, type, imdbid));
            item.addOptAction('Remove \'' + title + '\' from Your Library', (function(title, type) {
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
                            popup.notify('Video not found in Your Library.', 3);
                        }
                        library.list = JSON.stringify(list);
                    } else {
                        popup.notify('Video not found in Your Library.', 3);
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
    cancelCurrentOperation();

    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "images/ondemand_off.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "images/channels_on.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "images/search_off.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "images/library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "images/history_off.png",
    });

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
    cancelCurrentOperation();

    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "images/ondemand_off.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "images/channels_on.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "images/search_off.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "images/library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "images/history_off.png",
    });

    var parsedData = iprotM3UParser(page, pl);
    var items = parsedData.items;

    items.forEach(function(item) {
        addChannels(page, [item]); // Use addChannels to add each item
    });

    popup.notify("Right Click / Hold to add to Library.", 5);
    page.loading = false;
});

new page.Route(plugin.id + ":play:(.*):(.*):(.*)", function(page, title, imdbid, type) {
    setPageHeader(page, "Searching for best source, please wait..");
    page.model.contents = 'list';
    title = decodeURIComponent(title);
    popup.notify('Streamian | Encountering issues? Please report to Reddit r/movian', 10);
    page.appendItem(plugin.id + ":details:" + title + ":" + imdbid + ":" + type, "video", {
        title: "Cancel",
        icon: Plugin.path + "images/cancel.png",
    });
    cancelCurrentOperation();
    addItemToHistory(title, type, imdbid)
    consultAddons(page, decodeURIComponent(title), imdbid);
});

new page.Route(plugin.id + ":playchannel:(.*):(.*):(.*)", function(page, link, title, decodedIcon) {
    setPageHeader(page, "Searching for best source, please wait..");
    page.model.contents = 'list';
    icon = decodedIcon;
    cancelCurrentOperation();
    console.log("Icon Link:" + icon);
    addChannelToHistory(page, link, title, icon);
    page.redirect(link);

});

new page.Route(plugin.id + ":details:(.*):(.*):(.*)", function(page, title, imdbid, type) {
    setPageHeader(page, decodeURIComponent(title));
    page.model.contents = 'list';
    cancelCurrentOperation();

    page.appendItem(plugin.id + ":play:" + title + ":" + imdbid  + ":" + type, "video", {
        title: "Play",
        icon: Plugin.path + "images/play.png",
    });
    page.loading = false;
});

new page.Route(plugin.id + ":watchhistory", function(page) {
    setPageHeader(page, "Watch History");
    page.model.contents = 'grid';
    cancelCurrentOperation();
    page.appendItem(plugin.id + ":start", 'video', {
        icon: Plugin.path + "images/ondemand_off.png",
    });
    page.appendItem(plugin.id + ":channels", 'video', {
        icon: Plugin.path + "images/channels_off.png",
    });
    page.appendItem(plugin.id + ":search", 'video', {
        icon: Plugin.path + "images/search_off.png",
    });
    page.appendItem(plugin.id + ":library", 'video', {
        icon: Plugin.path + "images/library_off.png",
    });
    page.appendItem(plugin.id + ":watchhistory", 'video', {
        icon: Plugin.path + "images/history_on.png",
    });
    start.history(page);
    page.loading = false;
});