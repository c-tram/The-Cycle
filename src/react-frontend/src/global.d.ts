/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from 'react';

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module 'react' {
  interface HTMLAttributes<T> extends React.HTMLAttributes<T> {
    // extends React's HTMLAttributes
    [key: string]: any;
  }
}

declare global {
  namespace JSX {
    type Element = React.ReactElement;
    interface IntrinsicElements extends React.JSX.IntrinsicElements {
      // Add any custom elements here if needed
    }
  }
}

declare module 'react-dom'
declare module 'react-router-dom'
declare module '@fortawesome/*'
declare module 'react-helmet-async'
