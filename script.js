var popupDiv = document.getElementById("div_popup");
var popupDiv2 = document.getElementById("div_popup2");
var bodyDiv = document.getElementById("div_bodycontent");
var reselectButton = document.getElementById("reselectbutton");
var logoutButton = document.getElementById("logoutbutton");
var searchButton = document.getElementById("searchbutton");
var searchBar = document.getElementById("searchbar");
var messageBox = document.getElementById("messagebox");
var message = document.getElementById("message");
var searchHistoryContainer = document.getElementById("searchHistoryContainer");
var videoPlayerPopup = document.getElementById("videoPlayerPopup");
var videoPlayerContainer = document.getElementById("videoPlayerContainer");

const MAX_HISTORY_ITEMS = 10;
const SEARCH_HISTORY_KEY = 'plexerSearchHistory';

// --- Neue Popup Animationsfunktionen ---
function showAnimatedPopup(popupElement) {
    if (!popupElement) return;
    // Ensure innerHTML is set BEFORE display to prevent rendering issues if popup was empty
    // For initial popups (login, server select), innerHTML is set before this call.
    // For dynamic popups (download), innerHTML should also be set before calling this.
    popupElement.style.display = "flex"; 
    setTimeout(() => {
        popupElement.classList.add('visible');
    }, 10); 
}

function closeAnimatedPopup(popupElement, clearContent = true) {
    if (!popupElement) return;
    popupElement.classList.remove('visible');
    setTimeout(() => {
        popupElement.style.display = "none";
        if (clearContent) {
            popupElement.innerHTML = ""; 
        }
    }, 250); // Muss zur Dauer der CSS-Transition passen (opacity/transform 0.25s)
}
// --- Ende Popup Animationsfunktionen ---

function showMessage(themessage) {
    message.innerText = themessage;
    messageBox.style.display = "flex";
}

function hideMessage() {
    message.innerText = "";
    messageBox.style.display = "none";
}

function closePopupdiv2() {
    hideMessage();
    closeAnimatedPopup(popupDiv2);
}

function closePopupdiv() {
    hideMessage();
    closeAnimatedPopup(popupDiv);
}

function hideSearchHistory() {
    if (searchHistoryContainer) {
        searchHistoryContainer.innerHTML = '';
        searchHistoryContainer.style.display = "none";
    }
}

function populateSearchBarAndSearch(query) {
    searchBar.value = query;
    searcher();
    hideSearchHistory();
}

function displaySearchHistory() {
    if (!searchHistoryContainer) return;

    const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];
    searchHistoryContainer.innerHTML = '';

    if (history.length === 0) {
        hideSearchHistory();
        return;
    }

    history.forEach(query => {
        const item = document.createElement('div');
        item.className = 'search-history-item';

        const queryText = document.createElement('span');
        queryText.className = 'search-history-item-text';
        queryText.textContent = query;
        queryText.onclick = () => populateSearchBarAndSearch(query);

        const deleteButton = document.createElement('span');
        deleteButton.className = 'search-history-item-delete';
        deleteButton.innerHTML = '&times;'; // Simple "x" character
        deleteButton.title = 'Remove from history';
        deleteButton.onclick = (event) => {
            event.stopPropagation(); // Prevent triggering click on item itself
            removeSearchFromHistory(query);
        };

        item.appendChild(queryText);
        item.appendChild(deleteButton);
        searchHistoryContainer.appendChild(item);
    });
    searchHistoryContainer.style.display = "block";
}

function removeSearchFromHistory(query) {
    if (!query || query.trim() === "") return;
    let history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];
    history = history.filter(item => item !== query);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    displaySearchHistory(); // Refresh the displayed history
}

function addSearchToHistory(query) {
    if (!query || query.trim() === "") return;
    let history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];
    history = history.filter(item => item !== query);
    history.unshift(query);
    history = history.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

function login() {
    // get values from input fields
    var username = document.getElementById("username_field").value;
    var password = document.getElementById("password_field").value;

    // make POST request to URL with username and password
    fetch('https://plex.tv/users/sign_in.json?user[password]=' + encodeURIComponent(password) + '&user[login]=' + encodeURIComponent(username), {
            method: 'POST',
            headers: {
                'X-Plex-Version': '4.99.2',
                'X-Plex-Product': 'Plex Web',
                'X-Plex-Client-Identifier': 'fsafhjsdlkfhsfdhkshf7',
            }
        })
        .then(response => response.json())
        .then(data => {
            showMessage("try to login as '" + username + "'")
                // extract token from JSON response
            var token = data['user']['authToken'];
            //console.log(data)
            // make GET request with token
            fetch('https://plex.tv/api/v2/resources', {
                    method: 'GET',
                    headers: {
                        'X-Plex-Version': '4.99.2',
                        'X-Plex-Product': 'Plex Web',
                        'X-Plex-Client-Identifier': 'fsafhjsdlkfhsfdhkshf7',
                        'X-Plex-Token': token
                    }
                })
                .then(response => response.text())
                .then(data => {
                    // parse XML data
                    //console.log(data)
                    var parser = new DOMParser();
                    var xml = parser.parseFromString(data, "text/xml");
                    var soerver = [];
                    // log values to console
                    var servers = xml.getElementsByTagName("resource");
                    if (servers.length < 1) {
                        console.error("no media shares connected to your account")
                        showMessage("successfully logged in but your account has no media shares")
                        logout();
                        return;
                    } else {
                        localStorage.setItem("login", true);
                    }
                    for (let i = 0; i < servers.length; i++) {
                        var server_array = {};
                        if (servers[i].getAttribute('product') === "Plex Media Server") {
                            server_array['name'] = servers[i].getAttribute('name')
                            server_array['token'] = servers[i].getAttribute('accessToken')
                                //console.log(servers[i].getAttribute('name'))
                            var connection_array = {};
                            var connections = servers[i].getElementsByTagName("connection");
                            for (let j = 0; j < connections.length; j++) {
                                //console.log(connections[j].getAttribute('protocol'))
                                connection_array[j] = connections[j].getAttribute('uri')
                            }
                            server_array['connections'] = connection_array
                            soerver.push(server_array)
                        }
                    }
                    //console.log(server_array);
                    localStorage.setItem('servers', JSON.stringify(soerver))
                    window.location.reload();
                    showMessage("successfully logged in as " + username + "'")
                })
                .catch(error => {
                    showMessage("cannot get data from account")
                    console.error("cannot get account data: " + error)
                })
        })
        .catch(error => {
            showMessage("wrong credentials")
            console.error("wrong credentials: " + error)
        })
}

function logout() {
    try {
        localStorage.clear()
        showMessage("logged out successfully")
        window.location.reload();
    } catch {
        showMessage("something went wrong with logging out")
        console.error("something went wrong. please delete all your browser data to log out")
    }

}

function selectSelected(url, token) {
    showMessage("trying to connect... please wait!");
    fetch(url + '/search?query=&X-Plex-Token=' + token, {
            method: 'GET',
        })
        .then(response => response.text())
        .then(data => {
            showMessage("connected successfully");
            console.log("your selected server is " + url + " and your token is " + token);
            localStorage.setItem('selected', true)
            localStorage.setItem('selected_url', url);
            localStorage.setItem('selected_token', token);
            window.location.reload();
        })
        .catch(error => {
            showMessage("cannot connect");
            console.error("cannot connect: " + error)
        });
}


