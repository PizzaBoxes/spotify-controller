import { redirectToAuthCodeFlow, getAccessToken, refreshAccessToken } from "./authCodeWithPkce";

const clientId = "3025f8b2eace4554a2e066bbed190e1a"
const params = new URLSearchParams(window.location.search);
const token = params.get("token");

let isDragging = false;
let accessToken = localStorage.getItem("access_token");

if (!token && !accessToken) {
    redirectToAuthCodeFlow(clientId);
} else if (token) {
    const accessToken = await getAccessToken(clientId, token);
    localStorage.setItem("access_token", accessToken);
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState({}, document.title, url.toString());

    await loadData();
} else if (accessToken) {
    await loadData();
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
    let token = localStorage.getItem("access_token");
    if (!token) {
        redirectToAuthCodeFlow(clientId);
        return null;
    }

    const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
    };
    let response = await fetch(url, { ...options, headers});
    if (response.status === 401) {
        console.log("Token expired. Refreshing...");
        const newToken = await refreshAccessToken(clientId);
        if (newToken) {
            const retryHeaders = {
                ...options.headers,
                Authorization: `Bearer ${newToken}`,
            };
            response = await fetch(url, { ...options, headers: retryHeaders });
        } else {
            redirectToAuthCodeFlow(clientId);
            return null;
        }
    }
    return response;
}

async function loadData() {
    const profile = await fetchProfile();
    const playback = await fetchPlayback();
    console.log(playback);
    console.log(profile);
    populateUI(profile);
    if (playback) {
        populatePlayback(playback);
    }
    setupListeners();
    startPolling();
    toggleShow();
}

function startPolling() {
    setInterval(async () => {
        const playback = await fetchPlayback();

        if (playback && playback.item) {
            populatePlayback(playback);
        } else {
            document.getElementById("trackName")!.innerText = "Not Playing";
        }
    }, 1000);
}

async function fetchProfile(): Promise<UserProfile> {
    const result = await fetchWithAuth("https://api.spotify.com/v1/me", {
        method: "GET"
    });

    if (!result) {
        throw new Error("Request failed or unauthorized");
    }
    return await result.json();
}

async function fetchPlayback(): Promise<UserPlayback | null> {
    const result = await fetchWithAuth("https://api.spotify.com/v1/me/player", {
        method: "GET",
    });

    if (!result || result.status === 204 || result.status > 400) {
        // console.log("No music playing or error occurred.");
        return null;
    }

    return await result.json();
}

async function seekToPosition(positionMs: number,) {
    await fetchWithAuth(`https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`, {
        method: "PUT",
    });
}

// helpers
async function sendCommand(endpoint: string, method: string) { 
   await fetchWithAuth(`https://api.spotify.com/v1/me/player/${endpoint}`, {
       method: method
   });
}

function setupListeners() {
    document.getElementById("btn-pause")?.addEventListener("click", () => {
        handleCommand('pause');
    });
    document.getElementById("btn-play")?.addEventListener("click", () => {
        handleCommand('play');
    });
    document.getElementById("btn-next")?.addEventListener("click", () => {
        handleCommand('next');
    });
    document.getElementById("btn-previous")?.addEventListener("click", () => {
        handleCommand('previous');
    });

    const progressBar = document.getElementById("progressBar") as HTMLInputElement;

    progressBar?.addEventListener("input", () => {
        isDragging = true;
        document.getElementById("currentTime")!.innerText = formatTime(parseInt(progressBar.value));
    });
    progressBar?.addEventListener("change", () => {
        isDragging = false;
        const seekTime = parseInt(progressBar.value);
        seekToPosition(seekTime);
    });
}

async function handleCommand(action: 'pause' | 'play' | 'next' | 'previous') {
    console.log(`User pressed: ${action}`);

    if (action === 'pause') {
        await sendCommand('pause', 'PUT');
    }
    else if (action === 'play') {
        await sendCommand('play', 'PUT');
    }
    else if (action === 'next') {
        await sendCommand('next', 'POST');
    }
    else if (action === 'previous') {
        await sendCommand('previous', 'POST');
    }
}

function populatePlayback(playback: UserPlayback) {
    document.getElementById("trackName")!.innerText = playback.item.name;
    
    // update the song img when new song plays
    if (playback.item && playback.item.album && playback.item.album.images.length > 0) {
        document.getElementById("songImg")!.setAttribute("src", playback.item.album.images[1].url);
    } else {
        document.getElementById("songImg")!.setAttribute("src", "placeholder.png");
    }

    const progressBar = document.getElementById("progressBar") as HTMLInputElement;
    const duration = playback.item.duration_ms;
    const progress = playback.progress_ms;

    document.getElementById("totalTime")!.innerText = formatTime(duration);
    progressBar.max = duration.toString();
    if (!isDragging) {
        document.getElementById("currentTime")!.innerText = formatTime(progress);
        progressBar.value = progress.toString();
    }
}

function populateUI(profile: UserProfile) {
    document.getElementById("displayName")!.innerText = profile.display_name;
    document.getElementById("avatar")!.setAttribute("src", profile.images[0].url);
    document.getElementById("id")!.innerText = profile.id;
    document.getElementById("email")!.innerText = profile.email;
    document.getElementById("uri")!.innerText = profile.uri;
    document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url")!.innerText = profile.href;
    document.getElementById("url")!.setAttribute("href", profile.href);
    document.getElementById("imgUrl")!.innerText = profile.images[0].url;
}

function toggleShow() {
    const profileElems = document.getElementById("profileDiv");
    const toggleButton =  document.getElementById("toggleProfile");

    if (toggleButton && profileElems) {
        toggleButton.addEventListener("click", () => {
            if (profileElems.style.display === "none") {
                profileElems.style.display = "block";
            } else {
                profileElems.style.display = "none";
            }
        });
    }
}

function formatTime(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}
