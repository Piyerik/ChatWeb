const mode = 'PROD'; // PROD | DEV
const prodApi = 'https://chatweb-production.up.railway.app';
const devApi = 'http://localhost:3000';

const api = mode === 'PROD' ? prodApi : devApi;
const domain = api.split('://')[1];
const secure = api.startsWith('https'); // establish secure or insecure websocket