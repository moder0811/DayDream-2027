import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

const avatars = [
  ['bear','耳機黑熊'], ['otter','雨衣水獺'], ['fox','襯衫狐狸'], ['capybara','眼鏡水豚'], ['shiba','毛衣柴犬'],
  ['rabbit','髮夾白兔'], ['calico','三花貓'], ['deer','領巾梅花鹿'], ['chinchilla','耳環絨鼠'], ['hedgehog','莓紅刺蝟'],
]
type Quiz = { id:string; date:string; title:string; category:string; tags:string[]; questions:{prompt:string; options:string[]}[]; results:{title:string;body:string}[] }
const quizzes = Object.values(import.meta.glob<Quiz>('../content/quizzes/*.json', { eager:true, import:'default' })).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id))
const portraits = import.meta.glob<string>('../avatars/*.webp', { eager:true, query:'?url', import:'default' })
const portrait = (id:string) => portraits['../avatars/'+id+'.webp']
const url = (id:string) => '?quiz='+encodeURIComponent(id)

function Face({id, level, canvasRef, onReady}:{id:string;level:number;canvasRef:React.RefObject<HTMLCanvasElement|null>;onReady:(level:number)=>void}) {
  useEffect(()=>{
    const img = new Image()
    let frame = 0
    img.onload = () => {
      const canvas=canvasRef.current
      const ctx=canvas?.getContext('2d')
      if (!ctx) return
      const size=canvas!.width
      const source=document.createElement('canvas')
      source.width=source.height=size
      const src=source.getContext('2d')!
      src.drawImage(img,0,0,size,size)
      const original=src.getImageData(0,0,size,size)
      const output=ctx.createImageData(size,size)
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
      const start=performance.now()
      function draw(now:number) {
        const progress=reduced ? 1 : Math.min(1,(now-start)/260)
        const amount=(Math.max(0,level-1)+(level===0?0:1-(1-progress)**3))*.38
        for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
          const side=x<size/2 ? .28 : .72
          const dx=x-side*size
          const dy=y-.59*size
          const falloff=Math.max(0,1-Math.hypot(dx,dy)/(size*.27))
          const sampleX=Math.round(x-dx*amount*falloff)
          const sampleY=Math.round(y-dy*amount*falloff)
          const from=(sampleY*size+sampleX)*4
          const to=(y*size+x)*4
          output.data[to]=original.data[from]
          output.data[to+1]=original.data[from+1]
          output.data[to+2]=original.data[from+2]
          output.data[to+3]=255
        }
        ctx!.putImageData(output,0,0)
        if(progress<1) frame=requestAnimationFrame(draw)
        else onReady(level)
      }
      frame=requestAnimationFrame(draw)
    }
    img.src=portrait(id)
    return ()=>{img.onload=null; cancelAnimationFrame(frame)}
  },[id,level,canvasRef,onReady])
  return <canvas ref={canvasRef} width="360" height="360" role="img" aria-label={avatars.find(a=>a[0]===id)?.[1]} />
}

