import {useState,type FormEvent} from 'react';
import {supabase} from './api';
import {sendPasswordReset} from './lib/auth';
export function PasswordRecovery({onClose}:{onClose:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');try{const password=String(new FormData(e.currentTarget).get('password'));if(!supabase)throw new Error('Open your recovery email again.');const {error}=await supabase.auth.updateUser({password});if(error)throw error;await supabase.auth.signOut();setDone(true);}catch(err){setError((err as Error).message);}finally{setBusy(false);}}
 return <><h2>Choose a new password</h2>{done?<p role="status">Password updated. Sign in with your new password.</p>:<form onSubmit={submit} className="auth-form"><label className="field"><span>New password</span><input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required/></label>{error&&<p role="alert">{error}</p>}<button className="btn btn-yellow full" disabled={busy}>Update password</button></form>}<button className="text-btn" onClick={onClose}>Close</button></>;
}
export function RecoveryRequest({cloud}:{cloud:boolean}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMessage('');try{const email=String(new FormData(e.currentTarget).get('email'));await sendPasswordReset(email);setMessage('If an account exists for this email, a recovery link will arrive shortly. Check your spam folder too.');}catch(err){setMessage((err as Error).message);}finally{setBusy(false);}}
 return <div className="account-recovery"><button className="text-btn" onClick={()=>setOpen(!open)}>Forgot password?</button>{open&&(cloud?<form onSubmit={submit} className="auth-form"><label className="field"><span>Recovery email</span><input type="email" name="email" required maxLength={254} autoComplete="email"/></label><button className="btn btn-outline" disabled={busy}>Send recovery link</button><p role="status">{message}</p></form>:<p>Local preview accounts have no email service. Use a new demo account, or use the hosted app to recover your cloud account.</p>)}</div>;
}
