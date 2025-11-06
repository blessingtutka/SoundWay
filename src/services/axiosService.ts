import axios from 'axios';
import { Platform } from 'react-native';

const instance = axios.create({
  headers: {
    'User-Agent': `Soundway/${Platform.OS}/1.0 (blessingtuteka@gmail.com)`,
    'Accept-Language': 'en',
  },
});

export default instance;
