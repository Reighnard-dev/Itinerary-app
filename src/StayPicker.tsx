import {useEffect, useId, useRef, useState} from 'react';
import {CalendarDays, ChevronLeft, ChevronRight, Minus, Plus, Sun, X} from 'lucide-react';
import {departureFor, inclusiveDays} from './stay-dates';

const weekdays = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const shortDate = new Intl.DateTimeFormat('en', {month:'short', day:'numeric', year:'numeric'});
const fullDate = new Intl.DateTimeFormat('en', {dateStyle:'full'});
const monthTitle = new Intl.DateTimeFormat('en', {month:'long', year:'numeric'});
const fromIso = (value: string) => new Date(value + 'T12:00:00');
const toIso = (value: Date) => [
  String(value.getFullYear()).padStart(4,'0'),
  String(value.getMonth() + 1).padStart(2,'0'),
  String(value.getDate()).padStart(2,'0'),
].join('-');

export function StayPicker({date, days, setDate, setDays, open, onToggle, onClose, variant = 'destination'}: {
  date: string; days: number; setDate: (date: string) => void; setDays: (days: number) => void;
  open: boolean; onToggle: () => void; onClose: () => void;
  variant?: 'destination'|'itinerary';
}) {
  const id = useId();
  const root = useRef<HTMLElement>(null);
  const arrivalTrigger = useRef<HTMLButtonElement>(null);
  const departureTrigger = useRef<HTMLButtonElement>(null);
  const [month, setMonth] = useState(new Date());
  const [selecting, setSelecting] = useState<'arrival'|'departure'>('arrival');
  const today = toIso(new Date());
  const start = date ? fromIso(date) : null;
  const endIso = departureFor(date, days);
  const end = endIso ? fromIso(endIso) : null;
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = first.getDay();
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const length = `${days} ${days === 1 ? 'day' : 'days'}`;
  const itinerary = variant === 'itinerary';
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
    };
  }, [open, onClose]);
  function close() {
    onClose();
    (selecting === 'departure' ? departureTrigger : arrivalTrigger).current?.focus();
  }
  function moveMonth(step: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + step, 1, 12));
  }
  function show(endpoint: 'arrival'|'departure') {
    const target = endpoint === 'departure' && end ? end : start ?? new Date();
    setSelecting(date ? endpoint : 'arrival');
    setMonth(new Date(target.getFullYear(), target.getMonth(), 1, 12));
    if (!open) onToggle();
  }
  function choose(iso: string) {
    if (selecting === 'arrival' || !date) {
      const previousDeparture = departureFor(date, days);
      setDate(iso);
      const preserved = previousDeparture ? inclusiveDays(iso, previousDeparture) : 0;
      setDays(preserved >= 1 && preserved <= 30 ? preserved : 1);
      setSelecting('departure');
      return;
    }
    const duration = inclusiveDays(date, iso);
    if (duration < 1 || duration > 30) return;
    setDays(duration);
    onClose();
    departureTrigger.current?.focus();
  }
  return <section ref={root} className={`destination-step stay-step${itinerary ? ' itinerary-stay' : ''}`} onKeyDown={event => {
    if (open && event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  }}>
    {!itinerary && <div className="destination-step-title"><CalendarDays/>Set your stay</div>}
    <div className="stay-controls">
      <button className="stay-date" type="button" ref={arrivalTrigger} aria-expanded={open && selecting === 'arrival'}
        aria-controls={open ? id : undefined} aria-label={`Arrival date${start ? ` ${fullDate.format(start)}` : ''}`}
        onClick={() => show('arrival')}>
        <CalendarDays size={18}/>
        <span><small>Arrival</small>{start ? shortDate.format(start) : 'Choose a date'}</span>
      </button>
      <button className="stay-date" type="button" ref={departureTrigger} aria-expanded={open && selecting === 'departure'}
        aria-controls={open ? id : undefined} aria-label={`Departure date${end ? ` ${fullDate.format(end)}` : ''}`}
        onClick={() => show('departure')}>
        <CalendarDays size={18}/>
        <span><small>Departure</small>{end ? shortDate.format(end) : 'Choose a date'}</span>
      </button>
      <div className="stay-duration" role="group" aria-label="Trip length">
        <button type="button" aria-label="Decrease trip length" disabled={days <= 1}
          onClick={() => setDays(days - 1)}><Minus size={17}/></button>
        <output aria-label="Number of days">{length}</output>
        <button type="button" aria-label="Increase trip length" disabled={days >= 30}
          onClick={() => setDays(days + 1)}><Plus size={17}/></button>
      </div>
    </div>
    <div className="stay-summary"><Sun size={14}/>
      {start && end ? `${length} · ${shortDate.format(start)} – ${shortDate.format(end)}` : 'Choose your arrival and departure'}
    </div>
    {open && <div className="destination-popover stay-calendar" id={id} role="region" aria-label="Trip calendar">
      <div className="destination-popover-head">
        <strong>When’s the adventure?</strong>
        <button type="button" className="icon-btn" aria-label="Close calendar" onClick={close}><X size={17}/></button>
      </div>
      <div className="stay-range-preview" role="group" aria-label="Choose date to edit">
        <button type="button" className={selecting === 'arrival' ? 'active' : ''} onClick={() => show('arrival')}>
          <small>Arrival</small><strong>{start ? shortDate.format(start) : 'Choose date'}</strong>
        </button>
        <span aria-hidden="true">→</span>
        <button type="button" className={selecting === 'departure' ? 'active' : ''} onClick={() => show('departure')}>
          <small>Departure</small><strong>{end ? shortDate.format(end) : 'Choose date'}</strong>
        </button>
      </div>
      <p className="stay-calendar-instruction">{selecting === 'arrival' ? 'Choose your arrival date' : 'Choose your departure date'}</p>
      <div className="stay-month">
        <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={17}/></button>
        <strong aria-live="polite">{monthTitle.format(month)}</strong>
        <button type="button" className="icon-btn" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={17}/></button>
      </div>
      <div className="stay-grid">
        {weekdays.map(day => <span key={day} aria-hidden="true">{day}</span>)}
        {Array.from({length:offset}, (_, index) => <span key={`blank-${index}`} aria-hidden="true"/>)}
        {Array.from({length:dayCount}, (_, index) => {
          const day = new Date(month.getFullYear(), month.getMonth(), index + 1, 12);
          const iso = toIso(day);
          const duration = date ? inclusiveDays(date, iso) : 0;
          const unavailable = selecting === 'departure' && Boolean(date) && (duration < 1 || duration > 30);
          return <button type="button" key={iso} aria-label={fullDate.format(day)}
            aria-pressed={iso === date || iso === endIso} aria-current={iso === today ? 'date' : undefined}
            disabled={unavailable} data-arrival={iso === date ? true : undefined}
            data-departure={iso === endIso ? true : undefined}
            data-range={date && endIso && iso > date && iso < endIso ? true : undefined}
            onClick={() => choose(iso)}>{index + 1}</button>;
        })}
      </div>
      <div className="stay-calendar-footer">
        <button type="button" onClick={() => {setDate(''); setSelecting('arrival'); onClose();}}>Clear dates</button>
        <button type="button" onClick={() => {setDate(today); setSelecting('departure');}}>{itinerary ? 'Today' : 'Arrive today'}</button>
      </div>
    </div>}
  </section>;
}
