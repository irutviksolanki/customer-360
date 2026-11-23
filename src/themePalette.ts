export type ThemePreference='light'|'dark'|'system';
export function parseThemePreference(value:string|null):ThemePreference{return value==='light'||value==='dark'?value:'system'}
export function resolveTheme(preference:ThemePreference,system:string|null|undefined){return preference==='system'?(system==='dark'?'dark':'light'):preference}
export const lightColors={
  green:'#1D5179',accent:'#1D5179',onAccent:'#ffffff',dark:'#20332e',muted:'#66776f',line:'#e1e8ed',
  bg:'#f6f9fb',surface:'#ffffff',elevated:'#f0f5f8',soft:'#e7f3f8',red:'#9f3c44',amber:'#98651b',
  positiveBg:'#e9f7ef',positiveInk:'#176A3A',warningBg:'#fff5e4',negativeBg:'#fceeee',
  infoBg:'#ecf1fd',infoInk:'#4566a5',purpleBg:'#f4edfc',purpleInk:'#8052a5',
  inputBorder:'#dce7ed',accentBorder:'#9bd5e8',redBorder:'#e5b7b7',avatarBg:'#e6eff5',avatarInk:'#1D5179',
  toastBg:'#253D5E',toastInk:'#ffffff',overlay:'#102b2666',
};
export type ThemeColors=typeof lightColors;
export const darkColors:ThemeColors={
  green:'#7dd3fc',accent:'#1D5179',onAccent:'#ffffff',dark:'#f5f5f5',muted:'#b5b5b5',line:'#303030',
  bg:'#000000',surface:'#0b0b0b',elevated:'#141414',soft:'#1d1d1d',red:'#f2a1a9',amber:'#edc57d',
  positiveBg:'#153122',positiveInk:'#91e0b3',warningBg:'#322918',negativeBg:'#351c22',
  infoBg:'#1b2532',infoInk:'#b6d9ff',purpleBg:'#302339',purpleInk:'#debfff',
  inputBorder:'#404040',accentBorder:'#3b82a0',redBorder:'#86505b',avatarBg:'#202020',avatarInk:'#8edcf5',
  toastBg:'#f3f3f3',toastInk:'#111111',overlay:'#000000bb',
};
