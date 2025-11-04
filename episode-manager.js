/**
 * EpisodeManager - Gemini Pro Orchestrator for Intelligent Episode Coordination
 *
 * Uses Gemini Pro to coordinate between story and video generation,
 * ensuring narrative coherence, managing branching decisions, and
 * optimizing the pipeline for complete episode creation.
 */

class EpisodeManager {
    /**
     * @param {Object} options - Configuration options
     * @param {Object} options.orchestratorModel - Gemini Pro model for coordination
     * @param {Object} options.storyGenerator - StoryGenerator instance
     * @param {Object} options.videoGenerator - VideoGenerator instance
     * @param {number} options.maxSegments - Maximum segments per episode (default: 7)
     * @param {number} options.minSegments - Minimum segments for complete episode (default: 3)
     */
    constructor(options = {}) {
        if (!options.orchestratorModel) {
            throw new Error('EpisodeManager requires orchestratorModel (Gemini Pro)');
        }
        if (!options.storyGenerator) {
            throw new Error('EpisodeManager requires storyGenerator instance');
        }
        if (!options.videoGenerator) {
            throw new Error('EpisodeManager requires videoGenerator instance');
        }

        this.orchestrator = options.orchestratorModel; // Gemini Pro
        this.storyGenerator = options.storyGenerator;
        this.videoGenerator = options.videoGenerator;

        this.config = {
            maxSegments: options.maxSegments || 7,
            minSegments: options.minSegments || 3,
            enhancePrompts: options.enhancePrompts !== false, // Default true
            trackCoherence: options.trackCoherence !== false, // Default true
            temperature: options.temperature || 0.7
        };

        // Episode state
        this.currentEpisode = null;

        console.log('🎬 EpisodeManager initialized', {
            maxSegments: this.config.maxSegments,
            orchestrator: 'Gemini Pro',
            enhancePrompts: this.config.enhancePrompts,
            trackCoherence: this.config.trackCoherence
        });
    }

    /**
     * Generate a complete episode from user input
     * @param {Object} userInput - Initial episode parameters
     * @param {string} userInput.name - Character name
     * @param {string} userInput.gender - Character gender
     * @param {string} userInput.description - Character description
     * @param {string} userInput.setting - Story setting
     * @param {Array} userInput.themes - Story themes
     * @returns {Promise<Object>} Complete episode with segments
     */
    async generateEpisode(userInput) {
        console.log('🎬 Starting episode generation with Gemini Pro orchestration...');

        // Initialize episode
        this.currentEpisode = {
            id: `episode-${Date.now()}`,
            character: {
                name: userInput.name,
                gender: userInput.gender,
                description: userInput.description
            },
            setting: userInput.setting,
            themes: userInput.themes || [],
            segments: [],
            narrativeArc: null,
            startedAt: new Date().toISOString(),
            status: 'generating'
        };

        try {
            // Step 1: Gemini Pro plans the narrative arc
            console.log('📋 Gemini Pro planning narrative arc...');
            const narrativeArc = await this.planNarrativeArc(userInput);
            this.currentEpisode.narrativeArc = narrativeArc;

            // Step 2: Generate opening segment
            console.log('🎬 Generating opening segment...');
            const openingSegment = await this.generateSegment(
                userInput,
                null,
                0,
                'opening'
            );
            this.currentEpisode.segments.push(openingSegment);

            // Step 3: Generate continuation segments (up to maxSegments)
            let segmentCount = 1;
            let previousSegment = openingSegment;

            while (segmentCount < this.config.maxSegments) {
                console.log(`🎬 Generating segment ${segmentCount + 1}/${this.config.maxSegments}...`);

                // Gemini Pro decides if episode should continue
                const shouldContinue = await this.shouldContinueEpisode(
                    this.currentEpisode,
                    segmentCount
                );

                if (!shouldContinue && segmentCount >= this.config.minSegments) {
                    console.log('✅ Episode naturally concluded by orchestrator');
                    break;
                }

                // Generate next segment
                const nextSegment = await this.generateSegment(
                    userInput,
                    previousSegment,
                    segmentCount,
                    'continuation'
                );

                this.currentEpisode.segments.push(nextSegment);
                previousSegment = nextSegment;
                segmentCount++;
            }

            // Step 4: Gemini Pro generates episode summary
            console.log('📝 Generating episode summary...');
            const summary = await this.generateEpisodeSummary(this.currentEpisode);
            this.currentEpisode.summary = summary;
            this.currentEpisode.status = 'completed';
            this.currentEpisode.completedAt = new Date().toISOString();

            console.log(`✅ Episode generation complete! ${segmentCount} segments created`);
            return this.currentEpisode;

        } catch (error) {
            console.error('❌ Episode generation error:', error);
            this.currentEpisode.status = 'error';
            this.currentEpisode.error = error.message;
            throw error;
        }
    }

