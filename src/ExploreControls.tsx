import { ArrowRight, Bookmark, ChevronLeft, ChevronRight, Coffee, Compass, Landmark, Leaf, Map, Mountain, Search, ShoppingBag, Sparkles, Star, Trees, Umbrella, Utensils } from 'lucide-react';
import { useRef } from 'react';
import type { Place } from '../shared/types';
import PlacePhoto, { PhotoCredit } from './PlacePhoto';

const filters = [
  { value: 'all', label: 'All places', Icon: Compass },
  { value: 'iconic', label: 'Iconic spots', Icon: Star },
  { value: 'hidden', label: 'Hidden gems', Icon: Sparkles },
  { value: 'saved', label: 'Saved', Icon: Bookmark },
];

const categories = [
  { value: 'All experiences', label: 'Everything', scene: 'terraces', Icon: Compass },
  { value: 'Restaurants', scene: 'heritage', Icon: Utensils },
  { value: 'Parks & gardens', scene: 'garden', Icon: Leaf },
  { value: 'Activities', scene: 'mountain', Icon: Mountain },
  { value: 'Culture', scene: 'heritage', Icon: Landmark },
  { value: 'Nature', scene: 'forest', Icon: Trees },
  { value: 'Food & drink', scene: 'garden', Icon: Coffee },
  { value: 'Shopping', scene: 'heritage', Icon: ShoppingBag },
  { value: 'Beaches', scene: 'coast', Icon: Umbrella },
];

interface ExploreControlsProps {
  filter: string;
  onFilter: (value: string) => void;
  category: string;
  onCategory: (value: string) => void;
  experienceCategories: string[];
  query: string;
  onQuery: (value: string) => void;
  sort: string;
  onSort: (value: string) => void;
  mapView: boolean;
  onToggleMap: () => void;
  resultCount: number;
  featured?: Place;
  onExplore: (place: Place) => void;
}

export default function ExploreControls({
  filter, onFilter, category, onCategory, experienceCategories, query, onQuery,
  sort, onSort, mapView, onToggleMap, resultCount, featured, onExplore,
}: ExploreControlsProps) {
  const rail = useRef<HTMLDivElement>(null);

  function moveRail(direction: number) {
    const row = rail.current;
    if (row) row.scrollBy({ left: direction * row.clientWidth * 0.8 });
  }

  return (
    <>
      <div className="explore-controls">
        <div className="explore-toolbar">
          <div className="explore-filters" role="group" aria-label="Filter places">
            {filters.map(({ value, label, Icon }) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => onFilter(value)}>
                <Icon size={16} aria-hidden="true" />{label}
              </button>
            ))}
          </div>
          <button type="button" className="explore-map" onClick={onToggleMap}>
            <Map size={17} aria-hidden="true" />{mapView ? 'List view' : 'Map view'}
          </button>
        </div>

        <label className="explore-search">
          <Search size={20} aria-hidden="true" />
          <input type="search" aria-label="Find a place" value={query}
            onChange={event => onQuery(event.target.value)} placeholder="Find a landmark, restaurant, park…" />
        </label>

        <div className="explore-category-heading">
          <h3>Browse by experience</h3>
          <div className="explore-arrows">
            <button type="button" aria-label="Previous categories" onClick={() => moveRail(-1)}><ChevronLeft size={17} /></button>
            <button type="button" aria-label="More categories" onClick={() => moveRail(1)}><ChevronRight size={17} /></button>
          </div>
        </div>
        <div ref={rail} className="explore-categories" role="group" aria-label="Experience types">
          {categories.map(({ value, label, scene, Icon }) => (
            <button key={value} type="button" aria-pressed={category === value} onClick={() => onCategory(value)}>
              <img src={`/images/atmosphere/${scene}.jpg`} alt="" decoding="async" />
              <span><Icon size={16} aria-hidden="true" />{label ?? value}</span>
            </button>
          ))}
        </div>

        <div className="explore-meta">
          <span role="status"><strong>{resultCount} {resultCount === 1 ? 'place' : 'places'}</strong> to explore</span>
          <div>
            <select aria-label="Experience category" value={category} onChange={event => onCategory(event.target.value)}>
              {experienceCategories.map(value => <option key={value}>{value}</option>)}
            </select>
            <label>Sort by <select aria-label="Sort places" value={sort} onChange={event => onSort(event.target.value)}>
              <option>Recommended</option>
              <option>Top rated</option>
              <option>Name: A–Z</option>
            </select></label>
          </div>
        </div>
        <a className="explore-art-credit" href="/atmosphere.html" target="_blank" rel="noreferrer">
          About the AI-generated category artwork
        </a>
      </div>

      {featured && (
        <article className="explore-feature">
          <div className="explore-feature-photo">
            <PlacePhoto place={featured} />
            <PhotoCredit place={featured} />
          </div>
          <div className="explore-feature-copy">
            <span><Star size={14} aria-hidden="true" /> Featured place</span>
            <h3>{featured.name}</h3>
            <p>{featured.city}, {featured.country}</p>
          </div>
          <button type="button" aria-label={`View featured place: ${featured.name}`} onClick={() => onExplore(featured)}>
            Explore <ArrowRight size={16} aria-hidden="true" />
          </button>
        </article>
      )}
    </>
  );
}