function searcher() {
    var search_string = document.getElementById("searchbar").value;
    addSearchToHistory(search_string);

    showMessage("started search. please wait!");
    bodyDiv.innerHTML = '';
    // get values from input fields
    console.log("search for '" + search_string + "' started")
    fetch(localStorage.getItem('selected_url') + "/search?query=" + encodeURIComponent(search_string) + "&X-Plex-Token=" + localStorage.getItem('selected_token'), {
            method: 'GET'
        })
        .then(response => response.text())
        .then(data => {
            hideMessage();
            console.log("fetched the data")
            bodyDiv.innerHTML = ""
            var emptyKey = { not_key: undefined };
            var searchResultDict = {};
            var parser = new DOMParser();
            var xml = parser.parseFromString(data, "text/xml");
            //console.log(xml);
            var searchResultMovies = xml.getElementsByTagName("Video");
            var searchResultShows = xml.getElementsByTagName("Directory");
            var searchResults = [searchResultMovies, searchResultShows]
                //console.log(searchResult);
                //console.log(searchResult);
                //console.log(searchResult.length);
            if (searchResultMovies.length < 1 && searchResultShows.length < 1) {
                showMessage("no search results");
                console.error("no media shares connected to your account or no search results found")
                return;
            } else {
                for (let j = 0; j < searchResults.length; j++) {
                    var searchResult = searchResults[j];
                    for (let i = 0; i < searchResult.length; i++) {
                        var temp1 = searchResult[i].getAttribute('type');
                        if (temp1 == "movie" || temp1 == "show") {
                            //console.log(searchResult[i])
                            var temp2 = searchResult[i].getAttribute('guid')
                                //temp_data_processor['id'] = searchResult[i].getAttribute('grandparentGuid');
                            if (!(temp2 in searchResultDict)) {
                                searchResultDict[temp2] = {};
                                searchResultDict[temp2]['title'] = searchResult[i].getAttribute('title');
                                searchResultDict[temp2]['type'] = searchResult[i].getAttribute('type');
                                searchResultDict[temp2]['year'] = searchResult[i].getAttribute('year');
                                searchResultDict[temp2]['summary'] = searchResult[i].getAttribute('summary');
                                searchResultDict[temp2]['duration'] = Math.round(parseInt(searchResult[i].getAttribute('duration')) / 1000 / 60);
                                searchResultDict[temp2]['audienceRating'] = searchResult[i].getAttribute('audienceRating');
                                searchResultDict[temp2]['thumb'] = searchResult[i].getAttribute('thumb');
                                searchResultDict[temp2]['art'] = searchResult[i].getAttribute('art');
                                var genres = searchResult[i].getElementsByTagName("Genre");
                                searchResultDict[temp2]['genres'] = [];
                                for (let y = 0; y < genres.length; y++) {
                                    searchResultDict[temp2]['genres'].push(genres[y].getAttribute('tag'));
                                    //console.log(genres[y].getAttribute('tag'));
                                }
                                searchResultDict[temp2]['files'] = [];
                            } else {
                                //check if every value is available
                                var thingsToGet = ["title", "type", "year", "summary", "duration", "audienceRating", "thumb", "art"]
                                for (const element of thingsToGet) {
                                    if (searchResultDict[temp2][element] == undefined || searchResultDict[temp2][element] == null) {
                                        searchResultDict[temp2][element] = searchResult[i].getAttribute(element);
                                    }
                                }
                            }
                            //get all downloads
                            var temp_data_processor = {};
                            temp_data_processor['library'] = searchResult[i].getAttribute('librarySectionTitle');
                            temp_data_processor['key'] = searchResult[i].getAttribute('key');
                            searchResultDict[temp2]['files'].push(temp_data_processor);
                        }
                    }




                }
            }
            //console.log(searchResultDict);
            //display results in html
            console.log("processing the data")
            for (let i = 0; i < Object.keys(searchResultDict).length; i++) {
                momObj = Object.values(searchResultDict)[i];

                // --- New Media Card Structure ---
                var div_mediaCard = document.createElement('div');
                div_mediaCard.className = 'mc-card'; // New main class for the card

                // 1. Image Area (includes image and overlay)
                var mc_image_area = document.createElement('div');
                mc_image_area.className = 'mc-image-area';

                var img_mediaCard_Image = document.createElement('img');
                img_mediaCard_Image.className = 'mc-image'; // New image class
                img_mediaCard_Image.alt = momObj['title'] + ' cover';
                img_mediaCard_Image.src = localStorage.getItem("selected_url") + momObj['thumb'] + "?X-Plex-Token=" + localStorage.getItem("selected_token");
                
                var mc_image_overlay = document.createElement('div');
                mc_image_overlay.className = 'mc-image-overlay';
                
                var mc_title_overlay = document.createElement('h3');
                mc_title_overlay.className = 'mc-title-overlay';
                mc_title_overlay.textContent = momObj['title'];
                mc_image_overlay.appendChild(mc_title_overlay);

                var mc_meta_overlay_text = momObj['year'] ? momObj['year'] : '';
                if (momObj['type']) {
                    mc_meta_overlay_text += (mc_meta_overlay_text ? ' • ' : '') + momObj['type'].charAt(0).toUpperCase() + momObj['type'].slice(1);
                }
                if(mc_meta_overlay_text){
                    var mc_meta_overlay = document.createElement('p');
                    mc_meta_overlay.className = 'mc-meta-overlay';
                    mc_meta_overlay.textContent = mc_meta_overlay_text;
                    mc_image_overlay.appendChild(mc_meta_overlay);
                }

                mc_image_area.appendChild(img_mediaCard_Image);
                mc_image_area.appendChild(mc_image_overlay);

                // 2. Details Area (summary, full meta, actions)
                var mc_details_area = document.createElement('div');
                mc_details_area.className = 'mc-details-area';

                // 2a. Summary
                var mc_summary_div = document.createElement('div');
                mc_summary_div.className = 'mc-summary';
                var p_summary = document.createElement('p');
                var temp_summary = momObj['summary'] || "No summary available.";
                // Removed substring for now, will handle with CSS line-clamp if needed
                p_summary.textContent = temp_summary; 
                mc_summary_div.appendChild(p_summary);
                mc_details_area.appendChild(mc_summary_div);

                // 2b. Full Meta (genres, duration, rating)
                var mc_meta_full_div = document.createElement('div');
                mc_meta_full_div.className = 'mc-meta-full';
                
                var general_info_text = (momObj['genres'] && momObj['genres'].length > 0 ? momObj['genres'].join(', ') : 'N/A') + 
                                      (momObj['duration'] ? " • " + Math.floor(momObj['duration'] / 60) + "h " + momObj['duration'] % 60 + "min" : '');
                var p_general_info = document.createElement('p');
                p_general_info.className = 'mc-general-info';
                p_general_info.textContent = general_info_text;
                mc_meta_full_div.appendChild(p_general_info);

                if (momObj['audienceRating']) {
                    var p_rating = document.createElement('p');
                    p_rating.className = 'mc-rating';
                    p_rating.textContent = 'Rating: ' + momObj['audienceRating'];
                    if (momObj['audienceRating'] > 7.9) { p_rating.classList.add("good"); }
                    else if (momObj['audienceRating'] > 5.9) { p_rating.classList.add("okay"); }
                    else if (momObj['audienceRating'] > 4.9) { p_rating.classList.add("bad"); }
                    else { p_rating.classList.add("worst"); }
                    mc_meta_full_div.appendChild(p_rating);
                }
                mc_details_area.appendChild(mc_meta_full_div);

                // 2c. Actions (Download links)
                var mc_actions_div = document.createElement('div');
                mc_actions_div.className = 'mc-actions';
                if (momObj['files'] && momObj['files'].length > 0) {
                    for (let j = 0; j < momObj['files'].length; j++) {
                        var action_button = document.createElement('a');
                        action_button.className = 'mc-action-button';
                        action_button.textContent = (momObj['files'][j]['library'] || 'Download') + (momObj['files'].length > 1 ? ' ' + (j+1) : '');
                        if (momObj['type'] == 'movie') {
                            action_button.setAttribute("onclick", "downloadMovie('" + momObj['files'][j]['key'] + "', '" + String(momObj['title']).replace(/'/g, "\\'").replace(/"/g, "\\\"") + "');");
                        } else if (momObj['type'] == 'show') {
                            action_button.setAttribute("onclick", "downloadShow('" + momObj['files'][j]['key'] + "');");
                        }
                        mc_actions_div.appendChild(action_button);
                    }
                } else {
                    var no_action_text = document.createElement('p');
                    no_action_text.className = 'mc-no-actions';
                    no_action_text.textContent = 'No download sources available.';
                    mc_actions_div.appendChild(no_action_text);
                }
                mc_details_area.appendChild(mc_actions_div);

                // Assemble Media Card
                div_mediaCard.appendChild(mc_image_area);
                div_mediaCard.appendChild(mc_details_area);

                bodyDiv.appendChild(div_mediaCard);
            }
        })
        .catch(error => {
            showMessage("error with parsing the data");
            console.error("error with parsing xml: " + error)
        })
}

function reselect() {
    localStorage.removeItem('selected');
    window.location.reload();
}

