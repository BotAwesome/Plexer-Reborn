var popupDiv = document.getElementById("div_popup");
var popupDiv2 = document.getElementById("div_popup2");
var bodyDiv = document.getElementById("div_bodycontent");
var detailPageContainer = document.getElementById("detailPageContainer");
var reselectButton = document.getElementById("reselectbutton");
var logoutButton = document.getElementById("logoutbutton");
var searchButton = document.getElementById("searchbutton");
var searchBar = document.getElementById("searchbar");
var messageBox = document.getElementById("messagebox");
var message = document.getElementById("message");
var messageSpinner = document.getElementById("messageSpinner");
var searchHistoryContainer = document.getElementById("searchHistoryContainer");
var videoPlayerPopup = document.getElementById("videoPlayerPopup");
var videoPlayerContainer = document.getElementById("videoPlayerContainer");
var sidebar = document.querySelector('.sidebar');
var mainContent = document.querySelector('.main-content');

const MAX_HISTORY_ITEMS = 10;
const SEARCH_HISTORY_KEY = 'plexerSearchHistory';
const WATCHED_ITEMS_KEY = 'plexerWatchedItems';

// Search improvement variables
let searchTimeout = null;
let currentAbortController = null;
let autocompleteTimeout = null;
let currentAutocompleteAbortController = null;

// Page navigation state management
let currentView = 'search'; // 'search' | 'detail'
let previousSearchResults = null; // Saved search results for back navigation
let currentMediaData = null; // Current media data for detail view

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

function showMessage(themessage, showSpinner = false) {
    message.innerText = themessage;
    messageBox.style.display = "flex";
    if (messageSpinner) {
        messageSpinner.style.display = showSpinner ? "inline-block" : "none";
    }
}

function hideMessage() {
    message.innerText = "";
    messageBox.style.display = "none";
    if (messageSpinner) {
        messageSpinner.style.display = "none";
    }
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

// Debounced search function
function debouncedSearcher() {
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Abort previous search if still running
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }
    
    // Set new timeout for search
    searchTimeout = setTimeout(() => {
        searcher();
        searchTimeout = null;
    }, 500);
}

// Clear search bar function
function clearSearchBar() {
    if (searchBar) {
        searchBar.value = '';
        hideSearchHistory();
        // Hide clear button
        const clearButton = document.getElementById('searchClearButton');
        if (clearButton) {
            clearButton.style.display = 'none';
        }
    }
}

// Highlight search terms in text (XSS-safe)
function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || !text) return text;
    
    // XSS protection: Escape HTML
    const escapedText = text.replace(/[&<>"']/g, (m) => {
        const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
        return map[m];
    });
    
    // Escape special regex characters in search term
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create regex for case-insensitive search
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    
    // Replace matches with highlighted version
    return escapedText.replace(regex, '<mark>$1</mark>');
}

// Plex API: Get available sections
async function getAvailableSections() {
    try {
        const url = localStorage.getItem('selected_url');
        const token = localStorage.getItem('selected_token');
        if (!url || !token) return [];
        
        const response = await fetch(`${url}/library/sections?X-Plex-Token=${token}`);
        const data = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(data, "text/xml");
        
        const sections = [];
        const sectionElements = xml.getElementsByTagName("Directory");
        for (let section of sectionElements) {
            sections.push({
                id: section.getAttribute('key'),
                title: section.getAttribute('title'),
                type: section.getAttribute('type')
            });
        }
        return sections;
    } catch (error) {
        console.error("Error fetching sections:", error);
        return [];
    }
}

// Old API functions removed - replaced by SearchAPI class

// Plex API: Get autocomplete suggestions
async function getAutocompleteSuggestions(query, sectionId = null) {
    if (!isValidSearchQuery(query)) return [];
    
    try {
        const url = localStorage.getItem('selected_url');
        const token = localStorage.getItem('selected_token');
        if (!url || !token) return [];
        
        // If sectionId is not provided, try to get first section or use search endpoint
        let autocompleteUrl;
        if (sectionId) {
            autocompleteUrl = `${url}/library/sections/${sectionId}/autocomplete?query=${encodeURIComponent(query)}&X-Plex-Token=${token}`;
        } else {
            // Fallback: use search endpoint with limit for suggestions
            autocompleteUrl = `${url}/search?query=${encodeURIComponent(query)}&X-Plex-Token=${token}&limit=10`;
        }
        
        const response = await fetch(autocompleteUrl);
        const data = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(data, "text/xml");
        
        return parseAutocompleteFromXML(xml);
    } catch (error) {
        console.error("Error fetching autocomplete:", error);
        return [];
    }
}

// Parse autocomplete suggestions from XML
function parseAutocompleteFromXML(xml) {
    const suggestions = [];
    
    // Try Directory elements (shows)
    const directories = xml.getElementsByTagName("Directory");
    for (let dir of directories) {
        const title = dir.getAttribute('title');
        if (title) {
            suggestions.push({
                title: title,
                type: dir.getAttribute('type') || 'show',
                key: dir.getAttribute('key')
            });
        }
    }
    
    // Try Video elements (movies)
    const videos = xml.getElementsByTagName("Video");
    for (let video of videos) {
        const title = video.getAttribute('title');
        if (title) {
            suggestions.push({
                title: title,
                type: video.getAttribute('type') || 'movie',
                key: video.getAttribute('key')
            });
        }
    }
    
    return suggestions;
}

// Debounced autocomplete function
function debouncedAutocomplete() {
    if (autocompleteTimeout) {
        clearTimeout(autocompleteTimeout);
    }
    
    if (currentAutocompleteAbortController) {
        currentAutocompleteAbortController.abort();
    }
    
    const query = searchBar ? searchBar.value : '';
    
    if (!isValidSearchQuery(query)) {
        hideAutocompleteDropdown();
        return;
    }
    
    autocompleteTimeout = setTimeout(async () => {
        currentAutocompleteAbortController = new AbortController();
        
        try {
            const apiSuggestions = await getAutocompleteSuggestions(query);
            const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];
            const historySuggestions = history.slice(0, 5).filter(item => 
                item.toLowerCase().includes(query.toLowerCase())
            );
            
            showAutocompleteDropdown(apiSuggestions, historySuggestions, query);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Autocomplete error:", error);
            }
        }
    }, 300);
}

// Show autocomplete dropdown
function showAutocompleteDropdown(apiSuggestions, historySuggestions, query) {
    const container = document.getElementById('autocompleteContainer');
    if (!container) return;
    
    container.innerHTML = '';
    container.style.display = 'block';
    
    // API suggestions
    if (apiSuggestions.length > 0) {
        const apiSection = document.createElement('div');
        apiSection.className = 'autocomplete-section';
        
        apiSuggestions.slice(0, 5).forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `<span class="autocomplete-title">${highlightSearchTerm(suggestion.title, query)}</span> <span class="autocomplete-type">${suggestion.type}</span>`;
            item.onclick = () => {
                searchBar.value = suggestion.title;
                hideAutocompleteDropdown();
                searcher();
            };
            apiSection.appendChild(item);
        });
        
        container.appendChild(apiSection);
    }
    
    // History suggestions (if any and different from API)
    if (historySuggestions.length > 0) {
        const historySection = document.createElement('div');
        historySection.className = 'autocomplete-section autocomplete-history';
        const historyTitle = document.createElement('div');
        historyTitle.className = 'autocomplete-section-title';
        historyTitle.textContent = 'Recent searches';
        historySection.appendChild(historyTitle);
        
        historySuggestions.forEach(historyItem => {
            if (!apiSuggestions.some(s => s.title.toLowerCase() === historyItem.toLowerCase())) {
                const item = document.createElement('div');
                item.className = 'autocomplete-item autocomplete-history-item';
                item.innerHTML = `<span class="autocomplete-title">${highlightSearchTerm(historyItem, query)}</span>`;
                item.onclick = () => {
                    searchBar.value = historyItem;
                    hideAutocompleteDropdown();
                    searcher();
                };
                historySection.appendChild(item);
            }
        });
        
        if (historySection.children.length > 1) { // More than just the title
            container.appendChild(historySection);
        }
    }
}

// Hide autocomplete dropdown
function hideAutocompleteDropdown() {
    const container = document.getElementById('autocompleteContainer');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

// Render improved "No Results" UI
function renderNoResultsUI(searchTerm) {
    bodyDiv.innerHTML = '';
    
    const noResultsDiv = document.createElement('div');
    noResultsDiv.className = 'no-results-container';
    
    // Main message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'no-results-message';
    const title = document.createElement('h2');
    title.textContent = 'No results found';
    const subtitle = document.createElement('p');
    subtitle.textContent = `We couldn't find any media matching "${searchTerm}"`;
    messageDiv.appendChild(title);
    messageDiv.appendChild(subtitle);
    
    // Suggestions from history
    const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];
    const suggestions = history.filter(item => 
        item.toLowerCase() !== searchTerm.toLowerCase() && 
        item.toLowerCase().includes(searchTerm.toLowerCase().substring(0, 3))
    ).slice(0, 5);
    
    if (suggestions.length > 0) {
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'no-results-suggestions';
        const suggestionsTitle = document.createElement('h3');
        suggestionsTitle.textContent = 'Did you mean:';
        suggestionsDiv.appendChild(suggestionsTitle);
        
        const suggestionsList = document.createElement('div');
        suggestionsList.className = 'no-results-suggestions-list';
        suggestions.forEach(suggestion => {
            const suggestionItem = document.createElement('button');
            suggestionItem.className = 'no-results-suggestion-item';
            suggestionItem.textContent = suggestion;
            suggestionItem.onclick = () => {
                searchBar.value = suggestion;
                searcher();
            };
            suggestionsList.appendChild(suggestionItem);
        });
        suggestionsDiv.appendChild(suggestionsList);
        messageDiv.appendChild(suggestionsDiv);
    }
    
    // Tips
    const tipsDiv = document.createElement('div');
    tipsDiv.className = 'no-results-tips';
    const tipsTitle = document.createElement('h3');
    tipsTitle.textContent = 'Search tips:';
    tipsDiv.appendChild(tipsTitle);
    const tipsList = document.createElement('ul');
    tipsList.className = 'no-results-tips-list';
    const tips = [
        'Check your spelling',
        'Try different keywords',
        'Use the filters to narrow down results',
        'Search for partial titles'
    ];
    tips.forEach(tip => {
        const tipItem = document.createElement('li');
        tipItem.textContent = tip;
        tipsList.appendChild(tipItem);
    });
    tipsDiv.appendChild(tipsList);
    messageDiv.appendChild(tipsDiv);
    
    // Reset filters button (if filters are active)
    const typeFilter = document.getElementById('typeFilter');
    const sortSelect = document.getElementById('sortSelect');
    if ((typeFilter && typeFilter.value) || (sortSelect && sortSelect.value)) {
        const resetButton = document.createElement('button');
        resetButton.className = 'no-results-reset-button';
        resetButton.textContent = 'Reset Filters';
        resetButton.onclick = () => {
            if (typeFilter) typeFilter.value = '';
            if (sortSelect) sortSelect.value = '';
            searcher();
        };
        messageDiv.appendChild(resetButton);
    }
    
    noResultsDiv.appendChild(messageDiv);
    bodyDiv.appendChild(noResultsDiv);
}

