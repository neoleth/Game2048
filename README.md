# 2048 AI Strategic Master - Vercel Deployment Guide

This application is fully configured and ready to be deployed on Vercel.

## Deployment Steps

1. **Push to GitHub:**
   Push your project repository to GitHub (or GitLab/Bitbucket).

2. **Import to Vercel:**
   - Go to your [Vercel Dashboard](https://vercel.com/dashboard).
   - Click **Add New** > **Project**.
   - Import your GitHub repository.

3. **Configure Environment Variables:**
   Before clicking "Deploy", open the **Environment Variables** section and add the following key:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** *(Your Google Gemini API Key)*

4. **Deploy:**
   - Click **Deploy**.
   - Vercel will automatically detect that this is a Vite project.
   - It will run `npm run build` and serve the `dist` folder.
   - The included `vercel.json` ensures that any direct URL visits route correctly to the single-page application.

## Security Note

This application calls the Gemini API directly from the frontend (as per the AI Studio architecture). When deployed to a public URL on Vercel, your `GEMINI_API_KEY` will be included in the client-side bundle. 

If you plan to share this publicly with a large audience, consider adding API key restrictions (e.g., HTTP referrer restrictions) in your Google Cloud Console to prevent unauthorized use of your key on other domains.
