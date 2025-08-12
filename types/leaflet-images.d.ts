declare module 'leaflet/dist/images/marker-icon.png' {
  const src: string;
  export default src;
}
declare module 'leaflet/dist/images/marker-icon-2x.png' {
  const src: string;
  export default src;
}
declare module 'leaflet/dist/images/marker-shadow.png' {
  const src: string;
  export default src;
}

/* 念のため、汎用PNG宣言も */
declare module '*.png' {
  const src: string;
  export default src;
}