function downloadMovie(key, movieTitle) {
    showMessage("getting movie download url");
    popupDiv.innerHTML = "";
    fetch(localStorage.getItem('selected_url') + key + "?X-Plex-Token=" + localStorage.getItem('selected_token'), {
            method: 'GET'
        })
        .then(response => response.text())
        .then(data => {
            var parser = new DOMParser();
            var xml = parser.parseFromString(data, "text/xml");
            var elementInfo = xml.getElementsByTagName("Part");
            var elementFile = encodeURI(/[^/]*$/.exec(elementInfo[0].getAttribute("file"))[0]);
            var elementKey = /^(.*[\/])/.exec(elementInfo[0].getAttribute("key"))[1];
            // Die Basis-URL für Aktionen (Play, JDownloader, direkter Download-Versuch)
            var baseUrl = localStorage.getItem("selected_url") + elementKey + elementFile;
            var tokenSuffix = "?X-Plex-Token=" + localStorage.getItem("selected_token");
            
            // URL für Play und JDownloader (ohne ?download=1)
            var playOrJdUrl = baseUrl + tokenSuffix;
            // URL für direkten Download-Versuch (mit ?download=1)
            var directDlUrl = baseUrl + "?download=1" + tokenSuffix.replace("?", "&"); // Token richtig anhängen

            const escapedMovieTitle = String(movieTitle).replace(/'/g, "\\'").replace(/"/g, "\\\"");
            const rawMovieTitleForFilename = movieTitle; // Für Dateinamen ohne Escaping
            const container = elementInfo[0].getAttribute('container'); // Für Dateiendung

            popupDiv.innerHTML = `<div class="div_download_section">
                <div class="div_download_section_inner">
                <a class="closebutton" onclick="closePopupdiv()">x</a>
                    <p class="p_popup_title">${escapedMovieTitle}</p> <!-- Titel im Popup anzeigen -->
                    <div class="movie_popup_actions"> 
                        <a onclick="directDownloadMovie('${directDlUrl}', '${rawMovieTitleForFilename}', '${container}'); event.stopPropagation();" class="direct_download_movie_button movie_action_button_styled" title="Download '${escapedMovieTitle}'">
                            <img src="icons/download.svg" alt="Download Movie" class="movie_action_icon">
                        </a>
                        <a href="http://127.0.0.1:9666/flash/add?urls=${encodeURIComponent(playOrJdUrl)}" class="jdownloaderbutton movie_action_button_styled" target="_blank" title="Send to JDownloader">
                            <img src="icons/jdownloader.svg" alt="JDownloader" class="movie_action_icon">
                        </a>
                        <a onclick="playMovieInline('${playOrJdUrl}', '${escapedMovieTitle}'); event.stopPropagation();" class="play_movie_button movie_action_button_styled" title="Play '${escapedMovieTitle}'">
                            <img src="icons/tv.svg" alt="Play Movie" class="movie_action_icon play_button_icon">
                        </a>
                        <a onclick="openInVLC('${playOrJdUrl}'); event.stopPropagation();" class="vlc_button movie_action_button_styled" title="Open '${escapedMovieTitle}' in VLC">
                            <img src="icons/vlc.svg" alt="Open in VLC" class="movie_action_icon">
                        </a>
                        <a onclick="copyMovieLink('${directDlUrl}', '${escapedMovieTitle}'); event.stopPropagation();" class="copy_movie_link_button movie_action_button_styled" title="Copy download link for '${escapedMovieTitle}'">
                            <img src="icons/link.svg" alt="Copy Link" class="movie_action_icon">
                        </a>
                        <a onclick="createMovieM3U('${playOrJdUrl}', '${rawMovieTitleForFilename}'); event.stopPropagation();" class="create_m3u_button movie_action_button_styled" title="Create M3U playlist for '${escapedMovieTitle}'">
                            <img src="icons/playlist.svg" alt="Create M3U" class="movie_action_icon">
                        </a>
                    </div>
                </div>
            </div>`;
            showAnimatedPopup(popupDiv);
            bodyDiv.appendChild(popupDiv);
        })
        .catch(error => {
            showMessage("failed to fetch downlaod url");
            console.error("didn't get any information from the specific file: " + error)
        })
}

function downloadEpisode(key) {
    showMessage("getting tv show download url");
    console.log(key)
    popupDiv2.innerHTML = "";
    fetch(localStorage.getItem('selected_url') + key + "?X-Plex-Token=" + localStorage.getItem('selected_token'), {
            method: 'GET'
        })
        .then(response => response.text())
        .then(data => {
            hideMessage();
            var parser = new DOMParser();
            var xml = parser.parseFromString(data, "text/xml");
            //console.log(xml);
            var elementInfo = xml.getElementsByTagName("Part");
            var elementFile = encodeURI(/[^/]*$/.exec(elementInfo[0].getAttribute("file"))[0]);
            var elementKey = /^(.*[\/])/.exec(elementInfo[0].getAttribute("key"))[1];
            var downloadurl = localStorage.getItem("selected_url") + elementKey + elementFile + "?download=0&X-Plex-Token=" + localStorage.getItem("selected_token")
                //console.log(downloadurl);
            popupDiv2.innerHTML = `<div class="div_download_section">
            <div class="div_download_section_inner">
            <a class="closebutton" onclick="closePopupdiv2()">x</a>
                <input id="input_download_section_inner" class="input_download_section_inner" type="text" value="` + downloadurl + `" disabled="disabled">
                <a href="` + downloadurl + `" class="downloadbutton">download</a>
                <a href="http://127.0.0.1:9666/flash/add?urls=` + downloadurl + `" class="jdownloaderbutton" target="_blank">jdownloader_icon</a>
                </div>
        </div>`
            showAnimatedPopup(popupDiv2);
            bodyDiv.appendChild(popupDiv2);
            //console.log(popupDiv);
            var downloadInput = document.getElementById('input_download_section_inner')
                //console.log(downloadInput)
            downloadInput.focus()
            downloadInput.select();
            navigator.clipboard.writeText(downloadurl);
            showMessage("the downlaod url is now in your clipboard");
            //downloadButton.setAttribute("download", "test");
        })
        .catch(error => {
            showMessage("cannot fetch download url");
            console.error("didn't get any information from the specific file: " + error)
        })
}