// Enhanced error handling
function handleSearchError(error, searchTerm) {
    hideMessage();
    
    let errorMessage = 'An error occurred during the search';
    let errorDetails = '';
    let showRetry = false;
    
    if (error.name === 'AbortError') {
        // Search was aborted, don't show error
        return;
    } else if (error.message && error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error';
        errorDetails = 'Please check your internet connection and try again.';
        showRetry = true;
    } else if (error.message && error.message.includes('401') || error.message.includes('403')) {
        errorMessage = 'Authentication error';
        errorDetails = 'Your session may have expired. Please try logging in again.';
    } else if (error.message && error.message.includes('404')) {
        errorMessage = 'Server not found';
        errorDetails = 'The Plex server could not be reached. Please check your connection.';
        showRetry = true;
    } else if (error.message && error.message.includes('500')) {
        errorMessage = 'Server error';
        errorDetails = 'The Plex server encountered an error. Please try again later.';
        showRetry = true;
    } else {
        errorDetails = error.message || 'Unknown error occurred';
        showRetry = true;
    }
    
    // Render error UI
    bodyDiv.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'search-error-container';
    
    const errorTitle = document.createElement('h2');
    errorTitle.textContent = errorMessage;
    errorDiv.appendChild(errorTitle);
    
    if (errorDetails) {
        const errorText = document.createElement('p');
        errorText.textContent = errorDetails;
        errorDiv.appendChild(errorText);
    }
    
    if (showRetry) {
        const retryButton = document.createElement('button');
        retryButton.className = 'search-error-retry-button';
        retryButton.textContent = 'Retry Search';
        retryButton.onclick = () => searcher();
        errorDiv.appendChild(retryButton);
    }
    
    bodyDiv.appendChild(errorDiv);
    console.error("Search error:", error);
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

// Validation function for search queries
function isValidSearchQuery(query) {
    if (!query || query === null || query === undefined) return false;
    const trimmed = query.trim();
    return trimmed.length >= 2;
}

function addSearchToHistory(query) {
    if (!isValidSearchQuery(query)) return;
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
            localStorage.setItem('isFirstLoadAfterSelect', 'true');
            window.location.reload();
        })
        .catch(error => {
            showMessage("cannot connect");
            console.error("cannot connect: " + error)
        });
}


function searcher() {
    var search_string = document.getElementById("searchbar").value;
    
    // Only add to history if valid
    if (isValidSearchQuery(search_string)) {
    addSearchToHistory(search_string);
    }

    showMessage("started search. please wait!", true);
    bodyDiv.innerHTML = '';
    
    // Show filter bar
    const filterBar = document.getElementById('filterBar');
    if (filterBar) {
        filterBar.style.display = 'flex';
    }
    
    // get values from input fields
    console.log("search for '" + search_string + "' started")
    
    // Get filter and sort values
    const typeFilter = document.getElementById('typeFilter');
    const sortSelect = document.getElementById('sortSelect');
    
    const filters = {};
    if (typeFilter && typeFilter.value) {
        filters.type = typeFilter.value;
    }
    
    const sort = {};
    if (sortSelect && sortSelect.value) {
        const sortParts = sortSelect.value.split(':');
        if (sortParts.length === 2) {
            sort.field = sortParts[0];
            sort.order = sortParts[1];
        }
    }
    
    // Create new AbortController for this search
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;
    
    // Use advanced search if filters or sort are set, otherwise use basic search
    let searchPromise;
    if (Object.keys(filters).length > 0 || Object.keys(sort).length > 0) {
        // Use advanced search
        searchPromise = advancedSearch(search_string, filters, sort, {}).then(data => {
            if (!data) throw new Error("No data from advanced search");
            return data;
        });
    } else {
        // Use basic search (backward compatible)
        searchPromise = fetch(localStorage.getItem('selected_url') + "/search?query=" + encodeURIComponent(search_string) + "&X-Plex-Token=" + localStorage.getItem('selected_token'), {
            method: 'GET',
            signal: signal
        }).then(response => response.text());
    }
    
    searchPromise
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
                hideMessage();
                renderNoResultsUI(search_string);
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
                // Highlight search term in title
                mc_title_overlay.innerHTML = highlightSearchTerm(momObj['title'], search_string);
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
                
                // Add click handler to open Netflix-like detail view
                mc_image_area.style.cursor = 'pointer';
                mc_image_area.addEventListener('click', function() {
                    if (momObj['files'] && momObj['files'].length > 0) {
                        navigateToDetail(momObj['type'], momObj['files'][0]['key'], momObj);
                    }
                });

                // 2. Details Area (summary, full meta, actions)
                var mc_details_area = document.createElement('div');
                mc_details_area.className = 'mc-details-area';

                // 2a. Summary
                var mc_summary_div = document.createElement('div');
                mc_summary_div.className = 'mc-summary';
                var p_summary = document.createElement('p');
                var temp_summary = momObj['summary'] || "No summary available.";
                // Highlight search term in summary
                p_summary.innerHTML = highlightSearchTerm(temp_summary, search_string); 
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
            handleSearchError(error, search_string);
        })
}

// Netflix-like detail view functions
async function showMediaDetailView(mediaType, mediaKey, cachedData) {
    showMessage("Loading details...", true);
    
    try {
        const selectedUrl = localStorage.getItem('selected_url');
        const selectedToken = localStorage.getItem('selected_token');
        
        // Normalize mediaKey - the key from search results is already a full path like /library/metadata/207289
        // Extract just the ID if it contains /library/metadata/, otherwise use as-is
        let normalizedKey = mediaKey;
        const idMatch = normalizedKey.match(/\/library\/metadata\/(\d+)/);
        if (idMatch) {
            // Extract ID and rebuild path
            normalizedKey = '/library/metadata/' + idMatch[1];
        } else if (!normalizedKey.startsWith('/library/metadata/')) {
            // If it doesn't contain the path, add it (shouldn't happen, but just in case)
            normalizedKey = '/library/metadata/' + normalizedKey;
        }
        
        // Fetch full metadata from Plex API
        const metadataUrl = selectedUrl + normalizedKey + '?X-Plex-Token=' + selectedToken;
        const metadataResponse = await fetch(metadataUrl);
        if (!metadataResponse.ok) {
            throw new Error(`Failed to fetch metadata: ${metadataResponse.status} ${metadataResponse.statusText}`);
        }
        const metadataText = await metadataResponse.text();
        const parser = new DOMParser();
        const metadataXml = parser.parseFromString(metadataText, "text/xml");
        
        // Parse metadata
        const mediaElement = metadataXml.getElementsByTagName(mediaType === 'movie' ? 'Video' : 'Directory')[0];
        if (!mediaElement) {
            throw new Error('Media element not found in response');
        }
        
        const mediaData = {
            type: mediaType,
            key: normalizedKey,
            title: mediaElement.getAttribute('title') || cachedData?.title || 'Unknown',
            year: mediaElement.getAttribute('year') || cachedData?.year || '',
            summary: mediaElement.getAttribute('summary') || cachedData?.summary || 'No summary available.',
            thumb: mediaElement.getAttribute('thumb') || cachedData?.thumb || '',
            art: mediaElement.getAttribute('art') || cachedData?.art || '',
            audienceRating: mediaElement.getAttribute('audienceRating') || cachedData?.audienceRating || '',
            duration: mediaElement.getAttribute('duration') ? parseInt(mediaElement.getAttribute('duration')) : (cachedData?.duration ? cachedData.duration * 60 * 1000 : null),
            genres: []
        };
        
        // Parse genres
        const genreElements = mediaElement.getElementsByTagName('Genre');
        for (let i = 0; i < genreElements.length; i++) {
            mediaData.genres.push(genreElements[i].getAttribute('tag'));
        }
        if (mediaData.genres.length === 0 && cachedData?.genres) {
            mediaData.genres = cachedData.genres;
        }
        
        // For shows, fetch seasons
        let seasons = [];
        if (mediaType === 'show') {
            const seasonsUrl = selectedUrl + normalizedKey + '/children?X-Plex-Token=' + selectedToken;
            const seasonsResponse = await fetch(seasonsUrl);
            if (!seasonsResponse.ok) {
                console.warn(`Failed to fetch seasons: ${seasonsResponse.status} ${seasonsResponse.statusText}`);
            } else {
                const seasonsText = await seasonsResponse.text();
                const seasonsXml = parser.parseFromString(seasonsText, "text/xml");
                const seasonElements = seasonsXml.getElementsByTagName('Directory');
                
                for (let i = 0; i < seasonElements.length; i++) {
                    const seasonElement = seasonElements[i];
                    if (seasonElement.getAttribute('type') === 'season') {
                        seasons.push({
                            title: seasonElement.getAttribute('title') || 'Unknown Season',
                            key: seasonElement.getAttribute('key') || '',
                            thumb: seasonElement.getAttribute('thumb') || '',
                            index: seasonElement.getAttribute('index') || '',
                            year: seasonElement.getAttribute('year') || ''
                        });
                    }
                }
            }
        }
        
        // Get download key for actions
        let downloadKey = normalizedKey;
        if (cachedData && cachedData.files && cachedData.files.length > 0) {
            downloadKey = cachedData.files[0].key;
        }
        
        hideMessage();
        renderDetailPage(mediaData, seasons, downloadKey);
    } catch (error) {
        hideMessage();
        showMessage("Failed to load media details: " + error.message, false);
        console.error("Error loading media details:", error);
    }
}

