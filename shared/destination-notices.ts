export function destinationNotice(country:string,city:string){
 if(country==='Ukraine')return 'Listings and photographs may predate wartime damage or closure. Check current official Ukraine travel advice and local access restrictions before planning a visit.';
 if(country==='United States Minor Outlying Islands')return city==='Midway Atoll'?'Midway Atoll is closed to public visitation; entry requires permits. These listings are for geographic exploration.':city==='Palmyra Atoll'?'Palmyra Atoll requires prior approval and strict environmental access arrangements. A listing does not mean public admission.':'Wake Island has restricted access controlled by the U.S. Air Force. These listings do not imply public admission.';
 return '';
}
