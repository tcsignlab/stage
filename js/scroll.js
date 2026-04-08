
function scrollLyrics(elapsed){

let speed = 40
if(window.midiClock && midiClock.bpm){
    speed = midiClock.bpm * 0.6
}

document.getElementById("lyricsContainer").style.transform =
`translateY(-${elapsed*speed}px)`

}
