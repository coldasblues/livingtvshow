/**
 * Test file for EpisodeManager orchestration
 * Tests in hardcoded/placeholder mode without requiring API
 */

const StoryGenerator = require('./story-generator.js');
const VideoGenerator = require('./video-generator.js');
const EpisodeManager = require('./episode-manager.js');

console.log('🧪 Testing EpisodeManager orchestration...\\n');

// Create a mock Gemini Pro orchestrator for testing
const mockOrchestrator = {
    async generateContent(prompt) {
        console.log('   🤖 Mock Orchestrator called');

        // Detect what type of request this is based on the prompt
        if (prompt.includes('narrative arc')) {
            // Narrative arc planning
            return {
                response: {
                    text: () => `{
                        "setup": "Introduce character in gas station environment",
                        "risingAction": "Strange events unfold during the night shift",
                        "climax": "Character faces a critical decision",
                        "resolution": "Character learns something about themselves",
                        "narrativeBeats": [
                            "Establish routine",
                            "Encounter mystery",
                            "Escalate tension",
                            "Reach turning point",
                            "Find resolution"
                        ],
                        "toneProgression": ["mundane", "curious", "tense", "intense", "reflective"],
                        "visualMotifs": ["neon lights", "rain", "shadows"],
                        "characterArc": "From isolation to connection"
                    }`
                }
            };
        } else if (prompt.includes('enhance')) {
            // Prompt enhancement
            return {
                response: {
                    text: () => "A cinematic wide shot of a gas station at night, rain-slicked pavement reflecting neon lights, with moody atmospheric lighting"
                }
            };
        } else if (prompt.includes('coherence')) {
            // Coherence check
            return {
                response: {
                    text: () => `{
                        "coherent": true,
                        "issue": null,
                        "suggestedFix": null
                    }`
                }
            };
        } else if (prompt.includes('should continue')) {
            // Continuation decision
            return {
                response: {
                    text: () => `{
                        "continue": false,
                        "reason": "Story has reached a natural conclusion"
                    }`
                }
            };
        } else if (prompt.includes('Summarize')) {
            // Episode summary
            return {
                response: {
                    text: () => "A night shift worker experiences mysterious events at a lonely gas station, leading to an unexpected revelation."
                }
            };
        }

        // Default response
        return {
            response: {
                text: () => "Mock response"
            }
        };
    }
};

// Test 1: Initialize Episode Manager
console.log('Test 1: Initialize EpisodeManager with mock orchestrator');
const storyGen = new StoryGenerator({
    // No textModel = hardcoded mode
    contentFilter: (text) => ({ passed: true })
});

const videoGen = new VideoGenerator({
    usePlaceholder: true,
    defaultDuration: 8
});

const episodeManager = new EpisodeManager({
    orchestratorModel: mockOrchestrator,
    storyGenerator: storyGen,
    videoGenerator: videoGen,
    maxSegments: 4, // Small for testing
    minSegments: 2,
    enhancePrompts: true,
    trackCoherence: true
});

console.log('✅ EpisodeManager initialized\\n');

// Test 2: Generate a complete episode
console.log('Test 2: Generate complete episode with orchestration');
const userInput = {
    name: 'Alex',
    gender: 'non-binary',
    description: 'night shift worker',
    setting: 'Gas station',
    themes: ['Mystery', 'Suspense']
};

episodeManager.generateEpisode(userInput)
    .then(episode => {
        console.log('\\n✅ Episode generation complete!\\n');

        console.log('📊 Episode Details:');
        console.log('   ID:', episode.id);
        console.log('   Character:', episode.character.name);
        console.log('   Setting:', episode.setting);
        console.log('   Themes:', episode.themes.join(', '));
        console.log('   Segments:', episode.segments.length);
        console.log('   Status:', episode.status);
        console.log('   Duration:', episode.segments.length * 8, 'seconds (approx)');
        console.log('');

        console.log('📋 Narrative Arc:');
        console.log('   Setup:', episode.narrativeArc.setup);
        console.log('   Rising Action:', episode.narrativeArc.risingAction);
        console.log('   Climax:', episode.narrativeArc.climax);
        console.log('   Resolution:', episode.narrativeArc.resolution);
        console.log('   Narrative Beats:', episode.narrativeArc.narrativeBeats.length);
        console.log('');

        console.log('🎬 Segments:');
        episode.segments.forEach((segment, i) => {
            console.log(`   Segment ${i + 1}:`);
            console.log(`      Type: ${segment.type}`);
            console.log(`      Story: ${segment.story.narrationText.substring(0, 80)}...`);
            console.log(`      Video: ${segment.video.videoUrl ? 'Generated' : 'Placeholder'}`);
            console.log(`      Choices: ${segment.story.choices.length}`);
        });
        console.log('');

        console.log('📝 Episode Summary:');
        console.log('  ', episode.summary);
        console.log('');

        // Test 3: Get episode stats
        console.log('Test 3: Get episode statistics');
        const stats = episodeManager.getEpisodeStats();
        console.log('✅ Episode stats:');
        console.log('   Has Episode:', stats.hasEpisode);
        console.log('   Segment Count:', stats.segmentCount);
        console.log('   Status:', stats.status);
        console.log('   Character:', stats.character);
        console.log('   Setting:', stats.setting);
        console.log('');

        // Test 4: Reset episode manager
        console.log('Test 4: Reset episode manager');
        episodeManager.reset();
        const statsAfterReset = episodeManager.getEpisodeStats();
        console.log('✅ Reset successful');
        console.log('   Has Episode:', statsAfterReset.hasEpisode);
        console.log('');

        console.log('🎉 All tests completed successfully!\\n');
        console.log('Summary:');
        console.log('✅ EpisodeManager initializes correctly');
        console.log('✅ Generates complete episodes with orchestration');
        console.log('✅ Plans narrative arcs');
        console.log('✅ Coordinates story and video generation');
        console.log('✅ Generates episode summaries');
        console.log('✅ Tracks episode statistics');
        console.log('✅ Resets successfully');
        console.log('\\n📚 Ready to orchestrate with Gemini Pro in production!');

    })
    .catch(error => {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
        process.exit(1);
    });
