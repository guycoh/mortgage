// xml2js.d.ts
declare module 'xml2js' {
    export class Parser {
      constructor(options?: any);
      parseStringPromise(xml: string): Promise<any>;
    }
  }
  