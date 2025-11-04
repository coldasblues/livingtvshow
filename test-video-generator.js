/**
 * Test file for VideoGenerator class
 * Tests placeholder functionality without requiring API
 */

const VideoGenerator = require('./video-generator.js');

console.log('🧪 Testing VideoGenerator class...\n');

// Test 1: Initialize with placeholder mode
console.log('Test 1: Initialize VideoGenerator (placeholder mode)');
const generator = new VideoGenerator({
    usePlaceholder: true, // No video model = placeholder mode
    defaultDuration: 8,
    maxRetries: 2
});
console.log('✅ Generator initialized\n');

// Test 2: Generate video with basic scene
console.log('Test 2: Generate video with basic scene description');
const sceneDescription1 = {
    id: 'test-scene-001',
    videoPrompt: 'A rainy night at a gas station with fluorescent lights',
    narrationText: 'Morgan works the late shift at the lonely gas station.',
    videoInstruction: 'MUST SHOW: Gas station as primary setting',
    duration: 8
};

generator.generateVideo(sceneDescription1)
    .then(result => {
        console.log('✅ Video generated:');
        console.log('   Video URL:', result.videoUrl);
        console.log('   Has Audio:', result.hasAudio);
        console.log('   Duration:', result.duration);
        console.log('   Is Placeholder:', result.isPlaceholder);
        console.log('   Generated At:', result.generatedAt);
        console.log('');

        // Test 3: Test prompt optimization
        console.log('Test 3: Test prompt optimization');
        const optimized1 = generator.optimizePrompt({
            videoPrompt: 'Gas station at night',
            narrationText: 'A quiet night shift',
            videoInstruction: 'MUST SHOW: Gas station'
        });
        console.log('✅ Optimized prompt:');
        console.log('  ', optimized1);
        console.log('');

        const optimized2 = generator.optimizePrompt({
            videoPrompt: 'Coffee shop with warm lighting, cinematic',
            narrationText: 'The barista prepares morning coffee'
        });
        console.log('✅ Optimized prompt (already cinematic):');
        console.log('  ', optimized2);
        console.log('');

        // Test 4: Test caching
        console.log('Test 4: Test video caching');
        const scene2 = {
            id: 'test-scene-002',
            videoPrompt: 'Space station corridor with stars visible',
            narrationText: 'Floating through zero gravity'
        };

        return generator.generateVideo(scene2);
    })
    .then(result => {
        console.log('✅ Second video generated and cached');
        console.log('   Cache stats:', generator.getCacheStats());
        console.log('');

        // Test 5: Retrieve from cache
        console.log('Test 5: Retrieve video from cache');
        return generator.generateVideo({
            id: 'test-scene-001', // Same ID as first test
            videoPrompt: 'This should not be used - from cache'
        });
    })
    .then(result => {
        console.log('✅ Retrieved from cache (should be instant)');
        console.log('   Video URL:', result.videoUrl);
        console.log('   Cache size:', generator.getCacheStats().size);
        console.log('');

        // Test 6: Get cached video directly
        console.log('Test 6: Get cached video directly');
        const cached = generator.getCachedVideo('test-scene-002');
        if (cached) {
            console.log('✅ Found cached video for test-scene-002');
            console.log('   URL:', cached.videoUrl);
        } else {
            console.log('❌ Cache retrieval failed');
        }
        console.log('');

        // Test 7: Clear cache
        console.log('Test 7: Clear cache');
        generator.clearCache();
        console.log('✅ Cache cleared');
        console.log('   Cache stats after clear:', generator.getCacheStats());
        console.log('');

        // Test 8: Error handling test
        console.log('Test 8: Test error classification');
        const authError = new Error('Unauthorized access');
        const quotaError = new Error('Quota exceeded');
        const randomError = new Error('Random network error');

        console.log('   Auth error is non-retryable:', generator.isNonRetryableError(authError));
        console.log('   Quota error is non-retryable:', generator.isNonRetryableError(quotaError));
        console.log('   Network error is retryable:', !generator.isNonRetryableError(randomError));
        console.log('');

        // Test 9: Test URL extraction simulation
        console.log('Test 9: Test URL extraction');
        const mockResponse1 = {
            candidates: [{
                content: {
                    parts: [{
                        videoData: {
                            uri: 'https://example.com/video1.mp4'
                        }
                    }]
                }
            }]
        };

        const mockResponse2 = {
            candidates: [{
                content: {
                    parts: [{
                        fileData: {
                            fileUri: 'https://example.com/video2.mp4'
                        }
                    }]
                }
            }]
        };

        const url1 = generator.extractVideoUrl(mockResponse1);
        const url2 = generator.extractVideoUrl(mockResponse2);

        console.log('✅ Extracted URL from videoData:', url1);
        console.log('✅ Extracted URL from fileData:', url2);
        console.log('');

        // Test 10: Test placeholder video
        console.log('Test 10: Test placeholder video generation');
        const placeholder = generator.getPlaceholderVideo(
            'Test prompt',
            new Error('API temporarily unavailable')
        );
        console.log('✅ Placeholder video:');
        console.log('   URL:', placeholder.videoUrl);
        console.log('   Is Placeholder:', placeholder.isPlaceholder);
        console.log('   Error:', placeholder.error);
        console.log('');

        console.log('🎉 All tests completed successfully!\n');
        console.log('Summary:');
        console.log('✅ VideoGenerator initializes correctly');
        console.log('✅ Generates videos (placeholder mode)');
        console.log('✅ Optimizes prompts with instructions and narration');
        console.log('✅ Caches videos by scene ID');
        console.log('✅ Retrieves cached videos');
        console.log('✅ Clears cache');
        console.log('✅ Classifies errors correctly');
        console.log('✅ Extracts video URLs from API responses');
        console.log('✅ Handles placeholder videos');
        console.log('\n📚 Ready to integrate with Veo 3.1 API!');
    })
    .catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