    /**
     * Generate a single segment with orchestration
     * @param {Object} userInput - User input
     * @param {Object} previousSegment - Previous segment or null
     * @param {number} segmentIndex - Current segment index
     * @param {string} type - Segment type (opening/continuation)
     * @returns {Promise<Object>} Generated segment with video
     */
    async generateSegment(userInput, previousSegment, segmentIndex, type) {
        console.log(`   🎭 Orchestrating segment ${segmentIndex} (${type})...`);

        // Build context for story generation
        const context = {
            setting: userInput.setting,
            character: {
                name: userInput.name,
                gender: userInput.gender,
                description: userInput.description
            },
            themes: userInput.themes || [],
            variationSeed: Math.floor(Math.random() * 1000000)
        };

        // Step 1: Generate story segment
        console.log('   📖 Story generation...');
        const storySegment = await this.storyGenerator.generateSegment(
            context,
            previousSegment?.choices?.[0] // Use first choice as continuation
        );

        // Step 2: Gemini Pro enhances for coherence
        if (this.config.trackCoherence && previousSegment) {
            console.log('   🔍 Checking narrative coherence...');
            const coherenceCheck = await this.checkNarrativeCoherence(
                previousSegment,
                storySegment,
                this.currentEpisode.narrativeArc
            );

            if (!coherenceCheck.coherent) {
                console.warn('   ⚠️ Coherence issue detected:', coherenceCheck.issue);
                // Apply suggested fix
                storySegment.narrationText = coherenceCheck.suggestedFix || storySegment.narrationText;
            }
        }

        // Step 3: Gemini Pro enhances video prompt
        if (this.config.enhancePrompts) {
            console.log('   ✨ Enhancing video prompt...');
            const enhancedPrompt = await this.enhanceVideoPrompt(
                storySegment.videoPrompt,
                storySegment.narrationText,
                this.currentEpisode.narrativeArc,
                segmentIndex
            );
            storySegment.videoPrompt = enhancedPrompt;
        }

        // Step 4: Generate video
        console.log('   🎥 Video generation...');
        const videoResult = await this.videoGenerator.generateVideo({
            id: `${this.currentEpisode.id}-segment-${segmentIndex}`,
            videoPrompt: storySegment.videoPrompt,
            narrationText: storySegment.narrationText,
            videoInstruction: storySegment.videoInstruction,
            duration: 8
        });

        // Build complete segment
        const segment = {
            index: segmentIndex,
            type: type,
            story: storySegment,
            video: videoResult,
            generatedAt: new Date().toISOString()
        };

        console.log(`   ✅ Segment ${segmentIndex} complete`);
        return segment;
    }

