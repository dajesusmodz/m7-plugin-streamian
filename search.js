// Search Module for Streamian | M7 / Movian Media Center
// Version: 1.0
// Author: F0R3V3R50F7
exports.search = function (page, query) {
    page.model.contents = 'grid';
    setPageHeader(page, query);
    var apiKey = "a0d71cffe2d6693d462af9e4f336bc06";
    var apiUrl = "https://api.themoviedb.org/3/search/multi?api_key=" + apiKey + "&query=" + encodeURIComponent(query);
    var response = http.request(apiUrl);
    var json = JSON.parse(response);
    var fallbackImage = Plugin.path + "images/cvrntfnd.png";
    
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
                var type = "movie";
                title = title + " " + releaseDate;
                
                // Fetch movie details to get the IMDb ID
                var movieDetailsUrl = "https://api.themoviedb.org/3/movie/" + item.id + "?api_key=" + apiKey + "&append_to_response=external_ids";
                var movieDetailsResponse = http.request(movieDetailsUrl);
                var movieDetails = JSON.parse(movieDetailsResponse);
                var imdbid = movieDetails.external_ids ? movieDetails.external_ids.imdb_id : '';
                
                // Construct URL based on autoplay setting
                var movieurl = service.autoPlay ? plugin.id + ":play:" + title + ":" + imdbid + ":" + type : plugin.id + ":details:" + title + ":" + imdbid + ":" + type ;
                
                // Append movie item to page
                var movieItem = page.appendItem(movieurl, "video", {
                    title: title,
                    icon: posterPath
                });
                
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

    if (service.selectRegion == "United States") {
        var channelsFound = false;
        
        var playlists = [
            { title: 'Samsung TV Plus', url: 'https://i.mjh.nz/SamsungTVPlus/all.m3u8', specifiedGroup: 'United States' },
            { title: 'Pluto TV', url: 'https://i.mjh.nz/PlutoTV/all.m3u8', specifiedGroup: 'USA' },
            { title: 'Redbox', url: 'https://www.apsattv.com/redbox.m3u', specifiedGroup: '' },
            { title: 'Stirr', url: 'https://i.mjh.nz/Stirr/all.m3u8', specifiedGroup: '' },
            { title: 'Over-The-Air', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_usa.m3u8', specifiedGroup: 'USA' }
        ];
        
        playlists.forEach(function(playlist) {
            var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
            var items = parsedData.items;
            
            items.forEach(function(item) {
                if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                    channelsFound = true; // Set flag to true if channels are found
                }
            });
        });
        
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

    if (service.selectRegion == "United Kingdom") {
        var channelsFound = false;
    
        var playlists = [
            { title: 'Samsung TV Plus', url: 'https://i.mjh.nz/SamsungTVPlus/all.m3u8', specifiedGroup: 'United Kingdom' },
            { title: 'Pluto TV', url: 'https://i.mjh.nz/PlutoTV/all.m3u8', specifiedGroup: 'Great Britain' },
            { title: 'Rakuten TV', url: 'https://www.apsattv.com/rakuten-uk.m3u', specifiedGroup: 'RakutenTV UK' },
            { title: 'Over-The-Air', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_uk.m3u8', specifiedGroup: 'UK' }
        ];
    
        playlists.forEach(function(playlist) {
            var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
            var items = parsedData.items;
    
            items.forEach(function(item) {
                if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                    channelsFound = true; // Set flag to true if channels are found
                }
            });
        });
    
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

    if (service.selectRegion == "France") {
        var channelsFound = false;
    
        var playlists = [
            { title: 'Samsung TV Plus', url: 'https://i.mjh.nz/SamsungTVPlus/all.m3u8', specifiedGroup: 'France' },
            { title: 'Pluto TV', url: 'https://i.mjh.nz/PlutoTV/all.m3u8', specifiedGroup: 'France' },
            { title: 'Over-The-Air', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_france.m3u8', specifiedGroup: 'France' }
        ];
    
        playlists.forEach(function(playlist) {
            var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
            var items = parsedData.items;
    
            items.forEach(function(item) {
                if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                    channelsFound = true; // Set flag to true if channels are found
                }
            });
        });
    
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

    if (service.selectRegion == "Canada") {
        var channelsFound = false;
    
        var playlists = [
            { title: 'Samsung TV Plus', url: 'https://i.mjh.nz/SamsungTVPlus/all.m3u8', specifiedGroup: 'Canada' },
            { title: 'Pluto TV', url: 'https://i.mjh.nz/PlutoTV/all.m3u8', specifiedGroup: 'Canada' },
            { title: 'Over-The-Air', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_canada.m3u8', specifiedGroup: 'Canada' }
        ];
    
        playlists.forEach(function(playlist) {
            var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
            var items = parsedData.items;
    
            items.forEach(function(item) {
                if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                    channelsFound = true; // Set flag to true if channels are found
                }
            });
        });
    
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

    if (service.selectRegion == "Brazil") {
        var channelsFound = false;
    
        var playlists = [
            { title: 'Pluto TV', url: 'https://i.mjh.nz/PlutoTV/all.m3u8', specifiedGroup: 'Brazil' },
            { title: 'Over-The-Air', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_brazil.m3u8', specifiedGroup: 'Brazil' }
        ];
    
        playlists.forEach(function(playlist) {
            var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
            var items = parsedData.items;
    
            items.forEach(function(item) {
                if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                    channelsFound = true; // Set flag to true if channels are found
                }
            });
        });
    
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

    if (service.selectRegion == "South Korea") {
        var channelsFound = false;
    
        var playlists = [
            { title: 'Samsung TV Plus', url: 'https://i.mjh.nz/SamsungTVPlus/all.m3u8', specifiedGroup: 'South Korea' },
            { title: 'Over-The-Air', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_south_korea.m3u8', specifiedGroup: 'South Korea' }
        ];
    
        playlists.forEach(function(playlist) {
            var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
            var items = parsedData.items;
    
            items.forEach(function(item) {
                if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                    channelsFound = true; // Set flag to true if channels are found
                }
            });
        });
    
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

    if (service.selectRegion == "Mexico") {
        var channelsFound = false;
    
        var playlists = [
            { title: 'Pluto TV', url: 'https://i.mjh.nz/PlutoTV/all.m3u8', specifiedGroup: 'Mexico' },
            { title: 'Over-The-Air', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_mexico.m3u8', specifiedGroup: 'Mexico' }
        ];
    
        playlists.forEach(function(playlist) {
            var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
            var items = parsedData.items;
    
            items.forEach(function(item) {
                if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                    channelsFound = true; // Set flag to true if channels are found
                }
            });
        });
    
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

    if (service.selectRegion == "Chile") {
        var channelsFound = false;
    
        var playlists = [
            { title: 'Pluto TV', url: 'https://i.mjh.nz/PlutoTV/all.m3u8', specifiedGroup: 'Chile' },
            { title: 'Over-The-Air', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_chile.m3u8', specifiedGroup: 'Chile' }
        ];
    
        playlists.forEach(function(playlist) {
            var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
            var items = parsedData.items;
    
            items.forEach(function(item) {
                if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                    channelsFound = true; // Set flag to true if channels are found
                }
            });
        });
    
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

    if (service.selectRegion == "Germany") {
        var channelsFound = false;
    
        var playlists = [
            { title: 'Pluto TV', url: 'https://i.mjh.nz/PlutoTV/all.m3u8', specifiedGroup: 'Germany' },
            { title: 'Over-The-Air', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_germany.m3u8', specifiedGroup: 'Germany' }
        ];
    
        playlists.forEach(function(playlist) {
            var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
            var items = parsedData.items;
    
            items.forEach(function(item) {
                if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                    channelsFound = true; // Set flag to true if channels are found
                }
            });
        });
    
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

    if (service.selectRegion == "Switzerland") {
        var channelsFound = false;
    
        var playlists = [
            { title: 'Samsung TV Plus', url: 'https://i.mjh.nz/SamsungTVPlus/all.m3u8', specifiedGroup: 'Switzerland' },
            { title: 'Over-The-Air', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_switzerland.m3u8', specifiedGroup: 'Switzerland' }
        ];
    
        playlists.forEach(function(playlist) {
            var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
            var items = parsedData.items;
    
            items.forEach(function(item) {
                if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                    channelsFound = true; // Set flag to true if channels are found
                }
            });
        });
    
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

    if (service.selectRegion == "Denmark") {
        var channelsFound = false;
    
        var playlists = [
            { title: 'Pluto TV', url: 'https://i.mjh.nz/PlutoTV/all.m3u8', specifiedGroup: 'Denmark' },
            { title: 'Over-The-Air', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_denmark.m3u8', specifiedGroup: 'Denmark' }
        ];
    
        playlists.forEach(function(playlist) {
            var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
            var items = parsedData.items;
    
            items.forEach(function(item) {
                if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                    channelsFound = true; // Set flag to true if channels are found
                }
            });
        });
    
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

    if (service.selectRegion == "Sweden") {
        var channelsFound = false;
    
        var playlists = [
            { title: 'Pluto TV', url: 'https://i.mjh.nz/PlutoTV/all.m3u8', specifiedGroup: 'Sweden' },
            { title: 'Over-The-Air', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_sweden.m3u8', specifiedGroup: 'Sweden' }
        ];
    
        playlists.forEach(function(playlist) {
            var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
            var items = parsedData.items;
    
            items.forEach(function(item) {
                if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                    channelsFound = true; // Set flag to true if channels are found
                }
            });
        });
    
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

    if (service.selectRegion == "Spain") {
        var channelsFound = false;
    
        var playlists = [
            { title: 'Samsung TV Plus', url: 'https://i.mjh.nz/SamsungTVPlus/all.m3u8', specifiedGroup: 'Spain' },
            { title: 'Pluto TV', url: 'https://i.mjh.nz/PlutoTV/all.m3u8', specifiedGroup: 'Spain' },
            { title: 'Over-The-Air', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_spain.m3u8', specifiedGroup: 'Spain' }
        ];
    
        playlists.forEach(function(playlist) {
            var parsedData = iprotM3UParser(page, playlist.url, playlist.specifiedGroup);
            var items = parsedData.items;
    
            items.forEach(function(item) {
                if (item.title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                    channelsFound = true; // Set flag to true if channels are found
                }
            });
        });
    
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

    if (service.selectRegion == "Austria") {

        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8:Austria:Samsung TV Plus', 'video', { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRoCZ8qaWdvSKWo5MoYQM10z02ta6IO_-U9_JT2cBVxBaIps5m', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8';
        var specifiedGroup = 'Austria';
        var limit = '4';
        var parsedData = iprotM3UParser(page, pl, specifiedGroup, limit);
        var items = parsedData.items;
        items.forEach(function(item) {
            addChannels(page, [item], specifiedGroup, limit); // Use addChannels to add each item
        });
    
        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_austria.m3u8:Austria:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_austria.m3u8';
        var specifiedGroup = 'Austria';
        var limit = '4';
        var parsedData = iprotM3UParser(page, pl, specifiedGroup, limit);
        var items = parsedData.items;
        items.forEach(function(item) {
            addChannels(page, [item], specifiedGroup, limit); // Use addChannels to add each item
        });
    
    }
    
    if (service.selectRegion == "Italy") {
    
        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8:Italy:Samsung TV Plus', 'video', { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRoCZ8qaWdvSKWo5MoYQM10z02ta6IO_-U9_JT2cBVxBaIps5m', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8';
        var specifiedGroup = 'Italy';
        var limit = '4';
        var parsedData = iprotM3UParser(page, pl, specifiedGroup, limit);
        var items = parsedData.items;
        items.forEach(function(item) {
            addChannels(page, [item], specifiedGroup, limit); // Use addChannels to add each item
        });
    
        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:Italy:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'Italy';
        var limit = '4';
        var parsedData = iprotM3UParser(page, pl, specifiedGroup, limit);
        var items = parsedData.items;
        items.forEach(function(item) {
            addChannels(page, [item], specifiedGroup, limit); // Use addChannels to add each item
        });
    
        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_Italy.m3u8:Italy:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_italy.m3u8';
        var specifiedGroup = 'Italy';
        var limit = '4';
        var parsedData = iprotM3UParser(page, pl, specifiedGroup, limit);
        var items = parsedData.items;
        items.forEach(function(item) {
            addChannels(page, [item], specifiedGroup, limit); // Use addChannels to add each item
        });
    
    }
    
    if (service.selectRegion == "India") {
    
        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8:India:Samsung TV Plus', 'video', { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRoCZ8qaWdvSKWo5MoYQM10z02ta6IO_-U9_JT2cBVxBaIps5m', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FSamsungTVPlus%2Fall.m3u8';
        var specifiedGroup = 'India';
        var limit = '4';
        var parsedData = iprotM3UParser(page, pl, specifiedGroup, limit);
        var items = parsedData.items;
        items.forEach(function(item) {
            addChannels(page, [item], specifiedGroup, limit); // Use addChannels to add each item
        });
    
        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:India:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'India';
        var limit = '4';
        var parsedData = iprotM3UParser(page, pl, specifiedGroup, limit);
        var items = parsedData.items;
        items.forEach(function(item) {
            addChannels(page, [item], specifiedGroup, limit); // Use addChannels to add each item
        });
    
        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_India.m3u8:India:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_india.m3u8';
        var specifiedGroup = 'India';
        var limit = '4';
        var parsedData = iprotM3UParser(page, pl, specifiedGroup, limit);
        var items = parsedData.items;
        items.forEach(function(item) {
            addChannels(page, [item], specifiedGroup, limit); // Use addChannels to add each item
        });
    
    }
    
    if (service.selectRegion == "Norway") {
    
        page.appendItem('m3uGroup:https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8:Norway:Pluto TV', 'video', { icon: 'https://images.pluto.tv/channels/5e793a7cfbdf780007f7eb75/colorLogoPNG.png', });
        var pl = 'https%3A%2F%2Fi.mjh.nz%2FPlutoTV%2Fall.m3u8';
        var specifiedGroup = 'Norway';
        var limit = '4';
        var parsedData = iprotM3UParser(page, pl, specifiedGroup, limit);
        var items = parsedData.items;
        items.forEach(function(item) {
            addChannels(page, [item], specifiedGroup, limit); // Use addChannels to add each item
        });
    
        page.appendItem('m3uGroup:https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_norway.m3u8:Norway:Over-The-Air', 'video', { icon: 'https://myriadrf.org/app/uploads/2017/04/ota-banner-central.jpg', });
        var pl = 'https%3A%2F%2Fraw.githubusercontent.com%2FFree-TV%2FIPTV%2Fmaster%2Fplaylists%2Fplaylist_norway.m3u8';
        var specifiedGroup = 'Norway';
        var limit = '4';
        var parsedData = iprotM3UParser(page, pl, specifiedGroup, limit);
        var items = parsedData.items;
        items.forEach(function(item) {
            addChannels(page, [item], specifiedGroup, limit); // Use addChannels to add each item
        });
    
    }    

    if (!tmdbResultsFound && !channelsFound) {
        setPageHeader(page, 'No results found for ' + query);
    }
};