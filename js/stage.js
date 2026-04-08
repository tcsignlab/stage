// ... (keep all previous parser, import, setlist, midi functions exactly as they were) ...

// ==================== STATIC LYRICS RENDER – preserves original structure ====================
function renderLyrics() {
    const container = document.getElementById("lyrics");
    container.innerHTML = "";

    if (!song?.lines || song.lines.length === 0) {
        const msg = document.createElement("div");
        msg.style.opacity = "0.4";
        msg.style.fontStyle = "italic";
        msg.textContent = "(no chart loaded)";
        container.appendChild(msg);
        return;
    }

    song.lines.forEach((line, i) => {
        const div = document.createElement("div");
        div.className = "line";
        div.dataset.index = i;
        div.innerHTML = `<span class="chord">${line.chord || ''}</span> ${line.lyric || ''}`;
        container.appendChild(div);
    });
}

// ==================== BOUNCING BALL / PROGRESSIVE HIGHLIGHT (no scrolling) ====================
function updateHighlight(elapsed) {
    if (!song?.lines) return;

    let activeIndex = -1;
    for (let i = 0; i < song.lines.length; i++) {
        if (elapsed >= song.lines[i].time) activeIndex = i;
        else break;
    }

    // Update big chord
    if (activeIndex >= 0) {
        document.getElementById("bigChord").innerText = song.lines[activeIndex].chord || '';
    }

    // Highlight current line (karaoke / bouncing ball style)
    document.querySelectorAll('.line').forEach(line => {
        line.classList.remove('current');
        if (parseInt(line.dataset.index) === activeIndex) {
            line.classList.add('current');
        }
    });
}

// ==================== MAIN LOOP – now updates highlight instead of scroll ====================
setInterval(() => {
    if (!playing || !song?.lines) return;

    const elapsed = (Date.now() - startTime) / 1000;
    updateHighlight(elapsed);

    // Live BPM display in MIDI panel
    if (document.getElementById('midiPanel').style.display !== 'none') {
        document.getElementById('liveBpm').innerText = `BPM: ${midiClock.bpm || '—'}`;
    }
}, 40);   // smoother 40ms updates

// Transport bar helpers
function togglePlayPause() {
    if (playing) {
        pauseSong();
        document.getElementById('transportPlayBtn').innerHTML = '▶️ PLAY';
    } else {
        startSong();
        document.getElementById('transportPlayBtn').innerHTML = '⏸️ PAUSE';
    }
}

function pauseSong() {
    playing = false;
    document.getElementById('transportPlayBtn').innerHTML = '▶️ PLAY';
}

function stopSong() {   // full stop + reset
    playing = false;
    startTime = null;
    document.getElementById('transportPlayBtn').innerHTML = '▶️ PLAY';
    document.getElementById("bigChord").innerText = '';
    document.querySelectorAll('.line').forEach(l => l.classList.remove('current'));
}

// Add stopSong to window so button works
window.stopSong = stopSong;

// Boot
loadSetlist();
console.log('%c🎸 Stage Teleprompter READY – Clean layout + static lyrics + persistent controls', 'color:#00cc77;font-size:18px');
