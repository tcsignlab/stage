function importChart(text){

const lines=text.split("\n")

let output=[]

let time=0

lines.forEach(l=>{

let parts=l.trim().split(" ")

parts.forEach(chord=>{

output.push({

time:time,
chord:chord,
lyric:""

})

time+=4

})

})

return output

}
