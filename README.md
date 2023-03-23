# ChatCierge

## Purpose
A demo app using OpenAI's text generation API and Suiteness hotel data.
The app uses OpenAI's API, [Supabase](https://supabase.com/) for the data,  and deploys using Cloudflare Pages.

## Getting started
- You will need Node 16+ installed. Run ``` npm install ``` within the directory.

- Copy the file ```.env.example``` to ```env.local```. You will need to include all the env vars.

- To run locally do ```npm start```.

## App framework and layout.
The app is built using [Qwik](https://qwik.builder.io/docs/) and typescript.
Qwik uses file based routing to structure pages. Look in ```src/routes/index.tsx``` for the entry point to the app.
The css for the app is contained in ```src/global.css```

Remember to run ```npm run build``` before commiting any changes to ensure full type-schecking and linting.
Deploying to Cloudflare will run this step and failing the build will prevent a deploy.