function App(){
  const params=new URLSearchParams(location.search)
  const requested=params.get('quiz')
  const quiz=requested ? quizzes.find(q=>q.id===requested) : quizzes[0]
  const [view,setView]=useState(requested&&quiz?'choose':params.has('browse')?'archive':'home')
  const [category,setCategory]=useState('全部')
  const [avatar,setAvatar]=useState('bear')
  const [answers,setAnswers]=useState<number[]>([])
  const [downloadError,setDownloadError]=useState(false)
  const [drawnLevel,setDrawnLevel]=useState(-1)
  const canvas=useRef<HTMLCanvasElement>(null)
  const heading=useRef<HTMLHeadingElement>(null)
  const level=answers.length
  const resultIndex=[0,1,2,3].reduce((best,index)=>answers.filter(a=>a===index).length>answers.filter(a=>a===best).length?index:best,answers[0]??0)
  const result=quiz?.results[resultIndex]
  useEffect(()=>{if(view==='play'||view==='result')heading.current?.focus()},[view,level])

  function save(){
    if(!canvas.current||!result||!quiz||drawnLevel!==level) return
    const card=document.createElement('canvas')
    card.width=720;card.height=900
    const ctx=card.getContext('2d')
    if(!ctx) return
    ctx.fillStyle='#f7f2e5';ctx.fillRect(0,0,720,900)
    ctx.fillStyle='#253529';ctx.textAlign='center'
    ctx.font='bold 32px sans-serif';ctx.fillText('大台北社畜心理測驗',360,68,640)
    ctx.drawImage(canvas.current,108,106,504,504)
    ctx.font='bold 48px sans-serif';ctx.fillText(result.title,360,679,640)
    ctx.font='27px sans-serif';ctx.fillText(result.body,360,733,630)
    ctx.font='22px sans-serif';ctx.fillText(quiz.title,360,826,640)
    card.toBlob(blob=>{
      if(!blob){setDownloadError(true);return}
      const href=URL.createObjectURL(blob)
      const a=document.createElement('a')
      a.href=href;a.download=quiz.id+'-結果卡.png';a.click()
      setTimeout(()=>URL.revokeObjectURL(href),30000)
    },'image/png')
  }

  return <><header><a className="brand" href="./"><span className="brand-dot" aria-hidden="true"></span>大台北社畜心理測驗</a><a href="?browse">找題目</a></header>
    <main>
      {requested&&!quiz ? <section className="paper"><h1>這期題目找不到了</h1><a className="button" href="?browse">回題庫</a></section>
      :view==='archive'? <section className="paper archive"><h1>找題目</h1><div className="filters" aria-label="題目分類">{['全部',...new Set(quizzes.map(q=>q.category))].map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div><ul>{quizzes.filter(q=>category==='全部'||q.category===category).map(q=><li key={q.id}><a href={url(q.id)}><span>{q.title}</span><small>{q.category}</small></a></li>)}</ul></section>
      :quiz&&view==='home'? <section className="hero"><div className="intro"><h1>{quiz.title}</h1><p>{quiz.questions[0].prompt}</p><a className="button" href={url(quiz.id)}>選角色，開始玩</a><small>3 題 · 大約 1 分鐘</small></div><div className="cover"><img src={portrait('bear')} alt="戴耳機的毛氈黑熊"/></div></section>
      :quiz&&view==='choose'? <section className="paper"><h1>你今天想當誰？</h1><p>選一隻替你上班的動物。</p><div className="avatars" aria-label="選擇角色">{avatars.map(([id,name])=><button key={id} aria-pressed={avatar===id} onClick={()=>setAvatar(id)}><img src={portrait(id)} alt=""/><span>{name}</span></button>)}</div><button className="button" onClick={()=>setView('play')}>開始答題</button></section>
      :quiz&&(view==='play'||view==='result')? <section className="game"><div className="cover game-cover"><Face id={avatar} level={level} canvasRef={canvas} onReady={setDrawnLevel}/></div><div className="paper game-paper">{view==='play'?<><p className="progress">第 {level+1} 題，共 {quiz.questions.length} 題</p><h1 tabIndex={-1} ref={heading}>{quiz.questions[Math.min(level,quiz.questions.length-1)].prompt}</h1><div className="options">{quiz.questions[Math.min(level,quiz.questions.length-1)].options.map((option,i)=><button key={option} onClick={()=>{setAnswers([...answers,i]);if(level+1===quiz.questions.length)setView('result')}}>{option}</button>)}</div></>:<><h1 tabIndex={-1} ref={heading}>{result?.title}</h1><p>{result?.body}</p><button className="button" onClick={save} disabled={drawnLevel!==level}>儲存結果卡</button>{downloadError&&<p role="alert">存圖失敗，請再試一次。</p>}<p><button className="text-button" onClick={()=>{setAnswers([]);setDrawnLevel(-1);setDownloadError(false);setView('choose')}}>再玩一次</button> <a href="?browse">找其他題目</a></p></>}</div></section>:null}
    </main><footer>每週更新 · 休閒測驗</footer></>
}
createRoot(document.getElementById('root')!).render(<App/>)
