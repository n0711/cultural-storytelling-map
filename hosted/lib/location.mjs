export const CYPRUS_BOUNDS = {south:34.4,north:35.8,west:32.1,east:34.7};
export function withinCyprusBounds(latitude,longitude) {
 return Number.isFinite(latitude)&&Number.isFinite(longitude)&&latitude>=CYPRUS_BOUNDS.south&&latitude<=CYPRUS_BOUNDS.north&&longitude>=CYPRUS_BOUNDS.west&&longitude<=CYPRUS_BOUNDS.east;
}
export function publicMapPoint(latitude,longitude) {
 if(!withinCyprusBounds(latitude,longitude))return null;
 return {latitude:Math.round(latitude*1000)/1000,longitude:Math.round(longitude*1000)/1000};
}
