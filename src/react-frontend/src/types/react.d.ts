import 'react'

declare module 'react' {
  interface HTMLAttributes<T> {
    className?: string;
    style?: React.CSSProperties;
  }
  
  interface DOMAttributes<T> {
    children?: React.ReactNode;
  }
  
  interface IntrinsicElements {
    div: HTMLAttributes<HTMLDivElement>;
    span: HTMLAttributes<HTMLSpanElement>;
    input: HTMLAttributes<HTMLInputElement>;
    header: HTMLAttributes<HTMLElement>;
    button: HTMLAttributes<HTMLButtonElement>;
    h1: HTMLAttributes<HTMLHeadingElement>;
    h2: HTMLAttributes<HTMLHeadingElement>;
    h3: HTMLAttributes<HTMLHeadingElement>;
    h4: HTMLAttributes<HTMLHeadingElement>;
    h5: HTMLAttributes<HTMLHeadingElement>;
    h6: HTMLAttributes<HTMLHeadingElement>;
    p: HTMLAttributes<HTMLParagraphElement>;
    a: HTMLAttributes<HTMLAnchorElement>;
    ul: HTMLAttributes<HTMLUListElement>;
    li: HTMLAttributes<HTMLLIElement>;
    nav: HTMLAttributes<HTMLElement>;
    main: HTMLAttributes<HTMLElement>;
    footer: HTMLAttributes<HTMLElement>;
    img: HTMLAttributes<HTMLImageElement>;
  }
}
