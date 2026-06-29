## Getting Started
Next-js Project Visitor Frontend for Culturepass.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Code Architecture

-> All the pages.tsx made in app inside src will be wrapped inside layout.tsx.

-> Layout has connect Button that helps us connect to metamask, connect Button uses Rainbowkit style and layout.

-> providers.tsx allows us to integrate wagmi and rainbowKit into our layout which will then be used by our pages.

-> Components are the folders inside src where the specific part about the page e.g a hero card lives which is in turn added in 
   page.tsx.

-> Lib in src have the configuration(rainbowKit) and constants(abi, proxy address).

-> utils in src have some formatting or categories files used by components.

## Starting Point
- Start Reading Code in this Order for Maximum understanding:
  1. RainbowKitConfig.tsx in lib
  2. Providers.tsx in src/app
  3. layout.tsx in src/app
  4. providers.tsx in src/app

- Every component goes as HTML format inside return in home function in page.tsx in src/app.

## Tailwindcss 
This is something that you will see all around HTML for styling purposes so do not let this stop you.

## Run Anvil Node 
Make sure to run Anvil node parallel to vite server by running `pnpm anvil` or `npm anvil`.

## Dependencies
Cloning this in your pc will bring all the red lines over the project as you might have to install the dependencies for this project. Please refer to package.json to know more about dependencies of this project.

