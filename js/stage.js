// js/stage.js – FULL UPDATE: setlist display + current-song highlight
let setlist = []
let currentSongIndex = 0
let song
let startTime
let playing = false
let currentSongData = null
let midiPanelVisible = false

// ==================== NEW: SETLIST RENDER + HIGHLIGHT ====================
function renderSetlist() {
    const container = document.getElementById('setlistItems')
    container.innerHTML = ''
    setlist.forEach((entry, i) => {
        const div = document.createElement('div')
        div.className = `setlist-item ${i === currentSongIndex ? 'current' : ''}`
        div.innerHTML = `<strong>${i+1}.</strong> ${entry.artist} – ${entry.title}`
        div.onclick = () => {
            currentSongIndex = i
            loadSong()
        }
        container.appendChild(div)
    })
}

function toggleSetlistPanel() {
    const panel = document.getElementById('setlistPanel')
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none'
}

// ==================== MIDI PANEL (unchanged) ====================
function toggleMidiPanel() {
    const panel = document.getElementById('midiPanel')
    midiPanelVisible = !midiPanelVisible
    panel.style.display = midiPanelVisible ? 'block' : 'none'
}

function togglePlayPause() {
    if (playing) {
        pauseSong()
        document.getElementById('playPauseBtn').innerHTML = `▶️<br><small>PLAY / PAUSE</small>`
    } else {
        startSong()
        document.getElementById('playPauseBtn').innerHTML = `⏸️<br><small>PLAY / PAUSE</small>`
    }
}

function previousSong() {
    currentSongIndex = (currentSongIndex - 1 + setlist.length) % setlist.length
    loadSong()
}

// ==================== CHORD PARSER + IMPORT (unchanged – works perfectly) ====================
function isChordLine(line) {
    if (!line || line.length < 1) return false
    const tokens = line.trim().split(/\s+/).filter(t => t)
    if (tokens.length === 0) return false
    const chordRegex = /^[A-G][#b]?[mM]?[dim aug sus2-4]?[0-9]?[79]?[\/]?[A-G]?[#b]?$/i
    return tokens.every(token => 
        chordRegex.test(token) ||
        token === 'N.C.' || token === 'NC' ||
        /^\d+$/.test(token) ||
        token.includes('/')
    )
}

function extractMetadata(text) {
    let title = "Untitled Song"
    let artist = "Unknown Artist"
    let bpm = 120
    const lines = text.split('\n')
    const firstLine = lines[0] || ""
    const byMatch = firstLine.match(/^(.*?)\s+(?:Chords)?\s*by\s+(.+?)$/i)
    if (byMatch) {
        title = byMatch[1].replace(/Chords/i, '').trim()
        artist = byMatch[2].trim()
    }
    const bpmMatch = text.match(/(\d{2,3})\s*bpm/i)
    if (bpmMatch) bpm = parseInt(bpmMatch[1])
    return { title, artist, bpm }
}

function parseChordChart(pastedText, bpm = 120) {
    const rawLines = pastedText.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('//'))
    let parsedLines = []
    let time = 0
    const secondsPerBeat = 60 / bpm
    const secondsPerLine = 4 * secondsPerBeat
    let i = 0
    while (i < rawLines.length) {
        let current = rawLines[i]
        if (/^\[[^\]]+\]$/.test(current)) { i++; continue }
        if (isChordLine(current)) {
            const chordTokens = current.split(/\s+/).filter(Boolean)
            const nextIdx = i + 1
            const hasNextLyric = nextIdx < rawLines.length && rawLines[nextIdx] && !isChordLine(rawLines[nextIdx])
            if (hasNextLyric) {
                const mainChord = chordTokens[0] || 'N.C.'
                const lyric = rawLines[nextIdx]
                parsedLines.push({time: Math.round(time), chord: mainChord, lyric: lyric})
                time += secondsPerLine
                i += 2
            } else {
                chordTokens.forEach(chord => {
                    parsedLines.push({time: Math.round(time), chord: chord, lyric: ""})
                    time += secondsPerBeat
                })
                i++
            }
        } else {
            const prevChord = parsedLines.length > 0 ? parsedLines[parsedLines.length-1].chord : ""
            parsedLines.push({time: Math.round(time), chord: prevChord, lyric: current})
            time += secondsPerLine / 2
            i++
        }
    }
    return parsedLines
}

