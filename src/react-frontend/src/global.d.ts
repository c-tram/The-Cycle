/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

declare module '*.svg' {
  const content: string;
  export default content;
}

// Declare module augmentation for external libraries
declare module 'react-dom' {}
declare module 'react-router-dom' {}
declare module '@fortawesome/*' {}
declare module 'react-helmet-async' {}
