/**
 * StoryGenerator - Modular story generation component
 * Handles AI-powered story segment generation with branching narratives
 */

class StoryGenerator {
    /**
     * @param {Object} options - Configuration options
     * @param {Object} options.textModel - Gemini text model instance
     * @param {Function} options.contentFilter - Content filtering function
     */
    constructor(options = {}) {
        this.textModel = options.textModel;
        this.contentFilter = options.contentFilter;
        this.useHardcodedData = !this.textModel; // For testing

        // Story generation configuration
        this.config = {
            choicesPerScene: 4,
            narrationLength: '100-150 words',
            temperature: 0.8,
            maxRetries: 2
        };

        console.log('📚 StoryGenerator initialized', {
            mode: this.useHardcodedData ? 'HARDCODED' : 'AI',
            choicesPerScene: this.config.choicesPerScene
        });
    }

    /**
     * Generate a story segment based on context and previous choice
     * @param {Object} context - Story context (setting, character, themes, etc.)
     * @param {Object} previousChoice - The choice the user made (null for opening)
     * @returns {Promise<Object>} Story segment with narrative and choices
     */
    async generateSegment(context, previousChoice = null) {
        console.log('🎬 Generating story segment...', {
            isOpening: !previousChoice,
            setting: context.setting,
            character: context.character?.name
        });

        // Validate context
        this.validateContext(context);

        // Content filter on user inputs
        if (this.contentFilter) {
            this.applyContentFilters(context);
        }

        // Generate the segment
        let segment;
        if (this.useHardcodedData) {
            segment = this.generateHardcodedSegment(context, previousChoice);
        } else {
            segment = await this.generateAISegment(context, previousChoice);
        }

        // Validate and fix segment
        segment = this.validateSegment(segment, context);

        console.log('✅ Story segment generated', {
            hasVideo: !!segment.videoPrompt,
            hasNarration: !!segment.narrationText,
            choiceCount: segment.choices?.length
        });

        return segment;
    }

