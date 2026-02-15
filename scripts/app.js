// ---------- GLOBAL VARIABLES ----------
window.players = [];
window.matches = [];
window.schoolMap = {};
window.schoolCount = {};

// ---------- JSON LOADER ----------
async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return res.json();
}

// ---------- INIT DATA ----------
async function initData() {
    if (window.players.length) return; // already loaded

    const [playersData, matchesData, schoolsData] = await Promise.all([
        loadJSON('/data/players.json'),
        loadJSON('/data/matches.json'),
        loadJSON('/data/schools.json')
    ]);

    window.players = playersData;
    window.matches = matchesData;

    window.schoolMap = {};
    window.schoolCount = {};
    schoolsData.forEach(s => {
        window.schoolMap[s.id] = s;
        window.schoolCount[s.id] = 0;
    });
    window.players.forEach(p => {
        if (p.school) window.schoolCount[p.school] = (window.schoolCount[p.school] || 0) + 1;
    });

    return window.players.reduce((map, p) => { map[p.id] = p; return map; }, {});
}

// ---------- SCHOOL POPUPS ----------
function setupSchoolPopups() {
    const popup = document.getElementById("school-popup");
    if (!popup) return;
    const popupLogo = document.getElementById("popup-logo");
    const popupText = document.getElementById("popup-text");
    let hideTimeout;

    function showPopup(schoolId, x, y) {
        const s = window.schoolMap[schoolId];
        const count = window.schoolCount[schoolId] || 0;
        if (!s) return;
        popupLogo.src = `/images/${schoolId}.avif`;
        popupText.innerHTML = `<strong>${s.name}</strong><br>Players: ${count}`;
        popup.style.display = "block";
        popup.style.left = (x + 15) + "px";
        popup.style.top = (y + 15) + "px";
        clearTimeout(hideTimeout);
    }

    function hidePopup() {
        hideTimeout = setTimeout(() => popup.style.display = "none", 200);
    }

    // Remove old listeners
    document.querySelectorAll(".school-name").forEach(el => el.replaceWith(el.cloneNode(true)));

    document.querySelectorAll(".school-name").forEach(el => {
        const schoolId = el.dataset.school;
        el.addEventListener("mouseenter", e => showPopup(schoolId, e.pageX, e.pageY));
        el.addEventListener("mousemove", e => {
            popup.style.left = (e.pageX + 15) + "px";
            popup.style.top = (e.pageY + 15) + "px";
        });
        el.addEventListener("mouseleave", hidePopup);
    });

    popup.addEventListener("mouseenter", () => clearTimeout(hideTimeout));
    popup.addEventListener("mouseleave", hidePopup);
}

// ---------- HOME PAGE ----------
async function populateHome() {
    const map = await initData();
    if (!window.matches.length) return;

    // --- Featured Game ---
    const lastMatch = window.matches[window.matches.length-1];
    const feat = document.getElementById("featured-game");
    if (feat) {
        const white = map[lastMatch.white];
        const black = map[lastMatch.black];
        feat.innerHTML = `
            <h2>Featured Game</h2>
            <p>
                <a href="/pages/profile.html?id=${white.id}">${white.name}</a> vs 
                <a href="/pages/profile.html?id=${black.id}">${black.name}</a> | 
                ${lastMatch.result} | 
                <span class="school-name" data-school="${lastMatch.school}">${window.schoolMap[lastMatch.school]?.name || lastMatch.school}</span>
            </p>
            <div id="featured-board" style="width:300px; aspect-ratio:1;"></div>
        `;
        const chess = new Chess();
        const board = Chessboard('featured-board', { draggable: false, position: 'start' });
        let idx = 0;
        function step() {
            if (idx >= lastMatch.moves.length) return;
            chess.move(lastMatch.moves[idx]);
            board.position(chess.fen());
            idx++;
            setTimeout(step, 700);
        }
        step();
        feat.onclick = () => window.location.href = `/pages/game.html?id=${lastMatch.id}`;
    }

    // --- Recent Games ---
    const recent = document.getElementById("recent-games");
    if (recent) {
        recent.innerHTML = "<h2>Recent Games</h2><div class='recent-container' style='display:flex; gap:10px; overflow-x:auto;'></div>";
        const container = recent.querySelector(".recent-container");
        window.matches.slice(-3).reverse().forEach(m => {
            const div = document.createElement("div");
            div.style.width = "150px";
            div.style.height = "150px";
            div.style.flex = "0 0 auto";
            div.style.cursor = "pointer";

            const chessMini = new Chess();
            const miniBoard = Chessboard(div, { draggable: false, position: 'start' });
            let idx = 0;
            function step() {
                if (idx >= m.moves.length) return;
                chessMini.move(m.moves[idx]);
                miniBoard.position(chessMini.fen());
                idx++;
                setTimeout(step, 500);
            }
            step();

            div.onclick = () => window.location.href = `/pages/game.html?id=${m.id}`;
            container.appendChild(div);
        });
    }

    // --- Top Players Table ---
    const topTable = document.getElementById("topPlayersTable");
    if (topTable) {
        const top5 = [...window.players].sort((a,b)=>b.elo-a.elo).slice(0,5);
        topTable.innerHTML = '';
        top5.forEach((p,i) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${i+1}</td>
                            <td><a href="/pages/profile.html?id=${p.id}">${p.name}</a></td>
                            <td>${p.elo}</td>
                            <td>${window.schoolMap[p.school]?.name || p.school}</td>`;
            topTable.appendChild(tr);
        });
    }

    setupSchoolPopups();
}

// ---------- LEADERBOARD ----------
async function loadLeaderboard() {
    const map = await initData();
    const search = document.getElementById("search")?.value.toLowerCase() || '';
    const schoolFilter = document.getElementById("schoolFilter")?.value || 'all';
    const sortBy = document.getElementById("sortBy")?.value || 'elo';
    const tbody = document.getElementById("board");
    if (!tbody) return;

    let list = window.players;

    if (search) list = list.filter(p => p.name.toLowerCase().includes(search));
    if (schoolFilter !== 'all') list = list.filter(p => p.school === schoolFilter);

    list = list.map(p => ({
        ...p,
        games: window.matches.filter(m => m.white===p.id || m.black===p.id).length
    }));

    if (sortBy==='elo') list.sort((a,b)=>b.elo-a.elo);
    else list.sort((a,b)=>b.games-a.games);

    tbody.innerHTML = '';
    list.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td><a href="/pages/profile.html?id=${p.id}">${p.name}</a></td>
                        <td><span class="school-name" data-school="${p.school}">${window.schoolMap[p.school]?.name || p.school}</span></td>
                        <td>${p.elo}</td>
                        <td>${p.games}</td>`;
        tbody.appendChild(tr);
    });

    setupSchoolPopups();
}

