var SB = window.Starbase = window.Starbase || {};

SB.LLM = {
    available: false,
    pendingRequest: false,
    lastLatencyMs: 0,
    model: 'qwen3:4b',
    baseUrl: 'http://localhost:11434',

    checkAvailability: function(callback) {
        var self = this;
        var xhr = new XMLHttpRequest();
        xhr.timeout = 2000;

        xhr.onload = function() {
            if (xhr.status === 200) {
                self.available = true;
                console.log('[Starbase] Ollama detected — LLM brain active (model: ' + self.model + ')');
            } else {
                self.available = false;
                console.log('[Starbase] Ollama not available — using rule-based brain');
            }
            if (callback) callback(self.available);
        };

        xhr.onerror = function() {
            self.available = false;
            console.log('[Starbase] Ollama not available — using rule-based brain');
            if (callback) callback(false);
        };

        xhr.ontimeout = function() {
            self.available = false;
            console.log('[Starbase] Ollama connection timed out — using rule-based brain');
            if (callback) callback(false);
        };

        try {
            xhr.open('GET', this.baseUrl + '/api/tags', true);
            xhr.send();
        } catch (e) {
            self.available = false;
            if (callback) callback(false);
        }
    },

    query: function(prompt, systemPrompt, callback) {
        if (!this.available || this.pendingRequest) {
            if (callback) callback(null, 'unavailable');
            return;
        }

        var self = this;
        this.pendingRequest = true;
        var startTime = performance.now();

        var xhr = new XMLHttpRequest();
        xhr.timeout = 10000;

        xhr.onload = function() {
            self.pendingRequest = false;
            self.lastLatencyMs = Math.round(performance.now() - startTime);

            if (xhr.status === 200) {
                try {
                    var result = JSON.parse(xhr.responseText);
                    var text = result.response || '';
                    console.log('[Starbase] LLM response (' + self.lastLatencyMs + 'ms): ' + text.substring(0, 100));
                    if (callback) callback(text, null);
                } catch (e) {
                    console.warn('[Starbase] Failed to parse LLM response');
                    if (callback) callback(null, 'parse_error');
                }
            } else {
                console.warn('[Starbase] LLM request failed: HTTP ' + xhr.status);
                if (callback) callback(null, 'http_' + xhr.status);
            }
        };

        xhr.onerror = function() {
            self.pendingRequest = false;
            self.lastLatencyMs = Math.round(performance.now() - startTime);
            console.warn('[Starbase] LLM request error');
            if (callback) callback(null, 'network_error');
        };

        xhr.ontimeout = function() {
            self.pendingRequest = false;
            self.lastLatencyMs = Math.round(performance.now() - startTime);
            console.warn('[Starbase] LLM request timed out');
            if (callback) callback(null, 'timeout');
        };

        var body = JSON.stringify({
            model: this.model,
            prompt: prompt,
            system: systemPrompt,
            stream: false,
            options: {
                num_predict: 150,
                temperature: 0.7
            }
        });

        try {
            xhr.open('POST', this.baseUrl + '/api/generate', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(body);
        } catch (e) {
            self.pendingRequest = false;
            if (callback) callback(null, 'send_error');
        }
    }
};
