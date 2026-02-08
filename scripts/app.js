const playersPath = "../data/players.json";
const matchesPath = "../data/matches.json";

async function fetchJSON(path) {
    const res = await fetch(path);
    return await res.json();
}

async function populateHomepage() {
    const players = await fetchJSON(playersPath);
    const matches = await fetchJSON(matchesPath);

    const featuredSection = document.getElementById("featured-game");
    if (featuredSection && matches.length > 0) {
        const game = matches[matches.length - 1];
        featuredSection.innerHTML = `
            <h2>Featured Game</h2>
            <p>${game.white} vs ${game.black} | ${game.result} | +${game.eloAfter.white - game.eloBefore.white} Elo</p>
            <a href="/pages/game.html?id=${game.id}">View Game</a>
        `;
    }

    const topSection = document.getElementById("top-players");
    if (topSection) {
        const topPlayers = [...players].sort((a, b) => b.elo - a.elo).slice(0, 5);
        topSection.innerHTML = "<h2>Top 5 Players</h2><ol>" + 
            topPlayers.map(p => `<li><a href="/pages/profile.html?id=${p.id}">${p.name} - ${p.elo}</a></li>`).join("") +
            "</ol>";
    }

    const recentSection = document.getElementById("recent-games");
    if (recentSection) {
        const recent = matches.slice(-5).reverse(); // latest 5
        recentSection.innerHTML = "<h2>Recent Games</h2><ul>" + 
            recent.map(m => `<li><a href="/pages/game.html?id=${m.id}">${m.white} vs ${m.black} | ${m.result}</a></li>`).join("") +
            "</ul>";
    }
}

async function populateLeaderboard() {
    const tableBody = document.querySelector("table tbody");
    if (!tableBody) return;
    const players = await fetchJSON(playersPath);
    const sorted = players.sort((a, b) => b.elo - a.elo);
    tableBody.innerHTML = sorted.map((p, i) => `
        <tr>
            <td>${i+1}</td>
            <td><a href="/pages/profile.html?id=${p.id}">${p.name}</a></td>
            <td>${p.elo}</td>
            <td>${p.school}</td>
        </tr>
    `).join("");
}

async function populateGames() {
    const gameList = document.getElementById("game-list");
    if (!gameList) return;
    const matches = await fetchJSON(matchesPath);
    gameList.innerHTML = "<ul>" + matches.map(m => `
        <li><a href="/pages/game.html?id=${m.id}">${m.white} vs ${m.black} | ${m.result}</a></li>
    `).join("") + "</ul>";
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("featured-game")) populateHomepage();
    if (document.querySelector("table tbody")) populateLeaderboard();
    if (document.getElementById("game-list")) populateGames();
});