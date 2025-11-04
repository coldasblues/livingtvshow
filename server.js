// 🎮 INTERACTIVE STORY PLATFORM - Gemini AI Edition with Dynamic Story Generation
// Using Google's Gemini API for EVERYTHING - text, video, AND audio!

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const StoryGenerator = require('./story-generator.js');
const VideoGenerator = require('./video-generator.js');
const EpisodeManager = require('./episode-manager.js');
require('dotenv').config();

const app = express();

// 🔧 Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 🤖 Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Models - Hybrid Architecture
const textModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' }); // For text generation
const videoModel = genAI.getGenerativeModel({ model: 'veo-003' }); // For video generation with native audio!
const orchestratorModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }); // For intelligent orchestration

// 📚 Initialize Story Generator (modular component)
const storyGenerator = new StoryGenerator({
    textModel: textModel,
    contentFilter: checkContentFilter  // Will be defined below
});

// 🎥 Initialize Video Generator (modular component)
const videoGenerator = new VideoGenerator({
    videoModel: videoModel,
    defaultDuration: 8,
    maxRetries: 3,
    retryDelay: 1000
});

// 🎬 Initialize Episode Manager (Gemini Pro orchestrator)
const episodeManager = new EpisodeManager({
    orchestratorModel: orchestratorModel,
    storyGenerator: storyGenerator,
    videoGenerator: videoGenerator,
    maxSegments: 7,
    minSegments: 3,
    enhancePrompts: true,
    trackCoherence: true
});

