import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { integrationServiceFactory } from './app/integration';

if (environment.production) {
  enableProdMode();
}

if (typeof (CSS as any)['registerProperty'] === 'function') {
  (CSS as any).registerProperty({
    name: '--lock-color',
    syntax: '*',
    inherits: true,
    initialValue: '10, 10, 10'
  })
}

function handleExternalResources(e: Event) {
  // get click target
  let target: HTMLElement | null = e.target as HTMLElement;
  // traverse until we reach an a tag
  while (!!target && target.tagName !== "A") {
    target = target.parentElement;
  }

  if (!!target) {
    let href = target.getAttribute("href");
    if (href?.startsWith("blob")) {
      return
    }

    if (!!href && !href.includes(location.hostname)) {
      e.preventDefault();

      integrationServiceFactory().openExternal(href);
    }
  }
}

if (document.addEventListener) {
  document.addEventListener("click", handleExternalResources);
}

// load the font file but make sure to use the slimfix version
// windows.
{
  // we cannot use document.writeXX here as it's not allowed to
  // write to Document from an async loaded script.

  let linkTag = document.createElement("link");
  linkTag.rel = "stylesheet";
  linkTag.href = "/assets/vendor/fonts/roboto.css";
  if (navigator.platform.startsWith("Win")) {
    linkTag.href = "/assets/vendor/fonts/roboto-slimfix.css"
  }

  document.head.appendChild(linkTag);
}


platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

