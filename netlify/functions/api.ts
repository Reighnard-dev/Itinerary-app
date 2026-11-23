import serverless from 'serverless-http';
import {app} from '../../server/app.js';
const serve=serverless(app);
export const handler:typeof serve=(event,context)=>{
 // Accommodate both original URLs and direct Netlify function invocation paths.
 const request=event as {path?:string};
 if(request.path)request.path=request.path.replace(/^\/\.netlify\/functions\/api(?=\/)/,'');
 return serve(event,context);
};
