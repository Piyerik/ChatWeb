const mode = 'PROD'; // PROD | DEV
const prodApi = 'https://chatweb-production.up.railway.app/api';
const devApi = 'http://192.168.0.106:3000/api';

const api = mode === 'PROD' ? prodApi : devApi;
const domain = api.split('://')[1].slice(0, -4);
const secure = api.startsWith('https'); // establish secure or insecure websocket