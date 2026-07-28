# SimpleFrontEnd-CulturePass

## Getting Started
 - In order to Test the frontEnd you need to run the following commands:
   
   1. Install dependencies:
   `pnpm install` will install all the dependencies from package.json file.
   2. Loads an Anvil Chain with Proxy Deployed with CulturePass:
   `pnpm anvil` 
   3. Then run Vite:
   `pnpm vite`

## AdminDashboard
- This will land you to AdminDashboard:
  http://127.0.0.1:5173/admin.html --Make sure Vite is running in parallel   

- This will land you to VenuesDashboard:
  http://127.0.0.1:5173/venue.html --Make sure Vite is running in parallel 

## Note
- Whatever interactions you do with the contract it will not be saved in the state of anvil Chain.
- If you want the state to be saved you need to load the state and at the same time dump it back 
  into json for culturepass. 