async function renderDetailPage(mediaData, seasons, downloadKey) {
    const selectedUrl = localStorage.getItem('selected_url');
    const selectedToken = localStorage.getItem('selected_token');
    
    // Build background image URL
    const backgroundImageUrl = mediaData.art 
        ? selectedUrl + mediaData.art + '?X-Plex-Token=' + selectedToken
        : '';
    
    // Build thumbnail URL
    const thumbUrl = mediaData.thumb 
        ? selectedUrl + mediaData.thumb + '?X-Plex-Token=' + selectedToken
        : '';
    
    // Format duration
    let durationText = '';
    if (mediaData.duration) {
        const hours = Math.floor(mediaData.duration / 1000 / 60 / 60);
        const minutes = Math.floor((mediaData.duration / 1000 / 60) % 60);
        if (hours > 0) {
            durationText = hours + 'h ' + minutes + 'min';
        } else {
            durationText = minutes + 'min';
        }
    }
    
    // Build meta info
    let metaInfo = [];
    if (mediaData.year) metaInfo.push(mediaData.year);
    if (mediaData.genres && mediaData.genres.length > 0) metaInfo.push(mediaData.genres.join(', '));
    if (durationText) metaInfo.push(durationText);
    
    // Escape HTML for title
    const escapedTitle = String(mediaData.title).replace(/'/g, "\\'").replace(/"/g, "\\\"");
    const rawTitle = mediaData.title;
    
    // Build action buttons HTML
    let actionButtonsHtml = '';
    if (mediaData.type === 'movie') {
        // For movies, fetch download URLs to show all actions
        try {
            const movieResponse = await fetch(selectedUrl + downloadKey + '?X-Plex-Token=' + selectedToken);
            const movieText = await movieResponse.text();
            const parser = new DOMParser();
            const movieXml = parser.parseFromString(movieText, "text/xml");
            const partElements = movieXml.getElementsByTagName("Part");
            
            if (partElements.length > 0) {
                const elementFile = encodeURI(/[^/]*$/.exec(partElements[0].getAttribute("file"))[0]);
                const elementKey = /^(.*[\/])/.exec(partElements[0].getAttribute("key"))[1];
                const baseUrl = selectedUrl + elementKey + elementFile;
                const tokenSuffix = "?X-Plex-Token=" + selectedToken;
                const playOrJdUrl = baseUrl + tokenSuffix;
                const directDlUrl = baseUrl + "?download=1" + tokenSuffix.replace("?", "&");
                const container = partElements[0].getAttribute('container') || '';
                
                actionButtonsHtml = `
                    <button class="detail-action-button" onclick="directDownloadMovie('${directDlUrl}', '${rawTitle}', '${container}'); event.stopPropagation();" title="Download '${escapedTitle}'">
                        <img src="icons/download.svg" alt="Download" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">
                        Download
                    </button>
                    <a href="http://127.0.0.1:9666/flash/add?urls=${encodeURIComponent(playOrJdUrl)}" class="detail-action-button" target="_blank" title="Send to JDownloader" style="text-decoration: none; display: inline-flex; align-items: center;">
                        <img src="icons/jdownloader.svg" alt="JDownloader" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">
                        JDownloader
                    </a>
                    <button class="detail-action-button" onclick="playMovieInline('${playOrJdUrl}', '${escapedTitle}');" title="Play '${escapedTitle}'">
                        <img src="icons/tv.svg" alt="Play" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">
                        Play
                    </button>
                    <button class="detail-action-button" onclick="openInVLC('${playOrJdUrl}'); event.stopPropagation();" title="Open in VLC">
                        <img src="icons/vlc.svg" alt="VLC" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">
                        VLC
                    </button>
                    <button class="detail-action-button" onclick="copyMovieLink('${directDlUrl}', '${escapedTitle}'); event.stopPropagation();" title="Copy Link">
                        <img src="icons/link.svg" alt="Copy Link" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">
                        Copy Link
                    </button>
                    <button class="detail-action-button" onclick="createMovieM3U('${playOrJdUrl}', '${rawTitle}'); event.stopPropagation();" title="Create M3U">
                        <img src="icons/playlist.svg" alt="M3U" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">
                        M3U
                    </button>
                `;
            } else {
                // Fallback if no Part elements found
                actionButtonsHtml = `
                    <button class="detail-action-button" onclick="downloadMovie('${downloadKey}', '${escapedTitle}');" title="View Options">
                        <img src="icons/download.svg" alt="Download" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">
                        View Options
                    </button>
                `;
            }
        } catch (error) {
            console.error("Error fetching movie URLs:", error);
            // Fallback button
            actionButtonsHtml = `
                <button class="detail-action-button" onclick="downloadMovie('${downloadKey}', '${escapedTitle}');" title="View Options">
                    <img src="icons/download.svg" alt="Download" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">
                    View Options
                </button>
            `;
        }
    } else if (mediaData.type === 'show') {
        actionButtonsHtml = `
            <button class="detail-action-button" onclick="downloadShow('${downloadKey}');" title="View Seasons">
                <img src="icons/tv.svg" alt="View Seasons" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">
                View Seasons
            </button>
        `;
    }
    
    // Build seasons HTML with accordion
    let seasonsHtml = '';
    if (mediaData.type === 'show' && seasons.length > 0) {
        seasonsHtml = `
            <div class="detail-seasons">
                <h2 class="detail-seasons-title">Staffeln</h2>
                <div class="season-accordion">
                    ${seasons.map(season => renderSeasonAccordion(season)).join('')}
                </div>
            </div>
        `;
    }
    
    // Build rating HTML
    let ratingHtml = '';
    if (mediaData.audienceRating) {
        const rating = parseFloat(mediaData.audienceRating);
        let ratingClass = 'rating-bad';
        if (rating > 7.9) ratingClass = 'rating-good';
        else if (rating > 5.9) ratingClass = 'rating-okay';
        else if (rating > 4.9) ratingClass = 'rating-bad';
        else ratingClass = 'rating-worst';
        
        ratingHtml = `<div class="detail-rating ${ratingClass}">⭐ ${mediaData.audienceRating}</div>`;
    }
    
    // Create detail page HTML
    const detailPageHtml = `
        <div class="detail-page">
            <div class="detail-background" style="background-image: url('${backgroundImageUrl}');"></div>
            <div class="detail-content">
                <button class="detail-back-button" onclick="navigateToSearch()" title="Zurück zur Suche">← Zurück</button>
                <div class="detail-header">
                    <h1 class="detail-title">${escapeHtml(mediaData.title)}</h1>
                    ${ratingHtml}
                </div>
                <div class="detail-meta">
                    ${metaInfo.join(' • ')}
                </div>
                <p class="detail-summary">${escapeHtml(mediaData.summary)}</p>
                <div class="detail-actions">
                    ${actionButtonsHtml}
                </div>
                ${seasonsHtml}
            </div>
        </div>
    `;
    
    // Render detail page in its own container (full page, outside main layout)
    if (detailPageContainer) {
        detailPageContainer.innerHTML = detailPageHtml;
        detailPageContainer.style.display = 'block';
        
        // Hide sidebar and main content
        if (sidebar) sidebar.style.display = 'none';
        if (mainContent) mainContent.style.display = 'none';
        
        // Hide body scrollbar and make detail page full viewport
        document.body.style.overflow = 'hidden';
    }
}

