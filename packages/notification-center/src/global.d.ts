declare module '*.png' {
  const value: any;
  export = value;
}

declare module '*.webp' {
  const value: any;
  export = value;
}

declare module '*.svg' {
  const value: any;
  export = value;
}

interface IMessagePayload {
  type: string;
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

declare interface Window {
  parentIFrame: {
    sendMessage: (payload: IMessagePayload) => void;
  };
}