// 🚫 Content Filter - Checks for inappropriate content
function checkContentFilter(text) {
    const lowerText = text.toLowerCase();

    // Block explicit sexual content
    const blockedKeywords = [
        'sex', 'sexual', 'porn', 'xxx', 'nude', 'naked', 'erotic',
        'nsfw', '18+', 'explicit', 'adult content', 'intercourse',
        'masturbat', 'orgasm', 'penis', 'vagina', 'genitals', 'breast',
        'strip', 'prostitut', 'rape', 'molest', 'pedophil', 'incest'
    ];

    // Check for blocked keywords
    for (const keyword of blockedKeywords) {
        if (lowerText.includes(keyword)) {
            return {
                passed: false,
                reason: 'Content contains inappropriate or explicit material'
            };
        }
    }

    // Check for excessive special characters (spam patterns)
    const specialCharCount = (text.match(/[^a-zA-Z0-9\s.,!?'-]/g) || []).length;
    if (specialCharCount > text.length * 0.3) {
        return {
            passed: false,
            reason: 'Content contains too many special characters'
        };
    }

    return { passed: true };
}

// 🎯 Generate Explicit Video Prompt - Maps settings to specific visual elements
function generateExplicitVideoPrompt(setting, themes = []) {
    // Map common settings to specific visual elements
    const visualMap = {
        'gas station': 'gas pumps, neon signs, convenience store, fluorescent lights, fuel dispensers',
        'coffee shop': 'espresso machine, wooden tables, warm lighting, coffee cups, barista counter',
        'space station': 'metallic corridors, view of stars through windows, control panels, zero gravity elements, futuristic tech',
        'medieval castle': 'stone walls, torches, throne room, medieval banners, suits of armor',
        'hospital': 'medical equipment, white walls, hospital beds, fluorescent lights, sanitized environment',
        'school': 'classroom desks, chalkboard, lockers, hallway, school supplies',
        'library': 'bookshelves, reading tables, dim warm lighting, old books, quiet atmosphere',
        'bar': 'bar counter, bottles on shelves, dim moody lighting, bar stools, neon beer signs',
        'restaurant': 'dining tables, kitchen visible, food service, ambient lighting, customers dining',
        'office': 'desk, computer monitors, cubicles, office supplies, professional environment'
    };

    let videoBase = setting;
    const settingLower = setting.toLowerCase();

    // Check if we have a visual map for this setting
    for (const [key, visuals] of Object.entries(visualMap)) {
        if (settingLower.includes(key)) {
            videoBase = `${setting} with ${visuals}`;
            break;
        }
    }

    // Add theme-based atmosphere
    for (const theme of themes) {
        const themeLower = theme.toLowerCase();
        if (themeLower.includes('horror')) videoBase += ', dark shadows, ominous atmosphere, eerie lighting';
        if (themeLower.includes('christmas')) videoBase += ', christmas decorations, snow visible, festive lights, holiday atmosphere';
        if (themeLower.includes('mystery')) videoBase += ', fog effects, mysterious lighting, noir cinematography';
        if (themeLower.includes('comedy')) videoBase += ', bright colorful lighting, cheerful atmosphere';
        if (themeLower.includes('sci-fi') || themeLower.includes('futuristic')) videoBase += ', neon lights, holographic displays, advanced technology';
        if (themeLower.includes('romantic')) videoBase += ', soft warm lighting, intimate atmosphere';
    }

    return videoBase;
}

// 🎯 Validate Scene Consistency - Ensures location is in video prompt
function validateSceneConsistency(scene, setting, name) {
    const keywords = setting.toLowerCase().split(' ').filter(w => w.length > 3);
    let hasLocation = false;

    // Check if video prompt contains any significant keywords from setting
    for (const word of keywords) {
        if (scene.videoPrompt.toLowerCase().includes(word)) {
            hasLocation = true;
            break;
        }
    }

    // If location missing, force it into the prompt
    if (!hasLocation) {
        console.warn('⚠️ Video prompt missing setting:', setting);
        scene.videoPrompt = `${setting}: ${scene.videoPrompt}`;
    }

    // Ensure narration mentions the setting
    const narrationLower = scene.narrationText.toLowerCase();
    let hasNarrationLocation = false;
    for (const word of keywords) {
        if (narrationLower.includes(word)) {
            hasNarrationLocation = true;
            break;
        }
    }

    if (!hasNarrationLocation) {
        console.warn('⚠️ Narration missing location context:', setting);
    }

    return scene;
}

// 🎬 Generate Initial Story - Creates opening scene based on character
// 🎬 Generate Story Opening - Uses modular StoryGenerator
app.post('/api/generate-story', async (req, res) => {
    try {
        const { name, gender, description, setting, themes = [] } = req.body;

        // Build context object for StoryGenerator
        const context = {
            setting,
            character: { name, gender, description },
            themes,
            variationSeed: Math.floor(Math.random() * 1000000)
        };

        // Use StoryGenerator to create the opening segment
        const scene = await storyGenerator.generateSegment(context);

        // Content filter check on generated narration
        const sceneFilter = checkContentFilter(scene.narrationText);
        if (!sceneFilter.passed) {
            return res.status(400).json({
                error: 'Generated content failed safety check. Please try different character details.'
            });
        }

        console.log('✅ Story opening generated');
        console.log(`📍 Setting: ${scene.setting}`);
        console.log(`🎥 Video prompt: ${scene.videoPrompt.substring(0, 100)}...`);

        res.json({ scene });

    } catch (error) {
        console.error('❌ Story generation error:', error);
        res.status(500).json({
            error: error.message || 'Failed to generate story. Please try again.',
            details: error.message
        });
    }
});

// 🎬 Generate Next Scene - Creates subsequent scene based on player choice
app.post('/api/generate-next-scene', async (req, res) => {
    try {
        console.log('🎬 Generating next scene...');
        const { character, previousScene, playerChoice, storyHistory } = req.body;

        // Validate inputs
        if (!character || !playerChoice) {
            return res.status(400).json({ error: 'Missing required information' });
        }

        // Content filter on player choice
        const choiceFilter = checkContentFilter(playerChoice);
        if (!choiceFilter.passed) {
            return res.status(400).json({ error: 'Invalid choice content' });
        }

        console.log(`📝 ${character.name} chose: ${playerChoice}`);

        const prompt = `You are continuing an interactive story. Generate the next scene based on the player's choice.

Character: ${character.name} (${character.gender}, ${character.description})
Previous scene: ${previousScene?.narrationText || 'Story beginning'}
Player chose: "${playerChoice}"

Story so far:
${storyHistory?.slice(-3).join('\n') || 'Just beginning'}

Generate the next scene that:
1. Continues naturally from the player's choice
2. Maintains story continuity with the character
3. Creates new dramatic or interesting developments
4. Presents 4 NEW meaningful choices (EXACTLY 4 choices - this is critical)
5. Includes a vivid video description

CRITICAL: You MUST generate EXACTLY 4 choices. Not 3, not 5. Exactly 4.

Format as JSON:
{
    "id": "scene_${Date.now()}",
    "videoPrompt": "Cinematic 8-second video description showing ${character.name} ${character.description} in this moment (describe appearance, action, setting, lighting, mood)",
    "narrationText": "2-3 sentences describing what happens next to ${character.name}",
    "choices": [
        {"text": "First choice based on this situation"},
        {"text": "Second choice based on this situation"},
        {"text": "Third choice based on this situation"},
        {"text": "Fourth choice based on this situation"}
    ]
}

Keep it appropriate, engaging, and suitable for all audiences. Make each choice meaningfully different.`;

        const result = await textModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        console.log('📄 Raw AI response:', text);

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Could not parse JSON from AI response');
        }

        const scene = JSON.parse(jsonMatch[0]);

        // Verify we have exactly 4 choices
        if (!scene.choices || scene.choices.length !== 4) {
            console.warn(`⚠️ AI generated ${scene.choices?.length || 0} choices, expected 4. Adjusting...`);

            // If we have fewer than 4, add contextual choices
            while (scene.choices.length < 4) {
                const defaultChoices = [
                    { text: "Think carefully about what to do next" },
                    { text: "Look around for more information" },
                    { text: "Take a moment to assess the situation" },
                    { text: "Continue forward cautiously" }
                ];
                scene.choices.push(defaultChoices[scene.choices.length % defaultChoices.length]);
            }
            // If we have more than 4, truncate
            scene.choices = scene.choices.slice(0, 4);
        }

        // Content filter check
        const sceneFilter = checkContentFilter(scene.narrationText);
        if (!sceneFilter.passed) {
            return res.status(400).json({
                error: 'Generated content failed safety check.'
            });
        }

        console.log('✅ Next scene generated with 4 choices');
        res.json({ scene });

    } catch (error) {
        console.error('❌ Next scene generation error:', error);
        res.status(500).json({
            error: 'Failed to generate next scene. Please try again.',
            details: error.message
        });
    }
});

// 🎥 Generate Video using Veo 3.1 (includes native audio!)
// 🎥 Generate Video - Uses modular VideoGenerator
app.post('/api/generate-video', async (req, res) => {
    try {
        const { prompt, narration, duration, videoInstruction, id } = req.body;

        // Content filter on prompts
        if (prompt) {
            const promptFilter = checkContentFilter(prompt);
            if (!promptFilter.passed) {
                return res.status(400).json({ error: 'Video prompt failed content filter' });
            }
        }

        // Build scene description for VideoGenerator
        const sceneDescription = {
            videoPrompt: prompt,
            narrationText: narration,
            videoInstruction: videoInstruction,
            duration: duration,
            id: id
        };

        // Use VideoGenerator to create the video
        const result = await videoGenerator.generateVideo(sceneDescription);

        res.json(result);

    } catch (error) {
        console.error('❌ Video generation error:', error);
        const placeholder = videoGenerator.getPlaceholderVideo(req.body.prompt, error);
        res.json(placeholder);
    }
});

// 💬 Enhance Narration with Gemini (optional - for better text)
app.post('/api/enhance-narration', async (req, res) => {
    try {
        const { text, style = 'cinematic storytelling' } = req.body;

        // Content filter
        const filter = checkContentFilter(text);
        if (!filter.passed) {
            return res.status(400).json({ error: filter.reason });
        }

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

// 🧪 TEST ENDPOINT - Simple video generation test using VideoGenerator
app.post('/test-video', async (req, res) => {
    try {
        const { description } = req.body;

        if (!description) {
            return res.status(400).json({ error: 'Missing description parameter' });
        }

        console.log('🧪 TEST: Generating video with VideoGenerator...');

        // Use VideoGenerator with retry logic built-in
        const sceneDescription = {
            videoPrompt: description,
            narrationText: null,
            id: `test-${Date.now()}`
        };

        const result = await videoGenerator.generateVideo(sceneDescription);

        res.json({
            success: !result.isPlaceholder,
            videoUrl: result.videoUrl,
            fullResponse: result,
            description: description,
            testUsed: 'VideoGenerator with retry logic',
            cacheStats: videoGenerator.getCacheStats()
        });

    } catch (error) {
        console.error('🔥 TEST ENDPOINT ERROR:', error);
        const placeholder = videoGenerator.getPlaceholderVideo(req.body.description, error);
        res.status(500).json({
            success: false,
            error: error.message,
            ...placeholder
        });
    }
});

// 🎬 Generate Complete Episode with Gemini Pro Orchestration
app.post('/api/generate-episode', async (req, res) => {
    try {
        const { name, gender, description, setting, themes = [] } = req.body;

        // Validate inputs
        if (!name || !gender || !description || !setting) {
            return res.status(400).json({
                error: 'Missing required fields: name, gender, description, setting'
            });
        }

        // Content filter on inputs
        const inputText = `${name} ${description} ${setting} ${themes.join(' ')}`;
        const filter = checkContentFilter(inputText);
        if (!filter.passed) {
            return res.status(400).json({
                error: 'Input failed content filter',
                reason: filter.reason
            });
        }

        console.log(`🎬 Generating complete episode for ${name}...`);

        // Generate episode with Gemini Pro orchestration
        const episode = await episodeManager.generateEpisode({
            name,
            gender,
            description,
            setting,
            themes
        });

        console.log(`✅ Episode complete! ${episode.segments.length} segments`);

        res.json({
            success: true,
            episode: {
                id: episode.id,
                character: episode.character,
                setting: episode.setting,
                themes: episode.themes,
                summary: episode.summary,
                segmentCount: episode.segments.length,
                duration: episode.segments.length * 8, // Approximate seconds
                segments: episode.segments,
                narrativeArc: episode.narrativeArc,
                startedAt: episode.startedAt,
                completedAt: episode.completedAt
            }
        });

    } catch (error) {
        console.error('❌ Episode generation error:', error);
        res.status(500).json({
            error: 'Failed to generate episode',
            details: error.message
        });
    }
});

// 📊 Get Current Episode Status
app.get('/api/episode-status', (req, res) => {
    const stats = episodeManager.getEpisodeStats();
    res.json(stats);
});

// 🔄 Reset Episode Manager
app.post('/api/reset-episode', (req, res) => {
    episodeManager.reset();
    res.json({
        success: true,
        message: 'Episode manager reset'
    });
});

// 📊 Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        geminiConfigured: !!process.env.GEMINI_API_KEY,
        models: {
            text: 'gemini-2.0-flash-exp',
            video: 'veo-003 (with native audio)',
            orchestrator: 'gemini-1.5-pro'
        },
        features: {
            dynamicStoryGeneration: true,
            characterCreation: true,
            contentFiltering: true,
            choicesPerScene: 4,
            episodeOrchestration: true,
            narrativeCoherence: true
        }
    });
});

// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    🎮 Interactive Story Platform - Gemini AI Hybrid Architecture!
    📍 Running at: http://localhost:${PORT}

    🤖 AI Models - Three-Tier Architecture:
    🧠 Orchestrator: Gemini 1.5 Pro (intelligent coordination)
    ✅ Text Generation: Gemini 2.0 Flash (story content)
    🎥 Video Generation: Veo 3.1 (with native audio!)

    ✨ New Episode Orchestration Features:
    🎬 Complete episode generation (3-7 segments)
    📋 Narrative arc planning by Gemini Pro
    🔍 Automatic coherence checking between segments
    ✨ AI-enhanced video prompts for better visuals
    🎯 Intelligent pacing decisions
    📝 Episode summaries

    💡 Key Features:
    - Create custom characters (name, gender, description)
    - Full episodes with narrative coherence
    - 8-second video clips for each segment
    - Native audio/dialogue in videos
    - AI-coordinated story flow
    - Smart branching and pacing
    - 720p or 1080p video resolution

    🔌 API Endpoints:
    - POST /api/generate-episode (full orchestrated episode)
    - POST /api/generate-story (single scene)
    - POST /api/generate-next-scene (scene continuation)
    - POST /api/generate-video (video only)
    - GET  /api/episode-status (current episode state)
    - POST /api/reset-episode (reset orchestrator)
    - GET  /api/health (system status)

    Quick Start:
    1. Add your Gemini API key to .env file
       Get it here: https://aistudio.google.com/app/apikey
    2. Open browser to http://localhost:${PORT}
    3. Create your character and start your adventure!
    4. Try the new episode orchestration for full stories!

    ${process.env.GEMINI_API_KEY === 'your_gemini_api_key_here' ?
        '⚠️  WARNING: Please add your Gemini API key to .env file!' :
        '✅ Gemini API key configured - Ready to orchestrate stories!'}
    `);
});
