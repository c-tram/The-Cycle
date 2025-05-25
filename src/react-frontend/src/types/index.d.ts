/// <reference types="react" />
/// <reference types="react-dom" />
/// <reference types="vite/client" />

import * as React from 'react';

declare global {
  namespace JSX {
    type Element = React.ReactElement;
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}

declare module '*.svg' {
  const content: any;
  export default content;
}

declare module 'react' {
  interface HTMLAttributes<T> extends React.HTMLAttributes<T> {
    [key: string]: any;
  }
}

declare module 'react-dom';
declare module 'react-router-dom';
declare module '@fortawesome/*';
declare module 'react-helmet-async';