    /**
     * Gemini Pro plans the overall narrative arc for the episode
     * @param {Object} userInput - User input
     * @returns {Promise<Object>} Narrative arc plan
     */
    async planNarrativeArc(userInput) {
        const prompt = `You are a narrative orchestrator for an interactive story platform. Plan the narrative arc for an episode.

Character: ${userInput.name} (${userInput.gender}, ${userInput.description})
Setting: ${userInput.setting}
Themes: ${userInput.themes?.join(', ') || 'None specified'}

Create a narrative arc plan with:
1. Setup: What should the opening establish?
2. Rising Action: What challenges or developments should occur?
3. Climax: What should be the peak moment?
4. Resolution: How should the episode conclude?

Also suggest:
- Key narrative beats (3-5 major story points)
- Tone progression (how should mood evolve?)
- Visual motifs (recurring visual elements)
- Character development arc

Return as JSON:
{
    "setup": "description",
    "risingAction": "description",
    "climax": "description",
    "resolution": "description",
    "narrativeBeats": ["beat1", "beat2", ...],
    "toneProgression": ["tone1", "tone2", ...],
    "visualMotifs": ["motif1", "motif2", ...],
    "characterArc": "description"
}`;

        try {
            const result = await this.orchestrator.generateContent(prompt);
            const responseText = result.response.text();

            // Parse JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn('⚠️ Could not parse narrative arc, using default');
                return this.getDefaultNarrativeArc();
            }

            const narrativeArc = JSON.parse(jsonMatch[0]);
            console.log('📋 Narrative arc planned:', narrativeArc.narrativeBeats);
            return narrativeArc;

        } catch (error) {
            console.error('❌ Narrative arc planning error:', error);
            return this.getDefaultNarrativeArc();
        }
    }

    /**
     * Gemini Pro enhances video prompt for better visual quality
     * @param {string} originalPrompt - Original video prompt
     * @param {string} narration - Narration text
     * @param {Object} narrativeArc - Narrative arc plan
     * @param {number} segmentIndex - Current segment index
     * @returns {Promise<string>} Enhanced video prompt
     */
    async enhanceVideoPrompt(originalPrompt, narration, narrativeArc, segmentIndex) {
        const prompt = `You are a video prompt optimizer for AI video generation. Enhance this prompt for Veo 3.1.

Original prompt: "${originalPrompt}"
Narration: "${narration}"
Narrative context: Segment ${segmentIndex + 1}, tone should be ${narrativeArc?.toneProgression?.[Math.min(segmentIndex, narrativeArc.toneProgression.length - 1)] || 'engaging'}

Enhance the prompt by:
1. Adding cinematic camera work (angles, movements)
2. Specifying lighting and atmosphere
3. Adding visual details that match the narration
4. Including the narrative tone
5. Ensuring it works well for 8-second video generation

Return ONLY the enhanced prompt text, no JSON, no explanation. Maximum 200 characters.`;

        try {
            const result = await this.orchestrator.generateContent(prompt);
            const enhancedPrompt = result.response.text().trim();

            // Ensure we don't exceed reasonable length
            if (enhancedPrompt.length > 300) {
                return enhancedPrompt.substring(0, 297) + '...';
            }

            return enhancedPrompt;

        } catch (error) {
            console.error('❌ Prompt enhancement error:', error);
            return originalPrompt; // Fallback to original
        }
    }

    /**
     * Gemini Pro checks narrative coherence between segments
     * @param {Object} previousSegment - Previous segment
     * @param {Object} currentSegment - Current segment
     * @param {Object} narrativeArc - Narrative arc plan
     * @returns {Promise<Object>} Coherence check result
     */
    async checkNarrativeCoherence(previousSegment, currentSegment, narrativeArc) {
        const prompt = `You are a narrative continuity checker. Review these story segments for coherence.

Previous narration: "${previousSegment.story.narrationText}"
Current narration: "${currentSegment.narrationText}"
Planned narrative arc: ${JSON.stringify(narrativeArc?.narrativeBeats || [])}

Check for:
1. Logical continuity (does current follow from previous?)
2. Character consistency
3. Setting consistency
4. Tone alignment with narrative arc

Return as JSON:
{
    "coherent": true/false,
    "issue": "description of any issues" or null,
    "suggestedFix": "corrected narration" or null
}`;

        try {
            const result = await this.orchestrator.generateContent(prompt);
            const responseText = result.response.text();

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return { coherent: true, issue: null, suggestedFix: null };
            }

            const coherenceCheck = JSON.parse(jsonMatch[0]);
            return coherenceCheck;

        } catch (error) {
            console.error('❌ Coherence check error:', error);
            return { coherent: true, issue: null, suggestedFix: null };
        }
    }

    /**
     * Gemini Pro decides if episode should continue
     * @param {Object} episode - Current episode state
     * @param {number} currentSegmentCount - Current number of segments
     * @returns {Promise<boolean>} Should continue
     */
    async shouldContinueEpisode(episode, currentSegmentCount) {
        // Always continue if below minimum
        if (currentSegmentCount < this.config.minSegments) {
            return true;
        }

        // Check if we've reached maximum
        if (currentSegmentCount >= this.config.maxSegments - 1) {
            return false;
        }

        const lastSegment = episode.segments[episode.segments.length - 1];

        const prompt = `You are an episode pacing coordinator. Decide if this interactive story episode should continue.

Current segments: ${currentSegmentCount + 1}
Maximum segments: ${this.config.maxSegments}
Last narration: "${lastSegment.story.narrationText}"
Narrative arc: ${JSON.stringify(episode.narrativeArc?.narrativeBeats || [])}

The episode should continue if:
- The story has unresolved narrative threads
- We haven't reached the planned climax yet
- Character development is incomplete
- The setting hasn't been fully explored

The episode should conclude if:
- Main narrative beats are complete
- Natural resolution point reached
- Story feels complete

Return as JSON: {"continue": true/false, "reason": "brief explanation"}`;

        try {
            const result = await this.orchestrator.generateContent(prompt);
            const responseText = result.response.text();

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                // Default: continue if we have room
                return currentSegmentCount < this.config.maxSegments - 2;
            }

            const decision = JSON.parse(jsonMatch[0]);
            console.log(`   📊 Orchestrator decision: ${decision.continue ? 'Continue' : 'Conclude'} - ${decision.reason}`);
            return decision.continue;

        } catch (error) {
            console.error('❌ Continuation decision error:', error);
            // Default: continue if we have room
            return currentSegmentCount < this.config.maxSegments - 2;
        }
    }

    /**
     * Generate episode summary with Gemini Pro
     * @param {Object} episode - Complete episode
     * @returns {Promise<string>} Episode summary
     */
    async generateEpisodeSummary(episode) {
        const narrations = episode.segments.map((s, i) =>
            `Segment ${i + 1}: ${s.story.narrationText}`
        ).join('\n');

        const prompt = `Summarize this interactive story episode in 2-3 engaging sentences.

Character: ${episode.character.name} (${episode.character.description})
Setting: ${episode.setting}
Themes: ${episode.themes.join(', ')}

Story segments:
${narrations}

Create a compelling summary that captures the essence of the episode.`;

        try {
            const result = await this.orchestrator.generateContent(prompt);
            return result.response.text().trim();
        } catch (error) {
            console.error('❌ Summary generation error:', error);
            return `An episode featuring ${episode.character.name} in ${episode.setting}.`;
        }
    }

    /**
     * Get current episode state
     * @returns {Object|null} Current episode or null
     */
    getCurrentEpisode() {
        return this.currentEpisode;
    }

    /**
     * Get episode statistics
     * @returns {Object} Episode stats
     */
    getEpisodeStats() {
        if (!this.currentEpisode) {
            return { hasEpisode: false };
        }

        return {
            hasEpisode: true,
            segmentCount: this.currentEpisode.segments.length,
            status: this.currentEpisode.status,
            duration: this.currentEpisode.segments.length * 8, // Approximate seconds
            character: this.currentEpisode.character.name,
            setting: this.currentEpisode.setting
        };
    }

    /**
     * Default narrative arc fallback
     * @returns {Object} Default narrative arc
     */
    getDefaultNarrativeArc() {
        return {
            setup: 'Introduce character and establish setting',
            risingAction: 'Present challenges and complications',
            climax: 'Reach peak moment of conflict or discovery',
            resolution: 'Conclude with character growth or change',
            narrativeBeats: [
                'Establish character in their world',
                'Introduce conflict or mystery',
                'Escalate tension',
                'Reach turning point',
                'Find resolution'
            ],
            toneProgression: ['intriguing', 'tense', 'intense', 'dramatic', 'satisfying'],
            visualMotifs: ['lighting changes', 'recurring locations', 'symbolic objects'],
            characterArc: 'Character learns or changes through experience'
        };
    }

    /**
     * Reset episode manager for new episode
     */
    reset() {
        this.currentEpisode = null;
        console.log('🔄 EpisodeManager reset');
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EpisodeManager;
}
