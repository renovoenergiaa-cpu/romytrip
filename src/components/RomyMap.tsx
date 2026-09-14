import { Platform } from 'react-native';

const RomyMap = Platform.OS === 'web'
  ? require('./RomyMap.web').default
  : require('./RomyMap.native').default;

export default RomyMap;
export * from './RomyMap.web';

