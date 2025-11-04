/**
 * VideoGenerator - Modular video generation component
 * Handles AI-powered video generation with Veo 3.1
 */

class VideoGenerator {
    /**
     * @param {Object} options - Configuration options
     * @param {Object} options.videoModel - Gemini video model instance (Veo 3.1)
     * @param {boolean} options.usePlaceholder - Use placeholder videos instead of API (for testing)
     * @param {number} options.defaultDuration - Default video duration in seconds
     * @param {number} options.maxRetries - Maximum retry attempts
     * @param {number} options.retryDelay - Initial retry delay in ms
     */
    constructor(options = {}) {
        this.videoModel = options.videoModel;
        this.usePlaceholder = options.usePlaceholder || !this.videoModel;

        // Configuration
        this.config = {
            defaultDuration: options.defaultDuration || 8,
            maxRetries: options.maxRetries || 2,
            retryDelay: options.retryDelay || 1000,
            temperature: options.temperature || 0.7
        };

        // Video cache (in-memory)
        this.cache = new Map();

        console.log('🎥 VideoGenerator initialized', {
            mode: this.usePlaceholder ? 'PLACEHOLDER' : 'VEO_3.1',
            duration: this.config.defaultDuration,
            maxRetries: this.config.maxRetries
        });
    }

    /**
     * Generate video from scene description
     * @param {Object} sceneDescription - Scene data with videoPrompt and narration
     * @param {string} sceneDescription.videoPrompt - Visual scene description
     * @param {string} sceneDescription.narrationText - Narration/dialogue
     * @param {string} sceneDescription.videoInstruction - Optional location enforcement
     * @param {string} sceneDescription.id - Scene ID for caching
     * @param {number} sceneDescription.duration - Video duration (optional)
     * @returns {Promise<Object>} Video generation result
     */
    async generateVideo(sceneDescription) {
        const { videoPrompt, narrationText, videoInstruction, id, duration } = sceneDescription;

        if (!videoPrompt) {
            throw new Error('Missing required field: videoPrompt');
        }

        console.log('🎬 Generating video...');
        console.log('   Scene ID:', id || 'N/A');
        console.log('   Prompt length:', videoPrompt.length);

        // Check cache first
        if (id && this.cache.has(id)) {
            console.log('✅ Returning cached video for scene:', id);
            return this.cache.get(id);
        }

        // Optimize the prompt
        const optimizedPrompt = this.optimizePrompt({
            videoPrompt,
            narrationText,
            videoInstruction
        });

        console.log('📝 Optimized prompt:', optimizedPrompt.substring(0, 150) + '...');

        // Generate video with retry logic
        const result = await this.generateWithRetry(optimizedPrompt, duration || this.config.defaultDuration);

        // Cache the result
        if (id && result.videoUrl) {
            this.cacheVideo(result, id);
        }

        return result;
    }

    /**
     * Optimize video prompt for better quality
     * @param {Object} promptData - Prompt components
     * @param {string} promptData.videoPrompt - Base video prompt
     * @param {string} promptData.narrationText - Narration text
     * @param {string} promptData.videoInstruction - Optional instructions
     * @returns {string} Optimized prompt
     */
    optimizePrompt(promptData) {
        const { videoPrompt, narrationText, videoInstruction } = promptData;

        let optimized = videoPrompt;

        // Prepend location enforcement if provided
        if (videoInstruction) {
            optimized = `${videoInstruction}. ${optimized}`;
        }

        // Append narration for better audio generation
        if (narrationText) {
            optimized = `${optimized}. Narration: ${narrationText}`;
        }

        // Ensure cinematic quality indicators
        if (!optimized.toLowerCase().includes('cinematic')) {
            optimized = `${optimized}, cinematic quality`;
        }

        return optimized;
    }

    /**
     * Generate video with retry logic
     * @param {string} prompt - Optimized video prompt
     * @param {number} duration - Video duration in seconds
     * @returns {Promise<Object>} Generation result
     */
    async generateWithRetry(prompt, duration) {
        let lastError = null;

        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                    console.log(`⏳ Retry attempt ${attempt}/${this.config.maxRetries} after ${delay}ms...`);
                    await this.sleep(delay);
                }

