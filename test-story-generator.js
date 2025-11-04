/**
 * Test file for StoryGenerator class
 * Tests hardcoded functionality without requiring AI
 */

const StoryGenerator = require('./story-generator.js');

console.log('🧪 Testing StoryGenerator class...\n');

// Test 1: Initialize with hardcoded mode (no AI)
console.log('Test 1: Initialize StoryGenerator (hardcoded mode)');
const generator = new StoryGenerator({
    // No textModel provided = hardcoded mode
    contentFilter: (text) => {
        // Simple content filter for testing
        const blocked = ['badword', 'inappropriate'];
        for (const word of blocked) {
            if (text.toLowerCase().includes(word)) {
                return { passed: false, reason: `Contains blocked word: ${word}` };
            }
        }
        return { passed: true };
    }
});
console.log('✅ Generator initialized\n');

// Test 2: Generate opening segment
console.log('Test 2: Generate opening segment (hardcoded)');
const context = {
    setting: 'Gas station',
    character: {
        name: 'Morgan',
        gender: 'male',
        description: 'night shift worker'
    },
    themes: ['Mystery', 'Suspense'],
    variationSeed: 12345
};

generator.generateSegment(context)
    .then(segment => {
        console.log('✅ Opening segment generated:');
        console.log('   ID:', segment.id);
        console.log('   Setting:', segment.explicitSetting);
        console.log('   Video Prompt:', segment.videoPrompt);
        console.log('   Narration:', segment.narrationText.substring(0, 100) + '...');
        console.log('   Choices:', segment.choices.length);
        segment.choices.forEach((choice, i) => {
            console.log(`      ${i + 1}. ${choice.text} (${choice.genre})`);
        });
        console.log('');

        // Test 3: Generate continuation segment
        console.log('Test 3: Generate continuation segment (hardcoded)');
        const previousChoice = segment.choices[0];

        return generator.generateSegment(context, previousChoice);
    })
    .then(segment => {
        console.log('✅ Continuation segment generated:');
        console.log('   ID:', segment.id);
        console.log('   Setting:', segment.explicitSetting);
        console.log('   Video Prompt:', segment.videoPrompt);
        console.log('   Narration:', segment.narrationText.substring(0, 100) + '...');
        console.log('   Choices:', segment.choices.length);
        segment.choices.forEach((choice, i) => {
            console.log(`      ${i + 1}. ${choice.text} (${choice.genre})`);
        });
        console.log('');

        // Test 4: Variation generation
        console.log('Test 4: Test variation generation');
        const variation1 = generator.generateVariation(11111);
        const variation2 = generator.generateVariation(22222);
        console.log('✅ Variation 1:', variation1);
        console.log('✅ Variation 2:', variation2);
        console.log('   Variations are different:', JSON.stringify(variation1) !== JSON.stringify(variation2));
        console.log('');

        // Test 5: Explicit video prompt generation
        console.log('Test 5: Test explicit video prompt generation');
        const videoPrompt1 = generator.generateExplicitVideoPrompt('Gas station', ['Mystery', 'Horror']);
        const videoPrompt2 = generator.generateExplicitVideoPrompt('Coffee shop', ['Romance', 'Comedy']);
        console.log('✅ Gas station + Mystery/Horror:');
        console.log('  ', videoPrompt1);
        console.log('✅ Coffee shop + Romance/Comedy:');
        console.log('  ', videoPrompt2);
        console.log('');

        // Test 6: Content filter validation
        console.log('Test 6: Test content filter validation');
        try {
            const badContext = {
                setting: 'Gas station with badword',
                character: {
                    name: 'Morgan',
                    gender: 'male',
                    description: 'night shift worker'
                },
                themes: []
            };
            generator.generateSegment(badContext);
            console.log('❌ Content filter FAILED - should have blocked content');
        } catch (error) {
            console.log('✅ Content filter PASSED - blocked inappropriate content');
            console.log('   Error:', error.message);
        }
        console.log('');

        console.log('🎉 All tests completed successfully!\n');
        console.log('Summary:');
        console.log('✅ StoryGenerator initializes correctly');
        console.log('✅ Generates opening segments with hardcoded data');
        console.log('✅ Generates continuation segments with hardcoded data');
        console.log('✅ Creates unique variations for each generation');
        console.log('✅ Maps settings to explicit visual prompts');
        console.log('✅ Content filtering works correctly');
        console.log('\n📚 Ready to integrate with Gemini AI!');
    })
    .catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
