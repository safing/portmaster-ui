# Portmaster

Welcome to the new Portmaster User-Interface. It's based on Angular and is built, unit and e2e tested using `@angular/cli`.

## Hacking Quick Start

Although everything should work in the docker container as well, for the best development experience it's recommended to install `@angular/cli` locally.

It's highly recommended to:
- Use [VSCode](https://code.visualstudio.com/) (or it's oss or server-side variant) with
  - the official [Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template) extension
  - the [Tailwind CSS Extension Pack](https://marketplace.visualstudio.com/items?itemName=andrewmcodes.tailwindcss-extension-pack) extension

### Folder Structure

From the project root (the folder containing this [README.md](./)) there are only two folders with the following content and structure:

- **`src/`** contains the actual application sources:
  - **`app/`** contains the actual application sources (components, services, uni tests ...)
    - **`pages/`** contains the different pages of the application. A page is something that is associated with a dedicated application route.
    - **`services/`** contains shared services (like PortAPI and friends)
    - **`shared/`** contains shared components that are likely used accross other components or pages.
    - **`debug/`** contains a debug sidebar component
  - **`assets/`** contains static assets that must be shipped seperately.
  - **`environments/`** contains build and production related environment settings (those are handled by `@angular/cli` automatically, see [angular.json](angular.json))
- **`e2e/`** contains end-to-end testing sources.



### Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

In development mode (that is, you don't pass `--prod`) the UI expects portmaster running at `ws://127.0.0.1:817/api/database/v1`. See [environment](./src/app/environments/environment.ts).

### Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

### Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

### Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

### Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
