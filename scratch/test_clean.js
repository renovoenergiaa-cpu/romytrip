const raw = 'CAISA0JSTBoECOqoBSJwCl0KWwoDR1JVEhkyMDI2LTEwLTE1VDA0OjM1OjAwLTAzOjAwGgNHSUciGTIwMjYtMTAtMTVUMDU6NDA6MDAtMDM6MDAqAkczMgQxNTI0OgJHM0IEMTUyNEgBUgM3MzgSBAgDEAEYASgAMgUKA0dvbA\\u003d\\u003d\\';

const cleaned = raw.replace(/\\u003d/g, '=').replace(/\\/g, '');
console.log('Original:', raw);
console.log('Cleaned:', cleaned);
console.log('Encoded for URL:', encodeURIComponent(cleaned));