function downloadSeason(key) {
    showMessage("getting episodes");
    //console.log(key)
    popupDiv.innerHTML = "";
    fetch(localStorage.getItem('selected_url') + key + "?X-Plex-Token=" + localStorage.getItem('selected_token'), {
            method: 'GET'
        })
        .then(response => response.text())
        .then(data => {
            hideMessage();
            var parser = new DOMParser();
            var xml = parser.parseFromString(data, "text/xml");
            
            let seriesTitle = "Unknown Series"; 
            const mediaContainer = xml.getElementsByTagName("MediaContainer")[0];
            if (mediaContainer) {
                if (mediaContainer.hasAttribute('grandparentTitle')) {
                    seriesTitle = mediaContainer.getAttribute('grandparentTitle');
                } else if (mediaContainer.hasAttribute('title1')) {
                    seriesTitle = mediaContainer.getAttribute('title1');
                } else if (mediaContainer.hasAttribute('parentTitle')) {
                    seriesTitle = mediaContainer.getAttribute('parentTitle');
                }
            }
            const seasonTitle = mediaContainer.hasAttribute('title') ? mediaContainer.getAttribute('title') : "Selected Episodes"; // Staffel-Titel aus MediaContainer holen

            var elementInfo = xml.getElementsByTagName("Video");
            var episodeList = [];
            for (let i = 0; i < elementInfo.length; i++) {
                if (elementInfo[i].getAttribute('type') == "episode") {
                    var tempEpisode = {};
                    tempEpisode['title'] = elementInfo[i].getAttribute('title');
                    tempEpisode['key'] = elementInfo[i].getAttribute('key');
                    tempEpisode['originalIndex'] = elementInfo[i].getAttribute('index'); // Originale Episodennummer, falls vorhanden
                    episodeList.push(tempEpisode);
                }
            }

            var mediaSelector = document.createElement('div');
            mediaSelector.className = 'div_mediaSelector';
            var closeButton = document.createElement('a');
            closeButton.className = 'closebutton';
            closeButton.innerText = "x";
            closeButton.setAttribute("onclick", "closePopupdiv()");
            mediaSelector.appendChild(closeButton);

            // Container für Checkboxen und Episodenliste (wird jetzt die Tabelle enthalten)
            var episodeListContainer = document.createElement('div');
            episodeListContainer.className = 'episode-list-container'; 

            // HTML-Tabelle erstellen
            var table = document.createElement('table');
            table.className = 'episodes-table'; // Klasse für CSS-Styling

            // Tabellenkopf erstellen
            var colesterol = [' ', '#', 'Titel', 'Aktionen']; // Spaltenüberschriften
            var thead = table.createTHead();
            var headerRow = thead.insertRow();
            colesterol.forEach(text => {
                var th = document.createElement('th');
                th.textContent = text;
                headerRow.appendChild(th);
            });

            // Tabellenkörper erstellen
            var tbody = table.createTBody();

            for (let i = 0; i < episodeList.length; i++) {
                var row = tbody.insertRow();
                
                // Zelle 1: Checkbox
                var cellCheckbox = row.insertCell();
                var checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'episode_checkbox';
                checkbox.value = episodeList[i]['key'];
                checkbox.dataset.episodeTitle = episodeList[i]['title'];
                checkbox.dataset.episodeOriginalIndex = episodeList[i]['originalIndex'] || (i + 1);
                cellCheckbox.appendChild(checkbox);

                // Zelle 2: Episodennummer
                var cellNumber = row.insertCell();
                cellNumber.textContent = episodeList[i]['originalIndex'] || (i + 1);
                cellNumber.className = 'episode-number-cell';

                // Zelle 3: Titel
                var cellTitle = row.insertCell();
                var a_mediaSelector = document.createElement('a');
                a_mediaSelector.className = 'a_mediaSelector_in_table'; // Eigene Klasse für Tabellen-Styling
                a_mediaSelector.innerText = episodeList[i]['title'];
                a_mediaSelector.setAttribute("onclick", "downloadEpisode('" + episodeList[i]['key'] + "');"); 
                cellTitle.appendChild(a_mediaSelector);
                cellTitle.className = 'episode-title-cell';

                // Zelle 4: Aktionen
                var cellActions = row.insertCell();
                cellActions.className = 'episode-actions-cell';
                var actionsContainer = document.createElement('div');
                actionsContainer.className = 'episode-actions-container'; // Für Flexbox-Layout der Icons

                // Play Button
                var playButtonEpisode = document.createElement('a');
                playButtonEpisode.className = 'play_button_episode a_mediaSelector_action_button_in_table';
                playButtonEpisode.title = 'Play "' + episodeList[i]['title'] + '" inline';
                playButtonEpisode.setAttribute("onclick", "playEpisodeInline('" + episodeList[i]['key'] + "', '" + episodeList[i]['title'] + "');event.stopPropagation();");
                var playIcon = document.createElement('img');
                playIcon.src = 'icons/tv.svg';
                playIcon.alt = 'Play';
                playIcon.className = 'play_button_icon table_action_icon';
                playButtonEpisode.appendChild(playIcon);
                actionsContainer.appendChild(playButtonEpisode);

                // Direkt-Download Button
                var directDownloadButton = document.createElement('a');
                directDownloadButton.className = 'direct_download_button a_mediaSelector_action_button_in_table'; 
                directDownloadButton.title = 'Download "' + episodeList[i]['title'] + '" directly';
                directDownloadButton.setAttribute("onclick", "directDownloadEpisode('" + episodeList[i]['key'] + "', '" + episodeList[i]['title'] + "');event.stopPropagation();");
                var downloadIcon = document.createElement('img');
                downloadIcon.src = 'icons/download.svg';
                downloadIcon.alt = 'Download';
                downloadIcon.className = 'direct_download_icon table_action_icon'; 
                directDownloadButton.appendChild(downloadIcon);
                actionsContainer.appendChild(directDownloadButton);

                // JDownloader Button
                var jdButtonEpisode = document.createElement('a');
                jdButtonEpisode.className = 'jd_button_episode a_mediaSelector_action_button_in_table'; 
                jdButtonEpisode.title = 'Send "' + episodeList[i]['title'] + '" to JDownloader';
                jdButtonEpisode.setAttribute("onclick", "sendSingleEpisodeToJDownloader('" + episodeList[i]['key'] + "', '" + episodeList[i]['title'] + "');event.stopPropagation();");
                var jdIcon = document.createElement('img');
                jdIcon.src = 'icons/jdownloader.svg';
                jdIcon.alt = 'JDownloader';
                jdIcon.className = 'jd_button_icon table_action_icon'; 
                jdButtonEpisode.appendChild(jdIcon);
                actionsContainer.appendChild(jdButtonEpisode); 

                // VLC Button
                var vlcButtonEpisode = document.createElement('a');
                vlcButtonEpisode.className = 'vlc_button_episode a_mediaSelector_action_button_in_table';
                vlcButtonEpisode.title = 'Open "' + episodeList[i]['title'] + '" in VLC';
                vlcButtonEpisode.setAttribute("onclick", "openEpisodeInVLC('" + episodeList[i]['key'] + "', '" + episodeList[i]['title'] + "');event.stopPropagation();");
                var vlcIcon = document.createElement('img');
                vlcIcon.src = 'icons/vlc.svg';
                vlcIcon.alt = 'Open in VLC';
                vlcIcon.className = 'vlc_button_icon table_action_icon';
                vlcButtonEpisode.appendChild(vlcIcon);
                actionsContainer.appendChild(vlcButtonEpisode);

                // Link kopieren Button
                var copyLinkButton = document.createElement('a');
                copyLinkButton.className = 'copy_link_button a_mediaSelector_action_button_in_table'; 
                copyLinkButton.title = 'Copy download link for "' + episodeList[i]['title'] + '"';
                copyLinkButton.setAttribute("onclick", "copyEpisodeLink('" + episodeList[i]['key'] + "', '" + episodeList[i]['title'] + "');event.stopPropagation();");
                var linkIcon = document.createElement('img');
                linkIcon.src = 'icons/link.svg';
                linkIcon.alt = 'Copy Link';
                linkIcon.className = 'copy_link_icon table_action_icon'; 
                copyLinkButton.appendChild(linkIcon);
                actionsContainer.appendChild(copyLinkButton);
                
                cellActions.appendChild(actionsContainer);
            }
            episodeListContainer.appendChild(table); // Tabelle dem Container hinzufügen
            mediaSelector.appendChild(episodeListContainer);

            // Button für benutzerdefinierte M3U hinzufügen
            var customM3UButton = document.createElement('button');
            customM3UButton.id = 'customM3UButton';
            customM3UButton.className = 'button custom_m3u_generator_button'; // Allgemeine Button-Klasse + spezifische
            customM3UButton.innerText = 'Create Custom M3U Playlist';
            // Der seriesTitle und seasonTitle werden hier für den Dateinamen übergeben
            customM3UButton.setAttribute("onclick", "initiateCustomM3UCreation(this, '" + seriesTitle.replace(/'/g, "\\'") + "', '" + seasonTitle.replace(/'/g, "\\'") + "');");
            mediaSelector.appendChild(customM3UButton);

            popupDiv.appendChild(mediaSelector);
            showAnimatedPopup(popupDiv);
            bodyDiv.appendChild(popupDiv);
        })
        .catch(error => {
            showMessage("failed to fetch episodes");
            console.error("didn't get any information from the specific file: " + error)
        })
}

function downloadShow(key) {
    showMessage("getting seasons");
    popupDiv.innerHTML = '';
    fetch(localStorage.getItem('selected_url') + key + "?X-Plex-Token=" + localStorage.getItem('selected_token'), {
            method: 'GET'
        })
        .then(response => response.text())
        .then(data => {
            hideMessage();
            var parser = new DOMParser();
            var xml = parser.parseFromString(data, "text/xml");
            //console.log(xml);
            //get seasons
            var elementInfo = xml.getElementsByTagName("Directory");
            //console.log(elementInfo)
            var seasonList = [];
            for (let i = 0; i < elementInfo.length; i++) {
                //console.log(elementInfo[i]);
                var temp1 = elementInfo[i].getAttribute('type');
                if (temp1 == "season") {
                    var tempSeason = {};
                    tempSeason['title'] = elementInfo[i].getAttribute('title')
                    tempSeason['key'] = elementInfo[i].getAttribute('key')
                        //console.log(elementInfo[i].getAttribute('title'))
                        //console.log(elementInfo[i].getAttribute('key'))
                    seasonList.push(tempSeason);
                }
            }
            //console.log(seasonList);
            //display seasons
            var mediaSelector = document.createElement('div');
            mediaSelector.className = 'div_mediaSelector';
            var closeButton = document.createElement('a');
            closeButton.className = 'closebutton';
            closeButton.innerText = "x";
            closeButton.setAttribute("onclick", "closePopupdiv()");
            mediaSelector.appendChild(closeButton)
            for (let i = 0; i < Object.keys(seasonList).length; i++) {
                //console.log(seasonList[i]['title'])
                var mediaSelectorSpecific = document.createElement('div');
                mediaSelectorSpecific.className = 'div_mediaSelector_specific';

                var a_mediaSelector = document.createElement('a');
                a_mediaSelector.className = 'a_mediaSelector';
                a_mediaSelector.innerText = seasonList[i]['title'];
                a_mediaSelector.setAttribute("onclick", "downloadSeason('" + seasonList[i]['key'] + "');");
                
                mediaSelectorSpecific.appendChild(a_mediaSelector);

                // JDownloader Button für die ganze Staffel (erneut sicherstellen)
                var jdButtonSeason = document.createElement('a');
                jdButtonSeason.className = 'jd_button_season a_mediaSelector_action_button';
                jdButtonSeason.title = 'Send all episodes of "' + seasonList[i]['title'] + '" to JDownloader';
                jdButtonSeason.setAttribute("onclick", "sendSeasonToJDownloader('" + seasonList[i]['key'] + "', '"+ seasonList[i]['title'] +" ');event.stopPropagation();");
                var jdIcon = document.createElement('img');
                jdIcon.src = 'icons/jdownloader.svg';
                jdIcon.alt = 'JDownloader';
                jdIcon.className = 'jd_button_icon';
                jdButtonSeason.appendChild(jdIcon);
                mediaSelectorSpecific.appendChild(jdButtonSeason); // Anhängen des JD-Buttons

                // M3U Button für die ganze Staffel (erneut sicherstellen)
                var m3uButtonSeason = document.createElement('a');
                m3uButtonSeason.className = 'm3u_button_season a_mediaSelector_action_button';
                m3uButtonSeason.title = 'Create M3U playlist for all episodes of "' + seasonList[i]['title'] + '"';
                m3uButtonSeason.setAttribute("onclick", "createSeasonM3U('" + seasonList[i]['key'] + "', '"+ seasonList[i]['title'] +" ');event.stopPropagation();");
                var playlistIcon = document.createElement('img');
                playlistIcon.src = 'icons/playlist.svg';
                playlistIcon.alt = 'Create M3U for Season';
                playlistIcon.className = 'playlist_icon';
                m3uButtonSeason.appendChild(playlistIcon);
                mediaSelectorSpecific.appendChild(m3uButtonSeason); // Anhängen des M3U-Buttons

                mediaSelector.appendChild(mediaSelectorSpecific);
            }
            popupDiv.appendChild(mediaSelector);
            showAnimatedPopup(popupDiv);
            bodyDiv.appendChild(popupDiv);
        })
        .catch(error => {
            showMessage("failed to fetch seasons");
            console.error("didn't get any information from the specific file: " + error)
        })
}

async function sendSeasonToJDownloader(seasonKey, seasonTitle) {
    showMessage("Gathering all episode links for '" + seasonTitle + "'... Please wait.");
    try {
        // 1. Fetch all episode items for the season (similar to downloadSeason)
        const seasonResponse = await fetch(localStorage.getItem('selected_url') + seasonKey + "?X-Plex-Token=" + localStorage.getItem('selected_token'));
        const seasonData = await seasonResponse.text();
        const parser = new DOMParser();
        const seasonXml = parser.parseFromString(seasonData, "text/xml");
        
        // Versuche, den Serientitel aus der Staffel-XML zu extrahieren
        let seriesTitle = "Unknown Series"; // Fallback
        const mediaContainer = seasonXml.getElementsByTagName("MediaContainer")[0];
        if (mediaContainer) {
            // Plex XML kann hier variieren. Übliche Attribute für den Serientitel auf dieser Ebene:
            // grandparentTitle (wenn man von einer Episode ausgeht, deren Parent die Staffel ist)
            // title1, title2, oder parentTitle könnten auch relevant sein, je nachdem, was seasonKey genau ist.
            // Da seasonKey die Staffel selbst ist, ist grandparentTitle oft der Serientitel.
            if (mediaContainer.hasAttribute('grandparentTitle')) {
                seriesTitle = mediaContainer.getAttribute('grandparentTitle');
            } else if (mediaContainer.hasAttribute('title1')) { // Fallback, falls grandparentTitle nicht da ist
                seriesTitle = mediaContainer.getAttribute('title1');
            } else if (mediaContainer.hasAttribute('parentTitle')) { // Weiterer Fallback
                seriesTitle = mediaContainer.getAttribute('parentTitle');
            } else {
                // Wenn kein eindeutiger Serientitel gefunden wird, könnte man den aktuellen seasonTitle
                // als Teil des Namens verwenden, was aber oft nur "Staffel X" ist.
                // Besser ein generischer Fallback und Log.
                console.warn("Could not reliably determine series title for M3U filename from season XML.");
            }
        }

        const episodeItems = seasonXml.getElementsByTagName("Video");

        let episodeKeys = [];
        for (let i = 0; i < episodeItems.length; i++) {
            if (episodeItems[i].getAttribute('type') === "episode") {
                episodeKeys.push(episodeItems[i].getAttribute('key'));
            }
        }

        if (episodeKeys.length === 0) {
            showMessage("No episodes found in '" + seasonTitle + "'.");
            return;
        }

        // 2. For each episode key, fetch its individual download URL (similar to downloadEpisode)
        const downloadUrlPromises = episodeKeys.map(async (episodeKey) => {
            try {
                const episodeResponse = await fetch(localStorage.getItem('selected_url') + episodeKey + "?X-Plex-Token=" + localStorage.getItem('selected_token'));
                const episodeData = await episodeResponse.text();
                const episodeXml = parser.parseFromString(episodeData, "text/xml");
                const partElement = episodeXml.getElementsByTagName("Part")[0]; // Assuming one Part element
                if (!partElement) {
                    console.warn("No Part element found for episode key: " + episodeKey);
                    return null; // Skip this episode if no Part element
                }
                const fileAttr = partElement.getAttribute("file");
                const keyAttr = partElement.getAttribute("key");
                if (!fileAttr || !keyAttr) {
                    console.warn("Missing file or key attribute for episode key: " + episodeKey);
                    return null; // Skip if attributes are missing
                }
                const elementFile = encodeURI(/[^/]*$/.exec(fileAttr)[0]);
                const elementKeyPath = /^(.*[\/])/.exec(keyAttr)[1];
                return localStorage.getItem("selected_url") + elementKeyPath + elementFile + "?download=0&X-Plex-Token=" + localStorage.getItem("selected_token");
            } catch (error) {
                console.error("Failed to fetch download URL for episode: " + episodeKey, error);
                return null; // Return null or some error indicator if a fetch fails
            }
        });

        // 3. Wait for all download URL fetches to complete
        const downloadUrls = (await Promise.all(downloadUrlPromises)).filter(url => url !== null); // Filter out any nulls from failed fetches

        if (downloadUrls.length === 0) {
            showMessage("Could not retrieve any download links for '" + seasonTitle + "'. Check console for errors.");
            return;
        }

        // 4. Construct JDownloader link and open it
        const jdownloaderBaseUrl = "http://127.0.0.1:9666/flash/add?urls=";
        const urlsString = JSON.stringify(downloadUrls);
        const finalJdLink = jdownloaderBaseUrl + encodeURIComponent(urlsString);

        //console.log("JDownloader link for season '" + seasonTitle + "':", finalJdLink);
        window.open(finalJdLink, '_blank');
        showMessage("All episodes of '" + seasonTitle + "' sent to JDownloader! ('" + downloadUrls.length + "/'"+ episodeKeys.length +"' links)");
        closePopupdiv(); // Close the season/episode selection popup

    } catch (error) {
        showMessage("Error sending season '" + seasonTitle + "' to JDownloader. Check console for details.");
        console.error("Error in sendSeasonToJDownloader for '" + seasonTitle + "':", error);
    }
}

async function sendSingleEpisodeToJDownloader(episodeKey, episodeTitle) {
    showMessage("Gathering download URL for '" + episodeTitle + "'... Please wait.");
    try {
        const episodeResponse = await fetch(localStorage.getItem('selected_url') + episodeKey + "?X-Plex-Token=" + localStorage.getItem('selected_token'));
        const episodeData = await episodeResponse.text();
        const parser = new DOMParser();
        const episodeXml = parser.parseFromString(episodeData, "text/xml");
        const partElement = episodeXml.getElementsByTagName("Part")[0]; 
        if (!partElement) {
            console.warn("No Part element found for episode key: " + episodeKey);
            showMessage("No download source found for '" + episodeTitle + "'.");
            return;
        }
        const fileAttr = partElement.getAttribute("file");
        const keyAttr = partElement.getAttribute("key");
        if (!fileAttr || !keyAttr) {
            console.warn("Missing file or key attribute for episode key: " + episodeKey);
            showMessage("No download source found for '" + episodeTitle + "'.");
            return;
        }
        const elementFile = encodeURI(/[^/]*$/.exec(fileAttr)[0]);
        const elementKeyPath = /^(.*[\/])/.exec(keyAttr)[1];
        const downloadUrl = localStorage.getItem("selected_url") + elementKeyPath + elementFile + "?download=0&X-Plex-Token=" + localStorage.getItem("selected_token");

        const jdownloaderBaseUrl = "http://127.0.0.1:9666/flash/add?urls=";
        const finalJdLink = jdownloaderBaseUrl + encodeURIComponent(downloadUrl); // Für einzelne URL nicht unbedingt JSON.stringify nötig, aber sicherheitshalber als Array
        
        // Alternativ, falls JDownloader einzelne URLs direkt ohne Array-Formatierung akzeptiert (oft der Fall):
        // const finalJdLink = jdownloaderBaseUrl + encodeURIComponent(downloadUrl);

        window.open(finalJdLink, '_blank');
        showMessage("'" + episodeTitle + "' sent to JDownloader!");
        // Das Popup (popupDiv) sollte hier nicht geschlossen werden, da der Benutzer möglicherweise weitere einzelne Folgen senden möchte.
        // Das Schließen erfolgt durch den Benutzer über den globalen Schließen-Button des Popups.

    } catch (error) {
        showMessage("Error sending '" + episodeTitle + "' to JDownloader. Check console.");
        console.error("Error in sendSingleEpisodeToJDownloader for '" + episodeTitle + "':", error);
    }
}

function closeVideoPlayerPopup() {
    if (videoPlayerPopup && videoPlayerContainer) {
        closeAnimatedPopup(videoPlayerPopup, false); // Inhalt nicht sofort leeren, falls Animation noch läuft
        // Stoppe und entferne das Video, um Ressourcen freizugeben
        setTimeout(() => { // Stelle sicher, dass es nach der Ausblendanimation passiert
            videoPlayerContainer.innerHTML = ""; 
        }, 250); 
    }
}

async function playMovieInline(movieUrl, movieTitle) {
    if (!videoPlayerPopup || !videoPlayerContainer) {
        console.error("Video player popup elements not found.");
        showMessage("Error: Video player not initialized correctly.");
        return;
    }

    showMessage("Loading movie '" + movieTitle + "'...");
    try {
        // Die movieUrl wird direkt übergeben und enthält bereits den Token
        // Keine weitere Fetch-Anfrage nötig, um die URL zu bekommen, es sei denn, wir bräuchten spezifische Container-Infos etc.
        // Für dieses Beispiel gehen wir davon aus, die URL ist direkt abspielbar.

        videoPlayerContainer.innerHTML = ''; // Vorherigen Inhalt leeren

        const videoElement = document.createElement('video');
        videoElement.setAttribute('controls', 'true');
        videoElement.setAttribute('autoplay', 'true'); 
        videoElement.style.width = '100%'; 
        videoElement.style.height = 'auto';
        videoElement.style.maxHeight = 'calc(100vh - 150px)'; 

        const sourceElement = document.createElement('source');
        sourceElement.setAttribute('src', movieUrl);
        // Typ ist oft schwierig zu bestimmen, Browser können es oft selbst.
        // Wir setzen einen gängigen Typ oder lassen ihn weg, damit der Browser entscheidet.
        sourceElement.setAttribute('type', 'video/mp4'); // Annahme, kann fehlschlagen wenn nicht mp4

        videoElement.appendChild(sourceElement);
        videoElement.innerHTML += "Your browser does not support the video tag or the video format.";
        
        videoPlayerContainer.appendChild(videoElement);
        
        showAnimatedPopup(videoPlayerPopup); 
        hideMessage(); 

        videoElement.addEventListener('error', (e) => {
            console.error("Error playing video:", e);
            console.error("Video source URL:", movieUrl);
            showMessage("Error: Could not play '" + movieTitle + "'. Format not supported or URL invalid.");
        });

    } catch (error) {
        showMessage("Error loading '" + movieTitle + "'. Check console.");
        console.error("Error in playMovieInline for '" + movieTitle + "':", error);
        closeVideoPlayerPopup();
    }
}

async function playEpisodeInline(episodeKey, episodeTitle) {
    if (!videoPlayerPopup || !videoPlayerContainer) {
        console.error("Video player popup elements not found.");
        showMessage("Error: Video player not initialized correctly.");
        return;
    }

    showMessage("Loading episode '" + episodeTitle + "'...");
    try {
        const episodeResponse = await fetch(localStorage.getItem('selected_url') + episodeKey + "?X-Plex-Token=" + localStorage.getItem('selected_token'));
        const episodeData = await episodeResponse.text();
        const parser = new DOMParser();
        const episodeXml = parser.parseFromString(episodeData, "text/xml");
        const partElement = episodeXml.getElementsByTagName("Part")[0];

        if (!partElement) {
            console.warn("No Part element found for episode key: " + episodeKey);
            showMessage("No playable source found for '" + episodeTitle + "'.");
            return;
        }
        const fileAttr = partElement.getAttribute("file");
        const keyAttr = partElement.getAttribute("key");
        if (!fileAttr || !keyAttr) {
            console.warn("Missing file or key attribute for episode key: " + episodeKey);
            showMessage("No playable source found for '" + episodeTitle + "'.");
            return;
        }

        const elementFile = encodeURI(/[^/]*$/.exec(fileAttr)[0]);
        const elementKeyPath = /^(.*[\/])/.exec(keyAttr)[1];
        const streamingUrl = localStorage.getItem("selected_url") + elementKeyPath + elementFile + "?X-Plex-Token=" + localStorage.getItem("selected_token");
        // Für direktes Streaming im <video>-Tag ist der Parameter ?download=0 nicht ideal, da er den Download forciert.
        // Plex URLs für direktes Streaming (transkodiert oder direkt) können komplexer sein und hängen von Client-Profilen ab.
        // Wir versuchen es zunächst mit der direkten Datei-URL, die oft funktioniert, wenn der Browser das Format unterstützt.

        videoPlayerContainer.innerHTML = ''; // Vorherigen Inhalt leeren

        const videoElement = document.createElement('video');
        videoElement.setAttribute('controls', 'true');
        videoElement.setAttribute('autoplay', 'true'); // Optional: Video automatisch starten
        videoElement.style.width = '100%'; // Für responsives Verhalten im Popup
        videoElement.style.height = 'auto';
        videoElement.style.maxHeight = 'calc(100vh - 150px)'; // Begrenzung der Höhe

        const sourceElement = document.createElement('source');
        sourceElement.setAttribute('src', streamingUrl);
        // Den Typ des Videos zu erraten ist schwierig. Man könnte versuchen, ihn aus 'container' im XML zu lesen.
        // Für den Anfang lassen wir den Browser entscheiden oder setzen einen gängigen Typ.
        // const containerType = partElement.getAttribute('container'); // z.B. 'mkv', 'mp4'
        // if (containerType) sourceElement.setAttribute('type', 'video/' + containerType);
        // Da MKV oft nicht direkt im Browser geht, wäre MP4 besser.
        sourceElement.setAttribute('type', 'video/mp4'); // Sicherer Standard, auch wenn es nicht immer MP4 ist

        videoElement.appendChild(sourceElement);
        videoElement.innerHTML += "Your browser does not support the video tag or the video format."; // Fallback-Text
        
        videoPlayerContainer.appendChild(videoElement);
        
        showAnimatedPopup(videoPlayerPopup); // Das neue Popup anzeigen
        hideMessage(); // Eventuelle vorherige Nachrichten ausblenden

        videoElement.addEventListener('error', (e) => {
            console.error("Error playing video:", e);
            console.error("Video source URL:", streamingUrl);
            showMessage("Error: Could not play '" + episodeTitle + "'. The format might not be supported or the URL is invalid.");
            // Optional: Popup nach Fehler schließen oder Fehlermeldung im Popup anzeigen
            // closeVideoPlayerPopup();
        });

    } catch (error) {
        showMessage("Error loading '" + episodeTitle + "'. Check console.");
        console.error("Error in playEpisodeInline for '" + episodeTitle + "':", error);
        closeVideoPlayerPopup(); // Popup schließen bei generellem Fehler
    }
}

async function directDownloadEpisode(episodeKey, episodeTitle) {
    showMessage("Preparing direct download for '" + episodeTitle + "'...");
    try {
        const episodeResponse = await fetch(localStorage.getItem('selected_url') + episodeKey + "?X-Plex-Token=" + localStorage.getItem('selected_token'));
        const episodeData = await episodeResponse.text();
        const parser = new DOMParser();
        const episodeXml = parser.parseFromString(episodeData, "text/xml");
        const partElement = episodeXml.getElementsByTagName("Part")[0];

        if (!partElement) {
            console.warn("No Part element found for episode key: " + episodeKey);
            showMessage("No download source found for '" + episodeTitle + "'.");
            return;
        }

        const fileAttr = partElement.getAttribute("file");
        const keyAttr = partElement.getAttribute("key");
        if (!fileAttr || !keyAttr) {
            console.warn("Missing file or key attribute for episode key: " + episodeKey);
            showMessage("No download source found for '" + episodeTitle + "'.");
            return;
        }

        const elementFile = /[^/]*$/.exec(fileAttr)[0]; // Nicht URI-encoden für den Dateinamen
        const elementKeyPath = /^(.*[\/])/.exec(keyAttr)[1];
        
        // Für direkten Download ist es oft am besten, die URL so zu verwenden, wie sie ist, und sich auf den Server zu verlassen,
        // oder einen spezifischen Download-Trigger-Parameter hinzuzufügen, falls bekannt.
        // Der Token wird hier beibehalten, da Plex ihn i.d.R. für den Zugriff auf die Datei benötigt.
        const downloadUrl = localStorage.getItem("selected_url") + elementKeyPath + encodeURI(elementFile) + "?download=1&X-Plex-Token=" + localStorage.getItem("selected_token");
        // Der Parameter download=1 ist ein Versuch; Plex könnte anders reagieren oder dies ignorieren.
        // Manche Plex-Setups benötigen gar keinen extra Parameter für den Browser-Download-Dialog.

        const tempLink = document.createElement('a');
        tempLink.href = downloadUrl;
        
        // Versuche, eine passende Dateiendung aus dem Container-Attribut zu extrahieren.
        let fileName = episodeTitle;
        const container = partElement.getAttribute('container');
        if (container && !fileName.toLowerCase().endsWith('.' + container.toLowerCase())) {
            fileName += '.' + container.toLowerCase();
        }
        tempLink.setAttribute('download', fileName);
        
        document.body.appendChild(tempLink); // Muss zum DOM hinzugefügt werden, damit der Klick in manchen Browsern funktioniert
        tempLink.click();
        document.body.removeChild(tempLink);

        showMessage("Download for '" + episodeTitle + "' started.");

    } catch (error) {
        showMessage("Error preparing download for '" + episodeTitle + "'. Check console.");
        console.error("Error in directDownloadEpisode for '" + episodeTitle + "':", error);
    }
}

async function copyEpisodeLink(episodeKey, episodeTitle) {
    showMessage("Getting link for '" + episodeTitle + "'...");
    try {
        const episodeResponse = await fetch(localStorage.getItem('selected_url') + episodeKey + "?X-Plex-Token=" + localStorage.getItem('selected_token'));
        const episodeData = await episodeResponse.text();
        const parser = new DOMParser();
        const episodeXml = parser.parseFromString(episodeData, "text/xml");
        const partElement = episodeXml.getElementsByTagName("Part")[0];

        if (!partElement) {
            console.warn("No Part element found for episode key: " + episodeKey);
            showMessage("Could not get link for '" + episodeTitle + "'.");
            return;
        }

        const fileAttr = partElement.getAttribute("file");
        const keyAttr = partElement.getAttribute("key");
        if (!fileAttr || !keyAttr) {
            console.warn("Missing file or key attribute for episode key: " + episodeKey);
            showMessage("Could not get link for '" + episodeTitle + "'.");
            return;
        }

        const elementFile = /[^/]*$/.exec(fileAttr)[0];
        const elementKeyPath = /^(.*[\/])/.exec(keyAttr)[1];
        
        // Erzeuge die URL, die kopiert werden soll. Mit ?download=1 ist sie konsistent zum Direkt-Download.
        const shareableUrl = localStorage.getItem("selected_url") + elementKeyPath + encodeURI(elementFile) + "?download=1&X-Plex-Token=" + localStorage.getItem("selected_token");

        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareableUrl);
            showMessage("Link for '" + episodeTitle + "' copied to clipboard!");
        } else {
            // Fallback für ältere Browser oder unsichere Kontexte (http)
            const textArea = document.createElement("textarea");
            textArea.value = shareableUrl;
            textArea.style.position = "fixed"; // Verhindert Scrollen
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                showMessage("Link for '" + episodeTitle + "' copied (fallback method)!");
            } catch (err) {
                showMessage("Failed to copy link for '" + episodeTitle + "'.");
                console.error('Fallback: Oops, unable to copy', err);
            }
            document.body.removeChild(textArea);
        }

    } catch (error) {
        showMessage("Error getting link for '" + episodeTitle + "'. Check console.");
        console.error("Error in copyEpisodeLink for '" + episodeTitle + "':", error);
    }
}

