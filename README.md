# Interactive Story Platform - Gemini AI Edition

An interactive storytelling platform powered by **Google's Gemini AI** with **Veo 3.1 video generation**. Experience branching narratives with cinematic 8-second video clips that include native synchronized audio!

## Features

- **AI Video Generation**: Veo 3.1 creates cinematic videos with native audio
- **Dynamic Storytelling**: Gemini 2.0 Flash generates engaging narrative text
- **Branching Narrative**: Your choices shape the story
- **Native Audio**: Videos include synchronized dialogue and sound effects
- **Detective Noir Story**: Pre-built story with multiple paths

## Tech Stack

- **Backend**: Node.js + Express
- **AI**: Google Gemini API (@google/generative-ai)
  - Text: `gemini-2.0-flash-exp`
  - Video: `veo-003` (Veo 3.1)
- **Frontend**: Vanilla JavaScript with HTML5 video

## Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd livingtvshow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Get your Gemini API key**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your API key:
   ```
   GEMINI_API_KEY=your_actual_key_here
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## How It Works

1. **Scene Loading**: Each scene has a video prompt and narration text
2. **Video Generation**: Veo 3.1 creates 8-second cinematic clips with audio
3. **Player Choices**: Select from multiple options to branch the story
4. **Dynamic Content**: Gemini can generate new scenes on the fly

## API Costs

- **Video**: $0.35 per second ($2.80 for 8-second clips)
- **Text**: Very low cost (Gemini Flash is efficient)
- Videos automatically include synchronized audio!

## Project Structure

```
livingtvshow/
├── server.js           # Express server with Gemini API integration
├── index.html          # Frontend UI with video player
├── package.json        # Dependencies
├── .env.example        # Environment template
└── .gitignore         # Protects API keys
```

## Key Endpoints

- `GET /api/story/:storyId/:sceneId` - Get scene data
- `POST /api/generate-video` - Generate video with Veo 3.1
- `POST /api/generate-scene` - Create dynamic story content
- `GET /api/health` - Check API status

## Features

- **8-second video clips** for each scene
- **Native audio/dialogue** included in videos
- **Can extend videos** up to 148 seconds
- **720p or 1080p** resolution
- **Real-time generation** of story content

## Development

```bash
# Start with auto-reload
npm run dev

# Production start
npm start
```

## License

ISC

## Credits

Built with [Claude Code](https://claude.com/claude-code)