// ---------- GAME VIEWER ----------
async function loadGame() {
    const id = new URLSearchParams(location.search).get("id");
    if (!id) return;
    const map = await initData();
    const match = window.matches.find(m => m.id===id);
    if (!match) return;

    const white = map[match.white];
    const black = map[match.black];

    const info = document.getElementById("game-info");
    if (info) {
        info.innerHTML = `<p><strong>Date:</strong> ${match.date}</p>
                          <p><strong>White:</strong> <a href="/pages/profile.html?id=${white.id}">${white.name}</a> (${white.elo})</p>
                          <p><strong>Black:</strong> <a href="/pages/profile.html?id=${black.id}">${black.name}</a> (${black.elo})</p>
                          <p><strong>Result:</strong> ${match.result}</p>
                          <p><strong>Elo Before:</strong> ${match.eloBeforeWhite} | ${match.eloBeforeBlack}</p>
                          <p><strong>Elo After:</strong> ${match.eloAfterWhite} | ${match.eloAfterBlack}</p>
                          <p><strong>End Reason:</strong> ${match.endReason}</p>
                          <p><strong>School:</strong> <span class="school-name" data-school="${match.school}">${window.schoolMap[match.school]?.name || match.school}</span></p>`;
    }

    const movesSection = document.getElementById("game-moves");
    if (movesSection) movesSection.innerHTML = `<h2>Moves</h2><pre>${match.moves.join(" ")}</pre>`;

    // Interactive board
    const boardDiv = document.getElementById("interactive-board");
    if (boardDiv) {
        const chess = new Chess();
        const board = Chessboard('interactive-board', { draggable: true, position: 'start' });
        let idx = 0;

        const nextBtn = document.createElement("button");
        nextBtn.textContent = "Next";
        const prevBtn = document.createElement("button");
        prevBtn.textContent = "Prev";
        boardDiv.appendChild(prevBtn);
        boardDiv.appendChild(nextBtn);

        nextBtn.onclick = () => {
            if (idx >= match.moves.length) return;
            chess.move(match.moves[idx]);
            board.position(chess.fen());
            idx++;
        };
        prevBtn.onclick = () => {
            if (idx <= 0) return;
            idx--;
            chess.reset();
            for (let i=0;i<idx;i++) chess.move(match.moves[i]);
            board.position(chess.fen());
        };
    }

    setupSchoolPopups();
}

// ---------- PROFILE PAGE ----------
async function loadProfile() {
    const id = new URLSearchParams(location.search).get("id");
    if (!id) return;
    const map = await initData();
    const p = map[id];
    if (!p) return;

    document.getElementById("name").textContent = p.name;
    document.getElementById("elo").textContent = `Elo: ${p.elo}`;
    document.getElementById("school").innerHTML = `School: <span class="school-name" data-school="${p.school}">${window.schoolMap[p.school]?.name || p.school}</span>`;

    const tbody = document.getElementById("list");
    if (!tbody) return;
    tbody.innerHTML = '';

    window.matches.filter(m => m.white===id || m.black===id).forEach(m => {
        const w = map[m.white], b = map[m.black];
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${m.date}</td>
                        <td><a href="/pages/profile.html?id=${w.id}">${w.name}</a></td>
                        <td><a href="/pages/profile.html?id=${b.id}">${b.name}</a></td>
                        <td>${m.result}</td>
                        <td><span class="school-name" data-school="${m.school}">${window.schoolMap[m.school]?.name || m.school}</span></td>
                        <td><a href="/pages/game.html?id=${m.id}">View</a></td>`;
        tbody.appendChild(tr);
    });

    setupSchoolPopups();
}

// ---------- EXPORT ----------
window.populateHome = populateHome;
window.loadLeaderboard = loadLeaderboard;
window.loadGame = loadGame;
window.loadProfile = loadProfile;
window.initData = initData;
window.setupSchoolPopups = setupSchoolPopups;