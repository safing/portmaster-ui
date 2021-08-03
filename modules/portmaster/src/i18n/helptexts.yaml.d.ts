declare module 'js-yaml-loader!*' {
  export interface HelpTexts {
    [key: string]: {
      title: string;
      content: string;
      url?: string;
      urlText?: string;
    }
  }

  const content: HelpTexts;
  export default content;
}
