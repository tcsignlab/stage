// js/stage.js - FULLY UPDATED with auto-import parser + editor
let setlist = []
let currentSongIndex = 0
let song
let startTime
let playing = false
let currentSongData = null // for import preview

// ==================== NEW: CHORD CHART PARSER ====================
function isChordLine(line) {
    if (!line || line.length < 2) return false
    // Remove extra spaces and split
    const tokens = line.trim().split(/\s+/).filter(t => t)
    if (tokens.length === 0) return false
    
    const chordRegex = /^[A-G][#b]?[mM]?[dim aug sus2-4]?[0-9]?[79]?[\/]?[A-G]?[#b]?$/i
    return tokens.every(token => {
        return chordRegex.test(token) ||
               token === 'N.C.' ||
               token === 'NC' ||
               /^\d+$/.test(token) || // fret numbers sometimes
               token.includes('/') // slash chords G/B
    })
}

function parseChordChart(pastedText, bpm = 120) {
    const rawLines = pastedText.split('\n')
    let lines = []
    for (let l of rawLines) {
        const trimmed = l.trim()
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
            lines.push(trimmed)
        }
    }
    
    let parsedLines = []
    let time = 0
    const beatsPerLine = 4
    const secondsPerBeat = 60 / bpm
    const secondsPerLine = beatsPerLine * secondsPerBeat
    
    let i = 0
    while (i < lines.length) {
        const current = lines[i]
        
        // Skip section headers
        if (/^\[[^\]]+\]$/.test(current)) {
            i++
            continue
        }
        
        if (isChordLine(current) && i + 1 < lines.length) {
            // Chord line followed by lyrics
            const chordTokens = current.trim().split(/\s+/).filter(Boolean)
            const mainChord = chordTokens[0] || 'N.C.'
            
            const lyric = lines[i + 1].trim()
            
            parsedLines.push({
                time: Math.round(time),
                chord: mainChord,
                lyric: lyric || ""
            })
            
            time += secondsPerLine
            i += 2
        } else {
            // Lyric-only line (or fallback)
            parsedLines.push({
                time: Math.round(time),
                chord: parsedLines.length > 0 ? parsedLines[parsedLines.length-1].chord : "",
                lyric: current
            })
            time += secondsPerLine / 2
            i++
        }
    }
    
    return parsedLines
}

// ==================== NEW: IMPORT UI FUNCTIONS ====================
function toggleModal() {
    const modal = document.getElementById('modal')
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex'
}

function closeModal() {
    document.getElementById('modal').style.display = 'none'
    // Clear preview on close
    document.getElementById('preview').innerHTML = ''
    document.getElementById('jsonPreview').style.display = 'none'
    document.getElementById('downloadBtn').style.display = 'none'
    document.getElementById('tempLoadBtn').style.display = 'none'
}

function parseAndImport() {
    const title = document.getElementById('importTitle').value.trim() || 'Untitled'
    const artist = document.getElementById('importArtist').value.trim() || 'Unknown'
    const bpm = parseFloat(document.getElementById('importBpm').value) || 120
    const pasted = document.getElementById('chartPaste').value
    
    if (!pasted.trim()) {
        alert('Paste a chord chart first!')
        return
    }
    
    const parsed = parseChordChart(pasted, bpm)
    
    currentSongData = {
        title: title,
        artist: artist,
        bpm: bpm,
        lines: parsed
    }
    
    // Preview list
    let html = `<h3>✅ Parsed ${parsed.length} lines — ${title} by ${artist} (${bpm} BPM)</h3>`
    html += `<ul style="margin:0; padding:0;">`
    parsed.forEach((l, idx) => {
        html += `<li style="padding:6px 12px; background:#1f1f1f; margin:4px 0; border-radius:4px;">
            <strong style="color:#0f0; width:70px; display:inline-block;">${l.chord}</strong> 
            ${l.lyric}
            <small style="margin-left:auto; color:#666;">${l.time}s</small>
        </li>`
    })
    html += `</ul>`
    document.getElementById('preview').innerHTML = html
    
    // Show JSON + buttons
    const jsonStr = JSON.stringify(currentSongData, null, 2)
    document.getElementById('jsonPreview').innerHTML = `<strong>song.json preview:</strong><br>${jsonStr}`
    document.getElementById('jsonPreview').style.display = 'block'
    document.getElementById('downloadBtn').style.display = 'inline-block'
    document.getElementById('tempLoadBtn').style.display = 'inline-block'
}

function downloadSongJSON() {
    if (!currentSongData) return
    const filename = (currentSongData.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'newsong') + '.json'
    const blob = new Blob([JSON.stringify(currentSongData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

function loadTempSongNow() {
    if (!currentSongData) return
    song = currentSongData
    document.getElementById("currentSong").innerText = `${song.title} (TEMP)`
    document.getElementById("nextSong").innerText = "(saved songs only)"
    renderLyrics()
    closeModal()
    // Auto-start preview
    startSong()
    console.log('%c✅ TEMP song loaded — MIDI pedal & clock ready!', 'color:#0f0; font-size:16px')
}

// ==================== ORIGINAL STAGE LOGIC (fixed + improved) ====================
async function loadSetlist() {
    try {
        setlist = await fetch("setlist.json").then(r => r.json())
        if (setlist.length === 0) setlist = ["template.json"]
        loadSong()
    } catch(e) {
        console.error("No setlist.json — using template", e)
        setlist = ["template.json"]
        loadSong()
    }
}

async function loadSong() {
    try {
        const filename = setlist[currentSongIndex]
        song = await fetch("songs/" + filename).then(r => r.json())
        document.getElementById("currentSong").innerText = song.title || filename
        if (setlist[currentSongIndex + 1]) {
            document.getElementById("nextSong").innerText = setlist[currentSongIndex + 1].replace('.json','')
        } else {
            document.getElementById("nextSong").innerText = "—"
        }
        renderLyrics()
    } catch(e) {
        console.error("Song load failed", e)
        document.getElementById("currentSong").innerText = "ERROR loading song"
    }
}

function renderLyrics() {
    const lyricsEl = document.getElementById("lyrics")
    lyricsEl.innerHTML = ""
    if (!song || !song.lines) return
    song.lines.forEach(line => {
        let div = document.createElement("div")
        div.className = "line"
        div.innerHTML = `<span class="chord">${line.chord || ''}</span> ${line.lyric || ''}`
        lyricsEl.appendChild(div)
    })
}

function startSong() {
    startTime = Date.now()
    playing = true
}

function pauseSong() {
    playing = false
}

function nextSong() {
    currentSongIndex = (currentSongIndex + 1) % setlist.length
    loadSong()
}

// Main loop - chord changes + scroll
setInterval(() => {
    if (!playing || !song || !song.lines) return
    
    let elapsed = (Date.now() - startTime) / 1000
    
    let activeIndex = -1
    song.lines.forEach((line, i) => {
        if (elapsed >= line.time) {
            activeIndex = i
        }
    })
    
    if (activeIndex >= 0) {
        document.getElementById("bigChord").innerText = song.lines[activeIndex].chord || ''
        
        let chords = document.querySelectorAll(".chord")
        chords.forEach(c => c.classList.remove("active"))
        if (chords[activeIndex]) chords[activeIndex].classList.add("active")
    }
    
    scrollLyrics(elapsed)
}, 50) // smoother than 100ms

// Fullscreen helper
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {})
    } else {
        document.exitFullscreen()
    }
}

// Auto-start
loadSetlist()

console.log('%c🎸 Guitar Stage Teleprompter READY — Import Chart button added!', 'color:#0f0; font-size:18px')
