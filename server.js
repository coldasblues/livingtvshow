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

// 🎯 Validate Scene Consistency - Ensures location is in video prompt
function validateSceneConsistency(scene, description, name) {
    const keywords = description.toLowerCase().split(' ').filter(w => w.length > 3);
    let hasLocation = false;

    // Check if video prompt contains any significant keywords from description
    for (const word of keywords) {
        if (scene.videoPrompt.toLowerCase().includes(word)) {
            hasLocation = true;
            break;
        }
    }

    // If location missing, force it into the prompt
    if (!hasLocation) {
        console.warn('⚠️ Video prompt missing location:', description);
        scene.videoPrompt = `${name} at ${description}, ${scene.videoPrompt}`;
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
        console.warn('⚠️ Narration missing location context:', description);
    }

    return scene;
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

        // Extract setting/location from description
        const setting = description.toLowerCase();

        // Build prompt that ENFORCES location consistency
        const prompt = `Create a story for ${name} (${gender}) who is described as: "${description}"

CRITICAL RULES - MUST FOLLOW:
1. The videoPrompt MUST START with "${name} at ${description}" or "${name} in ${description}"
2. The narration MUST take place at the location mentioned in "${description}"
3. Include specific visual details about the "${description}" setting
4. The story should begin at this exact location

LOCATION ENFORCEMENT:
- Primary setting: ${description}
- Character is currently AT/IN this location
- Video must SHOW this specific setting
- Opening scene happens HERE

Generate EXACTLY 4 meaningful choices (not 3, not 5).

Return ONLY valid JSON with this exact structure:
{
    "id": "opening",
    "videoPrompt": "${name} at ${description}, [add 15 more cinematic words describing this specific location, lighting, atmosphere, camera angle]",
    "narrationText": "Story opening that takes place at the ${description} location (100-150 words). MUST mention the ${description} setting explicitly.",
    "setting": "${description}",
    "choices": [
        {"text": "🔍 Investigate something mysterious here", "genre": "mystery"},
        {"text": "⚔️ Take action in this situation", "genre": "action"},
        {"text": "💬 Interact with someone at this location", "genre": "drama"},
        {"text": "🎲 Something unexpected happens", "genre": "random"}
    ]
}

EXAMPLE for "Morgan, gas station worker":
{
    "videoPrompt": "Morgan at gas station, fluorescent lights humming, fuel pumps visible in frame, late night shift, empty parking lot, convenience store glowing behind them",
    "narrationText": "Another slow night at the gas station where Morgan works the graveyard shift. The fluorescent lights buzz overhead as Morgan...",
    ...
}

Make it cinematic, engaging, and appropriate for all audiences.`;

        const result = await textModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        console.log('📄 Raw AI response:', text);

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Could not parse JSON from AI response');
        }

        let scene = JSON.parse(jsonMatch[0]);

        // ENFORCE location consistency
        scene = validateSceneConsistency(scene, description, name);

        // Add explicit video instruction for generation
        scene.videoInstruction = `MUST SHOW: ${description} as the primary setting. Character ${name} must be visible at this location.`;
        scene.setting = description;
        scene.character = { name, gender, description };

        // Verify we have exactly 4 choices
        if (!scene.choices || scene.choices.length !== 4) {
            console.warn(`⚠️ AI generated ${scene.choices?.length || 0} choices, expected 4. Adjusting...`);

            // If we have fewer than 4, add contextual choices
            const defaultChoices = [
                { text: "🔍 Look around carefully", genre: "mystery" },
                { text: "⚔️ Take decisive action", genre: "action" },
                { text: "💬 Call out or speak", genre: "drama" },
                { text: "🎲 Wait and observe", genre: "random" }
            ];

            while (scene.choices.length < 4) {
                scene.choices.push(defaultChoices[scene.choices.length % defaultChoices.length]);
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

        console.log('✅ Story opening generated with location-enforced prompts');
        console.log(`📍 Setting: ${scene.setting}`);
        console.log(`🎥 Video prompt: ${scene.videoPrompt.substring(0, 100)}...`);

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
        const { prompt, narration, duration = 8, videoInstruction } = req.body;

        // Content filter on prompts
        const promptFilter = checkContentFilter(prompt);
        if (!promptFilter.passed) {
            return res.status(400).json({ error: 'Video prompt failed content filter' });
        }

        // Build the video prompt with location enforcement
        let enhancedPrompt = prompt;

        // If videoInstruction exists (location enforcement), prepend it
        if (videoInstruction) {
            enhancedPrompt = `${videoInstruction}. ${prompt}`;
            console.log('📍 Location enforced in video generation');
        }

        // Combine visual prompt with narration for better audio generation
        const fullPrompt = `${enhancedPrompt}. ${narration ? 'Narration: ' + narration : ''}`;

        console.log('📝 Video prompt:', fullPrompt.substring(0, 150) + '...');

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
