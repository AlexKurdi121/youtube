export interface ConsoleMessage {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: number;
  level?: string;
}

export interface HeadersData {
  [key: string]: string | string[];
}

export interface NavigationState {
  currentUrl: string;
  history: string[];
  historyIndex: number;
  isLoading: boolean;
}

export interface ProxyRequest {
  url: string;
  method: string;
  headers: HeadersData;
  body?: any;
}

export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: HeadersData;
  body: any;
  isBinary: boolean;
}

export interface ProxyConfig {
  timeout: number;
  maxRedirects: number;
  followRedirects: boolean;
  preserveCookies: boolean;
  rewriteUrls: boolean;
  rewriteCSP: boolean;
  rewriteCookies: boolean;
}

export interface ResourceRewriter {
  rewriteHTML(html: string, baseUrl: string): string;
  rewriteCSS(css: string, baseUrl: string): string;
  rewriteJavaScript(js: string, baseUrl: string): string;
  rewriteJSON(json: string, baseUrl: string): string;
  rewriteXML(xml: string, baseUrl: string): string;
}