    /**
     * Format AI prompt for story generation
     * @param {Object} context - Story context
     * @param {Object} previousChoice - Previous user choice
     * @returns {string} Formatted prompt for AI
     */
    formatPrompt(context, previousChoice = null) {
        const { setting, character, themes = [], variationSeed } = context;
        const { name, gender, description } = character;

        // Generate variation elements for uniqueness
        const variation = this.generateVariation(variationSeed);

        // Generate explicit video base prompt
        const explicitVideoBase = this.generateExplicitVideoPrompt(setting, themes);

        const themesText = themes.length > 0 ? themes.join(', ') : 'general adventure';
        const isOpening = !previousChoice;

        let prompt = '';

        if (isOpening) {
            // Opening scene prompt
            prompt = `Create a story with these EXACT specifications:

VARIATION SEED: ${variation.seed} (Use this to create a unique opening - never repeat the same scenario)

TIME & ATMOSPHERE:
- Time of day: ${variation.timeOfDay}
- Weather/Atmosphere: ${variation.weather}
- Camera style: ${variation.camera}
- Overall mood: ${variation.mood}

Create a story with these EXACT specifications:

CHARACTER: ${name}, a ${gender} ${description}
SETTING: ${setting} (MUST be the PRIMARY location - this is CRITICAL)
THEMES: ${themesText}
VISUAL ELEMENTS: ${explicitVideoBase}

CRITICAL RULES - MUST FOLLOW:
1. The videoPrompt MUST START with "${setting}" or "${name} at ${setting}"
2. The videoPrompt MUST include these visual elements: ${explicitVideoBase}
3. INCORPORATE the time (${variation.timeOfDay}) and weather (${variation.weather}) into the scene
4. Use ${variation.camera} perspective and capture a ${variation.mood} mood
5. The narration MUST take place at "${setting}"
6. The story MUST incorporate these themes: ${themesText}
7. Opening scene happens at ${setting} - nowhere else
8. Create a UNIQUE scenario - avoid generic openings

LOCATION ENFORCEMENT:
- Primary setting: ${setting}
- Character ${name} is currently AT/IN ${setting}
- Video must SHOW ${setting} as described: ${explicitVideoBase}
- All action happens at ${setting}

Generate EXACTLY ${this.config.choicesPerScene} meaningful choices that reflect the themes: ${themesText}

Return ONLY valid JSON with this exact structure:
{
    "id": "opening",
    "videoPrompt": "${setting}, ${explicitVideoBase}, ${variation.timeOfDay}, ${variation.weather}, ${variation.camera}, ${name} the ${description} is present, ${variation.mood} atmosphere, [add unique cinematic details matching ${themesText}]",
    "narrationText": "Story opening at ${setting} during ${variation.timeOfDay} with ${variation.weather} (${this.config.narrationLength}). Incorporate ${themesText} themes and ${variation.mood} mood. MUST mention ${setting} explicitly. ${name} is a ${description}. Make this scenario UNIQUE.",
    "explicitSetting": "${setting}",
    "themes": ${JSON.stringify(themes)},
    "choices": [
        {"text": "Choice 1 influenced by ${themesText}", "genre": "${themes[0] || 'mystery'}"},
        {"text": "Choice 2 influenced by ${themesText}", "genre": "${themes[1] || 'action'}"},
        {"text": "Choice 3 influenced by ${themesText}", "genre": "${themes[2] || 'drama'}"},
        {"text": "Choice 4 influenced by ${themesText}", "genre": "random"}
    ]
}

IMPORTANT: Each generation should feel FRESH and DIFFERENT - vary the specific situation, conflict, or hook while maintaining the setting and themes.

Make it cinematic, engaging, and appropriate for all audiences. The setting ${setting} is NON-NEGOTIABLE.`;
        } else {
            // Continuation scene prompt
            prompt = `Continue the story for ${name} at ${setting}.

PREVIOUS CHOICE: "${previousChoice.text}"
PREVIOUS GENRE: ${previousChoice.genre}

CURRENT CONTEXT:
- Setting: ${setting} (MUST remain here)
- Character: ${name}, a ${gender} ${description}
- Themes: ${themesText}
- Variation: ${variation.timeOfDay}, ${variation.weather}, ${variation.mood}

CRITICAL RULES:
1. Continue the story based on the previous choice
2. MUST still be at ${setting} - DO NOT change location
3. The videoPrompt must show ${setting}
4. Generate EXACTLY ${this.config.choicesPerScene} new meaningful choices
5. Incorporate ${themesText} themes

Return ONLY valid JSON:
{
    "id": "scene_${Date.now()}",
    "videoPrompt": "${setting}, [continuing action based on previous choice], ${name} reacts to the situation",
    "narrationText": "Continuation at ${setting} (${this.config.narrationLength}). Based on ${name}'s decision to ${previousChoice.text}...",
    "explicitSetting": "${setting}",
    "themes": ${JSON.stringify(themes)},
    "choices": [
        {"text": "New choice 1", "genre": "${themes[0] || 'mystery'}"},
        {"text": "New choice 2", "genre": "${themes[1] || 'action'}"},
        {"text": "New choice 3", "genre": "${themes[2] || 'drama'}"},
        {"text": "New choice 4", "genre": "random"}
    ]
}

Make the continuation logical and engaging based on the previous choice.`;
        }

        return prompt;
    }

    /**
     * Parse AI response into structured story segment
     * @param {string} aiResponse - Raw AI response text
     * @returns {Object} Parsed story segment
     */
    parseResponse(aiResponse) {
        console.log('📝 Parsing AI response...');

        // Extract JSON from markdown code blocks if present
        const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                         aiResponse.match(/(\{[\s\S]*\})/);

        if (!jsonMatch) {
            throw new Error('Could not parse JSON from AI response');
        }

        const segment = JSON.parse(jsonMatch[1]);
        console.log('✅ Response parsed successfully');

        return segment;
    }