async function copyMovieLink(shareableUrl, movieTitle) {
    showMessage("Getting link for '" + movieTitle + "'...");
    try {
        // Die URL wird direkt übergeben.
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareableUrl);
            showMessage("Link for '" + movieTitle + "' copied to clipboard!");
        } else {
            // Fallback für ältere Browser oder unsichere Kontexte (http)
            const textArea = document.createElement("textarea");
            textArea.value = shareableUrl;
            textArea.style.position = "fixed"; 
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                showMessage("Link for '" + movieTitle + "' copied (fallback method)!");
            } catch (err) {
                showMessage("Failed to copy link for '" + movieTitle + "'.");
                console.error('Fallback: Oops, unable to copy', err);
            }
            document.body.removeChild(textArea);
        }
    } catch (error) {
        showMessage("Error preparing link for '" + movieTitle + "'. Check console.");
        console.error("Error in copyMovieLink for '" + movieTitle + "':", error);
    }
}

async function directDownloadMovie(downloadUrl, movieTitle, container) {
    showMessage("Preparing direct download for '" + movieTitle + "'...");
    try {
        const tempLink = document.createElement('a');
        tempLink.href = downloadUrl; // Die URL enthält bereits ?download=1 und den Token
        
        let fileName = movieTitle;
        if (container && !fileName.toLowerCase().endsWith('.' + container.toLowerCase())) {
            fileName += '.' + container.toLowerCase();
        } else if (!container && !fileName.match(/\.[^.\/]+$/)) {
            // Fallback, wenn kein Container bekannt ist und kein Punkt für eine Endung im Titel ist
            // Hier könnte man eine Standardendung wie .mp4 oder .mkv annehmen, ist aber riskant.
            // Besser ist es, wenn der Server korrekte Content-Disposition Header sendet.
            // Fürs Erste lassen wir es ohne, oder fügen eine generische Endung hinzu, wenn der Browser es nicht selbst macht.
        }
        tempLink.setAttribute('download', fileName);
        
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);

        showMessage("Download for '" + movieTitle + "' started.");

    } catch (error) {
        showMessage("Error preparing download for '" + movieTitle + "'. Check console.");
        console.error("Error in directDownloadMovie for '" + movieTitle + "':", error);
    }
}

