// Search Module for Streamian | M7 / Movian Media Center
// Version: 1.0
// Author: F0R3V3R50F7
exports.addChannels = function (page, query) {
    page.model.contents = 'grid';
    setPageHeader(page, query);
    var apiKey = "a0d71cffe2d6693d462af9e4f336bc06";
    var apiUrl = "https://api.themoviedb.org/3/search/multi?api_key=" + apiKey + "&query=" + encodeURIComponent(query);
    var response = http.request(apiUrl);
    var json = JSON.parse(response);
    var fallbackImage = Plugin.path + "cvrntfnd.png";
    
    var tmdbResultsFound = false; // Flag to check if TMDB results are found
    
    // Process TMDB results if any
    if (json.results && json.results.length > 0) {
        tmdbResultsFound = true; // Set flag to true if TMDB results are found
        
        var movies = [];
        var tvShows = [];
        
        // Categorize results into movies and TV shows
        json.results.forEach(function (item) {
            if (item.media_type === 'movie') {
                movies.push(item);
            } else if (item.media_type === 'tv') {
                tvShows.push(item);
            }
        });
        
        // Process movies if there are any
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
                
                // Construct URL based on autoplay setting
                var movieurl = service.autoPlay ? plugin.id + ":play:" + encodeURIComponent(title) + ":" + imdbid : plugin.id + ":details:" + encodeURIComponent(title) + ":" + imdbid;
                
                // Append movie item to page
                var movieItem = page.appendItem(movieurl, "video", {
                    title: title,
                    icon: posterPath
                });
                
                // Add optional actions for movie item
                var type = "movie";
                movieItem.addOptAction('Add \'' + title + '\' to Your Library', (function(title, type, imdbid) {
                    return function() {
                        addToLibrary(title, type, imdbid);
                    };
                })(title, type, imdbid));
                
                movieItem.addOptAction('Remove \'' + title + '\' from My Favorites', (function(title) {
                    return function() {
                        removeFromLibrary(title);
                    };
                })(title));
            });
        }
        
        // Process TV shows if there are any
        if (tvShows.length > 0) {
            page.appendItem("", "separator", { title: "  Shows                                                                                                                                                                                                                                                               " });
            page.appendItem("", "separator", { title: "" });
            tvShows.forEach(function (item) {
                var title = item.name;
                var posterPath = item.poster_path ? "https://image.tmdb.org/t/p/w500" + item.poster_path : fallbackImage;
                
                // Append TV show item to page
                var tvShowItem = page.appendItem(plugin.id + ":season:" + encodeURIComponent(title), "video", {
                    title: title,
                    icon: posterPath,
                });
                
                // Add optional actions for TV show item
                var type = "show";
                tvShowItem.addOptAction('Add \'' + decodeURIComponent(title) + '\' to Your Library', (function(title, type) {
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
                
                tvShowItem.addOptAction('Remove \'' + decodeURIComponent(title) + '\' from Your Library', (function(title, type) {
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
                
                // Set richMetadata for TV show item
                tvShowItem.richMetadata = {
                    channel: "Channel Name",
                };
            });
        }
    }
    
    // Always search for channels regardless of TMDB results
    if (service.selectRegion == "United States") {
        var channelsFound = false; // Flag to check if channels are found
        
        var playlists = [
            { title: 'Samsung TV Plus', url: 'https://i.mjh.nz/SamsungTVPlus/all.m3u8', specifiedGroup: 'United States' },
            { title: 'Pluto TV', url: 'https://i.mjh.nz/PlutoTV/all.m3u8', specifiedGroup: 'USA' },
            { title: 'Redbox', url: 'https://www.apsattv.com/redbox.m3u', specifiedGroup: '' },
            { title: 'Stirr', url: 'https://i.mjh.nz/Stirr/all.m3u8', specifiedGroup: '' },
            { title: 'Over-The-Air', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_usa.m3u8', specifiedGroup: 'USA' }
        ];
        
        // Iterate through playlists and add matching channels
        playlists.forEach(function(playlist) {
            var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
            var items = parsedData.items;
            
            items.forEach(function(item) {
                if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                    channelsFound = true; // Set flag to true if channels are found
                }
            });
        });
        
        // Add channels separator and items only if channels are found
        if (channelsFound) {
            page.appendItem("", "separator", { title: "Channels" });
            page.appendItem("", "separator", { title: "" });
            
            playlists.forEach(function(playlist) {
                var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
                var items = parsedData.items;
                
                items.forEach(function(item) {
                    if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                        addChannels(page, [item], playlist.specifiedGroup);
                    }
                });
            });
        }
    }
    
    // If no TMDB results and no channels are found, display no results message
    if (!tmdbResultsFound && !channelsFound) {
        setPageHeader(page, 'No results found for ' + query);
    }
};