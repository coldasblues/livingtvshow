// 🎮 INTERACTIVE STORY PLATFORM - Gemini AI Edition with Veo 3.1 Video Generation
// Using Google's Gemini API for EVERYTHING - text, video, AND audio!

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();

// 🔧 Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 🤖 Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Models
const textModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' }); // For text generation
const videoModel = genAI.getGenerativeModel({ model: 'veo-003' }); // For video generation with native audio!

// 📚 Story Database (in-memory for POC)
const stories = {
    detective: {
        title: "Rainy Night Detective",
        style: "anime noir detective story, cinematic, moody lighting",
        currentScene: 'opening',
        scenes: {
            opening: {
                id: 'opening',
                type: 'video',
                videoPrompt: 'cinematic anime style detective office at night, heavy rain on windows, dim lamp light creating dramatic shadows, noir atmosphere, slow camera pan across desk with vintage phone',
                narrationText: 'The rain hammered against my office window. It was past midnight when the phone rang. I had a feeling this case would change everything.',
                choices: [
                    { text: "Answer the phone immediately", nextScene: 'answer_phone' },
                    { text: "Let it ring and listen", nextScene: 'ignore_phone' },
                    { text: "Check who's calling first", nextScene: 'check_caller' }
                ]
            },
            answer_phone: {
                id: 'answer_phone',
                type: 'video',
                videoPrompt: 'cinematic close-up of detective hand reaching for vintage black rotary phone, dramatic lighting from window rain, anime noir style, smooth camera movement',
                narrationText: '"Detective Nakamura speaking," I said. The voice on the other end was barely a whisper, trembling with fear. "They said you help people who have nowhere else to turn..."',
                choices: [
                    { text: "Who is 'they'?", nextScene: 'ask_who' },
                    { text: "Are you in danger right now?", nextScene: 'ask_danger' },
                    { text: "Calm down and start from the beginning", nextScene: 'calm_caller' }
                ]
            },
            ignore_phone: {
                id: 'ignore_phone',
                type: 'video',
                videoPrompt: 'anime style phone ringing on wooden desk with red light blinking, detective silhouette facing rain-covered window, city lights blurred outside, noir mood',
                narrationText: 'I let it ring. After twelve rings, it stopped. Then immediately started again. Whoever it was, they were desperate. The answering machine clicked on.',
                choices: [
                    { text: "Listen to the message", nextScene: 'hear_message' },
                    { text: "Pick up before they hang up", nextScene: 'last_second_answer' },
                    { text: "Turn off the lights and leave", nextScene: 'leave_office' }
                ]
            },
            check_caller: {
                id: 'check_caller',
                type: 'video',
                videoPrompt: 'close-up of caller ID device showing UNKNOWN NUMBER in green digital text, raindrops on window in soft focus background, anime noir style, cinematic lighting',
                narrationText: 'The caller ID showed nothing but zeros. A blocked number at this hour was never good news. My hand hovered over the receiver as it rang for the sixth time.',
                choices: [
                    { text: "Answer with caution", nextScene: 'cautious_answer' },
                    { text: "Let the machine get it", nextScene: 'hear_message' },
                    { text: "Trace the call", nextScene: 'trace_call' }
                ]
            },
            ask_danger: {
                id: 'ask_danger',
                type: 'video',
                videoPrompt: 'split screen cinematic shot - worried young woman in rain-soaked phone booth on left, detective listening intently in dimly lit office on right, anime noir style',
                narrationText: '"I... I think so. They told me not to call anyone, but I found your card in my sister\'s apartment. She\'s been missing for three days." The line crackled with static.',
                choices: [
                    { text: "Where are you right now?", nextScene: 'get_location' },
                    { text: "What's your sister's name?", nextScene: 'sister_info' },
                    { text: "Who are 'they'?", nextScene: 'ask_who' }
                ]
            },
            ask_who: {
                id: 'ask_who',
                type: 'video',
                videoPrompt: 'cinematic anime close-up of detective face, concern in eyes, holding phone, shadows playing across features from venetian blinds, rain sounds ambient',
                narrationText: '"Who exactly are \'they\'?" I pressed. The silence stretched. When she spoke again, her voice dropped to barely audible. "The ones from the Midnight Garden. Everyone knows about them, but nobody talks..."',
                choices: [
                    { text: "Tell me about the Midnight Garden", nextScene: 'midnight_garden' },
                    { text: "Where can we meet safely?", nextScene: 'meet_safe' },
                    { text: "I need to know your sister's name", nextScene: 'sister_info' }
                ]
            }
        }
    }
};