async function createSeasonM3U(seasonKey, seasonTitle) {
    showMessage("Creating M3U playlist for season '" + seasonTitle + "'...");
    try {
        // 1. Fetch all episode items for the season
        const seasonResponse = await fetch(localStorage.getItem('selected_url') + seasonKey + "?X-Plex-Token=" + localStorage.getItem('selected_token'));
        const seasonData = await seasonResponse.text();
        const parser = new DOMParser();
        const seasonXml = parser.parseFromString(seasonData, "text/xml");
        
        // Versuche, den Serientitel aus der Staffel-XML zu extrahieren
        let seriesTitle = "Unknown Series"; // Fallback
        const mediaContainer = seasonXml.getElementsByTagName("MediaContainer")[0];
        if (mediaContainer) {
            // Plex XML kann hier variieren. Übliche Attribute für den Serientitel auf dieser Ebene:
            // grandparentTitle (wenn man von einer Episode ausgeht, deren Parent die Staffel ist)
            // title1, title2, oder parentTitle könnten auch relevant sein, je nachdem, was seasonKey genau ist.
            // Da seasonKey die Staffel selbst ist, ist grandparentTitle oft der Serientitel.
            if (mediaContainer.hasAttribute('grandparentTitle')) {
                seriesTitle = mediaContainer.getAttribute('grandparentTitle');
            } else if (mediaContainer.hasAttribute('title1')) { // Fallback, falls grandparentTitle nicht da ist
                seriesTitle = mediaContainer.getAttribute('title1');
            } else if (mediaContainer.hasAttribute('parentTitle')) { // Weiterer Fallback
                seriesTitle = mediaContainer.getAttribute('parentTitle');
            } else {
                // Wenn kein eindeutiger Serientitel gefunden wird, könnte man den aktuellen seasonTitle
                // als Teil des Namens verwenden, was aber oft nur "Staffel X" ist.
                // Besser ein generischer Fallback und Log.
                console.warn("Could not reliably determine series title for M3U filename from season XML.");
            }
        }

        const episodeItems = seasonXml.getElementsByTagName("Video");

        let episodesForM3U = [];
        for (let i = 0; i < episodeItems.length; i++) {
            if (episodeItems[i].getAttribute('type') === "episode") {
                episodesForM3U.push({
                    key: episodeItems[i].getAttribute('key'),
                    title: episodeItems[i].getAttribute('title') || 'Episode ' + (i + 1)
                });
            }
        }

        if (episodesForM3U.length === 0) {
            showMessage("No episodes found in season '" + seasonTitle + "'.");
            return;
        }

        // 2. For each episode, get its streaming URL
        let m3uEntries = [];
        for (const episode of episodesForM3U) {
            try {
                const episodeResponse = await fetch(localStorage.getItem('selected_url') + episode.key + "?X-Plex-Token=" + localStorage.getItem('selected_token'));
                const episodeData = await episodeResponse.text();
                const episodeXml = parser.parseFromString(episodeData, "text/xml");
                const partElement = episodeXml.getElementsByTagName("Part")[0];
                if (partElement) {
                    const fileAttr = partElement.getAttribute("file");
                    const keyAttr = partElement.getAttribute("key");
                    if (fileAttr && keyAttr) {
                        const elementFile = encodeURI(/[^/]*$/.exec(fileAttr)[0]);
                        const elementKeyPath = /^(.*[\/])/.exec(keyAttr)[1];
                        const streamUrl = localStorage.getItem("selected_url") + elementKeyPath + elementFile + "?X-Plex-Token=" + localStorage.getItem("selected_token"); 
                        m3uEntries.push(`#EXTINF:-1,${episode.title}\n${streamUrl}`);
                    }
                }
            } catch (err) {
                console.error("Could not fetch URL for episode '" + episode.title + "':", err);
                // Optionally skip this episode or add a comment to M3U
            }
        }

        if (m3uEntries.length === 0) {
            showMessage("Could not retrieve any stream URLs for season '" + seasonTitle + "'.");
            return;
        }

        // 3. Construct M3U content and trigger download
        const m3uContent = "#EXTM3U\n" + m3uEntries.join("\n");
        const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
        const objectUrl = URL.createObjectURL(blob);

        const tempLink = document.createElement('a');
        tempLink.href = objectUrl;
        
        // Dateinamen zusammenstellen: StaffelTitel (z.B. "Staffel 1") - SerienTitel.m3u
        let fileName = `${seasonTitle} - ${seriesTitle}`;
        fileName = fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').substring(0, 200) + '.m3u';
        
        tempLink.setAttribute('download', fileName);
        
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        URL.revokeObjectURL(objectUrl);

        showMessage("M3U playlist for season '" + seasonTitle + "' created.");

    } catch (error) {
        showMessage("Error creating M3U for season '" + seasonTitle + "'. Check console.");
        console.error("Error in createSeasonM3U for '" + seasonTitle + "':", error);
    }
}

