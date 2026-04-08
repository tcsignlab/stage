// js/scroll.js – AUDIT FIX: removed window. reference (now uses global var from midi.js)
function scrollLyrics(elapsed) {
    let speed = 40
    if (midiClock && midiClock.bpm > 0) {
        speed = midiClock.bpm * 0.6
    }
    document.getElementById("lyricsContainer").style.transform =
    `translateY(-${elapsed * speed}px)`
}
