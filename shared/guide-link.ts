export function guideTitle(city:string){return city.split(' (')[0].split(' · ')[0];}
export function guideLink(city:string){return `https://en.wikivoyage.org/wiki/${encodeURIComponent(guideTitle(city).replaceAll(' ','_'))}`;}
