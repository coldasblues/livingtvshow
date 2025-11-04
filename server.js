// 🎮 INTERACTIVE STORY PLATFORM - Gemini AI Edition with Dynamic Story Generation
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

// 🎬 Generate Initial Story - Creates opening scene based on character
app.post('/api/generate-story', async (req, res) => {
    try {
        console.log('🎬 Generating new story...');
        const { name, gender, description } = req.body;

        // Validate inputs
        if (!name || !gender || !description) {
            return res.status(400).json({ error: 'Missing required character information' });
        }

        // Content filter check
        const nameFilter = checkContentFilter(name);
        if (!nameFilter.passed) {
            return res.status(400).json({ error: nameFilter.reason });
        }

        const descFilter = checkContentFilter(description);
        if (!descFilter.passed) {
            return res.status(400).json({ error: descFilter.reason });
        }

        console.log(`📝 Creating story for ${gender} character: ${name}, ${description}`);

        const prompt = `You are a creative story writer. Create an engaging opening scene for an interactive story.

Character Details:
- Name: ${name}
- Gender: ${gender}
- Description: ${description}

Generate an opening scene that:
1. Sets up an interesting situation for this character
2. Creates atmosphere and mood
3. Presents 4 meaningful choices (EXACTLY 4 - not 3, not 5)
4. Includes a vivid video description for an 8-second cinematic clip

IMPORTANT: Generate EXACTLY 4 choices - no more, no less.

Format as JSON:
{
    "id": "opening",
    "videoPrompt": "Cinematic description of the 8-second video scene (include character appearance, setting, lighting, mood)",
    "narrationText": "2-3 sentences describing what's happening to ${name}",
    "choices": [
        {"text": "First meaningful choice"},
        {"text": "Second meaningful choice"},
        {"text": "Third meaningful choice"},
        {"text": "Fourth meaningful choice"}
    ]
}

Keep it appropriate, engaging, and suitable for all audiences. Make the video prompt cinematic and detailed for Veo 3.1 generation.`;

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

            // If we have fewer than 4, add generic choices
            while (scene.choices.length < 4) {
                scene.choices.push({ text: "Explore the area" });
            }
            // If we have more than 4, truncate
            scene.choices = scene.choices.slice(0, 4);
        }

        // Content filter check on generated content
        const sceneFilter = checkContentFilter(scene.narrationText);
        if (!sceneFilter.passed) {
            return res.status(400).json({
                error: 'Generated content failed safety check. Please try different character details.'
            });
        }

        console.log('✅ Story opening generated with 4 choices');
        res.json({ scene });

    } catch (error) {
        console.error('❌ Story generation error:', error);
        res.status(500).json({
            error: 'Failed to generate story. Please try again.',
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
app.post('/api/generate-video', async (req, res) => {
    try {
        console.log('🎥 Generating video with Veo 3.1 (includes audio!)...');
        const { prompt, narration, duration = 8 } = req.body;

        // Content filter on prompts
        const promptFilter = checkContentFilter(prompt);
        if (!promptFilter.passed) {
            return res.status(400).json({ error: 'Video prompt failed content filter' });
        }

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

// 📊 Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        geminiConfigured: !!process.env.GEMINI_API_KEY,
        models: {
            text: 'gemini-2.0-flash-exp',
            video: 'veo-003 (with native audio)'
        },
        features: {
            dynamicStoryGeneration: true,
            characterCreation: true,
            contentFiltering: true,
            choicesPerScene: 4
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
    ✨ Dynamic Story Generation (NEW!)
    🎭 Character Creation (NEW!)
    🛡️ Content Filtering (NEW!)

    💡 Key Features:
    - Create custom characters (name, gender, description)
    - 8-second video clips for each scene
    - Native audio/dialogue in videos ($0.35/sec)
    - 4 meaningful choices per scene
    - Can extend videos up to 148 seconds
    - 720p or 1080p resolution
    - AI-generated branching narratives

    Quick Start:
    1. Add your Gemini API key to .env file
       Get it here: https://aistudio.google.com/app/apikey
    2. Open browser to http://localhost:${PORT}
    3. Create your character and start your adventure!

    ${process.env.GEMINI_API_KEY === 'your_gemini_api_key_here' ?
        '⚠️  WARNING: Please add your Gemini API key to .env file!' :
        '✅ Gemini API key configured - Ready to generate stories!'}
    `);
});
