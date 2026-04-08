let setlist=[]
let currentSongIndex=0
let song
let startTime
let playing=false

async function loadSetlist(){

setlist=await fetch("setlist.json").then(r=>r.json())

loadSong()

}

async function loadSong(){

song=await fetch("songs/"+setlist[currentSongIndex]).then(r=>r.json())

document.getElementById("currentSong").innerText=song.title

if(setlist[currentSongIndex+1]){

document.getElementById("nextSong").innerText=
"Next: "+setlist[currentSongIndex+1]

}

renderLyrics()

}

function renderLyrics(){

const lyrics=document.getElementById("lyrics")
lyrics.innerHTML=""

song.lines.forEach(line=>{

let div=document.createElement("div")

div.className="line"

div.innerHTML=`<span class="chord">${line.chord}</span> ${line.lyric}`

lyrics.appendChild(div)

})

}

function startSong(){

startTime=Date.now()

playing=true

}

function nextSong(){

currentSongIndex++

loadSong()

}

setInterval(()=>{

if(!playing)return

let elapsed=(Date.now()-startTime)/1000

song.lines.forEach((line,i)=>{

if(elapsed>=line.time){

document.getElementById("bigChord").innerText=line.chord

let chords=document.querySelectorAll(".chord")

chords.forEach(c=>c.classList.remove("active"))

if(chords[i]) chords[i].classList.add("active")

}

})

document.getElementById("lyricsContainer").style.transform=
`translateY(-${elapsed*40}px)`

},100)

loadSetlist()
