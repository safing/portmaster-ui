
declare module 'js-yaml-loader!*' {
  import { Action } from "src/app/services/notifications.types";
  export interface TipUp {
    title: string;
    content: string;
    url?: string;
    urlText?: string;
    actions?: Action[];
    nextKey?: string;
  }
  export interface HelpTexts {
    [key: string]: TipUp;
  }

  const content: HelpTexts;
  export default content;
}