    /**
     * Generate variation elements for uniqueness
     * @param {number} seed - Optional random seed
     * @returns {Object} Variation elements
     */
    generateVariation(seed = null) {
        const timeOfDayOptions = ['early morning', 'mid-morning', 'noon', 'afternoon', 'dusk', 'evening', 'late night', 'midnight', 'pre-dawn'];
        const weatherOptions = ['clear skies', 'overcast', 'light rain', 'heavy rain', 'fog', 'mist', 'snow flurries', 'windy conditions', 'humid atmosphere', 'crisp air'];
        const cameraAngles = ['wide establishing shot', 'close-up', 'medium shot', 'low angle', 'high angle', 'dutch angle', 'over-the-shoulder', 'tracking shot'];
        const moodModifiers = ['tense', 'peaceful', 'ominous', 'hopeful', 'melancholic', 'energetic', 'mysterious', 'contemplative', 'anxious', 'serene'];

        const randomSeed = seed || Math.floor(Math.random() * 1000000);

        return {
            seed: randomSeed,
            timeOfDay: timeOfDayOptions[Math.floor(Math.random() * timeOfDayOptions.length)],
            weather: weatherOptions[Math.floor(Math.random() * weatherOptions.length)],
            camera: cameraAngles[Math.floor(Math.random() * cameraAngles.length)],
            mood: moodModifiers[Math.floor(Math.random() * moodModifiers.length)]
        };
    }

