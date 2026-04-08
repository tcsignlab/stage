// js/stage.js – UPDATED with on-stage MIDI controls + Previous Song + Demo-ready
let setlist = []
let currentSongIndex = 0
let song
let startTime
let playing = false
let currentSongData = null
let midiPanelVisible = false

// ==================== MIDI PANEL FUNCTIONS ====================
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

// ==================== CHORD PARSER (unchanged – works great) ====================
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
function toggleModal() { /* same as before */ }
function closeModal() { /* same as before */ }
function handleFileUpload(e) { /* same as before */ }
function parseAndImport() { /* same as before */ }
function downloadSongJSON() { /* same as before */ }
function loadTempSongNow() { /* same as before */ }

// ==================== CORE STAGE + MIDI PANEL LIVE UPDATE ====================
async function loadSetlist() {
    try {
        const res = await fetch("setlist.json")
        setlist = await res.json()
        if (!Array.isArray(setlist) || setlist.length === 0) setlist = ["boys-of-summer.json", "template.json"]
    } catch (e) {
        console.warn("No setlist.json – using demo", e)
        setlist = ["boys-of-summer.json", "template.json"]
    }
    loadSong()
}

async function loadSong() {
    try {
        const filename = setlist[currentSongIndex]
        const res = await fetch("songs/" + filename)
        song = await res.json()
        document.getElementById("currentSong").innerText = song.title || filename.replace('.json','')
        const next = setlist[currentSongIndex + 1] ? setlist[currentSongIndex + 1].replace('.json','') : "—"
        document.getElementById("nextSong").innerText = next
        renderLyrics()
    } catch (e) {
        console.error("Song load failed", e)
    }
}

function renderLyrics() { /* unchanged */ }

function startSong() { startTime = Date.now(); playing = true }
function pauseSong() { playing = false }

function nextSong() {
    currentSongIndex = (currentSongIndex + 1) % setlist.length
    loadSong()
}

// Main loop – now updates live BPM when MIDI panel is open
setInterval(() => {
    if (!playing || !song?.lines) return
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

    // LIVE MIDI BPM DISPLAY
    if (midiPanelVisible) {
        const bpmEl = document.getElementById('liveBpm')
        bpmEl.innerText = `BPM: ${midiClock.bpm || '—'}`
    }
}, 50)

function toggleFullscreen() { /* unchanged */ }

// BOOT
loadSetlist()
console.log('%c🎸 Guitar Stage Teleprompter READY – MIDI buttons added + Boys Of Summer demo loaded!', 'color:#0f0; font-size:18px')
