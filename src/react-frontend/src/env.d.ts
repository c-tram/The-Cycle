/// <reference types="react" />
/// <reference types="react-dom" />

declare module 'react' {
  export const useState: any;
  export const useEffect: any;
  export const useRef: any;
  export const createContext: any;
  export const useContext: any;
  export const createElement: any;
  export const Fragment: any;
  export const ReactElement: any;
  export const ReactNode: any;
}

declare module 'react-helmet-async' {
  export const Helmet: any;
  export const HelmetProvider: any;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '@fortawesome/*'
declare module 'react-router-dom'