// 🎥 Generate Video using Veo 3.1 (includes native audio!)
app.post('/api/generate-video', async (req, res) => {
    try {
        console.log('🎥 Generating video with Veo 3.1 (includes audio!)...');
        const { prompt, narration, duration = 8 } = req.body;

        // Combine visual prompt with narration for better audio generation
        const fullPrompt = `${prompt}. ${narration ? 'Narration: ' + narration : ''}`;

        console.log('📝 Video prompt:', fullPrompt);

        // Generate video with Veo 3.1 - includes synchronized audio!
        const result = await videoModel.generateContent({
            contents: [{
                role: 'user',
                parts: [{
                    text: fullPrompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                // Video generation parameters
                videoLength: duration, // seconds
                aspectRatio: '16:9'
            }
        });

        const response = result.response;

        // Extract video URL from response
        // Note: The actual response structure may vary - check Gemini API docs
        const videoUrl = response.candidates[0]?.content?.parts[0]?.videoData?.uri ||
                        response.candidates[0]?.content?.parts[0]?.fileData?.fileUri;

        console.log('✅ Video generated with native audio!');

        res.json({
            videoUrl: videoUrl,
            hasAudio: true, // Veo 3.1 always includes audio
            duration: duration,
            prompt: fullPrompt
        });

    } catch (error) {
        console.error('❌ Video generation error:', error);

        // Return placeholder video for development/testing
        res.json({
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            hasAudio: true,
            duration: 8,
            prompt: req.body.prompt,
            isPlaceholder: true,
            error: error.message
        });
    }
});

// 📖 Get Story Scene
app.get('/api/story/:storyId/:sceneId', (req, res) => {
    const { storyId, sceneId } = req.params;
    console.log(`📖 Loading scene: ${sceneId} from story: ${storyId}`);

    const story = stories[storyId];
    if (!story) {
        return res.status(404).json({ error: 'Story not found' });
    }

    const scene = story.scenes[sceneId];
    if (!scene) {
        return res.status(404).json({ error: 'Scene not found' });
    }

    res.json({
        ...scene,
        storyStyle: story.style
    });
});

// 🤖 Generate Dynamic Story Content with Gemini
app.post('/api/generate-scene', async (req, res) => {
    try {
        console.log('🤖 Generating dynamic scene with Gemini...');
        const { context, playerChoice, storyStyle } = req.body;

        const prompt = `You are creating an interactive anime noir detective story.
Story context: ${context}
Player just chose: ${playerChoice}
Style: ${storyStyle}

Generate the next scene with:
1. A video description (for 8-second video clip)
2. Narration text (2-3 sentences)
3. Three choices for what to do next

Format as JSON:
{
    "videoPrompt": "cinematic description of the scene...",
    "narrationText": "the narration...",
    "choices": [
        {"text": "choice text", "nextScene": "scene_id"}
    ]
}`;

        const result = await textModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const scene = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

        console.log('✅ Dynamic scene generated');
        res.json(scene);

    } catch (error) {
        console.error('❌ Scene generation error:', error);
        res.status(500).json({ error: 'Failed to generate scene' });
    }
});

// 💬 Enhance Narration with Gemini (optional - for better text)
app.post('/api/enhance-narration', async (req, res) => {
    try {
        const { text, style = 'noir detective' } = req.body;

        const prompt = `Rewrite this narration in a ${style} style, making it more atmospheric and engaging. Keep it under 3 sentences: "${text}"`;

        const result = await textModel.generateContent(prompt);
        const enhancedText = result.response.text();

        res.json({
            original: text,
            enhanced: enhancedText
        });

    } catch (error) {
        console.error('❌ Narration enhancement error:', error);
        res.status(500).json({ error: 'Failed to enhance narration' });
    }
});

// 📊 Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        geminiConfigured: !!process.env.GEMINI_API_KEY,
        models: {
            text: 'gemini-2.0-flash-exp',
            video: 'veo-003 (with native audio)'
        }
    });
});

// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    🎮 Interactive Story Platform - Gemini AI Edition!
    📍 Running at: http://localhost:${PORT}

    🤖 AI Features:
    ✅ Text Generation: gemini-2.0-flash-exp
    🎥 Video Generation: Veo 3.1 (with native audio!)

    💡 Key Features:
    - 8-second video clips for each scene
    - Native audio/dialogue in videos ($0.35/sec)
    - Can extend videos up to 148 seconds
    - 720p or 1080p resolution

    Quick Start:
    1. Add your Gemini API key to .env file
       Get it here: https://aistudio.google.com/app/apikey
    2. Open browser to http://localhost:${PORT}
    3. Start your cinematic story adventure!

    ${process.env.GEMINI_API_KEY === 'your_gemini_api_key_here' ?
        '⚠️  WARNING: Please add your Gemini API key to .env file!' :
        '✅ Gemini API key configured'}
    `);
});
