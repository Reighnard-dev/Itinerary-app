import {useEffect,useState} from 'react';
import {Pause,Play,MapPin} from 'lucide-react';
import {heroSlides} from '../shared/catalog';

export default function HeroSlideshow(){
 const [current,setCurrent]=useState(0),[incoming,setIncoming]=useState<number|null>(null),[paused,setPaused]=useState(false);
 const [reducedMotion,setReducedMotion]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReducedMotion(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{
  if(paused||reducedMotion||incoming!==null||heroSlides.length<2)return;
  let cancelled=false;
  const timer=window.setTimeout(async()=>{
   // Decode before fading; keep the current, fully opaque photograph underneath.
   for(let step=1;step<heroSlides.length;step++){
    const next=(current+step)%heroSlides.length;const photo=new Image();photo.src=heroSlides[next].image;
    try{await photo.decode();if(!cancelled)setIncoming(next);return;}catch{/* Skip an unavailable photo without blanking the header. */}
   }
  },6500);
  return()=>{cancelled=true;window.clearTimeout(timer);};
 },[current,incoming,paused,reducedMotion]);
 useEffect(()=>{if(incoming!==null&&reducedMotion){setCurrent(incoming);setIncoming(null);}},[incoming,reducedMotion]);
 return <><div className="hero-slides" aria-hidden="true">{heroSlides.map((slide,index)=><img key={slide.image} className="hero-slide" src={slide.image} alt="" decoding="async" loading={index<2?'eager':'lazy'} fetchPriority={index===0?'high':'auto'} data-active={index===current} data-incoming={index===incoming} onTransitionEnd={event=>{if(event.propertyName==='opacity'&&index===incoming){setCurrent(index);setIncoming(null);}}}/>)}</div><div className="hero-slide-counter">{String(current+1).padStart(2,'0')} <span>/ {heroSlides.length} destinations</span></div><div className="hero-location"><MapPin size={14}/><span>{heroSlides[current].label}</span></div>{heroSlides[current].credit&&<a className="hero-photo-credit" href={heroSlides[current].credit.url} target="_blank" rel="noreferrer">{heroSlides[current].credit.label}</a>}<button type="button" className="hero-playback" aria-label={paused?'Play destination slideshow':'Pause destination slideshow'} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={13}/>:<Pause size={13}/>}</button></>;
}