function createMovieM3U(movieUrl, movieTitle) {
    showMessage("Creating M3U playlist for '" + movieTitle + "'...");
    try {
        const m3uContent = `#EXTM3U\n#EXTINF:-1,${movieTitle}\n${movieUrl}`;
        const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
        const objectUrl = URL.createObjectURL(blob);

        const tempLink = document.createElement('a');
        tempLink.href = objectUrl;
        
        // Sanitize movieTitle for filename, replace invalid characters
        let fileName = movieTitle.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_'); // Ersetzt ungültige Zeichen durch Unterstrich
        fileName = fileName.replace(/\.$/, '_ending_dot_'); // Ersetzt Punkte am Ende, da problematisch unter Windows
        fileName = fileName.substring(0, 200); // Kürzen, um extrem lange Dateinamen zu vermeiden
        fileName += '.m3u';

        tempLink.setAttribute('download', fileName);
        
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);

        URL.revokeObjectURL(objectUrl); // Wichtig: Objekt-URL freigeben

        showMessage("M3U playlist for '" + movieTitle + "' created.");

    } catch (error) {
        showMessage("Error creating M3U for '" + movieTitle + "'. Check console.");
        console.error("Error in createMovieM3U for '" + movieTitle + "':", error);
    }
}

async function initiateCustomM3UCreation(buttonElement, seriesTitleForFilename, seasonTitleForFilename) {
    const mediaSelectorDiv = buttonElement.closest('.div_mediaSelector');
    if (!mediaSelectorDiv) {
        showMessage("Error: Could not find episode list container.");
        return;
    }

    const checkedCheckboxes = mediaSelectorDiv.querySelectorAll('.episode_checkbox:checked');
    
    if (checkedCheckboxes.length === 0) {
        showMessage("Please select at least one episode to create a custom M3U playlist.");
        return;
    }

    let selectedEpisodesData = [];
    checkedCheckboxes.forEach(checkbox => {
        selectedEpisodesData.push({
            key: checkbox.value,
            title: checkbox.dataset.episodeTitle,
            originalIndex: parseInt(checkbox.dataset.episodeOriginalIndex, 10) // Als Zahl parsen für Sortierung
        });
    });

    // Sortiere Episoden nach ihrer originalen Indexnummer
    selectedEpisodesData.sort((a, b) => a.originalIndex - b.originalIndex);

    // Dateinamenerstellung - mit spezifischen Episodennummern
    let episodeNumbersString = selectedEpisodesData.map(ep => ep.originalIndex).join('-');
    let fileName = `Episode ${episodeNumbersString} - ${seriesTitleForFilename}.m3u`;
    // Falls der seasonTitleForFilename auch gewünscht ist, könnte man ihn hier einfügen:
    // let fileName = `Episode ${episodeNumbersString} - ${seasonTitleForFilename} - ${seriesTitleForFilename}.m3u`;
    // Fürs Erste, wie vom User primär gewünscht, mit Serienname.

    fileName = fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').substring(0, 200); // Bereinigen
    if (!fileName.endsWith(".m3u")) fileName += ".m3u";
    
    showMessage("Fetching episode URLs for custom M3U...");
    await fetchUrlsAndGenerateM3U(selectedEpisodesData, fileName);
}

