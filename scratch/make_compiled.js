// Transpiled flightService for Node execution
const fs = require('fs');

const tsSource = fs.readFileSync('src/services/flightService.ts', 'utf-8');

// Replace export function / interface / const with CommonJS
let cjs = tsSource
  .replace(/export interface[^{]+{[^}]+}/g, '')
  .replace(/export const /g, 'const ')
  .replace(/export function /g, 'function ')
  .replace(/export async function /g, 'async function ')
  .replace(/:\s*[A-Za-z0-9_<>\[\]| '"]+/g, '') // remove simple TS types
  .replace(/<[A-Za-z0-9_<>|, ]+>/g, ''); // remove generics

cjs += `
module.exports = {
  toISODate,
  formatISODuration,
  formatISOTime,
  createDuffelCheckoutLink,
  buildGoogleFlightsUrl,
  buildKayakUrl,
  buildDecolarUrl,
  buildDirectAirlineUrl,
  searchGoogleFlightsLive,
  searchRealFlights,
  generateRealisticBenchmarkFlights,
  getCarrierLogo,
};
`;

fs.writeFileSync('scratch/flight_service_compiled.js', cjs);
console.log('Generated scratch/flight_service_compiled.js');
