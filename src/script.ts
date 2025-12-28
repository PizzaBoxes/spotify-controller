import { redirectToAuthCodeFlow, getAccessToken } from "./authCodeWithPkce";

const clientId = "3025f8b2eace4554a2e066bbed190e1a"
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

let accessToken = localStorage.getItem("access_token");

if (!code && !accessToken) {
    redirectToAuthCodeFlow(clientId);
} else if (code) {
    const accessToken = await getAccessToken(clientId, code);
    localStorage.setItem("access_token", accessToken);
    const url = new URL(window.location.href);
    url.searchParams.delete("code");
    window.history.replaceState({}, document.title, url.toString());

    await loadData(accessToken);
} else if (accessToken) {
    await loadData(accessToken);
}

async function loadData(accessToken: string) {
    const profile = await fetchProfile(accessToken);
    const playback = await fetchPlayback(accessToken);
    console.log(playback);
    console.log(profile);
    populateUI(profile);
    if (playback) {
        populatePlayback(playback);
    }
    buttonListeners(accessToken);
    startPolling(accessToken);
    toggleShow();
}

async function fetchProfile(code: string): Promise<UserProfile> {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${code}` }
    });

    return await result.json();
}

async function fetchPlayback(code: string): Promise<UserPlayback | null> {
    const result = await fetch("https://api.spotify.com/v1/me/player", {
        method: "GET",
        headers: { Authorization: `Bearer ${code}` }
    });

    if (result.status === 204 || result.status > 400) {
        console.log("No music playing or error occurred.");
        return null;
    }

    return await result.json();
}

// helpers
async function sendCommand(endpoint: string, method: string, code: string) { 
   await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
       method: method,
       headers: {
            'Authorization': `Bearer ${code}`
        }
   });
}

async function handleCommand(action: 'pause' | 'play' | 'next' | 'previous', code: string) {
    console.log(`User pressed: ${action}`);

    if (action === 'pause') {
        await sendCommand('pause', 'PUT', code);
    }
    else if (action === 'play') {
        await sendCommand('play', 'PUT', code);
    }
    else if (action === 'next') {
        await sendCommand('next', 'POST', code);
    }
    else if (action === 'previous') {
        await sendCommand('previous', 'POST', code);
    }
}

function buttonListeners(code: string) {
    document.getElementById("btn-pause")?.addEventListener("click", () => {
        handleCommand('pause', code);
    });
    document.getElementById("btn-play")?.addEventListener("click", () => {
        handleCommand('play', code);
    });
    document.getElementById("btn-next")?.addEventListener("click", () => {
        handleCommand('next', code);
    });
    document.getElementById("btn-previous")?.addEventListener("click", () => {
        handleCommand('previous', code);
    });
}

function populatePlayback(playback: UserPlayback) {
    document.getElementById("trackName")!.innerText = playback.item.name;
    
    if (playback.item && playback.item.album && playback.item.album.images.length > 0) {
        document.getElementById("songImg")!.setAttribute("src", playback.item.album.images[1].url);
    } else {
        document.getElementById("songImg")!.setAttribute("src", "placeholder.png");
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

function startPolling(code: string) {
    setInterval(async () => {
        const playback = await fetchPlayback(code);

        if (playback && playback.item) {
            populatePlayback(playback);
        } else {
            document.getElementById("trackName")!.innerText = "Not Playing";
        }
    }, 1000);
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
