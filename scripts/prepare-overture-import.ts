import {readFileSync,writeFileSync} from 'node:fs';
import world from '../shared/world-cities.json' with {type:'json'};
import codes from '../shared/expansion-countries.json' with {type:'json'};
const catalog=JSON.parse(readFileSync('data/sources/world-expansion/overture-catalog.json','utf8'));
const release=String(catalog.latest);if(!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(release))throw new Error('Invalid Overture release');
const countries=world.countries.filter(c=>codes.includes(c.code));
const cities=countries.flatMap(country=>country.cities.map(city=>{
 const delta=20/(111.195*Math.cos(city.lat*Math.PI/180));
 return {code:country.code,country:country.country,city:city.name,city_id:city.id,lat:city.lat,lng:city.lng,west:Math.max(-180,city.lng-delta),east:Math.min(180,city.lng+delta),south:city.lat-20/111.195,north:city.lat+20/111.195};
}));
writeFileSync('data/sources/world-expansion/overture-cities.json',JSON.stringify(cities));
const categoryGroups:Record<string,string[]>={
 Restaurants:['restaurant','fast_food_restaurant'],
 'Food & drink':['cafe','coffee_shop','bar','brewery','distillery','winery','tea_house'],
 'Parks & gardens':['park','national_park','garden','botanical_garden'],
 Culture:['museum','art_gallery','historic_site','monument','castle','lighthouse','public_fountain','public_plaza','science_attraction','religious_site','buddhist_place_of_worship','hindu_place_of_worship','muslim_place_of_worship','christian_place_of_worship','jewish_place_of_worship','other_place_of_worship'],
 Activities:['zoo','aquarium','amusement_park','theme_park','water_park','golf_course','recreational_trail_or_path','climbing_facility','bowling_alley','skating_rink','performing_arts_venue','theatre_venue','music_venue','movie_theater'],
 Nature:['nature_reserve','forest','mountain','waterfall','cave'],Beaches:['beach'],Shopping:['farmers_market','shopping_mall'],
};
const quote=(v:string)=>`'${v.replaceAll("'","''")}'`;
const categoryCase=Object.entries(categoryGroups).map(([category,values])=>`WHEN basic_category IN (${values.map(quote).join(',')}) THEN ${quote(category)}`).join('\n');
const supplementalCategories=categoryGroups.Culture.slice(9);
const supplement=process.argv.includes('--supplement');
const sql=`SET extension_directory='data/tools/duckdb-extensions';
LOAD httpfs; LOAD spatial; SET s3_region='us-west-2'; SET threads=4; SET memory_limit='1500MB'; SET temp_directory='data/sources/world-expansion/duckdb-tmp';
${supplement?'INSERT INTO source_places':'CREATE TABLE IF NOT EXISTS source_places AS'}
SELECT id,geometry,names.primary AS name,bbox.xmin AS lng,bbox.ymin AS lat,basic_category,CASE ${categoryCase} END AS category,
addresses[1].country AS code,addresses[1].locality AS locality,addresses[1].freeform AS address,websites[1] AS website,phones[1] AS phone,confidence,sources
FROM read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=places/type=place/*.parquet')
WHERE addresses[1].country IN (${codes.map(quote).join(',')})
AND confidence>=0.85 AND (operating_status IS NULL OR operating_status='open')
AND names.primary IS NOT NULL AND basic_category IN (${(supplement?supplementalCategories:Object.values(categoryGroups).flat()).map(quote).join(',')})
${supplement?'AND id NOT IN (SELECT id FROM source_places)':''}
AND NOT (basic_category IN ('park','garden','national_park') AND regexp_matches(lower(names.primary),'car ?park|parking|parkade|garage|parqueadero'));
SELECT count(*) AS source_places FROM source_places;
CREATE OR REPLACE TABLE target_cities AS SELECT *,ST_MakeEnvelope(west,south,east,north) AS extent FROM read_json_auto('data/sources/world-expansion/overture-cities.json');
CREATE OR REPLACE TABLE candidate_pairs AS
SELECT p.id,c.city_id,c.code AS city_code,((p.lat-c.lat)*111.195)^2+((p.lng-c.lng)*111.195*cos(radians(c.lat)))^2 AS distance_squared
FROM source_places p JOIN target_cities c ON ST_Intersects(p.geometry,c.extent);
CREATE OR REPLACE TABLE nearest_places AS
SELECT p.*,c.country,c.city,c.city_id,x.distance_squared
FROM source_places p JOIN candidate_pairs x ON p.id=x.id JOIN target_cities c ON c.city_id=x.city_id AND c.code=x.city_code
WHERE p.code=c.code AND x.distance_squared<=400
QUALIFY row_number() OVER(PARTITION BY p.id ORDER BY x.distance_squared,c.city_id)=1;
COPY (
 SELECT * EXCLUDE(geometry) FROM nearest_places
 QUALIFY row_number() OVER(PARTITION BY code,city_id,category ORDER BY basic_category IN (${supplementalCategories.map(quote).join(',')}),confidence DESC,website IS NOT NULL DESC,distance_squared,id)<=6
) TO 'data/sources/world-expansion/overture-import.json' (FORMAT JSON, ARRAY true);
SELECT count(*) AS matched_places,count(DISTINCT code || ':' || city_id) AS cities FROM nearest_places;
`;
writeFileSync('data/sources/world-expansion/overture-import.sql',sql);
writeFileSync('data/sources/world-expansion/overture-release.json',JSON.stringify({release,catalogUrl:'https://stac.overturemaps.org/catalog.json',sourceUrl:`https://docs.overturemaps.org/release/${release}/`,preparedAt:new Date().toISOString()},null,2));
console.log(`Prepared ${release} import for ${cities.length} cities.`);