// ==================== IMPORT UI (unchanged) ====================
function toggleModal() {
    const modal = document.getElementById('modal')
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex'
}
function closeModal() {
    document.getElementById('modal').style.display = 'none'
    document.getElementById('preview').innerHTML = ''
    document.getElementById('jsonPreview').style.display = 'none'
    document.getElementById('downloadBtn').style.display = 'none'
    document.getElementById('tempLoadBtn').style.display = 'none'
}
function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = function (ev) {
        const content = ev.target.result
        const meta = extractMetadata(content)
        document.getElementById('importTitle').value = meta.title
        document.getElementById('importArtist').value = meta.artist
        document.getElementById('importBpm').value = meta.bpm
        document.getElementById('chartPaste').value = content
        parseAndImport()
    }
    reader.readAsText(file)
}
function parseAndImport() {
    const title = (document.getElementById('importTitle').value || "Untitled").trim()
    const artist = (document.getElementById('importArtist').value || "Unknown").trim()
    let bpm = parseFloat(document.getElementById('importBpm').value) || 120
    const pasted = document.getElementById('chartPaste').value.trim()
    if (!pasted) { alert("Nothing to parse – paste text or upload a .txt file!"); return }
    const parsed = parseChordChart(pasted, bpm)
    currentSongData = { title: title, artist: artist, bpm: bpm, lines: parsed }
    let html = `<h3 style="color:#0f0;">✅ Parsed ${parsed.length} lines • ${title} by ${artist} (${bpm} BPM)</h3>`
    html += `<ul>`
    parsed.forEach(l => {
        html += `<li><strong style="color:#0f0; display:inline-block; width:80px;">${l.chord}</strong> ${l.lyric || '<em style="opacity:0.4">[chord change]</em>'} <small style="margin-left:auto; color:#666;">${l.time}s</small></li>`
    })
    html += `</ul>`
    document.getElementById('preview').innerHTML = html
    const jsonStr = JSON.stringify(currentSongData, null, 2)
    document.getElementById('jsonPreview').innerHTML = `<strong>Ready-to-save song.json:</strong><br>${jsonStr}`
    document.getElementById('jsonPreview').style.display = 'block'
    document.getElementById('downloadBtn').style.display = 'inline-block'
    document.getElementById('tempLoadBtn').style.display = 'inline-block'
}
function downloadSongJSON() {
    if (!currentSongData) return
    const safeName = (currentSongData.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'song') + '.json'
    const blob = new Blob([JSON.stringify(currentSongData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = safeName
    a.click()
    URL.revokeObjectURL(url)
}
function loadTempSongNow() {
    if (!currentSongData) return
    song = currentSongData
    document.getElementById("currentSong").innerText = `${song.title} (TEMP PREVIEW)`
    renderLyrics()
    closeModal()
    startSong()
    console.log('%c✅ TEMP preview loaded', 'color:#0f0;font-size:16px')
}

// ==================== CORE STAGE LOGIC + SETLIST ====================
async function loadSetlist() {
    try {
        const res = await fetch("setlist.json")
        let raw = await res.json()
        // Support old string-array setlists for backward compatibility
        if (Array.isArray(raw) && typeof raw[0] === 'string') {
            setlist = raw.map(f => ({
                artist: "",
                title: f.replace('.json', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                file: f
            }))
        } else {
            setlist = raw
        }
    } catch (e) {
        console.warn("setlist.json missing – using demo setlist", e)
        // Fallback demo (your exact list)
        setlist = [
            {"artist":"Goldfinger","title":"99 Red Balloons","file":"99-red-balloons.json"},
            {"artist":"Bouncing Souls","title":"Hopeless Romantic","file":"hopeless-romantic.json"},
            {"artist":"My Chemical Romance","title":"Helena","file":"helena.json"},
            {"artist":"Eve 6","title":"Heres To The Night","file":"heres-to-the-night.json"},
            {"artist":"Third Eye Blind","title":"Deep Inside of You","file":"deep-inside-of-you.json"},
            {"artist":"Blink 182","title":"Feeling This","file":"feeling-this.json"},
            {"artist":"All-American Rejects","title":"Dirty Little Secret","file":"dirty-little-secret.json"},
            {"artist":"New Found Glory","title":"My Friends Over You","file":"my-friends-over-you.json"},
            {"artist":"AFI","title":"Miss Murder","file":"miss-murder.json"},
            {"artist":"The Used","title":"The Taste Of Ink","file":"the-taste-of-ink.json"},
            {"artist":"Oasis","title":"Supersonic","file":"supersonic.json"},
            {"artist":"Stroke 9","title":"Little Black Backpack","file":"little-black-backpack.json"},
            {"artist":"Turnstile","title":"Seein Stars / Birds","file":"seein-stars-birds.json"},
            {"artist":"Hum","title":"Stars","file":"stars.json"},
            {"artist":"OK Go","title":"Get Over It","file":"get-over-it.json"},
            {"artist":"Taking Back Sunday","title":"Cute Without The e","file":"cute-without-the-e.json"},
            {"artist":"Senses Fail","title":"Buried A Lie","file":"buried-a-lie.json"},
            {"artist":"Mest","title":"Cadillac","file":"cadillac.json"},
            {"artist":"The Ataris","title":"Boys of Summer","file":"boys-of-summer.json"},
            {"artist":"The Used","title":"Buried Myself Alive","file":"buried-myself-alive.json"}
        ]
    }
    loadSong()
}

async function loadSong() {
    try {
        const entry = setlist[currentSongIndex]
        const filename = entry.file
        const displayTitle = `${entry.artist} - ${entry.title}`
        
        const res = await fetch("songs/" + filename)
        song = await res.json()
        
        document.getElementById("currentSong").innerText = displayTitle
        if (currentSongIndex + 1 < setlist.length) {
            const nextEntry = setlist[currentSongIndex + 1]
            document.getElementById("nextSong").innerText = `${nextEntry.artist} - ${nextEntry.title}`
        } else {
            document.getElementById("nextSong").innerText = "—"
        }
        renderLyrics()
        renderSetlist()
    } catch (e) {
        console.error("Song load failed", e)
        const entry = setlist[currentSongIndex]
        const displayTitle = `${entry.artist} - ${entry.title} (chart not loaded)`
        document.getElementById("currentSong").innerText = displayTitle
        song = { title: displayTitle, lines: [] }
        renderLyrics()
        renderSetlist()
    }
}

function renderLyrics() {
    const lyricsEl = document.getElementById("lyrics")
    lyricsEl.innerHTML = ""
    if (!song?.lines || song.lines.length === 0) {
        const msg = document.createElement("div")
        msg.style.opacity = "0.4"
        msg.style.fontStyle = "italic"
        msg.textContent = "(no chart loaded yet – import above to add)"
        lyricsEl.appendChild(msg)
        return
    }
    song.lines.forEach(line => {
        let div = document.createElement("div")
        div.className = "line"
        div.innerHTML = `<span class="chord">${line.chord || ''}</span> ${line.lyric || ''}`
        lyricsEl.appendChild(div)
    })
}

function startSong() { startTime = Date.now(); playing = true }
function pauseSong() { playing = false }

function nextSong() {
    currentSongIndex = (currentSongIndex + 1) % setlist.length
    loadSong()
}

// Main timing loop
setInterval(() => {
    if (!playing || !song?.lines || song.lines.length === 0) return
    const elapsed = (Date.now() - startTime) / 1000

    let activeIndex = -1
    for (let i = 0; i < song.lines.length; i++) {
        if (elapsed >= song.lines[i].time) activeIndex = i
        else break
    }
    if (activeIndex >= 0) {
        document.getElementById("bigChord").innerText = song.lines[activeIndex].chord || ''
        const chords = document.querySelectorAll(".chord")
        chords.forEach(c => c.classList.remove("active"))
        if (chords[activeIndex]) chords[activeIndex].classList.add("active")
    }
    scrollLyrics(elapsed)

    if (midiPanelVisible) {
        const bpmEl = document.getElementById('liveBpm')
        bpmEl.innerText = `BPM: ${midiClock.bpm || '—'}`
    }
}, 50)

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {})
    } else {
        document.exitFullscreen()
    }
}

// BOOT
loadSetlist()
console.log('%c🎸 Guitar Stage Teleprompter READY – Full setlist + live highlight added!', 'color:#0f0;font-size:18px')