async function fetchUrlsAndGenerateM3U(selectedEpisodesData, fileName) {
    let m3uEntries = [];
    let successfullyFetchedCount = 0;

    for (const episode of selectedEpisodesData) {
        try {
            const episodeResponse = await fetch(localStorage.getItem('selected_url') + episode.key + "?X-Plex-Token=" + localStorage.getItem('selected_token'));
            const episodeData = await episodeResponse.text();
            const parser = new DOMParser();
            const episodeXml = parser.parseFromString(episodeData, "text/xml");
            const partElement = episodeXml.getElementsByTagName("Part")[0];
            if (partElement) {
                const fileAttr = partElement.getAttribute("file");
                const keyAttr = partElement.getAttribute("key");
                if (fileAttr && keyAttr) {
                    const elementFile = encodeURI(/[^/]*$/.exec(fileAttr)[0]);
                    const elementKeyPath = /^(.*[\/])/.exec(keyAttr)[1];
                    const streamUrl = localStorage.getItem("selected_url") + elementKeyPath + elementFile + "?X-Plex-Token=" + localStorage.getItem("selected_token"); 
                    m3uEntries.push(`#EXTINF:-1,${episode.title}\n${streamUrl}`);
                    successfullyFetchedCount++;
                }
            }
        } catch (err) {
            console.error("Could not fetch URL for episode '" + episode.title + "':", err);
            // Optional: Informiere den Benutzer oder überspringe stillschweigend
        }
    }

    if (m3uEntries.length === 0) {
        showMessage("Could not retrieve any stream URLs for the selected episodes.");
        return;
    }

    const m3uContent = "#EXTM3U\n" + m3uEntries.join("\n");
    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
    const objectUrl = URL.createObjectURL(blob);

    const tempLink = document.createElement('a');
    tempLink.href = objectUrl;
    tempLink.setAttribute('download', fileName);
    
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    URL.revokeObjectURL(objectUrl);

    showMessage(`Custom M3U playlist '${fileName}' created with ${successfullyFetchedCount} of ${selectedEpisodesData.length} selected episodes.`);
}

$(document).ready(function() {
    popupDiv.style.display = "none";
    popupDiv2.style.display = "none";
    hideSearchHistory();

    if (searchBar) {
        searchBar.addEventListener('focus', displaySearchHistory);
    }

    document.addEventListener('click', function(event) {
        if (searchBar && searchHistoryContainer) {
            const isClickInsideSearchBar = searchBar.contains(event.target);
            const isClickInsideHistory = searchHistoryContainer.contains(event.target);
            if (!isClickInsideSearchBar && !isClickInsideHistory) {
                hideSearchHistory();
            }
        }
    });

    if (localStorage.getItem("login") === null) {
        reselectButton.classList.add("disabled");
        logoutButton.classList.add("disabled");
        searchBar.classList.add("disabled");
        searchBar.disabled = true;
        searchButton.disabled = true;
        popupDiv.innerHTML = `<div class="div_login">
            <form class="loginform" action="#" onsubmit="login();return false">
                    <input class="logininput" name="uname" type="text" placeholder="Plex Username" id="username_field" required>
                    <input class="logininput" name="pword" type="password" placeholder="Plex Password" id="password_field" required>
                    <button class="loginbutton" type=submit onclick="login()">Submit</button>
            </form>
        </div>`
        showAnimatedPopup(popupDiv);
    } else if (localStorage.getItem("selected") === null) {
        reselectButton.classList.add("disabled");
        searchBar.classList.add("disabled");
        searchBar.disabled = true;
        searchButton.disabled = true;
        var popupTitle = document.createElement('p');
        popupTitle.className = 'p_popup_title';
        popupTitle.innerHTML = "Select a Connection";
        popupDiv.appendChild(popupTitle);
        var serversToChoose = JSON.parse(localStorage.getItem("servers"))
        for (let i = 0; i < serversToChoose.length; i++) {
            var div1 = document.createElement('div');
            div1.className = 'div_selectserver';
            var server_name = document.createElement('p');
            server_name.className = 'p_selectserver_title';
            server_name.innerHTML = serversToChoose[i]['name'];
            div1.appendChild(server_name);
            //console.log(serversToChoose[i]['name'])
            for (let j = 0; j < Object.entries(serversToChoose[i]["connections"]).length; j++) {
                var server_url = document.createElement('a');
                server_url.className = 'p_selectserver_url';
                server_url.setAttribute("onclick", "selectSelected('" + serversToChoose[i]['connections'][j] + "','" + serversToChoose[i]['token'] + "')");
                server_url.innerHTML = serversToChoose[i]["connections"][j];
                //console.log("i :" + i + ", j: " + j)
                //console.log(serversToChoose[i]["connections"][j])
                div1.appendChild(server_url);
            }
            //console.log(div1)
            popupDiv.appendChild(div1);
        }
        showAnimatedPopup(popupDiv);
    } else {
        console.log("nothing")
    }
});

function openInVLC(url) {
    if (!url) {
        showMessage("Error: No URL provided to open in VLC.");
        console.error("VLC Link-Error: URL ist nicht vorhanden.");
        return;
    }
    window.location.href = 'vlc://' + url;
}

async function openEpisodeInVLC(episodeKey, episodeTitle) {
    const episodeUrl = await getPlexDirectLink(episodeKey);
    if (episodeUrl) {
        openInVLC(episodeUrl);
        showMessage(`Opening "${episodeTitle}" in VLC...`);
    } else {
        showMessage(`Could not get link for "${episodeTitle}".`);
    }
}

function openVLCLinker() {
    window.open('https://github.com/BotAwesome/VLC-linker', '_blank');
}