                return await this._generateVideoAPI(prompt, duration, attempt);

            } catch (error) {
                lastError = error;
                console.warn(`❌ Attempt ${attempt + 1} failed:`, error.message);

                // Don't retry on certain errors
                if (this.isNonRetryableError(error)) {
                    console.log('🚫 Non-retryable error detected, stopping retries');
                    break;
                }
            }
        }

        // All retries failed - return placeholder
        console.error('🔥 All retry attempts failed:', lastError?.message);
        return this.getPlaceholderVideo(prompt, lastError);
    }

    /**
     * Internal method to call video generation API
     * @param {string} prompt - Video prompt
     * @param {number} duration - Duration in seconds
     * @param {number} attemptNumber - Current attempt number
     * @returns {Promise<Object>} API result
     */
    async _generateVideoAPI(prompt, duration, attemptNumber) {
        // Use placeholder if in test mode
        if (this.usePlaceholder) {
            console.log('🎭 Using placeholder video (test mode)');
            await this.sleep(500); // Simulate API delay
            return this.getPlaceholderVideo(prompt);
        }

        console.log(`🤖 Calling Veo 3.1 API (attempt ${attemptNumber + 1})...`);

        // Try different parameter configurations based on attempt
        const configs = [
            // Attempt 1: Minimal parameters
            {
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }]
            },
            // Attempt 2: With temperature only
            {
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: this.config.temperature
                }
            },
            // Attempt 3: Back to minimal
            {
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }]
            }
        ];

        const config = configs[attemptNumber] || configs[0];

        const result = await this.videoModel.generateContent(config);
        const response = result.response;

        console.log('📦 API response received');

        // Extract video URL from response
        const videoUrl = this.extractVideoUrl(response);

        if (!videoUrl) {
            console.warn('⚠️ No video URL in response');
            throw new Error('Video URL not found in API response');
        }

        console.log('✅ Video generated successfully!');

        return {
            videoUrl: videoUrl,
            hasAudio: true, // Veo 3.1 always includes audio
            duration: duration,
            prompt: prompt,
            isPlaceholder: false,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Extract video URL from API response
     * @param {Object} response - API response object
     * @returns {string|null} Video URL or null
     */
    extractVideoUrl(response) {
        // Try different possible paths for video URL
        const candidates = response.candidates || [];

        for (const candidate of candidates) {
            // Check for videoData.uri
            const videoUri = candidate?.content?.parts?.[0]?.videoData?.uri;
            if (videoUri) return videoUri;

            // Check for fileData.fileUri
            const fileUri = candidate?.content?.parts?.[0]?.fileData?.fileUri;
            if (fileUri) return fileUri;

            // Check for direct text/URL in parts
            const textPart = candidate?.content?.parts?.[0]?.text;
            if (textPart && (textPart.startsWith('http://') || textPart.startsWith('https://'))) {
                return textPart;
            }
        }

        return null;
    }

    /**
     * Get placeholder video when generation fails
     * @param {string} prompt - Original prompt
     * @param {Error} error - Optional error object
     * @returns {Object} Placeholder video result
     */
    getPlaceholderVideo(prompt, error = null) {
        return {
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            hasAudio: true,
            duration: 8,
            prompt: prompt,
            isPlaceholder: true,
            error: error?.message || 'Using placeholder video',
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Cache video result
     * @param {Object} videoResult - Video generation result
     * @param {string} sceneId - Scene ID
     */
    cacheVideo(videoResult, sceneId) {
        if (!sceneId) {
            console.warn('⚠️ Cannot cache video: missing scene ID');
            return;
        }

        this.cache.set(sceneId, videoResult);
        console.log(`💾 Cached video for scene: ${sceneId} (cache size: ${this.cache.size})`);
    }

    /**
     * Get cached video
     * @param {string} sceneId - Scene ID
     * @returns {Object|null} Cached video result or null
     */
    getCachedVideo(sceneId) {
        return this.cache.get(sceneId) || null;
    }

    /**
     * Clear video cache
     */
    clearCache() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`🗑️ Cleared video cache (${size} entries removed)`);
    }

    /**
     * Check if error is non-retryable
     * @param {Error} error - Error object
     * @returns {boolean} True if error should not be retried
     */
    isNonRetryableError(error) {
        const message = error.message?.toLowerCase() || '';

        // Don't retry authentication errors
        if (message.includes('unauthorized') || message.includes('forbidden')) {
            return true;
        }

        // Don't retry quota exceeded
        if (message.includes('quota') || message.includes('rate limit')) {
            return true;
        }

        // Don't retry invalid requests (400 errors can be retried with different params)
        // We actually DO want to retry 400 errors since we try different parameter configs

        return false;
    }

    /**
     * Sleep utility
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoGenerator;
}
