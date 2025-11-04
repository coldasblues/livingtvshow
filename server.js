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
app.post('/api/generate-story', async (req, res) => {
    try {
        console.log('🎬 Generating new story...');
        const { name, gender, description, setting, themes = [] } = req.body;

        // Validate inputs
        if (!name || !gender || !description) {
            return res.status(400).json({ error: 'Missing required character information' });
        }

        if (!setting) {
            return res.status(400).json({ error: 'Missing story setting/location' });
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

        const settingFilter = checkContentFilter(setting);
        if (!settingFilter.passed) {
            return res.status(400).json({ error: settingFilter.reason });
        }

        console.log(`📝 Creating story for ${gender} character: ${name}, ${description}`);
        console.log(`📍 Setting: ${setting}`);
        console.log(`🎭 Themes: ${themes.join(', ') || 'None'}`);

        // Generate explicit video prompt with visual details
        const explicitVideoBase = generateExplicitVideoPrompt(setting, themes);

        // 🎲 Add variation elements to make each generation unique
        const timeOfDayOptions = ['early morning', 'mid-morning', 'noon', 'afternoon', 'dusk', 'evening', 'late night', 'midnight', 'pre-dawn'];
        const weatherOptions = ['clear skies', 'overcast', 'light rain', 'heavy rain', 'fog', 'mist', 'snow flurries', 'windy conditions', 'humid atmosphere', 'crisp air'];
        const cameraAngles = ['wide establishing shot', 'close-up', 'medium shot', 'low angle', 'high angle', 'dutch angle', 'over-the-shoulder', 'tracking shot'];
        const moodModifiers = ['tense', 'peaceful', 'ominous', 'hopeful', 'melancholic', 'energetic', 'mysterious', 'contemplative', 'anxious', 'serene'];

        const randomTimeOfDay = timeOfDayOptions[Math.floor(Math.random() * timeOfDayOptions.length)];
        const randomWeather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
        const randomCamera = cameraAngles[Math.floor(Math.random() * cameraAngles.length)];
        const randomMood = moodModifiers[Math.floor(Math.random() * moodModifiers.length)];
        const randomSeed = Math.floor(Math.random() * 1000000);

        console.log(`🎲 Variation: ${randomTimeOfDay}, ${randomWeather}, ${randomCamera}, ${randomMood} (seed: ${randomSeed})`);

        // Build prompt that ENFORCES setting and theme consistency
        const themesText = themes.length > 0 ? themes.join(', ') : 'general adventure';
        const prompt = `Create a story with these EXACT specifications:

VARIATION SEED: ${randomSeed} (Use this to create a unique opening - never repeat the same scenario)

TIME & ATMOSPHERE:
- Time of day: ${randomTimeOfDay}
- Weather/Atmosphere: ${randomWeather}
- Camera style: ${randomCamera}
- Overall mood: ${randomMood}

Create a story with these EXACT specifications:

CHARACTER: ${name}, a ${gender} ${description}
SETTING: ${setting} (MUST be the PRIMARY location - this is CRITICAL)
THEMES: ${themesText}
VISUAL ELEMENTS: ${explicitVideoBase}

CRITICAL RULES - MUST FOLLOW:
1. The videoPrompt MUST START with "${setting}" or "${name} at ${setting}"
2. The videoPrompt MUST include these visual elements: ${explicitVideoBase}
3. INCORPORATE the time (${randomTimeOfDay}) and weather (${randomWeather}) into the scene
4. Use ${randomCamera} perspective and capture a ${randomMood} mood
5. The narration MUST take place at "${setting}"
6. The story MUST incorporate these themes: ${themesText}
7. Opening scene happens at ${setting} - nowhere else
8. Create a UNIQUE scenario - avoid generic openings

LOCATION ENFORCEMENT:
- Primary setting: ${setting}
- Character ${name} is currently AT/IN ${setting}
- Video must SHOW ${setting} as described: ${explicitVideoBase}
- All action happens at ${setting}

Generate EXACTLY 4 meaningful choices that reflect the themes: ${themesText}

Return ONLY valid JSON with this exact structure:
{
    "id": "opening",
    "videoPrompt": "${setting}, ${explicitVideoBase}, ${randomTimeOfDay}, ${randomWeather}, ${randomCamera}, ${name} the ${description} is present, ${randomMood} atmosphere, [add unique cinematic details matching ${themesText}]",
    "narrationText": "Story opening at ${setting} during ${randomTimeOfDay} with ${randomWeather} (100-150 words). Incorporate ${themesText} themes and ${randomMood} mood. MUST mention ${setting} explicitly. ${name} is a ${description}. Make this scenario UNIQUE.",
    "explicitSetting": "${setting}",
    "themes": ${JSON.stringify(themes)},
    "choices": [
        {"text": "Choice 1 influenced by ${themesText}", "genre": "${themes[0] || 'mystery'}"},
        {"text": "Choice 2 influenced by ${themesText}", "genre": "${themes[1] || 'action'}"},
        {"text": "Choice 3 influenced by ${themesText}", "genre": "${themes[2] || 'drama'}"},
        {"text": "Choice 4 influenced by ${themesText}", "genre": "random"}
    ]
}

EXAMPLE for Setting:"Gas station", Character:"Morgan, night worker", Themes:"Mystery" with variations:
{
    "videoPrompt": "Gas station with gas pumps, neon signs, convenience store, fluorescent lights, fuel dispensers, late night, fog, low angle shot, Morgan the night worker present, ominous atmosphere, noir cinematography, mysterious figure approaching from distance",
    "narrationText": "Late night fog rolls across the gas station lot. Morgan's shift had been quiet until a car with no headlights pulled up to pump 3. The driver sat motionless, staring at the convenience store windows...",
    "explicitSetting": "Gas station",
    ...
}

IMPORTANT: Each generation should feel FRESH and DIFFERENT - vary the specific situation, conflict, or hook while maintaining the setting and themes.

Make it cinematic, engaging, and appropriate for all audiences. The setting ${setting} is NON-NEGOTIABLE.`;

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
        scene = validateSceneConsistency(scene, setting, name);

        // Add explicit video instruction for generation
        scene.videoInstruction = `MUST SHOW: ${setting} as the primary setting. Character ${name} must be visible at this location.`;
        scene.setting = setting;
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