// Load episodes for a season from Plex API
async function loadSeasonEpisodes(seasonKey) {
    try {
        const selectedUrl = localStorage.getItem('selected_url');
        const selectedToken = localStorage.getItem('selected_token');
        const episodesUrl = selectedUrl + seasonKey + '?X-Plex-Token=' + selectedToken;
        const response = await fetch(episodesUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch episodes: ${response.status}`);
        }
        
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        const episodeElements = xml.getElementsByTagName('Video');
        
        const episodes = [];
        for (let i = 0; i < episodeElements.length; i++) {
            const episodeElement = episodeElements[i];
            if (episodeElement.getAttribute('type') === 'episode') {
                episodes.push({
                    title: episodeElement.getAttribute('title') || 'Unknown Episode',
                    key: episodeElement.getAttribute('key') || '',
                    thumb: episodeElement.getAttribute('thumb') || '',
                    index: episodeElement.getAttribute('index') || '',
                    summary: episodeElement.getAttribute('summary') || '',
                    duration: episodeElement.getAttribute('duration') ? parseInt(episodeElement.getAttribute('duration')) : null
                });
            }
        }
        
        return episodes;
    } catch (error) {
        console.error("Error loading season episodes:", error);
        return [];
    }
}

// Render episode card with preview image, title, watched icon, and action buttons
function renderEpisodeCard(episodeData) {
    const selectedUrl = localStorage.getItem('selected_url');
    const selectedToken = localStorage.getItem('selected_token');
    const thumbUrl = episodeData.thumb 
        ? selectedUrl + episodeData.thumb + '?X-Plex-Token=' + selectedToken
        : '';
    
    const watched = isWatched(episodeData.key);
    const watchedClass = watched ? 'watched' : '';
    
    // Format duration
    let durationText = '';
    if (episodeData.duration) {
        const minutes = Math.floor(episodeData.duration / 1000 / 60);
        durationText = minutes + ' min';
    }
    
    return `
        <div class="episode-card" data-media-key="${episodeData.key}">
            <div class="watched-icon ${watchedClass}" data-media-key="${episodeData.key}"></div>
            <img src="${thumbUrl}" alt="${escapeHtml(episodeData.title)}" class="episode-preview-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'120\\'%3E%3Crect fill=\\'%23333\\' width=\\'200\\' height=\\'120\\'/%3E%3Ctext fill=\\'%23999\\' font-family=\\'Arial\\' font-size=\\'12\\' x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\'%3ENo Preview%3C/text%3E%3C/svg%3E';">
            <div class="episode-card-info">
                <div class="episode-card-title">${escapeHtml(episodeData.title)}</div>
                <div class="episode-card-meta">
                    ${episodeData.index ? `<span>E${episodeData.index}</span>` : ''}
                    ${durationText ? `<span>• ${durationText}</span>` : ''}
                </div>
                <div class="episode-actions-inline">
                    <button class="episode-action-button" onclick="toggleWatchedStatus('${episodeData.key}'); event.stopPropagation();" title="Toggle Watched Status">
                        ${watched ? '✓ Watched' : 'Mark Watched'}
                    </button>
                    <button class="episode-action-button" onclick="playEpisodeInline('${episodeData.key}', '${escapeHtml(episodeData.title).replace(/'/g, "\\'")}'); event.stopPropagation();" title="Play Episode">
                        <img src="icons/tv.svg" alt="Play"> Play
                    </button>
                    <button class="episode-action-button" onclick="showEpisodeActionsInline('${episodeData.key}'); event.stopPropagation();" title="More Actions">
                        <img src="icons/download.svg" alt="Actions"> Actions
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Render season accordion item
function renderSeasonAccordion(seasonData, episodes = null) {
    const selectedUrl = localStorage.getItem('selected_url');
    const selectedToken = localStorage.getItem('selected_token');
    const thumbUrl = seasonData.thumb 
        ? selectedUrl + seasonData.thumb + '?X-Plex-Token=' + selectedToken
        : '';
    
    const episodeCount = episodes ? episodes.length : '?';
    const episodesHtml = episodes 
        ? `<div class="episodes-grid">${episodes.map(ep => renderEpisodeCard(ep)).join('')}</div>`
        : '<div class="episodes-loading">Loading episodes...</div>';
    
    return `
        <div class="season-accordion-item" data-season-key="${seasonData.key}">
            <div class="season-accordion-header" onclick="toggleSeasonAccordion('${seasonData.key}');">
                <img src="${thumbUrl}" alt="${escapeHtml(seasonData.title)}" class="season-accordion-preview" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'120\\' height=\\'180\\'%3E%3Crect fill=\\'%23333\\' width=\\'120\\' height=\\'180\\'/%3E%3Ctext fill=\\'%23999\\' font-family=\\'Arial\\' font-size=\\'12\\' x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\'%3ENo Cover%3C/text%3E%3C/svg%3E';">
                <div class="season-accordion-header-info">
                    <h3 class="season-accordion-title">${escapeHtml(seasonData.title)}</h3>
                    <div class="season-accordion-meta">
                        ${episodeCount !== '?' ? `<span>${episodeCount} Episodes</span>` : ''}
                        ${seasonData.year ? `<span>• ${seasonData.year}</span>` : ''}
                    </div>
                </div>
                <div class="season-accordion-toggle">▼</div>
            </div>
            <div class="season-accordion-content">
                ${episodesHtml}
            </div>
        </div>
    `;
}

// Toggle season accordion (only one open at a time)
async function toggleSeasonAccordion(seasonKey) {
    const accordionItem = document.querySelector(`.season-accordion-item[data-season-key="${seasonKey}"]`);
    if (!accordionItem) return;
    
    const isActive = accordionItem.classList.contains('active');
    const content = accordionItem.querySelector('.season-accordion-content');
    
    // Close all other accordion items
    document.querySelectorAll('.season-accordion-item').forEach(item => {
        if (item !== accordionItem) {
            item.classList.remove('active');
        }
    });
    
    if (isActive) {
        // Close this accordion
        accordionItem.classList.remove('active');
    } else {
        // Open this accordion
        accordionItem.classList.add('active');
        
        // Load episodes if not already loaded
        const existingEpisodes = content.querySelector('.episodes-grid');
        if (!existingEpisodes) {
            showMessage("Loading episodes...", true);
            const episodes = await loadSeasonEpisodes(seasonKey);
            hideMessage();
            
            if (episodes.length > 0) {
                content.innerHTML = `<div class="episodes-grid">${episodes.map(ep => renderEpisodeCard(ep)).join('')}</div>`;
            } else {
                content.innerHTML = '<div class="episodes-loading">No episodes found.</div>';
            }
        }
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Session Storage functions for "Watched" status
function getWatchedItems() {
    try {
        const stored = sessionStorage.getItem(WATCHED_ITEMS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error("Error reading watched items from sessionStorage:", error);
        return {};
    }
}

function markAsWatched(mediaKey) {
    try {
        const watchedItems = getWatchedItems();
        watchedItems[mediaKey] = true;
        sessionStorage.setItem(WATCHED_ITEMS_KEY, JSON.stringify(watchedItems));
        return true;
    } catch (error) {
        console.error("Error marking item as watched:", error);
        return false;
    }
}

function markAsUnwatched(mediaKey) {
    try {
        const watchedItems = getWatchedItems();
        delete watchedItems[mediaKey];
        sessionStorage.setItem(WATCHED_ITEMS_KEY, JSON.stringify(watchedItems));
        return true;
    } catch (error) {
        console.error("Error marking item as unwatched:", error);
        return false;
    }
}

function isWatched(mediaKey) {
    const watchedItems = getWatchedItems();
    return watchedItems[mediaKey] === true;
}

function toggleWatchedStatus(mediaKey) {
    if (isWatched(mediaKey)) {
        markAsUnwatched(mediaKey);
        updateWatchedIconInUI(mediaKey);
        return false;
    } else {
        markAsWatched(mediaKey);
        updateWatchedIconInUI(mediaKey);
        return true;
    }
}

// Update watched icon in UI
function updateWatchedIconInUI(mediaKey) {
    // Find all elements with data-media-key attribute matching this key
    const elements = document.querySelectorAll(`[data-media-key="${mediaKey}"]`);
    elements.forEach(element => {
        const watchedIcon = element.querySelector('.watched-icon');
        if (watchedIcon) {
            if (isWatched(mediaKey)) {
                watchedIcon.style.display = 'block';
                watchedIcon.classList.add('watched');
            } else {
                watchedIcon.style.display = 'none';
                watchedIcon.classList.remove('watched');
            }
        }
    });
}

// URL Routing and Navigation Functions
function navigateToDetail(mediaType, mediaKey, cachedData) {
    // Save current search state
    saveSearchState();
    
    // Extract media ID from key
    const idMatch = mediaKey.match(/\/library\/metadata\/(\d+)/);
    const mediaId = idMatch ? idMatch[1] : mediaKey.replace(/[^0-9]/g, '');
    
    // Update URL with History API
    const newUrl = `#/detail/${mediaType}/${mediaId}`;
    history.pushState({ 
        view: 'detail', 
        type: mediaType, 
        id: mediaId, 
        key: mediaKey,
        cachedData: cachedData 
    }, '', newUrl);
    
    // Update state
    currentView = 'detail';
    currentMediaData = { type: mediaType, key: mediaKey, cachedData: cachedData };
    
    // Load and render detail page
    showMediaDetailView(mediaType, mediaKey, cachedData);
}

function navigateToSearch() {
    // Update URL with History API
    history.pushState({ view: 'search' }, '', '#/search');
    
    // Update state
    currentView = 'search';
    
    // Hide detail page container
    if (detailPageContainer) {
        detailPageContainer.style.display = 'none';
        detailPageContainer.innerHTML = '';
    }
    
    // Show sidebar and main content
    if (sidebar) sidebar.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'flex';
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Restore search results if available
    restoreSearchState();
}

function handlePopState(event) {
    if (event.state) {
        if (event.state.view === 'detail') {
            // Restore detail view
            currentView = 'detail';
            if (event.state.key && event.state.cachedData) {
                showMediaDetailView(event.state.type, event.state.key, event.state.cachedData);
            } else {
                // Need to reload from API
                const mediaKey = event.state.key || `/library/metadata/${event.state.id}`;
                showMediaDetailView(event.state.type, mediaKey, null);
            }
        } else if (event.state.view === 'search') {
            // Restore search view
            navigateToSearch(); // Use navigateToSearch to properly show/hide elements
        }
    } else {
        // No state, default to search
        navigateToSearch(); // Use navigateToSearch to properly show/hide elements
    }
}

function saveSearchState() {
    // Save current search results HTML and search term
    if (bodyDiv && currentView === 'search') {
        previousSearchResults = {
            html: bodyDiv.innerHTML,
            searchTerm: searchBar ? searchBar.value : ''
        };
    }
}

function restoreSearchState() {
    // Restore search results using SearchController
    if (window.searchController) {
        window.searchController.restoreResults();
    } else {
        // Fallback: clear body if no controller
        if (bodyDiv) {
            bodyDiv.innerHTML = '';
        }
    }
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

/**
 * Modifies a Plex streaming URL to force audio transcoding from AC3 to AAC
 * This ensures browser compatibility since AC3 is often not supported
 * @param {string} url - Original Plex streaming URL
 * @returns {string} Modified URL with transcoding parameters
 */
function forceAudioTranscoding(url) {
    if (!url) return url;
    
    // Parse URL to add/update parameters
    const urlObj = new URL(url);
    
    // Force audio transcoding to AAC (browser-compatible)
    urlObj.searchParams.set('audioCodec', 'aac');
    
    // Set audio bitrate (192k is a good balance)
    urlObj.searchParams.set('maxAudioBitrate', '192');
    
    // Force video codec to h264 for better browser compatibility
    urlObj.searchParams.set('videoCodec', 'h264');
    
    // Set video bitrate (8M is a good quality for web playback)
    urlObj.searchParams.set('maxVideoBitrate', '8000');
    
    // Ensure container is mp4 for browser compatibility
    urlObj.searchParams.set('container', 'mp4');
    
    // Add session parameter if not present (required for transcoding)
    if (!urlObj.searchParams.has('session')) {
        // Generate a simple session ID (Plex will handle this, but we can add a placeholder)
        urlObj.searchParams.set('session', 'webplayer');
    }
    
    return urlObj.toString();
}

/**
 * Client-side transcoder using FFmpeg.wasm
 * Transcodes AC3 audio to AAC for browser compatibility
 * @param {string} videoUrl - URL of the video to transcode
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>} Transcoded video blob
 */
let ffmpegInstance = null;
let ffmpegLoaded = false;

async function loadFFmpeg() {
    if (ffmpegLoaded && ffmpegInstance) {
        return ffmpegInstance;
    }
    
    try {
        if (typeof FFmpeg === 'undefined') {
            console.warn('FFmpeg.wasm not loaded. Falling back to server-side transcoding.');
            return null;
        }
        
        const { FFmpeg } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
        const { fetchFile, toBlobURL } = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');
        
        ffmpegInstance = new FFmpeg();
        
        // Load FFmpeg core
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpegInstance.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        
        ffmpegLoaded = true;
        console.log('FFmpeg.wasm loaded successfully');
        return ffmpegInstance;
    } catch (error) {
        console.error('Failed to load FFmpeg.wasm:', error);
        return null;
    }
}

/**
 * Transcode video using client-side FFmpeg (fallback if server transcoding fails)
 * Note: This is resource-intensive and may not work well for large files
 * @param {string} videoUrl - URL of the video
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<string>} Blob URL of transcoded video
 */
async function transcodeVideoClientSide(videoUrl, progressCallback = null) {
    try {
        const ffmpeg = await loadFFmpeg();
        if (!ffmpeg) {
            throw new Error('FFmpeg.wasm not available');
        }
        
        showMessage('Transcoding video in browser... This may take a while.', true);
        
        // Set up progress handler
        if (progressCallback) {
            ffmpeg.on('progress', ({ progress }) => {
                if (progressCallback) {
                    progressCallback(Math.round(progress * 100));
                }
            });
        }
        
        // Fetch the video
        const response = await fetch(videoUrl);
        const videoBlob = await response.blob();
        const videoArrayBuffer = await videoBlob.arrayBuffer();
        
        // Write input file
        await ffmpeg.writeFile('input.mp4', new Uint8Array(videoArrayBuffer));
        
        // Transcode: AC3 to AAC, keep video as-is
        await ffmpeg.exec([
            '-i', 'input.mp4',
            '-c:v', 'copy',  // Copy video stream (no re-encoding)
            '-c:a', 'aac',   // Transcode audio to AAC
            '-b:a', '192k',  // Audio bitrate
            '-strict', 'experimental',
            'output.mp4'
        ]);
        
        // Read output
        const data = await ffmpeg.readFile('output.mp4');
        
        // Clean up
        await ffmpeg.deleteFile('input.mp4');
        await ffmpeg.deleteFile('output.mp4');
        
        // Create blob URL
        const outputBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const blobUrl = URL.createObjectURL(outputBlob);
        
        hideMessage();
        return blobUrl;
    } catch (error) {
        console.error('Client-side transcoding failed:', error);
        hideMessage();
        throw error;
    }
}

/**
 * Try server-side transcoding first, fallback to client-side if needed
 * @param {string} originalUrl - Original video URL
 * @param {boolean} preferClientSide - If true, try client-side first
 * @returns {Promise<string>} URL to use for video playback
 */
async function getTranscodedVideoUrl(originalUrl, preferClientSide = false) {
    if (preferClientSide) {
        try {
            // Try client-side transcoding first
            const blobUrl = await transcodeVideoClientSide(originalUrl, (progress) => {
                showMessage(`Transcoding: ${progress}%`, true);
            });
            return blobUrl;
        } catch (error) {
            console.warn('Client-side transcoding failed, falling back to server-side:', error);
            // Fallback to server-side
            return forceAudioTranscoding(originalUrl);
        }
    } else {
        // Try server-side first (default)
        const serverTranscodedUrl = forceAudioTranscoding(originalUrl);
        
        // Test if server transcoding works by trying to load the video
        // If it fails, we could fallback to client-side, but that's complex
        // For now, just return server-transcoded URL
        return serverTranscodedUrl;
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
        videoPlayerContainer.innerHTML = ''; // Vorherigen Inhalt leeren

        const videoElement = document.createElement('video');
        videoElement.setAttribute('controls', 'true');
        videoElement.setAttribute('autoplay', 'true'); 
        videoElement.style.width = '100%'; 
        videoElement.style.height = 'auto';
        videoElement.style.maxHeight = 'calc(100vh - 150px)'; 

        const sourceElement = document.createElement('source');
        // Try to get transcoded URL (server-side transcoding preferred by default)
        // Set preferClientSide = true to use client-side FFmpeg.wasm transcoding
        // Note: Client-side transcoding is resource-intensive and may be slow
        const transcodedUrl = await getTranscodedVideoUrl(movieUrl, false);
        sourceElement.setAttribute('src', transcodedUrl);
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

        // Mark as watched when video starts playing
        videoElement.addEventListener('play', () => {
            // Try to get mediaKey from currentMediaData if available
            if (currentMediaData && currentMediaData.key) {
                markAsWatched(currentMediaData.key);
                // Update UI if detail view is open
                updateWatchedIconInUI(currentMediaData.key);
            }
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
        // Try to get transcoded URL (server-side transcoding preferred)
        // Client-side transcoding can be enabled by setting preferClientSide = true
        const transcodedUrl = await getTranscodedVideoUrl(streamingUrl, false);
        sourceElement.setAttribute('src', transcodedUrl);
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

        // Mark as watched when video starts playing
        videoElement.addEventListener('play', () => {
            markAsWatched(episodeKey);
            // Update UI if detail view is open
            updateWatchedIconInUI(episodeKey);
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

// ============================================================================
// NEW SEARCH ARCHITECTURE - Modular Classes
// ============================================================================

/**
 * SearchState - Manages search state, history, and persistence
 */
class SearchState {
    constructor() {
        this.currentQuery = '';
        this.currentFilters = {};
        this.currentSort = {};
        this.currentPage = { limit: 50, offset: 0 };
        this.lastResults = null;
        this.historyKey = SEARCH_HISTORY_KEY;
        this.maxHistoryItems = MAX_HISTORY_ITEMS;
    }

    /**
     * Save query to search history
     * @param {string} query - Search query to save
     */
    saveToHistory(query) {
        if (!this.isValidQuery(query)) return;
        
        let history = this.getHistory();
        // Remove if already exists
        history = history.filter(item => item.toLowerCase() !== query.toLowerCase());
        // Add to beginning
        history.unshift(query);
        // Limit to max items
        history = history.slice(0, this.maxHistoryItems);
        
        try {
            localStorage.setItem(this.historyKey, JSON.stringify(history));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    }

    /**
     * Get search history from localStorage
     * @returns {string[]} Array of search queries
     */
    getHistory() {
        try {
            const history = localStorage.getItem(this.historyKey);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Error reading search history:', error);
            return [];
        }
    }

    /**
     * Remove query from history
     * @param {string} query - Query to remove
     */
    removeFromHistory(query) {
        let history = this.getHistory();
        history = history.filter(item => item.toLowerCase() !== query.toLowerCase());
        
        try {
            localStorage.setItem(this.historyKey, JSON.stringify(history));
        } catch (error) {
            console.error('Error removing from search history:', error);
        }
    }

    /**
     * Save current search results for back navigation
     * @param {Array} results - Search results to save
     * @param {string} query - Search query
     */
    saveResults(results, query) {
        this.lastResults = {
            results: results,
            query: query,
            filters: { ...this.currentFilters },
            sort: { ...this.currentSort }
        };
    }

    /**
     * Restore last search results
     * @returns {Object|null} Saved results or null
     */
    restoreResults() {
        return this.lastResults;
    }

    /**
     * Clear saved results
     */
    clearResults() {
        this.lastResults = null;
    }

    /**
     * Validate search query
     * @param {string} query - Query to validate
     * @returns {boolean} True if valid
     */
    isValidQuery(query) {
        return query && typeof query === 'string' && query.trim().length > 0;
    }

    /**
     * Update current state
     * @param {string} query - Current query
     * @param {Object} filters - Current filters
     * @param {Object} sort - Current sort
     */
    updateState(query, filters = {}, sort = {}) {
        this.currentQuery = query || '';
        this.currentFilters = filters;
        this.currentSort = sort;
    }
}

/**
 * SearchDataParser - Parses XML responses from Plex API
 */
class SearchDataParser {
    /**
     * Parse search results XML into structured objects
     * @param {string} xmlText - XML response from Plex API
     * @returns {Array} Array of normalized media items
     */
    parseSearchResults(xmlText) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, "text/xml");
        
        const results = [];
        const resultDict = {};
        
        // Parse movies (Video elements)
        const movies = xml.getElementsByTagName("Video");
        for (let i = 0; i < movies.length; i++) {
            const movie = movies[i];
            const guid = movie.getAttribute('guid');
            if (!guid) continue;
            
            if (!resultDict[guid]) {
                resultDict[guid] = this.normalizeMediaItem(movie, 'movie');
            }
            
            // Add file/library info
            const library = movie.getAttribute('librarySectionTitle');
            const key = movie.getAttribute('key');
            if (library && key) {
                if (!resultDict[guid].files) {
                    resultDict[guid].files = [];
                }
                resultDict[guid].files.push({ library, key });
            }
        }
        
        // Parse shows (Directory elements)
        const shows = xml.getElementsByTagName("Directory");
        for (let i = 0; i < shows.length; i++) {
            const show = shows[i];
            const guid = show.getAttribute('guid');
            if (!guid) continue;
            
            if (!resultDict[guid]) {
                resultDict[guid] = this.normalizeMediaItem(show, 'show');
            }
            
            // Add file/library info
            const library = show.getAttribute('librarySectionTitle');
            const key = show.getAttribute('key');
            if (library && key) {
                if (!resultDict[guid].files) {
                    resultDict[guid].files = [];
                }
                resultDict[guid].files.push({ library, key });
            }
        }
        
        // Convert dict to array
        return Object.values(resultDict);
    }

    /**
     * Normalize a media item (movie or show) to unified structure
     * @param {Element} element - XML element (Video or Directory)
     * @param {string} type - 'movie' or 'show'
     * @returns {Object} Normalized media item
     */
    normalizeMediaItem(element, type) {
        const item = {
            title: element.getAttribute('title') || '',
            type: type,
            year: element.getAttribute('year') || null,
            summary: element.getAttribute('summary') || '',
            duration: element.getAttribute('duration') ? Math.round(parseInt(element.getAttribute('duration')) / 1000 / 60) : null,
            audienceRating: element.getAttribute('audienceRating') || null,
            thumb: element.getAttribute('thumb') || '',
            art: element.getAttribute('art') || '',
            genres: [],
            files: []
        };

        // Parse genres
        const genres = element.getElementsByTagName("Genre");
        for (let i = 0; i < genres.length; i++) {
            const genreTag = genres[i].getAttribute('tag');
            if (genreTag) {
                item.genres.push(genreTag);
            }
        }

        return item;
    }

    /**
     * Parse autocomplete suggestions from XML
     * @param {string} xmlText - XML response from Plex API
     * @returns {Array} Array of suggestion objects
     */
    parseAutocomplete(xmlText) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, "text/xml");
        
        const suggestions = [];
        
        // Parse Directory elements (shows)
        const directories = xml.getElementsByTagName("Directory");
        for (let i = 0; i < directories.length; i++) {
            const dir = directories[i];
            const title = dir.getAttribute('title');
            if (title) {
                suggestions.push({
                    title: title,
                    type: dir.getAttribute('type') || 'show',
                    key: dir.getAttribute('key')
                });
            }
        }
        
        // Parse Video elements (movies)
        const videos = xml.getElementsByTagName("Video");
        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            const title = video.getAttribute('title');
            if (title) {
                suggestions.push({
                    title: title,
                    type: video.getAttribute('type') || 'movie',
                    key: video.getAttribute('key')
                });
            }
        }
        
        return suggestions;
    }

    /**
     * Parse filters from XML
     * @param {string} xmlText - XML response from Plex API
     * @returns {Array} Array of filter objects
     */
    parseFilters(xmlText) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, "text/xml");
        
        const filters = [];
        const filterElements = xml.getElementsByTagName("Filter");
        
        for (let i = 0; i < filterElements.length; i++) {
            const filter = filterElements[i];
            filters.push({
                key: filter.getAttribute('key'),
                title: filter.getAttribute('title'),
                type: filter.getAttribute('type'),
                filterType: filter.getAttribute('filterType')
            });
        }
        
        return filters;
    }

    /**
     * Parse sorts from XML
     * @param {string} xmlText - XML response from Plex API
     * @returns {Array} Array of sort objects
     */
    parseSorts(xmlText) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, "text/xml");
        
        const sorts = [];
        const sortElements = xml.getElementsByTagName("Sort");
        
        for (let i = 0; i < sortElements.length; i++) {
            const sort = sortElements[i];
            sorts.push({
                key: sort.getAttribute('key'),
                title: sort.getAttribute('title'),
                defaultDirection: sort.getAttribute('defaultDirection') || 'asc'
            });
        }
        
        return sorts;
    }
}

/**
 * SearchAPI - Handles all Plex API calls for search functionality
 */
class SearchAPI {
    constructor() {
        this.parser = new SearchDataParser();
        this.currentAbortController = null;
        this.currentAutocompleteAbortController = null;
    }

    /**
     * Get base URL and token from localStorage
     * @returns {Object} {url, token} or null
     */
    getAuth() {
        const url = localStorage.getItem('selected_url');
        const token = localStorage.getItem('selected_token');
        if (!url || !token) return null;
        return { url, token };
    }

    /**
     * Perform search with filters, sort, and pagination
     * @param {string} query - Search query
     * @param {Object} options - Search options (filters, sort, pagination)
     * @param {AbortSignal} signal - AbortSignal for cancellation
     * @returns {Promise<Array>} Array of normalized media items
     */
    async search(query, options = {}, signal = null) {
        const auth = this.getAuth();
        if (!auth) {
            throw new Error('No authentication available');
        }

        // Cancel previous request
        if (this.currentAbortController) {
            this.currentAbortController.abort();
        }
        this.currentAbortController = new AbortController();
        const abortSignal = signal || this.currentAbortController.signal;

        try {
            const params = new URLSearchParams({
                query: query || '',
                'X-Plex-Token': auth.token
            });

            // Add filters
            if (options.filters) {
                Object.entries(options.filters).forEach(([key, value]) => {
                    if (value) {
                        params.append('filter', `${key}=${value}`);
                    }
                });
            }

            // Add sort
            if (options.sort && options.sort.field) {
                params.append('sort', options.sort.field);
                params.append('order', options.sort.order || 'asc');
            }

            // Add pagination
            if (options.pagination) {
                if (options.pagination.limit) {
                    params.append('limit', options.pagination.limit);
                }
                if (options.pagination.offset) {
                    params.append('offset', options.pagination.offset);
                }
            }

            const response = await fetch(`${auth.url}/search?${params.toString()}`, {
                signal: abortSignal
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status} ${response.statusText}`);
            }

            const xmlText = await response.text();
            return this.parser.parseSearchResults(xmlText);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Search was cancelled');
            }
            throw error;
        }
    }

    /**
     * Get autocomplete suggestions
     * @param {string} query - Search query
     * @param {string|null} sectionId - Optional section ID
     * @param {AbortSignal} signal - AbortSignal for cancellation
     * @returns {Promise<Array>} Array of suggestion objects
     */
    async getAutocomplete(query, sectionId = null, signal = null) {
        if (!query || query.trim().length === 0) {
            return [];
        }

        const auth = this.getAuth();
        if (!auth) {
            return [];
        }

        // Cancel previous request
        if (this.currentAutocompleteAbortController) {
            this.currentAutocompleteAbortController.abort();
        }
        this.currentAutocompleteAbortController = new AbortController();
        const abortSignal = signal || this.currentAutocompleteAbortController.signal;

        try {
            let autocompleteUrl;
            if (sectionId) {
                autocompleteUrl = `${auth.url}/library/sections/${sectionId}/autocomplete?query=${encodeURIComponent(query)}&X-Plex-Token=${auth.token}`;
            } else {
                autocompleteUrl = `${auth.url}/search?query=${encodeURIComponent(query)}&X-Plex-Token=${auth.token}&limit=10`;
            }

            const response = await fetch(autocompleteUrl, {
                signal: abortSignal
            });

            if (!response.ok) {
                return [];
            }

            const xmlText = await response.text();
            return this.parser.parseAutocomplete(xmlText);
        } catch (error) {
            if (error.name === 'AbortError') {
                return [];
            }
            console.error('Error fetching autocomplete:', error);
            return [];
        }
    }

    /**
     * Get available filters for a section
     * @param {string} sectionId - Section ID
     * @returns {Promise<Array>} Array of filter objects
     */
    async getFilters(sectionId) {
        const auth = this.getAuth();
        if (!auth || !sectionId) {
            return [];
        }

        try {
            const response = await fetch(`${auth.url}/library/sections/${sectionId}/filters?X-Plex-Token=${auth.token}`);
            if (!response.ok) {
                return [];
            }

            const xmlText = await response.text();
            return this.parser.parseFilters(xmlText);
        } catch (error) {
            console.error('Error fetching filters:', error);
            return [];
        }
    }

    /**
     * Get available sorts for a section
     * @param {string} sectionId - Section ID
     * @returns {Promise<Array>} Array of sort objects
     */
    async getSorts(sectionId) {
        const auth = this.getAuth();
        if (!auth || !sectionId) {
            return [];
        }

        try {
            const response = await fetch(`${auth.url}/library/sections/${sectionId}/sorts?X-Plex-Token=${auth.token}`);
            if (!response.ok) {
                return [];
            }

            const xmlText = await response.text();
            return this.parser.parseSorts(xmlText);
        } catch (error) {
            console.error('Error fetching sorts:', error);
            return [];
        }
    }
}

/**
 * SearchUI - Handles all UI rendering for search functionality
 */
class SearchUI {
    constructor() {
        this.bodyDiv = bodyDiv;
        this.searchBar = searchBar;
        this.autocompleteContainer = document.getElementById('autocompleteContainer');
        this.filterBar = document.getElementById('filterBar');
        this.typeFilter = document.getElementById('typeFilter');
        this.sortSelect = document.getElementById('sortSelect');
    }

    /**
     * Highlight search term in text
     * @param {string} text - Text to highlight in
     * @param {string} searchTerm - Term to highlight
     * @returns {string} HTML with highlighted terms
     */
    highlightSearchTerm(text, searchTerm) {
        if (!text || !searchTerm) return this.escapeHtml(text || '');
        
        const escapedText = this.escapeHtml(text);
        const escapedTerm = this.escapeHtml(searchTerm);
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        return escapedText.replace(regex, '<mark>$1</mark>');
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Render search results
     * @param {Array} results - Array of media items
     * @param {string} searchTerm - Search term for highlighting
     */
    renderResults(results, searchTerm) {
        if (!this.bodyDiv) return;

        this.bodyDiv.innerHTML = '';

        if (results.length === 0) {
            this.showEmptyState(searchTerm);
            return;
        }

        results.forEach(item => {
            const card = this.createMediaCard(item, searchTerm);
            this.bodyDiv.appendChild(card);
        });
    }

    /**
     * Create a media card element
     * @param {Object} item - Media item data
     * @param {string} searchTerm - Search term for highlighting
     * @returns {HTMLElement} Media card element
     */
    createMediaCard(item, searchTerm) {
        const selectedUrl = localStorage.getItem('selected_url');
        const selectedToken = localStorage.getItem('selected_token');

        // Create card container
        const div_mediaCard = document.createElement('div');
        div_mediaCard.className = 'mc-card';

        // 1. Image Area
        const mc_image_area = document.createElement('div');
        mc_image_area.className = 'mc-image-area';

        const img_mediaCard_Image = document.createElement('img');
        img_mediaCard_Image.className = 'mc-image';
        img_mediaCard_Image.alt = item.title + ' cover';
        img_mediaCard_Image.src = selectedUrl + item.thumb + "?X-Plex-Token=" + selectedToken;

        const mc_image_overlay = document.createElement('div');
        mc_image_overlay.className = 'mc-image-overlay';

        const mc_title_overlay = document.createElement('h3');
        mc_title_overlay.className = 'mc-title-overlay';
        mc_title_overlay.innerHTML = this.highlightSearchTerm(item.title, searchTerm);
        mc_image_overlay.appendChild(mc_title_overlay);

        let mc_meta_overlay_text = item.year ? item.year : '';
        if (item.type) {
            mc_meta_overlay_text += (mc_meta_overlay_text ? ' • ' : '') + item.type.charAt(0).toUpperCase() + item.type.slice(1);
        }
        if (mc_meta_overlay_text) {
            const mc_meta_overlay = document.createElement('p');
            mc_meta_overlay.className = 'mc-meta-overlay';
            mc_meta_overlay.textContent = mc_meta_overlay_text;
            mc_image_overlay.appendChild(mc_meta_overlay);
        }

        mc_image_area.appendChild(img_mediaCard_Image);
        mc_image_area.appendChild(mc_image_overlay);

        // Add click handler for detail view
        mc_image_area.style.cursor = 'pointer';
        mc_image_area.addEventListener('click', () => {
            if (item.files && item.files.length > 0) {
                navigateToDetail(item.type, item.files[0].key, item);
            }
        });

        // 2. Details Area
        const mc_details_area = document.createElement('div');
        mc_details_area.className = 'mc-details-area';

        // Summary
        const mc_summary_div = document.createElement('div');
        mc_summary_div.className = 'mc-summary';
        const p_summary = document.createElement('p');
        const temp_summary = item.summary || "No summary available.";
        p_summary.innerHTML = this.highlightSearchTerm(temp_summary, searchTerm);
        mc_summary_div.appendChild(p_summary);
        mc_details_area.appendChild(mc_summary_div);

        // Full Meta
        const mc_meta_full_div = document.createElement('div');
        mc_meta_full_div.className = 'mc-meta-full';

        const general_info_text = (item.genres && item.genres.length > 0 ? item.genres.join(', ') : 'N/A') +
            (item.duration ? " • " + Math.floor(item.duration / 60) + "h " + item.duration % 60 + "min" : '');
        const p_general_info = document.createElement('p');
        p_general_info.className = 'mc-general-info';
        p_general_info.textContent = general_info_text;
        mc_meta_full_div.appendChild(p_general_info);

        if (item.audienceRating) {
            const p_rating = document.createElement('p');
            p_rating.className = 'mc-rating';
            p_rating.textContent = 'Rating: ' + item.audienceRating;
            if (item.audienceRating > 7.9) { p_rating.classList.add("good"); }
            else if (item.audienceRating > 5.9) { p_rating.classList.add("okay"); }
            else if (item.audienceRating > 4.9) { p_rating.classList.add("bad"); }
            else { p_rating.classList.add("worst"); }
            mc_meta_full_div.appendChild(p_rating);
        }
        mc_details_area.appendChild(mc_meta_full_div);

        // Actions
        const mc_actions_div = document.createElement('div');
        mc_actions_div.className = 'mc-actions';
        if (item.files && item.files.length > 0) {
            item.files.forEach((file, index) => {
                const action_button = document.createElement('a');
                action_button.className = 'mc-action-button';
                action_button.textContent = (file.library || 'Download') + (item.files.length > 1 ? ' ' + (index + 1) : '');
                const escapedTitle = String(item.title).replace(/'/g, "\\'").replace(/"/g, "\\\"");
                if (item.type === 'movie') {
                    action_button.setAttribute("onclick", "downloadMovie('" + file.key + "', '" + escapedTitle + "');");
                } else if (item.type === 'show') {
                    action_button.setAttribute("onclick", "downloadShow('" + file.key + "');");
                }
                mc_actions_div.appendChild(action_button);
            });
        } else {
            const no_action_text = document.createElement('p');
            no_action_text.className = 'mc-no-actions';
            no_action_text.textContent = 'No download sources available.';
            mc_actions_div.appendChild(no_action_text);
        }
        mc_details_area.appendChild(mc_actions_div);

        // Assemble card
        div_mediaCard.appendChild(mc_image_area);
        div_mediaCard.appendChild(mc_details_area);

        return div_mediaCard;
    }

    /**
     * Render autocomplete dropdown
     * @param {Array} apiSuggestions - API suggestions
     * @param {Array} historySuggestions - History suggestions
     * @param {string} query - Current query
     */
    renderAutocomplete(apiSuggestions, historySuggestions, query) {
        if (!this.autocompleteContainer) return;

        this.autocompleteContainer.innerHTML = '';
        this.autocompleteContainer.style.display = 'block';

        // API suggestions
        if (apiSuggestions.length > 0) {
            const apiSection = document.createElement('div');
            apiSection.className = 'autocomplete-section';

            apiSuggestions.slice(0, 5).forEach(suggestion => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.innerHTML = `<span class="autocomplete-title">${this.highlightSearchTerm(suggestion.title, query)}</span> <span class="autocomplete-type">${suggestion.type}</span>`;
                item.onclick = () => {
                    if (this.searchBar) {
                        this.searchBar.value = suggestion.title;
                    }
                    this.hideAutocomplete();
                    // Trigger search via controller
                    if (window.searchController) {
                        window.searchController.handleSearch(suggestion.title);
                    }
                };
                apiSection.appendChild(item);
            });

            this.autocompleteContainer.appendChild(apiSection);
        }

        // History suggestions
        if (historySuggestions.length > 0) {
            const historySection = document.createElement('div');
            historySection.className = 'autocomplete-section autocomplete-history';
            const historyTitle = document.createElement('div');
            historyTitle.className = 'autocomplete-section-title';
            historyTitle.textContent = 'Recent searches';
            historySection.appendChild(historyTitle);

            historySuggestions.forEach(historyItem => {
                if (!apiSuggestions.some(s => s.title.toLowerCase() === historyItem.toLowerCase())) {
                    const item = document.createElement('div');
                    item.className = 'autocomplete-item autocomplete-history-item';
                    item.innerHTML = `<span class="autocomplete-title">${this.highlightSearchTerm(historyItem, query)}</span>`;
                    item.onclick = () => {
                        if (this.searchBar) {
                            this.searchBar.value = historyItem;
                        }
                        this.hideAutocomplete();
                        if (window.searchController) {
                            window.searchController.handleSearch(historyItem);
                        }
                    };
                    historySection.appendChild(item);
                }
            });

            if (historySection.children.length > 1) { // More than just the title
                this.autocompleteContainer.appendChild(historySection);
            }
        }
    }

    /**
     * Hide autocomplete dropdown
     */
    hideAutocomplete() {
        if (this.autocompleteContainer) {
            this.autocompleteContainer.style.display = 'none';
            this.autocompleteContainer.innerHTML = '';
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        if (this.bodyDiv) {
            this.bodyDiv.innerHTML = '';
        }
        showMessage("Searching...", true);
    }

    /**
     * Show error state
     * @param {Error} error - Error object
     * @param {string} searchTerm - Search term that failed
     */
    showErrorState(error, searchTerm) {
        hideMessage();
        
        if (!this.bodyDiv) return;

        this.bodyDiv.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'search-error-container';

        const errorTitle = document.createElement('h2');
        errorTitle.textContent = 'Search Error';
        errorDiv.appendChild(errorTitle);

        const errorMessage = document.createElement('p');
        errorMessage.textContent = error.message || 'An error occurred while searching.';
        errorDiv.appendChild(errorMessage);

        const retryButton = document.createElement('button');
        retryButton.className = 'retry-search-button';
        retryButton.textContent = 'Retry Search';
        retryButton.onclick = () => {
            if (window.searchController) {
                window.searchController.handleSearch(searchTerm);
            }
        };
        errorDiv.appendChild(retryButton);

        this.bodyDiv.appendChild(errorDiv);
    }

    /**
     * Show empty state (no results)
     * @param {string} searchTerm - Search term that returned no results
     */
    showEmptyState(searchTerm) {
        hideMessage();
        
        if (!this.bodyDiv) return;

        this.bodyDiv.innerHTML = '';
        const noResultsDiv = document.createElement('div');
        noResultsDiv.className = 'no-results-container';

        const noResultsTitle = document.createElement('h2');
        noResultsTitle.textContent = 'No results found';
        noResultsDiv.appendChild(noResultsTitle);

        const noResultsMessage = document.createElement('p');
        noResultsMessage.textContent = `We couldn't find any media matching "${searchTerm}".`;
        noResultsDiv.appendChild(noResultsMessage);

        const suggestions = document.createElement('ul');
        suggestions.className = 'search-suggestions';
        suggestions.innerHTML = `
            <li>Check your spelling</li>
            <li>Try different keywords</li>
            <li>Remove filters</li>
        `;
        noResultsDiv.appendChild(suggestions);

        this.bodyDiv.appendChild(noResultsDiv);
    }

    /**
     * Show filter bar
     */
    showFilterBar() {
        if (this.filterBar) {
            this.filterBar.style.display = 'flex';
        }
    }

    /**
     * Hide filter bar
     */
    hideFilterBar() {
        if (this.filterBar) {
            this.filterBar.style.display = 'none';
        }
    }
}

/**
 * SearchController - Main orchestrator for search functionality
 */
class SearchController {
    constructor() {
        this.api = new SearchAPI();
        this.ui = new SearchUI();
        this.state = new SearchState();
        this.searchTimeout = null;
        this.autocompleteTimeout = null;
        this.debounceDelay = 500;
        this.autocompleteDelay = 300;
    }

    /**
     * Initialize the search controller and register event listeners
     */
    init() {
        if (!this.ui.searchBar) return;

        // Search input event
        this.ui.searchBar.addEventListener('input', () => {
            this.handleInput();
        });

        // Enter key for immediate search
        this.ui.searchBar.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.keyCode === 13) {
                event.preventDefault();
                this.cancelDebouncedSearch();
                const query = this.ui.searchBar.value;
                if (this.state.isValidQuery(query)) {
                    this.handleSearch(query);
                }
            }
        });

        // Clear button
        const clearButton = document.getElementById('searchClearButton');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.handleClear();
            });
        }

        // Filter and sort changes
        if (this.ui.typeFilter) {
            this.ui.typeFilter.addEventListener('change', () => {
                if (this.ui.searchBar && this.ui.searchBar.value) {
                    this.handleSearch(this.ui.searchBar.value);
                }
            });
        }

        if (this.ui.sortSelect) {
            this.ui.sortSelect.addEventListener('change', () => {
                if (this.ui.searchBar && this.ui.searchBar.value) {
                    this.handleSearch(this.ui.searchBar.value);
                }
            });
        }

        // Reset filters button
        const resetFiltersButton = document.getElementById('resetFiltersButton');
        if (resetFiltersButton) {
            resetFiltersButton.addEventListener('click', () => {
                if (this.ui.typeFilter) this.ui.typeFilter.value = '';
                if (this.ui.sortSelect) this.ui.sortSelect.value = '';
                if (this.ui.searchBar && this.ui.searchBar.value) {
                    this.handleSearch(this.ui.searchBar.value);
                }
            });
        }

        // Hide autocomplete when clicking outside
        document.addEventListener('click', (event) => {
            const isClickInsideAutocomplete = this.ui.autocompleteContainer && 
                this.ui.autocompleteContainer.contains(event.target);
            const isClickInsideSearchBar = this.ui.searchBar && 
                this.ui.searchBar.contains(event.target);

            if (!isClickInsideAutocomplete && !isClickInsideSearchBar) {
                this.ui.hideAutocomplete();
            }
        });

        // Search button
        const searchButton = document.getElementById('searchbutton');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                const query = this.ui.searchBar ? this.ui.searchBar.value : '';
                if (this.state.isValidQuery(query)) {
                    this.handleSearch(query);
                }
            });
        }
    }

    /**
     * Handle input event (debounced autocomplete and search)
     */
    handleInput() {
        const query = this.ui.searchBar ? this.ui.searchBar.value : '';
        
        // Update clear button visibility
        const clearButton = document.getElementById('searchClearButton');
        if (clearButton) {
            clearButton.style.display = query.length > 0 ? 'block' : 'none';
        }

        // Debounced autocomplete
        this.handleAutocomplete(query);

        // Debounced search
        this.cancelDebouncedSearch();
        this.searchTimeout = setTimeout(() => {
            if (this.state.isValidQuery(query)) {
                this.handleSearch(query);
            }
        }, this.debounceDelay);
    }

    /**
     * Handle search (main search function)
     * @param {string} query - Search query
     */
    async handleSearch(query) {
        if (!this.state.isValidQuery(query)) {
            return;
        }

        // Save to history
        this.state.saveToHistory(query);

        // Show loading state
        this.ui.showLoadingState();
        this.ui.showFilterBar();

        // Get filters and sort from UI
        const filters = {};
        if (this.ui.typeFilter && this.ui.typeFilter.value) {
            filters.type = this.ui.typeFilter.value;
        }

        const sort = {};
        if (this.ui.sortSelect && this.ui.sortSelect.value) {
            const sortParts = this.ui.sortSelect.value.split(':');
            if (sortParts.length === 2) {
                sort.field = sortParts[0];
                sort.order = sortParts[1];
            }
        }

        // Update state
        this.state.updateState(query, filters, sort);

        try {
            // Perform search
            const results = await this.api.search(query, {
                filters: filters,
                sort: sort,
                pagination: {}
            });

            // Hide loading message
            hideMessage();

            // Save results for back navigation
            this.state.saveResults(results, query);

            // Render results
            this.ui.renderResults(results, query);
        } catch (error) {
            console.error('Search error:', error);
            this.ui.showErrorState(error, query);
        }
    }

    /**
     * Handle autocomplete (debounced)
     * @param {string} query - Search query
     */
    async handleAutocomplete(query) {
        if (!this.state.isValidQuery(query)) {
            this.ui.hideAutocomplete();
            return;
        }

        // Cancel previous autocomplete
        if (this.autocompleteTimeout) {
            clearTimeout(this.autocompleteTimeout);
        }

        this.autocompleteTimeout = setTimeout(async () => {
            try {
                // Get API suggestions
                const apiSuggestions = await this.api.getAutocomplete(query);

                // Get history suggestions
                const history = this.state.getHistory();
                const historySuggestions = history.slice(0, 5).filter(item =>
                    item.toLowerCase().includes(query.toLowerCase())
                );

                // Render autocomplete
                this.ui.renderAutocomplete(apiSuggestions, historySuggestions, query);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Autocomplete error:', error);
                }
            }
        }, this.autocompleteDelay);
    }

    /**
     * Handle clear button click
     */
    handleClear() {
        if (this.ui.searchBar) {
            this.ui.searchBar.value = '';
        }
        this.ui.hideAutocomplete();
        
        const clearButton = document.getElementById('searchClearButton');
        if (clearButton) {
            clearButton.style.display = 'none';
        }

        if (this.bodyDiv) {
            this.bodyDiv.innerHTML = '';
        }

        this.ui.hideFilterBar();
    }

    /**
     * Cancel debounced search
     */
    cancelDebouncedSearch() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }
    }

    /**
     * Restore previous search results
     */
    restoreResults() {
        const saved = this.state.restoreResults();
        if (saved && saved.results) {
            this.ui.renderResults(saved.results, saved.query);
            if (this.ui.searchBar) {
                this.ui.searchBar.value = saved.query;
            }
            // Restore filters and sort
            if (saved.filters && this.ui.typeFilter) {
                this.ui.typeFilter.value = saved.filters.type || '';
            }
            if (saved.sort && this.ui.sortSelect) {
                const sortValue = saved.sort.field && saved.sort.order 
                    ? `${saved.sort.field}:${saved.sort.order}` 
                    : '';
                this.ui.sortSelect.value = sortValue;
            }
            this.ui.showFilterBar();
        }
    }
}

