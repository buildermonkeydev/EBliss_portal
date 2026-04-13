declare module '@novnc/novnc/lib/rfb' {
  export default class RFB {
    constructor(target: HTMLElement, url: string, options?: any);
    scaleViewport: boolean;
    resizeSession: boolean;
    sendCredentials(credentials: any): void;
    sendCtrlAltDel(): void;
    disconnect(): void;
    addEventListener(event: string, callback: (e: any) => void): void;
  }
}