    /**
     * Generate explicit video prompt with visual mapping
     * @param {string} setting - Story setting
     * @param {Array} themes - Story themes
     * @returns {string} Explicit video prompt
     */
    generateExplicitVideoPrompt(setting, themes = []) {
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

    /**
     * Generate hardcoded segment for testing (no AI required)
     * @param {Object} context - Story context
     * @param {Object} previousChoice - Previous choice
     * @returns {Object} Hardcoded story segment
     */
    generateHardcodedSegment(context, previousChoice) {
        const { setting, character, themes } = context;
        const { name, gender, description } = character;

        const isOpening = !previousChoice;

        if (isOpening) {
            return {
                id: 'opening',
                videoPrompt: `${setting}, ${name} the ${description} stands in the center, atmospheric lighting, cinematic camera angle`,
                narrationText: `${name}, a ${gender} ${description}, finds themselves at ${setting}. The atmosphere is thick with anticipation. What will happen next?`,
                explicitSetting: setting,
                themes: themes || [],
                choices: [
                    { text: '🔍 Investigate the surroundings carefully', genre: themes[0] || 'mystery' },
                    { text: '⚔️ Take immediate action', genre: themes[1] || 'action' },
                    { text: '💬 Try to communicate with someone nearby', genre: themes[2] || 'drama' },
                    { text: '🎲 Wait and see what happens', genre: 'random' }
                ]
            };
        } else {
            return {
                id: `scene_${Date.now()}`,
                videoPrompt: `${setting}, ${name} continues their journey, reacting to the previous decision`,
                narrationText: `After choosing to ${previousChoice.text}, ${name} finds the situation developing in unexpected ways at ${setting}.`,
                explicitSetting: setting,
                themes: themes || [],
                choices: [
                    { text: '🔍 Explore further based on what was discovered', genre: 'mystery' },
                    { text: '⚔️ Double down on the previous approach', genre: 'action' },
                    { text: '💬 Change tactics and try something different', genre: 'drama' },
                    { text: '🎲 Take a risk', genre: 'random' }
                ]
            };
        }
    }

    /**
     * Generate AI-powered segment using Gemini
     * @param {Object} context - Story context
     * @param {Object} previousChoice - Previous choice
     * @returns {Promise<Object>} AI-generated story segment
     */
    async generateAISegment(context, previousChoice) {
        const prompt = this.formatPrompt(context, previousChoice);

        console.log('🤖 Sending prompt to Gemini AI...');

        const result = await this.textModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        console.log('📄 Raw AI response received');

        const segment = this.parseResponse(text);
        return segment;
    }

    /**
     * Validate story context
     * @param {Object} context - Story context to validate
     * @throws {Error} If context is invalid
     */
    validateContext(context) {
        if (!context.setting) {
            throw new Error('Missing required field: setting');
        }
        if (!context.character || !context.character.name) {
            throw new Error('Missing required field: character.name');
        }
        if (!context.character.gender) {
            throw new Error('Missing required field: character.gender');
        }
        if (!context.character.description) {
            throw new Error('Missing required field: character.description');
        }
    }

    /**
     * Apply content filters to context inputs
     * @param {Object} context - Story context
     * @throws {Error} If content fails filter
     */
    applyContentFilters(context) {
        const { setting, character } = context;

        const settingFilter = this.contentFilter(setting);
        if (!settingFilter.passed) {
            throw new Error(`Setting failed content filter: ${settingFilter.reason}`);
        }

        const nameFilter = this.contentFilter(character.name);
        if (!nameFilter.passed) {
            throw new Error(`Character name failed content filter: ${nameFilter.reason}`);
        }

        const descFilter = this.contentFilter(character.description);
        if (!descFilter.passed) {
            throw new Error(`Character description failed content filter: ${descFilter.reason}`);
        }
    }

    /**
     * Validate and fix story segment
     * @param {Object} segment - Story segment to validate
     * @param {Object} context - Story context
     * @returns {Object} Validated/fixed segment
     */
    validateSegment(segment, context) {
        // Ensure setting is present
        if (!segment.explicitSetting) {
            segment.explicitSetting = context.setting;
        }

        // Validate choice count
        if (!segment.choices || segment.choices.length !== this.config.choicesPerScene) {
            console.warn(`⚠️ Invalid choice count: ${segment.choices?.length || 0}, expected ${this.config.choicesPerScene}`);
            segment.choices = this.fixChoices(segment.choices, context);
        }

        // Ensure location consistency in video prompt
        const settingKeywords = context.setting.toLowerCase().split(' ').filter(w => w.length > 3);
        let hasLocation = false;

        for (const word of settingKeywords) {
            if (segment.videoPrompt?.toLowerCase().includes(word)) {
                hasLocation = true;
                break;
            }
        }

        if (!hasLocation) {
            console.warn('⚠️ Video prompt missing setting, adding it');
            segment.videoPrompt = `${context.setting}: ${segment.videoPrompt}`;
        }

        // Add video instruction for video generation
        segment.videoInstruction = `MUST SHOW: ${context.setting} as the primary setting. Character ${context.character.name} must be visible at this location.`;
        segment.setting = context.setting;
        segment.character = context.character;

        return segment;
    }

    /**
     * Fix choices array to ensure correct count
     * @param {Array} choices - Original choices
     * @param {Object} context - Story context
     * @returns {Array} Fixed choices array
     */
    fixChoices(choices, context) {
        const defaultChoices = [
            { text: '🔍 Look around carefully', genre: context.themes?.[0] || 'mystery' },
            { text: '⚔️ Take decisive action', genre: context.themes?.[1] || 'action' },
            { text: '💬 Call out or speak', genre: context.themes?.[2] || 'drama' },
            { text: '🎲 Wait and observe', genre: 'random' }
        ];

        const fixedChoices = choices ? [...choices] : [];

        // Add default choices if we have fewer than required
        while (fixedChoices.length < this.config.choicesPerScene) {
            fixedChoices.push(defaultChoices[fixedChoices.length % defaultChoices.length]);
        }

        // Truncate if we have more than required
        return fixedChoices.slice(0, this.config.choicesPerScene);
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StoryGenerator;
}
