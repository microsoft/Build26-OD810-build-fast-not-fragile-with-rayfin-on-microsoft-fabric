# Contoso Chef

Create a new Rayfin app called Contoso Chef: it's a recipe sharing website, that you can use to store your personal (private) recipes and seek for meal inspiration.

## MVP features

### Recipes

Adding new recipes needs auth.
A recipe can be:
- private (default): only visible to the creator, not-discoverable. Need to be authenticated.
- unlisted: shared with unique link, only accessible to people with the link, not-discoverable
- public: can be viewed by anyone, discoverable.

Recipes have optional nutrition information. 

### Likes (=favorites)

Authenticated users can like recipes. This action is a simple toggle: if the user has already liked the recipe, clicking the like button will remove their like; if they haven't liked it yet, clicking the button will add their like. The total number of likes for each recipe is displayed on the recipe page, and users can see who has liked a recipe by clicking on the like count, which will show a list of users who have liked it.

Users have a "Liked" section in their profile where they can view all the recipes they have liked. This allows users to easily access and revisit their favorite recipes.

## Models and initial data

Use the recipe schema in the `/data` folder. There's also `recipes.json`, a list of 100 recipes to be imported to populate the database if it's empty during the first run. The import process should be idempotent, meaning that running it multiple times should not create duplicate entries in the database. It should always be run at startup if the database is empty.

Images must be then hosted on a suitable storage to be served by the app. When created a new recipe, users can upload an image that will be stored and served by the app.

## Security

This project will be tracked on a private  Github repository, and security features must be enabled in GitHub.

## Deployment

The application must be able to run both locally, and deployed on Fabric. For auth, login/password should be used locally, and Fabric auth when deployed.

## Ideas for later

### Comments

Comments needs authentication.
Users can comment on recipes that they can view (public, unlisted if they have the link, and private if they are the creator). Only the creator of the recipe can delete comments on their recipes.

### Forking

Authenticated users can fork a recipe, which creates a copy of the recipe under their account. The forked recipe retains a reference to the original recipe, allowing users to see the lineage of the recipe and its variations (similar to GitHub's fork feature). Forking a recipe allows users to modify and personalize it while still acknowledging the original creator.

Forked recipes shows a fork (the food tool) icon next to the link to the original recipes. Clicking on this link takes you to the original recipe page, where you can see the original recipe details and its creator's information.

The total number of forks for each recipe is displayed on the recipe page, and users can see who has forked a recipe by clicking on the fork count, which will show a list of users who have forked it.