$(document).ready(function() {
    popupDiv.style.display = "none";
    popupDiv2.style.display = "none";

    // Initialize new search controller
    window.searchController = new SearchController();
    window.searchController.init();
    
    // Search history display on focus (using SearchState)
    if (searchBar && searchHistoryContainer) {
        searchBar.addEventListener('focus', function() {
            const history = window.searchController.state.getHistory();
            if (history.length === 0) {
                searchHistoryContainer.style.display = "none";
                return;
            }
            
            searchHistoryContainer.innerHTML = '';
            searchHistoryContainer.style.display = "block";
            
            history.slice(0, MAX_HISTORY_ITEMS).forEach(query => {
                const historyItem = document.createElement('div');
                historyItem.className = 'search-history-item';
                
                const historyText = document.createElement('span');
                historyText.textContent = query;
                historyItem.appendChild(historyText);
                
                const removeButton = document.createElement('button');
                removeButton.className = 'search-history-remove';
                removeButton.textContent = '×';
                removeButton.title = 'Remove from history';
                removeButton.onclick = (e) => {
                    e.stopPropagation();
                    window.searchController.state.removeFromHistory(query);
                    // Re-trigger focus to refresh
                    searchBar.focus();
                };
                historyItem.appendChild(removeButton);
                
                historyItem.onclick = () => {
                    if (searchBar) {
                        searchBar.value = query;
                    }
                    window.searchController.handleSearch(query);
                    searchHistoryContainer.style.display = "none";
                };
                
                searchHistoryContainer.appendChild(historyItem);
            });
        });
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
        popupDiv.innerHTML = `<div class="login-container">
            <h2 class="login-title">Plexer-Reborn Login</h2>
            <p class="login-info">Log in with your Plex account to continue</p>
            <form class="login-form" action="#" onsubmit="login();return false">
                <input class="login-input" name="uname" type="text" placeholder="Username / Email" id="username_field" required>
                <input class="login-input" name="pword" type="password" placeholder="Plex Password" id="password_field" required>
                <button class="login-button" type="submit">Log In</button>
            </form>
        </div>`
        showAnimatedPopup(popupDiv);
    } else if (localStorage.getItem("selected") === null) {
        reselectButton.classList.add("disabled");
        searchBar.classList.add("disabled");
        searchBar.disabled = true;
        searchButton.disabled = true;

        popupDiv.innerHTML = `
            <div class="server-selection-container">
                <h2 class="p_popup_title">Select a Server Connection</h2>
            </div>
        `;

        var serversToChoose = JSON.parse(localStorage.getItem("servers"));
        var container = popupDiv.querySelector('.server-selection-container');

        if (serversToChoose && serversToChoose.length > 0) {
            serversToChoose.forEach(server => {
                const serverCard = document.createElement('div');
                serverCard.className = 'server-card';

                const serverName = document.createElement('h3');
                serverName.className = 'server-name';
                serverName.textContent = server.name;
                serverCard.appendChild(serverName);

                const connectionsList = document.createElement('ul');
                connectionsList.className = 'server-connections';

                Object.values(server.connections).forEach(url => {
                    const connectionItem = document.createElement('li');
                    const link = document.createElement('a');
                    link.href = '#';
                    link.textContent = url;
                    link.onclick = () => selectSelected(url, server.token);
                    connectionItem.appendChild(link);
                    connectionsList.appendChild(connectionItem);
                });

                serverCard.appendChild(connectionsList);
                container.appendChild(serverCard);
            });
        } else {
            container.innerHTML += '<p>No servers found. Please log in again.</p>';
        }

        showAnimatedPopup(popupDiv);
    } else {
        const isFirstLoad = localStorage.getItem('isFirstLoadAfterSelect');
        const vlcInfoShown = localStorage.getItem('vlcLinkerInfoShown');

        if (isFirstLoad === 'true' && vlcInfoShown !== 'true') {
            localStorage.removeItem('isFirstLoadAfterSelect');
            showVlcLinkerInfoPopup();
        }
    }
    
    // Initialize URL routing
    window.addEventListener('popstate', handlePopState);
    
    // Check initial URL on page load
    const hash = window.location.hash;
    if (hash.startsWith('#/detail/')) {
        // Extract detail view info from URL
        const match = hash.match(/#\/detail\/(movie|show)\/(\d+)/);
        if (match) {
            const [, type, id] = match;
            const mediaKey = `/library/metadata/${id}`;
            currentView = 'detail';
            showMediaDetailView(type, mediaKey, null);
        }
    } else {
        // Default to search view
        currentView = 'search';
        if (hash === '#/search' || hash === '') {
            history.replaceState({ view: 'search' }, '', '#/search');
        }
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

function showVlcLinkerInfoPopup() {
    popupDiv.innerHTML = `
        <div class="vlc-info-popup-container">
            <h2 class="p_popup_title">VLC Linker Required</h2>
            <div class="vlc-info-content">
                <p>To play media in your VLC media player, you need to install the <strong>VLC-linker</strong> tool.</p>
                <p>This tool sends a command to PowerShell to open the stream in your installed VLC media player.</p>
                <p>If you don't have VLC media player installed, you can download it here:</p>
                <a href="https://www.videolan.org/" class="vlc-info-link" target="_blank" rel="noopener noreferrer">
                    <img src="icons/vlc.svg" alt="VLC" class="vlc-info-link-icon">
                    <span>Download VLC</span>
                </a>
                <p>You can find the tool and installation instructions on GitHub:</p>
                <a href="https://github.com/BotAwesome/VLC-linker" class="vlc-info-link" target="_blank" rel="noopener noreferrer">
                    <img src="icons/github.svg" alt="GitHub" class="vlc-info-link-icon">
                    <span>BotAwesome/VLC-linker</span>
                </a>
            </div>
            <div class="vlc-info-actions">
                <div class="vlc-info-checkbox">
                    <input type="checkbox" id="dont-show-vlc-info" checked>
                    <label for="dont-show-vlc-info">Don't show this again</label>
                </div>
                <button class="vlc-info-button" onclick="closeVlcLinkerInfoPopup()">OK, I understand</button>
            </div>
        </div>
    `;
    showAnimatedPopup(popupDiv);
}

function closeVlcLinkerInfoPopup() {
    const checkbox = document.getElementById('dont-show-vlc-info');
    if (checkbox && checkbox.checked) {
        localStorage.setItem('vlcLinkerInfoShown', 'true');
    }
    closeAnimatedPopup(popupDiv);
}
