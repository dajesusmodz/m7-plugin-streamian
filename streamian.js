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
var eztv = require('addons/eztvaddon');
var internetarchive = require('addons/internetarchiveaddon');
var start = require('start');
var newstart = require('newstart');
var library = store.create('library');
if (!library.list) {library.list = JSON.stringify([]);}
var otalibrary = store.create('otalibrary');
if (!otalibrary.list) {otalibrary.list = '[]';}


/*|---------------------------------------------------------------------------------------- Establish Services ----------------------------------------------------------------------------------------|*/


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
                popup.notify("Streamian | Streaming from " + source + " Direct" + " at " + videoQuality, 10);
            } else {
                popup.notify("Streamian | Streaming from " + source + " with " + seederCount + " Seeders" + " at " + videoQuality, 10);
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
            var nostreamnotify = "Streamian | No suitable streams found for " + title;
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
            page.appendItem("", "separator", { title: "  Movies                                                                                                                                                                                                                                                               " });
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
            page.appendItem("", "separator", { title: "  Shows                                                                                                                                                                                                                                                               " });
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
function iprotM3UParser(page, pl, specifiedGroup, limit) {
    var m3uItems = [];
    var groups = [];
    var theLastList = '';
    var title = page.metadata.title + '';
    page.loading = true;

    function isPlaylist(pl) {
        pl = unescape(pl).toUpperCase();
        var extension = pl.split('.').pop();
        var lastPart = pl.split('/').pop();
        if (pl.substr(0, 4) === 'XML:') {
            return 'xml';
        }
        if (pl.substr(0, 4) === 'M3U:' || (extension === 'M3U' && pl.substr(0, 4) !== 'HLS:') || lastPart === 'PLAYLIST' ||
            pl.match(/TYPE=M3U/) || pl.match(/BIT.DO/) || pl.match(/BIT.LY/) || pl.match(/GOO.GL/) ||
            pl.match(/TINYURL.COM/) || pl.match(/RAW.GITHUB/)) {
            return 'm3u';
        }
        return false;
    }

    if (theLastList !== pl) {
        page.metadata.title = 'Loading Channels, please wait...';
        var m3u = http.request(decodeURIComponent(pl), {}).toString().split('\n');
        theLastList = pl;

        var m3uUrl = '',
            m3uTitle = '',
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
                    m3uUrl = '';
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

    var num = 0;
    for (var i = 0; i < m3uItems.length; i++) {
        if (specifiedGroup && m3uItems[i].group !== specifiedGroup) {
            continue; // Skip items not matching specified group
        }

        var extension = m3uItems[i].url.split('.').pop().toUpperCase();
        if (isPlaylist(m3uItems[i].url) || (m3uItems[i].url === m3uItems[i].title)) {
            var route = 'm3u:';
            if (m3uItems[i].url.substr(0, 4) === 'xml:') {
                m3uItems[i].url = m3uItems[i].url.replace('xml:', '');
                route = 'xml:';
            }
            if (m3uItems[i].url.substr(0, 4) === 'm3u:') {
                m3uItems[i].url = m3uItems[i].url.replace('m3u:', '');
            }
            var item = page.appendItem(route + encodeURIComponent(m3uItems[i].url) + ':' + encodeURIComponent(m3uItems[i].title), 'video', {
                //title: m3uItems[i].title,
            });
            addOptionForAddingChannelToLibrary(item, m3uItems[i].link, m3uItems[i].title, m3uItems[i].icon);
            num++;
        } else {
            var description = '';
            if (m3uItems[i].region && m3uItems[i].epgid) {
                description = getEpg(m3uItems[i].region, m3uItems[i].epgid);
            }
            addItem(page, m3uItems[i].url, m3uItems[i].title, m3uItems[i].logo, description, '', '', m3uItems[i].headers);
            num++;
        }

        page.metadata.title = 'Adding item ' + num + ' of ' + m3uItems.length;

        // Check if limit is reached
        if (limit && num >= limit) {
            break;
        }
    }

    page.metadata.title = title;
    page.loading = false;

    function addItem(page, url, title, icon, description, genre, epgForTitle, headers) {
        if (!epgForTitle) epgForTitle = '';
        var type = 'video';
        var link = url.match(/([\s\S]*?):(.*)/);
        var linkUrl = 0;
        var playlistType = isPlaylist(url);
        if (link && playlistType) {
            link = linkUrl = playlistType + ':' + encodeURIComponent(url) + ':' + escape(title);
            type = 'directory';
        } else if (link && !link[1].toUpperCase().match(/HTTP/) && !link[1].toUpperCase().match(/RTMP/)) {
            link = linkUrl = plugin.id + ':' + url + ':' + escape(title);
        } else {
            linkUrl = url.toUpperCase().match(/M3U8/) || url.toUpperCase().match(/\.SMIL/) ? 'hls:' + url : url;
            link = 'videoparams:' + JSON.stringify({
                //title: title,
                icon: icon ? icon : void(0),
                sources: [{
                    url: linkUrl,
                }],
                no_fs_scan: true,
                no_subtitle_scan: true,
            });
        }

        // get icon from description
        if (!icon && description) {
            icon = description.match(/img src="([\s\S]*?)"/);
            if (icon) icon = icon[1];
        }

        if (!linkUrl) {
            var item = page.appendPassiveItem(type, '', {
                //title: title + epgForTitle,
                icon: icon ? icon : null,
                genre: genre,
                description: description,
            });
            addOptionForAddingChannelToLibrary(item, link, title, icon);
        } else {
            var item = page.appendItem(link, 'video', {
                //title: title + epgForTitle,
                icon: icon ? icon : null,
                genre: genre,
                description: description,
                headers: headers,
            });
            addOptionForAddingChannelToLibrary(item, link, title, icon);
        }
    }
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

    if (service.selectRegion == "Off") {
        page.appendItem('', 'separator', {title: ''});
        page.appendItem('', 'separator', {title: 'Select a region in settings to watch channels.'});
    }


    if (service.selectRegion == "United States") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8:United States:Samsung TV Plus', 'video', { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRoCZ8qaWdvSKWo5MoYQM10z02ta6IO_-U9_JT2cBVxBaIps5m', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8';
        var specifiedGroup = 'United States';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:USA:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'USA';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3u:https%3A%2F%2Fwww.apsattv.com%2Fredbox.m3u:Redbox', 'video', { icon: 'https://mma.prnewswire.com/media/858885/redbox_logo.jpg?p=facebook', });
        var pl = 'https%3A%2F%2Fwww.apsattv.com%2Fredbox.m3u';
        var specifiedGroup = '';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3u:https%3A%2F%2Fi.mjh.nz%2FStirr%2Fall.m3u8:Stirr', 'video', { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJYuYw7jJU6Jkiuj9Xc6v8sYI20wZQPpy1fYKgTYclsOJNWqXMdqpBzGjXfbxtvVm_iOI&usqp=CAU', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FStirr%2Fall.m3u8';
        var specifiedGroup = '';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_usa.m3u8:USA:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_usa.m3u8';
        var specifiedGroup = 'USA';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);
    }

    if (service.selectRegion == "United Kingdom") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8:United Kingdom:Samsung TV Plus', 'video', { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRoCZ8qaWdvSKWo5MoYQM10z02ta6IO_-U9_JT2cBVxBaIps5m', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8';
        var specifiedGroup = 'United Kingdom';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:Great Britain:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'Great Britain';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fwww.apsattv.com%2Frakuten-uk.m3u:RakutenTV UK:Rakuten TV', 'video', { icon: 'https://cdn6.aptoide.com/imgs/4/0/e/40e4024425d9c9e0b311766303df3ef5_fgraphic.png', });
        var pl = 'https%3A%2F%2Fwww.apsattv.com%2Frakuten-uk.m3u';
        var specifiedGroup = 'RakutenTV UK';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_uk.m3u8:UK:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_uk.m3u8';
        var specifiedGroup = 'UK';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "France") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8:France:Samsung TV Plus', 'video', { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRoCZ8qaWdvSKWo5MoYQM10z02ta6IO_-U9_JT2cBVxBaIps5m', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8';
        var specifiedGroup = 'France';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:France:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'France';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_france.m3u8:France:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_france.m3u8';
        var specifiedGroup = 'France';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "Canada") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8:Canada:Samsung TV Plus', 'video', { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRoCZ8qaWdvSKWo5MoYQM10z02ta6IO_-U9_JT2cBVxBaIps5m', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8';
        var specifiedGroup = 'Canada';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:Canada:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'Canada';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_canada.m3u8:Canada:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_canada.m3u8';
        var specifiedGroup = 'Canada';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "Brazil") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:Brazil:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'Brazil';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_brazil.m3u8:Brazil:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_brazil.m3u8';
        var specifiedGroup = 'Brazil';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "South Korea") {

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_south korea.m3u8:South Korea:Samsung TV Plus', 'video', { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRoCZ8qaWdvSKWo5MoYQM10z02ta6IO_-U9_JT2cBVxBaIps5m', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_south_korea.m3u8';
        var specifiedGroup = 'South Korea';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_south korea.m3u8:South Korea:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_south_korea.m3u8';
        var specifiedGroup = 'South Korea';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "Mexico") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:Mexico:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'Mexico';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_mexico.m3u8:Mexico:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_mexico.m3u8';
        var specifiedGroup = 'Mexico';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "Chile") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:Chile:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'Chile';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_chile.m3u8:Chile:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_chile.m3u8';
        var specifiedGroup = 'Chile';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "Germany") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:Germany:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'Germany';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_germany.m3u8:Germany:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_germany.m3u8';
        var specifiedGroup = 'Germany';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "Switzerland") {

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_switzerland.m3u8:Switzerland:Samsung TV Plus', 'video', { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRoCZ8qaWdvSKWo5MoYQM10z02ta6IO_-U9_JT2cBVxBaIps5m', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_switzerland.m3u8';
        var specifiedGroup = 'Switzerland';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_switzerland.m3u8:Switzerland:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_switzerland.m3u8';
        var specifiedGroup = 'Switzerland';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "Denmark") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:Denmark:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'Denmark';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_denmark.m3u8:Denmark:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_denmark.m3u8';
        var specifiedGroup = 'Denmark';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "Sweden") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:Sweden:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'Sweden';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_sweden.m3u8:Sweden:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_sweden.m3u8';
        var specifiedGroup = 'Sweden';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "Spain") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8:Spain:Samsung TV Plus', 'video', { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRoCZ8qaWdvSKWo5MoYQM10z02ta6IO_-U9_JT2cBVxBaIps5m', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8';
        var specifiedGroup = 'Spain';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:Spain:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'Spain';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_Spain.m3u8:Spain:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_spain.m3u8';
        var specifiedGroup = 'Spain';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "Austria") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8:Austria:Samsung TV Plus', 'video', { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRoCZ8qaWdvSKWo5MoYQM10z02ta6IO_-U9_JT2cBVxBaIps5m', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8';
        var specifiedGroup = 'Austria';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_austria.m3u8:Austria:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_austria.m3u8';
        var specifiedGroup = 'Austria';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "Italy") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8:Italy:Samsung TV Plus', 'video', { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRoCZ8qaWdvSKWo5MoYQM10z02ta6IO_-U9_JT2cBVxBaIps5m', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8';
        var specifiedGroup = 'Italy';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:Italy:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'Italy';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_Italy.m3u8:Italy:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_italy.m3u8';
        var specifiedGroup = 'Italy';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "India") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8:India:Samsung TV Plus', 'video', { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRoCZ8qaWdvSKWo5MoYQM10z02ta6IO_-U9_JT2cBVxBaIps5m', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8';
        var specifiedGroup = 'India';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:India:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'India';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_India.m3u8:India:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_india.m3u8';
        var specifiedGroup = 'India';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

    if (service.selectRegion == "Norway") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:Norway:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'Norway';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_norway.m3u8:Norway:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_norway.m3u8';
        var specifiedGroup = 'Norway';
        var limit = '4';
        iprotM3UParser(page, pl, specifiedGroup, limit);

    }

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
    newstart.start(page);
    page.loading = false;
});
new page.Route(plugin.id + ":search", function(page, query) {
    page.model.contents = 'grid';
    setPageHeader(page, "Search for Shows & Movies!");
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
    page.appendItem(plugin.id + ":searchresults:", 'search', { title: 'Search for Shows & Movies...' });
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
    page.appendItem(plugin.id + ":searchresults:", 'search', { title: 'Search for Shows & Movies...' });
    page.appendItem('', 'separator', { title: '', });
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
    popup.notify('Streamian | Encountering issues? Please report to Reddit r/movian', 10);
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
                setPageHeader(page, "Searching for best link, please wait..");
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
new page.Route('m3uGroup:(.*):(.*):(.*)', function(page, pl, groupID, title) {
    setPageHeader(page, title);
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
    iprotM3UParser(page, pl, groupID);
    popup.notify("Right Click / Hold to add to Library.", 5);
    page.loading = false;
});
new page.Route('m3u:(.*):(.*)', function(page, pl, title) {
    setPageHeader(page, unescape(title));
    page.loading = true;
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
    iprotM3UParser(page, pl);
    popup.notify("Right Click / Hold to add to Library.", 5);
    page.loading = false;
});