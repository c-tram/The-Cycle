/// <reference types="react" />

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.svg" {
  import type * as React from "react";
  const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  export default ReactComponent;
}

declare namespace React {
  interface DOMAttributes<T> {
    onResize?: ReactEventHandler<T>;
    onResizeCapture?: ReactEventHandler<T>;
    nonce?: string;
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: "development" | "production" | "test";
    readonly PUBLIC_URL: string;
  }
}
